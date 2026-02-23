from datetime import date
from io import BytesIO
from typing import Optional

import openpyxl
from fastapi import APIRouter, Response
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from ..database import async_session
from ..models import Schedule, ScheduleCategory

router = APIRouter()


@router.get("/schedules/export")
async def export_schedules(
    company_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None
):
    async with async_session() as session:
        query = select(Schedule).options(
            selectinload(Schedule.capacities),
            selectinload(Schedule.categories).selectinload(ScheduleCategory.lost_plates),
            selectinload(Schedule.company)
        )

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

        # Tabela 1: Categorias
        headers_categories = [
            "Data", "Empresa", "Categoria", "Quantidade", "Placas (Perdidas)"
        ]
        ws.append(headers_categories)

        for schedule in schedules:
            company_name = schedule.company.name
            date_str = schedule.schedule_date.strftime("%d/%m/%Y")

            for cat in schedule.categories:
                plates = ", ".join([lp.plate_number for lp in cat.lost_plates])
                ws.append([
                    date_str,
                    company_name,
                    cat.category_name,
                    cat.count,
                    plates if cat.category_name == "Perdidas" else "-"
                ])

        # Espaço entre tabelas
        ws.append([])
        ws.append([])

        # Tabela 2: Capacidades
        headers_capacities = [
            "Data", "Empresa", "Perfil", "Veículos", "Capacidade (kg)"
        ]
        ws.append(headers_capacities)

        for schedule in schedules:
            company_name = schedule.company.name
            date_str = schedule.schedule_date.strftime("%d/%m/%Y")

            for cap in schedule.capacities:
                ws.append([
                    date_str,
                    company_name,
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
