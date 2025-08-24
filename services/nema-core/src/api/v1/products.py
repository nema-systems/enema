"""Products API endpoints"""

from fastapi import APIRouter, HTTPException, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from typing import List, Optional
from pydantic import BaseModel
import structlog

from ...database.connection import get_db
from ...database.models import Product, ProductModule, Module
from ...auth.routes import get_current_user
from ...auth.models import User
from .workspaces import validate_workspace_access
from ...products import ProductService
from ...products.product_service import ProductDeletionPreview

logger = structlog.get_logger(__name__)

router = APIRouter()


# Pydantic models
class ProductCreate(BaseModel):
    name: str
    description: Optional[str] = None
    metadata: Optional[dict] = None
    create_defaults: bool = True  # Whether to auto-create Module and ReqCollection


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    metadata: Optional[dict] = None


class ModuleInfo(BaseModel):
    """Basic module information"""
    id: int
    name: str
    description: Optional[str]
    shared: bool
    
    class Config:
        from_attributes = True


class ReqCollectionInfo(BaseModel):
    """Basic req collection information"""
    id: int
    name: str
    
    class Config:
        from_attributes = True


class ProductResponse(BaseModel):
    id: int
    workspace_id: int
    name: str
    description: Optional[str]
    metadata: Optional[dict]
    created_at: str
    # Optional associated entities info
    base_module: Optional[ModuleInfo] = None
    req_collection: Optional[ReqCollectionInfo] = None
    
    class Config:
        from_attributes = True


class PaginatedProductResponse(BaseModel):
    success: bool
    data: dict
    meta: dict


class ProductDetailResponse(BaseModel):
    success: bool
    data: ProductResponse
    meta: dict


class DeletionPreviewResponse(BaseModel):
    modules: List[dict]
    req_collections: List[dict]
    requirements_count: int


class ProductDeletionPreviewResponse(BaseModel):
    success: bool
    data: DeletionPreviewResponse
    meta: dict


# Helper functions
async def get_product_in_workspace(
    workspace_id: int, 
    product_id: int, 
    db: AsyncSession
) -> Product:
    """Get product ensuring it belongs to the workspace"""
    query = select(Product).where(
        and_(
            Product.id == product_id,
            Product.workspace_id == workspace_id
        )
    )
    result = await db.execute(query)
    product = result.scalar_one_or_none()
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found in this workspace"
        )
    
    return product


