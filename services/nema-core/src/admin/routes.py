"""Admin management routes"""

from fastapi import APIRouter, Depends, HTTPException
import structlog

from ..auth.routes import get_current_user
from ..auth.models import User

logger = structlog.get_logger(__name__)

admin_router = APIRouter()


@admin_router.get("/health")
async def admin_health():
    """Health check for admin service"""
    return {"service": "admin", "status": "healthy"}


@admin_router.get("/stats")
async def get_system_stats(current_user: User = Depends(get_current_user)):
    """Get system statistics (admin only)"""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin privileges required")
    
    logger.info("Getting system stats", user=current_user.username)
    
    # TODO: Implement actual system statistics
    return {
        "users": 0,
        "projects": 0,
        "artifacts": 0,
        "workflows": 0
    }


@admin_router.get("/users")
async def list_users(current_user: User = Depends(get_current_user)):
    """List all users (admin only)"""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin privileges required")
    
    logger.info("Listing users", admin=current_user.username)
    
    # TODO: Implement actual user listing from Cognito
    return {
        "users": [],
        "total": 0
    }


@admin_router.post("/users")
async def create_user(current_user: User = Depends(get_current_user)):
    """Create new user (admin only)"""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin privileges required")
    
    logger.info("Creating user", admin=current_user.username)
    
    # TODO: Implement actual user creation in Cognito
    return {"message": "User created successfully"}