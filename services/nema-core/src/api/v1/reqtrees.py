"""Requirement Trees API endpoints"""

from fastapi import APIRouter, HTTPException, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from typing import List, Optional
from pydantic import BaseModel
import structlog

from ...database.connection import get_db
from ...database.models import ReqTree
from ...auth.routes import get_current_user
from ...auth.models import User
from .workspaces import validate_workspace_access

logger = structlog.get_logger(__name__)

router = APIRouter()


# Pydantic models
class ReqTreeCreate(BaseModel):
    name: str
    metadata: Optional[dict] = None


class ReqTreeUpdate(BaseModel):
    name: Optional[str] = None
    metadata: Optional[dict] = None


class ReqTreeResponse(BaseModel):
    id: int
    workspace_id: int
    name: str
    metadata: Optional[dict]
    created_at: str
    
    class Config:
        from_attributes = True


class PaginatedReqTreeResponse(BaseModel):
    success: bool
    data: dict
    meta: dict


class ReqTreeDetailResponse(BaseModel):
    success: bool
    data: ReqTreeResponse
    meta: dict


# Helper functions
async def get_reqtree_in_workspace(
    workspace_id: int, 
    reqtree_id: int, 
    db: AsyncSession
) -> ReqTree:
    """Get requirement tree ensuring it belongs to the workspace"""
    query = select(ReqTree).where(
        and_(
            ReqTree.id == reqtree_id,
            ReqTree.workspace_id == workspace_id
        )
    )
    result = await db.execute(query)
    reqtree = result.scalar_one_or_none()
    
    if not reqtree:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Requirement tree not found in this workspace"
        )
    
    return reqtree


@router.get("/", response_model=PaginatedReqTreeResponse)
async def list_reqtrees(
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
    """List requirement trees in workspace with filtering and pagination"""
    
    # Build base query
    query = select(ReqTree).where(ReqTree.workspace_id == workspace_id)
    
    # Apply filters
    if search:
        query = query.where(ReqTree.name.ilike(f"%{search}%"))
    
    # Apply sorting
    if order == "desc":
        if sort == "created_at":
            query = query.order_by(ReqTree.created_at.desc())
        elif sort == "name":
            query = query.order_by(ReqTree.name.desc())
        else:
            query = query.order_by(ReqTree.created_at.desc())
    else:
        if sort == "created_at":
            query = query.order_by(ReqTree.created_at.asc())
        elif sort == "name":
            query = query.order_by(ReqTree.name.asc())
        else:
            query = query.order_by(ReqTree.created_at.asc())
    
    # Count total for pagination
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # Apply pagination
    offset = (page - 1) * limit
    query = query.offset(offset).limit(limit)
    
    result = await db.execute(query)
    reqtrees = result.scalars().all()
    
    reqtree_list = [
        ReqTreeResponse(
            id=reqtree.id,
            workspace_id=reqtree.workspace_id,
            name=reqtree.name,
            metadata=reqtree.metadata,
            created_at=reqtree.created_at.isoformat()
        ) for reqtree in reqtrees
    ]
    
    total_pages = (total + limit - 1) // limit
    
    return PaginatedReqTreeResponse(
        success=True,
        data={
            "items": reqtree_list,
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


@router.post("/", response_model=ReqTreeDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_reqtree(
    workspace_id: int,
    reqtree_data: ReqTreeCreate,
    workspace = Depends(validate_workspace_access),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create new requirement tree"""
    
    # Create requirement tree
    new_reqtree = ReqTree(
        workspace_id=workspace_id,
        name=reqtree_data.name,
        metadata=reqtree_data.metadata
    )
    
    db.add(new_reqtree)
    await db.commit()
    await db.refresh(new_reqtree)
    
    logger.info("Requirement tree created", 
                reqtree_id=new_reqtree.id, 
                name=reqtree_data.name,
                workspace_id=workspace_id)
    
    reqtree_response = ReqTreeResponse(
        id=new_reqtree.id,
        workspace_id=new_reqtree.workspace_id,
        name=new_reqtree.name,
        metadata=new_reqtree.metadata,
        created_at=new_reqtree.created_at.isoformat()
    )
    
    return ReqTreeDetailResponse(
        success=True,
        data=reqtree_response,
        meta={
            "timestamp": "2024-01-01T12:00:00Z",
            "requestId": "req_123456"
        }
    )


@router.get("/{reqtree_id}", response_model=ReqTreeDetailResponse)
async def get_reqtree(
    workspace_id: int,
    reqtree_id: int,
    workspace = Depends(validate_workspace_access),
    db: AsyncSession = Depends(get_db)
):
    """Get requirement tree details"""
    
    reqtree = await get_reqtree_in_workspace(workspace_id, reqtree_id, db)
    
    reqtree_response = ReqTreeResponse(
        id=reqtree.id,
        workspace_id=reqtree.workspace_id,
        name=reqtree.name,
        metadata=reqtree.metadata,
        created_at=reqtree.created_at.isoformat()
    )
    
    return ReqTreeDetailResponse(
        success=True,
        data=reqtree_response,
        meta={
            "timestamp": "2024-01-01T12:00:00Z",
            "requestId": "req_123456"
        }
    )


@router.put("/{reqtree_id}", response_model=ReqTreeDetailResponse)
async def update_reqtree(
    workspace_id: int,
    reqtree_id: int,
    reqtree_data: ReqTreeUpdate,
    workspace = Depends(validate_workspace_access),
    db: AsyncSession = Depends(get_db)
):
    """Update requirement tree"""
    
    reqtree = await get_reqtree_in_workspace(workspace_id, reqtree_id, db)
    
    # Update fields if provided
    if reqtree_data.name is not None:
        reqtree.name = reqtree_data.name
    if reqtree_data.metadata is not None:
        reqtree.metadata = reqtree_data.metadata
    
    await db.commit()
    await db.refresh(reqtree)
    
    logger.info("Requirement tree updated", 
                reqtree_id=reqtree.id,
                workspace_id=workspace_id)
    
    reqtree_response = ReqTreeResponse(
        id=reqtree.id,
        workspace_id=reqtree.workspace_id,
        name=reqtree.name,
        metadata=reqtree.metadata,
        created_at=reqtree.created_at.isoformat()
    )
    
    return ReqTreeDetailResponse(
        success=True,
        data=reqtree_response,
        meta={
            "timestamp": "2024-01-01T12:00:00Z",
            "requestId": "req_123456"
        }
    )


@router.delete("/{reqtree_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_reqtree(
    workspace_id: int,
    reqtree_id: int,
    workspace = Depends(validate_workspace_access),
    db: AsyncSession = Depends(get_db)
):
    """Delete requirement tree"""
    
    reqtree = await get_reqtree_in_workspace(workspace_id, reqtree_id, db)
    
    await db.delete(reqtree)
    await db.commit()
    
    logger.info("Requirement tree deleted", 
                reqtree_id=reqtree_id,
                workspace_id=workspace_id)