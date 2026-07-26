from datetime import datetime, timezone

from sqlalchemy import select

from app.core.database import SessionLocal
from app.models import ClimateData, Evidence, Observation, Project, RiskScore, Role, Territory, User, Validation
from app.services.risk import calculate_risk


def seed_demo_data() -> dict[str, int | bool]:
    with SessionLocal() as db:
        existing = db.scalar(select(Project).where(Project.name == "San Cristobal Climate & Health MRV Demo"))
        if existing:
            return {"created": False, "project_id": existing.id}

        role_admin = Role(name="admin", description="Synthetic administrator role for Sprint 0")
        role_monitor = Role(name="monitor", description="Synthetic monitor role for Sprint 0")
        role_validator = Role(name="validator", description="Synthetic validator role for Sprint 0")
        db.add_all([role_admin, role_monitor, role_validator])
        db.flush()

        admin = User(
            full_name="Synthetic Admin",
            email="synthetic.admin@example.local",
            role_id=role_admin.id,
            is_synthetic=True,
        )
        monitor = User(
            full_name="Synthetic Community Monitor",
            email="synthetic.monitor@example.local",
            role_id=role_monitor.id,
            is_synthetic=True,
        )
        validator = User(
            full_name="Synthetic MRV Validator",
            email="synthetic.validator@example.local",
            role_id=role_validator.id,
            is_synthetic=True,
        )
        db.add_all([admin, monitor, validator])
        db.flush()

        project = Project(
            name="San Cristobal Climate & Health MRV Demo",
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
            category="waste",
            description="Synthetic observation for MRV flow structure: possible waste hotspot near public route.",
            hazard=3,
            exposure=3,
            vulnerability=2,
            latitude=-0.904,
            longitude=-89.617,
            observed_at=datetime.now(timezone.utc),
            created_at=datetime.now(timezone.utc),
            source_name="Synthetic controlled demonstration",
            responsible_role="Synthetic community monitor",
            data_provenance="synthetic_demo",
            synthetic_confirmed=True,
            status="validated",
            is_synthetic=True,
        )
        db.add(observation)
        db.flush()

        evidence = Evidence(
            observation_id=observation.id,
            evidence_type="url",
            uri="https://example.local/synthetic-evidence",
            description="Synthetic evidence placeholder. No real child or community sensitive data.",
            source_name="Synthetic controlled demonstration",
            observed_at=datetime.now(timezone.utc),
            data_provenance="synthetic_demo",
            is_synthetic=True,
        )
        db.add(evidence)

        validation = Validation(
            observation_id=observation.id,
            status="validated",
            comment="Synthetic validation for Sprint 0 seed.",
            validated_by_id=validator.id,
            validated_at=datetime.now(timezone.utc),
        )
        db.add(validation)

        score, level = calculate_risk(observation.hazard, observation.exposure, observation.vulnerability)
        db.add(
            RiskScore(
                observation_id=observation.id,
                risk_score=score,
                risk_level=level,
                confidence_score=60,
                formula_version="sprint-0-simple-sum-v1",
                calculated_at=datetime.now(timezone.utc),
            )
        )

        db.commit()
        return {"created": True, "project_id": project.id}


if __name__ == "__main__":
    result = seed_demo_data()
    print(result)
