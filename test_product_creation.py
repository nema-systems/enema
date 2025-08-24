#!/usr/bin/env python3
"""
Test script to verify the new product creation workflow
"""
import asyncio
import sys
import os

# Add the src directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'services', 'nema-core', 'src'))

from database.connection import init_database, get_db_session
from products.product_service import ProductService
from database.models import Product, Module, ReqCollection, ProductModule
from sqlalchemy import select
import structlog

# Configure logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger(__name__)


async def test_product_creation_workflow():
    """Test the enhanced product creation workflow"""
    
    # Initialize database connection
    database_url = "postgresql+asyncpg://nema_user:nema_password@localhost:5432/nema_db"
    await init_database(database_url)
    
    product_service = ProductService()
    
    # Test workspace ID (assuming workspace 1 exists)
    test_workspace_id = 1
    
    try:
        logger.info("Testing product creation with defaults...")
        
        # Test 1: Create product with defaults (should create Module and ReqCollection)
        result = await product_service.create_product_with_defaults(
            workspace_id=test_workspace_id,
            name="Test Product",
            description="A test product to verify the workflow",
            metadata={"test": True},
            create_defaults=True
        )
        
        print("✅ Product created successfully!")
        print(f"   Product ID: {result.product.id}")
        print(f"   Product Name: {result.product.name}")
        
        if result.module:
            print(f"   Module ID: {result.module.id}")
            print(f"   Module Name: {result.module.name}")
        else:
            print("   ❌ Module not created")
            
        if result.req_collection:
            print(f"   ReqCollection ID: {result.req_collection.id}")
            print(f"   ReqCollection Name: {result.req_collection.name}")
        else:
            print("   ❌ ReqCollection not created")
        
        # Test 2: Verify relationships in database
        async with get_db_session() as session:
            # Check ProductModule junction
            junction_query = select(ProductModule).where(
                ProductModule.product_id == result.product.id
            )
            junction_result = await session.execute(junction_query)
            product_module = junction_result.scalar_one_or_none()
            
            if product_module:
                print("   ✅ ProductModule junction created")
                print(f"   Junction - Product ID: {product_module.product_id}, Module ID: {product_module.module_id}")
            else:
                print("   ❌ ProductModule junction missing")
        
        # Test 3: Get product with details
        logger.info("Testing get_product_with_details...")
        details_result = await product_service.get_product_with_details(
            test_workspace_id, 
            result.product.id
        )
        
        if details_result:
            print("✅ Product details retrieval successful!")
            print(f"   Retrieved Product: {details_result.product.name}")
            if details_result.module:
                print(f"   Retrieved Module: {details_result.module.name}")
            if details_result.req_collection:
                print(f"   Retrieved ReqCollection: {details_result.req_collection.name}")
        else:
            print("❌ Product details retrieval failed")
        
        # Test 4: Create product without defaults
        logger.info("Testing product creation without defaults...")
        simple_result = await product_service.create_product_with_defaults(
            workspace_id=test_workspace_id,
            name="Simple Test Product",
            description="A test product without defaults",
            create_defaults=False
        )
        
        print("✅ Simple product created successfully!")
        print(f"   Product ID: {simple_result.product.id}")
        print(f"   Has Module: {simple_result.module is not None}")
        print(f"   Has ReqCollection: {simple_result.req_collection is not None}")
        
        logger.info("All tests completed successfully!")
        
    except Exception as e:
        logger.error("Test failed", error=str(e))
        print(f"❌ Test failed: {str(e)}")
        raise


if __name__ == "__main__":
    asyncio.run(test_product_creation_workflow())