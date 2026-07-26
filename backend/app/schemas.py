from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator, model_validator

DataProvenance = Literal["public_real", "controlled_test", "synthetic_demo"]
ObservationCategory = Literal["water", "waste", "heat", "environmental_pollution"]


def _ensure_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


class HealthResponse(BaseModel):
    status: str
    app: str
    environment: str
    database: str


class EntityMetadata(BaseModel):
    name: str
    purpose: str


class ProjectRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None
    status: str
    is_synthetic: bool


class TerritoryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    name: str
    country: str
    province: str | None
    latitude: float
    longitude: float
    is_synthetic: bool


class EvidenceCreate(BaseModel):
    evidence_type: Literal["url", "photo_reference", "document_reference"]
    uri: HttpUrl
    description: str = Field(min_length=3, max_length=255)
    source_name: str = Field(min_length=2, max_length=160)
    observed_at: datetime

    @field_validator("observed_at")
    @classmethod
    def require_timezone(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("Evidence timestamp must include a timezone.")
        return value.astimezone(timezone.utc)


class EvidenceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    evidence_type: str
    uri: str
    description: str | None
    source_name: str
    observed_at: datetime
    data_provenance: DataProvenance
    is_synthetic: bool

    @field_validator("observed_at", mode="before")
    @classmethod
    def normalize_timestamp(cls, value: datetime) -> datetime:
        return _ensure_utc(value)


class ObservationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    territory_id: int
    category: ObservationCategory
    description: str
    hazard: int
    exposure: int
    vulnerability: int
    latitude: float
    longitude: float
    observed_at: datetime
    created_at: datetime
    source_name: str
    responsible_role: str
    data_provenance: DataProvenance
    synthetic_confirmed: bool
    status: str
    is_synthetic: bool
    evidence_items: list[EvidenceRead]

    @field_validator("observed_at", "created_at", mode="before")
    @classmethod
    def normalize_timestamps(cls, value: datetime) -> datetime:
        return _ensure_utc(value)


class ObservationCreate(BaseModel):
    project_id: int
    territory_id: int
    category: ObservationCategory
    description: str = Field(min_length=5, max_length=2000)
    hazard: int = Field(ge=1, le=4)
    exposure: int = Field(ge=1, le=4)
    vulnerability: int = Field(ge=1, le=4)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    observed_at: datetime
    source_name: str = Field(min_length=2, max_length=160)
    responsible_role: str = Field(min_length=2, max_length=160)
    data_provenance: DataProvenance
    synthetic_confirmation: bool = False
    evidence: EvidenceCreate

    @field_validator("observed_at")
    @classmethod
    def normalize_observation_timestamp(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("Observation timestamp must include a timezone.")
        return value.astimezone(timezone.utc)

    @model_validator(mode="after")
    def validate_provenance(self) -> "ObservationCreate":
        if self.data_provenance == "synthetic_demo" and not self.synthetic_confirmation:
            raise ValueError("Synthetic demo observations require explicit confirmation.")
        return self


class ClimateCurrentRead(BaseModel):
    territory: TerritoryRead
    source_name: str
    source_url: str
    observed_at: datetime
    retrieved_at: datetime
    temperature_c: float
    relative_humidity_percent: float
    apparent_temperature_c: float
    precipitation_mm: float
    weather_code: int
    data_provenance: DataProvenance
    is_synthetic: bool
    is_stale: bool

    @field_validator("observed_at", "retrieved_at", mode="before")
    @classmethod
    def normalize_timestamps(cls, value: datetime) -> datetime:
        return _ensure_utc(value)


class DashboardSummary(BaseModel):
    projects: int
    territories: int
    observations: int
    synthetic_observations: int
    latest_risk_level: str | None
    latest_climate_source: str | None
