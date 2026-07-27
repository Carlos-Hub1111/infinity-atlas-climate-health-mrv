from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.core.config import settings
from app.core.database import engine, get_db
from app.models import Base, ClimateData, Evidence, Observation, Project, RiskScore, Territory
from app.schemas import (
    ClimateCurrentRead,
    DashboardSummary,
    EntityMetadata,
    HealthResponse,
    ObservationCreate,
    ObservationRead,
    ProjectRead,
    TerritoryRead,
)
from app.seed import seed_demo_data
from app.services.climate import ClimateProviderError, OpenMeteoClient
from app.services.climate_data import ClimateResult, get_current_climate

app = FastAPI(
    title=settings.app_name,
    version="0.2.2-sprint-1a-brand",
    description=(
        "Sprint 1A API for public climate conditions and traceable territorial observations. "
        "No child-identifying, clinical or confidential information is accepted."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5173",
        "http://localhost:5173",
        "http://127.0.0.1:5174",
        "http://localhost:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_climate_client() -> OpenMeteoClient:
    return OpenMeteoClient(timeout_seconds=settings.climate_api_timeout_seconds)


@app.on_event("startup")
def startup() -> None:
    if settings.auto_create_tables:
        Base.metadata.create_all(bind=engine)
    if settings.auto_seed_demo_data and settings.admin_seed_endpoint_enabled:
        seed_demo_data()


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    database = "sqlite" if settings.database_url.startswith("sqlite") else "postgresql"
    return HealthResponse(status="ok", app=settings.app_name, environment=settings.app_env, database=database)


@app.get("/api/v1/metadata/entities", response_model=list[EntityMetadata])
def entities() -> list[EntityMetadata]:
    return [
        EntityMetadata(name="User", purpose="Represents a platform actor without child-identifying data."),
        EntityMetadata(name="Role", purpose="Controls access boundaries for future role-based access."),
        EntityMetadata(name="Project", purpose="Groups territories, indicators and MRV activity."),
        EntityMetadata(name="Territory", purpose="Stores configurable geographic scope."),
        EntityMetadata(name="Observation", purpose="Captures a traceable climate-health territorial observation."),
        EntityMetadata(name="Evidence", purpose="Links an external evidence reference without storing sensitive files."),
        EntityMetadata(name="Validation", purpose="Tracks future review status and comments."),
        EntityMetadata(name="ClimateData", purpose="Stores attributed public climate source records and timestamps."),
        EntityMetadata(name="RiskScore", purpose="Reserved for transparent Sprint 1B risk calculation output."),
    ]


@app.get("/api/v1/projects", response_model=list[ProjectRead])
def list_projects(db: Session = Depends(get_db)) -> list[Project]:
    return list(db.scalars(select(Project).order_by(Project.is_synthetic, Project.id)))


@app.get("/api/v1/territories", response_model=list[TerritoryRead])
def list_territories(db: Session = Depends(get_db)) -> list[Territory]:
    return list(db.scalars(select(Territory).order_by(Territory.is_synthetic, Territory.id)))


@app.get(
    "/api/v1/climate/current",
    response_model=ClimateCurrentRead,
    summary="Get current public climate conditions for a territory",
    description=(
        "Retrieves current model-based weather conditions from the Open-Meteo Weather Forecast API "
        "(CC BY 4.0), stores the provider URL plus observation and retrieval timestamps, and caches "
        "the result temporarily. If the provider fails, the last stored public record is returned with "
        "`is_stale=true`. WMO `weather_code` describes the modeled weather condition. The free endpoint "
        "is used only for evaluation/prototyping; funded deployment requires a suitable commercial plan, "
        "reviewed self-hosting, or an alternative provider behind the existing climate adapter."
    ),
    responses={503: {"description": "The provider failed and no stored public climate record is available."}},
)
def current_climate(
    territory_id: int,
    db: Session = Depends(get_db),
    client: OpenMeteoClient = Depends(get_climate_client),
) -> ClimateCurrentRead:
    territory = db.get(Territory, territory_id)
    if territory is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Territory not found.")

    try:
        result = get_current_climate(
            db=db,
            territory=territory,
            client=client,
            cache_ttl_seconds=settings.climate_cache_ttl_seconds,
        )
    except ClimateProviderError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Climate source is temporarily unavailable; observation entry remains available.",
        ) from exc

    return _climate_response(result, territory)


def _climate_response(result: ClimateResult, territory: Territory) -> ClimateCurrentRead:
    record = result.record
    if (
        record.source_url is None
        or record.temperature_c is None
        or record.humidity_percent is None
        or record.apparent_temperature_c is None
        or record.precipitation_mm is None
        or record.weather_code is None
    ):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Stored climate data is incomplete; observation entry remains available.",
        )

    return ClimateCurrentRead(
        territory=TerritoryRead.model_validate(territory),
        source_name=record.source_name,
        source_url=record.source_url,
        observed_at=record.observed_at,
        retrieved_at=record.retrieved_at,
        temperature_c=record.temperature_c,
        relative_humidity_percent=record.humidity_percent,
        apparent_temperature_c=record.apparent_temperature_c,
        precipitation_mm=record.precipitation_mm,
        weather_code=record.weather_code,
        data_provenance=record.data_provenance,
        is_synthetic=record.is_synthetic,
        is_stale=result.is_stale,
    )


