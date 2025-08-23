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

logger = structlog.get_logger(__name__)

router = APIRouter()


# Pydantic models
class ProductCreate(BaseModel):
    name: str
    description: Optional[str] = None
    metadata: Optional[dict] = None


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    metadata: Optional[dict] = None


class ProductResponse(BaseModel):
    id: int
    workspace_id: int
    name: str
    description: Optional[str]
    metadata: Optional[dict]
    created_at: str
    
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
    
    product_list = [
        ProductResponse(
            id=product.id,
            workspace_id=product.workspace_id,
            name=product.name,
            description=product.description,
            metadata=product.meta_data,
            created_at=product.created_at.isoformat()
        ) for product in products
    ]
    
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
    """Create new product"""
    
    # Create product
    new_product = Product(
        workspace_id=workspace_id,
        name=product_data.name,
        description=product_data.description,
        meta_data=product_data.metadata
    )
    
    db.add(new_product)
    await db.commit()
    await db.refresh(new_product)
    
    logger.info("Product created", 
                product_id=new_product.id, 
                name=product_data.name,
                workspace_id=workspace_id)
    
    product_response = ProductResponse(
        id=new_product.id,
        workspace_id=new_product.workspace_id,
        name=new_product.name,
        description=new_product.description,
        metadata=new_product.meta_data,
        created_at=new_product.created_at.isoformat()
    )
    
    return ProductDetailResponse(
        success=True,
        data=product_response,
        meta={
            "timestamp": "2024-01-01T12:00:00Z",
            "requestId": "req_123456"
        }
    )


@router.get("/{product_id}", response_model=ProductDetailResponse)
async def get_product(
    workspace_id: int,
    product_id: int,
    workspace = Depends(validate_workspace_access),
    db: AsyncSession = Depends(get_db)
):
    """Get product details"""
    
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


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    workspace_id: int,
    product_id: int,
    workspace = Depends(validate_workspace_access),
    db: AsyncSession = Depends(get_db)
):
    """Delete product"""
    
    product = await get_product_in_workspace(workspace_id, product_id, db)
    
    await db.delete(product)
    await db.commit()
    
    logger.info("Product deleted", 
                product_id=product_id,
                workspace_id=workspace_id)