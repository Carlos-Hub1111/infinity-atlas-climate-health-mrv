from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import engine, get_db
from app.models import Base, ClimateData, Observation, Project, RiskScore, Territory
from app.schemas import (
    DashboardSummary,
    EntityMetadata,
    HealthResponse,
    ObservationCreate,
    ObservationRead,
    ProjectRead,
    TerritoryRead,
)
from app.seed import seed_demo_data
from app.services.risk import calculate_risk

app = FastAPI(title=settings.app_name, version="0.1.0-sprint-0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup() -> None:
    if settings.auto_create_tables:
        Base.metadata.create_all(bind=engine)
    if settings.auto_seed_demo_data:
        seed_demo_data()


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    database = "sqlite" if settings.database_url.startswith("sqlite") else "postgresql"
    return HealthResponse(status="ok", app=settings.app_name, environment=settings.app_env, database=database)


@app.get("/api/v1/metadata/entities", response_model=list[EntityMetadata])
def entities() -> list[EntityMetadata]:
    return [
        EntityMetadata(name="User", purpose="Represents a platform actor without child-identifying data."),
        EntityMetadata(name="Role", purpose="Controls access boundaries for Sprint 0 and future RBAC."),
        EntityMetadata(name="Project", purpose="Groups territories, indicators and MRV activity."),
        EntityMetadata(name="Territory", purpose="Stores configurable geographic scope."),
        EntityMetadata(name="Observation", purpose="Captures a climate-health risk observation."),
        EntityMetadata(name="Evidence", purpose="Links proof to an observation without sensitive files in code."),
        EntityMetadata(name="Validation", purpose="Tracks review status and comments."),
        EntityMetadata(name="ClimateData", purpose="Stores public climate or environmental source records."),
        EntityMetadata(name="RiskScore", purpose="Stores transparent risk calculation output."),
    ]


@app.get("/api/v1/projects", response_model=list[ProjectRead])
def list_projects(db: Session = Depends(get_db)) -> list[Project]:
    return list(db.scalars(select(Project).order_by(Project.id)))


@app.get("/api/v1/territories", response_model=list[TerritoryRead])
def list_territories(db: Session = Depends(get_db)) -> list[Territory]:
    return list(db.scalars(select(Territory).order_by(Territory.id)))


@app.get("/api/v1/observations", response_model=list[ObservationRead])
def list_observations(db: Session = Depends(get_db)) -> list[Observation]:
    return list(db.scalars(select(Observation).order_by(Observation.id)))


@app.post("/api/v1/observations", response_model=ObservationRead)
def create_observation(payload: ObservationCreate, db: Session = Depends(get_db)) -> Observation:
    observation = Observation(**payload.model_dump(), status="pending")
    db.add(observation)
    db.flush()
    score, level = calculate_risk(observation.hazard, observation.exposure, observation.vulnerability)
    db.add(
        RiskScore(
            observation_id=observation.id,
            risk_score=score,
            risk_level=level,
            confidence_score=40,
            formula_version="sprint-0-simple-sum-v1",
        )
    )
    db.commit()
    db.refresh(observation)
    return observation


@app.get("/api/v1/dashboard/summary", response_model=DashboardSummary)
def dashboard_summary(db: Session = Depends(get_db)) -> DashboardSummary:
    latest_risk = db.scalar(select(RiskScore).order_by(RiskScore.id.desc()).limit(1))
    latest_climate = db.scalar(select(ClimateData).order_by(ClimateData.id.desc()).limit(1))
    synthetic_observations = db.scalar(select(func.count()).select_from(Observation).where(Observation.is_synthetic.is_(True))) or 0
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
