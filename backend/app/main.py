from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .database import Base, UPLOADS_DIR, engine
from .routers import meals, settings, week_plans

# Create tables on startup (simple migration-less approach for v1)
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Meal Planner API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

app.include_router(meals.router)
app.include_router(settings.router)
app.include_router(week_plans.router)


@app.get("/health")
def health():
    return {"status": "ok"}
