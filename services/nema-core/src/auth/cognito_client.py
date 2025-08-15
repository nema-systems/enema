"""
New AWS Cognito client based on service-common-authentication approach.
Uses USER_PASSWORD_AUTH flow that doesn't require AWS credentials.
"""

import time
import json
import base64
import hmac
import hashlib
from typing import Dict, Optional
from dataclasses import dataclass

import aiohttp
import structlog
import boto3
from jwcrypto import jwk, jws
from jwcrypto.common import json_decode
from fastapi import HTTPException, status

from ..config.settings import Settings

logger = structlog.get_logger(__name__)

TTL_LIMIT = 12 * 60 * 60  # 12 hours


@dataclass
class AuthResult:
    access_token: str
    refresh_token: str
    id_token: str
    expires_in: int


@dataclass
class TokenData:
    username: str
    email: Optional[str] = None
    groups: Optional[list] = None
    scope: Optional[str] = None


class CognitoClient:
    """AWS Cognito client using public auth flow (no AWS credentials required)"""
    
    def __init__(self, settings: Settings):
        self.settings = settings
        self._jwks_cache = None
        self._jwks_expires = 0
        
        # Initialize boto3 client (no AWS credentials needed for USER_PASSWORD_AUTH)
        self.client = boto3.client("cognito-idp", region_name=settings.aws_region)
    
    def _get_secret_hash(self, username: str) -> Optional[str]:
        """Calculate the SECRET_HASH for Cognito authentication when client has a secret"""
        if not self.settings.cognito_app_client_secret:
            return None
            
        message = bytes(username + self.settings.cognito_app_client_id, 'utf-8')
        secret = bytes(self.settings.cognito_app_client_secret, 'utf-8')
        dig = hmac.new(secret, msg=message, digestmod=hashlib.sha256).digest()
        return base64.b64encode(dig).decode()
        
    async def _get_jwks(self) -> dict:
        """Get JWKS from Cognito with caching"""
        current_time = time.time()
        
        if self._jwks_cache is None or current_time > self._jwks_expires:
            jwks_url = f"https://cognito-idp.{self.settings.aws_region}.amazonaws.com/{self.settings.cognito_user_pool_id}/.well-known/jwks.json"
            
            async with aiohttp.ClientSession() as session:
                async with session.get(jwks_url) as response:
                    if response.status != 200:
                        raise HTTPException(
                            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                            detail="Unable to fetch Cognito JWKS"
                        )
                    self._jwks_cache = await response.json()
                    self._jwks_expires = current_time + TTL_LIMIT
                    
        return self._jwks_cache
    
    async def authenticate(self, username: str, password: str) -> AuthResult:
        """Authenticate user using USER_PASSWORD_AUTH flow"""
        try:
            auth_parameters = {
                "USERNAME": username,
                "PASSWORD": password
            }
            
            # Add SECRET_HASH if client has a secret
            secret_hash = self._get_secret_hash(username)
            if secret_hash:
                auth_parameters["SECRET_HASH"] = secret_hash
                logger.info("Including SECRET_HASH in authentication", username=username)
            else:
                logger.info("No client secret configured, skipping SECRET_HASH", username=username)
            
            logger.info("Attempting Cognito authentication", 
                       username=username, 
                       client_id=self.settings.cognito_app_client_id,
                       user_pool_id=self.settings.cognito_user_pool_id,
                       aws_region=self.settings.aws_region,
                       has_secret=bool(secret_hash))
            
            response = self.client.initiate_auth(
                ClientId=self.settings.cognito_app_client_id,
                AuthFlow="USER_PASSWORD_AUTH",
                AuthParameters=auth_parameters
            )
            
            # Handle password change challenge
            if "ChallengeName" in response and response["ChallengeName"] == "NEW_PASSWORD_REQUIRED":
                logger.error("New password required for user", username=username)
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="New password required"
                )
            
            auth_result = response["AuthenticationResult"]
            
            logger.info("User authenticated successfully", username=username)
            
            return AuthResult(
                access_token=auth_result["AccessToken"],
                refresh_token=auth_result["RefreshToken"],
                id_token=auth_result["IdToken"],
                expires_in=auth_result["ExpiresIn"]
            )
            
        except self.client.exceptions.NotAuthorizedException as e:
            error_message = str(e)
            logger.error("Authentication failed: invalid credentials", 
                       username=username, 
                       error_message=error_message,
                       error_code="NotAuthorizedException")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )
        except self.client.exceptions.UserNotFoundException as e:
            logger.error("Authentication failed: user not found", 
                       username=username,
                       error_message=str(e))
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )
        except self.client.exceptions.UserNotConfirmedException as e:
            logger.error("Authentication failed: user not confirmed", 
                       username=username,
                       error_message=str(e))
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User account not confirmed"
            )
        except Exception as e:
            logger.error("Authentication failed: unexpected error", 
                       username=username, 
                       error=str(e),
                       error_type=type(e).__name__)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Authentication service unavailable"
            )
    
    async def refresh_access_token(self, refresh_token: str) -> AuthResult:
        """Refresh access token using refresh token"""
        try:
            auth_parameters = {
                "REFRESH_TOKEN": refresh_token
            }
            
            # Note: SECRET_HASH is typically not needed for refresh token flow
            # but some client configurations might require it
            
            response = self.client.initiate_auth(
                ClientId=self.settings.cognito_app_client_id,
                AuthFlow="REFRESH_TOKEN_AUTH",
                AuthParameters=auth_parameters
            )
            
            auth_result = response["AuthenticationResult"]
            
            return AuthResult(
                access_token=auth_result["AccessToken"],
                refresh_token=refresh_token,  # Cognito doesn't rotate refresh tokens
                id_token=auth_result["IdToken"],
                expires_in=auth_result["ExpiresIn"]
            )
            
        except self.client.exceptions.NotAuthorizedException:
            logger.error("Token refresh failed: invalid refresh token")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )
        except Exception as e:
            logger.error("Token refresh failed: unexpected error", error=str(e))
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Token refresh service unavailable"
            )
    
    def _get_unverified_claims(self, token: str) -> dict:
        """Extract unverified claims from JWT token"""
        try:
            _, payload_b64, _ = token.split(".")
            payload_b64 += "=" * (-len(payload_b64) % 4)
            payload_bytes = base64.urlsafe_b64decode(payload_b64)
            claims = json.loads(payload_bytes)
            return claims
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token format"
            )
    
    async def verify_token(self, token: str) -> TokenData:
        """Verify JWT token and return user data"""
        try:
            # Parse token header to get key ID
            jws_token = jws.JWS()
            jws_token.deserialize(token)
            kid = jws_token.jose_header["kid"]
            
            # Get JWKS from Cognito
            jwks = await self._get_jwks()
            
            # Find the matching key
            key = next((key for key in jwks["keys"] if key["kid"] == kid), None)
            if not key:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Key ID does not match any keys in JWKS"
                )
            
            jwk_key = jwk.JWK(**key)
            
            # Verify the token
            jws_token.verify(jwk_key, alg="RS256")
            claims = json_decode(jws_token.payload)
            
            # Validate token
            if time.time() > claims["exp"]:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Token is expired"
                )
            
            # Validate audience
            if claims.get("client_id") != self.settings.cognito_app_client_id:
                if claims.get("aud") != self.settings.cognito_app_client_id:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Token was not issued for this audience"
                    )
            
            # Extract user data
            groups = claims.get("cognito:groups", [])
            
            return TokenData(
                username=claims["username"],
                email=claims.get("email"),
                groups=groups,
                scope=claims.get("scope")
            )
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error("Token verification failed", error=str(e))
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )