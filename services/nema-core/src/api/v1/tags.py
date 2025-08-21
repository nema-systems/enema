"""Tags API endpoints"""

from fastapi import APIRouter, HTTPException, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from typing import List, Optional
from pydantic import BaseModel
import structlog

from ...database.connection import get_db
from ...database.models import Tag
from ...auth.routes import get_current_user
from ...auth.models import User
from .workspaces import validate_workspace_access

logger = structlog.get_logger(__name__)

router = APIRouter()


# Pydantic models
class TagCreate(BaseModel):
    name: str
    color: Optional[str] = None  # Hex color code like #FF5733


class TagUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None


class TagResponse(BaseModel):
    id: int
    workspace_id: int
    name: str
    color: Optional[str]
    created_at: str
    
    class Config:
        from_attributes = True


class PaginatedTagResponse(BaseModel):
    success: bool
    data: dict
    meta: dict


class TagDetailResponse(BaseModel):
    success: bool
    data: TagResponse
    meta: dict


# Helper functions
async def get_tag_in_workspace(
    workspace_id: int, 
    tag_id: int, 
    db: AsyncSession
) -> Tag:
    """Get tag ensuring it belongs to the workspace"""
    query = select(Tag).where(
        and_(
            Tag.id == tag_id,
            Tag.workspace_id == workspace_id
        )
    )
    result = await db.execute(query)
    tag = result.scalar_one_or_none()
    
    if not tag:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tag not found in this workspace"
        )
    
    return tag


def validate_hex_color(color: Optional[str]) -> Optional[str]:
    """Validate hex color format"""
    if not color:
        return color
    
    # Remove # if present
    if color.startswith('#'):
        color = color[1:]
    
    # Check if valid hex
    if len(color) not in [3, 6]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Color must be a valid hex color code (e.g., #FF5733 or #F53)"
        )
    
    try:
        int(color, 16)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Color must be a valid hex color code"
        )
    
    # Return with # prefix
    return f"#{color.upper()}"


