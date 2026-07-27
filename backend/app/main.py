from datetime import datetime, timezone
from typing import Annotated
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload, selectinload

from app.core.config import settings
from app.core.database import engine, get_db
from app.models import (
    AuditEvent,
    AuthSession,
    Base,
    Evidence,
    Observation,
    Project,
    Territory,
    User,
    Validation,
)
from app.schemas import (
    AuditEventRead,
    AuthResponse,
    ClimateCurrentRead,
    EntityMetadata,
    HealthResponse,
    LoginRequest,
    MessageResponse,
    ObservationCreate,
    ObservationRead,
    ObservationUpdate,
    ProjectRead,
    PublicSummary,
    RiskScoreRead,
    TerritoryRead,
    UserRead,
    UserStatusUpdate,
    ValidationCreate,
    ValidationRead,
)
from app.seed import seed_demo_data
from app.services.audit import record_audit_event
from app.services.climate import ClimateProviderError, OpenMeteoClient
from app.services.climate_data import ClimateResult, get_current_climate
from app.services.risk import (
    METHODOLOGY_VERSION,
    NON_CLINICAL_NOTICE,
    calculate_and_store_risk,
    latest_risk_score,
)
from app.services.security import (
    CurrentSession,
    CurrentUser,
    bearer_scheme,
    find_user_by_identifier,
    get_current_session,
    issue_access_token,
    require_roles,
    verify_password,
)

VALIDATION_NOTICE = (
    "Validation confirms record completeness and methodological review. It does not "
    "constitute a medical diagnosis or independently verify the territorial event."
)
VALID_TRANSITIONS = {
    "pending": {"validated", "observed", "rejected"},
    "observed": {"validated", "rejected"},
}

app = FastAPI(
    title=settings.app_name,
    version="0.3.0-sprint-1b",
    description=(
        "Role-protected prototype API for public climate data, territorial observations, "
        "methodological validation, transparent non-clinical risk scoring, and append-only "
        "traceability. Child-identifying, clinical, personal, or confidential data is prohibited."
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


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _territory_datetime_to_utc(value: datetime, territory: Territory) -> datetime:
    if value.tzinfo is not None and value.utcoffset() is not None:
        return value.astimezone(timezone.utc)
    try:
        territory_zone = ZoneInfo(territory.timezone)
    except ZoneInfoNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="The territory has an invalid timezone configuration.",
        ) from exc
    return value.replace(tzinfo=territory_zone).astimezone(timezone.utc)


def _observation_statement():
    return select(Observation).options(selectinload(Observation.evidence_items))


def _get_observation_or_404(db: Session, observation_id: int) -> Observation:
    observation = db.scalar(
        _observation_statement().where(Observation.id == observation_id)
    )
    if observation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Observation not found.",
        )
    return observation


def _assert_observation_read_access(user: User, observation: Observation) -> None:
    if user.role.name in {"admin", "validator"}:
        return
    if user.role.name == "monitor" and observation.created_by_id == user.id:
        return
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="You do not have permission to access this observation.",
    )


def _risk_response(risk) -> RiskScoreRead:
    return RiskScoreRead(
        id=risk.id,
        observation_id=risk.observation_id,
        hazard=risk.hazard,
        exposure=risk.exposure,
        vulnerability=risk.vulnerability,
        risk_score=risk.risk_score,
        risk_level=risk.risk_level,
        data_provenance=risk.data_provenance,
        formula_version=risk.formula_version,
        calculated_by_id=risk.calculated_by_id,
        is_clinical_diagnosis=risk.is_clinical_diagnosis,
        calculated_at=risk.calculated_at,
        explanation=(
            f"{risk.hazard} hazard + {risk.exposure} exposure + "
            f"{risk.vulnerability} vulnerability = {risk.risk_score}. "
            f"{NON_CLINICAL_NOTICE}"
        ),
    )


@app.on_event("startup")
def startup() -> None:
    if settings.auto_create_tables:
        Base.metadata.create_all(bind=engine)
    if settings.auto_seed_demo_data and settings.admin_seed_endpoint_enabled:
        seed_demo_data()


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    database = "sqlite" if settings.database_url.startswith("sqlite") else "postgresql"
    return HealthResponse(
        status="ok",
        app=settings.app_name,
        environment=settings.app_env,
        database=database,
    )


