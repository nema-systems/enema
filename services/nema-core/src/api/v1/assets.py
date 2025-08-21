"""Assets API endpoints with file upload"""

from fastapi import APIRouter, HTTPException, Depends, status, Query, File, UploadFile, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from typing import List, Optional
from pydantic import BaseModel
import structlog
import os
import uuid
from pathlib import Path

from ...database.connection import get_db
from ...database.models import Asset, User as DBUser
from ...auth.routes import get_current_user
from ...auth.models import User
from .workspaces import validate_workspace_access

logger = structlog.get_logger(__name__)

router = APIRouter()

# Configuration
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB
ALLOWED_EXTENSIONS = {
    # Images
    ".jpg", ".jpeg", ".png", ".gif", ".svg", ".webp",
    # Documents
    ".pdf", ".doc", ".docx", ".txt", ".md", ".rtf",
    # Archives
    ".zip", ".tar", ".gz", ".7z",
    # Data
    ".json", ".xml", ".csv", ".xlsx", ".xls",
    # Code
    ".py", ".js", ".html", ".css", ".sql"
}


# Pydantic models
class AssetUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class AssetResponse(BaseModel):
    id: int
    workspace_id: int
    creator_id: Optional[int]
    name: str
    public_id: str
    file_path: str
    file_type: str
    description: Optional[str]
    created_at: str
    
    class Config:
        from_attributes = True


class PaginatedAssetResponse(BaseModel):
    success: bool
    data: dict
    meta: dict


class AssetDetailResponse(BaseModel):
    success: bool
    data: AssetResponse
    meta: dict


# Helper functions
async def get_asset_in_workspace(
    workspace_id: int, 
    asset_id: int, 
    db: AsyncSession
) -> Asset:
    """Get asset ensuring it belongs to the workspace"""
    query = select(Asset).where(
        and_(
            Asset.id == asset_id,
            Asset.workspace_id == workspace_id
        )
    )
    result = await db.execute(query)
    asset = result.scalar_one_or_none()
    
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset not found in this workspace"
        )
    
    return asset


async def get_user_by_clerk_id(clerk_user_id: str, db: AsyncSession) -> DBUser:
    """Get or create user by Clerk ID"""
    query = select(DBUser).where(DBUser.clerk_user_id == clerk_user_id)
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    
    if not user:
        user = DBUser(
            clerk_user_id=clerk_user_id,
            email="",
        )
        db.add(user)
        await db.flush()
    
    return user


def validate_file(file: UploadFile) -> None:
    """Validate uploaded file"""
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No filename provided"
        )
    
    # Check file extension
    file_extension = Path(file.filename).suffix.lower()
    if file_extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type {file_extension} not allowed. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    # Check file size (this is checked during upload, but we can set a limit)
    if hasattr(file, 'size') and file.size and file.size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Maximum size: {MAX_FILE_SIZE // (1024*1024)}MB"
        )


async def save_uploaded_file(file: UploadFile, workspace_id: int) -> tuple[str, str]:
    """Save uploaded file and return file path and file type"""
    validate_file(file)
    
    # Generate unique filename
    file_extension = Path(file.filename).suffix.lower()
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    
    # Create workspace-specific upload directory
    workspace_dir = UPLOAD_DIR / f"workspace_{workspace_id}"
    workspace_dir.mkdir(exist_ok=True)
    
    # Save file
    file_path = workspace_dir / unique_filename
    
    try:
        content = await file.read()
        
        # Check actual file size
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File too large. Maximum size: {MAX_FILE_SIZE // (1024*1024)}MB"
            )
        
        with open(file_path, "wb") as f:
            f.write(content)
        
        # Return relative path for database storage
        relative_path = str(file_path.relative_to(UPLOAD_DIR))
        return relative_path, file.content_type or "application/octet-stream"
        
    except Exception as e:
        # Clean up file if saving failed
        if file_path.exists():
            file_path.unlink()
        logger.error("Failed to save uploaded file", error=str(e), filename=file.filename)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save uploaded file"
        )


