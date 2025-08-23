"""Database connection and session management for cloud deployment"""

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import text
from contextlib import asynccontextmanager
import structlog

logger = structlog.get_logger(__name__)

# Global engine and session factory
engine = None
async_session_factory = None


async def init_database(database_url: str):
    """Initialize database connection and create all tables for cloud deployment"""
    global engine, async_session_factory
    
    logger.info("Initializing database connection for requirement management system", 
                database_url=database_url)
    
    # Ensure asyncpg URL format
    if database_url.startswith("postgresql://"):
        database_url = database_url.replace("postgresql://", "postgresql+asyncpg://")
    elif not database_url.startswith("postgresql+asyncpg://"):
        logger.warning("Database URL should use postgresql+asyncpg:// for async support")
    
    # Create async engine with cloud deployment settings
    engine = create_async_engine(
        database_url,
        echo=False,  # Set to True for SQL debugging
        pool_size=10,
        max_overflow=20,
        pool_pre_ping=True,  # Validate connections before use
        pool_recycle=3600,   # Recycle connections after 1 hour
        # Additional cloud-friendly settings
        connect_args={
            "server_settings": {
                "application_name": "nema-core",
                "jit": "off"  # Disable JIT for better cold start performance
            }
        }
    )
    
    # Create session factory
    async_session_factory = async_sessionmaker(
        engine, 
        class_=AsyncSession,
        expire_on_commit=False
    )
    
    # Test connection and create database schema
    try:
        async with engine.begin() as conn:
            # Test basic connection
            await conn.execute(text("SELECT 1"))
            logger.info("Database connection established successfully")
            
            # Create database schema and tables for cloud deployment
            await _create_database_schema(conn)
            
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


async def _create_database_schema(conn):
    """Create complete database schema for cloud deployment"""
    
    logger.info("Creating database schema for requirement management system...")
    
    try:
        # Create required PostgreSQL extensions
        await conn.execute(text('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"'))
        logger.info("UUID extension created successfully")
        
        # Import models to register them with Base
        from .models import Base
        
        # Create all tables defined in SQLAlchemy models
        logger.info("Creating database tables...")
        await conn.run_sync(Base.metadata.create_all)
        logger.info("Database tables created successfully")
        
        # Create indexes for performance
        await _create_database_indexes(conn)
        
        # Create sequences for public ID generation
        await _create_public_id_sequences(conn)
        
        # Create functions and triggers for public ID generation
        await _create_public_id_functions(conn)
        
        logger.info("Database schema initialization completed successfully")
        
    except Exception as e:
        logger.error("Failed to initialize database schema", error=str(e))
        raise


