"""Parameters API endpoints"""

from fastapi import APIRouter, HTTPException, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from typing import List, Optional, Any
from pydantic import BaseModel
import structlog

from ...database.connection import get_db
from ...database.models import Param, User as DBUser, Module, Tag
from ...auth.routes import get_current_user
from ...auth.models import User
from .workspaces import validate_workspace_access

logger = structlog.get_logger(__name__)

router = APIRouter()


# Pydantic models
class ParameterCreate(BaseModel):
    name: str
    type: str  # string, number, boolean, array, object
    description: Optional[str] = None
    value: Optional[Any] = None
    group_id: str
    metadata: Optional[dict] = None


class ParameterUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    description: Optional[str] = None
    value: Optional[Any] = None
    group_id: Optional[str] = None
    metadata: Optional[dict] = None


class ParameterVersionCreate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    description: Optional[str] = None
    value: Optional[Any] = None
    group_id: Optional[str] = None
    metadata: Optional[dict] = None


class ParameterResponse(BaseModel):
    id: int
    base_param_id: Optional[int]
    prev_version: Optional[int]
    author_id: int
    name: str
    type: str
    description: Optional[str]
    value: Optional[Any]
    group_id: str
    version_number: int
    metadata: Optional[dict]
    created_at: str
    
    class Config:
        from_attributes = True


class PaginatedParameterResponse(BaseModel):
    success: bool
    data: dict
    meta: dict


class ParameterDetailResponse(BaseModel):
    success: bool
    data: ParameterResponse
    meta: dict


# Helper functions
async def get_parameter_accessible_from_workspace(
    workspace_id: int, 
    param_id: int, 
    db: AsyncSession
) -> Param:
    """Get parameter ensuring it's accessible from the workspace"""
    # Parameters can be accessed from any workspace through component/requirement associations
    # For now, we'll validate that the parameter exists
    query = select(Param).where(Param.id == param_id)
    result = await db.execute(query)
    parameter = result.scalar_one_or_none()
    
    if not parameter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Parameter not found"
        )
    
    return parameter


async def get_user_by_clerk_id(clerk_user_id: str, db: AsyncSession) -> DBUser:
    """Get or create user by Clerk ID"""
    query = select(DBUser).where(DBUser.clerk_user_id == clerk_user_id)
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    
    if not user:
        # Create user record if it doesn't exist
        user = DBUser(
            clerk_user_id=clerk_user_id,
            email="",  # Will be updated when more info is available
        )
        db.add(user)
        await db.flush()
    
    return user


