import unittest

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import get_db
from app.main import app
from app.models import Base, Project, Territory


class ObservationApiTests(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.session_factory = sessionmaker(bind=self.engine, autoflush=False, autocommit=False)

        with self.session_factory() as db:
            project = Project(
                name="Sprint 1A controlled test",
                description="Automated test fixture",
                status="active",
                is_synthetic=False,
            )
            db.add(project)
            db.flush()
            territory = Territory(
                project_id=project.id,
                name="San Cristobal",
                country="Ecuador",
                province="Galapagos",
                latitude=-0.9002,
                longitude=-89.6127,
                is_synthetic=False,
            )
            db.add(territory)
            db.commit()
            self.project_id = project.id
            self.territory_id = territory.id

        def override_get_db():
            db = self.session_factory()
            try:
                yield db
            finally:
                db.close()

        app.dependency_overrides[get_db] = override_get_db
        self.client = TestClient(app)

    def tearDown(self) -> None:
        app.dependency_overrides.clear()
        self.engine.dispose()

    def payload(self, *, provenance: str = "controlled_test", confirmed: bool = False) -> dict:
        observed_at = "2026-07-26T13:30:00-06:00"
        return {
            "project_id": self.project_id,
            "territory_id": self.territory_id,
            "category": "water",
            "description": "Controlled observation of standing water near a public drainage point.",
            "hazard": 2,
            "exposure": 3,
            "vulnerability": 2,
            "latitude": -0.9002,
            "longitude": -89.6127,
            "observed_at": observed_at,
            "source_name": "Controlled territorial monitoring exercise",
            "responsible_role": "Territorial monitoring team",
            "data_provenance": provenance,
            "synthetic_confirmation": confirmed,
            "evidence": {
                "evidence_type": "url",
                "uri": "https://example.org/controlled-evidence/observation-1",
                "description": "Controlled non-sensitive evidence reference",
                "source_name": "Controlled test repository",
                "observed_at": observed_at,
            },
        }

    def test_creates_pending_observation_with_evidence_and_persists_across_requests(self) -> None:
        response = self.client.post("/api/v1/observations", json=self.payload())

        self.assertEqual(response.status_code, 201)
        created = response.json()
        self.assertEqual(created["status"], "pending")
        self.assertEqual(created["data_provenance"], "controlled_test")
        self.assertFalse(created["is_synthetic"])
        self.assertEqual(len(created["evidence_items"]), 1)
        self.assertEqual(created["observed_at"], "2026-07-26T19:30:00Z")
        self.assertTrue(created["created_at"].endswith("Z"))

        persisted_response = self.client.get("/api/v1/observations")

        self.assertEqual(persisted_response.status_code, 200)
        persisted = persisted_response.json()
        self.assertEqual(len(persisted), 1)
        self.assertEqual(persisted[0]["id"], created["id"])
        self.assertEqual(persisted[0]["evidence_items"][0]["source_name"], "Controlled test repository")

    def test_rejects_risk_inputs_outside_scale_one_to_four(self) -> None:
        payload = self.payload()
        payload["hazard"] = 5

        response = self.client.post("/api/v1/observations", json=payload)

        self.assertEqual(response.status_code, 422)

    def test_requires_confirmation_and_marks_synthetic_demo(self) -> None:
        rejected = self.client.post(
            "/api/v1/observations",
            json=self.payload(provenance="synthetic_demo", confirmed=False),
        )
        accepted = self.client.post(
            "/api/v1/observations",
            json=self.payload(provenance="synthetic_demo", confirmed=True),
        )

        self.assertEqual(rejected.status_code, 422)
        self.assertEqual(accepted.status_code, 201)
        self.assertTrue(accepted.json()["is_synthetic"])
        self.assertEqual(accepted.json()["data_provenance"], "synthetic_demo")


if __name__ == "__main__":
    unittest.main()
