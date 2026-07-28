"""UTF-8, ISO 8601 and permission-aware CSV exports."""

from datetime import datetime, timezone
import csv
from io import StringIO

from sqlalchemy.orm import Session

from app.models import User
from app.services.dashboard import DashboardFilters, filtered_observations
from app.services.map_data import build_map


def _iso_utc(value: datetime) -> str:
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc).isoformat()


def _encoded_csv(rows: list[list[str | int | float | None]]) -> bytes:
    stream = StringIO(newline="")
    writer = csv.writer(stream, lineterminator="\r\n")
    writer.writerows(rows)
    return stream.getvalue().encode("utf-8-sig")


def public_observations_csv(db: Session, filters: DashboardFilters) -> bytes:
    map_data = build_map(db, filters, public=True)
    rows: list[list[str | int | float | None]] = [
        [
            "observation_id",
            "record_title",
            "category",
            "review_status",
            "risk_score",
            "risk_level",
            "data_provenance",
            "observed_at_utc",
            "public_latitude",
            "public_longitude",
            "public_location_mode",
            "methodology_version",
            "prototype_notice",
        ]
    ]
    for item in map_data["observations"]:
        rows.append(
            [
                item["id"],
                item["record_title"],
                item["category"],
                item["status"],
                item["risk_score"],
                item["risk_level"],
                item["data_provenance"],
                _iso_utc(item["observed_at"]),
                item["latitude"],
                item["longitude"],
                item["location_mode"],
                "climate-health-risk-v0.1",
                item["public_notice"],
            ]
        )
    return _encoded_csv(rows)


def internal_observations_csv(
    db: Session,
    filters: DashboardFilters,
    *,
    user: User,
) -> bytes:
    observations, risks = filtered_observations(db, filters, user=user)
    rows: list[list[str | int | float | None]] = [
        [
            "observation_id",
            "record_title",
            "territory_id",
            "category",
            "review_status",
            "hazard",
            "exposure",
            "vulnerability",
            "risk_score",
            "risk_level",
            "data_provenance",
            "observed_at_utc",
            "latitude",
            "longitude",
            "public_location_mode",
            "source_name",
            "methodology_version",
        ]
    ]
    for observation in observations:
        risk = risks.get(observation.id)
        rows.append(
            [
                observation.id,
                observation.record_title,
                observation.territory_id,
                observation.category,
                observation.status,
                observation.hazard,
                observation.exposure,
                observation.vulnerability,
                risk.risk_score if risk else None,
                risk.risk_level if risk else None,
                observation.data_provenance,
                _iso_utc(observation.observed_at),
                observation.latitude,
                observation.longitude,
                observation.public_location_mode,
                observation.source_name,
                risk.formula_version if risk else "climate-health-risk-v0.1",
            ]
        )
    return _encoded_csv(rows)
