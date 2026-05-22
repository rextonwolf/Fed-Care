"""
JWT token creation and validation.
Secret key and algorithm are loaded from environment via config.settings.
"""

from datetime import datetime
from datetime import timedelta

from jose import jwt

from config import settings


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(hours=settings.jwt_expire_hours)
    to_encode.update({"exp": expire})

    return jwt.encode(
        to_encode,
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )


def decode_token(token: str) -> dict:
    return jwt.decode(
        token,
        settings.jwt_secret_key,
        algorithms=[settings.jwt_algorithm],
    )
