import asyncio
import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

from app.api.v1.media import _authorize_media
from app.db.models import MediaTypeEnum, RoleEnum
from fastapi import HTTPException


class MediaPermissionTests(unittest.TestCase):
    def test_device_cannot_browse_media(self):
        media = SimpleNamespace(id=uuid4(), tipo=MediaTypeEnum.ACCESS_ENTRY)
        user = SimpleNamespace(id=uuid4(), rol=RoleEnum.DISPOSITIVO)
        with self.assertRaises(HTTPException) as raised:
            asyncio.run(_authorize_media(media, AsyncMock(), user))
        self.assertEqual(raised.exception.status_code, 403)

    def test_user_can_access_own_profile_photo(self):
        user_id = uuid4()
        media = SimpleNamespace(id=uuid4(), tipo=MediaTypeEnum.USER_PROFILE)
        db = AsyncMock()
        db.scalar.return_value = SimpleNamespace(id=user_id)
        user = SimpleNamespace(id=user_id, rol=RoleEnum.USUARIO)
        asyncio.run(_authorize_media(media, db, user))

    def test_idor_is_rejected(self):
        media = SimpleNamespace(id=uuid4(), tipo=MediaTypeEnum.USER_PROFILE)
        db = AsyncMock()
        db.scalar.return_value = SimpleNamespace(id=uuid4())
        user = SimpleNamespace(id=uuid4(), rol=RoleEnum.USUARIO)
        with self.assertRaises(HTTPException) as raised:
            asyncio.run(_authorize_media(media, db, user))
        self.assertEqual(raised.exception.status_code, 403)


if __name__ == "__main__":
    unittest.main()
