from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Observation, RiskScore, User
from app.services.audit import record_audit_event

METHODOLOGY_VERSION = "climate-health-risk-v0.1"
NON_CLINICAL_NOTICE = (
    "This transparent prototype score supports methodological review and is not "
    "a clinical diagnosis."
)


def classify_risk(score: int) -> str:
    if not 3 <= score <= 12:
        raise ValueError("Risk score must be between 3 and 12.")
    if score <= 5:
        return "low"
    if score <= 8:
        return "moderate"
    if score <= 10:
        return "high"
    return "critical"


def calculate_risk(hazard: int, exposure: int, vulnerability: int) -> tuple[int, str]:
    components = (hazard, exposure, vulnerability)
    if any(value < 1 or value > 4 for value in components):
        raise ValueError("Hazard, exposure, and vulnerability must each be between 1 and 4.")
    score = hazard + exposure + vulnerability
    return score, classify_risk(score)


def calculate_and_store_risk(
    db: Session,
    observation: Observation,
    actor: User | None,
) -> RiskScore:
    score, level = calculate_risk(
        observation.hazard,
        observation.exposure,
        observation.vulnerability,
    )
    result = RiskScore(
        observation_id=observation.id,
        hazard=observation.hazard,
        exposure=observation.exposure,
        vulnerability=observation.vulnerability,
        risk_score=score,
        risk_level=level,
        data_provenance=observation.data_provenance,
        formula_version=METHODOLOGY_VERSION,
        calculated_by_id=actor.id if actor else None,
        is_clinical_diagnosis=False,
    )
    db.add(result)
    db.flush()
    record_audit_event(
        db,
        event_type="risk_score_calculated",
        entity_type="observation",
        entity_id=observation.id,
        actor=actor,
        new_state=f"{score}:{level}",
        methodology_version=METHODOLOGY_VERSION,
    )
    return result


def latest_risk_score(db: Session, observation_id: int) -> RiskScore | None:
    return db.scalar(
        select(RiskScore)
        .where(RiskScore.observation_id == observation_id)
        .order_by(RiskScore.calculated_at.desc(), RiskScore.id.desc())
    )
