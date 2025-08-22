"""Projects API endpoints"""

from fastapi import APIRouter, HTTPException, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from typing import List, Optional
from pydantic import BaseModel
import structlog

from ...database.connection import get_db
from ...database.models import Project, ProjectComponent, Component
from ...auth.routes import get_current_user
from ...auth.models import User
from .workspaces import validate_workspace_access

logger = structlog.get_logger(__name__)

router = APIRouter()


# Pydantic models
class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    metadata: Optional[dict] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    metadata: Optional[dict] = None


class ProjectResponse(BaseModel):
    id: int
    workspace_id: int
    name: str
    description: Optional[str]
    metadata: Optional[dict]
    created_at: str
    
    class Config:
        from_attributes = True


class PaginatedProjectResponse(BaseModel):
    success: bool
    data: dict
    meta: dict


class ProjectDetailResponse(BaseModel):
    success: bool
    data: ProjectResponse
    meta: dict


# Helper functions
async def get_project_in_workspace(
    workspace_id: int, 
    project_id: int, 
    db: AsyncSession
) -> Project:
    """Get project ensuring it belongs to the workspace"""
    query = select(Project).where(
        and_(
            Project.id == project_id,
            Project.workspace_id == workspace_id
        )
    )
    result = await db.execute(query)
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found in this workspace"
        )
    
    return project


@router.get("/", response_model=PaginatedProjectResponse)
async def list_projects(
    workspace_id: int,
    # Pagination
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    # Filtering
    search: Optional[str] = Query(None),
    # Sorting
    sort: str = Query("created_at"),
    order: str = Query("desc"),
    # Dependencies
    workspace = Depends(validate_workspace_access),
    db: AsyncSession = Depends(get_db)
):
    """List projects in workspace with filtering and pagination"""
    
    # Build base query
    query = select(Project).where(Project.workspace_id == workspace_id)
    
    # Apply filters
    if search:
        query = query.where(
            Project.name.ilike(f"%{search}%") | 
            Project.description.ilike(f"%{search}%")
        )
    
    # Apply sorting
    if order == "desc":
        if sort == "created_at":
            query = query.order_by(Project.created_at.desc())
        elif sort == "name":
            query = query.order_by(Project.name.desc())
        else:
            query = query.order_by(Project.created_at.desc())
    else:
        if sort == "created_at":
            query = query.order_by(Project.created_at.asc())
        elif sort == "name":
            query = query.order_by(Project.name.asc())
        else:
            query = query.order_by(Project.created_at.asc())
    
    # Count total for pagination
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # Apply pagination
    offset = (page - 1) * limit
    query = query.offset(offset).limit(limit)
    
    result = await db.execute(query)
    projects = result.scalars().all()
    
    project_list = [
        ProjectResponse(
            id=project.id,
            workspace_id=project.workspace_id,
            name=project.name,
            description=project.description,
            metadata=project.meta_data,
            created_at=project.created_at.isoformat()
        ) for project in projects
    ]
    
    total_pages = (total + limit - 1) // limit
    
    return PaginatedProjectResponse(
        success=True,
        data={
            "items": project_list,
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


@router.post("/", response_model=ProjectDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    workspace_id: int,
    project_data: ProjectCreate,
    workspace = Depends(validate_workspace_access),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create new project"""
    
    # Create project
    new_project = Project(
        workspace_id=workspace_id,
        name=project_data.name,
        description=project_data.description,
        meta_data=project_data.metadata
    )
    
    db.add(new_project)
    await db.commit()
    await db.refresh(new_project)
    
    logger.info("Project created", 
                project_id=new_project.id, 
                name=project_data.name,
                workspace_id=workspace_id)
    
    project_response = ProjectResponse(
        id=new_project.id,
        workspace_id=new_project.workspace_id,
        name=new_project.name,
        description=new_project.description,
        metadata=new_project.meta_data,
        created_at=new_project.created_at.isoformat()
    )
    
    return ProjectDetailResponse(
        success=True,
        data=project_response,
        meta={
            "timestamp": "2024-01-01T12:00:00Z",
            "requestId": "req_123456"
        }
    )


@router.get("/{project_id}", response_model=ProjectDetailResponse)
async def get_project(
    workspace_id: int,
    project_id: int,
    workspace = Depends(validate_workspace_access),
    db: AsyncSession = Depends(get_db)
):
    """Get project details"""
    
    project = await get_project_in_workspace(workspace_id, project_id, db)
    
    project_response = ProjectResponse(
        id=project.id,
        workspace_id=project.workspace_id,
        name=project.name,
        description=project.description,
        metadata=project.meta_data,
        created_at=project.created_at.isoformat()
    )
    
    return ProjectDetailResponse(
        success=True,
        data=project_response,
        meta={
            "timestamp": "2024-01-01T12:00:00Z",
            "requestId": "req_123456"
        }
    )


@router.put("/{project_id}", response_model=ProjectDetailResponse)
async def update_project(
    workspace_id: int,
    project_id: int,
    project_data: ProjectUpdate,
    workspace = Depends(validate_workspace_access),
    db: AsyncSession = Depends(get_db)
):
    """Update project"""
    
    project = await get_project_in_workspace(workspace_id, project_id, db)
    
    # Update fields if provided
    if project_data.name is not None:
        project.name = project_data.name
    if project_data.description is not None:
        project.description = project_data.description
    if project_data.metadata is not None:
        project.meta_data = project_data.metadata
    
    await db.commit()
    await db.refresh(project)
    
    logger.info("Project updated", 
                project_id=project.id,
                workspace_id=workspace_id)
    
    project_response = ProjectResponse(
        id=project.id,
        workspace_id=project.workspace_id,
        name=project.name,
        description=project.description,
        metadata=project.meta_data,
        created_at=project.created_at.isoformat()
    )
    
    return ProjectDetailResponse(
        success=True,
        data=project_response,
        meta={
            "timestamp": "2024-01-01T12:00:00Z",
            "requestId": "req_123456"
        }
    )


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    workspace_id: int,
    project_id: int,
    workspace = Depends(validate_workspace_access),
    db: AsyncSession = Depends(get_db)
):
    """Delete project"""
    
    project = await get_project_in_workspace(workspace_id, project_id, db)
    
    await db.delete(project)
    await db.commit()
    
    logger.info("Project deleted", 
                project_id=project_id,
                workspace_id=workspace_id)