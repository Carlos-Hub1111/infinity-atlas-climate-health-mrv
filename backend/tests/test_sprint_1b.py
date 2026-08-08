from datetime import datetime
import unittest

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import settings
from app.core.database import get_db
from app.demo_users import bootstrap_demo_users
from app.main import app
from app.models import (
    AuditEvent,
    AuthSession,
    Base,
    Evidence,
    Observation,
    Project,
    RiskScore,
    Role,
    Territory,
    User,
    Validation,
)
from app.services.risk import METHODOLOGY_VERSION, calculate_risk
from app.services.security import hash_password

PASSWORD = "local-test-password-not-published"


class Sprint1BApiTests(unittest.TestCase):
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
        self.original_expiry = settings.jwt_access_token_expire_minutes
        self.original_demo_validator_enabled = settings.demo_validator_enabled
        settings.jwt_secret_key = "test-only-signing-key-with-at-least-32-characters"
        settings.jwt_access_token_expire_minutes = 60
        settings.demo_validator_enabled = False

        with self.session_factory() as db:
            roles = {}
            for role_name in ("admin", "monitor", "validator", "public"):
                role = Role(name=role_name, description=f"Test {role_name}")
                db.add(role)
                db.flush()
                roles[role_name] = role
                db.add(
                    User(
                        full_name=f"Test {role_name.title()}",
                        username=f"test-{role_name}",
                        email=f"{role_name}@example.local",
                        password_hash=hash_password(PASSWORD),
                        role_id=role.id,
                        is_active=True,
                        is_synthetic=True,
                    )
                )
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
            db.commit()
            self.project_id = project.id
            self.territory_id = territory.id

        def override_get_db():
            with self.session_factory() as db:
                yield db

        app.dependency_overrides[get_db] = override_get_db
        self.client = TestClient(app)

    def tearDown(self) -> None:
        app.dependency_overrides.clear()
        settings.jwt_secret_key = self.original_secret
        settings.jwt_access_token_expire_minutes = self.original_expiry
        settings.demo_validator_enabled = self.original_demo_validator_enabled
        self.engine.dispose()

    def login(self, role: str, password: str = PASSWORD) -> dict[str, str]:
        response = self.client.post(
            "/api/v1/auth/login",
            json={"identifier": f"test-{role}", "password": password},
        )
        self.assertEqual(response.status_code, 200)
        return {"Authorization": f"Bearer {response.json()['access_token']}"}

    def observation_payload(self, *, provenance: str = "controlled_test") -> dict:
        return {
            "project_id": self.project_id,
            "territory_id": self.territory_id,
            "record_title": "Controlled heat risk observation",
            "category": "heat",
            "description": "Controlled heat observation used by the Sprint 1B automated review.",
            "hazard": 4,
            "exposure": 3,
            "vulnerability": 4,
            "latitude": -0.9002,
            "longitude": -89.6127,
            "observed_at": "2026-07-26T14:00:00",
            "source_name": "Controlled monitoring exercise",
            "responsible_role": "Territorial monitor",
            "data_provenance": provenance,
            "synthetic_confirmation": provenance == "synthetic_demo",
            "evidence": {
                "evidence_type": "url",
                "uri": "https://example.org/controlled-evidence",
                "description": "Non-sensitive controlled evidence reference",
                "source_name": "Controlled evidence source",
                "observed_at": "2026-07-26T14:00:00",
            },
        }

    def create_as_monitor(self) -> tuple[dict, dict[str, str]]:
        headers = self.login("monitor")
        response = self.client.post(
            "/api/v1/observations",
            json=self.observation_payload(),
            headers=headers,
        )
        self.assertEqual(response.status_code, 201)
        return response.json(), headers

    def test_authentication_success_failure_expiry_inactive_logout_and_protection(self) -> None:
        invalid = self.client.post(
            "/api/v1/auth/login",
            json={"identifier": "test-monitor", "password": "wrong-password"},
        )
        self.assertEqual(invalid.status_code, 401)
        self.assertEqual(self.client.get("/api/v1/auth/me").status_code, 401)

        headers = self.login("monitor")
        self.assertEqual(self.client.get("/api/v1/auth/me", headers=headers).status_code, 200)
        self.assertEqual(self.client.post("/api/v1/auth/logout", headers=headers).status_code, 200)
        self.assertEqual(self.client.get("/api/v1/auth/me", headers=headers).status_code, 401)

        with self.session_factory() as db:
            inactive = db.scalar(select(User).where(User.username == "test-validator"))
            inactive.is_active = False
            db.commit()
        inactive_login = self.client.post(
            "/api/v1/auth/login",
            json={"identifier": "test-validator", "password": PASSWORD},
        )
        self.assertEqual(inactive_login.status_code, 401)

        settings.jwt_access_token_expire_minutes = -1
        expired_headers = self.login("admin")
        self.assertEqual(
            self.client.get("/api/v1/auth/me", headers=expired_headers).status_code,
            401,
        )

        with self.session_factory() as db:
            event_types = set(db.scalars(select(AuditEvent.event_type)))
            self.assertIn("login_success", event_types)
            self.assertIn("login_failed", event_types)
            self.assertTrue(
                db.scalar(
                    select(func.count())
                    .select_from(AuthSession)
                    .where(AuthSession.revoked_at.is_not(None))
                )
            )

    def test_optional_demo_validator_login_is_disabled_by_configuration(self) -> None:
        with self.session_factory() as db:
            validator_role = db.scalar(select(Role).where(Role.name == "validator"))
            db.add(
                User(
                    full_name="Optional Demo Validator",
                    username="demo-validator",
                    email="demo.validator@example.local",
                    password_hash=hash_password(PASSWORD),
                    role_id=validator_role.id,
                    is_active=True,
                    is_synthetic=True,
                )
            )
            db.commit()

        blocked = self.client.post(
            "/api/v1/auth/login",
            json={"identifier": "demo-validator", "password": PASSWORD},
        )
        self.assertEqual(blocked.status_code, 401)

        settings.demo_validator_enabled = True
        enabled = self.client.post(
            "/api/v1/auth/login",
            json={"identifier": "demo-validator", "password": PASSWORD},
        )
        self.assertEqual(enabled.status_code, 200)

    def test_role_permissions_and_public_aggregation(self) -> None:
        created, monitor_headers = self.create_as_monitor()
        denied = self.client.post(
            f"/api/v1/observations/{created['id']}/validation",
            json={"status": "validated"},
            headers=monitor_headers,
        )
        self.assertEqual(denied.status_code, 403)

        public_headers = self.login("public")
        self.assertEqual(
            self.client.post(
                "/api/v1/observations",
                json=self.observation_payload(),
                headers=public_headers,
            ).status_code,
            403,
        )
        self.assertEqual(
            self.client.get("/api/v1/observations", headers=public_headers).status_code,
            403,
        )
        public = self.client.get("/api/v1/public/summary")
        self.assertEqual(public.status_code, 200)
        self.assertEqual(public.json()["total_observations"], 1)
        self.assertNotIn("created_by_id", public.json())

    def test_admin_soft_deletion_preserves_history_and_excludes_operational_outputs(self) -> None:
        created, monitor_headers = self.create_as_monitor()
        observation_id = created["id"]
        title = created["record_title"]
        admin_headers = self.login("admin")
        public_headers = self.login("public")

        validated = self.client.post(
            f"/api/v1/observations/{observation_id}/validation",
            json={"status": "validated", "comment": "Methodological review complete."},
            headers=admin_headers,
        )
        self.assertEqual(validated.status_code, 201)

        for headers in (monitor_headers, public_headers):
            denied = self.client.request(
                "DELETE",
                f"/api/v1/observations/{observation_id}",
                json={"reason": "Controlled closure test"},
                headers=headers,
            )
            self.assertEqual(denied.status_code, 403)
        self.assertEqual(
            self.client.request(
                "DELETE",
                f"/api/v1/observations/{observation_id}",
                json={"reason": "Controlled closure test"},
            ).status_code,
            401,
        )

        deleted = self.client.request(
            "DELETE",
            f"/api/v1/observations/{observation_id}",
            json={"reason": "Duplicate controlled record entered during UAT"},
            headers=admin_headers,
        )
        self.assertEqual(deleted.status_code, 200)
        self.assertEqual(
            deleted.json()["message"],
            "Observation deleted and audit history preserved.",
        )
        repeated = self.client.request(
            "DELETE",
            f"/api/v1/observations/{observation_id}",
            json={"reason": "Repeated request"},
            headers=admin_headers,
        )
        self.assertEqual(repeated.status_code, 409)

        self.assertEqual(
            self.client.get("/api/v1/observations", headers=admin_headers).json(),
            [],
        )
        self.assertEqual(
            self.client.get(
                f"/api/v1/observations/{observation_id}", headers=admin_headers
            ).status_code,
            404,
        )
        self.assertEqual(
            self.client.get(
                f"/api/v1/observations/{observation_id}/risk-score",
                headers=admin_headers,
            ).status_code,
            404,
        )
        self.assertEqual(
            self.client.get("/api/v1/dashboard/public").json()["total_observations"],
            0,
        )
        self.assertEqual(
            self.client.get("/api/v1/map/observations").json()["observations"],
            [],
        )
        self.assertEqual(self.client.get("/api/v1/public/summary").json()["total_observations"], 0)

        public_csv = self.client.get("/api/v1/exports/public.csv")
        internal_csv = self.client.get(
            "/api/v1/exports/observations.csv", headers=admin_headers
        )
        self.assertEqual(public_csv.status_code, 200)
        self.assertEqual(internal_csv.status_code, 200)
        self.assertNotIn(title, public_csv.text)
        self.assertNotIn(title, internal_csv.text)
        self.assertEqual(self.client.get("/api/v1/reports/public.pdf").status_code, 200)
        self.assertEqual(
            self.client.get("/api/v1/reports/internal.pdf", headers=admin_headers).status_code,
            200,
        )

        audit = self.client.get(
            f"/api/v1/observations/{observation_id}/audit",
            headers=admin_headers,
        )
        self.assertEqual(audit.status_code, 200)
        deletion_events = [
            event for event in audit.json() if event["event_type"] == "observation_deleted"
        ]
        self.assertEqual(len(deletion_events), 1)
        self.assertEqual(deletion_events[0]["new_state"], "deleted")
        self.assertEqual(
            self.client.get(
                f"/api/v1/observations/{observation_id}/audit",
                headers=monitor_headers,
            ).status_code,
            404,
        )

        with self.session_factory() as db:
            observation = db.get(Observation, observation_id)
            self.assertIsNotNone(observation)
            self.assertTrue(observation.is_deleted)
            self.assertIsNotNone(observation.deleted_at)
            self.assertIsNotNone(observation.deleted_by_id)
            self.assertEqual(
                observation.deletion_reason,
                "Duplicate controlled record entered during UAT",
            )
            self.assertEqual(
                db.scalar(
                    select(func.count())
                    .select_from(Evidence)
                    .where(Evidence.observation_id == observation_id)
                ),
                1,
            )
            self.assertEqual(
                db.scalar(
                    select(func.count())
                    .select_from(Validation)
                    .where(Validation.observation_id == observation_id)
                ),
                1,
            )
            self.assertEqual(
                db.scalar(
                    select(func.count())
                    .select_from(RiskScore)
                    .where(RiskScore.observation_id == observation_id)
                ),
                1,
            )

    def test_record_title_permissions_and_append_only_history(self) -> None:
        created, monitor_headers = self.create_as_monitor()
        self.assertEqual(created["record_title"], "Controlled heat risk observation")

        pending_update = self.client.patch(
            f"/api/v1/observations/{created['id']}",
            json={"record_title": "Heat risk clarification"},
            headers=monitor_headers,
        )
        self.assertEqual(pending_update.status_code, 200)
        self.assertEqual(pending_update.json()["record_title"], "Heat risk clarification")

        validator_headers = self.login("validator")
        validator_update = self.client.patch(
            f"/api/v1/observations/{created['id']}",
            json={"record_title": "Validator cannot rename"},
            headers=validator_headers,
        )
        self.assertEqual(validator_update.status_code, 403)
        observed = self.client.post(
            f"/api/v1/observations/{created['id']}/validation",
            json={"status": "observed", "comment": "Clarify the controlled evidence."},
            headers=validator_headers,
        )
        self.assertEqual(observed.status_code, 201)

        observed_update = self.client.patch(
            f"/api/v1/observations/{created['id']}",
            json={"record_title": "Heat risk evidence clarified"},
            headers=monitor_headers,
        )
        self.assertEqual(observed_update.status_code, 200)

        validated = self.client.post(
            f"/api/v1/observations/{created['id']}/validation",
            json={"status": "validated", "comment": "Clarification reviewed."},
            headers=validator_headers,
        )
        self.assertEqual(validated.status_code, 201)
        blocked_monitor = self.client.patch(
            f"/api/v1/observations/{created['id']}",
            json={"record_title": "Monitor blocked after validation"},
            headers=monitor_headers,
        )
        self.assertEqual(blocked_monitor.status_code, 403)

        admin_headers = self.login("admin")
        admin_update = self.client.patch(
            f"/api/v1/observations/{created['id']}",
            json={"record_title": "Administrator approved record title"},
            headers=admin_headers,
        )
        self.assertEqual(admin_update.status_code, 200)
        self.assertEqual(
            admin_update.json()["record_title"],
            "Administrator approved record title",
        )

        audit = self.client.get(
            f"/api/v1/observations/{created['id']}/audit",
            headers=admin_headers,
        ).json()
        title_events = [
            event for event in audit if event["event_type"] == "record_title_changed"
        ]
        self.assertEqual(len(title_events), 3)
        self.assertEqual(
            title_events[0]["previous_state"],
            "Controlled heat risk observation",
        )
        self.assertEqual(title_events[-1]["new_state"], "Administrator approved record title")
        self.assertEqual(title_events[-1]["actor_role"], "admin")
        self.assertTrue(title_events[-1]["occurred_at"].endswith("Z"))

    def test_validation_rules_history_and_append_only_audit(self) -> None:
        created, _ = self.create_as_monitor()
        validator_headers = self.login("validator")

        missing_comment = self.client.post(
            f"/api/v1/observations/{created['id']}/validation",
            json={"status": "observed"},
            headers=validator_headers,
        )
        self.assertEqual(missing_comment.status_code, 422)

        observed = self.client.post(
            f"/api/v1/observations/{created['id']}/validation",
            json={"status": "observed", "comment": "Clarify evidence capture time."},
            headers=validator_headers,
        )
        self.assertEqual(observed.status_code, 201)
        self.assertEqual(observed.json()["previous_status"], "pending")
        self.assertIn("does not constitute a medical diagnosis", observed.json()["methodological_notice"])

        validated = self.client.post(
            f"/api/v1/observations/{created['id']}/validation",
            json={"status": "validated", "comment": "Clarification reviewed."},
            headers=validator_headers,
        )
        self.assertEqual(validated.status_code, 201)
        invalid_transition = self.client.post(
            f"/api/v1/observations/{created['id']}/validation",
            json={"status": "rejected", "comment": "Too late."},
            headers=validator_headers,
        )
        self.assertEqual(invalid_transition.status_code, 409)

        audit = self.client.get(
            f"/api/v1/observations/{created['id']}/audit",
            headers=validator_headers,
        )
        event_types = [event["event_type"] for event in audit.json()]
        self.assertIn("observation_created", event_types)
        self.assertEqual(event_types.count("validation_created"), 2)
        self.assertEqual(event_types.count("status_changed"), 2)
        self.assertEqual(
            self.client.patch(
                f"/api/v1/observations/{created['id']}/audit",
                json={},
                headers=validator_headers,
            ).status_code,
            405,
        )
        with self.session_factory() as db:
            self.assertEqual(
                db.scalar(select(func.count()).select_from(Validation)),
                2,
            )

    def test_administrator_reuses_validation_rules_and_records_audit(self) -> None:
        created, _ = self.create_as_monitor()
        admin_headers = self.login("admin")

        missing_comment = self.client.post(
            f"/api/v1/observations/{created['id']}/validation",
            json={"status": "observed"},
            headers=admin_headers,
        )
        self.assertEqual(missing_comment.status_code, 422)

        observed = self.client.post(
            f"/api/v1/observations/{created['id']}/validation",
            json={"status": "observed", "comment": "Administrative methodological review."},
            headers=admin_headers,
        )
        self.assertEqual(observed.status_code, 201)
        validated = self.client.post(
            f"/api/v1/observations/{created['id']}/validation",
            json={"status": "validated", "comment": "Controlled clarification accepted."},
            headers=admin_headers,
        )
        self.assertEqual(validated.status_code, 201)

        rejected_record, _ = self.create_as_monitor()
        rejected = self.client.post(
            f"/api/v1/observations/{rejected_record['id']}/validation",
            json={"status": "rejected", "comment": "Minimum evidence requirements not met."},
            headers=admin_headers,
        )
        self.assertEqual(rejected.status_code, 201)

        audit = self.client.get(
            f"/api/v1/observations/{created['id']}/audit",
            headers=admin_headers,
        )
        validation_events = [
            event
            for event in audit.json()
            if event["event_type"] == "validation_created"
        ]
        self.assertEqual(len(validation_events), 2)
        self.assertTrue(all(event["actor_role"] == "admin" for event in validation_events))

    def test_risk_formula_bands_version_and_recalculation(self) -> None:
        self.assertEqual(calculate_risk(1, 1, 1), (3, "low"))
        self.assertEqual(calculate_risk(2, 2, 2), (6, "moderate"))
        self.assertEqual(calculate_risk(3, 3, 1), (7, "moderate"))
        self.assertEqual(calculate_risk(3, 3, 3), (9, "high"))
        self.assertEqual(calculate_risk(4, 4, 3), (11, "critical"))
        with self.assertRaises(ValueError):
            calculate_risk(0, 2, 2)

        created, monitor_headers = self.create_as_monitor()
        first = self.client.get(
            f"/api/v1/observations/{created['id']}/risk-score",
            headers=monitor_headers,
        )
        self.assertEqual(first.status_code, 200)
        self.assertEqual(first.json()["risk_score"], 11)
        self.assertEqual(first.json()["risk_level"], "critical")
        self.assertEqual(first.json()["formula_version"], METHODOLOGY_VERSION)
        self.assertFalse(first.json()["is_clinical_diagnosis"])

        updated = self.client.patch(
            f"/api/v1/observations/{created['id']}",
            json={"hazard": 1, "exposure": 1, "vulnerability": 1},
            headers=monitor_headers,
        )
        self.assertEqual(updated.status_code, 200)
        second = self.client.get(
            f"/api/v1/observations/{created['id']}/risk-score",
            headers=monitor_headers,
        )
        self.assertEqual(second.json()["risk_score"], 3)
        self.assertIn("1 hazard + 1 exposure + 1 vulnerability = 3", second.json()["explanation"])
        with self.session_factory() as db:
            self.assertEqual(
                db.scalar(select(func.count()).select_from(RiskScore)),
                2,
            )

    def test_timezone_is_territory_configured_and_database_timestamp_is_utc(self) -> None:
        created, _ = self.create_as_monitor()
        self.assertEqual(created["observed_at"], "2026-07-26T20:00:00Z")
        with self.session_factory() as db:
            observation = db.get(Observation, created["id"])
            self.assertEqual(observation.observed_at, datetime(2026, 7, 26, 20, 0))


