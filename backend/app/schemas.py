from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel


class LostPlateCreate(BaseModel):
    plate_number: str
    reason: str


class LoginRequest(BaseModel):
    password: str


class ScheduleCategoryCreate(BaseModel):
    category_name: str
    count: int
    profile_name: Optional[str] = None
    lost_plates: List[LostPlateCreate] = []


class ScheduleCapacityCreate(BaseModel):
    profile_name: str
    vehicle_count: int


class ScheduleCapacitySpotCreate(BaseModel):
    profile_name: str
    vehicle_count: int


class ScheduleCreate(BaseModel):
    company_id: int
    uf: str
    schedule_date: date
    categories: List[ScheduleCategoryCreate]
    capacities: List[ScheduleCapacityCreate]
    capacities_spot: List[ScheduleCapacitySpotCreate] = []


class ScheduleCategoryResponse(BaseModel):
    id: int
    category_name: str
    count: int
    profile_name: Optional[str] = None
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


class ScheduleCapacitySpotResponse(BaseModel):
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
    updated_at: Optional[datetime] = None
    categories: List[ScheduleCategoryResponse]
    capacities: List[ScheduleCapacityResponse]
    capacities_spot: List[ScheduleCapacitySpotResponse]
    total_capacity_kg: int
    total_capacity_spot_kg: int
    total_vehicles: int
    total_vehicles_spot: int

    class Config:
        from_attributes = True


class CompanyCreate(BaseModel):
    name: str
    vehicle_goal: Optional[int] = 0


class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    vehicle_goal: Optional[int] = None


class CompanyResponse(BaseModel):
    id: int
    name: str
    vehicle_goal: int

    class Config:
        from_attributes = True


class UfCreate(BaseModel):
    name: str


class UfResponse(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


class CategoryCreate(BaseModel):
    name: str


class CategoryResponse(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


class CapacityProfileCreate(BaseModel):
    name: str
    weight: int
    spot: bool = False
    company_ids: List[int] = []


class CapacityProfileResponse(BaseModel):
    id: int
    name: str
    weight: int
    spot: bool
    company_ids: List[int]

    class Config:
        from_attributes = True


class DashboardMetrics(BaseModel):
    total_capacity_kg: int
    total_vehicles: int
    total_lost_trips: int
    capacity_by_company: List[dict]
    categories_distribution: List[dict]
    recent_schedules: List[ScheduleResponse]
    goal_fulfillment: List[dict]
