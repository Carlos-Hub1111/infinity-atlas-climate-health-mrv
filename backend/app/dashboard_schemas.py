"""Response contracts for Sprint 1C dashboard and map APIs."""

from datetime import date, datetime, timezone
from typing import Literal

from pydantic import BaseModel, Field, field_validator


class DashboardTerritory(BaseModel):
    id: int
    name: str
    timezone: str


class DashboardPeriod(BaseModel):
    start: date | None
    end: date | None


class TrendPoint(BaseModel):
    date: date
    count: int = Field(ge=0)


class DashboardResponse(BaseModel):
    scope: Literal["public", "admin", "monitor", "validator"]
    generated_at: datetime
    territory: DashboardTerritory | None
    period: DashboardPeriod
    filters: dict[str, str | int | None]
    active_filter_count: int
    total_observations: int
    status_counts: dict[str, int]
    provenance_counts: dict[str, int]
    risk_counts: dict[str, int]
    category_counts: dict[str, int]
    trends: list[TrendPoint]
    methodology_version: str
    methodological_notice: str
    role_metrics: dict[str, int | float]
    available_territories: list[DashboardTerritory]

    @field_validator("generated_at")
    @classmethod
    def normalize_generated_at(cls, value: datetime) -> datetime:
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)
