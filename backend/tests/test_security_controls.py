import hashlib
from types import SimpleNamespace

from app.api.v1 import auth, barrier, plates
from app.config.settings import settings
from app.core.security import (
    PBKDF2_ITERATIONS,
    hash_password,
    password_hash_needs_upgrade,
    verify_password,
)
from app.main import SecurityHeadersMiddleware
from app.schemas.device import DispositivoCreate, DispositivoUpdate
from fastapi import FastAPI
from fastapi.testclient import TestClient


def test_password_hash_uses_current_work_factor():
    encoded = hash_password("Password1")
    algorithm, iterations, _salt, _digest = encoded.split("$")
    assert algorithm == "pbkdf2_sha256"
    assert int(iterations) == PBKDF2_ITERATIONS
    assert verify_password("Password1", encoded)
    assert not verify_password("Wrong1", encoded)
    assert not password_hash_needs_upgrade(encoded)


def test_legacy_password_hash_is_accepted_and_marked_for_upgrade():
    salt = "legacy-salt"
    digest = hashlib.pbkdf2_hmac(
        "sha256", b"Password1", salt.encode(), 100_000
    ).hex()
    encoded = f"{salt}${digest}"
    assert verify_password("Password1", encoded)
    assert password_hash_needs_upgrade(encoded)


def test_webhook_rejects_unsafe_urls():
    common = {
        "nombre": "Entrada",
        "ubicacion": "Porteria",
        "tipo_dispositivo_id": "00000000-0000-0000-0000-000000000001",
    }
    for unsafe in (
        "file:///etc/passwd",
        "http://user:secret@example.test/hook",
        "http://example.test/hook#fragment",
        "http://169.254.169.254/latest/meta-data",
    ):
        try:
            DispositivoCreate(**common, webhook_url=unsafe)
        except ValueError:
            pass
        else:
            raise AssertionError(f"URL insegura aceptada: {unsafe}")
    assert DispositivoUpdate(webhook_url="https://example.test/hook").webhook_url


def test_sensitive_routes_require_authentication():
    app = FastAPI()
    app.state.fast_alpr_engine = SimpleNamespace()
    app.include_router(auth.router, prefix="/api/auth")
    app.include_router(barrier.router, prefix="/api/v1/barrier")
    app.include_router(plates.router, prefix="/api/v1/plates")
    client = TestClient(app)

    register = client.post(
        "/api/auth/register",
        json={
            "nombre": "Ataque",
            "apellido_paterno": "Prueba",
            "carnet": "9999999",
            "contrasena": "Password1",
            "rol": "ADMINISTRADOR",
        },
    )
    assert register.status_code == 401
    assert client.post("/api/v1/barrier/trigger", json={}).status_code == 401
    assert client.get("/api/v1/barrier/events").status_code == 401
    assert client.get("/api/v1/barrier/simulator").status_code == 401
    assert (
        client.post(
            "/api/v1/plates/analyze",
            files={"file": ("plate.jpg", b"image", "image/jpeg")},
        ).status_code
        == 401
    )


def test_cookie_authenticated_mutations_require_csrf_header_and_valid_origin():
    app = FastAPI()
    app.add_middleware(SecurityHeadersMiddleware)

    @app.post("/mutation")
    async def mutation():
        return {"ok": True}

    client = TestClient(app)
    client.cookies.set("session_token", "test-cookie")
    assert client.post("/mutation").status_code == 403
    assert (
        client.post(
            "/mutation",
            headers={
                "X-Requested-With": "XMLHttpRequest",
                "Origin": "https://attacker.invalid",
            },
        ).status_code
        == 403
    )
    assert (
        client.post(
            "/mutation",
            headers={
                "X-Requested-With": "XMLHttpRequest",
                "Origin": settings.ALLOWED_ORIGINS[0],
            },
        ).status_code
        == 200
    )
