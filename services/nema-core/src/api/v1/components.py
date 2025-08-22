"""Components API endpoints"""

from fastapi import APIRouter, HTTPException, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from typing import List, Optional
from pydantic import BaseModel
import structlog

from ...database.connection import get_db
from ...database.models import Component, ReqTree, Project
from ...auth.routes import get_current_user
from ...auth.models import User
from .workspaces import validate_workspace_access

logger = structlog.get_logger(__name__)

router = APIRouter()


# Pydantic models
class ComponentCreate(BaseModel):
    req_tree_id: int
    name: str
    description: Optional[str] = None
    rules: Optional[str] = None
    shared: bool = False
    metadata: Optional[dict] = None


class ComponentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    rules: Optional[str] = None
    shared: Optional[bool] = None
    metadata: Optional[dict] = None


class ComponentResponse(BaseModel):
    id: int
    workspace_id: int
    req_tree_id: int
    name: str
    description: Optional[str]
    rules: Optional[str]
    shared: bool
    metadata: Optional[dict]
    created_at: str
    
    class Config:
        from_attributes = True


class PaginatedComponentResponse(BaseModel):
    success: bool
    data: dict
    meta: dict


class ComponentDetailResponse(BaseModel):
    success: bool
    data: ComponentResponse
    meta: dict


# Helper functions
async def get_component_in_workspace(
    workspace_id: int, 
    component_id: int, 
    db: AsyncSession
) -> Component:
    """Get component ensuring it belongs to the workspace"""
    query = select(Component).where(
        and_(
            Component.id == component_id,
            Component.workspace_id == workspace_id
        )
    )
    result = await db.execute(query)
    component = result.scalar_one_or_none()
    
    if not component:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Component not found in this workspace"
        )
    
    return component


