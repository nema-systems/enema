"""Database models for Nema Core"""

from sqlalchemy import Column, String, Text, DateTime, BigInteger, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid

from .connection import Base


class Project(Base):
    __tablename__ = "projects"
    __table_args__ = {"schema": "nema"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    tenant_id = Column(String(100), nullable=False)
    workspace_id = Column(String(100), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    artifacts = relationship("Artifact", back_populates="project")


class Artifact(Base):
    __tablename__ = "artifacts"
    __table_args__ = {"schema": "nema"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    global_id = Column(BigInteger, unique=True, nullable=False)
    project_id = Column(UUID(as_uuid=True), ForeignKey("nema.projects.id", ondelete="CASCADE"))
    name = Column(String(255), nullable=False)
    description = Column(Text)
    artifact_type = Column(String(50), nullable=False)
    status = Column(String(50), default="NEVER_RAN")
    tags = Column(JSON, default=list)
    artifact_metadata = Column("metadata", JSON, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    project = relationship("Project", back_populates="artifacts")


class Commit(Base):
    __tablename__ = "commits"
    __table_args__ = {"schema": "nema"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("nema.projects.id", ondelete="CASCADE"))
    commit_hash = Column(String(64), unique=True, nullable=False)
    message = Column(Text)
    author_email = Column(String(255))
    committed_at = Column(DateTime(timezone=True), server_default=func.now())


class Group(Base):
    __tablename__ = "groups"
    __table_args__ = {"schema": "nema"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("nema.projects.id", ondelete="CASCADE"))
    name = Column(String(255), nullable=False)
    description = Column(Text)
    parent_group_id = Column(UUID(as_uuid=True), ForeignKey("nema.groups.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())