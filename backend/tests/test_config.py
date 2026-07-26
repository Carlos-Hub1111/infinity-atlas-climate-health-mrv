import unittest

from app.core.config import Settings


class SeedEndpointConfigurationTests(unittest.TestCase):
    def test_seed_endpoint_is_enabled_for_local_development(self) -> None:
        settings = Settings(app_env="local")

        self.assertTrue(settings.admin_seed_endpoint_enabled)

    def test_seed_endpoint_is_disabled_in_production(self) -> None:
        settings = Settings(app_env="production")

        self.assertFalse(settings.admin_seed_endpoint_enabled)


if __name__ == "__main__":
    unittest.main()