@app.get("/api/v1/observations", response_model=list[ObservationRead])
def list_observations(db: Session = Depends(get_db)) -> list[Observation]:
    statement = (
        select(Observation)
        .options(selectinload(Observation.evidence_items))
        .order_by(Observation.id.desc())
    )
    return list(db.scalars(statement))


@app.post(
    "/api/v1/observations",
    response_model=ObservationRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a pending territorial observation with an external evidence reference",
)
def create_observation(payload: ObservationCreate, db: Session = Depends(get_db)) -> Observation:
    project = db.get(Project, payload.project_id)
    territory = db.get(Territory, payload.territory_id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")
    if territory is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Territory not found.")
    if territory.project_id != project.id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="The selected territory does not belong to the selected project.",
        )

    is_synthetic = payload.data_provenance == "synthetic_demo"
    observation = Observation(
        project_id=payload.project_id,
        territory_id=payload.territory_id,
        category=payload.category,
        description=payload.description,
        hazard=payload.hazard,
        exposure=payload.exposure,
        vulnerability=payload.vulnerability,
        latitude=payload.latitude,
        longitude=payload.longitude,
        observed_at=payload.observed_at,
        source_name=payload.source_name,
        responsible_role=payload.responsible_role,
        data_provenance=payload.data_provenance,
        synthetic_confirmed=payload.synthetic_confirmation,
        status="pending",
        is_synthetic=is_synthetic,
    )
    db.add(observation)
    db.flush()

    db.add(
        Evidence(
            observation_id=observation.id,
            evidence_type=payload.evidence.evidence_type,
            uri=str(payload.evidence.uri),
            description=payload.evidence.description,
            source_name=payload.evidence.source_name,
            observed_at=payload.evidence.observed_at,
            data_provenance=payload.data_provenance,
            is_synthetic=is_synthetic,
        )
    )
    db.commit()

    statement = (
        select(Observation)
        .where(Observation.id == observation.id)
        .options(selectinload(Observation.evidence_items))
    )
    return db.scalar(statement)


@app.get("/api/v1/dashboard/summary", response_model=DashboardSummary)
def dashboard_summary(db: Session = Depends(get_db)) -> DashboardSummary:
    latest_risk = db.scalar(select(RiskScore).order_by(RiskScore.id.desc()).limit(1))
    latest_climate = db.scalar(select(ClimateData).order_by(ClimateData.id.desc()).limit(1))
    synthetic_observations = (
        db.scalar(select(func.count()).select_from(Observation).where(Observation.is_synthetic.is_(True))) or 0
    )
    return DashboardSummary(
        projects=db.scalar(select(func.count()).select_from(Project)) or 0,
        territories=db.scalar(select(func.count()).select_from(Territory)) or 0,
        observations=db.scalar(select(func.count()).select_from(Observation)) or 0,
        synthetic_observations=synthetic_observations,
        latest_risk_level=latest_risk.risk_level if latest_risk else None,
        latest_climate_source=latest_climate.source_name if latest_climate else None,
    )


@app.post("/api/v1/admin/seed", include_in_schema=settings.admin_seed_endpoint_enabled)
def seed() -> dict[str, int | bool]:
    if not settings.admin_seed_endpoint_enabled:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Seed endpoint is disabled outside local development.",
        )
    return seed_demo_data()