@router.get("/", response_model=PaginatedTagResponse)
async def list_tags(
    workspace_id: int,
    # Pagination
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    # Filtering
    search: Optional[str] = Query(None),
    # Sorting
    sort: str = Query("name"),
    order: str = Query("asc"),
    # Dependencies
    workspace = Depends(validate_workspace_access),
    db: AsyncSession = Depends(get_db)
):
    """List tags in workspace with filtering and pagination"""
    
    # Build base query
    query = select(Tag).where(Tag.workspace_id == workspace_id)
    
    # Apply filters
    if search:
        query = query.where(Tag.name.ilike(f"%{search}%"))
    
    # Apply sorting
    if order == "desc":
        if sort == "created_at":
            query = query.order_by(Tag.created_at.desc())
        elif sort == "name":
            query = query.order_by(Tag.name.desc())
        else:
            query = query.order_by(Tag.name.desc())
    else:
        if sort == "created_at":
            query = query.order_by(Tag.created_at.asc())
        elif sort == "name":
            query = query.order_by(Tag.name.asc())
        else:
            query = query.order_by(Tag.name.asc())
    
    # Count total for pagination
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # Apply pagination
    offset = (page - 1) * limit
    query = query.offset(offset).limit(limit)
    
    result = await db.execute(query)
    tags = result.scalars().all()
    
    tag_list = [
        TagResponse(
            id=tag.id,
            workspace_id=tag.workspace_id,
            name=tag.name,
            color=tag.color,
            created_at=tag.created_at.isoformat()
        ) for tag in tags
    ]
    
    total_pages = (total + limit - 1) // limit
    
    return PaginatedTagResponse(
        success=True,
        data={
            "items": tag_list,
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


@router.post("/", response_model=TagDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_tag(
    workspace_id: int,
    tag_data: TagCreate,
    workspace = Depends(validate_workspace_access),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create new tag"""
    
    # Validate color format
    validated_color = validate_hex_color(tag_data.color)
    
    # Check if tag name already exists in workspace
    existing_query = select(Tag).where(
        and_(
            Tag.workspace_id == workspace_id,
            Tag.name == tag_data.name
        )
    )
    existing_result = await db.execute(existing_query)
    existing_tag = existing_result.scalar_one_or_none()
    
    if existing_tag:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Tag with name '{tag_data.name}' already exists in this workspace"
        )
    
    # Create tag
    new_tag = Tag(
        workspace_id=workspace_id,
        name=tag_data.name,
        color=validated_color
    )
    
    db.add(new_tag)
    await db.commit()
    await db.refresh(new_tag)
    
    logger.info("Tag created", 
                tag_id=new_tag.id, 
                name=tag_data.name,
                workspace_id=workspace_id)
    
    tag_response = TagResponse(
        id=new_tag.id,
        workspace_id=new_tag.workspace_id,
        name=new_tag.name,
        color=new_tag.color,
        created_at=new_tag.created_at.isoformat()
    )
    
    return TagDetailResponse(
        success=True,
        data=tag_response,
        meta={
            "timestamp": "2024-01-01T12:00:00Z",
            "requestId": "req_123456"
        }
    )


@router.get("/{tag_id}", response_model=TagDetailResponse)
async def get_tag(
    workspace_id: int,
    tag_id: int,
    workspace = Depends(validate_workspace_access),
    db: AsyncSession = Depends(get_db)
):
    """Get tag details"""
    
    tag = await get_tag_in_workspace(workspace_id, tag_id, db)
    
    tag_response = TagResponse(
        id=tag.id,
        workspace_id=tag.workspace_id,
        name=tag.name,
        color=tag.color,
        created_at=tag.created_at.isoformat()
    )
    
    return TagDetailResponse(
        success=True,
        data=tag_response,
        meta={
            "timestamp": "2024-01-01T12:00:00Z",
            "requestId": "req_123456"
        }
    )


@router.put("/{tag_id}", response_model=TagDetailResponse)
async def update_tag(
    workspace_id: int,
    tag_id: int,
    tag_data: TagUpdate,
    workspace = Depends(validate_workspace_access),
    db: AsyncSession = Depends(get_db)
):
    """Update tag"""
    
    tag = await get_tag_in_workspace(workspace_id, tag_id, db)
    
    # Check if new name already exists (if name is being changed)
    if tag_data.name is not None and tag_data.name != tag.name:
        existing_query = select(Tag).where(
            and_(
                Tag.workspace_id == workspace_id,
                Tag.name == tag_data.name,
                Tag.id != tag_id
            )
        )
        existing_result = await db.execute(existing_query)
        existing_tag = existing_result.scalar_one_or_none()
        
        if existing_tag:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Tag with name '{tag_data.name}' already exists in this workspace"
            )
    
    # Update fields if provided
    if tag_data.name is not None:
        tag.name = tag_data.name
    if tag_data.color is not None:
        validated_color = validate_hex_color(tag_data.color)
        tag.color = validated_color
    
    await db.commit()
    await db.refresh(tag)
    
    logger.info("Tag updated", 
                tag_id=tag.id,
                name=tag.name,
                workspace_id=workspace_id)
    
    tag_response = TagResponse(
        id=tag.id,
        workspace_id=tag.workspace_id,
        name=tag.name,
        color=tag.color,
        created_at=tag.created_at.isoformat()
    )
    
    return TagDetailResponse(
        success=True,
        data=tag_response,
        meta={
            "timestamp": "2024-01-01T12:00:00Z",
            "requestId": "req_123456"
        }
    )


@router.delete("/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tag(
    workspace_id: int,
    tag_id: int,
    workspace = Depends(validate_workspace_access),
    db: AsyncSession = Depends(get_db)
):
    """Delete tag"""
    
    tag = await get_tag_in_workspace(workspace_id, tag_id, db)
    
    # Check if tag is in use (optional - you might want to allow deletion with cascading)
    # This would require checking requirement_tags, parameter_tags, testcase_tags junction tables
    # For now, we'll allow deletion and let the database handle cascading
    
    await db.delete(tag)
    await db.commit()
    
    logger.info("Tag deleted", 
                tag_id=tag_id,
                name=tag.name,
                workspace_id=workspace_id)