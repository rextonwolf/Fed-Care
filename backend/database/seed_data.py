"""Bootstrap data for hospitals and seeded demo users."""

from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from backend.database.models import Hospital
from backend.database.models import Patient
from backend.database.models import PredictionLog
from backend.database.models import User


DEFAULT_HOSPITALS = [
    {"name": "hospital1", "location": None},
    {"name": "hospital2", "location": None},
]

DEFAULT_USERS = [
    {
        "username": "admin",
        "password": "admin-123",
        "role": "admin",
        "hospital_name": None,
        "passwords": ["admin-123", "admin123"],
    },
    {
        "username": "hospital1",
        "password": "hospital1-123",
        "role": "doctor",
        "hospital_name": "hospital1",
        "passwords": ["hospital1-123"],
    },
    {
        "username": "hospital2",
        "password": "hospital2-123",
        "role": "doctor",
        "hospital_name": "hospital2",
        "passwords": ["hospital2-123"],
    },
]


def build_users_db() -> dict[str, dict[str, Any]]:
    """Return the in-memory auth map used by the existing login endpoint."""
    users: dict[str, dict[str, Any]] = {
        "admin": {
            "username": "admin",
            "password": "admin-123",
            "passwords": ["admin-123", "admin123"],
            "role": "admin",
        },
        "doctor": {
            "username": "doctor",
            "password": "doctor123",
            "passwords": ["doctor123"],
            "role": "doctor",
        },
        "analyst": {
            "username": "analyst",
            "password": "analyst123",
            "passwords": ["analyst123"],
            "role": "analyst",
        },
    }

    for row in DEFAULT_USERS:
        users[row["username"]] = {
            "username": row["username"],
            "password": row["password"],
            "passwords": row["passwords"],
            "role": row["role"],
        }

    return users


def _get_or_create_hospital(db: Session, name: str, location: str | None = None) -> Hospital:
    hospital = db.query(Hospital).filter(Hospital.name == name).first()
    if hospital:
        return hospital

    hospital = Hospital(name=name, location=location)
    db.add(hospital)
    db.flush()
    return hospital


def _ensure_hospital_columns(db: Session) -> Hospital:
    hospital = db.query(Hospital).order_by(Hospital.id.asc()).first()
    if hospital:
        return hospital
    return _get_or_create_hospital(db, DEFAULT_HOSPITALS[0]["name"], DEFAULT_HOSPITALS[0]["location"])


def seed_reference_data(db: Session) -> dict[str, int]:
    """Seed hospitals and demo users and backfill existing records with a hospital."""
    hospitals = {}
    created_hospitals = 0
    created_users = 0

    for row in DEFAULT_HOSPITALS:
        hospital = db.query(Hospital).filter(Hospital.name == row["name"]).first()
        if hospital is None:
            hospital = Hospital(**row)
            db.add(hospital)
            db.flush()
            created_hospitals += 1

        # For nicer display in the demo dashboard, map technical keys to human labels
        DISPLAY_MAP = {
            "hospital1": "Hospital 1",
            "hospital2": "Hospital 2",
        }
        display_name = DISPLAY_MAP.get(row["name"], row["name"])
        # Avoid unique constraint conflicts: if a hospital with the display name
        # already exists, prefer that row instead of renaming the current one.
        existing_display = db.query(Hospital).filter(Hospital.name == display_name).first()
        if existing_display and existing_display.id != hospital.id:
            hospital = existing_display
        else:
            hospital.name = display_name
            db.add(hospital)
            db.flush()

        hospitals[row["name"]] = hospital

    admin_hospital = _ensure_hospital_columns(db)

    # Rename legacy seeded usernames to clearer demo names (idempotent)
    USERNAME_RENAMES = {
        "doctor1": ("hospital1", "hospital1-123"),
        "doctor2": ("hospital2", "hospital2-123"),
    }

    for old_uname, (new_uname, new_pw) in USERNAME_RENAMES.items():
        existing = db.query(User).filter(User.username == old_uname).first()
        conflict = db.query(User).filter(User.username == new_uname).first()
        if existing and not conflict:
            existing.username = new_uname
            existing.password = new_pw
            db.add(existing)
            db.flush()

    # Remove legacy demo user rows if they remain (we prefer the new hospitalX usernames)
    for legacy_uname in ("doctor1", "doctor2"):
        legacy_user = db.query(User).filter(User.username == legacy_uname).first()
        if legacy_user:
            db.delete(legacy_user)
    db.flush()

    # Merge any legacy hospital rows (e.g. name 'hospital1') into the canonical
    # display-named hospital (e.g. 'Hospital 1') to avoid duplicates in the demo.
    for key, display in {"hospital1": "Hospital 1", "hospital2": "Hospital 2"}.items():
        canonical = hospitals.get(key)
        if not canonical:
            continue
        # find legacy rows that still use the original key
        legacy_rows = db.query(Hospital).filter(Hospital.name == key).all()
        for legacy in legacy_rows:
            if legacy.id == canonical.id:
                continue
            # migrate references
            db.query(Patient).filter(Patient.hospital_id == legacy.id).update({"hospital_id": canonical.id})
            db.query(PredictionLog).filter(PredictionLog.hospital_id == legacy.id).update({"hospital_id": canonical.id})
            db.query(User).filter(User.hospital_id == legacy.id).update({"hospital_id": canonical.id})
            db.delete(legacy)
        db.flush()

    for row in DEFAULT_USERS:
        hospital = hospitals.get(row["hospital_name"]) if row["hospital_name"] else None
        user = db.query(User).filter(User.username == row["username"]).first()
        if user is None:
            user = User(
                username=row["username"],
                password=row["password"],
                role=row["role"],
                hospital_id=hospital.id if hospital else None,
            )
            db.add(user)
            created_users += 1
        else:
            user.password = row["password"]
            user.role = row["role"]
            user.hospital_id = hospital.id if hospital else None

    default_hospital_id = admin_hospital.id

    patient_rows = (
        db.query(Patient)
        .filter(Patient.hospital_id.is_(None))
        .all()
    )
    for patient in patient_rows:
        patient.hospital_id = default_hospital_id

    log_rows = (
        db.query(PredictionLog)
        .filter(PredictionLog.hospital_id.is_(None))
        .all()
    )
    for log in log_rows:
        log.hospital_id = default_hospital_id

    db.commit()
    return {
        "hospitals": created_hospitals,
        "users": created_users,
        "backfilled_patients": len(patient_rows),
        "backfilled_logs": len(log_rows),
    }