@router.get("/", response_model=PaginatedComponentResponse)
async def list_components(
    workspace_id: int,
    # Pagination
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    # Filtering
    project_id: Optional[int] = Query(None),
    shared: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    # Sorting
    sort: str = Query("created_at"),
    order: str = Query("desc"),
    # Dependencies
    workspace = Depends(validate_workspace_access),
    db: AsyncSession = Depends(get_db)
):
    """List components in workspace with filtering and pagination"""
    
    # Build base query
    query = select(Component).where(Component.workspace_id == workspace_id)
    
    # Apply filters
    if project_id:
        # Filter by project association
        from ...database.models import ProjectComponent
        query = query.join(ProjectComponent).where(
            ProjectComponent.project_id == project_id
        )
    
    if shared is not None:
        query = query.where(Component.shared == shared)
    
    if search:
        query = query.where(
            Component.name.ilike(f"%{search}%") | 
            Component.description.ilike(f"%{search}%")
        )
    
    # Apply sorting
    if order == "desc":
        if sort == "created_at":
            query = query.order_by(Component.created_at.desc())
        elif sort == "name":
            query = query.order_by(Component.name.desc())
        else:
            query = query.order_by(Component.created_at.desc())
    else:
        if sort == "created_at":
            query = query.order_by(Component.created_at.asc())
        elif sort == "name":
            query = query.order_by(Component.name.asc())
        else:
            query = query.order_by(Component.created_at.asc())
    
    # Count total for pagination
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # Apply pagination
    offset = (page - 1) * limit
    query = query.offset(offset).limit(limit)
    
    result = await db.execute(query)
    components = result.scalars().all()
    
    component_list = [
        ComponentResponse(
            id=comp.id,
            workspace_id=comp.workspace_id,
            req_tree_id=comp.req_tree_id,
            name=comp.name,
            description=comp.description,
            rules=comp.rules,
            shared=comp.shared,
            metadata=comp.meta_data,
            created_at=comp.created_at.isoformat()
        ) for comp in components
    ]
    
    total_pages = (total + limit - 1) // limit
    
    return PaginatedComponentResponse(
        success=True,
        data={
            "items": component_list,
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


@router.post("/", response_model=ComponentDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_component(
    workspace_id: int,
    component_data: ComponentCreate,
    workspace = Depends(validate_workspace_access),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create new component"""
    
    # Validate req_tree belongs to workspace
    req_tree_query = select(ReqTree).where(
        and_(
            ReqTree.id == component_data.req_tree_id,
            ReqTree.workspace_id == workspace_id
        )
    )
    req_tree_result = await db.execute(req_tree_query)
    req_tree = req_tree_result.scalar_one_or_none()
    
    if not req_tree:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Requirement tree not found in this workspace"
        )
    
    # Create component
    new_component = Component(
        workspace_id=workspace_id,
        req_tree_id=component_data.req_tree_id,
        name=component_data.name,
        description=component_data.description,
        rules=component_data.rules,
        shared=component_data.shared,
        meta_data=component_data.metadata
    )
    
    db.add(new_component)
    await db.commit()
    await db.refresh(new_component)
    
    logger.info("Component created", 
                component_id=new_component.id, 
                name=component_data.name,
                workspace_id=workspace_id)
    
    component_response = ComponentResponse(
        id=new_component.id,
        workspace_id=new_component.workspace_id,
        req_tree_id=new_component.req_tree_id,
        name=new_component.name,
        description=new_component.description,
        rules=new_component.rules,
        shared=new_component.shared,
        metadata=new_component.meta_data,
        created_at=new_component.created_at.isoformat()
    )
    
    return ComponentDetailResponse(
        success=True,
        data=component_response,
        meta={
            "timestamp": "2024-01-01T12:00:00Z",
            "requestId": "req_123456"
        }
    )


@router.get("/{component_id}", response_model=ComponentDetailResponse)
async def get_component(
    workspace_id: int,
    component_id: int,
    workspace = Depends(validate_workspace_access),
    db: AsyncSession = Depends(get_db)
):
    """Get component details"""
    
    component = await get_component_in_workspace(workspace_id, component_id, db)
    
    component_response = ComponentResponse(
        id=component.id,
        workspace_id=component.workspace_id,
        req_tree_id=component.req_tree_id,
        name=component.name,
        description=component.description,
        rules=component.rules,
        shared=component.shared,
        metadata=component.meta_data,
        created_at=component.created_at.isoformat()
    )
    
    return ComponentDetailResponse(
        success=True,
        data=component_response,
        meta={
            "timestamp": "2024-01-01T12:00:00Z",
            "requestId": "req_123456"
        }
    )


@router.put("/{component_id}", response_model=ComponentDetailResponse)
async def update_component(
    workspace_id: int,
    component_id: int,
    component_data: ComponentUpdate,
    workspace = Depends(validate_workspace_access),
    db: AsyncSession = Depends(get_db)
):
    """Update component"""
    
    component = await get_component_in_workspace(workspace_id, component_id, db)
    
    # Update fields if provided
    if component_data.name is not None:
        component.name = component_data.name
    if component_data.description is not None:
        component.description = component_data.description
    if component_data.rules is not None:
        component.rules = component_data.rules
    if component_data.shared is not None:
        component.shared = component_data.shared
    if component_data.metadata is not None:
        component.meta_data = component_data.metadata
    
    await db.commit()
    await db.refresh(component)
    
    logger.info("Component updated", 
                component_id=component.id,
                workspace_id=workspace_id)
    
    component_response = ComponentResponse(
        id=component.id,
        workspace_id=component.workspace_id,
        req_tree_id=component.req_tree_id,
        name=component.name,
        description=component.description,
        rules=component.rules,
        shared=component.shared,
        metadata=component.meta_data,
        created_at=component.created_at.isoformat()
    )
    
    return ComponentDetailResponse(
        success=True,
        data=component_response,
        meta={
            "timestamp": "2024-01-01T12:00:00Z",
            "requestId": "req_123456"
        }
    )


@router.delete("/{component_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_component(
    workspace_id: int,
    component_id: int,
    workspace = Depends(validate_workspace_access),
    db: AsyncSession = Depends(get_db)
):
    """Delete component"""
    
    component = await get_component_in_workspace(workspace_id, component_id, db)
    
    await db.delete(component)
    await db.commit()
    
    logger.info("Component deleted", 
                component_id=component_id,
                workspace_id=workspace_id)