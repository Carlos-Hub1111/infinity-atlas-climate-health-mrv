from datetime import datetime
import unittest

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import settings
from app.core.database import get_db
from app.main import app
from app.models import Base, Observation, Project, RiskScore, Role, Territory, User
from app.services.risk import METHODOLOGY_VERSION
from app.services.security import hash_password

PASSWORD = "local-dashboard-test-password"


class Sprint1CDashboardTests(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.session_factory = sessionmaker(
            bind=self.engine,
            autoflush=False,
            autocommit=False,
        )
        self.original_secret = settings.jwt_secret_key
        settings.jwt_secret_key = "dashboard-test-signing-key-with-at-least-32-characters"

        with self.session_factory() as db:
            users = {}
            for role_name in ("admin", "monitor", "validator", "public"):
                role = Role(name=role_name, description=f"Test {role_name}")
                db.add(role)
                db.flush()
                user = User(
                    full_name=f"Test {role_name.title()}",
                    username=f"dashboard-{role_name}",
                    email=f"dashboard.{role_name}@example.local",
                    password_hash=hash_password(PASSWORD),
                    role_id=role.id,
                    is_active=True,
                    is_synthetic=True,
                )
                db.add(user)
                db.flush()
                users[role_name] = user
            project = Project(
                name="InfinityAtlas Climate & Health MRV Prototype",
                status="prototype_reference",
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
                timezone="Pacific/Galapagos",
                is_synthetic=False,
            )
            db.add(territory)
            db.flush()
            other_territory = Territory(
                project_id=project.id,
                name="Isabela",
                country="Ecuador",
                province="Galapagos",
                latitude=-0.9538,
                longitude=-90.9656,
                timezone="Pacific/Galapagos",
                is_synthetic=False,
            )
            db.add(other_territory)
            db.flush()
            fixtures = [
                (
                    "Water observation",
                    "water",
                    "pending",
                    "controlled_test",
                    datetime(2026, 7, 26, 18, 0),
                    users["monitor"].id,
                    (1, 1, 1, 3, "low"),
                ),
                (
                    "Heat priority review",
                    "heat",
                    "validated",
                    "public_real",
                    datetime(2026, 7, 27, 18, 0),
                    users["admin"].id,
                    (4, 4, 3, 11, "critical"),
                ),
                (
                    "Synthetic waste demonstration",
                    "waste",
                    "rejected",
                    "synthetic_demo",
                    datetime(2026, 7, 28, 18, 0),
                    users["monitor"].id,
                    None,
                ),
            ]
            for title, category, status, provenance, observed_at, creator_id, risk in fixtures:
                observation = Observation(
                    project_id=project.id,
                    territory_id=territory.id,
                    created_by_id=creator_id,
                    record_title=title,
                    category=category,
                    description=f"Controlled fixture for {title}",
                    hazard=risk[0] if risk else 1,
                    exposure=risk[1] if risk else 1,
                    vulnerability=risk[2] if risk else 1,
                    latitude=-0.9002,
                    longitude=-89.6127,
                    observed_at=observed_at,
                    created_at=observed_at,
                    source_name="Controlled automated test",
                    responsible_role="Automated test",
                    data_provenance=provenance,
                    synthetic_confirmed=provenance == "synthetic_demo",
                    status=status,
                    is_synthetic=provenance == "synthetic_demo",
                )
                db.add(observation)
                db.flush()
                if risk:
                    db.add(
                        RiskScore(
                            observation_id=observation.id,
                            hazard=risk[0],
                            exposure=risk[1],
                            vulnerability=risk[2],
                            risk_score=risk[3],
                            risk_level=risk[4],
                            data_provenance=provenance,
                            formula_version=METHODOLOGY_VERSION,
                            calculated_by_id=creator_id,
                            is_clinical_diagnosis=False,
                            calculated_at=observed_at,
                        )
                    )
            db.add(
                Observation(
                    project_id=project.id,
                    territory_id=other_territory.id,
                    created_by_id=users["admin"].id,
                    record_title="Out-of-scope territory record",
                    category="water",
                    description="Confirms the default dashboard is limited to San Cristobal.",
                    hazard=1,
                    exposure=1,
                    vulnerability=1,
                    latitude=-0.9538,
                    longitude=-90.9656,
                    observed_at=datetime(2026, 7, 28, 18, 0),
                    created_at=datetime(2026, 7, 28, 18, 0),
                    source_name="Controlled automated test",
                    responsible_role="Automated test",
                    data_provenance="controlled_test",
                    synthetic_confirmed=False,
                    status="pending",
                    is_synthetic=False,
                )
            )
            db.commit()

        def override_get_db():
            with self.session_factory() as db:
                yield db

        app.dependency_overrides[get_db] = override_get_db
        self.client = TestClient(app)

    def tearDown(self) -> None:
        app.dependency_overrides.clear()
        settings.jwt_secret_key = self.original_secret
        self.engine.dispose()

    def login(self, role: str) -> dict[str, str]:
        response = self.client.post(
            "/api/v1/auth/login",
            json={"identifier": f"dashboard-{role}", "password": PASSWORD},
        )
        self.assertEqual(response.status_code, 200)
        return {"Authorization": f"Bearer {response.json()['access_token']}"}

    def test_public_metrics_trends_and_safe_contract(self) -> None:
        response = self.client.get("/api/v1/dashboard/public")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["scope"], "public")
        self.assertEqual(payload["total_observations"], 3)
        self.assertEqual(payload["status_counts"]["pending"], 1)
        self.assertEqual(payload["status_counts"]["validated"], 1)
        self.assertEqual(payload["status_counts"]["rejected"], 1)
        self.assertEqual(payload["provenance_counts"]["synthetic_demo"], 1)
        self.assertEqual(payload["risk_counts"]["low"], 1)
        self.assertEqual(payload["risk_counts"]["critical"], 1)
        self.assertEqual(payload["category_counts"]["heat"], 1)
        self.assertEqual(len(payload["trends"]), 3)
        self.assertEqual(payload["territory"]["name"], "San Cristobal")
        rendered = response.text.lower()
        self.assertNotIn("created_by_id", rendered)
        self.assertNotIn("password", rendered)
        self.assertNotIn("comment", rendered)

    def test_global_filters_search_and_empty_state(self) -> None:
        heat = self.client.get(
            "/api/v1/dashboard/public",
            params={"category": "heat", "risk_level": "critical"},
        ).json()
        self.assertEqual(heat["total_observations"], 1)
        self.assertEqual(heat["category_counts"]["heat"], 1)
        self.assertEqual(heat["active_filter_count"], 2)

        by_title = self.client.get(
            "/api/v1/dashboard/public",
            params={"search": "Water observation"},
        ).json()
        self.assertEqual(by_title["total_observations"], 1)

        by_number = self.client.get(
            "/api/v1/dashboard/public",
            params={"search": "#2"},
        ).json()
        self.assertEqual(by_number["category_counts"]["heat"], 1)

        empty = self.client.get(
            "/api/v1/dashboard/public",
            params={"date_from": "2027-01-01", "date_to": "2027-01-02"},
        ).json()
        self.assertEqual(empty["total_observations"], 0)
        self.assertEqual(empty["trends"], [])
        invalid = self.client.get(
            "/api/v1/dashboard/public",
            params={"date_from": "2027-01-02", "date_to": "2027-01-01"},
        )
        self.assertEqual(invalid.status_code, 422)

    def test_role_dashboards_are_protected_and_scoped(self) -> None:
        self.assertEqual(
            self.client.get("/api/v1/dashboard/internal").status_code,
            401,
        )
        monitor = self.client.get(
            "/api/v1/dashboard/internal",
            headers=self.login("monitor"),
        ).json()
        self.assertEqual(monitor["total_observations"], 2)
        self.assertEqual(monitor["role_metrics"]["my_records"], 2)

        validator = self.client.get(
            "/api/v1/dashboard/internal",
            headers=self.login("validator"),
        ).json()
        self.assertEqual(validator["total_observations"], 3)
        self.assertEqual(validator["role_metrics"]["pending_queue"], 1)

        admin = self.client.get(
            "/api/v1/dashboard/internal",
            headers=self.login("admin"),
        ).json()
        self.assertEqual(admin["role_metrics"]["active_users"], 4)
        self.assertEqual(admin["role_metrics"]["records"], 3)


if __name__ == "__main__":
    unittest.main()
