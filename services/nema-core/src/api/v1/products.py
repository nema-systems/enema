"""Products API endpoints"""

from fastapi import APIRouter, HTTPException, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from sqlalchemy.orm import selectinload
from typing import List, Optional
from pydantic import BaseModel
import structlog

from ...database.connection import get_db
from ...database.models import Product, ProductModule, Module, Req
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
    create_default_module: bool = True  # Whether to auto-create default module
    selected_module_ids: Optional[List[int]] = None  # Additional modules to associate


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    metadata: Optional[dict] = None
    selected_module_ids: Optional[List[int]] = None  # Associated modules (not including default)


class ModuleInfo(BaseModel):
    """Basic module information"""
    id: int
    name: str
    description: Optional[str]
    shared: bool
    requirement_count: Optional[int] = None
    
    class Config:
        from_attributes = True


class ProductResponse(BaseModel):
    id: int
    workspace_id: int
    public_id: str
    name: str
    description: Optional[str]
    metadata: Optional[dict]
    created_at: str
    # Optional associated entities info
    default_module: Optional[ModuleInfo] = None
    modules: List[ModuleInfo] = []
    total_module_requirements: int = 0
    
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
    query = select(Product).options(selectinload(Product.default_module)).where(
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
    
    # Build base query with default_module relationship loaded
    query = select(Product).options(selectinload(Product.default_module)).where(Product.workspace_id == workspace_id)
    
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
    
    # Build response objects with module information
    product_list = []
    
    for product in products:
        try:
            default_module = None
            
            # Get default module directly from product.default_module relationship
            if product.default_module:
                default_module = ModuleInfo(
                    id=product.default_module.id,
                    name=product.default_module.name,
                    description=product.default_module.description,
                    shared=product.default_module.shared
                )
            
            # Get all modules associated with this product
            modules_query = select(Module).join(ProductModule).where(
                ProductModule.product_id == product.id
            )
            modules_result = await db.execute(modules_query)
            product_modules = modules_result.scalars().all()
            
            modules = []
            total_module_requirements = 0
            
            for module in product_modules:
                # Count requirements for this module
                module_req_count_query = select(func.count()).where(
                    Req.module_id == module.id
                )
                
                module_req_result = await db.execute(module_req_count_query)
                module_requirement_count = module_req_result.scalar() or 0
                total_module_requirements += module_requirement_count
                
                modules.append(ModuleInfo(
                    id=module.id,
                    name=module.name,
                    description=module.description,
                    shared=module.shared,
                    requirement_count=module_requirement_count
                ))
            
            product_response = ProductResponse(
                id=product.id,
                workspace_id=product.workspace_id,
                public_id=product.public_id,
                name=product.name,
                description=product.description,
                metadata=product.meta_data,
                created_at=product.created_at.isoformat(),
                default_module=default_module,
                modules=modules,
                total_module_requirements=total_module_requirements
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
                public_id=product.public_id,
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
    """Create new product with optional auto-creation of default module"""
    
    # Use ProductService for enhanced creation workflow
    product_service = ProductService()
    
    try:
        result = await product_service.create_product_with_defaults(
            workspace_id=workspace_id,
            name=product_data.name,
            description=product_data.description,
            metadata=product_data.metadata,
            create_default_module=product_data.create_default_module
        )
        
        # Associate additional modules if specified
        associated_modules = []
        if product_data.selected_module_ids:
            try:
                # Get the modules to associate
                modules_query = select(Module).where(
                    and_(
                        Module.id.in_(product_data.selected_module_ids),
                        Module.workspace_id == workspace_id,
                        Module.shared == True  # Only allow shared modules
                    )
                )
                modules_result = await db.execute(modules_query)
                modules_to_associate = modules_result.scalars().all()
                
                # Create ProductModule associations
                for module in modules_to_associate:
                    # Don't create association if this is the default module
                    if result.module and module.id == result.module.id:
                        continue
                        
                    product_module = ProductModule(
                        product_id=result.product.id,
                        module_id=module.id
                    )
                    db.add(product_module)
                    
                    associated_modules.append(ModuleInfo(
                        id=module.id,
                        name=module.name,
                        description=module.description,
                        shared=module.shared
                    ))
                
                await db.commit()
                
                logger.info("Associated modules with product", 
                           product_id=result.product.id,
                           module_count=len(associated_modules))
                
            except Exception as assoc_error:
                logger.warning("Failed to associate some modules", 
                              error=str(assoc_error),
                              product_id=result.product.id)
                # Don't fail the entire operation
        
        # Build response with optional module info
        default_module = None
                
        if result.module:
            default_module = ModuleInfo(
                id=result.module.id,
                name=result.module.name,
                description=result.module.description,
                shared=result.module.shared
            )
        
        
        product_response = ProductResponse(
            id=result.product.id,
            workspace_id=result.product.workspace_id,
            public_id=result.product.public_id,
            name=result.product.name,
            description=result.product.description,
            metadata=result.product.meta_data,
            created_at=result.product.created_at.isoformat(),
            default_module=default_module,
            modules=associated_modules,
        )
        
        logger.info("Product created successfully", 
                    product_id=result.product.id, 
                    name=product_data.name,
                    workspace_id=workspace_id,
                    has_module=result.module is not None)
        
        return ProductDetailResponse(
            success=True,
            data=product_response,
            meta={
                "timestamp": "2024-01-01T12:00:00Z",
                "requestId": "req_123456",
                "default_module_created": product_data.create_default_module
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
        
        # Build response with module info
        default_module = None
                
        if result.module:
            default_module = ModuleInfo(
                id=result.module.id,
                name=result.module.name,
                description=result.module.description,
                shared=result.module.shared
            )
        
        
        product_response = ProductResponse(
            id=result.product.id,
            workspace_id=result.product.workspace_id,
            public_id=result.product.public_id,
            name=result.product.name,
            description=result.product.description,
            metadata=result.product.meta_data,
            created_at=result.product.created_at.isoformat(),
            default_module=default_module,
        )
    else:
        # Standard product retrieval
        product = await get_product_in_workspace(workspace_id, product_id, db)
        
        # Build default module info if present
        default_module = None
        if product.default_module:
            default_module = ModuleInfo(
                id=product.default_module.id,
                name=product.default_module.name,
                description=product.default_module.description,
                shared=product.default_module.shared
            )
        
        product_response = ProductResponse(
            id=product.id,
            workspace_id=product.workspace_id,
            public_id=product.public_id,
            name=product.name,
            description=product.description,
            metadata=product.meta_data,
            created_at=product.created_at.isoformat(),
            default_module=default_module,
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
    """Update product and its associated modules"""
    
    product = await get_product_in_workspace(workspace_id, product_id, db)
    
    # Update basic fields if provided
    if product_data.name is not None:
        product.name = product_data.name
    if product_data.description is not None:
        product.description = product_data.description
    if product_data.metadata is not None:
        product.meta_data = product_data.metadata
    
    # Update associated modules if provided
    if product_data.selected_module_ids is not None:
        # Remove all existing ProductModule associations (but NOT the default module)
        existing_associations = select(ProductModule).where(ProductModule.product_id == product_id)
        existing_result = await db.execute(existing_associations)
        existing_modules = existing_result.scalars().all()
        
        for assoc in existing_modules:
            await db.delete(assoc)
        
        # Add new associations for selected modules
        for module_id in product_data.selected_module_ids:
            # Verify the module exists and is in the same workspace and is shared
            module_query = select(Module).where(
                and_(
                    Module.id == module_id,
                    Module.workspace_id == workspace_id,
                    Module.shared == True  # Only allow shared modules to be associated
                )
            )
            module_result = await db.execute(module_query)
            module = module_result.scalar_one_or_none()
            
            if module:
                # Don't add the default module to the junction table
                if module_id != product.default_module_id:
                    product_module = ProductModule(
                        workspace_id=workspace_id,
                        product_id=product_id,
                        module_id=module_id
                    )
                    db.add(product_module)
            else:
                logger.warning("Attempted to associate non-existent or non-shared module",
                             module_id=module_id, 
                             product_id=product_id,
                             workspace_id=workspace_id)
    
    await db.commit()
    await db.refresh(product)
    
    logger.info("Product updated", 
                product_id=product.id,
                workspace_id=workspace_id,
                updated_associations=product_data.selected_module_ids is not None)
    
    # Build default module info if present
    default_module = None
    if product.default_module:
        default_module = ModuleInfo(
            id=product.default_module.id,
            name=product.default_module.name,
            description=product.default_module.description,
            shared=product.default_module.shared
        )
    
    # Get updated associated modules
    associated_query = select(Module).join(ProductModule).where(
        ProductModule.product_id == product_id
    )
    associated_result = await db.execute(associated_query)
    associated_modules = associated_result.scalars().all()
    
    modules = [ModuleInfo(
        id=module.id,
        name=module.name,
        description=module.description,
        shared=module.shared
    ) for module in associated_modules]
    
    product_response = ProductResponse(
        id=product.id,
        workspace_id=product.workspace_id,
        public_id=product.public_id,
        name=product.name,
        description=product.description,
        metadata=product.meta_data,
        created_at=product.created_at.isoformat(),
        default_module=default_module,
        modules=modules,
        total_module_requirements=0  # Could calculate this if needed
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