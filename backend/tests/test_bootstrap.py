import unittest

from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.bootstrap import (
    CONTROLLED_DEMO_DESCRIPTION,
    LEGACY_REFERENCE_PROJECT_NAME,
    LEGACY_SPACED_REFERENCE_PROJECT_NAME,
    LEGACY_SYNTHETIC_PROJECT_NAME,
    REFERENCE_PROJECT_DESCRIPTION,
    REFERENCE_PROJECT_NAME,
    REFERENCE_PROJECT_STATUS,
    REFERENCE_TERRITORY_NAME,
    SYNTHETIC_EVIDENCE_MARKER_URI,
    bootstrap_reference_data,
    prepare_clean_demo_data,
)
from app.models import (
    Base,
    Evidence,
    Observation,
    Project,
    RiskScore,
    Territory,
    Validation,
)


class ReferenceBootstrapTests(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.session_factory = sessionmaker(bind=self.engine, autoflush=False, autocommit=False)

    def tearDown(self) -> None:
        self.engine.dispose()

    def test_bootstrap_is_idempotent_and_updates_legacy_reference_name(self) -> None:
        with self.session_factory() as db:
            legacy = Project(
                name=LEGACY_REFERENCE_PROJECT_NAME,
                description="Legacy description",
                status="active",
                is_synthetic=False,
            )
            db.add(legacy)
            db.commit()

            first = bootstrap_reference_data(db)
            second = bootstrap_reference_data(db)

            projects = list(db.scalars(select(Project)))
            territories = list(db.scalars(select(Territory)))
            self.assertEqual(len(projects), 1)
            self.assertEqual(len(territories), 1)
            self.assertEqual(projects[0].name, REFERENCE_PROJECT_NAME)
            self.assertEqual(projects[0].description, REFERENCE_PROJECT_DESCRIPTION)
            self.assertEqual(projects[0].status, REFERENCE_PROJECT_STATUS)
            self.assertEqual(territories[0].name, REFERENCE_TERRITORY_NAME)
            self.assertEqual(first["project_id"], second["project_id"])
            self.assertEqual(first["territory_id"], second["territory_id"])
            self.assertFalse(second["project_created"])
            self.assertFalse(second["territory_created"])

    def test_bootstrap_migrates_the_spaced_prototype_name_without_duplication(self) -> None:
        with self.session_factory() as db:
            db.add(
                Project(
                    name=LEGACY_SPACED_REFERENCE_PROJECT_NAME,
                    description="Previous Sprint 1A name",
                    status="prototype_reference",
                    is_synthetic=False,
                )
            )
            db.commit()

            bootstrap_reference_data(db)

            projects = list(db.scalars(select(Project)))
            self.assertEqual(len(projects), 1)
            self.assertEqual(projects[0].name, REFERENCE_PROJECT_NAME)

    def test_bootstrap_normalizes_only_known_controlled_brand_labels(self) -> None:
        with self.session_factory() as db:
            bootstrap_reference_data(db)
            project = db.scalar(select(Project).where(Project.name == REFERENCE_PROJECT_NAME))
            territory = db.scalar(
                select(Territory).where(Territory.name == REFERENCE_TERRITORY_NAME)
            )
            observation = Observation(
                project_id=project.id,
                territory_id=territory.id,
                category="water",
                description="Controlled brand normalization fixture",
                hazard=1,
                exposure=1,
                vulnerability=1,
                latitude=territory.latitude,
                longitude=territory.longitude,
                source_name="InfinityGaia controlled prototype test",
                responsible_role="InfinityGaia prototype team",
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
                    uri="https://github.com/Carlos-Hub1111/infinity-atlas-climate-health-mrv",
                    description="Controlled public repository reference",
                    source_name="InfinityGaia public GitHub repository",
                    data_provenance="controlled_test",
                    is_synthetic=False,
                )
            )
            db.commit()

            result = bootstrap_reference_data(db)

            db.refresh(observation)
            evidence = db.scalar(
                select(Evidence).where(Evidence.observation_id == observation.id)
            )
            self.assertEqual(
                observation.source_name,
                "INFINITYGAIA S.A.S. B.I.C. controlled prototype test",
            )
            self.assertEqual(
                observation.responsible_role,
                "INFINITYGAIA S.A.S. B.I.C. prototype team",
            )
            self.assertEqual(
                evidence.source_name,
                "INFINITYGAIA S.A.S. B.I.C. public GitHub repository",
            )
            self.assertEqual(result["controlled_brand_labels_updated"], 3)

    def test_bootstrap_hardens_synthetic_legacy_without_deleting_controlled_records(self) -> None:
        with self.session_factory() as db:
            synthetic_project = Project(
                name=LEGACY_SYNTHETIC_PROJECT_NAME,
                status="sprint-0",
                is_synthetic=True,
            )
            db.add(synthetic_project)
            db.flush()
            synthetic_territory = Territory(
                project_id=synthetic_project.id,
                name="San Cristobal Demo Territory",
                country="Ecuador",
                province="Galapagos",
                latitude=-0.9,
                longitude=-89.6,
                is_synthetic=True,
            )
            db.add(synthetic_territory)
            db.flush()
            synthetic_observation = Observation(
                project_id=synthetic_project.id,
                territory_id=synthetic_territory.id,
                category="waste",
                description="Legacy synthetic record",
                hazard=3,
                exposure=3,
                vulnerability=2,
                latitude=-0.9,
                longitude=-89.6,
                source_name="Synthetic controlled demonstration",
                responsible_role="Synthetic monitor",
                data_provenance="synthetic_demo",
                synthetic_confirmed=True,
                status="validated",
                is_synthetic=True,
            )
            db.add(synthetic_observation)
            db.flush()
            db.add(
                Evidence(
                    observation_id=synthetic_observation.id,
                    evidence_type="url",
                    uri="https://example.local/synthetic-evidence",
                    description="Fictitious legacy evidence",
                    source_name="Legacy evidence",
                    data_provenance="synthetic_demo",
                    is_synthetic=True,
                )
            )
            db.add(
                Validation(
                    observation_id=synthetic_observation.id,
                    previous_status="pending",
                    status="validated",
                )
            )
            db.add(
                RiskScore(
                    observation_id=synthetic_observation.id,
                    hazard=3,
                    exposure=3,
                    vulnerability=2,
                    risk_score=8,
                    risk_level="high",
                    data_provenance="synthetic_demo",
                    formula_version="legacy",
                    is_clinical_diagnosis=False,
                )
            )
            db.commit()

            bootstrap_reference_data(db)

            db.refresh(synthetic_observation)
            evidence = db.scalar(
                select(Evidence).where(Evidence.observation_id == synthetic_observation.id)
            )
            self.assertEqual(synthetic_observation.status, "pending")
            self.assertEqual(evidence.uri, SYNTHETIC_EVIDENCE_MARKER_URI)
            self.assertNotIn("example.local", evidence.uri)
            self.assertEqual(
                db.scalar(select(func.count()).select_from(Validation)),
                0,
            )
            self.assertEqual(
                db.scalar(select(func.count()).select_from(RiskScore)),
                0,
            )

    def test_clean_demo_preserves_reference_and_creates_only_controlled_pending_record(self) -> None:
        with self.session_factory() as db:
            bootstrap_reference_data(db)
            project = db.scalar(select(Project).where(Project.name == REFERENCE_PROJECT_NAME))
            territory = db.scalar(
                select(Territory).where(Territory.name == REFERENCE_TERRITORY_NAME)
            )
            db.add(
                Observation(
                    project_id=project.id,
                    territory_id=territory.id,
                    category="heat",
                    description="Record to remove during explicit clean demo",
                    hazard=2,
                    exposure=2,
                    vulnerability=2,
                    latitude=territory.latitude,
                    longitude=territory.longitude,
                    source_name="Controlled test",
                    responsible_role="Test team",
                    data_provenance="controlled_test",
                    synthetic_confirmed=False,
                    status="pending",
                    is_synthetic=False,
                )
            )
            db.commit()

            prepare_clean_demo_data(db, app_env="test", confirmed=True)

            observations = list(db.scalars(select(Observation)))
            self.assertEqual(len(observations), 1)
            self.assertEqual(observations[0].description, CONTROLLED_DEMO_DESCRIPTION)
            self.assertEqual(observations[0].data_provenance, "controlled_test")
            self.assertEqual(observations[0].status, "pending")
            self.assertEqual(
                db.scalar(select(func.count()).select_from(Project)),
                1,
            )
            self.assertEqual(
                db.scalar(select(func.count()).select_from(Territory)),
                1,
            )

    def test_clean_demo_is_blocked_in_production_and_requires_confirmation(self) -> None:
        with self.session_factory() as db:
            with self.assertRaises(RuntimeError):
                prepare_clean_demo_data(db, app_env="production", confirmed=True)
            with self.assertRaises(RuntimeError):
                prepare_clean_demo_data(db, app_env="local", confirmed=False)


if __name__ == "__main__":
    unittest.main()
