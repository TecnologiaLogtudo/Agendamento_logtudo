from datetime import date
from typing import List, Optional

from fastapi import APIRouter
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from ..database import async_session
from ..models import Schedule, ScheduleCapacity, ScheduleCapacitySpot, ScheduleCategory
from ..schemas import DashboardMetrics, ScheduleResponse, ScheduleCategoryResponse, ScheduleCapacityResponse, ScheduleCapacitySpotResponse, LostPlateCreate

router = APIRouter()


@router.get("/dashboard/metrics", response_model=DashboardMetrics)
async def get_dashboard_metrics(
    company_id: Optional[int] = None,
    uf: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    profile_name: Optional[str] = None
):
    async with async_session() as session:
        # Base query conditions
        conditions = []
        if company_id:
            conditions.append(Schedule.company_id == company_id)
        if uf:
            conditions.append(Schedule.uf == uf.upper())
        if start_date:
            conditions.append(Schedule.schedule_date >= start_date)
        if end_date:
            conditions.append(Schedule.schedule_date <= end_date)

        # Get all schedules
        query = select(Schedule).options(
            selectinload(Schedule.capacities),
            selectinload(Schedule.capacities_spot),
            selectinload(Schedule.categories).selectinload(ScheduleCategory.lost_plates),
            selectinload(Schedule.company)
        )
        if conditions:
            query = query.where(*conditions)

        # If filtering by profile, we only want schedules that have that profile
        if profile_name:
            query = query.join(Schedule.capacities).where(ScheduleCapacity.profile_name == profile_name)

        result = await session.execute(query.order_by(Schedule.schedule_date.desc()))
        # Use unique() because of the join
        schedules = result.scalars().unique().all()

        # Calculate totals
        total_capacity = 0
        total_vehicles = 0
        total_lost_trips = 0

        for schedule in schedules:
            for cap in schedule.capacities:
                if not profile_name or cap.profile_name == profile_name:
                    total_capacity += cap.total_weight_kg
                    total_vehicles += cap.vehicle_count

            # spot capacities don't count towards the main totals (they are reported separately)
            # but if you want to include them, adjust accordingly here

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
                if not profile_name or cap.profile_name == profile_name:
                    cap_by_company[company_name] += cap.total_weight_kg

        capacity_by_company = [
            {"company": name, "capacity_kg": capacity}
            for name, capacity in cap_by_company.items()
            if capacity > 0
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
            total_cap = sum(cap.total_weight_kg for cap in schedule.capacities if not profile_name or cap.profile_name == profile_name)
            total_veh = sum(cap.vehicle_count for cap in schedule.capacities if not profile_name or cap.profile_name == profile_name)
            total_cap_spot = sum(cap.total_weight_kg for cap in schedule.capacities_spot if not profile_name or cap.profile_name == profile_name)
            total_veh_spot = sum(cap.vehicle_count for cap in schedule.capacities_spot if not profile_name or cap.profile_name == profile_name)

            recent_schedules.append(ScheduleResponse(
                id=schedule.id,
                company_id=schedule.company_id,
                uf=schedule.uf,
                schedule_date=schedule.schedule_date,
                created_at=schedule.created_at,
                updated_at=schedule.updated_at,
                categories=[
                    ScheduleCategoryResponse(
                        id=cat.id,
                        category_name=cat.category_name,
                        count=cat.count,
                        profile_name=cat.profile_name,
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
                total_capacity_kg=total_cap,
                total_capacity_spot_kg=total_cap_spot,
                total_vehicles=total_veh,
                total_vehicles_spot=total_veh_spot
            ))

        # Goal Fulfillment
        from collections import defaultdict
        
        realizado_by_company = defaultdict(int)
        companies_by_id = {}
        
        for schedule in schedules:
            companies_by_id[schedule.company.id] = schedule.company
            for cat in schedule.categories:
                if cat.category_name != 'Spot/Parado':
                    realizado_by_company[schedule.company.id] += cat.count

        num_days = 1
        if schedules:
            if start_date and end_date:
                num_days = (end_date - start_date).days + 1
            else:
                min_date = min(s.schedule_date for s in schedules)
                max_date = max(s.schedule_date for s in schedules)
                num_days = (max_date - min_date).days + 1

        goal_fulfillment = []
        for company_id, realizado in realizado_by_company.items():
            company = companies_by_id[company_id]
            meta_for_period = company.vehicle_goal * num_days
            goal_fulfillment.append({
                "company": company.name,
                "realizado": realizado,
                "meta": meta_for_period,
            })

        return DashboardMetrics(
            total_capacity_kg=total_capacity,
            total_vehicles=total_vehicles,
            total_lost_trips=total_lost_trips,
            capacity_by_company=capacity_by_company,
            categories_distribution=categories_distribution,
            recent_schedules=recent_schedules,
            goal_fulfillment=goal_fulfillment
        )
