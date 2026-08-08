from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import ClimateData, Territory
from app.services.climate import ClimateProviderError, OpenMeteoClient


@dataclass(frozen=True)
class ClimateResult:
    record: ClimateData
    is_stale: bool


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def get_current_climate(
    *,
    db: Session,
    territory: Territory,
    client: OpenMeteoClient,
    cache_ttl_seconds: int,
) -> ClimateResult:
    latest = db.scalar(
        select(ClimateData)
        .where(
            ClimateData.territory_id == territory.id,
            ClimateData.is_synthetic.is_(False),
            ClimateData.data_provenance == "public_real",
        )
        .order_by(ClimateData.retrieved_at.desc(), ClimateData.id.desc())
        .limit(1)
    )
    now = datetime.now(timezone.utc)

    if latest and now - _as_utc(latest.retrieved_at) <= timedelta(seconds=cache_ttl_seconds):
        return ClimateResult(record=latest, is_stale=False)

    try:
        reading = client.fetch_current(latitude=territory.latitude, longitude=territory.longitude)
    except ClimateProviderError:
        if latest:
            return ClimateResult(record=latest, is_stale=True)
        raise

    record = ClimateData(
        territory_id=territory.id,
        source_name=reading.source_name,
        source_url=reading.source_url,
        observed_at=reading.observed_at,
        retrieved_at=reading.retrieved_at,
        temperature_c=reading.temperature_c,
        apparent_temperature_c=reading.apparent_temperature_c,
        precipitation_mm=reading.precipitation_mm,
        humidity_percent=reading.relative_humidity_percent,
        weather_code=reading.weather_code,
        data_provenance="public_real",
        raw_payload=reading.raw_payload,
        is_synthetic=False,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return ClimateResult(record=record, is_stale=False)
