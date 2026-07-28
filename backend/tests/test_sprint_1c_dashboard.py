from datetime import datetime, timezone
import csv
from io import StringIO
import unittest

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import settings
from app.core.database import get_db
from app.main import app, get_climate_client
from app.models import Base, Observation, Project, RiskScore, Role, Territory, User
from app.services.risk import METHODOLOGY_VERSION
from app.services.security import hash_password
from app.services.climate import ClimateReading

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
                location_mode = {
                    "Water observation": "approximate",
                    "Heat priority review": "exact",
                    "Synthetic waste demonstration": "hidden",
                }[title]
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
                    public_location_mode=location_mode,
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

    def test_public_dashboard_can_load_climate_without_authentication(self) -> None:
        class PublicClimateClient:
            def fetch_current(self, *, latitude: float, longitude: float) -> ClimateReading:
                if (latitude, longitude) != (-0.9002, -89.6127):
                    raise AssertionError("Unexpected territory coordinates")
                timestamp = datetime(2026, 7, 28, 21, 0, tzinfo=timezone.utc)
                return ClimateReading(
                    source_name="Open-Meteo Weather Forecast API",
                    source_url="https://api.open-meteo.com/v1/forecast?mock=true",
                    observed_at=timestamp,
                    retrieved_at=timestamp,
                    temperature_c=25.8,
                    relative_humidity_percent=79,
                    apparent_temperature_c=29.1,
                    precipitation_mm=0.0,
                    weather_code=2,
                    raw_payload='{"controlled_mock":true}',
                )

        app.dependency_overrides[get_climate_client] = lambda: PublicClimateClient()
        response = self.client.get(
            "/api/v1/climate/current",
            params={"territory_id": 1},
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["source_name"], "Open-Meteo Weather Forecast API")
        self.assertFalse(payload["is_synthetic"])

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

    def test_public_map_applies_geoprivacy_and_excludes_internal_fields(self) -> None:
        response = self.client.get("/api/v1/map/observations")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["scope"], "public")
        self.assertIn("OpenStreetMap contributors", payload["attribution"])
        records = {item["id"]: item for item in payload["observations"]}
        self.assertEqual(len(records), 3)

        approximate = records[1]
        self.assertEqual(approximate["location_mode"], "approximate")
        self.assertEqual(approximate["latitude"], -0.9)
        self.assertEqual(approximate["longitude"], -89.613)

        exact = records[2]
        self.assertEqual(exact["location_mode"], "exact")
        self.assertEqual(exact["latitude"], -0.9002)
        self.assertEqual(exact["longitude"], -89.6127)

        hidden = records[3]
        self.assertEqual(hidden["location_mode"], "hidden")
        self.assertIsNone(hidden["latitude"])
        self.assertIsNone(hidden["longitude"])
        self.assertFalse(hidden["is_publicly_mappable"])

        public_keys = set().union(*(item.keys() for item in payload["observations"]))
        for forbidden in (
            "created_by_id",
            "actor",
            "comment",
            "evidence",
            "password",
            "responsible_role",
        ):
            self.assertNotIn(forbidden, public_keys)

    def test_internal_map_is_authenticated_role_scoped_and_filter_consistent(self) -> None:
        self.assertEqual(self.client.get("/api/v1/map/internal").status_code, 401)
        monitor = self.client.get(
            "/api/v1/map/internal",
            headers=self.login("monitor"),
        ).json()
        self.assertEqual(len(monitor["observations"]), 2)
        hidden_internal = next(
            item for item in monitor["observations"] if item["location_mode"] == "hidden"
        )
        self.assertEqual(hidden_internal["latitude"], -0.9002)
        self.assertEqual(hidden_internal["longitude"], -89.6127)

        heat = self.client.get(
            "/api/v1/map/observations",
            params={"category": "heat"},
        ).json()
        self.assertEqual(len(heat["observations"]), 1)
        self.assertEqual(heat["observations"][0]["record_title"], "Heat priority review")

    def test_public_pdf_is_bilingual_aggregate_and_reproducibly_identified(self) -> None:
        english = self.client.get("/api/v1/reports/public.pdf")
        self.assertEqual(english.status_code, 200)
        self.assertEqual(english.headers["content-type"], "application/pdf")
        self.assertTrue(english.content.startswith(b"%PDF"))
        self.assertIn(b"Territorial Intelligence Report", english.content)
        self.assertIn(b"Prototype / controlled test", english.content)
        self.assertNotIn(b"Authorized internal report", english.content)
        self.assertRegex(
            english.headers["x-infinityatlas-report-id"],
            r"^IA-PUBLIC-\d{8}-\d{6}-[A-F0-9]{8}$",
        )

        spanish = self.client.get("/api/v1/reports/public.pdf", params={"locale": "es"})
        self.assertEqual(spanish.status_code, 200)
        self.assertIn(b"Reporte de Inteligencia Territorial", spanish.content)
        self.assertIn(b"Pendiente", spanish.content)
        self.assertIn(b"Prueba controlada", spanish.content)
        self.assertEqual(
            self.client.get("/api/v1/reports/public.pdf", params={"locale": "fr"}).status_code,
            422,
        )

    def test_internal_pdf_and_csv_require_authentication_and_follow_role_scope(self) -> None:
        self.assertEqual(self.client.get("/api/v1/reports/internal.pdf").status_code, 401)
        self.assertEqual(
            self.client.get("/api/v1/exports/observations.csv").status_code,
            401,
        )
        headers = self.login("monitor")
        internal_pdf = self.client.get(
            "/api/v1/reports/internal.pdf",
            headers=headers,
        )
        self.assertEqual(internal_pdf.status_code, 200)
        self.assertIn(b"Authorized internal report", internal_pdf.content)
        self.assertIn(b"Water observation", internal_pdf.content)
        self.assertIn(b"Synthetic waste demonstration", internal_pdf.content)
        self.assertNotIn(b"Heat priority review", internal_pdf.content)

        internal_csv = self.client.get(
            "/api/v1/exports/observations.csv",
            headers=headers,
        )
        self.assertEqual(internal_csv.status_code, 200)
        self.assertTrue(internal_csv.content.startswith(b"\xef\xbb\xbf"))
        rows = list(
            csv.DictReader(StringIO(internal_csv.content.decode("utf-8-sig")))
        )
        self.assertEqual(len(rows), 2)
        self.assertEqual(
            {row["record_title"] for row in rows},
            {"Water observation", "Synthetic waste demonstration"},
        )
        self.assertNotIn("password", rows[0])
        self.assertNotIn("comment", rows[0])

    def test_public_csv_uses_iso_dates_safe_coordinates_and_active_filters(self) -> None:
        response = self.client.get("/api/v1/exports/public.csv")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.content.startswith(b"\xef\xbb\xbf"))
        rows = list(csv.DictReader(StringIO(response.content.decode("utf-8-sig"))))
        self.assertEqual(len(rows), 3)
        approximate = next(row for row in rows if row["observation_id"] == "1")
        self.assertEqual(approximate["public_latitude"], "-0.9")
        self.assertEqual(approximate["public_longitude"], "-89.613")
        self.assertIn("+00:00", approximate["observed_at_utc"])
        hidden = next(row for row in rows if row["observation_id"] == "3")
        self.assertEqual(hidden["public_latitude"], "")
        self.assertEqual(hidden["public_longitude"], "")
        self.assertEqual(hidden["public_location_mode"], "hidden")
        self.assertNotIn("actor", rows[0])
        self.assertNotIn("evidence", rows[0])

        heat = self.client.get(
            "/api/v1/exports/public.csv",
            params={"category": "heat"},
        )
        filtered = list(csv.DictReader(StringIO(heat.content.decode("utf-8-sig"))))
        self.assertEqual(len(filtered), 1)
        self.assertEqual(filtered[0]["record_title"], "Heat priority review")


if __name__ == "__main__":
    unittest.main()