async def _create_database_indexes(conn):
    """Create database indexes for performance optimization"""
    
    logger.info("Creating database indexes...")
    
    indexes = [
        # User indexes
        "CREATE INDEX IF NOT EXISTS idx_user_clerk_user_id ON \"user\"(clerk_user_id)",
        "CREATE INDEX IF NOT EXISTS idx_user_email ON \"user\"(email)",
        
        # Organization indexes
        "CREATE INDEX IF NOT EXISTS idx_organization_clerk_org_id ON organization(clerk_org_id)",
        "CREATE INDEX IF NOT EXISTS idx_organization_slug ON organization(slug)",
        
        # Workspace indexes
        "CREATE INDEX IF NOT EXISTS idx_workspace_name ON workspace(name)",
        
        # Requirement indexes
        "CREATE INDEX IF NOT EXISTS idx_req_public_id ON req(public_id)",
        "CREATE INDEX IF NOT EXISTS idx_req_base_req_id ON req(base_req_id)",
        "CREATE INDEX IF NOT EXISTS idx_req_collection_id ON req(req_collection_id)",
        "CREATE INDEX IF NOT EXISTS idx_req_author_id ON req(author_id)",
        "CREATE INDEX IF NOT EXISTS idx_req_owner_id ON req(owner_id)",
        "CREATE INDEX IF NOT EXISTS idx_req_status ON req(status)",
        "CREATE INDEX IF NOT EXISTS idx_req_priority ON req(priority)",
        
        # Parameter indexes
        "CREATE INDEX IF NOT EXISTS idx_param_base_param_id ON param(base_param_id)",
        "CREATE INDEX IF NOT EXISTS idx_param_author_id ON param(author_id)",
        "CREATE INDEX IF NOT EXISTS idx_param_group_id ON param(group_id)",
        "CREATE INDEX IF NOT EXISTS idx_param_type ON param(type)",
        
        # Test case indexes
        "CREATE INDEX IF NOT EXISTS idx_testcase_public_id ON testcase(public_id)",
        "CREATE INDEX IF NOT EXISTS idx_testcase_workspace_id ON testcase(workspace_id)",
        
        # Asset indexes
        "CREATE INDEX IF NOT EXISTS idx_asset_public_id ON asset(public_id)",
        "CREATE INDEX IF NOT EXISTS idx_asset_workspace_id ON asset(workspace_id)",
        "CREATE INDEX IF NOT EXISTS idx_asset_creator_id ON asset(creator_id)",
        "CREATE INDEX IF NOT EXISTS idx_asset_file_type ON asset(file_type)",
        
        # Release indexes
        "CREATE INDEX IF NOT EXISTS idx_release_public_id ON release(public_id)",
        "CREATE INDEX IF NOT EXISTS idx_release_module_id ON release(module_id)",
        "CREATE INDEX IF NOT EXISTS idx_release_draft ON release(draft)",
        
        # Junction table indexes
        "CREATE INDEX IF NOT EXISTS idx_org_membership_org_user ON organization_membership(organization_id, user_id)",
        "CREATE INDEX IF NOT EXISTS idx_org_workspace_org_ws ON organization_workspace(organization_id, workspace_id)",
        "CREATE INDEX IF NOT EXISTS idx_req_param_req_param ON requirement_parameters(req_id, param_id)",
        "CREATE INDEX IF NOT EXISTS idx_req_tag_req_tag ON requirement_tags(req_id, tag_id)",
        "CREATE INDEX IF NOT EXISTS idx_mod_req_mod_req ON module_requirements(module_id, req_id)",
        "CREATE INDEX IF NOT EXISTS idx_mod_param_mod_param ON module_parameters(module_id, param_id)"
    ]
    
    for index_sql in indexes:
        await conn.execute(text(index_sql))
    
    logger.info("Database indexes created successfully")


async def _create_public_id_sequences(conn):
    """Create sequences for public ID generation (workspace-scoped)"""
    
    logger.info("Creating public ID sequences...")
    
    # We'll create sequences dynamically when workspaces are created
    # This function creates the base template for sequence creation
    
    sequence_template = """
    CREATE OR REPLACE FUNCTION create_workspace_sequences(ws_id INTEGER)
    RETURNS VOID AS $$
    BEGIN
        EXECUTE format('CREATE SEQUENCE IF NOT EXISTS ws_%s_req_seq START 1', ws_id);
        EXECUTE format('CREATE SEQUENCE IF NOT EXISTS ws_%s_testcase_seq START 1', ws_id);
        EXECUTE format('CREATE SEQUENCE IF NOT EXISTS ws_%s_release_seq START 1', ws_id);
        EXECUTE format('CREATE SEQUENCE IF NOT EXISTS ws_%s_asset_seq START 1', ws_id);
    END;
    $$ LANGUAGE plpgsql;
    """
    
    await conn.execute(text(sequence_template))
    logger.info("Public ID sequence creation function created")


