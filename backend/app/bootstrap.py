"""Manual reference-data bootstrap and local demo reset utilities."""

import argparse
import json
from datetime import datetime, timezone

from sqlalchemy import delete, or_, select, update
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import SessionLocal
from app.models import (
    ClimateData,
    Evidence,
    Observation,
    Project,
    RiskScore,
    Role,
    Territory,
    User,
    Validation,
)

REFERENCE_PROJECT_NAME = "InfinityAtlas Climate & Health MRV Prototype"
LEGACY_REFERENCE_PROJECT_NAME = "Infinity Atlas Climate & Health MRV Pilot"
LEGACY_SPACED_REFERENCE_PROJECT_NAME = "Infinity Atlas Climate & Health MRV Prototype"
REFERENCE_PROJECT_STATUS = "prototype_reference"
REFERENCE_PROJECT_DESCRIPTION = "Prototype / controlled test - Not a validated field pilot"
REFERENCE_TERRITORY_NAME = "San Cristobal"
REFERENCE_LATITUDE = -0.9002
REFERENCE_LONGITUDE = -89.6127

SYNTHETIC_PROJECT_NAME = "InfinityAtlas Climate & Health MRV Synthetic Demo"
LEGACY_SYNTHETIC_PROJECT_NAME = "San Cristobal Climate & Health MRV Demo"
LEGACY_SYNTHETIC_NOTICE = "Legacy synthetic demo record - Not technically validated"
SYNTHETIC_EVIDENCE_MARKER_URI = "synthetic://no-external-evidence"
SYNTHETIC_EVIDENCE_MARKER_DESCRIPTION = "No external evidence - synthetic marker"
CONTROLLED_DEMO_DESCRIPTION = (
    "Controlled demonstration record created by the explicit local clean-demo procedure."
)
CONTROLLED_DEMO_EVIDENCE_URL = (
    "https://github.com/Carlos-Hub1111/infinity-atlas-climate-health-mrv"
)
LOCAL_ENVIRONMENTS = {"local", "dev", "development", "test"}
OFFICIAL_OWNER_NAME = "INFINITYGAIA S.A.S. B.I.C."


def _upsert_reference_data(db: Session) -> tuple[Project, Territory, bool, bool]:
    project = db.scalar(
        select(Project).where(Project.name == REFERENCE_PROJECT_NAME).order_by(Project.id)
    )
    if project is None:
        project = db.scalar(
            select(Project)
            .where(
                Project.name.in_(
                    {
                        LEGACY_SPACED_REFERENCE_PROJECT_NAME,
                        LEGACY_REFERENCE_PROJECT_NAME,
                    }
                )
            )
            .order_by(Project.id)
        )

    project_created = project is None
    if project is None:
        project = Project(
            name=REFERENCE_PROJECT_NAME,
            description=REFERENCE_PROJECT_DESCRIPTION,
            status=REFERENCE_PROJECT_STATUS,
            is_synthetic=False,
        )
        db.add(project)
        db.flush()
    else:
        project.name = REFERENCE_PROJECT_NAME
        project.description = REFERENCE_PROJECT_DESCRIPTION
        project.status = REFERENCE_PROJECT_STATUS
        project.is_synthetic = False

    territory = db.scalar(
        select(Territory)
        .where(
            Territory.project_id == project.id,
            Territory.name == REFERENCE_TERRITORY_NAME,
        )
        .order_by(Territory.id)
    )
    territory_created = territory is None
    if territory is None:
        territory = Territory(
            project_id=project.id,
            name=REFERENCE_TERRITORY_NAME,
            country="Ecuador",
            province="Galapagos",
            latitude=REFERENCE_LATITUDE,
            longitude=REFERENCE_LONGITUDE,
            is_synthetic=False,
        )
        db.add(territory)
        db.flush()
    else:
        territory.country = "Ecuador"
        territory.province = "Galapagos"
        territory.latitude = REFERENCE_LATITUDE
        territory.longitude = REFERENCE_LONGITUDE
        territory.is_synthetic = False

    return project, territory, project_created, territory_created


