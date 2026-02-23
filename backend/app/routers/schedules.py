from datetime import date
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from ..auth import verify_admin
from ..constants import PROFILE_WEIGHTS
from ..database import async_session
from ..models import (
    Company,
    Schedule,
    ScheduleCategory,
    ScheduleCapacity,
    ScheduleCapacitySpot,
    LostPlate,
)
from ..schemas import (
    ScheduleCreate,
    ScheduleResponse,
    ScheduleCategoryResponse,
    ScheduleCapacityResponse,
    ScheduleCapacitySpotResponse,
    ScheduleCapacitySpotCreate,
    LostPlateCreate,
)

router = APIRouter()


@router.post("/schedules", response_model=ScheduleResponse)
async def create_schedule(schedule_data: ScheduleCreate, authorized: bool = Depends(verify_admin)):
    # Validate lost plates (now called "Indisponíveis")
    for cat in schedule_data.categories:
        if cat.category_name == "Indisponíveis":
            if cat.count != len(cat.lost_plates):
                raise HTTPException(
                    status_code=400,
                    detail=f"Para {cat.count} viagens indisponíveis, informe {cat.count} placas e motivos"
                )
            # check each plate has reason
            for lp in cat.lost_plates:
                if not lp.plate_number.strip() or not lp.reason.strip():
                    raise HTTPException(
                        status_code=400,
                        detail="Cada viagem indisponível precisa de placa e motivo"
                    )

    # Validate capacities_spot match "Spot/Parado" category if present
    spot_cat = next((c for c in schedule_data.categories if c.category_name == "Spot/Parado"), None)
    if spot_cat:
        total_spot_vehicles = sum(cap.vehicle_count for cap in schedule_data.capacities_spot)
        if spot_cat.count != total_spot_vehicles:
            raise HTTPException(
                status_code=400,
                detail=f"Para {spot_cat.count} veículos em Spot/Parado informe {spot_cat.count} veículos de capacidade SPOT"
            )

    async with async_session() as session:
        # Verificar se a empresa existe
        company = await session.get(Company, schedule_data.company_id)
        if not company:
            raise HTTPException(status_code=404, detail="Empresa não encontrada. Tente recarregar a página para atualizar a lista de empresas.")

        # Calculate total capacity (regular) and prepare objects
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

        # Spot capacities
        total_capacity_spot = 0
        total_vehicles_spot = 0
        capacities_spot_to_add = []
        for cap in schedule_data.capacities_spot:
            weight = PROFILE_WEIGHTS.get(cap.profile_name, 0)
            total_weight = cap.vehicle_count * weight
            total_capacity_spot += total_weight
            total_vehicles_spot += cap.vehicle_count
            capacities_spot_to_add.append(
                ScheduleCapacitySpot(
                    profile_name=cap.profile_name,
                    vehicle_count=cap.vehicle_count,
                    total_weight_kg=total_weight
                )
            )

        # Create schedule
        schedule = Schedule(
            company_id=schedule_data.company_id,
            uf=schedule_data.uf.upper(),
            schedule_date=schedule_data.schedule_date,
            categories=[
                ScheduleCategory(
                    category_name=cat.category_name,
                    count=cat.count,
                    lost_plates=[
                        LostPlate(plate_number=lp.plate_number, reason=lp.reason)
                        for lp in cat.lost_plates
                    ]
                )
                for cat in schedule_data.categories if cat.count > 0
            ],
            capacities=capacities_to_add,
            capacities_spot=capacities_spot_to_add
        )

        session.add(schedule)
        try:
            await session.commit()
        except Exception as e:
            await session.rollback()
            print(f"Erro ao salvar agendamento: {e}")
            raise HTTPException(status_code=500, detail=f"Erro ao salvar no banco de dados: {str(e)}")

        # Re-fetch with relationships loaded
        query = select(Schedule).where(Schedule.id == schedule.id).options(
            selectinload(Schedule.categories).selectinload(ScheduleCategory.lost_plates),
            selectinload(Schedule.capacities),
            selectinload(Schedule.capacities_spot)
        )
        result_exec = await session.execute(query)
        schedule = result_exec.scalars().first()

        result = ScheduleResponse(
            id=schedule.id,
            company_id=schedule.company_id,
            uf=schedule.uf,
            schedule_date=schedule.schedule_date,
            created_at=schedule.created_at,
            categories=[
                ScheduleCategoryResponse(
                    id=cat.id,
                    category_name=cat.category_name,
                    count=cat.count,
                    lost_plates=[LostPlateCreate(plate_number=lp.plate_number, reason=lp.reason) for lp in cat.lost_plates]
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
            capacities_spot=[
                ScheduleCapacitySpotResponse(
                    id=cap.id,
                    profile_name=cap.profile_name,
                    vehicle_count=cap.vehicle_count,
                    total_weight_kg=cap.total_weight_kg
                )
                for cap in schedule.capacities_spot
            ],
            total_capacity_kg=total_capacity,
            total_capacity_spot_kg=total_capacity_spot,
            total_vehicles=total_vehicles,
            total_vehicles_spot=total_vehicles_spot
        )

        return result


@router.get("/schedules", response_model=List[ScheduleResponse])
async def get_schedules(
    company_id: Optional[int] = None,
    uf: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None
):
    async with async_session() as session:
        query = select(Schedule).options(
            selectinload(Schedule.categories).selectinload(ScheduleCategory.lost_plates),
            selectinload(Schedule.capacities),
            selectinload(Schedule.capacities_spot)
        )

        if company_id:
            query = query.where(Schedule.company_id == company_id)
        if uf:
            query = query.where(Schedule.uf == uf.upper())
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
            total_capacity_spot = sum(cap.total_weight_kg for cap in schedule.capacities_spot)
            total_vehicles_spot = sum(cap.vehicle_count for cap in schedule.capacities_spot)

            response.append(ScheduleResponse(
                id=schedule.id,
                company_id=schedule.company_id,
                uf=schedule.uf,
                schedule_date=schedule.schedule_date,
                created_at=schedule.created_at,
                categories=[
                    ScheduleCategoryResponse(
                        id=cat.id,
                        category_name=cat.category_name,
                        count=cat.count,
                        lost_plates=[LostPlateCreate(plate_number=lp.plate_number, reason=lp.reason) for lp in cat.lost_plates]
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
                capacities_spot=[
                    ScheduleCapacitySpotResponse(
                        id=cap.id,
                        profile_name=cap.profile_name,
                        vehicle_count=cap.vehicle_count,
                        total_weight_kg=cap.total_weight_kg
                    )
                    for cap in schedule.capacities_spot
                ],
                total_capacity_kg=total_capacity,
                total_capacity_spot_kg=total_capacity_spot,
                total_vehicles=total_vehicles,
                total_vehicles_spot=total_vehicles_spot
            ))

        return response
