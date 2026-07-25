"""Verify DATABASE_URL with SELECT 1 without printing credentials."""

import asyncio
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.db.session import check_database_connection, engine


async def main() -> None:
    try:
        result = await check_database_connection()
        print(json.dumps(result, ensure_ascii=False))
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
