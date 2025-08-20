"""Authentication routes supporting both Cognito and Mock auth"""

from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional, List
import structlog

from ..config.settings import get_settings
from .clerk_client import ClerkClient
from .mock_auth import MockAuthClient, verify_mock_jwt_token, get_mock_users
from .models import User, LoginRequest, LoginResponse, RefreshRequest

logger = structlog.get_logger(__name__)
security = HTTPBearer()

auth_router = APIRouter()


class AuthService:
    """Authentication service supporting Clerk and Mock auth"""
    
    def __init__(self):
        self.settings = get_settings()
        self.auth_provider = self._determine_auth_provider()
        self.auth_client = None
        
        if self.auth_provider == "mock":
            self.auth_client = MockAuthClient(self.settings)
            logger.info("Using mock authentication for development")
        elif self.auth_provider == "clerk":
            self.auth_client = ClerkClient(self.settings)
            logger.info("Using Clerk authentication")
        else:
            raise ValueError(f"Unsupported auth provider: {self.auth_provider}")
    
    def _get_auth_client(self):
        """Get the auth client"""
        return self.auth_client
    
    def _determine_auth_provider(self) -> str:
        """Determine which authentication provider to use"""
        # Priority order: Mock -> Clerk
        
        if self.settings.mock_auth_enabled:
            return "mock"
        
        if self.settings.clerk_secret_key:
            return "clerk"
        
        # Default to mock in development if nothing else is configured
        if self.settings.is_development:
            logger.info("No auth provider configured in development, using mock auth")
            return "mock"
        
        # In production, require proper auth configuration
        raise ValueError("No authentication provider configured. Please configure CLERK_SECRET_KEY or enable MOCK_AUTH_ENABLED.")
    
    async def login(self, request: LoginRequest) -> LoginResponse:
        """Authenticate user (Note: Clerk handles login via frontend)"""
        if self.auth_provider == "clerk":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Login is handled by Clerk frontend. Use Clerk's authentication flow."
            )
        
        try:
            auth_client = self._get_auth_client()
            
            if self.auth_provider == "mock":
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
                # Should not reach here with current provider logic
                raise ValueError(f"Unsupported auth provider: {self.auth_provider}")
                
        except HTTPException:
            # Re-raise HTTP exceptions from the auth client
            raise
        except Exception as e:
            logger.error("Authentication failed", 
                        username=request.username, 
                        error=str(e),
                        auth_provider=self.auth_provider)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )
    
    async def refresh_token(self, request: RefreshRequest) -> LoginResponse:
        """Refresh access token using refresh token"""
        if self.auth_provider == "clerk":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Token refresh is handled by Clerk frontend. Use Clerk's token management."
            )
        
        try:
            auth_client = self._get_auth_client()
            
            if self.auth_provider == "mock":
                result = await auth_client.refresh_access_token(request.refresh_token)
                return LoginResponse(
                    access_token=result["access_token"],
                    refresh_token=request.refresh_token,
                    expires_in=result["expires_in"],
                    token_type="Bearer"
                )
            else:
                # Should not reach here with current provider logic
                raise ValueError(f"Unsupported auth provider: {self.auth_provider}")
                
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
            
            if self.auth_provider == "mock":
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
            elif self.auth_provider == "clerk":
                # Use Clerk client
                token_data = await auth_client.verify_token(token)
                return User(
                    username=token_data.username,
                    email=token_data.email,
                    groups=token_data.groups or [],
                    tenant_id=None,  # Can be added via Clerk metadata
                    given_name=token_data.given_name,
                    family_name=token_data.family_name
                )
            else:
                # Should not reach here with current provider logic
                raise ValueError(f"Unsupported auth provider: {self.auth_provider}")
                
        except HTTPException:
            # Re-raise HTTP exceptions from the auth client
            raise
        except Exception as e:
            logger.error("Token validation failed", error=str(e), auth_provider=self.auth_provider)
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
    
    # Check if Clerk is configured
    clerk_configured = bool(settings.clerk_secret_key)
    
    return {
        "service": "auth",
        "auth_provider": auth_service.auth_provider,
        "mock_auth": auth_service.auth_provider == "mock",
        "clerk_configured": clerk_configured,
        "environment": settings.environment
    }


@auth_router.get("/dev/users")
async def list_dev_users():
    """List available users in development mode (mock auth only)"""
    if auth_service.auth_provider != "mock":
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