"""Requirement Collections API endpoints"""

from fastapi import APIRouter, HTTPException, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, delete
from typing import List, Optional
from pydantic import BaseModel
import structlog

from ...database.connection import get_db
from ...database.models import ReqCollection, Req, Module
from ...auth.routes import get_current_user
from ...auth.models import User
from .workspaces import validate_workspace_access

logger = structlog.get_logger(__name__)

router = APIRouter()


# Pydantic models
class ReqCollectionCreate(BaseModel):
    name: str
    metadata: Optional[dict] = None


class ReqCollectionUpdate(BaseModel):
    name: Optional[str] = None
    metadata: Optional[dict] = None


class ReqCollectionResponse(BaseModel):
    id: int
    workspace_id: int
    name: str
    metadata: Optional[dict]
    created_at: str
    
    class Config:
        from_attributes = True


class PaginatedReqCollectionResponse(BaseModel):
    success: bool
    data: dict
    meta: dict


class ReqCollectionDetailResponse(BaseModel):
    success: bool
    data: ReqCollectionResponse
    meta: dict


# Helper functions
async def get_req_collection_in_workspace(
    workspace_id: int, 
    req_collection_id: int, 
    db: AsyncSession
) -> ReqCollection:
    """Get requirement collection ensuring it belongs to the workspace"""
    query = select(ReqCollection).where(
        and_(
            ReqCollection.id == req_collection_id,
            ReqCollection.workspace_id == workspace_id
        )
    )
    result = await db.execute(query)
    req_collection = result.scalar_one_or_none()
    
    if not req_collection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Requirement collection not found in this workspace"
        )
    
    return req_collection


