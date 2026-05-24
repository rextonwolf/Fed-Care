"""
Lightweight schema compatibility for existing PostgreSQL deployments.
Ensures hospital ownership columns exist before analytics and auth queries run.
"""

from sqlalchemy import inspect
from sqlalchemy import text
from sqlalchemy.engine import Engine


def ensure_schema_compat(engine: Engine) -> None:
    """
    Add missing columns when upgrading without Alembic.
    Idempotent on PostgreSQL (IF NOT EXISTS).
    """
    with engine.begin() as conn:
        inspector = inspect(conn)

        if inspector.has_table("patients"):
            patient_columns = {col["name"] for col in inspector.get_columns("patients")}
            if "hospital_id" not in patient_columns:
                conn.execute(
                    text(
                        "ALTER TABLE patients "
                        "ADD COLUMN IF NOT EXISTS hospital_id INTEGER"
                    )
                )

        if inspector.has_table("prediction_logs"):
            log_columns = {col["name"] for col in inspector.get_columns("prediction_logs")}
            if "patient_id" not in log_columns:
                conn.execute(
                    text(
                        "ALTER TABLE prediction_logs "
                        "ADD COLUMN IF NOT EXISTS patient_id INTEGER"
                    )
                )
            if "source" not in log_columns:
                conn.execute(
                    text(
                        "ALTER TABLE prediction_logs "
                        "ADD COLUMN IF NOT EXISTS source VARCHAR(32) "
                        "DEFAULT 'manual'"
                    )
                )
            if "hospital_id" not in log_columns:
                conn.execute(
                    text(
                        "ALTER TABLE prediction_logs "
                        "ADD COLUMN IF NOT EXISTS hospital_id INTEGER"
                    )
                )

        if inspector.has_table("users"):
            user_columns = {col["name"] for col in inspector.get_columns("users")}
            if "hospital_id" not in user_columns:
                conn.execute(
                    text(
                        "ALTER TABLE users "
                        "ADD COLUMN IF NOT EXISTS hospital_id INTEGER"
                    )
                )
