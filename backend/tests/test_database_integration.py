"""Real PostgreSQL/Neon smoke test; opt in with RUN_DATABASE_INTEGRATION=1."""

import asyncio
import os
import unittest
from uuid import UUID, uuid4

from app.db.models import Usuario
from app.db.session import AsyncSessionLocal, check_database_connection, engine
from app.main import app
from fastapi.testclient import TestClient
from sqlalchemy import delete


@unittest.skipUnless(
    os.getenv("RUN_DATABASE_INTEGRATION") == "1",
    "requiere PostgreSQL externo; use RUN_DATABASE_INTEGRATION=1",
)
class DatabaseIntegrationTests(unittest.TestCase):
    def test_neon_and_authenticated_api_flow(self):
        connection = asyncio.run(check_database_connection())
        self.assertTrue(connection["select_1"])
        if connection["provider"] == "Neon":
            self.assertTrue(connection["ssl"])

        carnet = f"T{uuid4().hex[:10]}"
        password = f"TestA1{uuid4().hex[:10]}"
        created_user_id: UUID | None = None

        try:
            with TestClient(app) as client:
                health = client.get("/api/v1/plates/health")
                self.assertEqual(health.status_code, 200)

                registration = client.post(
                    "/api/auth/register",
                    json={
                        "nombre": "Prueba",
                        "apellido_paterno": "Integracion",
                        "carnet": carnet,
                        "contrasena": password,
                    },
                )
                self.assertEqual(registration.status_code, 201, registration.text)
                created_user_id = UUID(registration.json()["user"]["id"])

                login = client.post(
                    "/api/auth/login",
                    json={"carnet": carnet, "contrasena": password},
                )
                self.assertEqual(login.status_code, 200, login.text)

                profile = client.get(
                    "/api/auth/me",
                    headers={"Authorization": f"Bearer {login.json()['token']}"},
                )
                self.assertEqual(profile.status_code, 200, profile.text)
                self.assertEqual(profile.json()["carnet"], carnet)
        finally:
            if created_user_id is not None:
                asyncio.run(self._remove_test_user(created_user_id))

    async def _remove_test_user(self, user_id: UUID) -> None:
        try:
            async with AsyncSessionLocal() as session:
                await session.execute(delete(Usuario).where(Usuario.id == user_id))
                await session.commit()
        finally:
            await engine.dispose()


if __name__ == "__main__":
    unittest.main()
