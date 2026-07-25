import asyncio
import logging
import sys

from sqlalchemy import text
from sqlalchemy.engine import URL, make_url
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import declarative_base

from app.config.settings import settings

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

DATABASE_URL = settings.DATABASE_URL
logger = logging.getLogger(__name__)


def database_target(url: str = DATABASE_URL) -> dict[str, str]:
    """Return safe connection metadata; never include credentials."""
    parsed: URL = make_url(url)
    host = parsed.host or "<sin-host>"
    provider = "Neon" if host.endswith(".neon.tech") else "PostgreSQL"
    return {
        "provider": provider,
        "host": host,
        "database": parsed.database or "<sin-base>",
    }

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
    pool_recycle=300,
)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

Base = declarative_base()


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session


async def check_database_connection() -> dict[str, str | bool]:
    """Execute SELECT 1 and report whether PostgreSQL negotiated SSL."""
    async with engine.connect() as connection:
        result = await connection.execute(text("SELECT 1 AS value"))
        row = result.one()
        raw_connection = await connection.get_raw_connection()
        ssl_enabled = bool(raw_connection.driver_connection.pgconn.ssl_in_use)

    target = database_target()
    if target["provider"] == "Neon" and not ssl_enabled:
        raise RuntimeError("Neon respondio sin una conexion SSL activa")

    logger.info(
        "Conexion PostgreSQL verificada: provider=%s host=%s database=%s ssl=%s",
        target["provider"],
        target["host"],
        target["database"],
        ssl_enabled,
    )
    return {**target, "select_1": row.value == 1, "ssl": ssl_enabled}
