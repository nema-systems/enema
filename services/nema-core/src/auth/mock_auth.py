"""Mock authentication provider for local development"""

from typing import Dict, Optional, List
import structlog
from datetime import datetime, timedelta
import jwt

from ..config.settings import Settings
from .models import User, LoginRequest, LoginResponse, RefreshRequest

logger = structlog.get_logger(__name__)

# Mock user database for development
MOCK_USERS = [
    {
        "username": "admin",
        "password": "admin",
        "email": "admin@local.dev",
        "given_name": "Admin",
        "family_name": "User",
        "groups": ["admin", "editor"],
        "tenant_id": "default"
    },
    {
        "username": "editor",
        "password": "editor", 
        "email": "editor@local.dev",
        "given_name": "Editor",
        "family_name": "User",
        "groups": ["editor"],
        "tenant_id": "default"
    },
    {
        "username": "viewer",
        "password": "viewer",
        "email": "viewer@local.dev", 
        "given_name": "Viewer",
        "family_name": "User",
        "groups": ["viewer"],
        "tenant_id": "default"
    },
    {
        "username": "demo",
        "password": "demo",
        "email": "demo@local.dev",
        "given_name": "Demo",
        "family_name": "User", 
        "groups": ["editor"],
        "tenant_id": "demo"
    }
]


class MockAuthClient:
    """Mock authentication client for local development"""
    
    def __init__(self, settings: Settings):
        self.settings = settings
        logger.info("Using mock authentication (development mode)")
    
    async def authenticate(self, username: str, password: str) -> Dict[str, str]:
        """Mock authentication - checks against hardcoded users"""
        user = next((u for u in MOCK_USERS if u["username"] == username), None)
        
        if not user or user["password"] != password:
            logger.warning("Mock authentication failed", username=username)
            raise ValueError("Invalid credentials")
        
        logger.info("Mock authentication successful", username=username)
        
        # Generate mock JWT tokens
        now = datetime.utcnow()
        exp = now + timedelta(hours=self.settings.jwt_expiry_hours)
        
        access_token = jwt.encode({
            "sub": user["username"],
            "username": user["username"],
            "email": user["email"],
            "given_name": user["given_name"],
            "family_name": user["family_name"],
            "groups": user["groups"],
            "tenant_id": user["tenant_id"],
            "exp": int(exp.timestamp()),
            "iat": int(now.timestamp()),
            "token_use": "access"
        }, self.settings.jwt_secret, algorithm=self.settings.jwt_algorithm)
        
        refresh_token = jwt.encode({
            "sub": user["username"],
            "username": user["username"],
            "exp": int((now + timedelta(days=30)).timestamp()),
            "iat": int(now.timestamp()),
            "token_use": "refresh"
        }, self.settings.jwt_secret, algorithm=self.settings.jwt_algorithm)
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "expires_in": self.settings.jwt_expiry_hours * 3600
        }
    
    async def refresh_access_token(self, refresh_token: str) -> Dict[str, str]:
        """Refresh access token using refresh token"""
        try:
            payload = jwt.decode(
                refresh_token, 
                self.settings.jwt_secret, 
                algorithms=[self.settings.jwt_algorithm]
            )
            
            if payload.get("token_use") != "refresh":
                raise ValueError("Invalid refresh token")
            
            username = payload["username"]
            user = next((u for u in MOCK_USERS if u["username"] == username), None)
            
            if not user:
                raise ValueError("User not found")
            
            # Generate new access token
            now = datetime.utcnow()
            exp = now + timedelta(hours=self.settings.jwt_expiry_hours)
            
            access_token = jwt.encode({
                "sub": user["username"],
                "username": user["username"],
                "email": user["email"],
                "given_name": user["given_name"],
                "family_name": user["family_name"],
                "groups": user["groups"],
                "tenant_id": user["tenant_id"],
                "exp": int(exp.timestamp()),
                "iat": int(now.timestamp()),
                "token_use": "access"
            }, self.settings.jwt_secret, algorithm=self.settings.jwt_algorithm)
            
            return {
                "access_token": access_token,
                "expires_in": self.settings.jwt_expiry_hours * 3600
            }
            
        except jwt.InvalidTokenError as e:
            logger.error("Mock token refresh failed", error=str(e))
            raise ValueError("Invalid refresh token")


async def verify_mock_jwt_token(token: str, settings: Settings) -> Dict:
    """Verify mock JWT token"""
    try:
        payload = jwt.decode(
            token, 
            settings.jwt_secret, 
            algorithms=[settings.jwt_algorithm]
        )
        
        if payload.get("token_use") != "access":
            raise ValueError("Invalid access token")
        
        return payload
        
    except jwt.InvalidTokenError as e:
        logger.error("Mock JWT token validation failed", error=str(e))
        raise ValueError("Invalid token")


def get_mock_users() -> List[Dict]:
    """Get list of mock users (without passwords)"""
    return [
        {
            "username": user["username"],
            "email": user["email"],
            "given_name": user["given_name"],
            "family_name": user["family_name"],
            "groups": user["groups"],
            "tenant_id": user["tenant_id"]
        }
        for user in MOCK_USERS
    ]


def add_mock_user(username: str, email: str, password: str = "password", 
                  given_name: str = "", family_name: str = "", 
                  groups: List[str] = None, tenant_id: str = "default") -> None:
    """Add a mock user for testing"""
    global MOCK_USERS
    
    if groups is None:
        groups = ["viewer"]
    
    new_user = {
        "username": username,
        "password": password,
        "email": email,
        "given_name": given_name,
        "family_name": family_name,
        "groups": groups,
        "tenant_id": tenant_id
    }
    
    # Remove existing user with same username
    MOCK_USERS = [u for u in MOCK_USERS if u["username"] != username]
    MOCK_USERS.append(new_user)
    
    logger.info("Added mock user", username=username, groups=groups)