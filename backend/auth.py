# backend/auth.py
import os
from fastapi import Header, HTTPException
from jose import jwt, JWTError, ExpiredSignatureError

SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")


def get_current_user(authorization: str = Header(...)) -> dict:
    """Validate Supabase JWT and return the decoded payload."""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail={"code": "UNAUTHORIZED", "message": "Missing Bearer token", "details": None})

    token = authorization.removeprefix("Bearer ").strip()
    try:
        payload = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
        )
        return payload  # contains "sub" (user UUID), "email", "role"
    except ExpiredSignatureError:
        raise HTTPException(
            status_code=401,
            detail={"code": "TOKEN_EXPIRED", "message": "Token expired", "details": None},
        )
    except JWTError:
        raise HTTPException(
            status_code=401,
            detail={"code": "UNAUTHORIZED", "message": "Invalid token", "details": None},
        )
