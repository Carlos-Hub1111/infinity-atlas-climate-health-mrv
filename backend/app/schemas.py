from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator, model_validator

DataProvenance = Literal["public_real", "controlled_test", "synthetic_demo"]
ObservationCategory = Literal["water", "waste", "heat", "environmental_pollution"]
ValidationStatus = Literal["validated", "observed", "rejected"]


def _ensure_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


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
    timezone: str
    is_synthetic: bool


class RoleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    full_name: str
    email: str | None
    role: RoleRead
    is_active: bool
    is_synthetic: bool


class LoginRequest(BaseModel):
    identifier: str = Field(min_length=2, max_length=160)
    password: str = Field(min_length=1, max_length=500)


class AuthResponse(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_at: datetime
    user: UserRead


class MessageResponse(BaseModel):
    message: str


class UserStatusUpdate(BaseModel):
    is_active: bool


class EvidenceCreate(BaseModel):
    evidence_type: Literal["url", "photo_reference", "document_reference"]
    uri: HttpUrl
    description: str = Field(min_length=3, max_length=255)
    source_name: str = Field(min_length=2, max_length=160)
    observed_at: datetime


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
    created_by_id: int | None
    record_title: str
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
    record_title: str = Field(min_length=1, max_length=80)
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

    @field_validator("record_title")
    @classmethod
    def normalize_record_title(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("Record title cannot be blank.")
        return normalized

    @model_validator(mode="after")
    def validate_provenance(self) -> "ObservationCreate":
        if self.data_provenance == "synthetic_demo" and not self.synthetic_confirmation:
            raise ValueError("Synthetic demo observations require explicit confirmation.")
        return self


class ObservationUpdate(BaseModel):
    record_title: str | None = Field(default=None, min_length=1, max_length=80)
    description: str | None = Field(default=None, min_length=5, max_length=2000)
    hazard: int | None = Field(default=None, ge=1, le=4)
    exposure: int | None = Field(default=None, ge=1, le=4)
    vulnerability: int | None = Field(default=None, ge=1, le=4)

    @field_validator("record_title")
    @classmethod
    def normalize_record_title(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        if not normalized:
            raise ValueError("Record title cannot be blank.")
        return normalized

    @model_validator(mode="after")
    def require_change(self) -> "ObservationUpdate":
        if not self.model_fields_set:
            raise ValueError("At least one observation field must be supplied.")
        return self


class ValidationCreate(BaseModel):
    status: ValidationStatus
    comment: str | None = Field(default=None, max_length=500)

    @model_validator(mode="after")
    def require_review_comment(self) -> "ValidationCreate":
        if self.status in {"observed", "rejected"} and not (self.comment or "").strip():
            raise ValueError("A comment is required when observing or rejecting a record.")
        return self


class ValidationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    observation_id: int
    previous_status: str
    status: str
    comment: str | None
    validated_by_id: int | None
    validated_at: datetime
    methodological_notice: str

    @field_validator("validated_at", mode="before")
    @classmethod
    def normalize_timestamp(cls, value: datetime) -> datetime:
        return _ensure_utc(value)


class RiskScoreRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    observation_id: int
    hazard: int
    exposure: int
    vulnerability: int
    risk_score: int
    risk_level: str
    data_provenance: DataProvenance
    formula_version: str
    calculated_by_id: int | None
    is_clinical_diagnosis: bool
    calculated_at: datetime
    explanation: str

    @field_validator("calculated_at", mode="before")
    @classmethod
    def normalize_timestamp(cls, value: datetime) -> datetime:
        return _ensure_utc(value)


class AuditEventRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    actor_id: int | None
    actor_role: str | None
    occurred_at: datetime
    event_type: str
    entity_type: str
    entity_id: int | None
    previous_state: str | None
    new_state: str | None
    comment: str | None
    methodology_version: str | None

    @field_validator("occurred_at", mode="before")
    @classmethod
    def normalize_timestamp(cls, value: datetime) -> datetime:
        return _ensure_utc(value)


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


class PublicSummary(BaseModel):
    territory_name: str
    timezone: str
    total_observations: int
    pending: int
    validated: int
    observed: int
    rejected: int
    public_real: int
    controlled_test: int
    synthetic_demo: int
    risk_levels: dict[str, int]
