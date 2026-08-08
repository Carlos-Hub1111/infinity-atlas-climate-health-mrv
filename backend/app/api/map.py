"""Public-safe and authenticated territorial map endpoints."""

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.dashboard import dashboard_filters
from app.core.database import get_db
from app.map_schemas import MapResponse
from app.services.dashboard import DashboardFilters
from app.services.map_data import build_map
from app.services.security import CurrentUser

router = APIRouter(prefix="/api/v1/map", tags=["map"])


@router.get(
    "/observations",
    response_model=MapResponse,
    summary="Public geoprivacy-aware observation map",
    description=(
        "Returns safe map fields only. Coordinates are transformed according to each "
        "observation's public location mode. Actors, comments, evidence, and credentials "
        "are never included."
    ),
)
def public_observation_map(
    filters: Annotated[DashboardFilters, Depends(dashboard_filters)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    return build_map(db, filters, public=True)


@router.get(
    "/internal",
    response_model=MapResponse,
    summary="Role-scoped internal observation map",
)
def internal_observation_map(
    filters: Annotated[DashboardFilters, Depends(dashboard_filters)],
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    return build_map(db, filters, user=current_user, public=False)
