from datetime import datetime, timezone

from sqlalchemy import select

from app.bootstrap import (
    LEGACY_SYNTHETIC_NOTICE,
    SYNTHETIC_PROJECT_NAME,
    SYNTHETIC_EVIDENCE_MARKER_DESCRIPTION,
    SYNTHETIC_EVIDENCE_MARKER_URI,
)
from app.core.database import SessionLocal
from app.models import ClimateData, Evidence, Observation, Project, Role, Territory, User


def seed_demo_data() -> dict[str, int | bool]:
    with SessionLocal() as db:
        existing = db.scalar(
            select(Project).where(
                Project.name.in_(
                    {
                        SYNTHETIC_PROJECT_NAME,
                        "San Cristobal Climate & Health MRV Demo",
                    }
                )
            )
        )
        if existing:
            if existing.name != SYNTHETIC_PROJECT_NAME:
                existing.name = SYNTHETIC_PROJECT_NAME
                db.commit()
            return {"created": False, "project_id": existing.id}

        role_admin = Role(name="admin", description="Synthetic administrator role for Sprint 0")
        role_monitor = Role(name="monitor", description="Synthetic monitor role for Sprint 0")
        role_validator = Role(name="validator", description="Synthetic validator role for Sprint 0")
        db.add_all([role_admin, role_monitor, role_validator])
        db.flush()

        admin = User(
            full_name="Synthetic Admin",
            username="synthetic-admin",
            email="synthetic.admin@example.local",
            password_hash="!unusable-synthetic-seed",
            role_id=role_admin.id,
            is_active=False,
            is_synthetic=True,
        )
        monitor = User(
            full_name="Synthetic Community Monitor",
            username="synthetic-monitor",
            email="synthetic.monitor@example.local",
            password_hash="!unusable-synthetic-seed",
            role_id=role_monitor.id,
            is_active=False,
            is_synthetic=True,
        )
        validator = User(
            full_name="Synthetic MRV Validator",
            username="synthetic-validator",
            email="synthetic.validator@example.local",
            password_hash="!unusable-synthetic-seed",
            role_id=role_validator.id,
            is_active=False,
            is_synthetic=True,
        )
        db.add_all([admin, monitor, validator])
        db.flush()

        project = Project(
            name=SYNTHETIC_PROJECT_NAME,
            description="Synthetic Sprint 0 project for UNICEF prototype structure validation.",
            status="sprint-0",
            is_synthetic=True,
        )
        db.add(project)
        db.flush()

        territory = Territory(
            project_id=project.id,
            name="San Cristobal Demo Territory",
            country="Ecuador",
            province="Galapagos",
            latitude=-0.9002,
            longitude=-89.6127,
            timezone="Pacific/Galapagos",
            is_synthetic=True,
        )
        db.add(territory)
        db.flush()

        climate = ClimateData(
            territory_id=territory.id,
            source_name="Synthetic Open-Meteo placeholder",
            source_url="https://open-meteo.com/",
            observed_at=datetime.now(timezone.utc),
            retrieved_at=datetime.now(timezone.utc),
            temperature_c=25.6,
            apparent_temperature_c=27.4,
            precipitation_mm=1.2,
            humidity_percent=78,
            weather_code=61,
            data_provenance="synthetic_demo",
            raw_payload='{"synthetic": true, "note": "Replace with real API adapter in Sprint 1."}',
            is_synthetic=True,
        )
        db.add(climate)

        observation = Observation(
            project_id=project.id,
            territory_id=territory.id,
            created_by_id=monitor.id,
            record_title="Synthetic waste observation - San Cristobal",
            category="waste",
            description="Synthetic observation for MRV flow structure: possible waste hotspot near public route.",
            hazard=3,
            exposure=3,
            vulnerability=2,
            latitude=-0.904,
            longitude=-89.617,
            observed_at=datetime.now(timezone.utc),
            created_at=datetime.now(timezone.utc),
            source_name=LEGACY_SYNTHETIC_NOTICE,
            responsible_role="Synthetic community monitor",
            data_provenance="synthetic_demo",
            synthetic_confirmed=True,
            status="pending",
            is_synthetic=True,
        )
        db.add(observation)
        db.flush()

        evidence = Evidence(
            observation_id=observation.id,
            evidence_type="url",
            uri=SYNTHETIC_EVIDENCE_MARKER_URI,
            description=SYNTHETIC_EVIDENCE_MARKER_DESCRIPTION,
            source_name="Synthetic marker",
            observed_at=datetime.now(timezone.utc),
            data_provenance="synthetic_demo",
            is_synthetic=True,
        )
        db.add(evidence)

        db.commit()
        return {"created": True, "project_id": project.id}


if __name__ == "__main__":
    result = seed_demo_data()
    print(result)
