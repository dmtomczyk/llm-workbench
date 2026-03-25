from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path
from typing import Any

import yaml
from pydantic import BaseModel, Field

PROJECT_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_CONFIG_PATH = PROJECT_ROOT / "backend" / "config" / "app.yaml"
ENV_PREFIX = "OAWCW__"


class AppMetaSettings(BaseModel):
    name: str = "BRIDGE"
    short_name: str = "BRIDGE"
    acronym_expansion: str = "Bridge for Reasoning, Interaction, Data, Guidance, and Execution"
    tagline: str = "Where LLMs, tools, and data meet"
    description: str = (
        "Single-user operator workspace for chat, workflows, datasets, connectors, and provider-driven automations."
    )
    env: str = "local"
    timezone: str = "America/New_York"


class ServerSettings(BaseModel):
    host: str = "0.0.0.0"
    port: int = 8080
    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:5173"])


class DatabaseSettings(BaseModel):
    url: str = "sqlite:///./data/app.db"


class StorageSettings(BaseModel):
    root_dir: str = "./data"
    imports_dir: str = "./data/imports"
    artifacts_dir: str = "./data/artifacts"
    exports_dir: str = "./data/exports"
    logs_dir: str = "./data/logs"


class SchedulerJobDefaults(BaseModel):
    misfire_grace_time: int = 300
    coalesce: bool = True


class SchedulerSettings(BaseModel):
    enabled: bool = True
    timezone: str = "America/New_York"
    max_concurrent_jobs: int = 1
    job_defaults: SchedulerJobDefaults = Field(default_factory=SchedulerJobDefaults)


class AuditSettings(BaseModel):
    inline_payload_limit_bytes: int = 65536
    redact_fields: list[str] = Field(default_factory=lambda: ["authorization", "api_key", "token", "password", "cookie"])


class PluginsSettings(BaseModel):
    directory: str = "./plugins"
    allow_reload: bool = True


class ImportsSettings(BaseModel):
    max_upload_size_mb: int = 100
    allowed_extensions: list[str] = Field(
        default_factory=lambda: ["csv", "xlsx", "json", "txt", "md", "docx", "pdf", "eml", "msg"]
    )


class ExportsSettings(BaseModel):
    default_formats: list[str] = Field(default_factory=lambda: ["markdown", "json"])


class Settings(BaseModel):
    app: AppMetaSettings = Field(default_factory=AppMetaSettings)
    server: ServerSettings = Field(default_factory=ServerSettings)
    database: DatabaseSettings = Field(default_factory=DatabaseSettings)
    storage: StorageSettings = Field(default_factory=StorageSettings)
    scheduler: SchedulerSettings = Field(default_factory=SchedulerSettings)
    audit: AuditSettings = Field(default_factory=AuditSettings)
    plugins: PluginsSettings = Field(default_factory=PluginsSettings)
    imports: ImportsSettings = Field(default_factory=ImportsSettings)
    exports: ExportsSettings = Field(default_factory=ExportsSettings)

    def resolve_path(self, value: str) -> Path:
        path = Path(value).expanduser()
        return path if path.is_absolute() else PROJECT_ROOT / path

    @property
    def plugin_dir(self) -> Path:
        return self.resolve_path(self.plugins.directory)

    @property
    def sqlite_path(self) -> Path | None:
        prefix = "sqlite:///"
        if not self.database.url.startswith(prefix):
            return None
        raw = self.database.url.removeprefix(prefix)
        return self.resolve_path(raw)

    @property
    def database_url_resolved(self) -> str:
        sqlite_path = self.sqlite_path
        if sqlite_path is not None:
            return f"sqlite:///{sqlite_path}"
        return self.database.url

    def ensure_storage_dirs(self) -> None:
        for raw_path in [
            self.storage.root_dir,
            self.storage.imports_dir,
            self.storage.artifacts_dir,
            self.storage.exports_dir,
            self.storage.logs_dir,
            self.plugins.directory,
        ]:
            self.resolve_path(raw_path).mkdir(parents=True, exist_ok=True)
        db_path = self.sqlite_path
        if db_path is not None:
            db_path.parent.mkdir(parents=True, exist_ok=True)


def _deep_merge(base: dict[str, Any], override: dict[str, Any]) -> dict[str, Any]:
    result = dict(base)
    for key, value in override.items():
        if isinstance(value, dict) and isinstance(result.get(key), dict):
            result[key] = _deep_merge(result[key], value)
        else:
            result[key] = value
    return result


def _coerce_env_value(raw: str) -> Any:
    lower = raw.lower()
    if lower in {"true", "false"}:
        return lower == "true"
    if raw.isdigit():
        return int(raw)
    if raw.startswith("[") or raw.startswith("{"):
        try:
            import json

            return json.loads(raw)
        except Exception:
            return raw
    if "," in raw:
        return [item.strip() for item in raw.split(",") if item.strip()]
    return raw


def _env_overrides() -> dict[str, Any]:
    overrides: dict[str, Any] = {}
    for key, value in os.environ.items():
        if not key.startswith(ENV_PREFIX):
            continue
        path = key.removeprefix(ENV_PREFIX).lower().split("__")
        cursor = overrides
        for part in path[:-1]:
            cursor = cursor.setdefault(part, {})
        cursor[path[-1]] = _coerce_env_value(value)
    return overrides


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    config_path = Path(os.environ.get("APP_CONFIG_FILE", DEFAULT_CONFIG_PATH)).expanduser()
    data: dict[str, Any] = {}
    if config_path.exists():
        with config_path.open("r", encoding="utf-8") as handle:
            data = yaml.safe_load(handle) or {}
    merged = _deep_merge(data, _env_overrides())
    return Settings.model_validate(merged)
