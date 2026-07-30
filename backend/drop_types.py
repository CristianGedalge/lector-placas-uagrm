import asyncio

from app.config.settings import settings
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine


async def main():
    engine = create_async_engine(settings.DATABASE_URL)
    async with engine.begin() as conn:
        # Dropping old types
        # Drop public schema and recreate it to wipe all tables and types cleanly
        await conn.execute(text("DROP SCHEMA public CASCADE"))
        await conn.execute(text("CREATE SCHEMA public"))
        await conn.execute(text("GRANT ALL ON SCHEMA public TO postgres"))
        await conn.execute(text("GRANT ALL ON SCHEMA public TO public"))
        
        # Dropping new types if they partially exist
        await conn.execute(text("DROP TYPE IF EXISTS estadoescaneoenum CASCADE"))
        await conn.execute(text("DROP TYPE IF EXISTS tipoaccesoenum CASCADE"))
        await conn.execute(text("DROP TYPE IF EXISTS ubicacionvehiculoenum CASCADE"))

if __name__ == "__main__":
    import sys
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())
