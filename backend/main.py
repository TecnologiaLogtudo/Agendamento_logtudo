from contextlib import asynccontextmanager
from datetime import date, datetime
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Query, Response, Request, APIRouter
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select, func, ForeignKey
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from pydantic import BaseModel, field_validator
import os
import openpyxl
from io import BytesIO


# Database Setup
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://postgres:postgres@localhost:5432/agendamento_db"
)

engine = create_async_engine(DATABASE_URL, echo=False)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


# Models
class Company(Base):
    __tablename__ = "companies"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(unique=True)
    schedules: Mapped[List["Schedule"]] = relationship(back_populates="company")


class Schedule(Base):
    __tablename__ = "schedules"

    id: Mapped[int] = mapped_column(primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"))
    schedule_date: Mapped[date]
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    
    company: Mapped["Company"] = relationship(back_populates="schedules")
    categories: Mapped[List["ScheduleCategory"]] = relationship(
        back_populates="schedule", cascade="all, delete-orphan"
    )
    capacities: Mapped[List["ScheduleCapacity"]] = relationship(
        back_populates="schedule", cascade="all, delete-orphan"
    )


class ScheduleCategory(Base):
    __tablename__ = "schedule_categories"

    id: Mapped[int] = mapped_column(primary_key=True)
    schedule_id: Mapped[int] = mapped_column(ForeignKey("schedules.id"))
    category_name: Mapped[str]
    count: Mapped[int] = mapped_column(default=0)
    
    schedule: Mapped["Schedule"] = relationship(back_populates="categories")
    lost_plates: Mapped[List["LostPlate"]] = relationship(
        back_populates="schedule_category", cascade="all, delete-orphan"
    )


class LostPlate(Base):
    __tablename__ = "lost_plates"

    id: Mapped[int] = mapped_column(primary_key=True)
    schedule_category_id: Mapped[int] = mapped_column(ForeignKey("schedule_categories.id"))
    plate_number: Mapped[str]
    
    schedule_category: Mapped["ScheduleCategory"] = relationship(back_populates="lost_plates")


class ScheduleCapacity(Base):
    __tablename__ = "schedule_capacities"

    id: Mapped[int] = mapped_column(primary_key=True)
    schedule_id: Mapped[int] = mapped_column(ForeignKey("schedules.id"))
    profile_name: Mapped[str]
    vehicle_count: Mapped[int] = mapped_column(default=0)
    total_weight_kg: Mapped[int] = mapped_column(default=0)
    
    schedule: Mapped["Schedule"] = relationship(back_populates="capacities")


# Pydantic Schemas
class LostPlateCreate(BaseModel):
    plate_number: str


class ScheduleCategoryCreate(BaseModel):
    category_name: str
    count: int
    lost_plates: List[LostPlateCreate] = []


class ScheduleCapacityCreate(BaseModel):
    profile_name: str
    vehicle_count: int


class ScheduleCreate(BaseModel):
    company_id: int
    schedule_date: date
    categories: List[ScheduleCategoryCreate]
    capacities: List[ScheduleCapacityCreate]


class ScheduleCategoryResponse(BaseModel):
    id: int
    category_name: str
    count: int
    lost_plates: List[LostPlateCreate]

    class Config:
        from_attributes = True


class ScheduleCapacityResponse(BaseModel):
    id: int
    profile_name: str
    vehicle_count: int
    total_weight_kg: int

    class Config:
        from_attributes = True


class ScheduleResponse(BaseModel):
    id: int
    company_id: int
    schedule_date: date
    created_at: datetime
    categories: List[ScheduleCategoryResponse]
    capacities: List[ScheduleCapacityResponse]
    total_capacity_kg: int
    total_vehicles: int

    class Config:
        from_attributes = True


class CompanyResponse(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


class DashboardMetrics(BaseModel):
    total_capacity_kg: int
    total_vehicles: int
    total_lost_trips: int
    capacity_by_company: List[dict]
    categories_distribution: List[dict]
    recent_schedules: List[ScheduleResponse]


# Profile Constants
PROFILE_WEIGHTS = {
    "HR": 1500,
    "3/4": 3500,
    "Toco": 7000,
    "Truck": 14000,
}

CATEGORIES = [
    "Carros em rota",
    "Reentrega",
    "Em viagem",
    "Perdidas",
    "Diária",
    "Stop/Parado",
]


@asynccontextmanager
async def lifespan(app: FastAPI):
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
    
    yield

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

# API Router
api_router = APIRouter(prefix="/api")

# Endpoints
@api_router.get("/companies", response_model=List[CompanyResponse])
async def get_companies():
    async with async_session() as session:
        result = await session.execute(select(Company))
        return result.scalars().all()


@api_router.get("/categories")
async def get_categories():
    return CATEGORIES


@api_router.get("/profiles")
async def get_profiles():
    return [{"name": name, "weight_kg": weight} for name, weight in PROFILE_WEIGHTS.items()]


@api_router.post("/schedules", response_model=ScheduleResponse)
async def create_schedule(schedule_data: ScheduleCreate):
    # Validate lost plates
    for cat in schedule_data.categories:
        if cat.category_name == "Perdidas":
            if cat.count != len(cat.lost_plates):
                raise HTTPException(
                    status_code=400,
                    detail=f"Para {cat.count} viagens perdidas, informe {cat.count} placas"
                )
    
    async with async_session() as session:
        # Calculate total capacity
        total_capacity = 0
        total_vehicles = 0
        capacities_to_add = []
        
        for cap in schedule_data.capacities:
            weight = PROFILE_WEIGHTS.get(cap.profile_name, 0)
            total_weight = cap.vehicle_count * weight
            total_capacity += total_weight
            total_vehicles += cap.vehicle_count
            capacities_to_add.append(
                ScheduleCapacity(
                    profile_name=cap.profile_name,
                    vehicle_count=cap.vehicle_count,
                    total_weight_kg=total_weight
                )
            )
        
        # Create schedule
        schedule = Schedule(
            company_id=schedule_data.company_id,
            schedule_date=schedule_data.schedule_date,
            categories=[
                ScheduleCategory(
                    category_name=cat.category_name,
                    count=cat.count,
                    lost_plates=[
                        LostPlate(plate_number=lp.plate_number)
                        for lp in cat.lost_plates
                    ]
                )
                for cat in schedule_data.categories if cat.count > 0
            ],
            capacities=capacities_to_add
        )
        
        session.add(schedule)
        await session.commit()
        
        # Refresh to get relationships
        await session.refresh(schedule)
        
        result = ScheduleResponse(
            id=schedule.id,
            company_id=schedule.company_id,
            schedule_date=schedule.schedule_date,
            created_at=schedule.created_at,
            categories=[
                ScheduleCategoryResponse(
                    id=cat.id,
                    category_name=cat.category_name,
                    count=cat.count,
                    lost_plates=[LostPlateCreate(plate_number=lp.plate_number) for lp in cat.lost_plates]
                )
                for cat in schedule.categories
            ],
            capacities=[
                ScheduleCapacityResponse(
                    id=cap.id,
                    profile_name=cap.profile_name,
                    vehicle_count=cap.vehicle_count,
                    total_weight_kg=cap.total_weight_kg
                )
                for cap in schedule.capacities
            ],
            total_capacity_kg=total_capacity,
            total_vehicles=total_vehicles
        )
        
        return result


@api_router.get("/schedules", response_model=List[ScheduleResponse])
async def get_schedules(
    company_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None
):
    async with async_session() as session:
        query = select(Schedule)
        
        if company_id:
            query = query.where(Schedule.company_id == company_id)
        if start_date:
            query = query.where(Schedule.schedule_date >= start_date)
        if end_date:
            query = query.where(Schedule.schedule_date <= end_date)
        
        query = query.order_by(Schedule.schedule_date.desc())
        
        result = await session.execute(query)
        schedules = result.scalars().all()
        
        response = []
        for schedule in schedules:
            total_capacity = sum(cap.total_weight_kg for cap in schedule.capacities)
            total_vehicles = sum(cap.vehicle_count for cap in schedule.capacities)
            
            response.append(ScheduleResponse(
                id=schedule.id,
                company_id=schedule.company_id,
                schedule_date=schedule.schedule_date,
                created_at=schedule.created_at,
                categories=[
                    ScheduleCategoryResponse(
                        id=cat.id,
                        category_name=cat.category_name,
                        count=cat.count,
                        lost_plates=[LostPlateCreate(plate_number=lp.plate_number) for lp in cat.lost_plates]
                    )
                    for cat in schedule.categories
                ],
                capacities=[
                    ScheduleCapacityResponse(
                        id=cap.id,
                        profile_name=cap.profile_name,
                        vehicle_count=cap.vehicle_count,
                        total_weight_kg=cap.total_weight_kg
                    )
                    for cap in schedule.capacities
                ],
                total_capacity_kg=total_capacity,
                total_vehicles=total_vehicles
            ))
        
        return response


@api_router.get("/dashboard/metrics", response_model=DashboardMetrics)
async def get_dashboard_metrics(
    company_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None
):
    async with async_session() as session:
        # Base query conditions
        conditions = []
        if company_id:
            conditions.append(Schedule.company_id == company_id)
        if start_date:
            conditions.append(Schedule.schedule_date >= start_date)
        if end_date:
            conditions.append(Schedule.schedule_date <= end_date)
        
        # Get all schedules
        query = select(Schedule)
        if conditions:
            query = query.where(*conditions)
        
        result = await session.execute(query.order_by(Schedule.schedule_date.desc()))
        schedules = result.scalars().all()
        
        # Calculate totals
        total_capacity = 0
        total_vehicles = 0
        total_lost_trips = 0
        
        for schedule in schedules:
            for cap in schedule.capacities:
                total_capacity += cap.total_weight_kg
                total_vehicles += cap.vehicle_count
            
            for cat in schedule.categories:
                if cat.category_name == "Perdidas":
                    total_lost_trips += cat.count
        
        # Capacity by company
        cap_by_company = {}
        for schedule in schedules:
            company_name = schedule.company.name
            if company_name not in cap_by_company:
                cap_by_company[company_name] = 0
            
            for cap in schedule.capacities:
                cap_by_company[company_name] += cap.total_weight_kg
        
        capacity_by_company = [
            {"company": name, "capacity_kg": capacity}
            for name, capacity in cap_by_company.items()
        ]
        
        # Categories distribution
        cat_distribution = {}
        for schedule in schedules:
            for cat in schedule.categories:
                if cat.category_name not in cat_distribution:
                    cat_distribution[cat.category_name] = 0
                cat_distribution[cat.category_name] += cat.count
        
        categories_distribution = [
            {"category": name, "count": count}
            for name, count in cat_distribution.items()
        ]
        
        # Recent schedules (last 5)
        recent_schedules = []
        for schedule in schedules[:5]:
            total_cap = sum(cap.total_weight_kg for cap in schedule.capacities)
            total_veh = sum(cap.vehicle_count for cap in schedule.capacities)
            
            recent_schedules.append(ScheduleResponse(
                id=schedule.id,
                company_id=schedule.company_id,
                schedule_date=schedule.schedule_date,
                created_at=schedule.created_at,
                categories=[
                    ScheduleCategoryResponse(
                        id=cat.id,
                        category_name=cat.category_name,
                        count=cat.count,
                        lost_plates=[LostPlateCreate(plate_number=lp.plate_number) for lp in cat.lost_plates]
                    )
                    for cat in schedule.categories
                ],
                capacities=[
                    ScheduleCapacityResponse(
                        id=cap.id,
                        profile_name=cap.profile_name,
                        vehicle_count=cap.vehicle_count,
                        total_weight_kg=cap.total_weight_kg
                    )
                    for cap in schedule.capacities
                ],
                total_capacity_kg=total_cap,
                total_vehicles=total_veh
            ))
        
        return DashboardMetrics(
            total_capacity_kg=total_capacity,
            total_vehicles=total_vehicles,
            total_lost_trips=total_lost_trips,
            capacity_by_company=capacity_by_company,
            categories_distribution=categories_distribution,
            recent_schedules=recent_schedules
        )


@api_router.get("/schedules/export")
async def export_schedules(
    company_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None
):
    async with async_session() as session:
        query = select(Schedule)
        
        if company_id:
            query = query.where(Schedule.company_id == company_id)
        if start_date:
            query = query.where(Schedule.schedule_date >= start_date)
        if end_date:
            query = query.where(Schedule.schedule_date <= end_date)
        
        query = query.order_by(Schedule.schedule_date.desc())
        
        result = await session.execute(query)
        schedules = result.scalars().all()
        
        # Create Excel
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Agendamentos"
        
        # Headers
        headers = [
            "Data", "Empresa", "Categoria", "Quantidade", 
            "Placas (Perdidas)", "Perfil", "Veículos", "Capacidade (kg)"
        ]
        ws.append(headers)
        
        for schedule in schedules:
            company_name = schedule.company.name
            
            # Group categories
            for cat in schedule.categories:
                plates = ", ".join([lp.plate_number for lp in cat.lost_plates])
                
                # Group capacities
                for cap in schedule.capacities:
                    ws.append([
                        schedule.schedule_date.strftime("%d/%m/%Y"),
                        company_name,
                        cat.category_name,
                        cat.count,
                        plates if cat.category_name == "Perdidas" else "-",
                        cap.profile_name,
                        cap.vehicle_count,
                        cap.total_weight_kg
                    ])
        
        # Save to bytes
        buffer = BytesIO()
        wb.save(buffer)
        buffer.seek(0)
        
        return Response(
            content=buffer.getvalue(),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=agendamentos.xlsx"}
        )

# Include API Router
app.include_router(api_router)

# Rota explícita para a raiz (Garante que o index.html seja servido)
@app.get("/")
async def serve_root():
    if os.path.exists("static/index.html"):
        return FileResponse("static/index.html")
    return {"message": "Frontend files not found. Please build the frontend."}

# SPA Catch-all Route (Deve ser a última rota)
@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    # Se for uma chamada de API que não casou com nenhuma rota acima, retorna 404
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="Not Found")
    
    # Para qualquer outra rota, serve o index.html do React
    if os.path.exists("static/index.html"):
        return FileResponse("static/index.html")
        
    return {"message": "Frontend files not found. Please build the frontend."}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
