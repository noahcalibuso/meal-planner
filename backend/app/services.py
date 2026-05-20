from __future__ import annotations

import math
from collections import Counter, defaultdict
from typing import Iterable

from . import models, schemas


# ---------- Meal serialization ----------

def serialize_meal(meal: models.Meal) -> schemas.MealRead:
    tags = [t.strip() for t in (meal.tags or "").split(",") if t.strip()]
    total_cal = sum(i.calories for i in meal.ingredients)
    total_p = sum(i.protein_g for i in meal.ingredients)
    total_c = sum(i.carbs_g for i in meal.ingredients)
    total_f = sum(i.fat_g for i in meal.ingredients)
    sc = max(1, meal.serving_count or 1)

    return schemas.MealRead(
        id=meal.id,
        name=meal.name,
        photo_path=meal.photo_path,
        serving_count=meal.serving_count,
        prep_time_minutes=meal.prep_time_minutes,
        tags=tags,
        notes=meal.notes,
        ingredients=[schemas.IngredientRead.model_validate(i) for i in meal.ingredients],
        total_calories=round(total_cal, 1),
        total_protein_g=round(total_p, 1),
        total_carbs_g=round(total_c, 1),
        total_fat_g=round(total_f, 1),
        per_serving_calories=round(total_cal / sc, 1),
        per_serving_protein_g=round(total_p / sc, 1),
        per_serving_carbs_g=round(total_c / sc, 1),
        per_serving_fat_g=round(total_f / sc, 1),
    )


# ---------- Batch / output helpers ----------

def compute_batches(times_placed: int, serving_count: int) -> int:
    if times_placed <= 0:
        return 0
    sc = max(1, serving_count or 1)
    return math.ceil(times_placed / sc)


def aggregate_planned_counts(planned: Iterable[models.PlannedMeal]) -> Counter:
    counter: Counter = Counter()
    for pm in planned:
        counter[pm.meal_id] += 1
    return counter


# ---------- Grocery list ----------

def build_grocery_list(week_plan: models.WeekPlan) -> dict:
    counts = aggregate_planned_counts(week_plan.planned_meals)
    # category -> name -> {quantity_description, occurrences}
    groups: dict[str, dict[str, dict]] = defaultdict(dict)
    meals_by_id = {pm.meal_id: pm.meal for pm in week_plan.planned_meals}

    for meal_id, times_placed in counts.items():
        meal = meals_by_id[meal_id]
        batches = compute_batches(times_placed, meal.serving_count)
        for ing in meal.ingredients:
            cat = (ing.category or "pantry").lower()
            entry = groups[cat].setdefault(
                ing.name.lower(),
                {
                    "name": ing.name,
                    "category": cat,
                    "quantity_description": ing.quantity_description,
                    "occurrences": 0,
                },
            )
            entry["occurrences"] += batches
            # merge quantity descriptions if differ
            if (
                ing.quantity_description
                and ing.quantity_description not in entry["quantity_description"]
            ):
                if entry["quantity_description"]:
                    entry["quantity_description"] += f" + {ing.quantity_description} × {batches}"
                else:
                    entry["quantity_description"] = f"{ing.quantity_description} × {batches}"
            elif ing.quantity_description:
                entry["quantity_description"] = f"{ing.quantity_description} × {entry['occurrences']}"

    # Convert to response shape: groups keyed by category
    result_groups: dict[str, list] = {}
    for cat, items in sorted(groups.items()):
        result_groups[cat] = sorted(items.values(), key=lambda x: x["name"].lower())
    return result_groups


# ---------- Prep sheet ----------

COOKING_METHOD_TAGS = {
    "oven": "Oven",
    "baked": "Oven",
    "roasted": "Oven",
    "stovetop": "Stovetop",
    "skillet": "Stovetop",
    "pan": "Stovetop",
    "grill": "Grill",
    "grilled": "Grill",
    "slow-cooker": "Slow Cooker",
    "instant-pot": "Instant Pot",
    "no-cook": "No-Cook",
    "raw": "No-Cook",
    "salad": "No-Cook",
    "smoothie": "No-Cook",
    "air-fryer": "Air Fryer",
}


def infer_cooking_method(meal: models.Meal) -> str:
    tag_str = (meal.tags or "").lower()
    tags = [t.strip() for t in tag_str.split(",") if t.strip()]
    for t in tags:
        if t in COOKING_METHOD_TAGS:
            return COOKING_METHOD_TAGS[t]
    # Fallback by ingredient hints
    proteins = {"chicken", "beef", "pork", "salmon", "fish", "tofu"}
    for ing in meal.ingredients:
        name = (ing.name or "").lower()
        if any(p in name for p in proteins):
            return "Stovetop"
    return "Other"


def build_prep_sheet(week_plan: models.WeekPlan) -> list[schemas.PrepGroup]:
    counts = aggregate_planned_counts(week_plan.planned_meals)
    meals_by_id = {pm.meal_id: pm.meal for pm in week_plan.planned_meals}

    groups: dict[str, list[dict]] = defaultdict(list)
    for meal_id, times_placed in counts.items():
        meal = meals_by_id[meal_id]
        batches = compute_batches(times_placed, meal.serving_count)
        method = infer_cooking_method(meal)
        groups[method].append(
            {
                "meal_id": meal.id,
                "meal_name": meal.name,
                "batches": batches,
                "servings_per_batch": meal.serving_count,
                "total_yield": batches * meal.serving_count,
                "prep_time_minutes": meal.prep_time_minutes,
                "photo_path": meal.photo_path,
                "ingredients": [
                    {
                        "name": ing.name,
                        "quantity_description": ing.quantity_description,
                        "quantity_total": (
                            f"{ing.quantity_description} × {batches}"
                            if ing.quantity_description
                            else f"× {batches}"
                        ),
                    }
                    for ing in meal.ingredients
                ],
            }
        )

    method_order = [
        "Oven",
        "Slow Cooker",
        "Instant Pot",
        "Stovetop",
        "Grill",
        "Air Fryer",
        "No-Cook",
        "Other",
    ]
    ordered: list[schemas.PrepGroup] = []
    for m in method_order:
        if m in groups:
            ordered.append(schemas.PrepGroup(method=m, items=sorted(groups[m], key=lambda x: x["meal_name"])))
    for m in groups:
        if m not in method_order:
            ordered.append(schemas.PrepGroup(method=m, items=sorted(groups[m], key=lambda x: x["meal_name"])))
    return ordered


# ---------- Portioning sheet ----------

def build_portioning_sheet(week_plan: models.WeekPlan) -> list[schemas.PortioningItem]:
    counts = aggregate_planned_counts(week_plan.planned_meals)
    meals_by_id = {pm.meal_id: pm.meal for pm in week_plan.planned_meals}
    items: list[schemas.PortioningItem] = []
    for meal_id, times_placed in counts.items():
        meal = meals_by_id[meal_id]
        batches = compute_batches(times_placed, meal.serving_count)
        items.append(
            schemas.PortioningItem(
                meal_id=meal.id,
                meal_name=meal.name,
                batches=batches,
                servings_per_batch=meal.serving_count,
                total_servings_needed=times_placed,
                total_yield=batches * meal.serving_count,
                photo_path=meal.photo_path,
            )
        )
    return sorted(items, key=lambda x: x.meal_name.lower())
