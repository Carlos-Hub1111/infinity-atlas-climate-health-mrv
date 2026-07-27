import unittest

from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.bootstrap import REFERENCE_PROJECT_NAME, bootstrap_reference_data
from app.core.config import Settings
from app.main import app
from app.models import Base, Project

OFFICIAL_SOLUTION_NAME = "InfinityAtlas Climate & Health MRV Toolkit"
OFFICIAL_REFERENCE_PROJECT_NAME = "InfinityAtlas Climate & Health MRV Prototype"


class BrandIdentityTests(unittest.TestCase):
    def test_backend_api_and_reference_project_use_joined_brand_name(self) -> None:
        self.assertEqual(Settings().app_name, OFFICIAL_SOLUTION_NAME)
        self.assertEqual(app.title, OFFICIAL_SOLUTION_NAME)
        self.assertEqual(REFERENCE_PROJECT_NAME, OFFICIAL_REFERENCE_PROJECT_NAME)

        engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(engine)
        session_factory = sessionmaker(bind=engine, autoflush=False, autocommit=False)
        try:
            with session_factory() as db:
                bootstrap_reference_data(db)
                project = db.scalar(select(Project))
                self.assertEqual(project.name, OFFICIAL_REFERENCE_PROJECT_NAME)
                self.assertNotIn("Infinity Atlas", project.name)
        finally:
            engine.dispose()


if __name__ == "__main__":
    unittest.main()
