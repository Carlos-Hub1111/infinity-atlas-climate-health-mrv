import unittest

from fastapi.testclient import TestClient

from app.core.config import Settings
from app.core.config import settings as app_settings
from app.main import app


class SeedEndpointConfigurationTests(unittest.TestCase):
    def test_seed_endpoint_is_enabled_for_local_development(self) -> None:
        settings = Settings(app_env="local")

        self.assertTrue(settings.admin_seed_endpoint_enabled)

    def test_seed_endpoint_is_disabled_in_production(self) -> None:
        settings = Settings(app_env="production")

        self.assertFalse(settings.admin_seed_endpoint_enabled)

    def test_seed_endpoint_returns_not_found_in_production(self) -> None:
        original_environment = app_settings.app_env
        app_settings.app_env = "production"
        try:
            response = TestClient(app).post("/api/v1/admin/seed")
        finally:
            app_settings.app_env = original_environment

        self.assertEqual(response.status_code, 404)


if __name__ == "__main__":
    unittest.main()