@app.post("/api/v1/auth/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: Annotated[Session, Depends(get_db)]) -> AuthResponse:
    user = find_user_by_identifier(db, payload.identifier)
    if user is None or not user.is_active or not verify_password(payload.password, user.password_hash):
        record_audit_event(
            db,
            event_type="login_failed",
            entity_type="auth",
            entity_id=user.id if user else None,
            actor=user,
            comment="Invalid credentials or inactive account.",
        )
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username/email or password.",
        )

    issued = issue_access_token(user)
    db.add(
        AuthSession(
            jti=issued.jti,
            user_id=user.id,
            expires_at=issued.expires_at,
        )
    )
    record_audit_event(
        db,
        event_type="login_success",
        entity_type="auth",
        entity_id=user.id,
        actor=user,
        new_state="active_session",
    )
    db.commit()
    return AuthResponse(
        access_token=issued.access_token,
        expires_at=issued.expires_at,
        user=UserRead.model_validate(user),
    )


@app.get("/api/v1/auth/me", response_model=UserRead)
def auth_me(current_user: CurrentUser) -> User:
    return current_user


@app.post("/api/v1/auth/logout", response_model=MessageResponse)
def logout(current: CurrentSession, db: Annotated[Session, Depends(get_db)]) -> MessageResponse:
    user, session = current
    session.revoked_at = _utc_now()
    record_audit_event(
        db,
        event_type="logout",
        entity_type="auth",
        entity_id=user.id,
        actor=user,
        previous_state="active_session",
        new_state="revoked_session",
    )
    db.commit()
    return MessageResponse(message="Session closed.")


@app.get("/api/v1/metadata/entities", response_model=list[EntityMetadata])
def entities() -> list[EntityMetadata]:
    return [
        EntityMetadata(name="User", purpose="Authenticated prototype actor without unnecessary personal data."),
        EntityMetadata(name="Role", purpose="Enforces server-side access boundaries."),
        EntityMetadata(name="Project", purpose="Groups territories and MRV activity."),
        EntityMetadata(name="Territory", purpose="Stores geographic scope and display timezone."),
        EntityMetadata(name="Observation", purpose="Captures a traceable territorial record."),
        EntityMetadata(name="Evidence", purpose="References external evidence without repository file storage."),
        EntityMetadata(name="Validation", purpose="Preserves each methodological review decision."),
        EntityMetadata(name="ClimateData", purpose="Stores attributed public climate data and timestamps."),
        EntityMetadata(name="RiskScore", purpose="Stores versioned, transparent, non-clinical calculations."),
        EntityMetadata(name="AuditEvent", purpose="Provides append-only action traceability."),
    ]


@app.get("/api/v1/projects", response_model=list[ProjectRead])
def list_projects(
    _: Annotated[User, Depends(require_roles("admin", "monitor", "validator"))],
    db: Annotated[Session, Depends(get_db)],
) -> list[Project]:
    return list(db.scalars(select(Project).order_by(Project.is_synthetic, Project.id)))


@app.get("/api/v1/territories", response_model=list[TerritoryRead])
def list_territories(
    _: Annotated[User, Depends(require_roles("admin", "monitor", "validator"))],
    db: Annotated[Session, Depends(get_db)],
) -> list[Territory]:
    return list(db.scalars(select(Territory).order_by(Territory.is_synthetic, Territory.id)))


@app.get(
    "/api/v1/climate/current",
    response_model=ClimateCurrentRead,
    summary="Get attributed current public climate conditions for a territory",
    description=(
        "Retrieves model-based weather conditions from Open-Meteo (CC BY 4.0), stores "
        "provider URL plus observation/retrieval timestamps, and returns cached or stale stored "
        "data when appropriate. The free endpoint is for prototype evaluation; funded deployment "
        "requires a suitable commercial plan, reviewed self-hosting, or replacement through the "
        "decoupled provider adapter."
    ),
)
def current_climate(
    territory_id: int,
    _: Annotated[User, Depends(require_roles("admin", "monitor", "validator"))],
    db: Annotated[Session, Depends(get_db)],
    client: Annotated[OpenMeteoClient, Depends(get_climate_client)],
) -> ClimateCurrentRead:
    territory = db.get(Territory, territory_id)
    if territory is None:
        raise HTTPException(status_code=404, detail="Territory not found.")
    try:
        result = get_current_climate(
            db=db,
            territory=territory,
            client=client,
            cache_ttl_seconds=settings.climate_cache_ttl_seconds,
        )
    except ClimateProviderError as exc:
        raise HTTPException(
            status_code=503,
            detail="Climate source is temporarily unavailable; observation entry remains available.",
        ) from exc
    return _climate_response(result, territory)


def _climate_response(result: ClimateResult, territory: Territory) -> ClimateCurrentRead:
    record = result.record
    required = (
        record.source_url,
        record.temperature_c,
        record.humidity_percent,
        record.apparent_temperature_c,
        record.precipitation_mm,
        record.weather_code,
    )
    if any(value is None for value in required):
        raise HTTPException(status_code=503, detail="Stored climate data is incomplete.")
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
def list_observations(current_user: CurrentUser, db: Annotated[Session, Depends(get_db)]):
    if current_user.role.name == "public":
        raise HTTPException(status_code=403, detail="Public users cannot access internal records.")
    statement = _observation_statement().order_by(Observation.id.desc())
    if current_user.role.name == "monitor":
        statement = statement.where(Observation.created_by_id == current_user.id)
    return list(db.scalars(statement))


