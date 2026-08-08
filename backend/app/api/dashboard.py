"""Public and role-scoped dashboard endpoints."""

from datetime import date
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dashboard_schemas import DashboardResponse
from app.models import User
from app.services.dashboard import DashboardFilters, build_dashboard
from app.services.security import CurrentUser

router = APIRouter(prefix="/api/v1/dashboard", tags=["dashboard"])


def dashboard_filters(
    date_from: Annotated[date | None, Query(description="Inclusive ISO 8601 start date")] = None,
    date_to: Annotated[date | None, Query(description="Inclusive ISO 8601 end date")] = None,
    category: Annotated[
        Literal["water", "waste", "heat", "environmental_pollution"] | None,
        Query(),
    ] = None,
    status: Annotated[
        Literal["pending", "validated", "observed", "rejected"] | None,
        Query(),
    ] = None,
    provenance: Annotated[
        Literal["public_real", "controlled_test", "synthetic_demo"] | None,
        Query(),
    ] = None,
    risk_level: Annotated[
        Literal["low", "moderate", "high", "critical"] | None,
        Query(),
    ] = None,
    territory_id: Annotated[int | None, Query(ge=1)] = None,
    search: Annotated[str | None, Query(min_length=1, max_length=80)] = None,
) -> DashboardFilters:
    if date_from and date_to and date_from > date_to:
        raise HTTPException(status_code=422, detail="date_from must be on or before date_to.")
    return DashboardFilters(
        date_from=date_from,
        date_to=date_to,
        category=category,
        status=status,
        provenance=provenance,
        risk_level=risk_level,
        territory_id=territory_id,
        search=search,
    )


@router.get(
    "/public",
    response_model=DashboardResponse,
    summary="Aggregated public dashboard",
    description=(
        "Returns filter-consistent aggregate indicators and trends without actors, evidence, "
        "comments, credentials, or other internal fields."
    ),
)
def public_dashboard(
    filters: Annotated[DashboardFilters, Depends(dashboard_filters)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    return build_dashboard(db, filters)


@router.get(
    "/internal",
    response_model=DashboardResponse,
    summary="Role-scoped internal dashboard",
)
def internal_dashboard(
    filters: Annotated[DashboardFilters, Depends(dashboard_filters)],
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    return build_dashboard(db, filters, user=current_user)


@router.get(
    "/trends",
    response_model=DashboardResponse,
    summary="Filter-consistent dashboard trends",
)
def dashboard_trends(
    filters: Annotated[DashboardFilters, Depends(dashboard_filters)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    return build_dashboard(db, filters)
