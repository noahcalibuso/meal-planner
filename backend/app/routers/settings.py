from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/settings", tags=["settings"])


def get_or_create_settings(db: Session) -> models.Settings:
    s = db.query(models.Settings).first()
    if not s:
        s = models.Settings()
        db.add(s)
        db.commit()
        db.refresh(s)
    return s


@router.get("", response_model=schemas.FullSettings)
def get_settings(db: Session = Depends(get_db)):
    s = get_or_create_settings(db)
    per_day = db.query(models.DayTarget).order_by(models.DayTarget.day_of_week).all()
    return schemas.FullSettings(
        defaults=schemas.SettingsBase.model_validate(s, from_attributes=True),
        per_day=[schemas.DayTargetBase.model_validate(d, from_attributes=True) for d in per_day],
    )


@router.put("", response_model=schemas.FullSettings)
def update_settings(payload: schemas.FullSettings, db: Session = Depends(get_db)):
    s = get_or_create_settings(db)
    s.default_calories = payload.defaults.default_calories
    s.default_protein_g = payload.defaults.default_protein_g
    s.default_carbs_g = payload.defaults.default_carbs_g
    s.default_fat_g = payload.defaults.default_fat_g

    # Replace per-day overrides
    db.query(models.DayTarget).delete()
    db.flush()
    for d in payload.per_day:
        # Only insert if at least one override is non-null
        if any(v is not None for v in (d.calories, d.protein_g, d.carbs_g, d.fat_g)):
            db.add(
                models.DayTarget(
                    day_of_week=d.day_of_week,
                    calories=d.calories,
                    protein_g=d.protein_g,
                    carbs_g=d.carbs_g,
                    fat_g=d.fat_g,
                )
            )
    db.commit()
    return get_settings(db)