class DemoUserBootstrapTests(unittest.TestCase):
    def test_manual_demo_user_bootstrap_is_local_idempotent_and_defines_four_roles(self) -> None:
        engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(engine)
        factory = sessionmaker(bind=engine)
        try:
            with factory() as db:
                first = bootstrap_demo_users(db, app_env="test")
                second = bootstrap_demo_users(db, app_env="test")
                self.assertEqual(len(first["created"]), 3)
                self.assertEqual(len(second["retained_without_password_reset"]), 3)
                reset = bootstrap_demo_users(
                    db,
                    app_env="test",
                    reset_passwords=True,
                )
                self.assertEqual(len(reset["passwords_reset"]), 2)
                validator = db.scalar(select(User).where(User.username == "demo-validator"))
                self.assertFalse(validator.is_active)
                reactivated = bootstrap_demo_users(
                    db,
                    app_env="test",
                    reset_passwords=True,
                    validator_enabled=True,
                )
                self.assertEqual(len(reactivated["passwords_reset"]), 3)
                db.refresh(validator)
                self.assertTrue(validator.is_active)
                self.assertEqual(
                    set(db.scalars(select(Role.name))),
                    {"admin", "monitor", "validator", "public"},
                )
                self.assertEqual(
                    db.scalar(select(func.count()).select_from(User)),
                    3,
                )
            with factory() as db:
                with self.assertRaises(RuntimeError):
                    bootstrap_demo_users(db, app_env="production")
        finally:
            engine.dispose()


if __name__ == "__main__":
    unittest.main()