def _harden_synthetic_records(db: Session) -> dict[str, int]:
    synthetic_projects = list(
        db.scalars(
            select(Project).where(
                Project.is_synthetic.is_(True),
                Project.name.in_({SYNTHETIC_PROJECT_NAME, LEGACY_SYNTHETIC_PROJECT_NAME}),
            )
        )
    )
    synthetic_projects_updated = 0
    for project in synthetic_projects:
        if project.name != SYNTHETIC_PROJECT_NAME:
            project.name = SYNTHETIC_PROJECT_NAME
            synthetic_projects_updated += 1

    observations = list(
        db.scalars(
            select(Observation).where(
                or_(
                    Observation.is_synthetic.is_(True),
                    Observation.data_provenance == "synthetic_demo",
                )
            )
        )
    )
    observation_ids = [observation.id for observation in observations]
    for observation in observations:
        observation.status = "pending"
        if observation.source_name in {
            "Synthetic controlled demonstration",
            "Sprint 0 legacy record",
        }:
            observation.source_name = LEGACY_SYNTHETIC_NOTICE

    evidence_updated = 0
    if observation_ids:
        evidence_items = list(
            db.scalars(select(Evidence).where(Evidence.observation_id.in_(observation_ids)))
        )
        for evidence in evidence_items:
            if evidence.is_synthetic and (
                evidence.uri.startswith("https://example.local/")
                or evidence.uri.startswith("http://example.local/")
            ):
                evidence.uri = SYNTHETIC_EVIDENCE_MARKER_URI
                evidence.description = SYNTHETIC_EVIDENCE_MARKER_DESCRIPTION
                evidence.source_name = "Synthetic marker"
                evidence_updated += 1

        validations_removed = db.execute(
            delete(Validation).where(Validation.observation_id.in_(observation_ids))
        ).rowcount
        risk_scores_removed = db.execute(
            delete(RiskScore).where(RiskScore.observation_id.in_(observation_ids))
        ).rowcount
    else:
        validations_removed = 0
        risk_scores_removed = 0

    return {
        "synthetic_projects_updated": synthetic_projects_updated,
        "synthetic_observations_hardened": len(observations),
        "synthetic_evidence_markers_updated": evidence_updated,
        "synthetic_validations_removed": validations_removed or 0,
        "synthetic_risk_scores_removed": risk_scores_removed or 0,
    }


def _normalize_known_controlled_brand_labels(db: Session) -> int:
    updates = [
        db.execute(
            update(Observation)
            .where(Observation.source_name == "InfinityGaia controlled prototype test")
            .values(source_name=f"{OFFICIAL_OWNER_NAME} controlled prototype test")
        ).rowcount,
        db.execute(
            update(Observation)
            .where(Observation.responsible_role == "InfinityGaia prototype team")
            .values(responsible_role=f"{OFFICIAL_OWNER_NAME} prototype team")
        ).rowcount,
        db.execute(
            update(Evidence)
            .where(Evidence.source_name == "InfinityGaia public GitHub repository")
            .values(source_name=f"{OFFICIAL_OWNER_NAME} public GitHub repository")
        ).rowcount,
    ]
    return sum(count or 0 for count in updates)


def bootstrap_reference_data(db: Session) -> dict[str, int | bool]:
    """Create or update reference data without deleting controlled observations."""
    project, territory, project_created, territory_created = _upsert_reference_data(db)
    summary: dict[str, int | bool] = {
        "project_id": project.id,
        "territory_id": territory.id,
        "project_created": project_created,
        "territory_created": territory_created,
    }
    summary.update(_harden_synthetic_records(db))
    summary["controlled_brand_labels_updated"] = _normalize_known_controlled_brand_labels(db)
    db.commit()
    return summary