@router.get("/", response_model=PaginatedParameterResponse)
async def list_parameters(
    workspace_id: int,
    # Pagination
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    # Filtering
    module_id: Optional[int] = Query(None),
    type: Optional[str] = Query(None),
    group_id: Optional[str] = Query(None),
    author_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    # Sorting
    sort: str = Query("created_at"),
    order: str = Query("desc"),
    # Dependencies
    workspace = Depends(validate_workspace_access),
    db: AsyncSession = Depends(get_db)
):
    """List parameters accessible in workspace with filtering and pagination"""
    
    # Build base query - parameters are accessible through component associations
    query = select(Param)
    
    # Filter by component association if specified
    if module_id:
        from ...database.models import ModuleParameter
        query = query.join(ModuleParameter).join(Module).where(
            Module.workspace_id == workspace_id,
            ModuleParameter.module_id == module_id
        )
    else:
        # Show all parameters accessible through workspace modules
        from ...database.models import ModuleParameter
        query = query.join(ModuleParameter).join(Module).where(
            Module.workspace_id == workspace_id
        )
    
    # Apply additional filters
    if type:
        query = query.where(Param.type == type)
    
    if group_id:
        query = query.where(Param.group_id == group_id)
    
    if author_id:
        query = query.where(Param.author_id == author_id)
    
    if search:
        query = query.where(
            Param.name.ilike(f"%{search}%") | 
            Param.description.ilike(f"%{search}%")
        )
    
    # Apply sorting first, then handle distinct
    if order == "desc":
        if sort == "created_at":
            query = query.order_by(Param.id, Param.created_at.desc())
        elif sort == "name":
            query = query.order_by(Param.id, Param.name.desc())
        else:
            query = query.order_by(Param.id, Param.created_at.desc())
    else:
        if sort == "created_at":
            query = query.order_by(Param.id, Param.created_at.asc())
        elif sort == "name":
            query = query.order_by(Param.id, Param.name.asc())
        else:
            query = query.order_by(Param.id, Param.created_at.asc())
    
    # Remove duplicates (distinct on ID to avoid JSON field comparison issues)
    query = query.distinct(Param.id)
    
    # Count total for pagination
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # Apply pagination
    offset = (page - 1) * limit
    query = query.offset(offset).limit(limit)
    
    result = await db.execute(query)
    parameters = result.scalars().all()
    
    parameter_list = [
        ParameterResponse(
            id=param.id,
            base_param_id=param.base_param_id,
            prev_version=param.prev_version,
            author_id=param.author_id,
            name=param.name,
            type=param.type,
            description=param.description,
            value=param.value,
            group_id=param.group_id,
            version_number=param.version_number,
            metadata=param.meta_data,
            created_at=param.created_at.isoformat()
        ) for param in parameters
    ]
    
    total_pages = (total + limit - 1) // limit
    
    return PaginatedParameterResponse(
        success=True,
        data={
            "items": parameter_list,
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


@router.post("/", response_model=ParameterDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_parameter(
    workspace_id: int,
    param_data: ParameterCreate,
    workspace = Depends(validate_workspace_access),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create new parameter"""
    
    # Get or create user in local database
    db_user = await get_user_by_clerk_id(current_user.clerk_user_id or current_user.username, db)
    
    # Create parameter
    new_param = Param(
        author_id=db_user.id,
        name=param_data.name,
        type=param_data.type,
        description=param_data.description,
        value=param_data.value,
        group_id=param_data.group_id,
        version_number=1,
        meta_data=param_data.metadata
    )
    
    db.add(new_param)
    await db.flush()
    
    # Set base_param_id to self for first version
    new_param.base_param_id = new_param.id
    
    await db.commit()
    await db.refresh(new_param)
    
    logger.info("Parameter created", 
                parameter_id=new_param.id, 
                name=param_data.name,
                workspace_id=workspace_id)
    
    parameter_response = ParameterResponse(
        id=new_param.id,
        base_param_id=new_param.base_param_id,
        prev_version=new_param.prev_version,
        author_id=new_param.author_id,
        name=new_param.name,
        type=new_param.type,
        description=new_param.description,
        value=new_param.value,
        group_id=new_param.group_id,
        version_number=new_param.version_number,
        metadata=new_param.meta_data,
        created_at=new_param.created_at.isoformat()
    )
    
    return ParameterDetailResponse(
        success=True,
        data=parameter_response,
        meta={
            "timestamp": "2024-01-01T12:00:00Z",
            "requestId": "req_123456"
        }
    )


@router.get("/{param_id}", response_model=ParameterDetailResponse)
async def get_parameter(
    workspace_id: int,
    param_id: int,
    workspace = Depends(validate_workspace_access),
    db: AsyncSession = Depends(get_db)
):
    """Get parameter details"""
    
    parameter = await get_parameter_accessible_from_workspace(workspace_id, param_id, db)
    
    parameter_response = ParameterResponse(
        id=parameter.id,
        base_param_id=parameter.base_param_id,
        prev_version=parameter.prev_version,
        author_id=parameter.author_id,
        name=parameter.name,
        type=parameter.type,
        description=parameter.description,
        value=parameter.value,
        group_id=parameter.group_id,
        version_number=parameter.version_number,
        metadata=parameter.meta_data,
        created_at=parameter.created_at.isoformat()
    )
    
    return ParameterDetailResponse(
        success=True,
        data=parameter_response,
        meta={
            "timestamp": "2024-01-01T12:00:00Z",
            "requestId": "req_123456"
        }
    )


@router.put("/{param_id}", response_model=ParameterDetailResponse)
async def update_parameter(
    workspace_id: int,
    param_id: int,
    param_data: ParameterUpdate,
    workspace = Depends(validate_workspace_access),
    db: AsyncSession = Depends(get_db)
):
    """Update parameter"""
    
    parameter = await get_parameter_accessible_from_workspace(workspace_id, param_id, db)
    
    # Update fields if provided
    if param_data.name is not None:
        parameter.name = param_data.name
    if param_data.type is not None:
        parameter.type = param_data.type
    if param_data.description is not None:
        parameter.description = param_data.description
    if param_data.value is not None:
        parameter.value = param_data.value
    if param_data.group_id is not None:
        parameter.group_id = param_data.group_id
    if param_data.metadata is not None:
        parameter.meta_data = param_data.metadata
    
    await db.commit()
    await db.refresh(parameter)
    
    logger.info("Parameter updated", 
                parameter_id=parameter.id,
                workspace_id=workspace_id)
    
    parameter_response = ParameterResponse(
        id=parameter.id,
        base_param_id=parameter.base_param_id,
        prev_version=parameter.prev_version,
        author_id=parameter.author_id,
        name=parameter.name,
        type=parameter.type,
        description=parameter.description,
        value=parameter.value,
        group_id=parameter.group_id,
        version_number=parameter.version_number,
        metadata=parameter.meta_data,
        created_at=parameter.created_at.isoformat()
    )
    
    return ParameterDetailResponse(
        success=True,
        data=parameter_response,
        meta={
            "timestamp": "2024-01-01T12:00:00Z",
            "requestId": "req_123456"
        }
    )


@router.delete("/{param_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_parameter(
    workspace_id: int,
    param_id: int,
    workspace = Depends(validate_workspace_access),
    db: AsyncSession = Depends(get_db)
):
    """Delete parameter"""
    
    parameter = await get_parameter_accessible_from_workspace(workspace_id, param_id, db)
    
    await db.delete(parameter)
    await db.commit()
    
    logger.info("Parameter deleted", 
                parameter_id=param_id,
                workspace_id=workspace_id)


@router.post("/{param_id}/versions", response_model=ParameterDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_parameter_version(
    workspace_id: int,
    param_id: int,
    version_data: ParameterVersionCreate,
    workspace = Depends(validate_workspace_access),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create new version of parameter"""
    
    # Get base parameter
    base_parameter = await get_parameter_accessible_from_workspace(workspace_id, param_id, db)
    
    # Get the actual base parameter (in case param_id points to a version)
    base_param_id = base_parameter.base_param_id or base_parameter.id
    
    # Get latest version number
    latest_version_query = (
        select(Param)
        .where(Param.base_param_id == base_param_id)
        .order_by(Param.version_number.desc())
        .limit(1)
    )
    latest_result = await db.execute(latest_version_query)
    latest_version = latest_result.scalar_one()
    
    # Get or create user
    db_user = await get_user_by_clerk_id(current_user.clerk_user_id or current_user.username, db)
    
    # Create new version (inheriting from latest version, updating with new data)
    new_version = Param(
        base_param_id=base_param_id,
        prev_version=latest_version.id,
        author_id=db_user.id,
        name=version_data.name if version_data.name is not None else latest_version.name,
        type=version_data.type if version_data.type is not None else latest_version.type,
        description=version_data.description if version_data.description is not None else latest_version.description,
        value=version_data.value if version_data.value is not None else latest_version.value,
        group_id=version_data.group_id if version_data.group_id is not None else latest_version.group_id,
        meta_data=version_data.metadata if version_data.metadata is not None else latest_version.meta_data,
        version_number=latest_version.version_number + 1
    )
    
    db.add(new_version)
    await db.commit()
    await db.refresh(new_version)
    
    logger.info("Parameter version created", 
                parameter_id=new_version.id,
                base_param_id=base_param_id,
                version_number=new_version.version_number)
    
    parameter_response = ParameterResponse(
        id=new_version.id,
        base_param_id=new_version.base_param_id,
        prev_version=new_version.prev_version,
        author_id=new_version.author_id,
        name=new_version.name,
        type=new_version.type,
        description=new_version.description,
        value=new_version.value,
        group_id=new_version.group_id,
        version_number=new_version.version_number,
        metadata=new_version.meta_data,
        created_at=new_version.created_at.isoformat()
    )
    
    return ParameterDetailResponse(
        success=True,
        data=parameter_response,
        meta={
            "timestamp": "2024-01-01T12:00:00Z",
            "requestId": "req_123456"
        }
    )