async def _create_public_id_functions(conn):
    """Create functions and triggers for automatic public ID generation"""
    
    logger.info("Creating public ID generation functions...")
    
    # Function to generate public IDs
    public_id_function = """
    CREATE OR REPLACE FUNCTION generate_public_id(
        workspace_id INTEGER,
        prefix TEXT
    ) RETURNS TEXT AS $$
    DECLARE
        sequence_name TEXT;
        next_val INTEGER;
        public_id TEXT;
    BEGIN
        sequence_name := format('ws_%s_%s_seq', workspace_id, lower(prefix));
        
        -- Create sequence if it doesn't exist
        EXECUTE format('CREATE SEQUENCE IF NOT EXISTS %I START 1', sequence_name);
        
        -- Get next value
        EXECUTE format('SELECT nextval(%L)', sequence_name) INTO next_val;
        
        -- Format public ID
        public_id := format('%s-%s', prefix, next_val);
        
        RETURN public_id;
    END;
    $$ LANGUAGE plpgsql;
    """
    
    await conn.execute(text(public_id_function))
    
    # Trigger function for requirements
    req_trigger_function = """
    CREATE OR REPLACE FUNCTION set_req_public_id()
    RETURNS TRIGGER AS $$
    DECLARE
        ws_id INTEGER;
    BEGIN
        -- Get workspace_id from req_collection
        SELECT rt.workspace_id INTO ws_id 
        FROM req_collection rt 
        WHERE rt.id = NEW.req_collection_id;
        
        -- Set public_id if not already set
        IF NEW.public_id IS NULL OR NEW.public_id = '' THEN
            NEW.public_id := generate_public_id(ws_id, 'REQ');
        END IF;
        
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
    """
    
    await conn.execute(text(req_trigger_function))
    
    # Create trigger for requirements
    await conn.execute(text("DROP TRIGGER IF EXISTS trigger_set_req_public_id ON req"))
    req_trigger = """
    CREATE TRIGGER trigger_set_req_public_id
        BEFORE INSERT ON req
        FOR EACH ROW
        EXECUTE FUNCTION set_req_public_id()
    """
    await conn.execute(text(req_trigger))
    
    # Trigger function for test cases
    testcase_trigger_function = """
    CREATE OR REPLACE FUNCTION set_testcase_public_id()
    RETURNS TRIGGER AS $$
    BEGIN
        -- Set public_id if not already set
        IF NEW.public_id IS NULL OR NEW.public_id = '' THEN
            NEW.public_id := generate_public_id(NEW.workspace_id, 'TEST');
        END IF;
        
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
    """
    
    await conn.execute(text(testcase_trigger_function))
    
    # Create trigger for test cases
    await conn.execute(text("DROP TRIGGER IF EXISTS trigger_set_testcase_public_id ON testcase"))
    testcase_trigger = """
    CREATE TRIGGER trigger_set_testcase_public_id
        BEFORE INSERT ON testcase
        FOR EACH ROW
        EXECUTE FUNCTION set_testcase_public_id()
    """
    await conn.execute(text(testcase_trigger))
    
    # Trigger function for assets
    asset_trigger_function = """
    CREATE OR REPLACE FUNCTION set_asset_public_id()
    RETURNS TRIGGER AS $$
    BEGIN
        -- Set public_id if not already set
        IF NEW.public_id IS NULL OR NEW.public_id = '' THEN
            NEW.public_id := generate_public_id(NEW.workspace_id, 'ASSET');
        END IF;
        
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
    """
    
    await conn.execute(text(asset_trigger_function))
    
    # Create trigger for assets
    await conn.execute(text("DROP TRIGGER IF EXISTS trigger_set_asset_public_id ON asset"))
    asset_trigger = """
    CREATE TRIGGER trigger_set_asset_public_id
        BEFORE INSERT ON asset
        FOR EACH ROW
        EXECUTE FUNCTION set_asset_public_id()
    """
    await conn.execute(text(asset_trigger))
    
    # Trigger function for releases
    release_trigger_function = """
    CREATE OR REPLACE FUNCTION set_release_public_id()
    RETURNS TRIGGER AS $$
    DECLARE
        ws_id INTEGER;
    BEGIN
        -- Get workspace_id from module
        SELECT m.workspace_id INTO ws_id 
        FROM module m 
        WHERE m.id = NEW.module_id;
        
        -- Set public_id if not already set
        IF NEW.public_id IS NULL OR NEW.public_id = '' THEN
            NEW.public_id := generate_public_id(ws_id, 'REL');
        END IF;
        
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
    """
    
    await conn.execute(text(release_trigger_function))
    
    # Create trigger for releases
    await conn.execute(text("DROP TRIGGER IF EXISTS trigger_set_release_public_id ON release"))
    release_trigger = """
    CREATE TRIGGER trigger_set_release_public_id
        BEFORE INSERT ON release
        FOR EACH ROW
        EXECUTE FUNCTION set_release_public_id()
    """
    await conn.execute(text(release_trigger))
    
    logger.info("Public ID generation functions and triggers created successfully")


async def create_workspace_sequences(workspace_id: int):
    """Create sequences for a specific workspace (called when workspace is created)"""
    if async_session_factory is None:
        raise RuntimeError("Database not initialized")
    
    async with async_session_factory() as session:
        await session.execute(
            text("SELECT create_workspace_sequences(:ws_id)"),
            {"ws_id": workspace_id}
        )
        await session.commit()
        
    logger.info("Created sequences for workspace", workspace_id=workspace_id)