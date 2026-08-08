"""Geoprivacy-aware map data projection."""

from dataclasses import replace
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import Territory, User
from app.services.dashboard import DashboardFilters, filtered_observations


def _territory(db: Session, territory_id: int | None) -> Territory | None:
    if territory_id is not None:
        return db.get(Territory, territory_id)
    return db.scalar(
        select(Territory)
        .where(Territory.name == "San Cristobal")
        .order_by(Territory.id)
    )


def _public_coordinates(observation, territory: Territory | None) -> tuple[float | None, float | None]:
    mode = observation.public_location_mode
    if mode == "hidden":
        return None, None
    if mode == "aggregate":
        return (
            (territory or observation.territory).latitude,
            (territory or observation.territory).longitude,
        )
    if mode == "exact":
        return observation.latitude, observation.longitude
    places = max(0, min(settings.public_map_decimal_places, 6))
    return round(observation.latitude, places), round(observation.longitude, places)


def build_map(
    db: Session,
    filters: DashboardFilters,
    *,
    user: User | None = None,
    public: bool,
) -> dict:
    territory = _territory(db, filters.territory_id)
    effective_filters = (
        filters
        if filters.territory_id is not None or territory is None
        else replace(filters, territory_id=territory.id)
    )
    observations, risks = filtered_observations(db, effective_filters, user=user)
    items = []
    for observation in observations:
        if public:
            latitude, longitude = _public_coordinates(observation, territory)
        else:
            latitude, longitude = observation.latitude, observation.longitude
        risk = risks.get(observation.id)
        items.append(
            {
                "id": observation.id,
                "record_title": observation.record_title,
                "category": observation.category,
                "status": observation.status,
                "risk_score": risk.risk_score if risk else None,
                "risk_level": risk.risk_level if risk else None,
                "data_provenance": observation.data_provenance,
                "observed_at": observation.observed_at,
                "latitude": latitude,
                "longitude": longitude,
                "location_mode": observation.public_location_mode,
                "is_publicly_mappable": latitude is not None and longitude is not None,
                "public_notice": (
                    "Controlled prototype record - not a verified territorial event."
                    if observation.data_provenance != "public_real"
                    else "Public-source record with visible provenance."
                ),
            }
        )
    role_name = user.role.name if user is not None else "public"
    return {
        "scope": role_name,
        "generated_at": datetime.now(timezone.utc),
        "territory": (
            {"id": territory.id, "name": territory.name, "timezone": territory.timezone}
            if territory
            else None
        ),
        "active_filter_count": filters.active_count,
        "observations": items,
        "attribution": "Map data (c) OpenStreetMap contributors",
        "privacy_notice": (
            "Public locations follow each record's exact, approximate, aggregate, or hidden "
            "geoprivacy mode. Internal actors, comments, evidence, and credentials are excluded."
        ),
    }
