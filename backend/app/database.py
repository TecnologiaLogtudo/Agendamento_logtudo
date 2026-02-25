from datetime import datetime, timezone
import os
from pathlib import Path
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

# try loading .env automatically for local development
try:
    from dotenv import load_dotenv
    # .env lives in project root, one level above `backend`
    load_dotenv(dotenv_path=Path(__file__).parent.parent.parent / '.env')
except ImportError:
    pass

# Database Setup
DATABASE_URL = os.getenv("DATABASE_URL")

# use sqlite file for local development if env var not set
if not DATABASE_URL:
    print("WARNING: DATABASE_URL not set, falling back to sqlite for local testing")
    DATABASE_URL = "sqlite+aiosqlite:///./local.db"

# choose connection arguments depending on dialect
connect_args = {}
if DATABASE_URL.startswith("postgresql") or DATABASE_URL.startswith("postgresql+asyncpg"):
    connect_args = {
        "server_settings": {"statement_timeout": "10000"},
        "keepalives": 1,
        "keepalives_idle": 30,
        "keepalives_interval": 10,
        "keepalives_count": 5,
    }

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
    pool_size=20,
    max_overflow=10,
    pool_recycle=300,
    connect_args=connect_args,
)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass
