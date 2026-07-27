from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "InfinityAtlas Climate & Health MRV Toolkit"
    app_env: str = "local"
    database_url: str = "sqlite:///./local.db"
    auto_create_tables: bool = False
    auto_seed_demo_data: bool = False
    demo_data_is_synthetic: bool = True
    climate_api_timeout_seconds: float = 8.0
    climate_cache_ttl_seconds: int = 900
    jwt_secret_key: str | None = None
    jwt_algorithm: Literal["HS256"] = "HS256"
    jwt_access_token_expire_minutes: int = 60
    jwt_issuer: str = "infinityatlas-local"
    demo_admin_password: str | None = None
    demo_monitor_password: str | None = None
    demo_validator_password: str | None = None

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def admin_seed_endpoint_enabled(self) -> bool:
        return self.app_env.lower() in {"local", "dev", "development", "test"}

    @property
    def jwt_is_configured(self) -> bool:
        return bool(
            self.jwt_secret_key
            and not self.jwt_secret_key.startswith("<")
            and len(self.jwt_secret_key) >= 32
        )


settings = Settings()
