"""Requirements API endpoints"""

from fastapi import APIRouter, HTTPException, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from typing import List, Optional
from pydantic import BaseModel
import structlog

from ...database.connection import get_db
from ...database.models import Req, ReqTree, User as DBUser, Component, Tag
from ...auth.routes import get_current_user
from ...auth.models import User
from .workspaces import validate_workspace_access

logger = structlog.get_logger(__name__)

router = APIRouter()


# Pydantic models
class RequirementCreate(BaseModel):
    req_tree_id: int
    parent_req_id: Optional[int] = None
    owner_id: Optional[int] = None
    name: str
    definition: str
    level: str  # system, subsystem, component
    priority: str  # high, medium, low, critical
    functional: str  # functional, non_functional
    validation_method: str  # test, analysis, inspection, demonstration
    status: str  # draft, approved, rejected, obsolete
    rationale: Optional[str] = None
    notes: Optional[str] = None
    metadata: Optional[dict] = None


class RequirementUpdate(BaseModel):
    name: Optional[str] = None
    definition: Optional[str] = None
    level: Optional[str] = None
    priority: Optional[str] = None
    functional: Optional[str] = None
    validation_method: Optional[str] = None
    status: Optional[str] = None
    owner_id: Optional[int] = None
    rationale: Optional[str] = None
    notes: Optional[str] = None
    metadata: Optional[dict] = None


class RequirementVersionCreate(BaseModel):
    name: Optional[str] = None
    definition: Optional[str] = None
    level: Optional[str] = None
    priority: Optional[str] = None
    functional: Optional[str] = None
    validation_method: Optional[str] = None
    status: Optional[str] = None
    owner_id: Optional[int] = None
    rationale: Optional[str] = None
    notes: Optional[str] = None
    metadata: Optional[dict] = None


class RequirementResponse(BaseModel):
    id: int
    base_req_id: Optional[int]
    parent_req_id: Optional[int]
    prev_version: Optional[int]
    req_tree_id: int
    author_id: int
    owner_id: Optional[int]
    public_id: str
    name: str
    definition: str
    version_number: int
    level: str
    priority: str
    functional: str
    validation_method: str
    status: str
    rationale: Optional[str]
    notes: Optional[str]
    metadata: Optional[dict]
    created_at: str
    
    class Config:
        from_attributes = True


class PaginatedRequirementResponse(BaseModel):
    success: bool
    data: dict
    meta: dict


class RequirementDetailResponse(BaseModel):
    success: bool
    data: RequirementResponse
    meta: dict


# Helper functions
async def get_requirement_in_workspace(
    workspace_id: int, 
    req_id: int, 
    db: AsyncSession
) -> Req:
    """Get requirement ensuring it belongs to the workspace"""
    query = (
        select(Req)
        .join(ReqTree)
        .where(
            and_(
                Req.id == req_id,
                ReqTree.workspace_id == workspace_id
            )
        )
    )
    result = await db.execute(query)
    requirement = result.scalar_one_or_none()
    
    if not requirement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Requirement not found in this workspace"
        )
    
    return requirement


async def get_user_by_id(user_id: int, db: AsyncSession) -> DBUser:
    """Get user by ID"""
    query = select(DBUser).where(DBUser.id == user_id)
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found"
        )
    
    return user


