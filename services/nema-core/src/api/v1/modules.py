"""Modules API endpoints"""

from fastapi import APIRouter, HTTPException, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from typing import List, Optional
from pydantic import BaseModel
import structlog

from ...database.connection import get_db
from ...database.models import Module, ReqCollection, Product
from ...auth.routes import get_current_user
from ...auth.models import User
from .workspaces import validate_workspace_access

logger = structlog.get_logger(__name__)

router = APIRouter()


# Pydantic models
class ModuleCreate(BaseModel):
    req_collection_id: Optional[int] = None  # Optional when creating new collection
    name: str
    description: Optional[str] = None
    rules: Optional[str] = None
    shared: bool = False
    metadata: Optional[dict] = None
    # New fields for req collection creation
    create_new_req_collection: bool = False
    new_req_collection_name: Optional[str] = None


class ModuleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    rules: Optional[str] = None
    shared: Optional[bool] = None
    metadata: Optional[dict] = None


class ModuleResponse(BaseModel):
    id: int
    workspace_id: int
    req_collection_id: int
    name: str
    description: Optional[str]
    rules: Optional[str]
    shared: bool
    metadata: Optional[dict]
    created_at: str
    
    class Config:
        from_attributes = True


class PaginatedModuleResponse(BaseModel):
    success: bool
    data: dict
    meta: dict


class ModuleDetailResponse(BaseModel):
    success: bool
    data: ModuleResponse
    meta: dict


# Helper functions
async def get_module_in_workspace(
    workspace_id: int, 
    module_id: int, 
    db: AsyncSession
) -> Module:
    """Get module ensuring it belongs to the workspace"""
    query = select(Module).where(
        and_(
            Module.id == module_id,
            Module.workspace_id == workspace_id
        )
    )
    result = await db.execute(query)
    module = result.scalar_one_or_none()
    
    if not module:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Module not found in this workspace"
        )
    
    return module


