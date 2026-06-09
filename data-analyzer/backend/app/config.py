from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    upload_dir: Path = Path("/tmp/analyzer-uploads")
    dataset_ttl_seconds: int = 3600
    cleanup_interval_seconds: int = 300
    max_upload_bytes: int = 100 * 1024 * 1024
    preview_default_rows: int = 50

    model_config = SettingsConfigDict(
        env_prefix="ANALYZER_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
settings.upload_dir.mkdir(parents=True, exist_ok=True)
