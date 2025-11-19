"""
EventEase Backend API - FastAPI Application
Smart Event Management Platform with AI Integration
"""

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.security import HTTPBearer
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
import uvicorn
import logging
from contextlib import asynccontextmanager

from app.core.config import settings
from app.core.database import engine, Base
from app.core.exceptions import CustomException, custom_exception_handler
from app.api.v1.api import api_router
from app.core.middleware import LoggingMiddleware

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format=settings.LOG_FORMAT
)
logger = logging.getLogger(__name__)

# Rate limiter
limiter = Limiter(key_func=get_remote_address)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    logger.info("🚀 Starting EventEase API...")
    
    # Create database tables
    if engine is not None:  # Only create tables if using SQLAlchemy engine
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    logger.info("✅ Database tables created")
    
    yield
    
    # Shutdown
    logger.info("🛑 Shutting down EventEase API...")

# Create FastAPI application
app = FastAPI(
    title="EventEase API",
    description="Smart Event Management Platform with AI Integration",
    version="1.0.0",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    lifespan=lifespan
)

# Add rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add trusted host middleware
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["*"] if settings.DEBUG else ["localhost", "127.0.0.1"]
)

# Add custom logging middleware
app.add_middleware(LoggingMiddleware)

# Add custom exception handler
app.add_exception_handler(CustomException, custom_exception_handler)

# Include API routes
app.include_router(api_router, prefix="/api/v1")

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "EventEase API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs" if settings.DEBUG else "disabled"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "message": "EventEase API is running",
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT
    }

@app.get("/api/health")
async def api_health_check():
    """API health check endpoint"""
    return {
        "success": True,
        "message": "EventEase API is running",
        "timestamp": "2024-01-01T00:00:00Z",
        "version": "1.0.0"
    }

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.RELOAD,
        log_level=settings.LOG_LEVEL.lower()
    )
