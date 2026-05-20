from __future__ import annotations

from datetime import date, datetime
from typing import List, Optional

from sqlalchemy import (
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class Meal(Base):
    __tablename__ = "meals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    photo_path: Mapped[Optional[str]] = mapped_column(String(500))
    serving_count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    prep_time_minutes: Mapped[Optional[int]] = mapped_column(Integer)
    tags: Mapped[str] = mapped_column(Text, default="", nullable=False)  # comma-separated
    notes: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    ingredients: Mapped[List["Ingredient"]] = relationship(
        "Ingredient",
        back_populates="meal",
        cascade="all, delete-orphan",
        order_by="Ingredient.id",
    )

    planned_meals: Mapped[List["PlannedMeal"]] = relationship(
        "PlannedMeal",
        back_populates="meal",
        cascade="all, delete-orphan",
    )


class Ingredient(Base):
    __tablename__ = "ingredients"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    meal_id: Mapped[int] = mapped_column(ForeignKey("meals.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    quantity_description: Mapped[str] = mapped_column(String(200), default="", nullable=False)
    category: Mapped[str] = mapped_column(String(100), default="pantry", nullable=False)
    calories: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    protein_g: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    carbs_g: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    fat_g: Mapped[float] = mapped_column(Float, default=0, nullable=False)

    meal: Mapped["Meal"] = relationship("Meal", back_populates="ingredients")


class Settings(Base):
    __tablename__ = "settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    default_calories: Mapped[float] = mapped_column(Float, default=2000, nullable=False)
    default_protein_g: Mapped[float] = mapped_column(Float, default=150, nullable=False)
    default_carbs_g: Mapped[float] = mapped_column(Float, default=200, nullable=False)
    default_fat_g: Mapped[float] = mapped_column(Float, default=70, nullable=False)


class DayTarget(Base):
    __tablename__ = "day_targets"
    __table_args__ = (UniqueConstraint("day_of_week", name="uq_day_targets_day"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    day_of_week: Mapped[int] = mapped_column(Integer, nullable=False)  # 0=Mon..6=Sun
    calories: Mapped[Optional[float]] = mapped_column(Float)
    protein_g: Mapped[Optional[float]] = mapped_column(Float)
    carbs_g: Mapped[Optional[float]] = mapped_column(Float)
    fat_g: Mapped[Optional[float]] = mapped_column(Float)


class WeekPlan(Base):
    __tablename__ = "week_plans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    week_start_date: Mapped[date] = mapped_column(Date, unique=True, nullable=False)

    planned_meals: Mapped[List["PlannedMeal"]] = relationship(
        "PlannedMeal",
        back_populates="week_plan",
        cascade="all, delete-orphan",
        order_by="PlannedMeal.day_of_week, PlannedMeal.position_in_day",
    )


class PlannedMeal(Base):
    __tablename__ = "planned_meals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    week_plan_id: Mapped[int] = mapped_column(
        ForeignKey("week_plans.id", ondelete="CASCADE"), nullable=False
    )
    meal_id: Mapped[int] = mapped_column(
        ForeignKey("meals.id", ondelete="CASCADE"), nullable=False
    )
    day_of_week: Mapped[int] = mapped_column(Integer, nullable=False)
    position_in_day: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    week_plan: Mapped["WeekPlan"] = relationship("WeekPlan", back_populates="planned_meals")
    meal: Mapped["Meal"] = relationship("Meal", back_populates="planned_meals")
