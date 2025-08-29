"""Test Cases API endpoints"""

from fastapi import APIRouter, HTTPException, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import structlog

from ...database.connection import get_db
from ...database.models import TestCase, TestRun, User as DBUser
from ...auth.routes import get_current_user
from ...auth.models import User
from .workspaces import validate_workspace_access

logger = structlog.get_logger(__name__)

router = APIRouter()


# Pydantic models
class TestCaseCreate(BaseModel):
    name: str
    test_method: str  # manual, automated, hybrid
    expected_results: str
    execution_mode: str  # interactive, batch
    notes: Optional[str] = None
    metadata: Optional[dict] = None


class TestCaseUpdate(BaseModel):
    name: Optional[str] = None
    test_method: Optional[str] = None
    expected_results: Optional[str] = None
    execution_mode: Optional[str] = None
    notes: Optional[str] = None
    metadata: Optional[dict] = None


class TestRunCreate(BaseModel):
    result: str  # passed, failed, blocked, not_applicable
    executor_id: Optional[int] = None
    executed_at: datetime
    metadata: Optional[dict] = None


class TestRunUpdate(BaseModel):
    result: Optional[str] = None
    executor_id: Optional[int] = None
    executed_at: Optional[datetime] = None
    metadata: Optional[dict] = None


class TestRunResponse(BaseModel):
    id: int
    test_case_id: int
    executor_id: Optional[int]
    result: str
    executed_at: str
    metadata: Optional[dict]
    created_at: str
    
    class Config:
        from_attributes = True


class TestCaseResponse(BaseModel):
    id: int
    workspace_id: int
    name: str
    public_id: str
    test_method: str
    expected_results: str
    execution_mode: str
    notes: Optional[str]
    metadata: Optional[dict]
    created_at: str
    
    class Config:
        from_attributes = True


class PaginatedTestCaseResponse(BaseModel):
    success: bool
    data: dict
    meta: dict


class TestCaseDetailResponse(BaseModel):
    success: bool
    data: TestCaseResponse
    meta: dict


class TestRunDetailResponse(BaseModel):
    success: bool
    data: TestRunResponse
    meta: dict


# Helper functions
async def get_testcase_in_workspace(
    workspace_id: int, 
    testcase_id: int, 
    db: AsyncSession
) -> TestCase:
    """Get test case ensuring it belongs to the workspace"""
    query = select(TestCase).where(
        and_(
            TestCase.id == testcase_id,
            TestCase.workspace_id == workspace_id
        )
    )
    result = await db.execute(query)
    testcase = result.scalar_one_or_none()
    
    if not testcase:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Test case not found in this workspace"
        )
    
    return testcase


async def get_testrun_in_workspace(
    workspace_id: int, 
    testcase_id: int, 
    run_id: int, 
    db: AsyncSession
) -> TestRun:
    """Get test run ensuring it belongs to the workspace"""
    query = (
        select(TestRun)
        .join(TestCase)
        .where(
            and_(
                TestRun.id == run_id,
                TestRun.test_case_id == testcase_id,
                TestCase.workspace_id == workspace_id
            )
        )
    )
    result = await db.execute(query)
    testrun = result.scalar_one_or_none()
    
    if not testrun:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Test run not found in this workspace"
        )
    
    return testrun


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


@router.get("/", response_model=PaginatedTestCaseResponse)
async def list_testcases(
    workspace_id: int,
    # Pagination
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    # Filtering
    product_id: Optional[int] = Query(None),  # New filter for product
    module_id: Optional[int] = Query(None),   # New filter for module
    status: Optional[str] = Query(None),
    tag_id: Optional[int] = Query(None),
    group_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    # Sorting
    sort: str = Query("created_at"),
    order: str = Query("desc"),
    # Dependencies
    workspace = Depends(validate_workspace_access),
    db: AsyncSession = Depends(get_db)
):
    """List test cases in workspace with filtering and pagination"""
    
    # Build base query
    query = select(TestCase).where(TestCase.workspace_id == workspace_id)
    
    # Apply filters
    if product_id:
        # Filter by product association - get test cases linked to requirements in modules associated with the product
        from ...database.models import TestcaseRequirement, Req, Module, ProductModule
        query = (
            query
            .join(TestcaseRequirement, TestcaseRequirement.test_case_id == TestCase.id)
            .join(Req, Req.id == TestcaseRequirement.req_id)
            .join(Module, Module.id == Req.module_id)
            .join(ProductModule, ProductModule.module_id == Module.id)
            .where(ProductModule.product_id == product_id)
        )
    elif module_id:
        # Filter by module association - get test cases linked to requirements in the specific module
        from ...database.models import TestcaseRequirement, Req
        query = (
            query
            .join(TestcaseRequirement, TestcaseRequirement.test_case_id == TestCase.id)
            .join(Req, Req.id == TestcaseRequirement.req_id)
            .where(Req.module_id == module_id)
        )
    
    if tag_id:
        from ...database.models import TestcaseTag
        query = query.join(TestcaseTag).where(
            TestcaseTag.tag_id == tag_id
        )
    
    if group_id:
        from ...database.models import TestcaseGroup
        query = query.join(TestcaseGroup).where(
            TestcaseGroup.group_id == group_id
        )
    
    if search:
        query = query.where(
            TestCase.name.ilike(f"%{search}%") | 
            TestCase.expected_results.ilike(f"%{search}%")
        )
    
    # Apply sorting
    if order == "desc":
        if sort == "created_at":
            query = query.order_by(TestCase.created_at.desc())
        elif sort == "name":
            query = query.order_by(TestCase.name.desc())
        else:
            query = query.order_by(TestCase.created_at.desc())
    else:
        if sort == "created_at":
            query = query.order_by(TestCase.created_at.asc())
        elif sort == "name":
            query = query.order_by(TestCase.name.asc())
        else:
            query = query.order_by(TestCase.created_at.asc())
    
    # Count total for pagination
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # Apply pagination
    offset = (page - 1) * limit
    query = query.offset(offset).limit(limit)
    
    result = await db.execute(query)
    testcases = result.scalars().all()
    
    testcase_list = [
        TestCaseResponse(
            id=tc.id,
            workspace_id=tc.workspace_id,
            name=tc.name,
            public_id=tc.public_id,
            test_method=tc.test_method,
            expected_results=tc.expected_results,
            execution_mode=tc.execution_mode,
            notes=tc.notes,
            metadata=tc.meta_data,
            created_at=tc.created_at.isoformat()
        ) for tc in testcases
    ]
    
    total_pages = (total + limit - 1) // limit
    
    return PaginatedTestCaseResponse(
        success=True,
        data={
            "items": testcase_list,
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


@router.post("/", response_model=TestCaseDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_testcase(
    workspace_id: int,
    testcase_data: TestCaseCreate,
    workspace = Depends(validate_workspace_access),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create new test case"""
    
    # Create test case (public_id will be auto-generated by trigger)
    new_testcase = TestCase(
        workspace_id=workspace_id,
        name=testcase_data.name,
        test_method=testcase_data.test_method,
        expected_results=testcase_data.expected_results,
        execution_mode=testcase_data.execution_mode,
        notes=testcase_data.notes,
        meta_data=testcase_data.metadata
    )
    
    db.add(new_testcase)
    await db.commit()
    await db.refresh(new_testcase)
    
    logger.info("Test case created", 
                testcase_id=new_testcase.id, 
                public_id=new_testcase.public_id,
                name=testcase_data.name,
                workspace_id=workspace_id)
    
    testcase_response = TestCaseResponse(
        id=new_testcase.id,
        workspace_id=new_testcase.workspace_id,
        name=new_testcase.name,
        public_id=new_testcase.public_id,
        test_method=new_testcase.test_method,
        expected_results=new_testcase.expected_results,
        execution_mode=new_testcase.execution_mode,
        notes=new_testcase.notes,
        metadata=new_testcase.meta_data,
        created_at=new_testcase.created_at.isoformat()
    )
    
    return TestCaseDetailResponse(
        success=True,
        data=testcase_response,
        meta={
            "timestamp": "2024-01-01T12:00:00Z",
            "requestId": "req_123456"
        }
    )


@router.get("/{testcase_id}", response_model=TestCaseDetailResponse)
async def get_testcase(
    workspace_id: int,
    testcase_id: int,
    workspace = Depends(validate_workspace_access),
    db: AsyncSession = Depends(get_db)
):
    """Get test case details"""
    
    testcase = await get_testcase_in_workspace(workspace_id, testcase_id, db)
    
    testcase_response = TestCaseResponse(
        id=testcase.id,
        workspace_id=testcase.workspace_id,
        name=testcase.name,
        public_id=testcase.public_id,
        test_method=testcase.test_method,
        expected_results=testcase.expected_results,
        execution_mode=testcase.execution_mode,
        notes=testcase.notes,
        metadata=testcase.meta_data,
        created_at=testcase.created_at.isoformat()
    )
    
    return TestCaseDetailResponse(
        success=True,
        data=testcase_response,
        meta={
            "timestamp": "2024-01-01T12:00:00Z",
            "requestId": "req_123456"
        }
    )


@router.put("/{testcase_id}", response_model=TestCaseDetailResponse)
async def update_testcase(
    workspace_id: int,
    testcase_id: int,
    testcase_data: TestCaseUpdate,
    workspace = Depends(validate_workspace_access),
    db: AsyncSession = Depends(get_db)
):
    """Update test case"""
    
    testcase = await get_testcase_in_workspace(workspace_id, testcase_id, db)
    
    # Update fields if provided
    if testcase_data.name is not None:
        testcase.name = testcase_data.name
    if testcase_data.test_method is not None:
        testcase.test_method = testcase_data.test_method
    if testcase_data.expected_results is not None:
        testcase.expected_results = testcase_data.expected_results
    if testcase_data.execution_mode is not None:
        testcase.execution_mode = testcase_data.execution_mode
    if testcase_data.notes is not None:
        testcase.notes = testcase_data.notes
    if testcase_data.metadata is not None:
        testcase.meta_data = testcase_data.metadata
    
    await db.commit()
    await db.refresh(testcase)
    
    logger.info("Test case updated", 
                testcase_id=testcase.id,
                public_id=testcase.public_id,
                workspace_id=workspace_id)
    
    testcase_response = TestCaseResponse(
        id=testcase.id,
        workspace_id=testcase.workspace_id,
        name=testcase.name,
        public_id=testcase.public_id,
        test_method=testcase.test_method,
        expected_results=testcase.expected_results,
        execution_mode=testcase.execution_mode,
        notes=testcase.notes,
        metadata=testcase.meta_data,
        created_at=testcase.created_at.isoformat()
    )
    
    return TestCaseDetailResponse(
        success=True,
        data=testcase_response,
        meta={
            "timestamp": "2024-01-01T12:00:00Z",
            "requestId": "req_123456"
        }
    )


@router.delete("/{testcase_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_testcase(
    workspace_id: int,
    testcase_id: int,
    workspace = Depends(validate_workspace_access),
    db: AsyncSession = Depends(get_db)
):
    """Delete test case"""
    
    testcase = await get_testcase_in_workspace(workspace_id, testcase_id, db)
    
    await db.delete(testcase)
    await db.commit()
    
    logger.info("Test case deleted", 
                testcase_id=testcase_id,
                public_id=testcase.public_id,
                workspace_id=workspace_id)


@router.post("/{testcase_id}/runs", response_model=TestRunDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_testrun(
    workspace_id: int,
    testcase_id: int,
    testrun_data: TestRunCreate,
    workspace = Depends(validate_workspace_access),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create test run"""
    
    # Verify test case exists in workspace
    testcase = await get_testcase_in_workspace(workspace_id, testcase_id, db)
    
    # Validate executor if specified
    executor_id = testrun_data.executor_id
    if not executor_id:
        # Use current user as executor if not specified
        db_user = await get_user_by_clerk_id(current_user.clerk_user_id or current_user.username, db)
        executor_id = db_user.id
    
    # Create test run
    new_testrun = TestRun(
        test_case_id=testcase_id,
        executor_id=executor_id,
        result=testrun_data.result,
        executed_at=testrun_data.executed_at,
        meta_data=testrun_data.metadata
    )
    
    db.add(new_testrun)
    await db.commit()
    await db.refresh(new_testrun)
    
    logger.info("Test run created", 
                testrun_id=new_testrun.id,
                testcase_id=testcase_id,
                result=testrun_data.result,
                workspace_id=workspace_id)
    
    testrun_response = TestRunResponse(
        id=new_testrun.id,
        test_case_id=new_testrun.test_case_id,
        executor_id=new_testrun.executor_id,
        result=new_testrun.result,
        executed_at=new_testrun.executed_at.isoformat(),
        metadata=new_testrun.meta_data,
        created_at=new_testrun.created_at.isoformat()
    )
    
    return TestRunDetailResponse(
        success=True,
        data=testrun_response,
        meta={
            "timestamp": "2024-01-01T12:00:00Z",
            "requestId": "req_123456"
        }
    )


@router.put("/{testcase_id}/runs/{run_id}", response_model=TestRunDetailResponse)
async def update_testrun(
    workspace_id: int,
    testcase_id: int,
    run_id: int,
    testrun_data: TestRunUpdate,
    workspace = Depends(validate_workspace_access),
    db: AsyncSession = Depends(get_db)
):
    """Update test run"""
    
    testrun = await get_testrun_in_workspace(workspace_id, testcase_id, run_id, db)
    
    # Update fields if provided
    if testrun_data.result is not None:
        testrun.result = testrun_data.result
    if testrun_data.executor_id is not None:
        testrun.executor_id = testrun_data.executor_id
    if testrun_data.executed_at is not None:
        testrun.executed_at = testrun_data.executed_at
    if testrun_data.metadata is not None:
        testrun.meta_data = testrun_data.metadata
    
    await db.commit()
    await db.refresh(testrun)
    
    logger.info("Test run updated", 
                testrun_id=testrun.id,
                testcase_id=testcase_id,
                workspace_id=workspace_id)
    
    testrun_response = TestRunResponse(
        id=testrun.id,
        test_case_id=testrun.test_case_id,
        executor_id=testrun.executor_id,
        result=testrun.result,
        executed_at=testrun.executed_at.isoformat(),
        metadata=testrun.meta_data,
        created_at=testrun.created_at.isoformat()
    )
    
    return TestRunDetailResponse(
        success=True,
        data=testrun_response,
        meta={
            "timestamp": "2024-01-01T12:00:00Z",
            "requestId": "req_123456"
        }
    )