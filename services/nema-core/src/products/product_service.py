"""Product service for managing multi-step product creation workflow"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from typing import Optional, Dict, Any
import structlog

from ..database.models import Product, Module, ReqCollection, ProductModule
from ..database.connection import get_db_session

logger = structlog.get_logger(__name__)


class ProductCreationResult:
    """Result of product creation with all associated entities"""
    def __init__(self, product: Product, module: Module, req_collection: ReqCollection):
        self.product = product
        self.module = module 
        self.req_collection = req_collection


class ProductDeletionPreview:
    """Preview of what will be deleted when deleting a product"""
    def __init__(self):
        self.modules_to_delete = []
        self.req_collections_to_delete = []
        self.requirements_count = 0


class ProductService:
    """Service for managing product creation and lifecycle"""
    
    async def create_product_with_defaults(
        self, 
        workspace_id: int,
        name: str,
        description: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        create_defaults: bool = True
    ) -> ProductCreationResult:
        """
        Create a new product with automatically created Module and ReqCollection
        
        Args:
            workspace_id: ID of the workspace to create the product in
            name: Product name
            description: Optional product description
            metadata: Optional metadata dictionary
            create_defaults: Whether to create default Module and ReqCollection
            
        Returns:
            ProductCreationResult containing the created entities
            
        Raises:
            IntegrityError: If product creation fails due to constraints
            Exception: For other database errors
        """
        async with get_db_session() as session:
            try:
                # Step 1: Create the Product
                product = Product(
                    workspace_id=workspace_id,
                    name=name,
                    description=description,
                    meta_data=metadata
                )
                session.add(product)
                await session.flush()  # Get the product ID
                
                logger.info("Product created", 
                           product_id=product.id, 
                           name=name,
                           workspace_id=workspace_id)
                
                if not create_defaults:
                    await session.commit()
                    await session.refresh(product)
                    # Return with empty module and req_collection for non-default creation
                    return ProductCreationResult(product, None, None)
                
                # Step 2: Create ReqCollection
                req_collection = ReqCollection(
                    workspace_id=workspace_id,
                    name=f"{name} - Requirements",
                    meta_data={"created_by": "product_service", "product_id": product.id}
                )
                session.add(req_collection)
                await session.flush()  # Get the req_collection ID
                
                logger.info("ReqCollection created", 
                           req_collection_id=req_collection.id,
                           name=req_collection.name,
                           product_id=product.id)
                
                # Step 3: Create base Module
                module = Module(
                    workspace_id=workspace_id,
                    req_collection_id=req_collection.id,
                    name=f"{name} - Base Module",
                    description=f"Base module for {name}",
                    rules="Default module rules - customize as needed",
                    shared=False,  # Start as non-shared
                    meta_data={"created_by": "product_service", "product_id": product.id}
                )
                session.add(module)
                await session.flush()  # Get the module ID
                
                logger.info("Module created", 
                           module_id=module.id,
                           name=module.name,
                           req_collection_id=req_collection.id,
                           product_id=product.id)
                
                # Step 4: Create ProductModule junction entry
                product_module = ProductModule(
                    workspace_id=workspace_id,
                    product_id=product.id,
                    module_id=module.id
                )
                session.add(product_module)
                
                # Step 5: Commit all changes
                await session.commit()
                
                # Refresh all entities to get the latest state
                await session.refresh(product)
                await session.refresh(req_collection)
                await session.refresh(module)
                
                logger.info("Product creation workflow completed successfully", 
                           product_id=product.id,
                           module_id=module.id,
                           req_collection_id=req_collection.id,
                           workspace_id=workspace_id)
                
                return ProductCreationResult(product, module, req_collection)
                
            except IntegrityError as e:
                await session.rollback()
                logger.error("Product creation failed due to integrity constraint", 
                           error=str(e),
                           workspace_id=workspace_id,
                           name=name)
                raise
            except Exception as e:
                await session.rollback()
                logger.error("Product creation failed", 
                           error=str(e),
                           workspace_id=workspace_id,
                           name=name)
                raise
    
    async def get_product_with_details(
        self, 
        workspace_id: int, 
        product_id: int
    ) -> Optional[ProductCreationResult]:
        """
        Get a product with its associated module and req collection details
        
        Args:
            workspace_id: ID of the workspace
            product_id: ID of the product
            
        Returns:
            ProductCreationResult if found, None otherwise
        """
        async with get_db_session() as session:
            try:
                # Get the product
                from sqlalchemy import select
                
                product_query = select(Product).where(
                    (Product.id == product_id) & 
                    (Product.workspace_id == workspace_id)
                )
                result = await session.execute(product_query)
                product = result.scalar_one_or_none()
                
                if not product:
                    return None
                
                # Get associated modules and req collections
                # For now, get the first module (base module)
                module_query = (
                    select(Module)
                    .join(ProductModule)
                    .where(
                        (ProductModule.product_id == product_id) &
                        (ProductModule.workspace_id == workspace_id)
                    )
                    .limit(1)
                )
                module_result = await session.execute(module_query)
                module = module_result.scalar_one_or_none()
                
                req_collection = None
                if module:
                    req_collection_query = select(ReqCollection).where(
                        ReqCollection.id == module.req_collection_id
                    )
                    req_collection_result = await session.execute(req_collection_query)
                    req_collection = req_collection_result.scalar_one_or_none()
                
                return ProductCreationResult(product, module, req_collection)
                
            except Exception as e:
                logger.error("Failed to get product with details", 
                           error=str(e),
                           workspace_id=workspace_id,
                           product_id=product_id)
                raise
    
    async def delete_product(
        self, 
        workspace_id: int, 
        product_id: int
    ) -> bool:
        """
        Delete a product and all its associated entities
        
        Args:
            workspace_id: ID of the workspace
            product_id: ID of the product to delete
            
        Returns:
            True if deletion was successful
            
        Raises:
            Exception: If product doesn't exist or deletion fails
        """
        async with get_db_session() as session:
            try:
                from sqlalchemy import select, and_
                
                # First, verify the product exists and belongs to workspace
                product_query = select(Product).where(
                    and_(
                        Product.id == product_id,
                        Product.workspace_id == workspace_id
                    )
                )
                result = await session.execute(product_query)
                product = result.scalar_one_or_none()
                
                if not product:
                    raise Exception(f"Product with ID {product_id} not found in workspace {workspace_id}")
                
                # Find associated modules that were auto-created for this product
                from ..database.models import ProductModule, Module, ReqCollection
                
                # Get modules associated with this product
                module_query = (
                    select(Module)
                    .join(ProductModule)
                    .where(
                        and_(
                            ProductModule.product_id == product_id,
                            ProductModule.workspace_id == workspace_id
                        )
                    )
                )
                modules_result = await session.execute(module_query)
                modules = modules_result.scalars().all()
                
                modules_to_delete = []
                req_collections_to_delete = []
                
                for module in modules:
                    # Only delete if it was auto-created by product service and not shared
                    is_auto_created = (
                        module.meta_data and 
                        module.meta_data.get("created_by") == "product_service" and
                        module.meta_data.get("product_id") == product_id
                    )
                    
                    if is_auto_created and not module.shared:
                        # Check if this module is used by other products
                        other_products_query = select(ProductModule).where(
                            and_(
                                ProductModule.module_id == module.id,
                                ProductModule.product_id != product_id
                            )
                        )
                        other_products_result = await session.execute(other_products_query)
                        other_products = other_products_result.scalars().all()
                        
                        if not other_products:  # Module is only used by this product
                            modules_to_delete.append(module)
                            
                            # Check if the associated req_collection should also be deleted
                            if module.req_collection_id:
                                req_collection_query = select(ReqCollection).where(
                                    ReqCollection.id == module.req_collection_id
                                )
                                req_collection_result = await session.execute(req_collection_query)
                                req_collection = req_collection_result.scalar_one_or_none()
                                
                                if req_collection and req_collection.meta_data:
                                    is_req_collection_auto_created = (
                                        req_collection.meta_data.get("created_by") == "product_service" and
                                        req_collection.meta_data.get("product_id") == product_id
                                    )
                                    
                                    if is_req_collection_auto_created:
                                        # Check if req_collection is used by other modules
                                        other_modules_query = select(Module).where(
                                            and_(
                                                Module.req_collection_id == req_collection.id,
                                                Module.id != module.id
                                            )
                                        )
                                        other_modules_result = await session.execute(other_modules_query)
                                        other_modules = other_modules_result.scalars().all()
                                        
                                        if not other_modules:  # ReqCollection is only used by this module
                                            req_collections_to_delete.append(req_collection)
                
                # Log the deletion for audit purposes
                logger.info("Starting product deletion", 
                           product_id=product_id,
                           product_name=product.name,
                           workspace_id=workspace_id,
                           modules_to_delete=[m.id for m in modules_to_delete],
                           req_collections_to_delete=[r.id for r in req_collections_to_delete])
                
                # Delete ProductModule junction entries first to avoid dependency conflicts
                product_module_query = select(ProductModule).where(
                    and_(
                        ProductModule.product_id == product_id,
                        ProductModule.workspace_id == workspace_id
                    )
                )
                product_modules_result = await session.execute(product_module_query)
                product_modules = product_modules_result.scalars().all()
                
                for product_module in product_modules:
                    logger.info("Deleting ProductModule junction entry",
                               product_id=product_module.product_id,
                               module_id=product_module.module_id,
                               workspace_id=product_module.workspace_id)
                    await session.delete(product_module)
                
                # Delete auto-created req_collections (due to foreign key constraints with modules)
                for req_collection in req_collections_to_delete:
                    logger.info("Deleting auto-created req_collection",
                               req_collection_id=req_collection.id,
                               req_collection_name=req_collection.name,
                               product_id=product_id)
                    await session.delete(req_collection)
                
                # Delete auto-created modules
                for module in modules_to_delete:
                    logger.info("Deleting auto-created module",
                               module_id=module.id,
                               module_name=module.name,
                               product_id=product_id)
                    await session.delete(module)
                
                # Delete the product last
                await session.delete(product)
                await session.commit()
                
                logger.info("Product deleted successfully", 
                           product_id=product_id,
                           workspace_id=workspace_id)
                
                return True
                
            except Exception as e:
                await session.rollback()
                logger.error("Product deletion failed", 
                           error=str(e),
                           product_id=product_id,
                           workspace_id=workspace_id)
                raise
    
    async def get_deletion_preview(
        self, 
        workspace_id: int, 
        product_id: int
    ) -> ProductDeletionPreview:
        """
        Get a preview of what will be deleted when deleting a product
        
        Args:
            workspace_id: ID of the workspace
            product_id: ID of the product
            
        Returns:
            ProductDeletionPreview with details of entities to be deleted
            
        Raises:
            Exception: If product doesn't exist
        """
        async with get_db_session() as session:
            try:
                from sqlalchemy import select, and_, func
                from ..database.models import ProductModule, Module, ReqCollection, Req
                
                # First, verify the product exists and belongs to workspace
                product_query = select(Product).where(
                    and_(
                        Product.id == product_id,
                        Product.workspace_id == workspace_id
                    )
                )
                result = await session.execute(product_query)
                product = result.scalar_one_or_none()
                
                if not product:
                    raise Exception(f"Product with ID {product_id} not found in workspace {workspace_id}")
                
                preview = ProductDeletionPreview()
                
                # Get modules associated with this product
                module_query = (
                    select(Module)
                    .join(ProductModule)
                    .where(
                        and_(
                            ProductModule.product_id == product_id,
                            ProductModule.workspace_id == workspace_id
                        )
                    )
                )
                modules_result = await session.execute(module_query)
                modules = modules_result.scalars().all()
                
                for module in modules:
                    # Only include if it would be deleted (auto-created and not shared)
                    is_auto_created = (
                        module.meta_data and 
                        module.meta_data.get("created_by") == "product_service" and
                        module.meta_data.get("product_id") == product_id
                    )
                    
                    if is_auto_created and not module.shared:
                        # Check if this module is used by other products
                        other_products_query = select(ProductModule).where(
                            and_(
                                ProductModule.module_id == module.id,
                                ProductModule.product_id != product_id
                            )
                        )
                        other_products_result = await session.execute(other_products_query)
                        other_products = other_products_result.scalars().all()
                        
                        if not other_products:  # Module is only used by this product
                            preview.modules_to_delete.append({
                                "id": module.id,
                                "name": module.name,
                                "description": module.description
                            })
                            
                            # Check if the associated req_collection would also be deleted
                            if module.req_collection_id:
                                req_collection_query = select(ReqCollection).where(
                                    ReqCollection.id == module.req_collection_id
                                )
                                req_collection_result = await session.execute(req_collection_query)
                                req_collection = req_collection_result.scalar_one_or_none()
                                
                                if req_collection and req_collection.meta_data:
                                    is_req_collection_auto_created = (
                                        req_collection.meta_data.get("created_by") == "product_service" and
                                        req_collection.meta_data.get("product_id") == product_id
                                    )
                                    
                                    if is_req_collection_auto_created:
                                        # Check if req_collection is used by other modules
                                        other_modules_query = select(Module).where(
                                            and_(
                                                Module.req_collection_id == req_collection.id,
                                                Module.id != module.id
                                            )
                                        )
                                        other_modules_result = await session.execute(other_modules_query)
                                        other_modules = other_modules_result.scalars().all()
                                        
                                        if not other_modules:  # ReqCollection is only used by this module
                                            # Count requirements in this collection
                                            req_count_query = select(func.count(Req.id)).where(
                                                Req.req_collection_id == req_collection.id
                                            )
                                            req_count_result = await session.execute(req_count_query)
                                            req_count = req_count_result.scalar()
                                            
                                            preview.req_collections_to_delete.append({
                                                "id": req_collection.id,
                                                "name": req_collection.name,
                                                "requirements_count": req_count
                                            })
                                            
                                            preview.requirements_count += req_count
                
                return preview
                
            except Exception as e:
                logger.error("Failed to get deletion preview", 
                           error=str(e),
                           workspace_id=workspace_id,
                           product_id=product_id)
                raise