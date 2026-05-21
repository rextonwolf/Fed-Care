import os

from jose import jwt
from datetime import datetime
from datetime import timedelta


SECRET_KEY = os.getenv("JWT_SECRET_KEY", "SUPER_SECRET_ENTERPRISE_KEY")

ALGORITHM = "HS256"


def create_access_token(data):

    to_encode = data.copy()

    expire = datetime.utcnow() + timedelta(hours=12)

    to_encode.update({
        "exp": expire
    })

    return jwt.encode(
        to_encode,
        SECRET_KEY,
        algorithm=ALGORITHM
    )


def decode_token(token):

    return jwt.decode(
        token,
        SECRET_KEY,
        algorithms=[ALGORITHM]
    )