def prepare_clean_demo_data(
    db: Session,
    *,
    app_env: str,
    confirmed: bool,
) -> dict[str, int | bool]:
    """Reset local demo observations while preserving public reference data."""
    if app_env.lower() not in LOCAL_ENVIRONMENTS:
        raise RuntimeError("Clean demo preparation is disabled outside local development and test.")
    if not confirmed:
        raise RuntimeError("Clean demo preparation requires --confirm-clean-demo.")

    project, territory, _, _ = _upsert_reference_data(db)
    synthetic_project = db.scalar(
        select(Project)
        .where(Project.name.in_({SYNTHETIC_PROJECT_NAME, LEGACY_SYNTHETIC_PROJECT_NAME}))
        .order_by(Project.id)
    )

    project_ids = [project.id]
    if synthetic_project is not None:
        project_ids.append(synthetic_project.id)
    observation_ids = list(
        db.scalars(select(Observation.id).where(Observation.project_id.in_(project_ids)))
    )

    if observation_ids:
        db.execute(delete(Evidence).where(Evidence.observation_id.in_(observation_ids)))
        db.execute(delete(Validation).where(Validation.observation_id.in_(observation_ids)))
        db.execute(delete(RiskScore).where(RiskScore.observation_id.in_(observation_ids)))
        db.execute(delete(Observation).where(Observation.id.in_(observation_ids)))

    if synthetic_project is not None:
        legacy_territory_ids = list(
            db.scalars(
                select(Territory.id).where(Territory.project_id == synthetic_project.id)
            )
        )
        if legacy_territory_ids:
            db.execute(
                delete(ClimateData).where(ClimateData.territory_id.in_(legacy_territory_ids))
            )
            db.execute(delete(Territory).where(Territory.id.in_(legacy_territory_ids)))
        db.delete(synthetic_project)

    synthetic_emails = {
        "synthetic.admin@example.local",
        "synthetic.monitor@example.local",
        "synthetic.validator@example.local",
    }
    db.execute(delete(User).where(User.email.in_(synthetic_emails)))
    db.execute(delete(Role).where(Role.description.like("Synthetic % role for Sprint 0")))

    now = datetime.now(timezone.utc)
    observation = Observation(
        project_id=project.id,
        territory_id=territory.id,
        category="water",
        description=CONTROLLED_DEMO_DESCRIPTION,
        hazard=1,
        exposure=1,
        vulnerability=1,
        latitude=territory.latitude,
        longitude=territory.longitude,
        observed_at=now,
        created_at=now,
        source_name="Explicit local clean-demo procedure",
        responsible_role="Controlled demonstration team",
        data_provenance="controlled_test",
        synthetic_confirmed=False,
        status="pending",
        is_synthetic=False,
    )
    db.add(observation)
    db.flush()
    db.add(
        Evidence(
            observation_id=observation.id,
            evidence_type="url",
            uri=CONTROLLED_DEMO_EVIDENCE_URL,
            description="Public repository reference for the controlled demonstration",
            source_name="InfinityAtlas public repository",
            observed_at=now,
            data_provenance="controlled_test",
            is_synthetic=False,
        )
    )
    db.commit()

    return {
        "project_id": project.id,
        "territory_id": territory.id,
        "controlled_observation_id": observation.id,
        "removed_observations": len(observation_ids),
        "created": True,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Bootstrap InfinityAtlas reference data.")
    parser.add_argument(
        "--clean-demo",
        action="store_true",
        help="Remove legacy/demo observations and create one explicit controlled record.",
    )
    parser.add_argument(
        "--confirm-clean-demo",
        action="store_true",
        help="Required confirmation for the destructive local clean-demo operation.",
    )
    arguments = parser.parse_args()

    with SessionLocal() as db:
        if arguments.clean_demo:
            result = prepare_clean_demo_data(
                db,
                app_env=settings.app_env,
                confirmed=arguments.confirm_clean_demo,
            )
        else:
            result = bootstrap_reference_data(db)
    print(json.dumps(result, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
