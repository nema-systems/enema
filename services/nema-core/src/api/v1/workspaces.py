"""Workspace API endpoints - Base for all workspace-scoped resources"""

from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from pydantic import BaseModel
import structlog

from ...database.connection import get_db
from ...database.models import Workspace, OrganizationWorkspace
from ...auth.routes import get_current_user
from ...auth.models import User

logger = structlog.get_logger(__name__)

router = APIRouter()



# Pydantic models
class WorkspaceCreate(BaseModel):
    name: str
    metadata: Optional[dict] = None


class WorkspaceUpdate(BaseModel):
    name: Optional[str] = None
    metadata: Optional[dict] = None


class WorkspaceResponse(BaseModel):
    id: int
    name: str
    metadata: Optional[dict] = None
    created_at: str
    
    class Config:
        from_attributes = True


class WorkspaceListResponse(BaseModel):
    success: bool
    data: List[WorkspaceResponse]
    meta: dict


class WorkspaceDetailResponse(BaseModel):
    success: bool
    data: WorkspaceResponse
    meta: dict


# Dependency to validate workspace access
async def validate_workspace_access(
    workspace_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Workspace:
    """Validate that current user's organization has access to workspace"""
    
    # Get user's current organization (already resolved to internal DB ID by auth)
    current_org_id = getattr(current_user, 'organization_id', None)
    
    if not current_org_id:
        logger.warning("User has no current organization", username=current_user.username)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No organization context available"
        )
    
    # Check if organization has access to workspace
    query = select(OrganizationWorkspace).where(
        OrganizationWorkspace.organization_id == current_org_id,
        OrganizationWorkspace.workspace_id == workspace_id,
        OrganizationWorkspace.deleted == False
    )
    result = await db.execute(query)
    org_workspace = result.scalar_one_or_none()
    
    if not org_workspace:
        logger.warning("Organization does not have access to workspace", 
                      org_id=current_org_id, workspace_id=workspace_id)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Organization does not have access to this workspace"
        )
    
    # Get workspace
    workspace_query = select(Workspace).where(Workspace.id == workspace_id)
    workspace_result = await db.execute(workspace_query)
    workspace = workspace_result.scalar_one_or_none()
    
    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found"
        )
    
    return workspace


@router.get("/", response_model=WorkspaceListResponse)
async def list_workspaces(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List accessible workspaces for current organization"""
    
    # Get user's current organization (already resolved to internal DB ID by auth)
    current_org_id = getattr(current_user, 'organization_id', None)
    
    if not current_org_id:
        # No organization context - return empty workspace list
        # This allows the frontend to show organization selection UI
        return WorkspaceListResponse(
            success=True,
            data=[],
            meta={
                "timestamp": "2024-01-01T12:00:00Z",  # TODO: Use actual timestamp
                "requestId": "req_123456",  # TODO: Generate request ID
                "message": "No organization selected"
            }
        )
    
    # Get workspaces accessible to current organization
    query = (
        select(Workspace)
        .join(OrganizationWorkspace)
        .where(
            OrganizationWorkspace.organization_id == current_org_id,
            OrganizationWorkspace.deleted == False
        )
        .order_by(Workspace.created_at.desc())
    )
    
    result = await db.execute(query)
    workspaces = result.scalars().all()
    
    workspace_list = [
        WorkspaceResponse(
            id=ws.id,
            name=ws.name,
            metadata=ws.meta_data,
            created_at=ws.created_at.isoformat()
        ) for ws in workspaces
    ]
    
    return WorkspaceListResponse(
        success=True,
        data=workspace_list,
        meta={
            "timestamp": "2024-01-01T12:00:00Z",  # TODO: Use actual timestamp
            "requestId": "req_123456"  # TODO: Generate request ID
        }
    )


@router.post("/", response_model=WorkspaceDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_workspace(
    workspace_data: WorkspaceCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create new workspace"""
    
    # Get user's current organization (already resolved to internal DB ID by auth)
    current_org_id = getattr(current_user, 'organization_id', None)
    
    logger.info("Workspace creation attempt", 
               org_id=current_org_id, 
               user_id=current_user.clerk_user_id)
    
    if not current_org_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No organization context available"
        )
    
    # Create workspace
    new_workspace = Workspace(
        name=workspace_data.name,
        meta_data=workspace_data.metadata
    )
    
    db.add(new_workspace)
    await db.flush()  # Get workspace ID
    
    # Create organization-workspace relationship with owner role
    org_workspace = OrganizationWorkspace(
        organization_id=current_org_id,
        workspace_id=new_workspace.id,
        role="owner"
    )
    
    db.add(org_workspace)
    await db.commit()
    await db.refresh(new_workspace)
    
    # Create workspace sequences for public IDs
    from ...database.connection import create_workspace_sequences
    await create_workspace_sequences(new_workspace.id)
    
    logger.info("Workspace created", workspace_id=new_workspace.id, name=workspace_data.name)
    
    workspace_response = WorkspaceResponse(
        id=new_workspace.id,
        name=new_workspace.name,
        metadata=new_workspace.meta_data,
        created_at=new_workspace.created_at.isoformat()
    )
    
    return WorkspaceDetailResponse(
        success=True,
        data=workspace_response,
        meta={
            "timestamp": "2024-01-01T12:00:00Z",
            "requestId": "req_123456"
        }
    )


@router.get("/{workspace_id}", response_model=WorkspaceDetailResponse)
async def get_workspace(
    workspace: Workspace = Depends(validate_workspace_access)
):
    """Get workspace details"""
    
    workspace_response = WorkspaceResponse(
        id=workspace.id,
        name=workspace.name,
        metadata=workspace.meta_data,
        created_at=workspace.created_at.isoformat()
    )
    
    return WorkspaceDetailResponse(
        success=True,
        data=workspace_response,
        meta={
            "timestamp": "2024-01-01T12:00:00Z",
            "requestId": "req_123456"
        }
    )


@router.put("/{workspace_id}", response_model=WorkspaceDetailResponse)
async def update_workspace(
    workspace_data: WorkspaceUpdate,
    workspace: Workspace = Depends(validate_workspace_access),
    db: AsyncSession = Depends(get_db)
):
    """Update workspace"""
    
    # Update fields if provided
    if workspace_data.name is not None:
        workspace.name = workspace_data.name
    if workspace_data.metadata is not None:
        workspace.meta_data = workspace_data.metadata
    
    await db.commit()
    await db.refresh(workspace)
    
    logger.info("Workspace updated", workspace_id=workspace.id)
    
    workspace_response = WorkspaceResponse(
        id=workspace.id,
        name=workspace.name,
        metadata=workspace.meta_data,
        created_at=workspace.created_at.isoformat()
    )
    
    return WorkspaceDetailResponse(
        success=True,
        data=workspace_response,
        meta={
            "timestamp": "2024-01-01T12:00:00Z",
            "requestId": "req_123456"
        }
    )


@router.delete("/{workspace_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workspace(
    workspace: Workspace = Depends(validate_workspace_access),
    db: AsyncSession = Depends(get_db)
):
    """Delete workspace"""
    
    # In production, you might want to soft delete or prevent deletion if workspace has data
    await db.delete(workspace)
    await db.commit()
    
    logger.info("Workspace deleted", workspace_id=workspace.id)