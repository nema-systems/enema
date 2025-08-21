"""Organizations API endpoints for listing local organizations (debug purposes)"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from pydantic import BaseModel
import structlog

from ...auth.routes import User, get_current_user
from ...database.connection import get_db
from ...database.models import Organization

logger = structlog.get_logger(__name__)

router = APIRouter()

class OrganizationResponse(BaseModel):
    """Organization response model"""
    id: int
    clerk_org_id: Optional[str]
    name: Optional[str]
    slug: str
    image_url: Optional[str]
    deleted: bool
    created_at: str
    updated_at: str

class OrganizationListResponse(BaseModel):
    """Organization list response"""
    success: bool
    data: List[OrganizationResponse]
    meta: dict

@router.get("/debug", response_model=OrganizationListResponse)
async def list_local_organizations_debug(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all organizations stored locally (debug endpoint)"""
    
    logger.info("Debug: Listing all local organizations", user_id=current_user.clerk_user_id)
    
    try:
        # Get all organizations from local database
        query = select(Organization).where(Organization.deleted == False).order_by(Organization.created_at.desc())
        result = await db.execute(query)
        organizations = result.scalars().all()
        
        org_list = []
        for org in organizations:
            org_list.append(OrganizationResponse(
                id=org.id,
                clerk_org_id=org.clerk_org_id,
                name=org.name,
                slug=org.slug,
                image_url=org.image_url,
                deleted=org.deleted,
                created_at=org.created_at.isoformat(),
                updated_at=org.updated_at.isoformat()
            ))
        
        logger.info("Debug: Found local organizations", count=len(org_list))
        
        return OrganizationListResponse(
            success=True,
            data=org_list,
            meta={
                "total": len(org_list),
                "timestamp": "2024-01-01T12:00:00Z",  # TODO: Use actual timestamp
                "requestId": "debug_req_123",  # TODO: Generate request ID
                "message": f"Found {len(org_list)} local organizations"
            }
        )
        
    except Exception as e:
        logger.error("Error listing local organizations", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list local organizations"
        )