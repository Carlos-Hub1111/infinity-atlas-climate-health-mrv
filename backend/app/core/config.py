from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Infinity Atlas Climate & Health MRV Toolkit"
    app_env: str = "local"
    database_url: str = "sqlite:///./local.db"
    auto_create_tables: bool = False
    auto_seed_demo_data: bool = False
    demo_data_is_synthetic: bool = True

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    @property
    def admin_seed_endpoint_enabled(self) -> bool:
        return self.app_env.lower() in {"local", "dev", "development", "test"}


settings = Settings()
