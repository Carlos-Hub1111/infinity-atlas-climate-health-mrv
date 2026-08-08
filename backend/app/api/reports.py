"""PDF reports and CSV exports with shared validated filters."""

from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from app.api.dashboard import dashboard_filters
from app.core.database import get_db
from app.services.dashboard import DashboardFilters
from app.services.exports import internal_observations_csv, public_observations_csv
from app.services.reporting import build_report_pdf
from app.services.security import CurrentUser

router = APIRouter(prefix="/api/v1", tags=["reports and exports"])


def _download(data: bytes, media_type: str, filename: str, report_id: str | None = None):
    headers = {"Content-Disposition": f'attachment; filename="{filename}"'}
    if report_id:
        headers["X-InfinityAtlas-Report-Id"] = report_id
    return Response(content=data, media_type=media_type, headers=headers)


@router.get("/reports/public.pdf", summary="Download public aggregate PDF")
def public_report(
    filters: Annotated[DashboardFilters, Depends(dashboard_filters)],
    db: Annotated[Session, Depends(get_db)],
    locale: Annotated[Literal["en", "es"], Query()] = "en",
):
    data, report_id = build_report_pdf(db, filters, locale=locale)
    return _download(
        data,
        "application/pdf",
        f"infinityatlas-public-{locale}.pdf",
        report_id,
    )


@router.get("/reports/internal.pdf", summary="Download authorized internal PDF")
def internal_report(
    filters: Annotated[DashboardFilters, Depends(dashboard_filters)],
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
    locale: Annotated[Literal["en", "es"], Query()] = "en",
):
    data, report_id = build_report_pdf(db, filters, locale=locale, user=current_user)
    return _download(
        data,
        "application/pdf",
        f"infinityatlas-internal-{locale}.pdf",
        report_id,
    )


@router.get("/exports/public.csv", summary="Download public-safe filtered CSV")
def public_csv(
    filters: Annotated[DashboardFilters, Depends(dashboard_filters)],
    db: Annotated[Session, Depends(get_db)],
):
    return _download(
        public_observations_csv(db, filters),
        "text/csv; charset=utf-8",
        "infinityatlas-public-observations.csv",
    )


@router.get("/exports/observations.csv", summary="Download role-scoped internal CSV")
def internal_csv(
    filters: Annotated[DashboardFilters, Depends(dashboard_filters)],
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
):
    return _download(
        internal_observations_csv(db, filters, user=current_user),
        "text/csv; charset=utf-8",
        "infinityatlas-internal-observations.csv",
    )
