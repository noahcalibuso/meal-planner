from __future__ import annotations

from datetime import date
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


# ---------- Ingredients ----------

class IngredientBase(BaseModel):
    name: str
    quantity_description: str = ""
    category: str = "pantry"
    calories: float = 0
    protein_g: float = 0
    carbs_g: float = 0
    fat_g: float = 0


class IngredientCreate(IngredientBase):
    pass


class IngredientRead(IngredientBase):
    model_config = ConfigDict(from_attributes=True)
    id: int


# ---------- Meals ----------

class MealBase(BaseModel):
    name: str
    serving_count: int = Field(default=1, ge=1)
    prep_time_minutes: Optional[int] = Field(default=None, ge=0)
    tags: List[str] = []
    notes: Optional[str] = None


class MealCreate(MealBase):
    ingredients: List[IngredientCreate] = []


class MealUpdate(MealBase):
    ingredients: List[IngredientCreate] = []


class MealRead(MealBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    photo_path: Optional[str] = None
    ingredients: List[IngredientRead] = []

    # Derived
    total_calories: float = 0
    total_protein_g: float = 0
    total_carbs_g: float = 0
    total_fat_g: float = 0
    per_serving_calories: float = 0
    per_serving_protein_g: float = 0
    per_serving_carbs_g: float = 0
    per_serving_fat_g: float = 0

    @field_validator("tags", mode="before")
    @classmethod
    def _parse_tags(cls, v):
        if isinstance(v, str):
            return [t.strip() for t in v.split(",") if t.strip()]
        return v


# ---------- Settings ----------

class SettingsBase(BaseModel):
    default_calories: float = 2000
    default_protein_g: float = 150
    default_carbs_g: float = 200
    default_fat_g: float = 70


class SettingsRead(SettingsBase):
    model_config = ConfigDict(from_attributes=True)


class DayTargetBase(BaseModel):
    day_of_week: int = Field(ge=0, le=6)
    calories: Optional[float] = None
    protein_g: Optional[float] = None
    carbs_g: Optional[float] = None
    fat_g: Optional[float] = None


class DayTargetRead(DayTargetBase):
    model_config = ConfigDict(from_attributes=True)


class FullSettings(BaseModel):
    defaults: SettingsBase
    per_day: List[DayTargetBase]


# ---------- Week Plan ----------

class PlannedMealBase(BaseModel):
    meal_id: int
    day_of_week: int = Field(ge=0, le=6)
    position_in_day: int = 0


class PlannedMealRead(PlannedMealBase):
    model_config = ConfigDict(from_attributes=True)
    id: int


class WeekPlanBase(BaseModel):
    week_start_date: date
    planned_meals: List[PlannedMealBase] = []


class WeekPlanRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    week_start_date: date
    planned_meals: List[PlannedMealRead] = []


# ---------- Outputs ----------

class GroceryItem(BaseModel):
    name: str
    category: str
    quantity_description: str
    occurrences: int


class GroceryListResponse(BaseModel):
    week_start_date: date
    groups: dict[str, List[GroceryItem]]


class PrepGroup(BaseModel):
    method: str
    items: List[dict]


class PrepSheetResponse(BaseModel):
    week_start_date: date
    groups: List[PrepGroup]


class PortioningItem(BaseModel):
    meal_id: int
    meal_name: str
    batches: int
    servings_per_batch: int
    total_servings_needed: int
    total_yield: int
    photo_path: Optional[str] = None


class PortioningSheetResponse(BaseModel):
    week_start_date: date
    items: List[PortioningItem]
