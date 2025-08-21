"""Clerk authentication client for JWT verification"""

import httpx
import jwt
from fastapi import HTTPException, status
from typing import Dict, Any, Optional
import structlog
from datetime import datetime
import json
import base64

from ..config.settings import Settings

logger = structlog.get_logger(__name__)


class ClerkTokenData:
    """Clerk token data model with organization context"""
    
    def __init__(self, payload: Dict[str, Any]):
        self.sub = payload.get("sub")  # Clerk user ID
        self.username = payload.get("username") or self._extract_username(payload)
        self.email = payload.get("email")
        self.given_name = payload.get("given_name")
        self.family_name = payload.get("family_name")
        self.groups = []  # Clerk doesn't use groups by default, can be added via metadata
        self.exp = payload.get("exp")
        self.iat = payload.get("iat")
        
        # Extract organization context from Clerk token
        # In Clerk, this might be in org_id, org_slug, or custom claims
        self.organization_id = payload.get("org_id") or payload.get("organization_id")
        self.organization_slug = payload.get("org_slug") or payload.get("organization_slug")
        
        # Try to extract from public metadata if available
        public_metadata = payload.get("public_metadata", {})
        if not self.organization_id and "organization_id" in public_metadata:
            self.organization_id = public_metadata["organization_id"]
        if not self.organization_slug and "organization_slug" in public_metadata:
            self.organization_slug = public_metadata["organization_slug"]
    
    def _extract_username(self, payload: Dict[str, Any]) -> str:
        """Extract username from Clerk token"""
        # Try to get username from email or use sub
        if payload.get("email"):
            return payload["email"].split("@")[0]
        return payload.get("sub", "unknown")


class ClerkClient:
    """Clerk authentication client"""
    
    def __init__(self, settings: Settings):
        self.settings = settings
        self.clerk_secret_key = settings.clerk_secret_key
        self.clerk_publishable_key = settings.clerk_publishable_key
        self._jwks_cache = None
        self._jwks_cache_expiry = None
        
        if not self.clerk_secret_key:
            logger.warning("Clerk secret key not configured")
    
    async def verify_token(self, token: str) -> ClerkTokenData:
        """Verify Clerk JWT token"""
        try:
            # For development/testing - decode without verification
            # In production, you should verify the signature using Clerk's JWKS
            if self.settings.is_development:
                decoded = jwt.decode(
                    token, 
                    options={"verify_signature": False},
                    algorithms=["RS256"]
                )
                logger.info("Token decoded in development mode", 
                          user_id=decoded.get("sub"),
                          token_keys=list(decoded.keys()),
                          org_id=decoded.get("org_id"),
                          org_slug=decoded.get("org_slug"), 
                          organization_id=decoded.get("organization_id"),
                          organization_slug=decoded.get("organization_slug"))
                return ClerkTokenData(decoded)
            else:
                # In production, implement proper JWKS verification
                # This requires fetching Clerk's public keys
                decoded = await self._verify_with_jwks(token)
                return ClerkTokenData(decoded)
                
        except jwt.ExpiredSignatureError:
            logger.error("Token has expired")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired"
            )
        except jwt.InvalidTokenError as e:
            logger.error("Invalid token", error=str(e))
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
        except Exception as e:
            logger.error("Token verification failed", error=str(e))
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token verification failed"
            )
    
    async def fetch_organization(self, organization_id: str) -> dict:
        """Fetch organization details from Clerk API"""
        if not self.clerk_secret_key:
            raise ValueError("Clerk secret key not configured")
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"https://api.clerk.com/v1/organizations/{organization_id}",
                    headers={
                        "Authorization": f"Bearer {self.clerk_secret_key}",
                        "Content-Type": "application/json"
                    }
                )
                
                if response.status_code == 200:
                    org_data = response.json()
                    logger.info("Fetched organization from Clerk", 
                              org_id=organization_id, 
                              name=org_data.get("name"))
                    return org_data
                elif response.status_code == 404:
                    logger.warning("Organization not found in Clerk", org_id=organization_id)
                    return None
                else:
                    logger.error("Failed to fetch organization from Clerk", 
                               org_id=organization_id,
                               status_code=response.status_code,
                               response=response.text)
                    return None
                    
        except Exception as e:
            logger.error("Error fetching organization from Clerk", 
                       org_id=organization_id, 
                       error=str(e))
            return None
    
    async def _verify_with_jwks(self, token: str) -> Dict[str, Any]:
        """Verify token using Clerk's JWKS (for production)"""
        # TODO: Implement JWKS verification for production
        # This would involve:
        # 1. Fetching Clerk's JWKS from their endpoint
        # 2. Finding the correct key by kid (key ID)
        # 3. Verifying the signature
        
        # For now, decode without verification but log a warning
        logger.warning("JWKS verification not implemented - using unverified decode")
        return jwt.decode(
            token, 
            options={"verify_signature": False},
            algorithms=["RS256"]
        )
    
    async def get_jwks(self) -> Dict[str, Any]:
        """Get Clerk's JWKS for token verification"""
        # Clerk's JWKS endpoint would be something like:
        # https://your-app.clerk.accounts.dev/.well-known/jwks.json
        
        if self._jwks_cache and self._jwks_cache_expiry > datetime.utcnow():
            return self._jwks_cache
        
        try:
            # Extract instance ID from publishable key if available
            if self.clerk_publishable_key:
                # pk_test_... or pk_live_... format
                jwks_url = f"https://api.clerk.com/v1/jwks"
                
                async with httpx.AsyncClient() as client:
                    response = await client.get(jwks_url)
                    response.raise_for_status()
                    
                    jwks_data = response.json()
                    self._jwks_cache = jwks_data
                    # Cache for 1 hour
                    self._jwks_cache_expiry = datetime.utcnow().timestamp() + 3600
                    
                    return jwks_data
            else:
                raise ValueError("Clerk publishable key not configured")
                
        except Exception as e:
            logger.error("Failed to fetch JWKS", error=str(e))
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to verify token - JWKS unavailable"
            )