from fastapi.security import HTTPBearer
from fastapi.security import HTTPAuthorizationCredentials

from fastapi import Request
from fastapi import HTTPException

from auth.auth_handler import decode_token


class JWTBearer(HTTPBearer):

    async def __call__(self, request: Request):

        credentials: HTTPAuthorizationCredentials = await super().__call__(request)

        if credentials:

            try:

                payload = decode_token(
                    credentials.credentials
                )

                return payload

            except Exception:

                raise HTTPException(
                    status_code=403,
                    detail="Invalid token"
                )

        raise HTTPException(
            status_code=403,
            detail="Invalid authorization"
        )