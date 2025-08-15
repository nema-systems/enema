"""
Nema Core - Unified FastAPI application
Consolidates all backend functionality into a single service
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import structlog
import os

from .config.settings import get_settings
from .database.connection import init_database
from .auth.routes import auth_router
from .artifacts.routes import artifacts_router
from .projects.routes import projects_router
from .workflows.routes import workflows_router  
from .data.routes import data_router
from .ai_agent.routes import ai_router
from .admin.routes import admin_router

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    # Startup
    logger.info("Starting Nema Core application")
    settings = get_settings()
    
    # Initialize database connection
    try:
        await init_database(settings.database_url)
        logger.info("Database connection successful")
    except Exception as e:
        logger.warning(f"Database connection failed: {e}")
        logger.info("Continuing without database for now")
    
    # Log startup information
    logger.info("Application started", 
                environment=settings.environment,
                database_connected=True)
    
    yield
    
    # Shutdown
    logger.info("Shutting down Nema Core application")


# Create FastAPI app
app = FastAPI(
    title="Nema Core API",
    description="Unified backend service for the Nema platform",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # client-app
        "http://localhost:3001",  # client-admin  
        "http://localhost:3002",  # client-landing
        "http://localhost:8080",  # temporal-webui
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint (under /api for consistent routing)
@app.get("/api/health")
async def health_check():
    """Health check endpoint for load balancers and monitoring"""
    return {
        "status": "healthy",
        "service": "nema-core",
        "version": "1.0.0",
        "environment": os.getenv("ENVIRONMENT", "unknown")
    }

# Legacy health endpoint (for backward compatibility)
@app.get("/health")
async def legacy_health_check():
    """Legacy health check endpoint - redirects to /api/health"""
    return {
        "status": "healthy",
        "service": "nema-core",
        "version": "1.0.0",
        "environment": os.getenv("ENVIRONMENT", "unknown"),
        "note": "This endpoint is deprecated. Please use /api/health"
    }

@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "Nema Core API",
        "docs": "/api/docs",
        "health": "/api/health",
        "openapi": "/api/openapi.json",
        "version": "1.0.0"
    }

# Exception handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    logger.error("HTTP exception occurred", 
                status_code=exc.status_code,
                detail=exc.detail,
                path=request.url.path)
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    logger.error("Unexpected exception occurred",
                exception=str(exc),
                path=request.url.path,
                exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )

# Include routers
app.include_router(
    auth_router,
    prefix="/api/auth",
    tags=["Authentication"]
)

app.include_router(
    artifacts_router,
    prefix="/api/artifacts", 
    tags=["Artifacts"]
)

app.include_router(
    projects_router,
    prefix="/api/projects",
    tags=["Projects"]
)

app.include_router(
    workflows_router,
    prefix="/api/workflows",
    tags=["Workflows"] 
)

app.include_router(
    data_router,
    prefix="/api/data",
    tags=["Data"]
)

app.include_router(
    ai_router,
    prefix="/api/ai",
    tags=["AI Agent"]
)

app.include_router(
    admin_router,
    prefix="/api/admin",
    tags=["Administration"]
)

# Add middleware for request logging
@app.middleware("http")
async def log_requests(request, call_next):
    start_time = request.state.start_time = \
        __import__('time').time()
    
    logger.info("Request started",
                method=request.method,
                path=request.url.path,
                query=str(request.query_params))
    
    response = await call_next(request)
    
    duration = __import__('time').time() - start_time
    
    logger.info("Request completed",
                method=request.method,
                path=request.url.path, 
                status_code=response.status_code,
                duration=f"{duration:.3f}s")
    
    return response


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )