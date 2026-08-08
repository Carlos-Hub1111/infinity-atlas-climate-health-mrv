"""Public-safe and role-scoped territorial map contracts."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.dashboard_schemas import DashboardTerritory


class MapObservation(BaseModel):
    id: int
    record_title: str
    category: Literal["water", "waste", "heat", "environmental_pollution"]
    status: Literal["pending", "validated", "observed", "rejected"]
    risk_score: int | None = Field(default=None, ge=3, le=12)
    risk_level: Literal["low", "moderate", "high", "critical"] | None
    data_provenance: Literal["public_real", "controlled_test", "synthetic_demo"]
    observed_at: datetime
    latitude: float | None
    longitude: float | None
    location_mode: Literal["exact", "approximate", "hidden", "aggregate"]
    is_publicly_mappable: bool
    public_notice: str


class MapResponse(BaseModel):
    scope: Literal["public", "admin", "monitor", "validator"]
    generated_at: datetime
    territory: DashboardTerritory | None
    active_filter_count: int
    observations: list[MapObservation]
    attribution: str
    privacy_notice: str
