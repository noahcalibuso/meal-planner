# PRD: Meal Planner Web Application

## Problem Statement

Tracking macros reactively — logging meals after eating — makes it hard to stay consistent
with nutrition goals. The user needs a way to plan meals ahead of time for the week or
two-week period, see how those meals hit daily calorie and macro targets, and produce
actionable outputs (grocery list, batch prep order, portioning guide) that streamline
the actual cooking and eating process.

-----

## Solution

A local-first web application where the user maintains a personal library of meal cards
(each with per-serving macros, a photo, and ingredient data), then drags those cards into
a weekly planning view against daily calorie and macro targets. The app outputs a
consolidated grocery list, an optimized batch prep sequence, and a portioning sheet.

-----

## User Stories

### Meal Library

1. As a user, I want to create a meal card with a name, photo, ingredients, macros per ingredient, and serving count so that I have a reusable planning unit.
1. As a user, I want each ingredient to store grams of protein, carbohydrates, and fat alongside its calorie count so that per-serving macros are automatically calculated.
1. As a user, I want the meal card to display total macros and calories aggregated across all ingredients, divided by the serving count, so that I see per-serving nutritional data at a glance.
1. As a user, I want to assign tags to a meal card (e.g., “chicken”, “high protein”, “prep-friendly”) so that I can filter and sort the library.
1. As a user, I want to upload a photo to a meal card so that I can visually identify meals quickly when planning.
1. As a user, I want to set a prep time on a meal card so that I can factor cooking effort into planning.
1. As a user, I want to edit any field of an existing meal card so that I can refine recipes over time.
1. As a user, I want to delete a meal card from the library so that I can remove meals I no longer use.
1. As a user, I want to search and filter the meal library by name and tag so that I can find the right card quickly when planning.
1. As a user, I want to define the number of servings a batch of this meal produces (e.g., 4 servings) so that the app can track batch consumption across the week.

### Goal & Settings

1. As a user, I want a Settings page where I can enter my daily calorie target so that each planning day shows the correct goal.
1. As a user, I want to set daily protein, carbohydrate, and fat gram targets in Settings so that the weekly view tracks macro balance per day.
1. As a user, I want to define different calorie and macro targets per day of the week (e.g., training days vs. rest days) so that my plan reflects my actual activity schedule.
1. As a user, I want my settings to persist across sessions so that I don’t have to re-enter them each time.

### Weekly Planning View

1. As a user, I want a weekly planning view laid out as a seven-column grid (one column per day) so that I can visualize the full week at once.
1. As a user, I want a sidebar panel displaying all meal cards in the library so that I can browse and select meals to plan without leaving the planning view.
1. As a user, I want to filter and search the sidebar meal list while in the planning view so that I can find specific meals quickly during a planning session.
1. As a user, I want to drag a meal card from the sidebar into a day column so that I can assign that meal to that day.
1. As a user, I want each day column to show running totals of calories and each macro versus the day’s target so that I can see how close I am to hitting goals as I plan.
1. As a user, I want to drag a meal card to a different day to move it so that I can reorganize the plan freely.
1. As a user, I want to remove a meal from a day by dragging it out or clicking a remove button so that I can undo planning decisions.
1. As a user, I want each meal card in the sidebar to display a batch counter badge showing how many servings of the current batch have been allocated to the week so that I know how much I need to cook.
1. As a user, I want the batch counter to decrement automatically each time I drag a card into a day so that I always know how many servings of a batch are left to allocate.
1. As a user, I want the batch counter to silently roll over to a new batch when all servings have been allocated (i.e., it resets to the full serving count and continues decrementing) so that I can plan multiple batches of the same meal without interruption.
1. As a user, I want the grocery list and prep sheet to automatically reflect the total number of batches allocated (e.g., two batches = double the ingredients) so that the outputs are always accurate.
1. As a user, I want to have the same meal appear multiple times in a single day so that I can plan, for example, the same lunch and dinner.
1. As a user, I want the weekly view to show a visual indicator (color or progress bar) when a day exceeds its calorie or macro target so that I can quickly identify days that need adjustment.
1. As a user, I want to navigate between different weeks (previous/next) so that I can plan ahead or review past plans.
1. As a user, I want the current week’s plan to persist between sessions so that I can return and continue planning.

### Grocery List Output

1. As a user, I want to generate a grocery list from the current week’s plan so that I know exactly what to buy.
1. As a user, I want the grocery list to de-duplicate and sum ingredients across all planned meals and batches (e.g., chicken thigh appears once with the total quantity needed) so that the list is actionable.
1. As a user, I want the grocery list grouped by ingredient category (e.g., proteins, produce, pantry) so that shopping is efficient.
1. As a user, I want to print or export the grocery list so that I can take it to the store.

### Batch Prep Sheet Output

1. As a user, I want to generate a batch prep sheet from the current week’s plan so that I can execute cooking efficiently.
1. As a user, I want the prep sheet to group cooking steps by method or ingredient type (e.g., all proteins together, all grains together) so that I can batch cook in parallel and minimize cooking time.
1. As a user, I want the prep sheet to reflect the total batch quantities needed (accounting for multiple batches of the same meal) so that amounts are always correct.
1. As a user, I want to print or export the prep sheet so that I can reference it during cooking.

### Portioning Sheet Output

1. As a user, I want to generate a portioning sheet from the current week’s plan so that I know how to divide each batch into containers.
1. As a user, I want the portioning sheet to show each meal, its total batch yield, and how many equal containers to divide it into so that portioning is mechanical and fast.
1. As a user, I want to print or export the portioning sheet so that I can reference it while portioning.

-----

## Implementation Decisions

### Architecture

