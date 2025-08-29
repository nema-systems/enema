"""Product service for managing multi-step product creation workflow"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from sqlalchemy import select, and_, func
from typing import Optional, Dict, Any
import structlog

from ..database.models import Product, Module, ProductModule
from ..database.connection import get_db_session

logger = structlog.get_logger(__name__)


class ProductCreationResult:
    """Result of product creation with all associated entities"""
    def __init__(self, product: Product, module: Module):
        self.product = product
        self.module = module


class ProductDeletionPreview:
    """Preview of what will be deleted when deleting a product"""
    def __init__(self):
        self.modules_to_delete = []
        self.requirements_count = 0


class ProductService:
    """Service for managing product creation and lifecycle"""
    
    async def create_product_with_defaults(
        self, 
        workspace_id: int,
        name: str,
        description: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        create_default_module: bool = True
    ) -> ProductCreationResult:
        """
        Create a new product with automatically created default module
        
        Args:
            workspace_id: ID of the workspace to create the product in
            name: Product name
            description: Optional product description
            metadata: Optional metadata dictionary
            create_default_module: Whether to create default module
            
        Returns:
            ProductCreationResult with created product and module
            
        Raises:
            IntegrityError: If product name conflicts with existing product in workspace
            Exception: For other database or validation errors
        """
        
        async with get_db_session() as session:
            try:
                # Step 1: Create Product
                product = Product(
                    workspace_id=workspace_id,
                    name=name,
                    description=description,
                    meta_data=metadata or {}
                )
                
                session.add(product)
                await session.flush()  # Get the product ID
                
                if not create_default_module:
                    # Return without creating default module
                    return ProductCreationResult(product, None)
                
                # Step 2: Create Module with generated public_id
                # Generate a simple public_id using timestamp (since there's no trigger for modules)
                import time
                timestamp_id = int(time.time() * 1000)  # milliseconds
                public_id = f"MOD-{timestamp_id}"
                
                module = Module(
                    workspace_id=workspace_id,
                    public_id=public_id,
                    name=f"{name} Base Module",
                    description=f"Base module for {name} product requirements",
                    shared=False,  # Product-specific module
                    meta_data={
                        "created_by": "product_service",
                        "product_id": product.id,
                        "auto_created": True
                    }
                )
                
                session.add(module)
                await session.flush()  # Get the module ID
                
                # Step 3: Link the default module to the product
                product.default_module_id = module.id
                await session.flush()  # Ensure the default_module_id is persisted
                
                logger.info("Module created", 
                           module_id=module.id,
                           name=module.name,
                           product_id=product.id)
                
                # Note: Default module is linked via default_module_id foreign key,
                # NOT via the ProductModule junction table. The junction table is only
                # for additional shared modules that can be attached/detached.
                
                # Note: transaction commit is handled by get_db_session() context manager
                await session.refresh(product)
                await session.refresh(module)
                
                logger.info("Product creation completed", 
                           product_id=product.id,
                           module_id=module.id,
                           name=name)
                
                return ProductCreationResult(product, module)
                
            except IntegrityError as e:
                # Note: rollback is handled by get_db_session() context manager
                logger.error("Product creation failed due to integrity constraint", 
                           error=str(e),
                           workspace_id=workspace_id,
                           name=name)
                raise
            except Exception as e:
                # Note: rollback is handled by get_db_session() context manager
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
        Get a product with its associated module
        
        Returns ProductCreationResult or None if product not found
        """
        async with get_db_session() as session:
            try:
                # Get product
                product_query = select(Product).where(
                    and_(
                        Product.id == product_id,
                        Product.workspace_id == workspace_id
                    )
                )
                product_result = await session.execute(product_query)
                product = product_result.scalar_one_or_none()
                
                if not product:
                    return None
                
                # Get associated module (if any)
                module_query = select(Module).join(ProductModule).where(
                    and_(
                        ProductModule.product_id == product_id,
                        ProductModule.workspace_id == workspace_id,
                        Module.meta_data.op('->>')('product_id') == str(product_id)
                    )
                )
                module_result = await session.execute(module_query)
                module = module_result.scalar_one_or_none()
                
                return ProductCreationResult(product, module)
                
            except Exception as e:
                logger.error("Failed to get product details", 
                           error=str(e),
                           product_id=product_id,
                           workspace_id=workspace_id)
                return None
    
    async def delete_product_cascade(
        self, 
        workspace_id: int, 
        product_id: int
    ) -> bool:
        """
        Delete product and all auto-created associated entities
        
        This will delete:
        1. Auto-created modules (shared modules will be preserved) 
        2. Requirements in auto-created modules (CASCADE)
        3. The product itself
        4. ProductModule associations (CASCADE)
        
        Returns True if deletion successful, raises exception otherwise
        """
        async with get_db_session() as session:
            try:
                from ..database.models import ProductModule, Module, Req
                
                logger.info("Starting product deletion", 
                           product_id=product_id,
                           workspace_id=workspace_id)
                
                # Get product first
                product_query = select(Product).where(
                    and_(
                        Product.id == product_id,
                        Product.workspace_id == workspace_id
                    )
                )
                product_result = await session.execute(product_query)
                product = product_result.scalar_one_or_none()
                
                if not product:
                    logger.warning("Product not found for deletion", 
                                 product_id=product_id,
                                 workspace_id=workspace_id)
                    return False
                
                # Find modules associated with this product
                modules_query = select(Module).join(ProductModule).where(
                    and_(
                        ProductModule.product_id == product_id,
                        ProductModule.workspace_id == workspace_id
                    )
                )
                modules_result = await session.execute(modules_query)
                modules = modules_result.scalars().all()
                
                modules_to_delete = []
                
                # First, check if there's a default module to delete
                if product.default_module_id:
                    default_module_query = select(Module).where(Module.id == product.default_module_id)
                    default_module_result = await session.execute(default_module_query)
                    default_module = default_module_result.scalar_one_or_none()
                    
                    if default_module:
                        modules_to_delete.append(default_module)
                
                # Then check junction table modules
                for module in modules:
                    # Skip if this is already the default module
                    if product.default_module_id and module.id == product.default_module_id:
                        continue
                        
                    # Check if this module was auto-created by product service
                    if module.meta_data and isinstance(module.meta_data, dict):
                        is_auto_created = (
                            module.meta_data.get("created_by") == "product_service" and
                            module.meta_data.get("product_id") == product_id
                        )
                        
                        if is_auto_created:
                            modules_to_delete.append(module)
                
                logger.info("Found modules to delete", 
                           product_id=product_id,
                           modules_to_delete=[m.id for m in modules_to_delete])
                
                # Delete ProductModule associations for modules we're going to delete
                from sqlalchemy import delete
                for module in modules_to_delete:
                    logger.info("Removing ProductModule associations for module",
                               module_id=module.id,
                               module_name=module.name,
                               product_id=product_id)
                    
                    # Delete ProductModule associations for this module
                    delete_pm_stmt = delete(ProductModule).where(
                        and_(
                            ProductModule.product_id == product_id,
                            ProductModule.module_id == module.id,
                            ProductModule.workspace_id == workspace_id
                        )
                    )
                    await session.execute(delete_pm_stmt)
                
                # Now delete the auto-created modules (requirements will cascade)
                for module in modules_to_delete:
                    logger.info("Deleting auto-created module",
                               module_id=module.id,
                               module_name=module.name,
                               product_id=product_id)
                    await session.delete(module)
                
                # Delete the product (remaining ProductModule associations will cascade)
                logger.info("Deleting product", 
                           product_id=product_id,
                           product_name=product.name)
                await session.delete(product)
                
                # Note: transaction commit/rollback is handled by get_db_session() context manager
                
                logger.info("Product deletion completed", 
                           product_id=product_id,
                           deleted_modules_count=len(modules_to_delete))
                
                return True
                
            except Exception as e:
                logger.error("Product deletion failed", 
                           error=str(e),
                           product_id=product_id,
                           workspace_id=workspace_id,
                           exc_info=True)  # Include full stack trace
                # Re-raise the exception so get_db_session can handle the rollback
                raise
    
    async def get_product_deletion_preview(
        self, 
        workspace_id: int, 
        product_id: int
    ) -> Optional[ProductDeletionPreview]:
        """
        Get preview of what will be deleted when deleting a product
        
        Returns ProductDeletionPreview or None if product not found
        """
        async with get_db_session() as session:
            try:
                from ..database.models import ProductModule, Module, Req
                
                # Check if product exists
                product_query = select(Product).where(
                    and_(
                        Product.id == product_id,
                        Product.workspace_id == workspace_id
                    )
                )
                product_result = await session.execute(product_query)
                product = product_result.scalar_one_or_none()
                
                if not product:
                    return None
                
                preview = ProductDeletionPreview()
                
                # Check default module first
                if product.default_module_id:
                    default_module_query = select(Module).where(Module.id == product.default_module_id)
                    default_module_result = await session.execute(default_module_query)
                    default_module = default_module_result.scalar_one_or_none()
                    
                    if default_module:
                        # Count requirements in the default module
                        req_count_query = select(func.count(Req.id)).where(
                            Req.module_id == default_module.id
                        )
                        req_count_result = await session.execute(req_count_query)
                        req_count = req_count_result.scalar() or 0
                        
                        preview.modules_to_delete.append({
                            "id": default_module.id,
                            "name": default_module.name,
                            "requirements_count": req_count,
                            "is_default": True
                        })
                        preview.requirements_count += req_count
                
                # Find additional modules that will be deleted (via junction table)
                modules_query = select(Module).join(ProductModule).where(
                    and_(
                        ProductModule.product_id == product_id,
                        ProductModule.workspace_id == workspace_id
                    )
                )
                modules_result = await session.execute(modules_query)
                modules = modules_result.scalars().all()
                
                for module in modules:
                    # Skip if this is already the default module
                    if product.default_module_id and module.id == product.default_module_id:
                        continue
                        
                    # Check if module was auto-created and will be deleted
                    if module.meta_data and isinstance(module.meta_data, dict):
                        is_auto_created = (
                            module.meta_data.get("created_by") == "product_service" and
                            module.meta_data.get("product_id") == product_id
                        )
                        
                        if is_auto_created:
                            # Count requirements in this module
                            req_count_query = select(func.count(Req.id)).where(
                                Req.module_id == module.id
                            )
                            req_count_result = await session.execute(req_count_query)
                            req_count = req_count_result.scalar() or 0
                            
                            preview.modules_to_delete.append({
                                "id": module.id,
                                "name": module.name,
                                "requirements_count": req_count,
                                "is_default": False
                            })
                            preview.requirements_count += req_count
                
                return preview
                
            except Exception as e:
                logger.error("Failed to generate product deletion preview", 
                           error=str(e),
                           product_id=product_id,
                           workspace_id=workspace_id)
                return None
    
    # API compatibility aliases
    async def get_deletion_preview(self, workspace_id: int, product_id: int) -> Optional[ProductDeletionPreview]:
        """Alias for get_product_deletion_preview for API compatibility"""
        return await self.get_product_deletion_preview(workspace_id, product_id)
    
    async def delete_product(self, workspace_id: int, product_id: int) -> bool:
        """Delete product with simplified logic for API compatibility"""
        try:
            return await self.delete_product_cascade(workspace_id, product_id)
        except Exception as e:
            logger.warning("Cascade deletion failed, trying simple deletion", 
                         error=str(e), product_id=product_id)
            return await self.delete_product_simple(workspace_id, product_id)
    
    async def delete_product_simple(
        self, 
        workspace_id: int, 
        product_id: int
    ) -> bool:
        """Simple product deletion that relies entirely on database CASCADE constraints"""
        async with get_db_session() as session:
            try:
                logger.info("Starting simple product deletion", 
                           product_id=product_id,
                           workspace_id=workspace_id)
                
                # Just get and delete the product - let CASCADE handle everything else
                product_query = select(Product).where(
                    and_(
                        Product.id == product_id,
                        Product.workspace_id == workspace_id
                    )
                )
                product_result = await session.execute(product_query)
                product = product_result.scalar_one_or_none()
                
                if not product:
                    logger.warning("Product not found for deletion", 
                                 product_id=product_id,
                                 workspace_id=workspace_id)
                    return False
                
                # Delete the product - CASCADE should handle all relationships
                logger.info("Deleting product with CASCADE", 
                           product_id=product_id,
                           product_name=product.name)
                await session.delete(product)
                
                logger.info("Simple product deletion completed", 
                           product_id=product_id)
                
                return True
                
            except Exception as e:
                logger.error("Simple product deletion failed", 
                           error=str(e),
                           product_id=product_id,
                           workspace_id=workspace_id,
                           exc_info=True)
                raise
    
    async def get_deletion_preview(self, workspace_id: int, product_id: int) -> Optional[ProductDeletionPreview]:
        """Alias for get_product_deletion_preview for API compatibility"""
        return await self.get_product_deletion_preview(workspace_id, product_id)