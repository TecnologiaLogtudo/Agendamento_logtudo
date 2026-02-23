from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel


class LostPlateCreate(BaseModel):
    plate_number: str


class LoginRequest(BaseModel):
    password: str


class ScheduleCategoryCreate(BaseModel):
    category_name: str
    count: int
    lost_plates: List[LostPlateCreate] = []


class ScheduleCapacityCreate(BaseModel):
    profile_name: str
    vehicle_count: int


class ScheduleCreate(BaseModel):
    company_id: int
    uf: str
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
    uf: str
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
