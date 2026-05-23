"""
Central application configuration for the Federated Healthcare AI backend.

Environment variables are loaded with python-dotenv from (in order, without
overriding variables already set by the OS / Docker / CI):

  1. Project root `.env`  (monorepo / docker-compose)
  2. `backend/.env`       (local API development)

In production, prefer injecting secrets via Docker, Kubernetes, or your secrets
manager rather than committing `.env` files.
"""

from __future__ import annotations

import os
import warnings
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv


# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

BACKEND_ROOT = Path(__file__).resolve().parent
PROJECT_ROOT = BACKEND_ROOT.parent
API_ROOT = BACKEND_ROOT / "api"

# Load dotenv files; later files do not override existing env vars (Docker wins)
load_dotenv(PROJECT_ROOT / ".env", override=False)
load_dotenv(BACKEND_ROOT / ".env", override=False)

# Defaults — safe for local dev only; override via .env in real deployments
_DEFAULT_JWT_SECRET = "change-me-in-development-only"
_DEFAULT_DATABASE_URL = (
    "postgresql://postgres:postgres@localhost:5432/fedhealth_ai"
)


def _env_bool(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in ("1", "true", "yes", "on")


def _env_int(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None:
        return default
    try:
        return int(raw)
    except ValueError:
        return default


class Settings:
    """
    Typed settings facade over process environment variables.
    Import `settings` from this module rather than calling os.getenv in app code.
    """

    # --- Application metadata ---
    @property
    def app_title(self) -> str:
        return os.getenv("APP_TITLE", "Federated Healthcare AI API")

    @property
    def app_version(self) -> str:
        return os.getenv("APP_VERSION", "1.0.0")

    @property
    def environment(self) -> str:
        """development | staging | production"""
        return os.getenv("ENVIRONMENT", "development").strip().lower()

    @property
    def debug(self) -> bool:
        return _env_bool("DEBUG", default=self.environment == "development")

    # --- PostgreSQL (SQLAlchemy) ---
    @property
    def database_url(self) -> str:
        """
        SQLAlchemy connection URL.
        Example: postgresql://user:password@host:5432/fedhealth_ai
        """
        return os.getenv("DATABASE_URL", _DEFAULT_DATABASE_URL)

    # --- JWT authentication ---
    @property
    def jwt_secret_key(self) -> str:
        """Signing key for access tokens — MUST be strong in production."""
        return os.getenv("JWT_SECRET_KEY", _DEFAULT_JWT_SECRET)

    @property
    def jwt_algorithm(self) -> str:
        return os.getenv("JWT_ALGORITHM", "HS256")

    @property
    def jwt_expire_hours(self) -> int:
        return _env_int("JWT_EXPIRE_HOURS", 12)

    # --- CORS (FastAPI) ---
    @property
    def cors_origins_raw(self) -> str:
        """
        Comma-separated allowed origins, or '*' for all (dev only).
        Example: http://localhost:3000,http://127.0.0.1:3000
        """
        return os.getenv("CORS_ORIGINS", "*")

    @property
    def cors_origins_list(self) -> list[str]:
        raw = self.cors_origins_raw.strip()
        if raw == "*":
            return ["*"]
        return [o.strip() for o in raw.split(",") if o.strip()]

    # --- Demo user passwords (replace in production / use IdP) ---
    @property
    def auth_admin_password(self) -> str:
        return os.getenv("AUTH_ADMIN_PASSWORD", "admin123")

    @property
    def auth_doctor_password(self) -> str:
        return os.getenv("AUTH_DOCTOR_PASSWORD", "doctor123")

    @property
    def auth_analyst_password(self) -> str:
        return os.getenv("AUTH_ANALYST_PASSWORD", "analyst123")

    # --- ML artifact paths (relative to backend/ unless absolute) ---
    @property
    def model_path(self) -> str:
        return os.getenv("MODEL_PATH", "models/global_federated_model.pth")

    @property
    def scaler_path(self) -> str:
        return os.getenv("SCALER_PATH", "scalers/scaler.joblib")

    @property
    def feature_names_path(self) -> str:
        return os.getenv("FEATURE_NAMES_PATH", "scalers/feature_names.joblib")

    @property
    def feature_medians_path(self) -> str:
        return os.getenv("FEATURE_MEDIANS_PATH", "scalers/feature_medians.joblib")

    @property
    def default_model_version(self) -> str:
        return os.getenv("DEFAULT_MODEL_VERSION", "FTTransformer_v1")


def _validate(settings: Settings) -> None:
    """Warn when insecure defaults are used outside local development."""
    if settings.environment == "production":
        if settings.jwt_secret_key == _DEFAULT_JWT_SECRET:
            warnings.warn(
                "JWT_SECRET_KEY is using the development default in production. "
                "Set a strong secret via environment variables.",
                stacklevel=2,
            )
        if settings.cors_origins_raw.strip() == "*":
            warnings.warn(
                "CORS_ORIGINS is '*' in production. Restrict to your frontend origins.",
                stacklevel=2,
            )


@lru_cache
def get_settings() -> Settings:
    instance = Settings()
    _validate(instance)
    return instance


def resolve_artifact_path(path: str) -> Path:
    """
    Resolve ML artifact paths relative to backend/ (supports legacy ../ prefixes).
    """
    p = Path(path)
    if p.is_absolute():
        return p
    normalized = path.replace("\\", "/")
    if normalized.startswith("../"):
        return (BACKEND_ROOT / normalized[3:]).resolve()
    return (BACKEND_ROOT / normalized).resolve()


# Singleton used across the backend
settings = get_settings()
