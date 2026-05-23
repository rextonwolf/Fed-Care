"""
In-memory demo users for JWT login.
Passwords are loaded from environment variables — override in production.
"""

from backend.config import settings


def _build_users_db() -> dict:
    return {
        "admin": {
            "username": "admin",
            "password": settings.auth_admin_password,
            "role": "admin",
        },
        "doctor": {
            "username": "doctor",
            "password": settings.auth_doctor_password,
            "role": "doctor",
        },
        "analyst": {
            "username": "analyst",
            "password": settings.auth_analyst_password,
            "role": "analyst",
        },
    }


users_db = _build_users_db()
