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
    """Clerk token data model"""
    
    def __init__(self, payload: Dict[str, Any]):
        self.sub = payload.get("sub")  # Clerk user ID
        self.username = payload.get("username") or self._extract_username(payload)
        self.email = payload.get("email")
        self.given_name = payload.get("given_name")
        self.family_name = payload.get("family_name")
        self.groups = []  # Clerk doesn't use groups by default, can be added via metadata
        self.exp = payload.get("exp")
        self.iat = payload.get("iat")
    
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
                logger.info("Token decoded in development mode", user_id=decoded.get("sub"))
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