@router.get("/", response_model=PaginatedAssetResponse)
async def list_assets(
    workspace_id: int,
    # Pagination
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    # Filtering
    file_type: Optional[str] = Query(None),
    creator_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    # Sorting
    sort: str = Query("created_at"),
    order: str = Query("desc"),
    # Dependencies
    workspace = Depends(validate_workspace_access),
    db: AsyncSession = Depends(get_db)
):
    """List assets in workspace with filtering and pagination"""
    
    # Build base query
    query = select(Asset).where(Asset.workspace_id == workspace_id)
    
    # Apply filters
    if file_type:
        query = query.where(Asset.file_type.ilike(f"%{file_type}%"))
    
    if creator_id:
        query = query.where(Asset.creator_id == creator_id)
    
    if search:
        query = query.where(
            Asset.name.ilike(f"%{search}%") | 
            Asset.description.ilike(f"%{search}%")
        )
    
    # Apply sorting
    if order == "desc":
        if sort == "created_at":
            query = query.order_by(Asset.created_at.desc())
        elif sort == "name":
            query = query.order_by(Asset.name.desc())
        else:
            query = query.order_by(Asset.created_at.desc())
    else:
        if sort == "created_at":
            query = query.order_by(Asset.created_at.asc())
        elif sort == "name":
            query = query.order_by(Asset.name.asc())
        else:
            query = query.order_by(Asset.created_at.asc())
    
    # Count total for pagination
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # Apply pagination
    offset = (page - 1) * limit
    query = query.offset(offset).limit(limit)
    
    result = await db.execute(query)
    assets = result.scalars().all()
    
    asset_list = [
        AssetResponse(
            id=asset.id,
            workspace_id=asset.workspace_id,
            creator_id=asset.creator_id,
            name=asset.name,
            public_id=asset.public_id,
            file_path=asset.file_path,
            file_type=asset.file_type,
            description=asset.description,
            created_at=asset.created_at.isoformat()
        ) for asset in assets
    ]
    
    total_pages = (total + limit - 1) // limit
    
    return PaginatedAssetResponse(
        success=True,
        data={
            "items": asset_list,
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


@router.post("/", response_model=AssetDetailResponse, status_code=status.HTTP_201_CREATED)
async def upload_asset(
    workspace_id: int,
    file: UploadFile = File(...),
    name: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    workspace = Depends(validate_workspace_access),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Upload new asset file"""
    
    # Get or create user
    db_user = await get_user_by_clerk_id(current_user.clerk_user_id or current_user.username, db)
    
    # Save uploaded file
    file_path, file_type = await save_uploaded_file(file, workspace_id)
    
    # Use provided name or original filename
    asset_name = name or file.filename or "Unnamed Asset"
    
    # Create asset record (public_id will be auto-generated by trigger)
    new_asset = Asset(
        workspace_id=workspace_id,
        creator_id=db_user.id,
        name=asset_name,
        file_path=file_path,
        file_type=file_type,
        description=description
    )
    
    db.add(new_asset)
    
    try:
        await db.commit()
        await db.refresh(new_asset)
    except Exception as e:
        # Clean up uploaded file if database operation failed
        full_file_path = UPLOAD_DIR / file_path
        if full_file_path.exists():
            full_file_path.unlink()
        logger.error("Failed to create asset record", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create asset record"
        )
    
    logger.info("Asset uploaded", 
                asset_id=new_asset.id, 
                public_id=new_asset.public_id,
                filename=file.filename,
                workspace_id=workspace_id)
    
    asset_response = AssetResponse(
        id=new_asset.id,
        workspace_id=new_asset.workspace_id,
        creator_id=new_asset.creator_id,
        name=new_asset.name,
        public_id=new_asset.public_id,
        file_path=new_asset.file_path,
        file_type=new_asset.file_type,
        description=new_asset.description,
        created_at=new_asset.created_at.isoformat()
    )
    
    return AssetDetailResponse(
        success=True,
        data=asset_response,
        meta={
            "timestamp": "2024-01-01T12:00:00Z",
            "requestId": "req_123456"
        }
    )


@router.get("/{asset_id}", response_model=AssetDetailResponse)
async def get_asset(
    workspace_id: int,
    asset_id: int,
    workspace = Depends(validate_workspace_access),
    db: AsyncSession = Depends(get_db)
):
    """Get asset details"""
    
    asset = await get_asset_in_workspace(workspace_id, asset_id, db)
    
    asset_response = AssetResponse(
        id=asset.id,
        workspace_id=asset.workspace_id,
        creator_id=asset.creator_id,
        name=asset.name,
        public_id=asset.public_id,
        file_path=asset.file_path,
        file_type=asset.file_type,
        description=asset.description,
        created_at=asset.created_at.isoformat()
    )
    
    return AssetDetailResponse(
        success=True,
        data=asset_response,
        meta={
            "timestamp": "2024-01-01T12:00:00Z",
            "requestId": "req_123456"
        }
    )


@router.put("/{asset_id}", response_model=AssetDetailResponse)
async def update_asset(
    workspace_id: int,
    asset_id: int,
    asset_data: AssetUpdate,
    workspace = Depends(validate_workspace_access),
    db: AsyncSession = Depends(get_db)
):
    """Update asset metadata (name and description only)"""
    
    asset = await get_asset_in_workspace(workspace_id, asset_id, db)
    
    # Update fields if provided
    if asset_data.name is not None:
        asset.name = asset_data.name
    if asset_data.description is not None:
        asset.description = asset_data.description
    
    await db.commit()
    await db.refresh(asset)
    
    logger.info("Asset updated", 
                asset_id=asset.id,
                public_id=asset.public_id,
                workspace_id=workspace_id)
    
    asset_response = AssetResponse(
        id=asset.id,
        workspace_id=asset.workspace_id,
        creator_id=asset.creator_id,
        name=asset.name,
        public_id=asset.public_id,
        file_path=asset.file_path,
        file_type=asset.file_type,
        description=asset.description,
        created_at=asset.created_at.isoformat()
    )
    
    return AssetDetailResponse(
        success=True,
        data=asset_response,
        meta={
            "timestamp": "2024-01-01T12:00:00Z",
            "requestId": "req_123456"
        }
    )


@router.delete("/{asset_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_asset(
    workspace_id: int,
    asset_id: int,
    workspace = Depends(validate_workspace_access),
    db: AsyncSession = Depends(get_db)
):
    """Delete asset and associated file"""
    
    asset = await get_asset_in_workspace(workspace_id, asset_id, db)
    
    # Delete file from filesystem
    file_path = UPLOAD_DIR / asset.file_path
    if file_path.exists():
        try:
            file_path.unlink()
            logger.info("Asset file deleted", file_path=str(file_path))
        except Exception as e:
            logger.warning("Failed to delete asset file", file_path=str(file_path), error=str(e))
    
    # Delete database record
    await db.delete(asset)
    await db.commit()
    
    logger.info("Asset deleted", 
                asset_id=asset_id,
                public_id=asset.public_id,
                workspace_id=workspace_id)


@router.get("/{asset_id}/download")
async def download_asset(
    workspace_id: int,
    asset_id: int,
    workspace = Depends(validate_workspace_access),
    db: AsyncSession = Depends(get_db)
):
    """Download asset file"""
    from fastapi.responses import FileResponse
    
    asset = await get_asset_in_workspace(workspace_id, asset_id, db)
    
    file_path = UPLOAD_DIR / asset.file_path
    
    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset file not found on disk"
        )
    
    # Return file for download
    return FileResponse(
        path=file_path,
        media_type=asset.file_type,
        filename=asset.name
    )