@app.post("/api/v1/observations", response_model=ObservationRead, status_code=201)
def create_observation(
    payload: ObservationCreate,
    current_user: Annotated[User, Depends(require_roles("admin", "monitor"))],
    db: Annotated[Session, Depends(get_db)],
):
    project = db.get(Project, payload.project_id)
    territory = db.get(Territory, payload.territory_id)
    if project is None or territory is None:
        raise HTTPException(status_code=404, detail="Project or territory not found.")
    if territory.project_id != project.id:
        raise HTTPException(status_code=422, detail="Territory does not belong to project.")

    is_synthetic = payload.data_provenance == "synthetic_demo"
    observation = Observation(
        project_id=project.id,
        territory_id=territory.id,
        created_by_id=current_user.id,
        category=payload.category,
        description=payload.description,
        hazard=payload.hazard,
        exposure=payload.exposure,
        vulnerability=payload.vulnerability,
        latitude=payload.latitude,
        longitude=payload.longitude,
        observed_at=_territory_datetime_to_utc(payload.observed_at, territory),
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
            observed_at=_territory_datetime_to_utc(payload.evidence.observed_at, territory),
            data_provenance=payload.data_provenance,
            is_synthetic=is_synthetic,
        )
    )
    record_audit_event(
        db,
        event_type="observation_created",
        entity_type="observation",
        entity_id=observation.id,
        actor=current_user,
        new_state="pending",
        comment=f"provenance={observation.data_provenance}",
    )
    calculate_and_store_risk(db, observation, current_user)
    db.commit()
    return db.scalar(_observation_statement().where(Observation.id == observation.id))


@app.get("/api/v1/observations/{observation_id}", response_model=ObservationRead)
def get_observation(
    observation_id: int,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
):
    observation = _get_observation_or_404(db, observation_id)
    _assert_observation_read_access(current_user, observation)
    return observation


@app.patch("/api/v1/observations/{observation_id}", response_model=ObservationRead)
def update_observation(
    observation_id: int,
    payload: ObservationUpdate,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
):
    observation = _get_observation_or_404(db, observation_id)
    if current_user.role.name == "monitor":
        if observation.created_by_id != current_user.id or observation.status != "pending":
            raise HTTPException(status_code=403, detail="Monitor can update only own pending records.")
    elif current_user.role.name != "admin":
        raise HTTPException(status_code=403, detail="You cannot modify observations.")

    old_components = f"{observation.hazard}+{observation.exposure}+{observation.vulnerability}"
    component_changed = False
    for field in ("description", "hazard", "exposure", "vulnerability"):
        value = getattr(payload, field)
        if field in payload.model_fields_set and value != getattr(observation, field):
            setattr(observation, field, value)
            component_changed = component_changed or field != "description"
    record_audit_event(
        db,
        event_type="observation_updated",
        entity_type="observation",
        entity_id=observation.id,
        actor=current_user,
        previous_state=old_components,
        new_state=f"{observation.hazard}+{observation.exposure}+{observation.vulnerability}",
    )
    if component_changed:
        calculate_and_store_risk(db, observation, current_user)
    db.commit()
    return db.scalar(_observation_statement().where(Observation.id == observation.id))


@app.post(
    "/api/v1/observations/{observation_id}/validation",
    response_model=ValidationRead,
    status_code=201,
)
def validate_observation(
    observation_id: int,
    payload: ValidationCreate,
    current_user: Annotated[User, Depends(require_roles("admin", "validator"))],
    db: Annotated[Session, Depends(get_db)],
):
    observation = _get_observation_or_404(db, observation_id)
    allowed = VALID_TRANSITIONS.get(observation.status, set())
    if payload.status not in allowed:
        raise HTTPException(
            status_code=409,
            detail=f"Transition from {observation.status} to {payload.status} is not allowed.",
        )
    previous_status = observation.status
    decision = Validation(
        observation_id=observation.id,
        previous_status=previous_status,
        status=payload.status,
        comment=(payload.comment or "").strip() or None,
        validated_by_id=current_user.id,
    )
    db.add(decision)
    observation.status = payload.status
    db.flush()
    record_audit_event(
        db,
        event_type="validation_created",
        entity_type="observation",
        entity_id=observation.id,
        actor=current_user,
        previous_state=previous_status,
        new_state=payload.status,
        comment=decision.comment,
    )
    record_audit_event(
        db,
        event_type="status_changed",
        entity_type="observation",
        entity_id=observation.id,
        actor=current_user,
        previous_state=previous_status,
        new_state=payload.status,
        comment=decision.comment,
    )
    db.commit()
    return ValidationRead(
        id=decision.id,
        observation_id=decision.observation_id,
        previous_status=decision.previous_status,
        status=decision.status,
        comment=decision.comment,
        validated_by_id=decision.validated_by_id,
        validated_at=decision.validated_at,
        methodological_notice=VALIDATION_NOTICE,
    )


