import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone

import jwt
from app.config.settings import settings

ALGORITHM = "HS256"
PBKDF2_ITERATIONS = 600_000
LEGACY_PBKDF2_ITERATIONS = 100_000


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    password_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        PBKDF2_ITERATIONS,
    ).hex()
    return f"pbkdf2_sha256${PBKDF2_ITERATIONS}${salt}${password_hash}"


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        parts = stored_hash.split("$")
        if len(parts) == 4 and parts[0] == "pbkdf2_sha256":
            iterations = int(parts[1])
            salt, current_hash = parts[2], parts[3]
        elif len(parts) == 2:
            iterations = LEGACY_PBKDF2_ITERATIONS
            salt, current_hash = parts
        else:
            return False
        if iterations < LEGACY_PBKDF2_ITERATIONS or iterations > 2_000_000:
            return False
    except (TypeError, ValueError):
        return False

    candidate_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        iterations,
    ).hex()
    return hmac.compare_digest(candidate_hash, current_hash)


def password_hash_needs_upgrade(stored_hash: str) -> bool:
    try:
        algorithm, iterations, _salt, _digest = stored_hash.split("$", 3)
        return algorithm != "pbkdf2_sha256" or int(iterations) < PBKDF2_ITERATIONS
    except (AttributeError, TypeError, ValueError):
        return True


def create_access_token(subject: str) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    payload = {
        "sub": subject,
        "exp": expires_at,
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)
