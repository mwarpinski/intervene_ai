import os
import datetime
import httpx
import jwt
import bcrypt
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database import get_db
from app import models

# JWT configuration
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "intervene_ai_jwt_secret_key_2026_safe")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 30

# Cloudflare Turnstile Keys (Standard Cloudflare test secret key default)
CLOUDFLARE_TURNSTILE_SECRET_KEY = os.getenv(
    "CLOUDFLARE_TURNSTILE_SECRET_KEY", "1x0000000000000000000000000000000AA"
)
DISABLE_CAPTCHA = os.getenv("DISABLE_CAPTCHA", "false").lower() in ("true", "1", "yes")

security = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    """Hashes a plain text password securely using bcrypt with salt."""
    if isinstance(password, str):
        pwd_bytes = password.encode('utf-8')
    else:
        pwd_bytes = password
    # Truncate to 72 bytes if needed (bcrypt standard limit)
    pwd_bytes = pwd_bytes[:72]
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(pwd_bytes, salt)
    return hashed.decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain text password against a stored bcrypt hash."""
    if not plain_password or not hashed_password:
        return False
    try:
        pwd_bytes = plain_password.encode('utf-8')[:72]
        hash_bytes = hashed_password.encode('utf-8')
        return bcrypt.checkpw(pwd_bytes, hash_bytes)
    except Exception as e:
        print(f"[Password Verification Error]: {e}")
        return False


def create_access_token(user_id: str, email: str, expires_delta: Optional[datetime.timedelta] = None) -> str:
    """Generates a signed JWT access token containing the user ID and email."""
    if expires_delta:
        expire = datetime.datetime.utcnow() + expires_delta
    else:
        expire = datetime.datetime.utcnow() + datetime.timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)

    payload = {
        "sub": user_id,
        "email": email,
        "exp": expire,
        "iat": datetime.datetime.utcnow()
    }
    encoded_jwt = jwt.encode(payload, JWT_SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


async def verify_turnstile_captcha(captcha_token: Optional[str], remote_ip: Optional[str] = None) -> bool:
    """
    Verifies a Cloudflare Turnstile response token with Cloudflare's siteverify endpoint.
    Returns True if valid, False otherwise. Supports local dev bypasses and standard Cloudflare test keys.
    """
    if DISABLE_CAPTCHA:
        return True

    if not captcha_token:
        return False

    # Dev / offline bypass tokens
    if captcha_token in ("local_dev_bypass", "test_token", "1x0000000000000000000000000000000AA"):
        return True

    # Call Cloudflare Turnstile Verification API
    turnstile_url = "https://challenges.cloudflare.com/turnstile/v0/siteverify"
    payload = {
        "secret": CLOUDFLARE_TURNSTILE_SECRET_KEY,
        "response": captcha_token
    }
    if remote_ip:
        payload["remoteip"] = remote_ip

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            res = await client.post(turnstile_url, data=payload)
            data = res.json()
            if data.get("success", False):
                return True
            else:
                print(f"[Turnstile Verification Failed]: {data}")
                if CLOUDFLARE_TURNSTILE_SECRET_KEY == "1x0000000000000000000000000000000AA":
                    return True
                return False
    except Exception as e:
        print(f"[Turnstile Network Error]: {e}")
        return True


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> Optional[models.User]:
    """Dependency to retrieve current authenticated user from JWT bearer token."""
    if not credentials:
        return None

    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            return None
    except jwt.PyJWTError:
        return None

    user = db.query(models.User).filter(models.User.id == user_id).first()
    return user
