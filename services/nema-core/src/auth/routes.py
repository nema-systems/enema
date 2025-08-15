"""Authentication routes supporting both Cognito and Mock auth"""

from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional, List
import structlog

from ..config.settings import get_settings
from .cognito_client import CognitoClient
from .mock_auth import MockAuthClient, verify_mock_jwt_token, get_mock_users
from .models import User, LoginRequest, LoginResponse, RefreshRequest

logger = structlog.get_logger(__name__)
security = HTTPBearer()

auth_router = APIRouter()


class AuthService:
    """Authentication service supporting both Cognito and Mock auth"""
    
    def __init__(self):
        self.settings = get_settings()
        self.use_mock_auth = self._should_use_mock_auth()
        self.auth_client = None
        
        if self.use_mock_auth:
            self.auth_client = MockAuthClient(self.settings)
            logger.info("Using mock authentication for development")
        else:
            # Initialize new Cognito client (no AWS credentials required)
            self.auth_client = CognitoClient(self.settings)
            logger.info("Using AWS Cognito authentication")
    
    def _get_auth_client(self):
        """Get the auth client"""
        return self.auth_client
    
    def _should_use_mock_auth(self) -> bool:
        """Determine whether to use mock authentication"""
        # Use mock auth if:
        # 1. Explicitly enabled via MOCK_AUTH=true
        # 2. In development and missing Cognito configuration
        if self.settings.mock_auth_enabled:
            return True
        
        if self.settings.is_development:
            # Only require pool + client id for local Cognito usage; allow credential chain
            if not self.settings.cognito_user_pool_id or not self.settings.cognito_app_client_id:
                logger.info(
                    "Missing Cognito pool or client id in development, using mock auth"
                )
                return True
        
        return False
    
    async def login(self, request: LoginRequest) -> LoginResponse:
        """Authenticate user"""
        try:
            auth_client = self._get_auth_client()
            
            if self.use_mock_auth:
                result = await auth_client.authenticate(
                    username=request.username,
                    password=request.password
                )
                return LoginResponse(
                    access_token=result["access_token"],
                    refresh_token=result["refresh_token"],
                    expires_in=result["expires_in"],
                    token_type="Bearer"
                )
            else:
                # Use new Cognito client
                result = await auth_client.authenticate(
                    username=request.username,
                    password=request.password
                )
                return LoginResponse(
                    access_token=result.access_token,
                    refresh_token=result.refresh_token,
                    expires_in=result.expires_in,
                    token_type="Bearer"
                )
                
        except HTTPException:
            # Re-raise HTTP exceptions from the auth client
            raise
        except Exception as e:
            logger.error("Authentication failed", 
                        username=request.username, 
                        error=str(e),
                        mock_auth=self.use_mock_auth)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )
    
    async def refresh_token(self, request: RefreshRequest) -> LoginResponse:
        """Refresh access token using refresh token"""
        try:
            auth_client = self._get_auth_client()
            
            if self.use_mock_auth:
                result = await auth_client.refresh_access_token(request.refresh_token)
                return LoginResponse(
                    access_token=result["access_token"],
                    refresh_token=request.refresh_token,
                    expires_in=result["expires_in"],
                    token_type="Bearer"
                )
            else:
                # Use new Cognito client
                result = await auth_client.refresh_access_token(request.refresh_token)
                return LoginResponse(
                    access_token=result.access_token,
                    refresh_token=result.refresh_token,
                    expires_in=result.expires_in,
                    token_type="Bearer"
                )
                
        except HTTPException:
            # Re-raise HTTP exceptions from the auth client
            raise
        except Exception as e:
            logger.error("Token refresh failed", error=str(e))
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )
    
    async def get_current_user(self, token: str) -> User:
        """Get current user from JWT token"""
        try:
            auth_client = self._get_auth_client()
            
            if self.use_mock_auth:
                payload = await verify_mock_jwt_token(token, self.settings)
                # Handle mock auth payload format
                groups = payload.get("groups", [])
                tenant_id = payload.get("tenant_id")
                return User(
                    username=payload["username"],
                    email=payload.get("email"),
                    groups=groups,
                    tenant_id=tenant_id,
                    given_name=payload.get("given_name"),
                    family_name=payload.get("family_name")
                )
            else:
                # Use new Cognito client
                token_data = await auth_client.verify_token(token)
                return User(
                    username=token_data.username,
                    email=token_data.email,
                    groups=token_data.groups or [],
                    tenant_id=None,  # Extract from custom claims if needed
                    given_name=None,  # These would need to be in token claims
                    family_name=None
                )
                
        except HTTPException:
            # Re-raise HTTP exceptions from the auth client
            raise
        except Exception as e:
            logger.error("Token validation failed", error=str(e))
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )


# Initialize auth service
auth_service = AuthService()


# Dependency to get current user
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    """FastAPI dependency to get current authenticated user"""
    return await auth_service.get_current_user(credentials.credentials)


@auth_router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """Login with username and password"""
    return await auth_service.login(request)


@auth_router.post("/refresh", response_model=LoginResponse) 
async def refresh_token(request: RefreshRequest):
    """Refresh access token"""
    return await auth_service.refresh_token(request)


@auth_router.get("/me", response_model=User)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return current_user


@auth_router.post("/logout")
async def logout(current_user: User = Depends(get_current_user)):
    """Logout user (invalidate token server-side if needed)"""
    # Note: JWT tokens can't be truly invalidated without a blacklist
    # For now, just log the logout event
    logger.info("User logged out", username=current_user.username)
    return {"message": "Logged out successfully"}


@auth_router.get("/health")
async def auth_health():
    """Health check for auth service"""
    settings = get_settings()
    
    # Check if Cognito is configured (no AWS credentials needed)
    cognito_configured = bool(
        settings.cognito_user_pool_id and 
        settings.cognito_app_client_id
    )
    
    return {
        "service": "auth",
        "mock_auth": auth_service.use_mock_auth,
        "cognito_configured": cognito_configured,
        "aws_region": settings.aws_region,
        "environment": settings.environment
    }


@auth_router.get("/dev/users")
async def list_dev_users():
    """List available users in development mode (mock auth only)"""
    if not auth_service.use_mock_auth:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="This endpoint is only available in mock auth mode"
        )
    
    users = get_mock_users()
    return {
        "users": users,
        "note": "Use these credentials to log in during development",
        "example": {
            "username": "admin",
            "password": "admin",
            "description": "Admin user with full access"
        }
    }