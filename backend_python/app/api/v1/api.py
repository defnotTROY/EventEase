"""
API v1 router configuration
"""

from fastapi import APIRouter
from app.api.v1.endpoints import auth, events, participants, analytics, users, upload

api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(events.router, prefix="/events", tags=["events"])
api_router.include_router(participants.router, prefix="/participants", tags=["participants"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(upload.router, prefix="/upload", tags=["upload"])
