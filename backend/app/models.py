from typing import List
from datetime import date, datetime, timezone
from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class Company(Base):
    __tablename__ = "companies"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(unique=True)
    uf: Mapped[str] = mapped_column(default="MG")  # retained for backward compatibility
    schedules: Mapped[List["Schedule"]] = relationship(back_populates="company")
    capacity_profiles: Mapped[List["CapacityProfile"]] = relationship(
        secondary="capacity_profile_companies",
        back_populates="companies"
    )


class Schedule(Base):
    __tablename__ = "schedules"

    id: Mapped[int] = mapped_column(primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"))
    uf: Mapped[str] = mapped_column(default="MG")
    schedule_date: Mapped[date]
    created_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))
    updated_at: Mapped[datetime] | None = mapped_column(nullable=True)

    company: Mapped["Company"] = relationship(back_populates="schedules")
    categories: Mapped[List["ScheduleCategory"]] = relationship(
        back_populates="schedule", cascade="all, delete-orphan"
    )
    capacities: Mapped[List["ScheduleCapacity"]] = relationship(
        back_populates="schedule", cascade="all, delete-orphan"
    )
    capacities_spot: Mapped[List["ScheduleCapacitySpot"]] = relationship(
        back_populates="schedule", cascade="all, delete-orphan"
    )


class ScheduleCategory(Base):
    __tablename__ = "schedule_categories"

    id: Mapped[int] = mapped_column(primary_key=True)
    schedule_id: Mapped[int] = mapped_column(ForeignKey("schedules.id"))
    category_name: Mapped[str]
    count: Mapped[int] = mapped_column(default=0)
    profile_name: Mapped[str] = mapped_column(default="")  # filled when Perdidas

    schedule: Mapped["Schedule"] = relationship(back_populates="categories")
    lost_plates: Mapped[List["LostPlate"]] = relationship(
        back_populates="schedule_category", cascade="all, delete-orphan"
    )


class Uf(Base):
    __tablename__ = "ufs"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(unique=True)


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(unique=True)


class CapacityProfile(Base):
    __tablename__ = "capacity_profiles"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(unique=True)
    weight: Mapped[int] = mapped_column(default=0)
    spot: Mapped[bool] = mapped_column(default=False)

    companies: Mapped[List["Company"]] = relationship(
        secondary="capacity_profile_companies",
        back_populates="capacity_profiles"
    )


class CapacityProfileCompany(Base):
    __tablename__ = "capacity_profile_companies"

    profile_id: Mapped[int] = mapped_column(ForeignKey("capacity_profiles.id"), primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"), primary_key=True)


class LostPlate(Base):
    __tablename__ = "lost_plates"

    id: Mapped[int] = mapped_column(primary_key=True)
    schedule_category_id: Mapped[int] = mapped_column(ForeignKey("schedule_categories.id"))
    plate_number: Mapped[str]
    reason: Mapped[str] = mapped_column(default="")

    schedule_category: Mapped["ScheduleCategory"] = relationship(back_populates="lost_plates")


class ScheduleCapacity(Base):
    __tablename__ = "schedule_capacities"

    id: Mapped[int] = mapped_column(primary_key=True)
    schedule_id: Mapped[int] = mapped_column(ForeignKey("schedules.id"))
    profile_name: Mapped[str]
    vehicle_count: Mapped[int] = mapped_column(default=0)
    total_weight_kg: Mapped[int] = mapped_column(default=0)

    schedule: Mapped["Schedule"] = relationship(back_populates="capacities")


class ScheduleCapacitySpot(Base):
    __tablename__ = "schedule_capacity_spots"

    id: Mapped[int] = mapped_column(primary_key=True)
    schedule_id: Mapped[int] = mapped_column(ForeignKey("schedules.id"))
    profile_name: Mapped[str]
    vehicle_count: Mapped[int] = mapped_column(default=0)
    total_weight_kg: Mapped[int] = mapped_column(default=0)

    schedule: Mapped["Schedule"] = relationship(back_populates="capacities_spot")

