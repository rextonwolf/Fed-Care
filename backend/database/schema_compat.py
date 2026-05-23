"""
Lightweight schema compatibility for existing PostgreSQL deployments.
Ensures prediction_logs columns required by the ORM exist before analytics queries run.
"""

from sqlalchemy import inspect
from sqlalchemy import text
from sqlalchemy.engine import Engine


def ensure_schema_compat(engine: Engine) -> None:
    """
    Add missing columns when upgrading without Alembic.
    Idempotent on PostgreSQL (IF NOT EXISTS).
    """
    inspector = inspect(engine)

    if not inspector.has_table("prediction_logs"):
        return

    columns = {col["name"] for col in inspector.get_columns("prediction_logs")}

    with engine.begin() as conn:
        if "patient_id" not in columns:
            conn.execute(
                text(
                    "ALTER TABLE prediction_logs "
                    "ADD COLUMN IF NOT EXISTS patient_id INTEGER"
                )
            )
        if "source" not in columns:
            conn.execute(
                text(
                    "ALTER TABLE prediction_logs "
                    "ADD COLUMN IF NOT EXISTS source VARCHAR(32) "
                    "DEFAULT 'manual'"
                )
            )
