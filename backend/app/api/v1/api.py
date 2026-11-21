from fastapi import APIRouter

from app.api.v1.endpoints import activities, calendar, categories, goals, habits, health, journal, notifications, planner

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(categories.router)
api_router.include_router(activities.router)
api_router.include_router(planner.router)
api_router.include_router(goals.router)
api_router.include_router(habits.router)
api_router.include_router(journal.router)
api_router.include_router(calendar.router)
api_router.include_router(notifications.router)
