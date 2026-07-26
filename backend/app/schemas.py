from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


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


class ObservationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    territory_id: int
    category: str
    description: str
    hazard: int
    exposure: int
    vulnerability: int
    latitude: float
    longitude: float
    observed_at: datetime
    status: str
    is_synthetic: bool


class ObservationCreate(BaseModel):
    project_id: int
    territory_id: int
    category: str = Field(min_length=2, max_length=80)
    description: str = Field(min_length=5)
    hazard: int = Field(ge=1, le=4)
    exposure: int = Field(ge=1, le=4)
    vulnerability: int = Field(ge=1, le=4)
    latitude: float
    longitude: float
    is_synthetic: bool = True


class DashboardSummary(BaseModel):
    projects: int
    territories: int
    observations: int
    synthetic_observations: int
    latest_risk_level: str | None
    latest_climate_source: str | None
