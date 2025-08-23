"""Database models for Nema Requirement Management System"""

from sqlalchemy import (
    Column, String, Text, DateTime, Integer, ForeignKey, Boolean, JSON, DECIMAL
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship, declarative_base
from datetime import datetime
import uuid

Base = declarative_base()


class Workspace(Base):
    """Workspace model"""
    __tablename__ = "workspace"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    meta_data = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    products = relationship("Product", back_populates="workspace")
    req_collections = relationship("ReqCollection", back_populates="workspace")
    modules = relationship("Module", back_populates="workspace")
    test_cases = relationship("TestCase", back_populates="workspace")
    tags = relationship("Tag", back_populates="workspace")
    groups = relationship("Group", back_populates="workspace")
    assets = relationship("Asset", back_populates="workspace")
    
    # Organization access
    organization_workspaces = relationship("OrganizationWorkspace", back_populates="workspace")


class User(Base):
    """User model for Clerk integration"""
    __tablename__ = "user"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    clerk_user_id = Column(String(255), unique=True, nullable=False, index=True)
    email = Column(String(255), nullable=True)
    first_name = Column(String(255))
    last_name = Column(String(255))
    image_url = Column(String(512))
    deleted = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    authored_reqs = relationship("Req", foreign_keys="[Req.author_id]", back_populates="author")
    owned_reqs = relationship("Req", foreign_keys="[Req.owner_id]", back_populates="owner")
    authored_params = relationship("Param", back_populates="author")
    comments = relationship("Comment", back_populates="user")
    executed_test_runs = relationship("TestRun", back_populates="executor")
    created_assets = relationship("Asset", back_populates="creator")
    
    # Organization membership
    organization_memberships = relationship("OrganizationMembership", back_populates="user")


class Organization(Base):
    """Organization model for Clerk integration"""
    __tablename__ = "organization"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    clerk_org_id = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=True)  # Display name from Clerk
    slug = Column(String(255), unique=True, nullable=False)
    image_url = Column(String(512))
    deleted = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    memberships = relationship("OrganizationMembership", back_populates="organization")
    workspaces = relationship("OrganizationWorkspace", back_populates="organization")


