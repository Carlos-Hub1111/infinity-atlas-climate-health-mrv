import unittest
from unittest.mock import patch

from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.bootstrap import SYNTHETIC_EVIDENCE_MARKER_URI
from app.models import Base, Evidence, Observation, RiskScore, Validation
from app.seed import seed_demo_data


class SyntheticSeedTests(unittest.TestCase):
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

    def test_seed_is_idempotent_pending_and_has_no_fictitious_external_link(self) -> None:
        with patch("app.seed.SessionLocal", self.session_factory):
            first = seed_demo_data()
            second = seed_demo_data()

        with self.session_factory() as db:
            observation = db.scalar(select(Observation))
            evidence = db.scalar(select(Evidence))

            self.assertTrue(first["created"])
            self.assertFalse(second["created"])
            self.assertEqual(observation.status, "pending")
            self.assertEqual(observation.data_provenance, "synthetic_demo")
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


if __name__ == "__main__":
    unittest.main()
