# Mise — Meal Planner

A local-first meal-planning web app: maintain a library of meal cards, drag them
onto a weekly grid against daily macro targets, then generate an actionable
grocery list, batch prep sheet, and portioning sheet.

Built per [`meal-planner-prd.md`](./meal-planner-prd.md).

## Stack

| Layer        | Tech                                                  |
| ------------ | ----------------------------------------------------- |
| Frontend     | React + TypeScript + Vite + Tailwind + dnd-kit       |
| Backend      | FastAPI + SQLAlchemy + Pydantic                       |
| Database     | SQLite (file-based, co-located with backend)         |
| Image store  | Flat files in `backend/uploads/`                      |
| Tests        | pytest (backend) · Vitest + Testing Library (frontend) |

## Getting started

### 1. Backend

Requires Python 3.10+. Using [`uv`](https://github.com/astral-sh/uv) (recommended):

```bash
cd backend
uv venv
source .venv/bin/activate
uv pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Or with stdlib `venv` + `pip`:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

The first run creates `meal_planner.db` automatically. The OpenAPI explorer is
at `http://localhost:8000/docs`.

### 2. Frontend

Requires Node 18+.

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. The dev server proxies `/api/*` and `/uploads/*`
to the backend on port 8000.

## Running tests

```bash
# Backend
cd backend && python -m pytest

# Frontend
cd frontend && npm test
```

## Project layout

```
meal-planner/
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI entry, mounts /uploads & routers
│   │   ├── database.py        # SQLite engine + session
│   │   ├── models.py          # SQLAlchemy models
│   │   ├── schemas.py         # Pydantic schemas
│   │   ├── services.py        # Macro aggregation, batch math, output builders
│   │   └── routers/
│   │       ├── meals.py       # CRUD + image upload
│   │       ├── settings.py    # Defaults + per-day overrides
│   │       └── week_plans.py  # Week plan + outputs endpoints
│   └── tests/
│       └── test_services.py   # Macro / batch / grocery / prep / portioning
└── frontend/
    └── src/
        ├── App.tsx
        ├── main.tsx
        ├── components/        # Layout, Modal, MealEditor, MacroBar, Icons, …
        ├── pages/             # PlannerPage, LibraryPage, OutputsPage, SettingsPage
        └── lib/               # api.ts, store.tsx, types.ts, utils.ts
```

## Key features

- **Meal library** — full CRUD with per-ingredient macros, photo upload, tags, prep time, serving count, and live per-serving / batch totals as you type.
- **Weekly planner** — 7-column grid with drag-and-drop from a filterable sidebar. Drag meals between days. Drag back to the sidebar to remove. Daily macro progress bars with over-target indicators.
- **Batch counter badges** — sidebar cards show servings remaining in the current batch and total batches needed. Silent rollover when a batch is fully allocated.
- **Per-day macro targets** — defaults + optional overrides per day of the week for training vs. rest days.
- **Outputs** — grocery list (de-duped, categorized, checkable), batch prep sheet (grouped by cooking method, multiplied by batches), portioning sheet (yield vs. needed, containers per batch). All print-ready.
- **Offline-friendly UI** — optimistic week-plan updates; batch counters compute client-side for instant feedback, then sync to the backend.

## Notes

- Authentication is intentionally absent (single-user local app, per PRD).
- Cooking-method grouping is a tag-based heuristic — see `infer_cooking_method` in `backend/app/services.py` for the lookup. Replaceable with an AI-powered step without changing the API contract.
- All servings within a batch are equal in v1.
