"""Groups API endpoints"""

from fastapi import APIRouter, HTTPException, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from typing import List, Optional
from pydantic import BaseModel
import structlog

from ...database.connection import get_db
from ...database.models import Group
from ...auth.routes import get_current_user
from ...auth.models import User
from .workspaces import validate_workspace_access

logger = structlog.get_logger(__name__)

router = APIRouter()


# Pydantic models
class GroupCreate(BaseModel):
    name: str
    description: Optional[str] = None


class GroupUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class GroupResponse(BaseModel):
    id: int
    workspace_id: int
    name: str
    description: Optional[str]
    created_at: str
    
    class Config:
        from_attributes = True


class PaginatedGroupResponse(BaseModel):
    success: bool
    data: dict
    meta: dict


class GroupDetailResponse(BaseModel):
    success: bool
    data: GroupResponse
    meta: dict


# Helper functions
async def get_group_in_workspace(
    workspace_id: int, 
    group_id: int, 
    db: AsyncSession
) -> Group:
    """Get group ensuring it belongs to the workspace"""
    query = select(Group).where(
        and_(
            Group.id == group_id,
            Group.workspace_id == workspace_id
        )
    )
    result = await db.execute(query)
    group = result.scalar_one_or_none()
    
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found in this workspace"
        )
    
    return group


@router.get("/", response_model=PaginatedGroupResponse)
async def list_groups(
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
    """List groups in workspace with filtering and pagination"""
    
    # Build base query
    query = select(Group).where(Group.workspace_id == workspace_id)
    
    # Apply filters
    if search:
        query = query.where(
            Group.name.ilike(f"%{search}%") | 
            Group.description.ilike(f"%{search}%")
        )
    
    # Apply sorting
    if order == "desc":
        if sort == "created_at":
            query = query.order_by(Group.created_at.desc())
        elif sort == "name":
            query = query.order_by(Group.name.desc())
        else:
            query = query.order_by(Group.name.desc())
    else:
        if sort == "created_at":
            query = query.order_by(Group.created_at.asc())
        elif sort == "name":
            query = query.order_by(Group.name.asc())
        else:
            query = query.order_by(Group.name.asc())
    
    # Count total for pagination
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # Apply pagination
    offset = (page - 1) * limit
    query = query.offset(offset).limit(limit)
    
    result = await db.execute(query)
    groups = result.scalars().all()
    
    group_list = [
        GroupResponse(
            id=group.id,
            workspace_id=group.workspace_id,
            name=group.name,
            description=group.description,
            created_at=group.created_at.isoformat()
        ) for group in groups
    ]
    
    total_pages = (total + limit - 1) // limit
    
    return PaginatedGroupResponse(
        success=True,
        data={
            "items": group_list,
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


@router.post("/", response_model=GroupDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_group(
    workspace_id: int,
    group_data: GroupCreate,
    workspace = Depends(validate_workspace_access),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create new group"""
    
    # Check if group name already exists in workspace
    existing_query = select(Group).where(
        and_(
            Group.workspace_id == workspace_id,
            Group.name == group_data.name
        )
    )
    existing_result = await db.execute(existing_query)
    existing_group = existing_result.scalar_one_or_none()
    
    if existing_group:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Group with name '{group_data.name}' already exists in this workspace"
        )
    
    # Create group
    new_group = Group(
        workspace_id=workspace_id,
        name=group_data.name,
        description=group_data.description
    )
    
    db.add(new_group)
    await db.commit()
    await db.refresh(new_group)
    
    logger.info("Group created", 
                group_id=new_group.id, 
                name=group_data.name,
                workspace_id=workspace_id)
    
    group_response = GroupResponse(
        id=new_group.id,
        workspace_id=new_group.workspace_id,
        name=new_group.name,
        description=new_group.description,
        created_at=new_group.created_at.isoformat()
    )
    
    return GroupDetailResponse(
        success=True,
        data=group_response,
        meta={
            "timestamp": "2024-01-01T12:00:00Z",
            "requestId": "req_123456"
        }
    )


@router.get("/{group_id}", response_model=GroupDetailResponse)
async def get_group(
    workspace_id: int,
    group_id: int,
    workspace = Depends(validate_workspace_access),
    db: AsyncSession = Depends(get_db)
):
    """Get group details"""
    
    group = await get_group_in_workspace(workspace_id, group_id, db)
    
    group_response = GroupResponse(
        id=group.id,
        workspace_id=group.workspace_id,
        name=group.name,
        description=group.description,
        created_at=group.created_at.isoformat()
    )
    
    return GroupDetailResponse(
        success=True,
        data=group_response,
        meta={
            "timestamp": "2024-01-01T12:00:00Z",
            "requestId": "req_123456"
        }
    )


@router.put("/{group_id}", response_model=GroupDetailResponse)
async def update_group(
    workspace_id: int,
    group_id: int,
    group_data: GroupUpdate,
    workspace = Depends(validate_workspace_access),
    db: AsyncSession = Depends(get_db)
):
    """Update group"""
    
    group = await get_group_in_workspace(workspace_id, group_id, db)
    
    # Check if new name already exists (if name is being changed)
    if group_data.name is not None and group_data.name != group.name:
        existing_query = select(Group).where(
            and_(
                Group.workspace_id == workspace_id,
                Group.name == group_data.name,
                Group.id != group_id
            )
        )
        existing_result = await db.execute(existing_query)
        existing_group = existing_result.scalar_one_or_none()
        
        if existing_group:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Group with name '{group_data.name}' already exists in this workspace"
            )
    
    # Update fields if provided
    if group_data.name is not None:
        group.name = group_data.name
    if group_data.description is not None:
        group.description = group_data.description
    
    await db.commit()
    await db.refresh(group)
    
    logger.info("Group updated", 
                group_id=group.id,
                name=group.name,
                workspace_id=workspace_id)
    
    group_response = GroupResponse(
        id=group.id,
        workspace_id=group.workspace_id,
        name=group.name,
        description=group.description,
        created_at=group.created_at.isoformat()
    )
    
    return GroupDetailResponse(
        success=True,
        data=group_response,
        meta={
            "timestamp": "2024-01-01T12:00:00Z",
            "requestId": "req_123456"
        }
    )


@router.delete("/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_group(
    workspace_id: int,
    group_id: int,
    workspace = Depends(validate_workspace_access),
    db: AsyncSession = Depends(get_db)
):
    """Delete group"""
    
    group = await get_group_in_workspace(workspace_id, group_id, db)
    
    # Check if group is in use (optional - you might want to allow deletion with cascading)
    # This would require checking requirement_groups, testcase_groups junction tables
    # For now, we'll allow deletion and let the database handle cascading
    
    await db.delete(group)
    await db.commit()
    
    logger.info("Group deleted", 
                group_id=group_id,
                name=group.name,
                workspace_id=workspace_id)