@router.get("/", response_model=PaginatedReqCollectionResponse)
async def list_req_collections(
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
    """List requirement collections in workspace with filtering and pagination"""
    
    # Build base query
    query = select(ReqCollection).where(ReqCollection.workspace_id == workspace_id)
    
    # Apply filters
    if search:
        query = query.where(ReqCollection.name.ilike(f"%{search}%"))
    
    # Apply sorting
    if order == "desc":
        if sort == "created_at":
            query = query.order_by(ReqCollection.created_at.desc())
        elif sort == "name":
            query = query.order_by(ReqCollection.name.desc())
        else:
            query = query.order_by(ReqCollection.created_at.desc())
    else:
        if sort == "created_at":
            query = query.order_by(ReqCollection.created_at.asc())
        elif sort == "name":
            query = query.order_by(ReqCollection.name.asc())
        else:
            query = query.order_by(ReqCollection.created_at.asc())
    
    # Count total for pagination
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # Apply pagination
    offset = (page - 1) * limit
    query = query.offset(offset).limit(limit)
    
    result = await db.execute(query)
    req_collections = result.scalars().all()
    
    req_collection_list = [
        ReqCollectionResponse(
            id=req_collection.id,
            workspace_id=req_collection.workspace_id,
            name=req_collection.name,
            metadata=req_collection.meta_data,
            created_at=req_collection.created_at.isoformat()
        ) for req_collection in req_collections
    ]
    
    total_pages = (total + limit - 1) // limit
    
    return PaginatedReqCollectionResponse(
        success=True,
        data={
            "items": req_collection_list,
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


@router.post("/", response_model=ReqCollectionDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_req_collection(
    workspace_id: int,
    req_collection_data: ReqCollectionCreate,
    workspace = Depends(validate_workspace_access),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create new requirement tree"""
    
    # Create requirement tree
    new_req_collection = ReqCollection(
        workspace_id=workspace_id,
        name=req_collection_data.name,
        meta_data=req_collection_data.metadata
    )
    
    db.add(new_req_collection)
    await db.commit()
    await db.refresh(new_req_collection)
    
    logger.info("Requirement tree created", 
                req_collection_id=new_req_collection.id, 
                name=req_collection_data.name,
                workspace_id=workspace_id)
    
    req_collection_response = ReqCollectionResponse(
        id=new_req_collection.id,
        workspace_id=new_req_collection.workspace_id,
        name=new_req_collection.name,
        metadata=new_req_collection.meta_data,
        created_at=new_req_collection.created_at.isoformat()
    )
    
    return ReqCollectionDetailResponse(
        success=True,
        data=req_collection_response,
        meta={
            "timestamp": "2024-01-01T12:00:00Z",
            "requestId": "req_123456"
        }
    )


@router.get("/{req_collection_id}", response_model=ReqCollectionDetailResponse)
async def get_req_collection(
    workspace_id: int,
    req_collection_id: int,
    workspace = Depends(validate_workspace_access),
    db: AsyncSession = Depends(get_db)
):
    """Get requirement tree details"""
    
    req_collection = await get_req_collection_in_workspace(workspace_id, req_collection_id, db)
    
    req_collection_response = ReqCollectionResponse(
        id=req_collection.id,
        workspace_id=req_collection.workspace_id,
        name=req_collection.name,
        metadata=req_collection.meta_data,
        created_at=req_collection.created_at.isoformat()
    )
    
    return ReqCollectionDetailResponse(
        success=True,
        data=req_collection_response,
        meta={
            "timestamp": "2024-01-01T12:00:00Z",
            "requestId": "req_123456"
        }
    )


@router.put("/{req_collection_id}", response_model=ReqCollectionDetailResponse)
async def update_req_collection(
    workspace_id: int,
    req_collection_id: int,
    req_collection_data: ReqCollectionUpdate,
    workspace = Depends(validate_workspace_access),
    db: AsyncSession = Depends(get_db)
):
    """Update requirement tree"""
    
    req_collection = await get_req_collection_in_workspace(workspace_id, req_collection_id, db)
    
    # Update fields if provided
    if req_collection_data.name is not None:
        req_collection.name = req_collection_data.name
    if req_collection_data.metadata is not None:
        req_collection.meta_data = req_collection_data.metadata
    
    await db.commit()
    await db.refresh(req_collection)
    
    logger.info("Requirement tree updated", 
                req_collection_id=req_collection.id,
                workspace_id=workspace_id)
    
    req_collection_response = ReqCollectionResponse(
        id=req_collection.id,
        workspace_id=req_collection.workspace_id,
        name=req_collection.name,
        metadata=req_collection.meta_data,
        created_at=req_collection.created_at.isoformat()
    )
    
    return ReqCollectionDetailResponse(
        success=True,
        data=req_collection_response,
        meta={
            "timestamp": "2024-01-01T12:00:00Z",
            "requestId": "req_123456"
        }
    )


@router.delete("/{req_collection_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_req_collection(
    workspace_id: int,
    req_collection_id: int,
    workspace = Depends(validate_workspace_access),
    db: AsyncSession = Depends(get_db)
):
    """Delete requirement collection and all related requirements"""
    
    req_collection = await get_req_collection_in_workspace(workspace_id, req_collection_id, db)
    
    try:
        # Delete all requirements in this collection first (CASCADE should handle this, but let's be explicit)
        delete_reqs_stmt = delete(Req).where(Req.req_collection_id == req_collection_id)
        await db.execute(delete_reqs_stmt)
        
        # Delete all modules that reference this collection
        delete_modules_stmt = delete(Module).where(Module.req_collection_id == req_collection_id) 
        await db.execute(delete_modules_stmt)
        
        # Now delete the collection itself
        db.delete(req_collection)
        await db.commit()
        
        logger.info("Requirement collection deleted", 
                    req_collection_id=req_collection_id,
                    workspace_id=workspace_id)
                    
    except Exception as e:
        await db.rollback()
        logger.error("Failed to delete requirement collection",
                    req_collection_id=req_collection_id,
                    workspace_id=workspace_id,
                    error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete requirement collection"
        )