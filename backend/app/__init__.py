from contextlib import asynccontextmanager
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .database import engine, async_session, Base
from sqlalchemy import select
from .models import Company
from .routers import (
    companies,
    categories,
    profiles,
    schedules,
    dashboard,
    export as export_router,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        async with async_session() as session:
            # Seed companies if not exist
            result = await session.execute(select(Company))
            if not result.scalars().first():
                companies = [
                    Company(name="3 Corações"),
                    Company(name="Itambé"),
                    Company(name="DPA"),
                ]
                session.add_all(companies)
                await session.commit()
    except Exception as e:
        print(f"AVISO: Erro ao inicializar banco de dados: {e}")
        print("O servidor continuará rodando para servir o frontend, mas a API pode estar instável.")
    yield


def create_app() -> FastAPI:
    app = FastAPI(title="LogiSched API", lifespan=lifespan)

    cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Mount Static Files (Assets do Vite)
    if os.path.exists("static/assets"):
        app.mount("/assets", StaticFiles(directory="static/assets"), name="assets")

    # include routers
    app.include_router(companies.router, prefix="/api")
    app.include_router(categories.router, prefix="/api")
    app.include_router(profiles.router, prefix="/api")
    app.include_router(schedules.router, prefix="/api")
    app.include_router(dashboard.router, prefix="/api")
    app.include_router(export_router.router, prefix="/api")

    return app
