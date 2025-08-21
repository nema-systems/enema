"""Main API v1 router with workspace-scoped endpoints"""

from fastapi import APIRouter

from .workspaces import router as workspaces_router
from .requirements import router as requirements_router
from .projects import router as projects_router
from .components import router as components_router
from .reqtrees import router as reqtrees_router
from .parameters import router as parameters_router
from .testcases import router as testcases_router
from .releases import router as releases_router
from .assets import router as assets_router
from .tags import router as tags_router
from .groups import router as groups_router
from .organizations import router as organizations_router

# Create main v1 router
router = APIRouter(prefix="/api/v1")

# Include workspace management endpoints
router.include_router(
    workspaces_router,
    prefix="/workspaces",
    tags=["Workspaces"]
)

# Include workspace-scoped resource endpoints
router.include_router(
    requirements_router,
    prefix="/workspaces/{workspace_id}/requirements",
    tags=["Requirements"]
)

router.include_router(
    projects_router,
    prefix="/workspaces/{workspace_id}/projects", 
    tags=["Projects"]
)

router.include_router(
    components_router,
    prefix="/workspaces/{workspace_id}/components",
    tags=["Components"]
)

router.include_router(
    reqtrees_router,
    prefix="/workspaces/{workspace_id}/reqtrees",
    tags=["Requirement Trees"]
)

router.include_router(
    parameters_router,
    prefix="/workspaces/{workspace_id}/parameters",
    tags=["Parameters"]
)

router.include_router(
    testcases_router,
    prefix="/workspaces/{workspace_id}/testcases",
    tags=["Test Cases"]
)

router.include_router(
    releases_router,
    prefix="/workspaces/{workspace_id}/releases",
    tags=["Releases"]
)

router.include_router(
    assets_router,
    prefix="/workspaces/{workspace_id}/assets",
    tags=["Assets"]
)

router.include_router(
    tags_router,
    prefix="/workspaces/{workspace_id}/tags",
    tags=["Tags"]
)

router.include_router(
    groups_router,
    prefix="/workspaces/{workspace_id}/groups", 
    tags=["Groups"]
)

# Include organizations debug endpoints (not workspace-scoped)
router.include_router(
    organizations_router,
    prefix="/organizations",
    tags=["Organizations"]
)