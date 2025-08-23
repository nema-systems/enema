"""Releases API endpoints"""

from fastapi import APIRouter, HTTPException, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import structlog

from ...database.connection import get_db
from ...database.models import Release, Module
from ...auth.routes import get_current_user
from ...auth.models import User
from .workspaces import validate_workspace_access

logger = structlog.get_logger(__name__)

router = APIRouter()


# Pydantic models
class ReleaseCreate(BaseModel):
    module_id: int
    name: str
    version: str
    description: Optional[str] = None
    draft: bool = True
    release_date: Optional[datetime] = None
    metadata: Optional[dict] = None


class ReleaseUpdate(BaseModel):
    name: Optional[str] = None
    version: Optional[str] = None
    description: Optional[str] = None
    release_date: Optional[datetime] = None
    metadata: Optional[dict] = None


class ReleasePublish(BaseModel):
    release_date: Optional[datetime] = None


class ReleaseResponse(BaseModel):
    id: int
    module_id: int
    prev_release: Optional[int]
    name: str
    public_id: str
    version: str
    description: Optional[str]
    draft: bool
    release_date: Optional[str]
    metadata: Optional[dict]
    created_at: str
    
    class Config:
        from_attributes = True


class PaginatedReleaseResponse(BaseModel):
    success: bool
    data: dict
    meta: dict


class ReleaseDetailResponse(BaseModel):
    success: bool
    data: ReleaseResponse
    meta: dict


# Helper functions
async def get_release_in_workspace(
    workspace_id: int, 
    release_id: int, 
    db: AsyncSession
) -> Release:
    """Get release ensuring it belongs to the workspace via component"""
    query = (
        select(Release)
        .join(Module)
        .where(
            and_(
                Release.id == release_id,
                Module.workspace_id == workspace_id
            )
        )
    )
    result = await db.execute(query)
    release = result.scalar_one_or_none()
    
    if not release:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Release not found in this workspace"
        )
    
    return release


async def get_component_in_workspace(
    workspace_id: int, 
    module_id: int, 
    db: AsyncSession
) -> Module:
    """Get component ensuring it belongs to the workspace"""
    query = select(Module).where(
        and_(
            Module.id == module_id,
            Module.workspace_id == workspace_id
        )
    )
    result = await db.execute(query)
    component = result.scalar_one_or_none()
    
    if not component:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Module not found in this workspace"
        )
    
    return component


@router.get("/", response_model=PaginatedReleaseResponse)
async def list_releases(
    workspace_id: int,
    # Pagination
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    # Filtering
    module_id: Optional[int] = Query(None),
    draft: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    # Sorting
    sort: str = Query("created_at"),
    order: str = Query("desc"),
    # Dependencies
    workspace = Depends(validate_workspace_access),
    db: AsyncSession = Depends(get_db)
):
    """List releases in workspace with filtering and pagination"""
    
    # Build base query
    query = (
        select(Release)
        .join(Module)
        .where(Module.workspace_id == workspace_id)
    )
    
    # Apply filters
    if module_id:
        query = query.where(Release.module_id == module_id)
    
    if draft is not None:
        query = query.where(Release.draft == draft)
    
    if search:
        query = query.where(
            Release.name.ilike(f"%{search}%") | 
            Release.description.ilike(f"%{search}%") |
            Release.version.ilike(f"%{search}%")
        )
    
    # Apply sorting
    if order == "desc":
        if sort == "created_at":
            query = query.order_by(Release.created_at.desc())
        elif sort == "name":
            query = query.order_by(Release.name.desc())
        elif sort == "release_date":
            query = query.order_by(Release.release_date.desc())
        else:
            query = query.order_by(Release.created_at.desc())
    else:
        if sort == "created_at":
            query = query.order_by(Release.created_at.asc())
        elif sort == "name":
            query = query.order_by(Release.name.asc())
        elif sort == "release_date":
            query = query.order_by(Release.release_date.asc())
        else:
            query = query.order_by(Release.created_at.asc())
    
    # Count total for pagination
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # Apply pagination
    offset = (page - 1) * limit
    query = query.offset(offset).limit(limit)
    
    result = await db.execute(query)
    releases = result.scalars().all()
    
    release_list = [
        ReleaseResponse(
            id=rel.id,
            module_id=rel.module_id,
            prev_release=rel.prev_release,
            name=rel.name,
            public_id=rel.public_id,
            version=rel.version,
            description=rel.description,
            draft=rel.draft,
            release_date=rel.release_date.isoformat() if rel.release_date else None,
            metadata=rel.metadata,
            created_at=rel.created_at.isoformat()
        ) for rel in releases
    ]
    
    total_pages = (total + limit - 1) // limit
    
    return PaginatedReleaseResponse(
        success=True,
        data={
            "items": release_list,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "totalPages": total_pages,
                "hasNext": page < total_pages,
                "hasPrev": page > 1
            }
        },
        meta={
            "timestamp": "2024-01-01T12:00:00Z",
            "requestId": "req_123456"
        }
    )