class Product(Base):
    """Product model"""
    __tablename__ = "product"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    workspace_id = Column(Integer, ForeignKey("workspace.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    meta_data = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    workspace = relationship("Workspace", back_populates="products")
    product_modules = relationship("ProductModule", back_populates="product")


class ReqCollection(Base):
    """Requirement Collection model"""
    __tablename__ = "req_collection"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    workspace_id = Column(Integer, ForeignKey("workspace.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    meta_data = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    workspace = relationship("Workspace", back_populates="req_collections")
    modules = relationship("Module", back_populates="req_collection")
    reqs = relationship("Req", back_populates="req_collection")


class Module(Base):
    """Module model"""
    __tablename__ = "module"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    workspace_id = Column(Integer, ForeignKey("workspace.id", ondelete="CASCADE"), nullable=False)
    req_collection_id = Column(Integer, ForeignKey("req_collection.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    rules = Column(Text)
    shared = Column(Boolean, default=False)
    meta_data = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    workspace = relationship("Workspace", back_populates="modules")
    req_collection = relationship("ReqCollection", back_populates="modules")
    product_modules = relationship("ProductModule", back_populates="module")
    module_requirements = relationship("ModuleRequirement", back_populates="module")
    module_parameters = relationship("ModuleParameter", back_populates="module")
    releases = relationship("Release", back_populates="module")


class Req(Base):
    """Requirement model with version support"""
    __tablename__ = "req"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    base_req_id = Column(Integer, ForeignKey("req.id"))
    parent_req_id = Column(Integer, ForeignKey("req.id"))
    prev_version = Column(Integer, ForeignKey("req.id"))
    req_collection_id = Column(Integer, ForeignKey("req_collection.id", ondelete="CASCADE"), nullable=False)
    author_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    owner_id = Column(Integer, ForeignKey("user.id"))
    public_id = Column(String(50), nullable=False)
    name = Column(String(255), nullable=False)
    definition = Column(Text, nullable=False)
    version_number = Column(Integer, nullable=False, default=1)
    level = Column(String(50), nullable=False)
    priority = Column(String(50), nullable=False)
    functional = Column(String(50), nullable=False)
    validation_method = Column(String(50), nullable=False)
    status = Column(String(50), nullable=False)
    rationale = Column(Text)
    notes = Column(Text)
    meta_data = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    req_collection = relationship("ReqCollection", back_populates="reqs")
    author = relationship("User", foreign_keys=[author_id], back_populates="authored_reqs")
    owner = relationship("User", foreign_keys=[owner_id], back_populates="owned_reqs")
    parent_req = relationship("Req", remote_side=[id], foreign_keys=[parent_req_id])
    previous_version = relationship("Req", remote_side=[id], foreign_keys=[prev_version])
    base_requirement = relationship("Req", remote_side=[id], foreign_keys=[base_req_id])
    comments = relationship("Comment", back_populates="req")
    
    # Junction table relationships
    requirement_parameters = relationship("RequirementParameter", back_populates="req")
    requirement_tags = relationship("RequirementTag", back_populates="req")
    requirement_groups = relationship("RequirementGroup", back_populates="req")
    requirement_releases = relationship("RequirementRelease", back_populates="req")
    module_requirements = relationship("ModuleRequirement", back_populates="req")
    testcase_requirements = relationship("TestcaseRequirement", back_populates="req")


class Param(Base):
    """Parameter model with version support"""
    __tablename__ = "param"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    base_param_id = Column(Integer, ForeignKey("param.id"))
    prev_version = Column(Integer, ForeignKey("param.id"))
    author_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    name = Column(String(255), nullable=False)
    type = Column(String(50), nullable=False)
    description = Column(Text)
    value = Column(JSON)
    group_id = Column(String(100), nullable=False)
    version_number = Column(Integer, nullable=False, default=1)
    meta_data = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    author = relationship("User", back_populates="authored_params")
    previous_version = relationship("Param", remote_side=[id], foreign_keys=[prev_version])
    base_parameter = relationship("Param", remote_side=[id], foreign_keys=[base_param_id])
    
    # Junction table relationships
    requirement_parameters = relationship("RequirementParameter", back_populates="param")
    parameter_tags = relationship("ParameterTag", back_populates="param")
    parameter_releases = relationship("ParameterRelease", back_populates="param")
    module_parameters = relationship("ModuleParameter", back_populates="param")
    testcase_parameters = relationship("TestcaseParameter", back_populates="param")


class Tag(Base):
    """Tag model"""
    __tablename__ = "tag"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    workspace_id = Column(Integer, ForeignKey("workspace.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    color = Column(String(7))  # Hex color code
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    workspace = relationship("Workspace", back_populates="tags")
    requirement_tags = relationship("RequirementTag", back_populates="tag")
    parameter_tags = relationship("ParameterTag", back_populates="tag")
    testcase_tags = relationship("TestcaseTag", back_populates="tag")


class Group(Base):
    """Group model"""
    __tablename__ = "group"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    workspace_id = Column(Integer, ForeignKey("workspace.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    workspace = relationship("Workspace", back_populates="groups")
    requirement_groups = relationship("RequirementGroup", back_populates="group")
    testcase_groups = relationship("TestcaseGroup", back_populates="group")


class TestCase(Base):
    """Test Case model"""
    __tablename__ = "testcase"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    workspace_id = Column(Integer, ForeignKey("workspace.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    public_id = Column(String(50), nullable=False)
    test_method = Column(String(100), nullable=False)
    expected_results = Column(Text, nullable=False)
    execution_mode = Column(String(50), nullable=False)
    notes = Column(Text)
    meta_data = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    workspace = relationship("Workspace", back_populates="test_cases")
    test_runs = relationship("TestRun", back_populates="test_case")
    
    # Junction table relationships
    testcase_requirements = relationship("TestcaseRequirement", back_populates="test_case")
    testcase_parameters = relationship("TestcaseParameter", back_populates="test_case")
    testcase_groups = relationship("TestcaseGroup", back_populates="test_case")
    testcase_tags = relationship("TestcaseTag", back_populates="test_case")


class TestRun(Base):
    """Test Run model"""
    __tablename__ = "testrun"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    test_case_id = Column(Integer, ForeignKey("testcase.id", ondelete="CASCADE"), nullable=False)
    executor_id = Column(Integer, ForeignKey("user.id"))
    result = Column(String(50), nullable=False)
    meta_data = Column(JSON)
    executed_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    test_case = relationship("TestCase", back_populates="test_runs")
    executor = relationship("User", back_populates="executed_test_runs")
    testrun_assets = relationship("TestrunAsset", back_populates="test_run")


class Asset(Base):
    """Asset model"""
    __tablename__ = "asset"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    workspace_id = Column(Integer, ForeignKey("workspace.id", ondelete="CASCADE"), nullable=False)
    creator_id = Column(Integer, ForeignKey("user.id"))
    name = Column(String(255), nullable=False)
    public_id = Column(String(50), nullable=False)
    file_path = Column(String(512), nullable=False)
    file_type = Column(String(100), nullable=False)
    description = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    workspace = relationship("Workspace", back_populates="assets")
    creator = relationship("User", back_populates="created_assets")
    testrun_assets = relationship("TestrunAsset", back_populates="asset")


class Release(Base):
    """Release model"""
    __tablename__ = "release"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    module_id = Column(Integer, ForeignKey("module.id", ondelete="CASCADE"), nullable=False)
    prev_release = Column(Integer, ForeignKey("release.id"))
    name = Column(String(255), nullable=False)
    public_id = Column(String(50), nullable=False)
    version = Column(String(50), nullable=False)
    description = Column(Text)
    draft = Column(Boolean, default=True)
    meta_data = Column(JSON)
    release_date = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    module = relationship("Module", back_populates="releases")
    previous_release = relationship("Release", remote_side=[id], foreign_keys=[prev_release])
    requirement_releases = relationship("RequirementRelease", back_populates="release")
    parameter_releases = relationship("ParameterRelease", back_populates="release")


class Comment(Base):
    """Comment model"""
    __tablename__ = "comment"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    req_id = Column(Integer, ForeignKey("req.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False)
    content = Column(Text, nullable=False)
    meta_data = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    req = relationship("Req", back_populates="comments")
    user = relationship("User", back_populates="comments")


# Junction Tables

class OrganizationMembership(Base):
    """Organization membership junction table"""
    __tablename__ = "organization_membership"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    organization_id = Column(Integer, ForeignKey("organization.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(50), nullable=False)
    deleted = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    organization = relationship("Organization", back_populates="memberships")
    user = relationship("User", back_populates="organization_memberships")


class OrganizationWorkspace(Base):
    """Organization workspace access junction table"""
    __tablename__ = "organization_workspace"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    organization_id = Column(Integer, ForeignKey("organization.id", ondelete="CASCADE"), nullable=False)
    workspace_id = Column(Integer, ForeignKey("workspace.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(50), nullable=False)
    deleted = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    organization = relationship("Organization", back_populates="workspaces")
    workspace = relationship("Workspace", back_populates="organization_workspaces")


class ProductModule(Base):
    """Product modules junction table"""
    __tablename__ = "product_modules"
    
    workspace_id = Column(Integer, ForeignKey("workspace.id", ondelete="CASCADE"), nullable=False, primary_key=True)
    product_id = Column(Integer, ForeignKey("product.id", ondelete="CASCADE"), nullable=False, primary_key=True)
    module_id = Column(Integer, ForeignKey("module.id", ondelete="CASCADE"), nullable=False, primary_key=True)
    
    # Relationships
    product = relationship("Product", back_populates="product_modules")
    module = relationship("Module", back_populates="product_modules")


class RequirementParameter(Base):
    """Requirement parameters junction table"""
    __tablename__ = "requirement_parameters"
    
    workspace_id = Column(Integer, ForeignKey("workspace.id", ondelete="CASCADE"), nullable=False, primary_key=True)
    req_id = Column(Integer, ForeignKey("req.id", ondelete="CASCADE"), nullable=False, primary_key=True)
    param_id = Column(Integer, ForeignKey("param.id", ondelete="CASCADE"), nullable=False, primary_key=True)
    
    # Relationships
    req = relationship("Req", back_populates="requirement_parameters")
    param = relationship("Param", back_populates="requirement_parameters")


class RequirementTag(Base):
    """Requirement tags junction table"""
    __tablename__ = "requirement_tags"
    
    workspace_id = Column(Integer, ForeignKey("workspace.id", ondelete="CASCADE"), nullable=False, primary_key=True)
    req_id = Column(Integer, ForeignKey("req.id", ondelete="CASCADE"), nullable=False, primary_key=True)
    tag_id = Column(Integer, ForeignKey("tag.id", ondelete="CASCADE"), nullable=False, primary_key=True)
    
    # Relationships
    req = relationship("Req", back_populates="requirement_tags")
    tag = relationship("Tag", back_populates="requirement_tags")


class ParameterTag(Base):
    """Parameter tags junction table"""
    __tablename__ = "parameter_tags"
    
    workspace_id = Column(Integer, ForeignKey("workspace.id", ondelete="CASCADE"), nullable=False, primary_key=True)
    param_id = Column(Integer, ForeignKey("param.id", ondelete="CASCADE"), nullable=False, primary_key=True)
    tag_id = Column(Integer, ForeignKey("tag.id", ondelete="CASCADE"), nullable=False, primary_key=True)
    
    # Relationships
    param = relationship("Param", back_populates="parameter_tags")
    tag = relationship("Tag", back_populates="parameter_tags")


class ModuleParameter(Base):
    """Module parameters junction table"""
    __tablename__ = "module_parameters"
    
    workspace_id = Column(Integer, ForeignKey("workspace.id", ondelete="CASCADE"), nullable=False, primary_key=True)
    module_id = Column(Integer, ForeignKey("module.id", ondelete="CASCADE"), nullable=False, primary_key=True)
    param_id = Column(Integer, ForeignKey("param.id", ondelete="CASCADE"), nullable=False, primary_key=True)
    
    # Relationships
    module = relationship("Module", back_populates="module_parameters")
    param = relationship("Param", back_populates="module_parameters")


class ModuleRequirement(Base):
    """Module requirements junction table"""
    __tablename__ = "module_requirements"
    
    workspace_id = Column(Integer, ForeignKey("workspace.id", ondelete="CASCADE"), nullable=False, primary_key=True)
    module_id = Column(Integer, ForeignKey("module.id", ondelete="CASCADE"), nullable=False, primary_key=True)
    req_id = Column(Integer, ForeignKey("req.id", ondelete="CASCADE"), nullable=False, primary_key=True)
    
    # Relationships
    module = relationship("Module", back_populates="module_requirements")
    req = relationship("Req", back_populates="module_requirements")


class TestcaseRequirement(Base):
    """Test case requirements junction table"""
    __tablename__ = "testcase_requirements"
    
    workspace_id = Column(Integer, ForeignKey("workspace.id", ondelete="CASCADE"), nullable=False, primary_key=True)
    test_case_id = Column(Integer, ForeignKey("testcase.id", ondelete="CASCADE"), nullable=False, primary_key=True)
    req_id = Column(Integer, ForeignKey("req.id", ondelete="CASCADE"), nullable=False, primary_key=True)
    
    # Relationships
    test_case = relationship("TestCase", back_populates="testcase_requirements")
    req = relationship("Req", back_populates="testcase_requirements")


class TestcaseParameter(Base):
    """Test case parameters junction table"""
    __tablename__ = "testcase_parameters"
    
    workspace_id = Column(Integer, ForeignKey("workspace.id", ondelete="CASCADE"), nullable=False, primary_key=True)
    test_case_id = Column(Integer, ForeignKey("testcase.id", ondelete="CASCADE"), nullable=False, primary_key=True)
    param_id = Column(Integer, ForeignKey("param.id", ondelete="CASCADE"), nullable=False, primary_key=True)
    
    # Relationships
    test_case = relationship("TestCase", back_populates="testcase_parameters")
    param = relationship("Param", back_populates="testcase_parameters")


class TestcaseGroup(Base):
    """Test case groups junction table"""
    __tablename__ = "testcase_groups"
    
    workspace_id = Column(Integer, ForeignKey("workspace.id", ondelete="CASCADE"), nullable=False, primary_key=True)
    test_case_id = Column(Integer, ForeignKey("testcase.id", ondelete="CASCADE"), nullable=False, primary_key=True)
    group_id = Column(Integer, ForeignKey("group.id", ondelete="CASCADE"), nullable=False, primary_key=True)
    
    # Relationships
    test_case = relationship("TestCase", back_populates="testcase_groups")
    group = relationship("Group", back_populates="testcase_groups")


class RequirementGroup(Base):
    """Requirement groups junction table"""
    __tablename__ = "requirement_groups"
    
    workspace_id = Column(Integer, ForeignKey("workspace.id", ondelete="CASCADE"), nullable=False, primary_key=True)
    req_id = Column(Integer, ForeignKey("req.id", ondelete="CASCADE"), nullable=False, primary_key=True)
    group_id = Column(Integer, ForeignKey("group.id", ondelete="CASCADE"), nullable=False, primary_key=True)
    
    # Relationships
    req = relationship("Req", back_populates="requirement_groups")
    group = relationship("Group", back_populates="requirement_groups")


class TestcaseTag(Base):
    """Test case tags junction table"""
    __tablename__ = "testcase_tags"
    
    workspace_id = Column(Integer, ForeignKey("workspace.id", ondelete="CASCADE"), nullable=False, primary_key=True)
    test_case_id = Column(Integer, ForeignKey("testcase.id", ondelete="CASCADE"), nullable=False, primary_key=True)
    tag_id = Column(Integer, ForeignKey("tag.id", ondelete="CASCADE"), nullable=False, primary_key=True)
    
    # Relationships
    test_case = relationship("TestCase", back_populates="testcase_tags")
    tag = relationship("Tag", back_populates="testcase_tags")


class TestrunAsset(Base):
    """Test run assets junction table"""
    __tablename__ = "testrun_assets"
    
    workspace_id = Column(Integer, ForeignKey("workspace.id", ondelete="CASCADE"), nullable=False, primary_key=True)
    test_run_id = Column(Integer, ForeignKey("testrun.id", ondelete="CASCADE"), nullable=False, primary_key=True)
    asset_id = Column(Integer, ForeignKey("asset.id", ondelete="CASCADE"), nullable=False, primary_key=True)
    
    # Relationships
    test_run = relationship("TestRun", back_populates="testrun_assets")
    asset = relationship("Asset", back_populates="testrun_assets")


class RequirementRelease(Base):
    """Requirement releases junction table"""
    __tablename__ = "requirement_releases"
    
    workspace_id = Column(Integer, ForeignKey("workspace.id", ondelete="CASCADE"), nullable=False, primary_key=True)
    req_id = Column(Integer, ForeignKey("req.id", ondelete="CASCADE"), nullable=False, primary_key=True)
    release_id = Column(Integer, ForeignKey("release.id", ondelete="CASCADE"), nullable=False, primary_key=True)
    
    # Relationships
    req = relationship("Req", back_populates="requirement_releases")
    release = relationship("Release", back_populates="requirement_releases")


class ParameterRelease(Base):
    """Parameter releases junction table"""
    __tablename__ = "parameter_releases"
    
    workspace_id = Column(Integer, ForeignKey("workspace.id", ondelete="CASCADE"), nullable=False, primary_key=True)
    param_id = Column(Integer, ForeignKey("param.id", ondelete="CASCADE"), nullable=False, primary_key=True)
    release_id = Column(Integer, ForeignKey("release.id", ondelete="CASCADE"), nullable=False, primary_key=True)
    
    # Relationships
    param = relationship("Param", back_populates="parameter_releases")
    release = relationship("Release", back_populates="parameter_releases")