@app.get(
    "/api/v1/observations/{observation_id}/audit",
    response_model=list[AuditEventRead],
)
def observation_audit(
    observation_id: int,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
):
    observation = _get_observation_or_404(db, observation_id)
    _assert_observation_read_access(current_user, observation)
    return list(
        db.scalars(
            select(AuditEvent)
            .where(
                AuditEvent.entity_type == "observation",
                AuditEvent.entity_id == observation_id,
            )
            .order_by(AuditEvent.occurred_at, AuditEvent.id)
        )
    )


@app.get(
    "/api/v1/observations/{observation_id}/risk-score",
    response_model=RiskScoreRead,
)
def observation_risk_score(
    observation_id: int,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
):
    observation = _get_observation_or_404(db, observation_id)
    _assert_observation_read_access(current_user, observation)
    result = latest_risk_score(db, observation.id)
    if result is None:
        raise HTTPException(status_code=404, detail="Risk score not found.")
    return _risk_response(result)


@app.get("/api/v1/public/summary", response_model=PublicSummary)
def public_summary(db: Annotated[Session, Depends(get_db)]) -> PublicSummary:
    territory = db.scalar(
        select(Territory).where(Territory.name == "San Cristobal").order_by(Territory.id)
    )
    if territory is None:
        raise HTTPException(status_code=404, detail="Public reference territory is unavailable.")
    observations = list(
        db.scalars(select(Observation).where(Observation.territory_id == territory.id))
    )
    status_counts = {name: 0 for name in ("pending", "validated", "observed", "rejected")}
    provenance_counts = {
        name: 0 for name in ("public_real", "controlled_test", "synthetic_demo")
    }
    risk_levels = {name: 0 for name in ("low", "moderate", "high", "critical")}
    for observation in observations:
        status_counts[observation.status] = status_counts.get(observation.status, 0) + 1
        provenance_counts[observation.data_provenance] += 1
        risk = latest_risk_score(db, observation.id)
        if risk:
            risk_levels[risk.risk_level] += 1
    return PublicSummary(
        territory_name=territory.name,
        timezone=territory.timezone,
        total_observations=len(observations),
        **status_counts,
        **provenance_counts,
        risk_levels=risk_levels,
    )


@app.get("/api/v1/admin/users", response_model=list[UserRead])
def admin_users(
    _: Annotated[User, Depends(require_roles("admin"))],
    db: Annotated[Session, Depends(get_db)],
):
    return list(
        db.scalars(select(User).options(joinedload(User.role)).order_by(User.username))
    )


@app.patch("/api/v1/admin/users/{user_id}", response_model=UserRead)
def update_user_status(
    user_id: int,
    payload: UserStatusUpdate,
    current_user: Annotated[User, Depends(require_roles("admin"))],
    db: Annotated[Session, Depends(get_db)],
):
    user = db.scalar(select(User).options(joinedload(User.role)).where(User.id == user_id))
    if user is None:
        raise HTTPException(status_code=404, detail="User not found.")
    if user.id == current_user.id and not payload.is_active:
        raise HTTPException(status_code=409, detail="Administrators cannot deactivate themselves.")
    previous = str(user.is_active).lower()
    user.is_active = payload.is_active
    record_audit_event(
        db,
        event_type="user_status_changed",
        entity_type="user",
        entity_id=user.id,
        actor=current_user,
        previous_state=previous,
        new_state=str(user.is_active).lower(),
    )
    db.commit()
    return user


@app.get("/api/v1/admin/audit", response_model=list[AuditEventRead])
def admin_audit(
    _: Annotated[User, Depends(require_roles("admin"))],
    db: Annotated[Session, Depends(get_db)],
):
    return list(
        db.scalars(select(AuditEvent).order_by(AuditEvent.occurred_at.desc(), AuditEvent.id.desc()).limit(250))
    )


@app.post(
    "/api/v1/admin/seed",
    include_in_schema=settings.admin_seed_endpoint_enabled,
)
def seed(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    db: Annotated[Session, Depends(get_db)],
) -> dict[str, int | bool]:
    if not settings.admin_seed_endpoint_enabled:
        raise HTTPException(status_code=404, detail="Seed endpoint is disabled outside local development.")
    user, _ = get_current_session(credentials, db)
    if user.role.name != "admin":
        raise HTTPException(status_code=403, detail="Administrator permission is required.")
    return seed_demo_data()
