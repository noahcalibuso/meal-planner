from __future__ import annotations

import os
import secrets
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import UPLOADS_DIR, get_db
from ..services import serialize_meal

router = APIRouter(prefix="/meals", tags=["meals"])

ALLOWED_IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}


def _apply_meal_fields(meal: models.Meal, data: schemas.MealBase) -> None:
    meal.name = data.name
    meal.serving_count = data.serving_count
    meal.prep_time_minutes = data.prep_time_minutes
    meal.tags = ",".join([t.strip() for t in data.tags if t.strip()])
    meal.notes = data.notes


@router.get("", response_model=List[schemas.MealRead])
def list_meals(db: Session = Depends(get_db)):
    meals = db.query(models.Meal).order_by(models.Meal.name.asc()).all()
    return [serialize_meal(m) for m in meals]


@router.post("", response_model=schemas.MealRead, status_code=status.HTTP_201_CREATED)
def create_meal(payload: schemas.MealCreate, db: Session = Depends(get_db)):
    meal = models.Meal()
    _apply_meal_fields(meal, payload)
    for ing in payload.ingredients:
        meal.ingredients.append(models.Ingredient(**ing.model_dump()))
    db.add(meal)
    db.commit()
    db.refresh(meal)
    return serialize_meal(meal)


@router.get("/{meal_id}", response_model=schemas.MealRead)
def get_meal(meal_id: int, db: Session = Depends(get_db)):
    meal = db.get(models.Meal, meal_id)
    if not meal:
        raise HTTPException(404, "Meal not found")
    return serialize_meal(meal)


@router.put("/{meal_id}", response_model=schemas.MealRead)
def update_meal(meal_id: int, payload: schemas.MealUpdate, db: Session = Depends(get_db)):
    meal = db.get(models.Meal, meal_id)
    if not meal:
        raise HTTPException(404, "Meal not found")
    _apply_meal_fields(meal, payload)
    # Replace ingredients
    meal.ingredients.clear()
    db.flush()
    for ing in payload.ingredients:
        meal.ingredients.append(models.Ingredient(**ing.model_dump()))
    db.commit()
    db.refresh(meal)
    return serialize_meal(meal)


@router.delete("/{meal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_meal(meal_id: int, db: Session = Depends(get_db)):
    meal = db.get(models.Meal, meal_id)
    if not meal:
        raise HTTPException(404, "Meal not found")
    # Best-effort image cleanup
    if meal.photo_path:
        try:
            (UPLOADS_DIR / Path(meal.photo_path).name).unlink(missing_ok=True)
        except Exception:
            pass
    db.delete(meal)
    db.commit()
    return None


@router.post("/{meal_id}/image", response_model=schemas.MealRead)
async def upload_meal_image(
    meal_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    meal = db.get(models.Meal, meal_id)
    if not meal:
        raise HTTPException(404, "Meal not found")
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_IMAGE_EXTS:
        raise HTTPException(400, f"Unsupported file type {ext}")
    # Replace prior file
    if meal.photo_path:
        try:
            (UPLOADS_DIR / Path(meal.photo_path).name).unlink(missing_ok=True)
        except Exception:
            pass
    token = secrets.token_hex(8)
    filename = f"meal_{meal.id}_{token}{ext}"
    target = UPLOADS_DIR / filename
    data = await file.read()
    target.write_bytes(data)
    meal.photo_path = f"/uploads/{filename}"
    db.commit()
    db.refresh(meal)
    return serialize_meal(meal)


@router.delete("/{meal_id}/image", response_model=schemas.MealRead)
def delete_meal_image(meal_id: int, db: Session = Depends(get_db)):
    meal = db.get(models.Meal, meal_id)
    if not meal:
        raise HTTPException(404, "Meal not found")
    if meal.photo_path:
        try:
            (UPLOADS_DIR / Path(meal.photo_path).name).unlink(missing_ok=True)
        except Exception:
            pass
        meal.photo_path = None
        db.commit()
        db.refresh(meal)
    return serialize_meal(meal)