@router.get("/", response_model=PaginatedRequirementResponse)
async def list_requirements(
    workspace_id: int,
    # Pagination
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    # Filtering
    component_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    level: Optional[str] = Query(None),
    tag_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    author_id: Optional[int] = Query(None),
    owner_id: Optional[int] = Query(None),
    req_tree_id: Optional[int] = Query(None),
    # Sorting
    sort: str = Query("created_at"),
    order: str = Query("desc"),
    # Dependencies
    workspace = Depends(validate_workspace_access),
    db: AsyncSession = Depends(get_db)
):
    """List requirements in workspace with filtering and pagination"""
    
    # Build base query
    query = (
        select(Req)
        .join(ReqTree)
        .where(ReqTree.workspace_id == workspace_id)
    )
    
    # Apply filters
    if component_id:
        # Filter by component association
        from ...database.models import ComponentRequirement
        query = query.join(ComponentRequirement).where(
            ComponentRequirement.component_id == component_id
        )
    
    if status:
        query = query.where(Req.status == status)
    
    if priority:
        query = query.where(Req.priority == priority)
    
    if level:
        query = query.where(Req.level == level)
    
    if author_id:
        query = query.where(Req.author_id == author_id)
    
    if owner_id:
        query = query.where(Req.owner_id == owner_id)
    
    if req_tree_id:
        query = query.where(Req.req_tree_id == req_tree_id)
    
    if tag_id:
        # Filter by tag association
        from ...database.models import RequirementTag
        query = query.join(RequirementTag).where(
            RequirementTag.tag_id == tag_id
        )
    
    if search:
        query = query.where(
            Req.name.ilike(f"%{search}%") | 
            Req.definition.ilike(f"%{search}%")
        )
    
    # Apply sorting
    if order == "desc":
        if sort == "created_at":
            query = query.order_by(Req.created_at.desc())
        elif sort == "name":
            query = query.order_by(Req.name.desc())
        else:
            query = query.order_by(Req.created_at.desc())
    else:
        if sort == "created_at":
            query = query.order_by(Req.created_at.asc())
        elif sort == "name":
            query = query.order_by(Req.name.asc())
        else:
            query = query.order_by(Req.created_at.asc())
    
    # Count total for pagination
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # Apply pagination
    offset = (page - 1) * limit
    query = query.offset(offset).limit(limit)
    
    result = await db.execute(query)
    requirements = result.scalars().all()
    
    requirement_list = [
        RequirementResponse(
            id=req.id,
            base_req_id=req.base_req_id,
            parent_req_id=req.parent_req_id,
            prev_version=req.prev_version,
            req_tree_id=req.req_tree_id,
            author_id=req.author_id,
            owner_id=req.owner_id,
            public_id=req.public_id,
            name=req.name,
            definition=req.definition,
            version_number=req.version_number,
            level=req.level,
            priority=req.priority,
            functional=req.functional,
            validation_method=req.validation_method,
            status=req.status,
            rationale=req.rationale,
            notes=req.notes,
            metadata=req.metadata,
            created_at=req.created_at.isoformat()
        ) for req in requirements
    ]
    
    total_pages = (total + limit - 1) // limit
    
    return PaginatedRequirementResponse(
        success=True,
        data={
            "items": requirement_list,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "totalPages": total_pages,
                "hasNext": page < total_pages,
                "hasPrev": page > 1
            }
        },
        meta={
            "timestamp": "2024-01-01T12:00:00Z",
            "requestId": "req_123456"
        }
    )


