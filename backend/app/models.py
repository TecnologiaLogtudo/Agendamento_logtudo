from typing import List
from datetime import date, datetime, timezone
from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class Company(Base):
    __tablename__ = "companies"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(unique=True)
    schedules: Mapped[List["Schedule"]] = relationship(back_populates="company")


class Schedule(Base):
    __tablename__ = "schedules"

    id: Mapped[int] = mapped_column(primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"))
    uf: Mapped[str] = mapped_column(default="MG")
    schedule_date: Mapped[date]
    created_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))

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