@router.get("/", response_model=PaginatedModuleResponse)
async def list_modules(
    workspace_id: int,
    # Pagination
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    # Filtering
    product_id: Optional[int] = Query(None),
    shared: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    # Sorting
    sort: str = Query("created_at"),
    order: str = Query("desc"),
    # Dependencies
    workspace = Depends(validate_workspace_access),
    db: AsyncSession = Depends(get_db)
):
    """List modules in workspace with filtering and pagination"""
    
    # Build base query
    query = select(Module).where(Module.workspace_id == workspace_id)
    
    # Apply filters
    if product_id:
        # Filter by project association
        from ...database.models import ProductModule
        query = query.join(ProductModule).where(
            ProductModule.product_id == product_id
        )
    
    if shared is not None:
        query = query.where(Module.shared == shared)
    
    if search:
        query = query.where(
            Module.name.ilike(f"%{search}%") | 
            Module.description.ilike(f"%{search}%")
        )
    
    # Apply sorting
    if order == "desc":
        if sort == "created_at":
            query = query.order_by(Module.created_at.desc())
        elif sort == "name":
            query = query.order_by(Module.name.desc())
        else:
            query = query.order_by(Module.created_at.desc())
    else:
        if sort == "created_at":
            query = query.order_by(Module.created_at.asc())
        elif sort == "name":
            query = query.order_by(Module.name.asc())
        else:
            query = query.order_by(Module.created_at.asc())
    
    # Count total for pagination
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # Apply pagination
    offset = (page - 1) * limit
    query = query.offset(offset).limit(limit)
    
    result = await db.execute(query)
    modules = result.scalars().all()
    
    module_list = [
        ModuleResponse(
            id=comp.id,
            workspace_id=comp.workspace_id,
            req_collection_id=comp.req_collection_id,
            name=comp.name,
            description=comp.description,
            rules=comp.rules,
            shared=comp.shared,
            metadata=comp.meta_data,
            created_at=comp.created_at.isoformat()
        ) for comp in modules
    ]
    
    total_pages = (total + limit - 1) // limit
    
    return PaginatedModuleResponse(
        success=True,
        data={
            "items": module_list,
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


@router.post("/", response_model=ModuleDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_module(
    workspace_id: int,
    module_data: ModuleCreate,
    workspace = Depends(validate_workspace_access),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create new module with optional req collection creation"""
    
    # Validation
    if module_data.create_new_req_collection and module_data.req_collection_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot specify both create_new_req_collection and req_collection_id"
        )
    
    if not module_data.create_new_req_collection and not module_data.req_collection_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Must specify either create_new_req_collection or req_collection_id"
        )
    
    if module_data.create_new_req_collection and not module_data.new_req_collection_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="new_req_collection_name is required when create_new_req_collection is true"
        )
    
    req_collection_id = module_data.req_collection_id
    
    try:
        # Handle req collection creation or validation
        if module_data.create_new_req_collection:
            # Create new req collection
            new_req_collection = ReqCollection(
                workspace_id=workspace_id,
                name=module_data.new_req_collection_name,
                meta_data={"created_by": "module_creation", "module_name": module_data.name}
            )
            
            db.add(new_req_collection)
            await db.flush()  # Get the ID
            req_collection_id = new_req_collection.id
            
            logger.info("Created new req collection for module", 
                       req_collection_id=req_collection_id,
                       name=module_data.new_req_collection_name,
                       module_name=module_data.name)
        
        else:
            # Validate existing req_collection belongs to workspace
            req_collection_query = select(ReqCollection).where(
                and_(
                    ReqCollection.id == module_data.req_collection_id,
                    ReqCollection.workspace_id == workspace_id
                )
            )
            req_collection_result = await db.execute(req_collection_query)
            req_collection = req_collection_result.scalar_one_or_none()
            
            if not req_collection:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Requirement collection not found in this workspace"
                )
        
        # Create module
        new_module = Module(
            workspace_id=workspace_id,
            req_collection_id=req_collection_id,
            name=module_data.name,
            description=module_data.description,
            rules=module_data.rules,
            shared=module_data.shared,
            meta_data=module_data.metadata
        )
        
        db.add(new_module)
        await db.commit()
        await db.refresh(new_module)
        
    except HTTPException:
        # Re-raise HTTP exceptions
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        logger.error("Module creation failed", 
                    error=str(e),
                    workspace_id=workspace_id,
                    module_name=module_data.name)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create module: {str(e)}"
        )
    
    logger.info("Module created", 
                module_id=new_module.id, 
                name=module_data.name,
                workspace_id=workspace_id)
    
    module_response = ModuleResponse(
        id=new_module.id,
        workspace_id=new_module.workspace_id,
        req_collection_id=new_module.req_collection_id,
        name=new_module.name,
        description=new_module.description,
        rules=new_module.rules,
        shared=new_module.shared,
        metadata=new_module.meta_data,
        created_at=new_module.created_at.isoformat()
    )
    
    return ModuleDetailResponse(
        success=True,
        data=module_response,
        meta={
            "timestamp": "2024-01-01T12:00:00Z",
            "requestId": "req_123456"
        }
    )


@router.get("/{module_id}", response_model=ModuleDetailResponse)
async def get_module(
    workspace_id: int,
    module_id: int,
    workspace = Depends(validate_workspace_access),
    db: AsyncSession = Depends(get_db)
):
    """Get module details"""
    
    module = await get_module_in_workspace(workspace_id, module_id, db)
    
    module_response = ModuleResponse(
        id=module.id,
        workspace_id=module.workspace_id,
        req_collection_id=module.req_collection_id,
        name=module.name,
        description=module.description,
        rules=module.rules,
        shared=module.shared,
        metadata=module.meta_data,
        created_at=module.created_at.isoformat()
    )
    
    return ModuleDetailResponse(
        success=True,
        data=module_response,
        meta={
            "timestamp": "2024-01-01T12:00:00Z",
            "requestId": "req_123456"
        }
    )


@router.put("/{module_id}", response_model=ModuleDetailResponse)
async def update_module(
    workspace_id: int,
    module_id: int,
    module_data: ModuleUpdate,
    workspace = Depends(validate_workspace_access),
    db: AsyncSession = Depends(get_db)
):
    """Update module"""
    
    module = await get_module_in_workspace(workspace_id, module_id, db)
    
    # Update fields if provided
    if module_data.name is not None:
        module.name = module_data.name
    if module_data.description is not None:
        module.description = module_data.description
    if module_data.rules is not None:
        module.rules = module_data.rules
    if module_data.shared is not None:
        module.shared = module_data.shared
    if module_data.metadata is not None:
        module.meta_data = module_data.metadata
    
    await db.commit()
    await db.refresh(module)
    
    logger.info("Module updated", 
                module_id=module.id,
                workspace_id=workspace_id)
    
    module_response = ModuleResponse(
        id=module.id,
        workspace_id=module.workspace_id,
        req_collection_id=module.req_collection_id,
        name=module.name,
        description=module.description,
        rules=module.rules,
        shared=module.shared,
        metadata=module.meta_data,
        created_at=module.created_at.isoformat()
    )
    
    return ModuleDetailResponse(
        success=True,
        data=module_response,
        meta={
            "timestamp": "2024-01-01T12:00:00Z",
            "requestId": "req_123456"
        }
    )


@router.delete("/{module_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_module(
    workspace_id: int,
    module_id: int,
    workspace = Depends(validate_workspace_access),
    db: AsyncSession = Depends(get_db)
):
    """Delete module"""
    
    module = await get_module_in_workspace(workspace_id, module_id, db)
    
    await db.delete(module)
    await db.commit()
    
    logger.info("Module deleted", 
                module_id=module_id,
                workspace_id=workspace_id)