@router.post("/", response_model=RequirementDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_requirement(
    workspace_id: int,
    req_data: RequirementCreate,
    workspace = Depends(validate_workspace_access),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create new requirement"""
    
    # Validate req_tree belongs to workspace
    req_tree_query = select(ReqTree).where(
        and_(
            ReqTree.id == req_data.req_tree_id,
            ReqTree.workspace_id == workspace_id
        )
    )
    req_tree_result = await db.execute(req_tree_query)
    req_tree = req_tree_result.scalar_one_or_none()
    
    if not req_tree:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Requirement tree not found in this workspace"
        )
    
    # Get or create user in local database
    user_query = select(DBUser).where(DBUser.clerk_user_id == current_user.username)
    user_result = await db.execute(user_query)
    db_user = user_result.scalar_one_or_none()
    
    if not db_user:
        # Create user record
        db_user = DBUser(
            clerk_user_id=current_user.username,
            email=current_user.email or "",
            first_name=current_user.given_name,
            last_name=current_user.family_name
        )
        db.add(db_user)
        await db.flush()
    
    # Validate parent requirement if specified
    if req_data.parent_req_id:
        parent_req = await get_requirement_in_workspace(
            workspace_id, req_data.parent_req_id, db
        )
    
    # Validate owner if specified
    if req_data.owner_id:
        await get_user_by_id(req_data.owner_id, db)
    
    # Create requirement (public_id will be auto-generated by trigger)
    new_req = Req(
        req_tree_id=req_data.req_tree_id,
        parent_req_id=req_data.parent_req_id,
        author_id=db_user.id,
        owner_id=req_data.owner_id or db_user.id,
        name=req_data.name,
        definition=req_data.definition,
        level=req_data.level,
        priority=req_data.priority,
        functional=req_data.functional,
        validation_method=req_data.validation_method,
        status=req_data.status,
        rationale=req_data.rationale,
        notes=req_data.notes,
        metadata=req_data.metadata,
        version_number=1
    )
    
    db.add(new_req)
    await db.flush()
    
    # Set base_req_id to self for first version
    new_req.base_req_id = new_req.id
    
    await db.commit()
    await db.refresh(new_req)
    
    logger.info("Requirement created", 
                requirement_id=new_req.id, 
                public_id=new_req.public_id,
                workspace_id=workspace_id)
    
    requirement_response = RequirementResponse(
        id=new_req.id,
        base_req_id=new_req.base_req_id,
        parent_req_id=new_req.parent_req_id,
        prev_version=new_req.prev_version,
        req_tree_id=new_req.req_tree_id,
        author_id=new_req.author_id,
        owner_id=new_req.owner_id,
        public_id=new_req.public_id,
        name=new_req.name,
        definition=new_req.definition,
        version_number=new_req.version_number,
        level=new_req.level,
        priority=new_req.priority,
        functional=new_req.functional,
        validation_method=new_req.validation_method,
        status=new_req.status,
        rationale=new_req.rationale,
        notes=new_req.notes,
        metadata=new_req.metadata,
        created_at=new_req.created_at.isoformat()
    )
    
    return RequirementDetailResponse(
        success=True,
        data=requirement_response,
        meta={
            "timestamp": "2024-01-01T12:00:00Z",
            "requestId": "req_123456"
        }
    )


@router.get("/{req_id}", response_model=RequirementDetailResponse)
async def get_requirement(
    workspace_id: int,
    req_id: int,
    workspace = Depends(validate_workspace_access),
    db: AsyncSession = Depends(get_db)
):
    """Get requirement details"""
    
    requirement = await get_requirement_in_workspace(workspace_id, req_id, db)
    
    requirement_response = RequirementResponse(
        id=requirement.id,
        base_req_id=requirement.base_req_id,
        parent_req_id=requirement.parent_req_id,
        prev_version=requirement.prev_version,
        req_tree_id=requirement.req_tree_id,
        author_id=requirement.author_id,
        owner_id=requirement.owner_id,
        public_id=requirement.public_id,
        name=requirement.name,
        definition=requirement.definition,
        version_number=requirement.version_number,
        level=requirement.level,
        priority=requirement.priority,
        functional=requirement.functional,
        validation_method=requirement.validation_method,
        status=requirement.status,
        rationale=requirement.rationale,
        notes=requirement.notes,
        metadata=requirement.metadata,
        created_at=requirement.created_at.isoformat()
    )
    
    return RequirementDetailResponse(
        success=True,
        data=requirement_response,
        meta={
            "timestamp": "2024-01-01T12:00:00Z",
            "requestId": "req_123456"
        }
    )


@router.put("/{req_id}", response_model=RequirementDetailResponse)
async def update_requirement(
    workspace_id: int,
    req_id: int,
    req_data: RequirementUpdate,
    workspace = Depends(validate_workspace_access),
    db: AsyncSession = Depends(get_db)
):
    """Update requirement"""
    
    requirement = await get_requirement_in_workspace(workspace_id, req_id, db)
    
    # Update fields if provided
    if req_data.name is not None:
        requirement.name = req_data.name
    if req_data.definition is not None:
        requirement.definition = req_data.definition
    if req_data.level is not None:
        requirement.level = req_data.level
    if req_data.priority is not None:
        requirement.priority = req_data.priority
    if req_data.functional is not None:
        requirement.functional = req_data.functional
    if req_data.validation_method is not None:
        requirement.validation_method = req_data.validation_method
    if req_data.status is not None:
        requirement.status = req_data.status
    if req_data.owner_id is not None:
        # Validate owner exists
        await get_user_by_id(req_data.owner_id, db)
        requirement.owner_id = req_data.owner_id
    if req_data.rationale is not None:
        requirement.rationale = req_data.rationale
    if req_data.notes is not None:
        requirement.notes = req_data.notes
    if req_data.metadata is not None:
        requirement.metadata = req_data.metadata
    
    await db.commit()
    await db.refresh(requirement)
    
    logger.info("Requirement updated", 
                requirement_id=requirement.id,
                public_id=requirement.public_id)
    
    requirement_response = RequirementResponse(
        id=requirement.id,
        base_req_id=requirement.base_req_id,
        parent_req_id=requirement.parent_req_id,
        prev_version=requirement.prev_version,
        req_tree_id=requirement.req_tree_id,
        author_id=requirement.author_id,
        owner_id=requirement.owner_id,
        public_id=requirement.public_id,
        name=requirement.name,
        definition=requirement.definition,
        version_number=requirement.version_number,
        level=requirement.level,
        priority=requirement.priority,
        functional=requirement.functional,
        validation_method=requirement.validation_method,
        status=requirement.status,
        rationale=requirement.rationale,
        notes=requirement.notes,
        metadata=requirement.metadata,
        created_at=requirement.created_at.isoformat()
    )
    
    return RequirementDetailResponse(
        success=True,
        data=requirement_response,
        meta={
            "timestamp": "2024-01-01T12:00:00Z",
            "requestId": "req_123456"
        }
    )


@router.delete("/{req_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_requirement(
    workspace_id: int,
    req_id: int,
    workspace = Depends(validate_workspace_access),
    db: AsyncSession = Depends(get_db)
):
    """Delete requirement"""
    
    requirement = await get_requirement_in_workspace(workspace_id, req_id, db)
    
    await db.delete(requirement)
    await db.commit()
    
    logger.info("Requirement deleted", 
                requirement_id=req_id,
                public_id=requirement.public_id)


@router.post("/{req_id}/versions", response_model=RequirementDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_requirement_version(
    workspace_id: int,
    req_id: int,
    version_data: RequirementVersionCreate,
    workspace = Depends(validate_workspace_access),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create new version of requirement"""
    
    # Get base requirement
    base_requirement = await get_requirement_in_workspace(workspace_id, req_id, db)
    
    # Get the actual base requirement (in case req_id points to a version)
    base_req_id = base_requirement.base_req_id or base_requirement.id
    
    # Get latest version number
    latest_version_query = (
        select(Req)
        .where(Req.base_req_id == base_req_id)
        .order_by(Req.version_number.desc())
        .limit(1)
    )
    latest_result = await db.execute(latest_version_query)
    latest_version = latest_result.scalar_one()
    
    # Get or create user
    user_query = select(DBUser).where(DBUser.clerk_user_id == current_user.username)
    user_result = await db.execute(user_query)
    db_user = user_result.scalar_one_or_none()
    
    if not db_user:
        db_user = DBUser(
            clerk_user_id=current_user.username,
            email=current_user.email or "",
            first_name=current_user.given_name,
            last_name=current_user.family_name
        )
        db.add(db_user)
        await db.flush()
    
    # Create new version (inheriting from latest version, updating with new data)
    new_version = Req(
        base_req_id=base_req_id,
        prev_version=latest_version.id,
        req_tree_id=latest_version.req_tree_id,
        parent_req_id=latest_version.parent_req_id,
        author_id=db_user.id,
        owner_id=version_data.owner_id if version_data.owner_id is not None else latest_version.owner_id,
        public_id=latest_version.public_id,  # Same public ID as base
        name=version_data.name if version_data.name is not None else latest_version.name,
        definition=version_data.definition if version_data.definition is not None else latest_version.definition,
        level=version_data.level if version_data.level is not None else latest_version.level,
        priority=version_data.priority if version_data.priority is not None else latest_version.priority,
        functional=version_data.functional if version_data.functional is not None else latest_version.functional,
        validation_method=version_data.validation_method if version_data.validation_method is not None else latest_version.validation_method,
        status=version_data.status if version_data.status is not None else latest_version.status,
        rationale=version_data.rationale if version_data.rationale is not None else latest_version.rationale,
        notes=version_data.notes if version_data.notes is not None else latest_version.notes,
        metadata=version_data.metadata if version_data.metadata is not None else latest_version.metadata,
        version_number=latest_version.version_number + 1
    )
    
    db.add(new_version)
    await db.commit()
    await db.refresh(new_version)
    
    logger.info("Requirement version created", 
                requirement_id=new_version.id,
                base_req_id=base_req_id,
                version_number=new_version.version_number)
    
    requirement_response = RequirementResponse(
        id=new_version.id,
        base_req_id=new_version.base_req_id,
        parent_req_id=new_version.parent_req_id,
        prev_version=new_version.prev_version,
        req_tree_id=new_version.req_tree_id,
        author_id=new_version.author_id,
        owner_id=new_version.owner_id,
        public_id=new_version.public_id,
        name=new_version.name,
        definition=new_version.definition,
        version_number=new_version.version_number,
        level=new_version.level,
        priority=new_version.priority,
        functional=new_version.functional,
        validation_method=new_version.validation_method,
        status=new_version.status,
        rationale=new_version.rationale,
        notes=new_version.notes,
        metadata=new_version.metadata,
        created_at=new_version.created_at.isoformat()
    )
    
    return RequirementDetailResponse(
        success=True,
        data=requirement_response,
        meta={
            "timestamp": "2024-01-01T12:00:00Z",
            "requestId": "req_123456"
        }
    )