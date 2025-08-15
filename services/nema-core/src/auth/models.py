"""Authentication data models"""

from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


class LoginRequest(BaseModel):
    """Login request model"""
    username: str
    password: str


class LoginResponse(BaseModel):
    """Login response model"""
    access_token: str
    refresh_token: str
    expires_in: int
    token_type: str = "Bearer"


class RefreshRequest(BaseModel):
    """Token refresh request model"""
    refresh_token: str


class User(BaseModel):
    """User model"""
    username: str
    email: Optional[EmailStr] = None
    given_name: Optional[str] = None
    family_name: Optional[str] = None
    groups: List[str] = []
    tenant_id: Optional[str] = None
    
    @property
    def full_name(self) -> str:
        """Get user's full name"""
        if self.given_name and self.family_name:
            return f"{self.given_name} {self.family_name}"
        return self.username
    
    @property
    def is_admin(self) -> bool:
        """Check if user has admin privileges"""
        return any(group.endswith("--admin") or group == "admin" for group in self.groups)
    
    @property
    def is_editor(self) -> bool:
        """Check if user has editor privileges"""
        return (self.is_admin or 
                any(group.endswith("--editor") or group == "editor" for group in self.groups))


class TokenPayload(BaseModel):
    """JWT token payload model"""
    sub: str
    username: str
    email: Optional[str] = None
    given_name: Optional[str] = None
    family_name: Optional[str] = None
    exp: int
    iat: int
    token_use: str
    groups: Optional[List[str]] = None
    tenant_id: Optional[str] = None


class UserCreate(BaseModel):
    """User creation model (for admin operations)"""
    username: str
    email: EmailStr
    temporary_password: str
    given_name: Optional[str] = None
    family_name: Optional[str] = None
    groups: List[str] = []
    tenant_id: Optional[str] = None


class UserUpdate(BaseModel):
    """User update model (for admin operations)"""
    email: Optional[EmailStr] = None
    given_name: Optional[str] = None
    family_name: Optional[str] = None
    groups: Optional[List[str]] = None
    enabled: Optional[bool] = None