@router.post("/", response_model=ReleaseDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_release(
    workspace_id: int,
    release_data: ReleaseCreate,
    workspace = Depends(validate_workspace_access),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create new release"""
    
    # Validate component belongs to workspace
    component = await get_component_in_workspace(workspace_id, release_data.module_id, db)
    
    # Get previous release for this component (if any)
    prev_release_query = (
        select(Release)
        .where(Release.module_id == release_data.module_id)
        .order_by(Release.created_at.desc())
        .limit(1)
    )
    prev_release_result = await db.execute(prev_release_query)
    prev_release = prev_release_result.scalar_one_or_none()
    
    # Create release (public_id will be auto-generated by trigger)
    new_release = Release(
        module_id=release_data.module_id,
        prev_release=prev_release.id if prev_release else None,
        name=release_data.name,
        version=release_data.version,
        description=release_data.description,
        draft=release_data.draft,
        release_date=release_data.release_date,
        metadata=release_data.metadata
    )
    
    db.add(new_release)
    await db.commit()
    await db.refresh(new_release)
    
    logger.info("Release created", 
                release_id=new_release.id, 
                public_id=new_release.public_id,
                name=release_data.name,
                module_id=release_data.module_id,
                workspace_id=workspace_id)
    
    release_response = ReleaseResponse(
        id=new_release.id,
        module_id=new_release.module_id,
        prev_release=new_release.prev_release,
        name=new_release.name,
        public_id=new_release.public_id,
        version=new_release.version,
        description=new_release.description,
        draft=new_release.draft,
        release_date=new_release.release_date.isoformat() if new_release.release_date else None,
        metadata=new_release.metadata,
        created_at=new_release.created_at.isoformat()
    )
    
    return ReleaseDetailResponse(
        success=True,
        data=release_response,
        meta={
            "timestamp": "2024-01-01T12:00:00Z",
            "requestId": "req_123456"
        }
    )


@router.get("/{release_id}", response_model=ReleaseDetailResponse)
async def get_release(
    workspace_id: int,
    release_id: int,
    workspace = Depends(validate_workspace_access),
    db: AsyncSession = Depends(get_db)
):
    """Get release details"""
    
    release = await get_release_in_workspace(workspace_id, release_id, db)
    
    release_response = ReleaseResponse(
        id=release.id,
        module_id=release.module_id,
        prev_release=release.prev_release,
        name=release.name,
        public_id=release.public_id,
        version=release.version,
        description=release.description,
        draft=release.draft,
        release_date=release.release_date.isoformat() if release.release_date else None,
        metadata=release.metadata,
        created_at=release.created_at.isoformat()
    )
    
    return ReleaseDetailResponse(
        success=True,
        data=release_response,
        meta={
            "timestamp": "2024-01-01T12:00:00Z",
            "requestId": "req_123456"
        }
    )


@router.put("/{release_id}", response_model=ReleaseDetailResponse)
async def update_release(
    workspace_id: int,
    release_id: int,
    release_data: ReleaseUpdate,
    workspace = Depends(validate_workspace_access),
    db: AsyncSession = Depends(get_db)
):
    """Update release (only allowed for draft releases)"""
    
    release = await get_release_in_workspace(workspace_id, release_id, db)
    
    # Check if release is draft
    if not release.draft:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot modify published release"
        )
    
    # Update fields if provided
    if release_data.name is not None:
        release.name = release_data.name
    if release_data.version is not None:
        release.version = release_data.version
    if release_data.description is not None:
        release.description = release_data.description
    if release_data.release_date is not None:
        release.release_date = release_data.release_date
    if release_data.metadata is not None:
        release.metadata = release_data.metadata
    
    await db.commit()
    await db.refresh(release)
    
    logger.info("Release updated", 
                release_id=release.id,
                public_id=release.public_id,
                workspace_id=workspace_id)
    
    release_response = ReleaseResponse(
        id=release.id,
        module_id=release.module_id,
        prev_release=release.prev_release,
        name=release.name,
        public_id=release.public_id,
        version=release.version,
        description=release.description,
        draft=release.draft,
        release_date=release.release_date.isoformat() if release.release_date else None,
        metadata=release.metadata,
        created_at=release.created_at.isoformat()
    )
    
    return ReleaseDetailResponse(
        success=True,
        data=release_response,
        meta={
            "timestamp": "2024-01-01T12:00:00Z",
            "requestId": "req_123456"
        }
    )


@router.delete("/{release_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_release(
    workspace_id: int,
    release_id: int,
    workspace = Depends(validate_workspace_access),
    db: AsyncSession = Depends(get_db)
):
    """Delete release (only allowed for draft releases)"""
    
    release = await get_release_in_workspace(workspace_id, release_id, db)
    
    # Check if release is draft
    if not release.draft:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete published release"
        )
    
    await db.delete(release)
    await db.commit()
    
    logger.info("Release deleted", 
                release_id=release_id,
                public_id=release.public_id,
                workspace_id=workspace_id)


@router.post("/{release_id}/publish", response_model=ReleaseDetailResponse)
async def publish_release(
    workspace_id: int,
    release_id: int,
    publish_data: ReleasePublish,
    workspace = Depends(validate_workspace_access),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Publish draft release"""
    
    release = await get_release_in_workspace(workspace_id, release_id, db)
    
    # Check if release is draft
    if not release.draft:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Release is already published"
        )
    
    # Publish release
    release.draft = False
    if publish_data.release_date:
        release.release_date = publish_data.release_date
    elif not release.release_date:
        # Set current time as release date if not provided
        release.release_date = datetime.utcnow()
    
    await db.commit()
    await db.refresh(release)
    
    logger.info("Release published", 
                release_id=release.id,
                public_id=release.public_id,
                version=release.version,
                workspace_id=workspace_id)
    
    release_response = ReleaseResponse(
        id=release.id,
        module_id=release.module_id,
        prev_release=release.prev_release,
        name=release.name,
        public_id=release.public_id,
        version=release.version,
        description=release.description,
        draft=release.draft,
        release_date=release.release_date.isoformat() if release.release_date else None,
        metadata=release.metadata,
        created_at=release.created_at.isoformat()
    )
    
    return ReleaseDetailResponse(
        success=True,
        data=release_response,
        meta={
            "timestamp": "2024-01-01T12:00:00Z",
            "requestId": "req_123456"
        }
    )