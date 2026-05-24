"""In-memory demo users for JWT login.

The existing auth flow stays intact; this simply mirrors the seeded user set so
the current `/login` endpoint continues to work without redesigning auth.
"""

from backend.database.seed_data import build_users_db


users_db = build_users_db()
