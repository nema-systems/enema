"""Authentication routes supporting both Clerk and Mock auth"""

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
            # Import database dependencies at function level
            from ..database.connection import get_db_session
            from ..database.models import Organization, User as DatabaseUser, OrganizationMembership
            from sqlalchemy import select
            
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
                    family_name=payload.get("family_name"),
                    user_id=None,  # Mock users don't have database IDs
                    organization_id=None,  # Mock auth uses tenant_id instead
                    organization_slug=None
                )
            elif self.auth_provider == "clerk":
                # Use Clerk client
                token_data = await auth_client.verify_token(token)
                
                # Log token data for debugging
                logger.info("Clerk token data", 
                          user_id=token_data.sub,
                          email=token_data.email,
                          given_name=token_data.given_name,
                          family_name=token_data.family_name,
                          organization_id=token_data.organization_id,
                          organization_slug=token_data.organization_slug)
                
                # Get or create local organization record
                organization_id = None
                if token_data.organization_slug:
                    async with get_db_session() as db:
                        # Look up organization by slug
                        org_query = select(Organization).where(
                            Organization.slug == token_data.organization_slug
                        )
                        result = await db.execute(org_query)
                        org = result.scalar_one_or_none()
                        
                        if org:
                            # Update existing organization with latest data from Clerk
                            updated = False
                            
                            # Fetch latest data from Clerk API if we have org ID
                            org_data = None
                            if token_data.organization_id:
                                org_data = await auth_client.fetch_organization(token_data.organization_id)
                            
                            # Update fields if they've changed
                            if token_data.organization_id and org.clerk_org_id != token_data.organization_id:
                                org.clerk_org_id = token_data.organization_id
                                updated = True
                            
                            if org_data:
                                if org.name != org_data.get("name"):
                                    org.name = org_data.get("name")
                                    updated = True
                                if org.image_url != org_data.get("image_url"):
                                    org.image_url = org_data.get("image_url")
                                    updated = True
                            
                            if updated:
                                await db.commit()
                                await db.refresh(org)
                                logger.info("Organization updated from Clerk", 
                                          org_id=org.id, 
                                          slug=token_data.organization_slug,
                                          name=org.name)
                            
                            organization_id = org.id
                        else:
                            # Create new organization with full data from Clerk API
                            logger.info("Creating new organization from Clerk", 
                                      slug=token_data.organization_slug,
                                      clerk_org_id=token_data.organization_id)
                            
                            # Fetch full organization data from Clerk API
                            org_data = None
                            if token_data.organization_id:
                                org_data = await auth_client.fetch_organization(token_data.organization_id)
                            
                            new_org = Organization(
                                clerk_org_id=token_data.organization_id,
                                name=org_data.get("name") if org_data else None,
                                slug=org_data.get("slug") if org_data else token_data.organization_slug,
                                image_url=org_data.get("image_url") if org_data else None,
                                deleted=False
                            )
                            
                            db.add(new_org)
                            await db.commit()
                            await db.refresh(new_org)
                            
                            organization_id = new_org.id
                            logger.info("Organization created with Clerk data", 
                                      org_id=organization_id, 
                                      slug=new_org.slug,
                                      has_clerk_data=org_data is not None)
                else:
                    logger.warning("No organization context in Clerk token", 
                                 user_id=token_data.sub)
                
                # Get or create local user record
                user_id = None
                if token_data.sub:
                    async with get_db_session() as db:
                        # Look up user by Clerk user ID
                        user_query = select(DatabaseUser).where(
                            DatabaseUser.clerk_user_id == token_data.sub
                        )
                        result = await db.execute(user_query)
                        db_user = result.scalar_one_or_none()
                        
                        if db_user:
                            # Update existing user if needed
                            updated = False
                            if db_user.email != token_data.email:
                                db_user.email = token_data.email
                                updated = True
                            if db_user.first_name != token_data.given_name:
                                db_user.first_name = token_data.given_name
                                updated = True
                            if db_user.last_name != token_data.family_name:
                                db_user.last_name = token_data.family_name
                                updated = True
                            
                            if updated:
                                await db.commit()
                                await db.refresh(db_user)
                                logger.info("User updated from Clerk", 
                                          user_id=db_user.id, 
                                          clerk_user_id=token_data.sub)
                            
                            user_id = db_user.id
                        else:
                            # Create new user from Clerk data
                            logger.info("Creating new user from Clerk", 
                                      clerk_user_id=token_data.sub,
                                      email=token_data.email)
                            
                            new_user = DatabaseUser(
                                clerk_user_id=token_data.sub,
                                email=token_data.email,
                                first_name=token_data.given_name,
                                last_name=token_data.family_name,
                                image_url=None,  # Could be fetched from Clerk API if needed
                                deleted=False
                            )
                            
                            db.add(new_user)
                            await db.commit()
                            await db.refresh(new_user)
                            
                            user_id = new_user.id
                            logger.info("User created", 
                                      user_id=user_id, 
                                      clerk_user_id=token_data.sub)
                
                # Sync organization membership if both user and organization exist
                if user_id and organization_id:
                    async with get_db_session() as db:
                        # Check if membership exists
                        membership_query = select(OrganizationMembership).where(
                            OrganizationMembership.user_id == user_id,
                            OrganizationMembership.organization_id == organization_id,
                            OrganizationMembership.deleted == False
                        )
                        result = await db.execute(membership_query)
                        membership = result.scalar_one_or_none()
                        
                        if not membership:
                            # Create membership with default role
                            new_membership = OrganizationMembership(
                                user_id=user_id,
                                organization_id=organization_id,
                                role="member",  # Default role, can be updated later
                                deleted=False
                            )
                            
                            db.add(new_membership)
                            await db.commit()
                            
                            logger.info("Organization membership created", 
                                      user_id=user_id, 
                                      organization_id=organization_id)
                
                return User(
                    username=token_data.username,
                    email=token_data.email,
                    groups=token_data.groups or [],
                    tenant_id=None,  # Can be added via Clerk metadata
                    given_name=token_data.given_name,
                    family_name=token_data.family_name,
                    clerk_user_id=token_data.sub,
                    user_id=user_id,
                    organization_id=organization_id,
                    organization_slug=token_data.organization_slug
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