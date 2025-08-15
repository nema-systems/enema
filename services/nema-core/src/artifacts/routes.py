"""Artifact management routes"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update, delete
from typing import List, Optional
import structlog
import uuid
import random

from ..auth.routes import get_current_user
from ..auth.models import User
from ..database.connection import get_db
from ..database.models import Artifact, Project
from .schemas import ArtifactCreate, ArtifactUpdate, ArtifactResponse, ArtifactListResponse

logger = structlog.get_logger(__name__)

artifacts_router = APIRouter()


@artifacts_router.get("/health")
async def artifacts_health():
    """Health check for artifacts service"""
    return {"service": "artifacts", "status": "healthy"}


@artifacts_router.get("/", response_model=ArtifactListResponse)
async def list_artifacts(
    project_id: Optional[str] = Query(None, description="Filter by project ID"),
    artifact_type: Optional[str] = Query(None, description="Filter by artifact type"),
    limit: int = Query(50, le=100, description="Limit number of results"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List artifacts with optional filtering"""
    logger.info("Listing artifacts", 
                user=current_user.username,
                project_id=project_id,
                artifact_type=artifact_type)
    
    # Build query
    query = select(Artifact)
    
    if project_id:
        try:
            project_uuid = uuid.UUID(project_id)
            query = query.where(Artifact.project_id == project_uuid)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid project ID format")
    
    if artifact_type:
        query = query.where(Artifact.artifact_type == artifact_type)
    
    # Get total count
    count_query = select(func.count(Artifact.id))
    if project_id:
        count_query = count_query.where(Artifact.project_id == project_uuid)
    if artifact_type:
        count_query = count_query.where(Artifact.artifact_type == artifact_type)
    
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    # Apply pagination and execute
    query = query.offset(offset).limit(limit).order_by(Artifact.created_at.desc())
    result = await db.execute(query)
    artifacts = result.scalars().all()
    
    return ArtifactListResponse(
        artifacts=[ArtifactResponse.from_db_model(artifact) for artifact in artifacts],
        total=total,
        limit=limit,
        offset=offset
    )


@artifacts_router.get("/{artifact_id}", response_model=ArtifactResponse)
async def get_artifact(
    artifact_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get specific artifact by ID"""
    logger.info("Getting artifact", 
                artifact_id=artifact_id,
                user=current_user.username)
    
    # Try to parse as global_id (integer) first, then as UUID
    artifact = None
    try:
        # Try as global_id (integer)
        global_id = int(artifact_id)
        query = select(Artifact).where(Artifact.global_id == global_id)
        result = await db.execute(query)
        artifact = result.scalar_one_or_none()
    except ValueError:
        # Try as UUID
        try:
            artifact_uuid = uuid.UUID(artifact_id)
            query = select(Artifact).where(Artifact.id == artifact_uuid)
            result = await db.execute(query)
            artifact = result.scalar_one_or_none()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid artifact ID format")
    
    if not artifact:
        raise HTTPException(status_code=404, detail="Artifact not found")
    
    return ArtifactResponse.from_db_model(artifact)


@artifacts_router.post("/", response_model=ArtifactResponse)
async def create_artifact(
    artifact_data: ArtifactCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create new artifact"""
    # For development: Allow all authenticated users to create artifacts
    # In production, uncomment the permission check below:
    # if not current_user.is_editor:
    #     raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    logger.info("Creating artifact", user=current_user.username, groups=current_user.groups)
    
    # Verify project exists
    try:
        project_uuid = uuid.UUID(artifact_data.project_id)
        project_query = select(Project).where(Project.id == project_uuid)
        project_result = await db.execute(project_query)
        project = project_result.scalar_one_or_none()
        
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid project ID format")
    
    # Generate unique global_id
    # In a real system, this should be more sophisticated (e.g., sequence, atomic counter)
    global_id = random.randint(1000000, 9999999)
    
    # Create new artifact
    new_artifact = Artifact(
        global_id=global_id,
        project_id=project_uuid,
        name=artifact_data.name,
        description=artifact_data.description,
        artifact_type=artifact_data.artifact_type,
        tags=artifact_data.tags or [],
        artifact_metadata=artifact_data.metadata or {}
    )
    
    db.add(new_artifact)
    await db.commit()
    await db.refresh(new_artifact)
    
    logger.info("Artifact created successfully", 
                artifact_id=str(new_artifact.id),
                global_id=new_artifact.global_id)
    
    return ArtifactResponse.from_db_model(new_artifact)


@artifacts_router.put("/{artifact_id}")
async def update_artifact(
    artifact_id: str,
    current_user: User = Depends(get_current_user)
):
    """Update existing artifact"""
    # For development: Allow all authenticated users to update artifacts
    # In production, uncomment the permission check below:
    # if not current_user.is_editor:
    #     raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    logger.info("Updating artifact", 
                artifact_id=artifact_id,
                user=current_user.username,
                groups=current_user.groups)
    
    # TODO: Implement actual artifact update
    return {
        "id": artifact_id,
        "message": "Artifact updated successfully"
    }


@artifacts_router.delete("/{artifact_id}")
async def delete_artifact(
    artifact_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete artifact"""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin privileges required")
    
    logger.info("Deleting artifact", 
                artifact_id=artifact_id,
                user=current_user.username)
    
    # TODO: Implement actual artifact deletion
    return {"message": "Artifact deleted successfully"}