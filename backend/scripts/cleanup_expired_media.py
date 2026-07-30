"""Delete expired access evidence. Safe by default with --dry-run."""

import argparse
import asyncio
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.db.models import ArchivoMultimedia, MediaStatusEnum, MediaTypeEnum
from app.db.session import AsyncSessionLocal, engine
from app.services.cloudinary_storage import CloudinaryStorage
from app.services.storage import StorageError
from sqlalchemy import select


async def cleanup(dry_run: bool) -> tuple[int, int]:
    now = datetime.now(timezone.utc)
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(ArchivoMultimedia).where(
                ArchivoMultimedia.tipo.in_(
                    [MediaTypeEnum.ACCESS_ENTRY, MediaTypeEnum.ACCESS_EXIT]
                ),
                ArchivoMultimedia.expires_at.is_not(None),
                ArchivoMultimedia.expires_at <= now,
                ArchivoMultimedia.estado != MediaStatusEnum.DELETED,
            )
        )
        expired = list(result.scalars())
        if dry_run:
            return len(expired), 0

        deleted = 0
        storage = CloudinaryStorage()
        for media in expired:
            try:
                if media.public_id:
                    await asyncio.to_thread(storage.delete, media.public_id)
                if media.spool_path:
                    await asyncio.to_thread(
                        Path(media.spool_path).unlink, missing_ok=True
                    )
                media.estado = MediaStatusEnum.DELETED
                media.deleted_at = now
                media.spool_path = None
                media.ultimo_error = None
                deleted += 1
            except (StorageError, OSError):
                media.ultimo_error = "No se pudo eliminar evidencia vencida"
        await session.commit()
        return len(expired), deleted


async def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--dry-run", action="store_true", help="solo cuenta; no elimina recursos"
    )
    args = parser.parse_args()
    try:
        found, deleted = await cleanup(args.dry_run)
        print(f"vencidas={found} eliminadas={deleted} dry_run={args.dry_run}")
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
