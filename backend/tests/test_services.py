from datetime import date

from app import models
from app.services import (
    build_grocery_list,
    build_portioning_sheet,
    build_prep_sheet,
    compute_batches,
    infer_cooking_method,
    serialize_meal,
)


def make_meal(name="Test", serving_count=4, tags="", ingredients=None):
    m = models.Meal(name=name, serving_count=serving_count, tags=tags)
    m.id = 1
    m.photo_path = None
    m.prep_time_minutes = 30
    m.notes = None
    m.ingredients = []
    for i, ing in enumerate(ingredients or []):
        obj = models.Ingredient(**ing)
        obj.id = i + 1
        obj.meal_id = 1
        m.ingredients.append(obj)
    return m


def test_serialize_meal_aggregates_macros_and_divides_by_servings():
    meal = make_meal(
        serving_count=2,
        ingredients=[
            {"name": "Chicken", "quantity_description": "200g", "category": "protein",
             "calories": 400, "protein_g": 60, "carbs_g": 0, "fat_g": 18},
            {"name": "Rice", "quantity_description": "1 cup", "category": "pantry",
             "calories": 200, "protein_g": 4, "carbs_g": 44, "fat_g": 1},
        ],
    )
    out = serialize_meal(meal)
    assert out.total_calories == 600
    assert out.total_protein_g == 64
    assert out.total_carbs_g == 44
    assert out.total_fat_g == 19
    assert out.per_serving_calories == 300
    assert out.per_serving_protein_g == 32
    assert out.per_serving_carbs_g == 22
    assert out.per_serving_fat_g == 9.5


def test_compute_batches_ceiling():
    # 4 servings per batch, placed 5 times -> 2 batches
    assert compute_batches(5, 4) == 2
    assert compute_batches(4, 4) == 1
    assert compute_batches(0, 4) == 0
    assert compute_batches(1, 4) == 1
    assert compute_batches(9, 4) == 3


def test_infer_cooking_method_uses_tag():
    meal = make_meal(tags="oven,high-protein")
    assert infer_cooking_method(meal) == "Oven"
    meal2 = make_meal(tags="salad")
    assert infer_cooking_method(meal2) == "No-Cook"


def test_grocery_list_dedupes_and_multiplies_by_batches():
    chicken_meal = make_meal(
        name="Chicken Bowl",
        serving_count=4,
        ingredients=[
            {"name": "Chicken thigh", "quantity_description": "1 lb",
             "category": "protein", "calories": 800, "protein_g": 120,
             "carbs_g": 0, "fat_g": 40},
            {"name": "Rice", "quantity_description": "2 cups",
             "category": "pantry", "calories": 600, "protein_g": 12,
             "carbs_g": 130, "fat_g": 2},
        ],
    )
    other_meal = make_meal(
        name="Stir Fry",
        serving_count=4,
        ingredients=[
            {"name": "Chicken thigh", "quantity_description": "1 lb",
             "category": "protein", "calories": 800, "protein_g": 120,
             "carbs_g": 0, "fat_g": 40},
            {"name": "Bell Pepper", "quantity_description": "2 each",
             "category": "produce", "calories": 60, "protein_g": 2,
             "carbs_g": 14, "fat_g": 0},
        ],
    )
    other_meal.id = 2

    plan = models.WeekPlan(week_start_date=date(2026, 5, 18))
    plan.planned_meals = []
    # Chicken Bowl placed 5 times -> 2 batches; Stir Fry placed 4 times -> 1 batch
    for _ in range(5):
        pm = models.PlannedMeal(meal_id=1, day_of_week=0)
        pm.meal = chicken_meal
        plan.planned_meals.append(pm)
    for _ in range(4):
        pm = models.PlannedMeal(meal_id=2, day_of_week=1)
        pm.meal = other_meal
        plan.planned_meals.append(pm)

    groups = build_grocery_list(plan)
    # chicken thigh should appear in protein with 2+1=3 batches occurrences total
    assert "protein" in groups
    proteins = {item["name"]: item for item in groups["protein"]}
    assert proteins["Chicken thigh"]["occurrences"] == 3
    # Rice should appear once with 2 batches
    pantry = {item["name"]: item for item in groups["pantry"]}
    assert pantry["Rice"]["occurrences"] == 2
    produce = {item["name"]: item for item in groups["produce"]}
    assert produce["Bell Pepper"]["occurrences"] == 1


def test_prep_sheet_groups_by_method():
    oven_meal = make_meal(name="Roast", serving_count=4, tags="oven")
    stove_meal = make_meal(name="Stir Fry", serving_count=4, tags="stovetop")
    stove_meal.id = 2

    plan = models.WeekPlan(week_start_date=date(2026, 5, 18))
    plan.planned_meals = []
    for _ in range(3):
        pm = models.PlannedMeal(meal_id=1, day_of_week=0)
        pm.meal = oven_meal
        plan.planned_meals.append(pm)
    for _ in range(2):
        pm = models.PlannedMeal(meal_id=2, day_of_week=2)
        pm.meal = stove_meal
        plan.planned_meals.append(pm)

    groups = build_prep_sheet(plan)
    methods = [g.method for g in groups]
    assert "Oven" in methods
    assert "Stovetop" in methods
    # Oven appears before Stovetop in canonical order
    assert methods.index("Oven") < methods.index("Stovetop")


def test_portioning_sheet_reports_batches_and_yield():
    meal = make_meal(name="Chili", serving_count=6)
    plan = models.WeekPlan(week_start_date=date(2026, 5, 18))
    plan.planned_meals = []
    for _ in range(7):  # 2 batches, yield 12
        pm = models.PlannedMeal(meal_id=1, day_of_week=0)
        pm.meal = meal
        plan.planned_meals.append(pm)
    items = build_portioning_sheet(plan)
    assert len(items) == 1
    assert items[0].batches == 2
    assert items[0].servings_per_batch == 6
    assert items[0].total_servings_needed == 7
    assert items[0].total_yield == 12
