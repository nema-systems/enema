"""Database connection and session management"""

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import text
from contextlib import asynccontextmanager
import structlog

logger = structlog.get_logger(__name__)


class Base(DeclarativeBase):
    """Base class for all database models"""
    pass


# Global engine and session factory
engine = None
async_session_factory = None


async def init_database(database_url: str):
    """Initialize database connection and schema"""
    global engine, async_session_factory
    
    logger.info("Initializing database connection", database_url=database_url)
    
    # Ensure asyncpg URL format
    if database_url.startswith("postgresql://"):
        database_url = database_url.replace("postgresql://", "postgresql+asyncpg://")
    
    # Create async engine with explicit asyncpg driver
    engine = create_async_engine(
        database_url,
        echo=False,  # Set to True for SQL debugging
        pool_size=10,
        max_overflow=20,
        pool_pre_ping=True,  # Validate connections before use
        pool_recycle=3600,   # Recycle connections after 1 hour
    )
    
    # Create session factory
    async_session_factory = async_sessionmaker(
        engine, 
        class_=AsyncSession,
        expire_on_commit=False
    )
    
    # Test connection and initialize database schema
    try:
        async with engine.begin() as conn:
            # Test basic connection
            await conn.execute(text("SELECT 1"))
            logger.info("Database connection established successfully")
            
            # Initialize database schema
            await _initialize_database_schema(conn)
            
    except Exception as e:
        logger.error("Failed to connect to database", error=str(e))
        raise


@asynccontextmanager
async def get_db_session():
    """Get database session with automatic cleanup"""
    if async_session_factory is None:
        raise RuntimeError("Database not initialized. Call init_database() first.")
    
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def get_db():
    """FastAPI dependency for database sessions"""
    async with get_db_session() as session:
        yield session


async def close_database():
    """Close database connections (cleanup)"""
    global engine
    if engine:
        await engine.dispose()
        logger.info("Database connections closed")


async def _initialize_database_schema(conn):
    """Initialize database schema, extensions, and initial data"""
    
    logger.info("Initializing database schema...")
    
    try:
        # Create required PostgreSQL extensions
        await conn.execute(text('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"'))
        await conn.execute(text('CREATE EXTENSION IF NOT EXISTS "pgcrypto"'))
        
        logger.info("Required PostgreSQL extensions created successfully")
        
        # Create schemas
        await conn.execute(text("CREATE SCHEMA IF NOT EXISTS nema"))
        await conn.execute(text("CREATE SCHEMA IF NOT EXISTS auth"))
        await conn.execute(text("CREATE SCHEMA IF NOT EXISTS temporal"))
        await conn.execute(text("CREATE SCHEMA IF NOT EXISTS embeddings"))
        
        logger.info("Database extensions and schemas created successfully")
        
        # Import all models to ensure they're registered with Base
        from .models import Base
        
        # Create all tables defined in models
        await conn.run_sync(Base.metadata.create_all)
        
        logger.info("Database tables created successfully via SQLAlchemy")
        
        # Create additional tables that aren't in SQLAlchemy models yet
        await _create_additional_tables(conn)
        
        # Create initial data (tenants, workspaces, etc.)
        await _create_initial_data(conn)
        
        # Set database search path
        await conn.execute(text("ALTER DATABASE nema SET search_path = nema,temporal,auth,embeddings,public"))
        
        logger.info("Database schema initialization completed successfully")
        
    except Exception as e:
        logger.error("Failed to initialize database schema", error=str(e))
        raise


async def _create_additional_tables(conn):
    """Create additional tables not yet covered by SQLAlchemy models"""
    
    # Auth schema tables
    await conn.execute(text("""
        CREATE TABLE IF NOT EXISTS auth.tenants (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            tenant_id VARCHAR(100) UNIQUE NOT NULL,
            name VARCHAR(255) NOT NULL,
            domain VARCHAR(255),
            is_active BOOLEAN DEFAULT true,
            settings JSONB DEFAULT '{}',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """))
    
    await conn.execute(text("""
        CREATE TABLE IF NOT EXISTS auth.workspaces (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            workspace_id VARCHAR(100) NOT NULL,
            tenant_id VARCHAR(100) REFERENCES auth.tenants(tenant_id),
            name VARCHAR(255) NOT NULL,
            settings JSONB DEFAULT '{}',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(tenant_id, workspace_id)
        )
    """))
    
    # Create embeddings table with JSONB (pgvector will be handled separately)
    await conn.execute(text("""
        CREATE TABLE IF NOT EXISTS embeddings.artifact_embeddings (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            artifact_global_id BIGINT NOT NULL,
            text_content TEXT,
            embedding JSONB,
            model_name VARCHAR(100) DEFAULT 'text-embedding-ada-002',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """))
    
    # Create indexes
    await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_artifacts_global_id ON nema.artifacts(global_id)"))
    await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_artifacts_project_id ON nema.artifacts(project_id)"))
    await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_artifacts_type ON nema.artifacts(artifact_type)"))
    await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_embeddings_artifact_id ON embeddings.artifact_embeddings(artifact_global_id)"))
    
    logger.info("Additional database tables and indexes created successfully")


async def _create_initial_data(conn):
    """Create initial tenant, workspace and test data"""
    
    # Create default tenant
    await conn.execute(text("""
        INSERT INTO auth.tenants (tenant_id, name, domain) 
        VALUES ('default', 'Default Tenant', 'localhost') 
        ON CONFLICT (tenant_id) DO NOTHING
    """))
    
    # Create default workspace
    await conn.execute(text("""
        INSERT INTO auth.workspaces (workspace_id, tenant_id, name)
        VALUES ('default', 'default', 'Default Workspace')
        ON CONFLICT (tenant_id, workspace_id) DO NOTHING
    """))
    
    # Create test project for development
    test_project_id = "f47ac10b-58cc-4372-a567-0e02b2c3d479"
    await conn.execute(text("""
        INSERT INTO nema.projects (id, name, description, tenant_id, workspace_id)
        VALUES (:project_id, 'Test Project', 'A test project for development and testing', 'default', 'default')
        ON CONFLICT (id) DO NOTHING
    """), {"project_id": test_project_id})
    
    logger.info("Initial data (tenant, workspace, test project) created successfully")