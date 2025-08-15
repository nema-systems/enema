"""Project schemas for API requests and responses"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from uuid import UUID


class ProjectBase(BaseModel):
    """Base project model with common fields"""
    name: str = Field(..., description="Project name", max_length=255)
    description: Optional[str] = Field(None, description="Project description")
    tenant_id: str = Field(default="default", description="Tenant ID", max_length=100)
    workspace_id: str = Field(default="default", description="Workspace ID", max_length=100)


class ProjectCreate(ProjectBase):
    """Schema for creating a new project"""
    pass


class ProjectUpdate(BaseModel):
    """Schema for updating an existing project"""
    name: Optional[str] = Field(None, description="Project name", max_length=255)
    description: Optional[str] = Field(None, description="Project description")


class ProjectResponse(ProjectBase):
    """Schema for project API responses"""
    id: UUID = Field(..., description="Project UUID")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")

    class Config:
        from_attributes = True


class ProjectListResponse(BaseModel):
    """Schema for project list API response"""
    projects: list[ProjectResponse] = Field(..., description="List of projects")
    total: int = Field(..., description="Total number of projects")
    limit: int = Field(..., description="Number of items per page")
    offset: int = Field(..., description="Number of items skipped")