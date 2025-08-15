"""Pydantic schemas for artifact management"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, List, Any
from datetime import datetime
from uuid import UUID


class ArtifactBase(BaseModel):
    name: str = Field(..., description="Artifact name")
    description: Optional[str] = Field(None, description="Artifact description")
    artifact_type: str = Field(..., description="Type of artifact (DATA, WORKFLOW, FUNCTION, etc.)")
    tags: Optional[List[str]] = Field(default_factory=list, description="Tags for categorization")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional metadata")


class ArtifactCreate(ArtifactBase):
    project_id: str = Field(..., description="Project UUID")


class ArtifactUpdate(BaseModel):
    name: Optional[str] = Field(None, description="Updated artifact name")
    description: Optional[str] = Field(None, description="Updated artifact description")
    artifact_type: Optional[str] = Field(None, description="Updated artifact type")
    status: Optional[str] = Field(None, description="Updated artifact status")
    tags: Optional[List[str]] = Field(None, description="Updated tags")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Updated metadata")


class ArtifactResponse(ArtifactBase):
    id: UUID = Field(..., description="Artifact UUID")
    global_id: int = Field(..., description="Global artifact ID")
    project_id: UUID = Field(..., description="Project UUID") 
    status: str = Field(..., description="Artifact status")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")

    class Config:
        from_attributes = True
        # Map the database field name to the response field name
        populate_by_name = True
        
    @classmethod
    def from_db_model(cls, db_model):
        """Create response from database model"""
        return cls(
            id=db_model.id,
            global_id=db_model.global_id,
            project_id=db_model.project_id,
            name=db_model.name,
            description=db_model.description,
            artifact_type=db_model.artifact_type,
            status=db_model.status,
            tags=db_model.tags,
            metadata=db_model.artifact_metadata,  # Map artifact_metadata to metadata
            created_at=db_model.created_at,
            updated_at=db_model.updated_at
        )


class ArtifactListResponse(BaseModel):
    artifacts: List[ArtifactResponse]
    total: int = Field(..., description="Total number of artifacts")
    limit: int = Field(..., description="Requested limit")
    offset: int = Field(..., description="Requested offset")