- **Frontend**: React with Tailwind CSS, served locally via a dev server or static build.
- **Backend**: FastAPI (Python), exposing a REST API for all CRUD and output generation operations.
- **Database**: SQLite, file-based, co-located with the backend. No external database infrastructure required.
- **Package management**: `uv` for Python dependencies, `npm` for frontend dependencies.
- **Image storage**: Meal card images stored as files on disk in a local `uploads/` directory; the database stores the file path reference.
- **Local hosting**: Application runs entirely on localhost. No authentication required for v1.

### Data Model (conceptual)

**Meal**

- id, name, photo_path, serving_count, prep_time_minutes, tags[]
- ingredients[]: { name, quantity_description, calories, protein_g, carbs_g, fat_g }
- Derived fields (computed, not stored): total_calories, total_protein_g, total_carbs_g, total_fat_g, per_serving_calories, per_serving_protein_g, per_serving_carbs_g, per_serving_fat_g

**DayTarget**

- day_of_week (0–6), calories, protein_g, carbs_g, fat_g

**WeekPlan**

- id, week_start_date (ISO date of Monday)
- planned_meals[]: { meal_id, day_of_week, position_in_day }

**Settings**

- Single-row settings record: default daily targets (used when no per-day override is set)

### Batch Tracking Logic

- Batch counters are computed client-side from the current week’s plan.
- For a given meal in the sidebar, count how many times it appears in the current week plan. Divide by serving_count, take the ceiling to get number of batches started. The badge value = (batches_started * serving_count) - times_placed.
- When a new placement would push the count past a batch boundary, silently start a new batch. No user prompt.
- Grocery list and prep sheet multiply ingredient quantities by the number of full or partial batches needed.

### Batch Prep Optimization

- Prep sheet groups steps by cooking method inferred from ingredient/meal tags (e.g., “oven”, “stovetop”, “no-cook”).
- For v1, grouping is tag-based heuristics; AI-powered sequencing is out of scope.

### API Surface (key endpoints)

- `GET/POST/PUT/DELETE /meals` — meal library CRUD
- `POST /meals/{id}/image` — image upload
- `GET/PUT /settings` — user goal settings
- `GET/PUT /week-plans/{week_start_date}` — get or update a week’s plan
- `GET /week-plans/{week_start_date}/grocery-list` — generate grocery list
- `GET /week-plans/{week_start_date}/prep-sheet` — generate prep sheet
- `GET /week-plans/{week_start_date}/portioning-sheet` — generate portioning sheet

### Frontend Modules

- **MealLibrary**: CRUD UI for creating and editing meal cards, including image upload and tag management.
- **PlannerView**: Weekly grid with sidebar, drag-and-drop interaction, daily macro progress bars, and batch counter badges.
- **OutputsView**: Tabbed or separate pages for grocery list, prep sheet, and portioning sheet, each with a print/export action.
- **SettingsPage**: Form for default and per-day calorie/macro targets.
- **DragDropEngine**: Wraps a library like `dnd-kit` to handle sidebar-to-day and day-to-day drag interactions.

-----

## Testing Decisions

### What makes a good test

Tests should validate external behavior — what the system produces given an input — not implementation details like internal function calls or component structure. A test should remain valid even if the implementation is refactored.

### Modules to test

**Backend (pytest)**

- Macro aggregation logic: given ingredients with known macros, assert correct per-serving totals.
- Batch count calculation: given a meal with N servings placed M times, assert correct batches needed and grocery list multiplier.
- Grocery list generation: given a week plan with overlapping ingredients, assert correct de-duplication and summing.
- Prep sheet grouping: given meals with known tags, assert correct grouping by cooking method.
- Settings persistence: assert that saved settings round-trip correctly.

**Frontend (Vitest + React Testing Library)**

- Batch counter badge: given a meal placed N times in the week, assert correct badge value displayed.
- Daily macro totals: given meals dragged to a day, assert correct running totals displayed.
- Over-target indicator: given a day that exceeds calorie target, assert visual indicator is shown.

-----

## Out of Scope

- **User authentication** — single-user, local app; no auth in v1.
- **AI-powered ingredient lookup or macro generation** — manual entry only in v1.
- **Recipe vs. meal distinction** — v1 treats all planning units as flat meal cards; the recipe (dish-level) / meal (combination of dishes) hierarchy is deferred to v2.
- **Nutritional data beyond macros** — no micronutrients, fiber, sugar, sodium, etc. in v1.
- **Cost tracking** — no ingredient cost or budget features in v1.
- **Mobile responsiveness** — desktop browser is the primary target for v1.
- **Multi-user or sharing** — no collaboration features in v1.
- **Export to third-party apps** — no MyFitnessPal, Cronometer, etc. integration in v1.
- **Biweekly planning view** — weekly view only in v1; biweekly is a future enhancement.
- **Variable serving sizes** — all servings within a batch are equal.
- **Automated prep sequence optimization** — tag-based grouping only; no AI cooking sequence in v1.

-----

## Further Notes

- The app should feel fast and responsive during drag-and-drop planning. The batch counter badge update should be instantaneous (client-side state only, synced to backend on drop completion).
- The prep sheet grouping heuristic should be designed so that it’s easy to replace with an AI-powered step in a future iteration without changing the API contract.
- SQLite is sufficient for local use. When/if the app is deployed to a VPS, the SQLite file can be swapped for PostgreSQL with minimal backend changes if FastAPI + SQLAlchemy are used with an abstracted ORM layer.
- Images should be stored outside the SQLite database as flat files to keep database size manageable and simplify backup.
- The weekly plan data model should use `week_start_date` as the primary key (Monday ISO date) so that navigating weeks is deterministic and doesn’t require sequential IDs.