@router.get("/", response_model=PaginatedProductResponse)
async def list_products(
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
    """List products in workspace with filtering and pagination"""
    
    # Build base query
    query = select(Product).where(Product.workspace_id == workspace_id)
    
    # Apply filters
    if search:
        query = query.where(
            Product.name.ilike(f"%{search}%") | 
            Product.description.ilike(f"%{search}%")
        )
    
    # Apply sorting
    if order == "desc":
        if sort == "created_at":
            query = query.order_by(Product.created_at.desc())
        elif sort == "name":
            query = query.order_by(Product.name.desc())
        else:
            query = query.order_by(Product.created_at.desc())
    else:
        if sort == "created_at":
            query = query.order_by(Product.created_at.asc())
        elif sort == "name":
            query = query.order_by(Product.name.asc())
        else:
            query = query.order_by(Product.created_at.asc())
    
    # Count total for pagination
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # Apply pagination
    offset = (page - 1) * limit
    query = query.offset(offset).limit(limit)
    
    result = await db.execute(query)
    products = result.scalars().all()
    
    # Use ProductService to get details for each product
    product_service = ProductService()
    product_list = []
    
    for product in products:
        try:
            details = await product_service.get_product_with_details(workspace_id, product.id)
            
            base_module = None
            req_collection = None
            
            if details and details.module:
                base_module = ModuleInfo(
                    id=details.module.id,
                    name=details.module.name,
                    description=details.module.description,
                    shared=details.module.shared
                )
            
            if details and details.req_collection:
                req_collection = ReqCollectionInfo(
                    id=details.req_collection.id,
                    name=details.req_collection.name
                )
            
            product_response = ProductResponse(
                id=product.id,
                workspace_id=product.workspace_id,
                name=product.name,
                description=product.description,
                metadata=product.meta_data,
                created_at=product.created_at.isoformat(),
                base_module=base_module,
                req_collection=req_collection
            )
            product_list.append(product_response)
            
        except Exception as e:
            # If getting details fails, just include basic product info
            logger.warning("Failed to get product details for listing", 
                         product_id=product.id,
                         error=str(e))
            
            product_response = ProductResponse(
                id=product.id,
                workspace_id=product.workspace_id,
                name=product.name,
                description=product.description,
                metadata=product.meta_data,
                created_at=product.created_at.isoformat()
            )
            product_list.append(product_response)
    
    total_pages = (total + limit - 1) // limit
    
    return PaginatedProductResponse(
        success=True,
        data={
            "items": product_list,
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


@router.post("/", response_model=ProductDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    workspace_id: int,
    product_data: ProductCreate,
    workspace = Depends(validate_workspace_access),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create new product with optional auto-creation of Module and ReqCollection"""
    
    # Use ProductService for enhanced creation workflow
    product_service = ProductService()
    
    try:
        result = await product_service.create_product_with_defaults(
            workspace_id=workspace_id,
            name=product_data.name,
            description=product_data.description,
            metadata=product_data.metadata,
            create_defaults=product_data.create_defaults
        )
        
        # Build response with optional module and req_collection info
        base_module = None
        req_collection = None
        
        if result.module:
            base_module = ModuleInfo(
                id=result.module.id,
                name=result.module.name,
                description=result.module.description,
                shared=result.module.shared
            )
        
        if result.req_collection:
            req_collection = ReqCollectionInfo(
                id=result.req_collection.id,
                name=result.req_collection.name
            )
        
        product_response = ProductResponse(
            id=result.product.id,
            workspace_id=result.product.workspace_id,
            name=result.product.name,
            description=result.product.description,
            metadata=result.product.meta_data,
            created_at=result.product.created_at.isoformat(),
            base_module=base_module,
            req_collection=req_collection
        )
        
        logger.info("Product created successfully", 
                    product_id=result.product.id, 
                    name=product_data.name,
                    workspace_id=workspace_id,
                    has_module=result.module is not None,
                    has_req_collection=result.req_collection is not None)
        
        return ProductDetailResponse(
            success=True,
            data=product_response,
            meta={
                "timestamp": "2024-01-01T12:00:00Z",
                "requestId": "req_123456",
                "defaults_created": product_data.create_defaults
            }
        )
        
    except Exception as e:
        logger.error("Product creation failed", 
                    error=str(e),
                    workspace_id=workspace_id,
                    name=product_data.name)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create product: {str(e)}"
        )


@router.get("/{product_id}", response_model=ProductDetailResponse)
async def get_product(
    workspace_id: int,
    product_id: int,
    include_details: bool = Query(False, description="Include associated module and req collection info"),
    workspace = Depends(validate_workspace_access),
    db: AsyncSession = Depends(get_db)
):
    """Get product details with optional module and req collection information"""
    
    if include_details:
        # Use ProductService to get enhanced details
        product_service = ProductService()
        result = await product_service.get_product_with_details(workspace_id, product_id)
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product not found in this workspace"
            )
        
        # Build response with module and req_collection info
        base_module = None
        req_collection = None
        
        if result.module:
            base_module = ModuleInfo(
                id=result.module.id,
                name=result.module.name,
                description=result.module.description,
                shared=result.module.shared
            )
        
        if result.req_collection:
            req_collection = ReqCollectionInfo(
                id=result.req_collection.id,
                name=result.req_collection.name
            )
        
        product_response = ProductResponse(
            id=result.product.id,
            workspace_id=result.product.workspace_id,
            name=result.product.name,
            description=result.product.description,
            metadata=result.product.meta_data,
            created_at=result.product.created_at.isoformat(),
            base_module=base_module,
            req_collection=req_collection
        )
    else:
        # Standard product retrieval
        product = await get_product_in_workspace(workspace_id, product_id, db)
        
        product_response = ProductResponse(
            id=product.id,
            workspace_id=product.workspace_id,
            name=product.name,
            description=product.description,
            metadata=product.meta_data,
            created_at=product.created_at.isoformat()
        )
    
    return ProductDetailResponse(
        success=True,
        data=product_response,
        meta={
            "timestamp": "2024-01-01T12:00:00Z",
            "requestId": "req_123456"
        }
    )


@router.put("/{product_id}", response_model=ProductDetailResponse)
async def update_product(
    workspace_id: int,
    product_id: int,
    product_data: ProductUpdate,
    workspace = Depends(validate_workspace_access),
    db: AsyncSession = Depends(get_db)
):
    """Update product"""
    
    product = await get_product_in_workspace(workspace_id, product_id, db)
    
    # Update fields if provided
    if product_data.name is not None:
        product.name = product_data.name
    if product_data.description is not None:
        product.description = product_data.description
    if product_data.metadata is not None:
        product.meta_data = product_data.metadata
    
    await db.commit()
    await db.refresh(product)
    
    logger.info("Product updated", 
                product_id=product.id,
                workspace_id=workspace_id)
    
    product_response = ProductResponse(
        id=product.id,
        workspace_id=product.workspace_id,
        name=product.name,
        description=product.description,
        metadata=product.meta_data,
        created_at=product.created_at.isoformat()
    )
    
    return ProductDetailResponse(
        success=True,
        data=product_response,
        meta={
            "timestamp": "2024-01-01T12:00:00Z",
            "requestId": "req_123456"
        }
    )


@router.get("/{product_id}/deletion-preview", response_model=ProductDeletionPreviewResponse)
async def get_product_deletion_preview(
    workspace_id: int,
    product_id: int,
    workspace = Depends(validate_workspace_access),
    db: AsyncSession = Depends(get_db)
):
    """Get preview of what will be deleted when deleting a product"""
    
    product_service = ProductService()
    
    try:
        preview = await product_service.get_deletion_preview(workspace_id, product_id)
        
        return ProductDeletionPreviewResponse(
            success=True,
            data=DeletionPreviewResponse(
                modules=preview.modules_to_delete,
                req_collections=preview.req_collections_to_delete,
                requirements_count=preview.requirements_count
            ),
            meta={
                "timestamp": "2024-01-01T12:00:00Z",
                "requestId": "req_123456"
            }
        )
        
    except Exception as e:
        logger.error("Product deletion preview failed", 
                    error=str(e),
                    product_id=product_id,
                    workspace_id=workspace_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get deletion preview: {str(e)}"
        )


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    workspace_id: int,
    product_id: int,
    workspace = Depends(validate_workspace_access),
    db: AsyncSession = Depends(get_db)
):
    """Delete product and all associated entities"""
    
    # Use ProductService for enhanced deletion workflow
    product_service = ProductService()
    
    try:
        await product_service.delete_product(workspace_id, product_id)
        logger.info("Product deleted via service", 
                    product_id=product_id,
                    workspace_id=workspace_id)
    except Exception as e:
        logger.error("Product deletion failed via service", 
                    error=str(e),
                    product_id=product_id,
                    workspace_id=workspace_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete product: {str(e)}"
        )