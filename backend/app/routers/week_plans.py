from __future__ import annotations

from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..services import (
    build_grocery_list,
    build_portioning_sheet,
    build_prep_sheet,
)

router = APIRouter(prefix="/week-plans", tags=["week-plans"])


def _parse_week_start(week_start_date: str) -> date:
    try:
        d = date.fromisoformat(week_start_date)
    except ValueError:
        raise HTTPException(400, "week_start_date must be ISO YYYY-MM-DD")
    # Snap to Monday of that week
    d = d - timedelta(days=d.weekday())
    return d


def _get_or_create_plan(db: Session, d: date) -> models.WeekPlan:
    plan = db.query(models.WeekPlan).filter(models.WeekPlan.week_start_date == d).first()
    if not plan:
        plan = models.WeekPlan(week_start_date=d)
        db.add(plan)
        db.commit()
        db.refresh(plan)
    return plan


@router.get("/{week_start_date}", response_model=schemas.WeekPlanRead)
def get_week_plan(week_start_date: str, db: Session = Depends(get_db)):
    d = _parse_week_start(week_start_date)
    plan = _get_or_create_plan(db, d)
    return plan


@router.put("/{week_start_date}", response_model=schemas.WeekPlanRead)
def upsert_week_plan(
    week_start_date: str,
    payload: schemas.WeekPlanBase,
    db: Session = Depends(get_db),
):
    d = _parse_week_start(week_start_date)
    plan = _get_or_create_plan(db, d)
    plan.planned_meals.clear()
    db.flush()
    for pm in payload.planned_meals:
        # Validate meal exists
        if not db.get(models.Meal, pm.meal_id):
            raise HTTPException(400, f"Meal {pm.meal_id} not found")
        plan.planned_meals.append(
            models.PlannedMeal(
                meal_id=pm.meal_id,
                day_of_week=pm.day_of_week,
                position_in_day=pm.position_in_day,
            )
        )
    db.commit()
    db.refresh(plan)
    return plan


@router.get("/{week_start_date}/grocery-list", response_model=schemas.GroceryListResponse)
def grocery_list(week_start_date: str, db: Session = Depends(get_db)):
    d = _parse_week_start(week_start_date)
    plan = _get_or_create_plan(db, d)
    return schemas.GroceryListResponse(week_start_date=d, groups=build_grocery_list(plan))


@router.get("/{week_start_date}/prep-sheet", response_model=schemas.PrepSheetResponse)
def prep_sheet(week_start_date: str, db: Session = Depends(get_db)):
    d = _parse_week_start(week_start_date)
    plan = _get_or_create_plan(db, d)
    return schemas.PrepSheetResponse(week_start_date=d, groups=build_prep_sheet(plan))


@router.get("/{week_start_date}/portioning-sheet", response_model=schemas.PortioningSheetResponse)
def portioning_sheet(week_start_date: str, db: Session = Depends(get_db)):
    d = _parse_week_start(week_start_date)
    plan = _get_or_create_plan(db, d)
    return schemas.PortioningSheetResponse(week_start_date=d, items=build_portioning_sheet(plan))
