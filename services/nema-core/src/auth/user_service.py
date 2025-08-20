"""User service for managing Clerk user synchronization"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from typing import Optional
import structlog

from ..database.models import User
from ..database.connection import get_db_session
from .models import User as AuthUser

logger = structlog.get_logger(__name__)


class UserService:
    """Service for managing user data synchronization with Clerk"""
    
    async def get_or_create_user(self, auth_user: AuthUser) -> int:
        """Get existing user or create new one from Clerk auth data"""
        async with get_db_session() as session:
            try:
                # Try to find existing user by Clerk ID
                result = await session.execute(
                    select(User).where(User.clerk_user_id == auth_user.username)
                )
                user = result.scalar_one_or_none()
                
                if user:
                    # Update last seen and basic info
                    user.username = auth_user.username
                    user.email = auth_user.email
                    await session.commit()
                    logger.info("Updated existing user", user_id=user.id, clerk_id=auth_user.username)
                    return user.id
                else:
                    # Create new user
                    user = User(
                        clerk_user_id=auth_user.username,
                        username=auth_user.username,
                        email=auth_user.email
                    )
                    session.add(user)
                    await session.commit()
                    await session.refresh(user)
                    logger.info("Created new user", user_id=user.id, clerk_id=auth_user.username)
                    return user.id
                    
            except IntegrityError as e:
                await session.rollback()
                logger.error("Failed to create/update user", error=str(e), clerk_id=auth_user.username)
                # Try to get existing user in case of race condition
                result = await session.execute(
                    select(User).where(User.clerk_user_id == auth_user.username)
                )
                user = result.scalar_one_or_none()
                if user:
                    return user.id
                raise
            except Exception as e:
                await session.rollback()
                logger.error("Unexpected error in user sync", error=str(e), clerk_id=auth_user.username)
                raise
    
    async def get_user_by_clerk_id(self, clerk_user_id: str) -> Optional[User]:
        """Get user by Clerk user ID"""
        async with get_db_session() as session:
            result = await session.execute(
                select(User).where(User.clerk_user_id == clerk_user_id)
            )
            return result.scalar_one_or_none()
    
    async def get_user_by_id(self, user_id: int) -> Optional[User]:
        """Get user by internal ID"""
        async with get_db_session() as session:
            result = await session.execute(
                select(User).where(User.id == user_id)
            )
            return result.scalar_one_or_none()


# Global user service instance
user_service = UserService()