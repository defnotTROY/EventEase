"""
Database configuration and connection
"""

from sqlalchemy import create_engine, MetaData
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import sessionmaker
from typing import AsyncGenerator
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)

# SQLAlchemy setup for PostgreSQL (skip if using Supabase)
if settings.DATABASE_URL and not settings.SUPABASE_URL:
    # Convert sync URL to async URL
    if settings.DATABASE_URL.startswith("postgresql://"):
        async_database_url = settings.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")
    else:
        async_database_url = settings.DATABASE_URL
    
    # Create async engine
    engine = create_async_engine(
        async_database_url,
        echo=settings.DEBUG,
        future=True
    )
    
    # Create async session factory
    AsyncSessionLocal = async_sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False
    )
    
    # Create base class for models
    Base = declarative_base()
    
    # Metadata for migrations
    metadata = MetaData()
else:
    # When using Supabase, create dummy values for compatibility
    engine = None
    Base = declarative_base()  # Still create Base for model definitions
    metadata = MetaData()
    AsyncSessionLocal = None
    # MongoDB setup (only imported if needed)
    try:
        from motor.motor_asyncio import AsyncIOMotorClient
    except ImportError:
        AsyncIOMotorClient = None
        logger.warning("Motor (MongoDB driver) not installed. MongoDB functionality will be unavailable.")
    
    client = None
    database = None
    
    async def init_mongodb():
        """Initialize MongoDB connection"""
        if AsyncIOMotorClient is None:
            raise ImportError("Motor is required for MongoDB but not installed. Install it with: pip install motor")
        global client, database
        client = AsyncIOMotorClient(settings.MONGODB_URL)
        database = client.eventease
        logger.info("✅ MongoDB connected")
        return database
    
    async def close_mongodb():
        """Close MongoDB connection"""
        if client:
            client.close()
            logger.info("🔌 MongoDB connection closed")

# Dependency for getting database session
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Get database session dependency"""
    if settings.DATABASE_URL:
        async with AsyncSessionLocal() as session:
            try:
                yield session
            finally:
                await session.close()
    else:
        # For MongoDB, we'll use the database directly
        db = await init_mongodb()
        yield db

# Database health check
async def check_db_connection():
    """Check database connection health"""
    try:
        if settings.DATABASE_URL:
            async with AsyncSessionLocal() as session:
                await session.execute("SELECT 1")
            return {"status": "healthy", "database": "postgresql"}
        else:
            db = await init_mongodb()
            await db.command("ping")
            return {"status": "healthy", "database": "mongodb"}
    except Exception as e:
        logger.error(f"Database connection error: {e}")
        return {"status": "unhealthy", "error": str(e)}

# Database initialization
async def init_db():
    """Initialize database"""
    try:
        if settings.DATABASE_URL:
            # Create tables for PostgreSQL
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            logger.info("✅ PostgreSQL tables created")
        else:
            # Initialize MongoDB
            await init_mongodb()
            logger.info("✅ MongoDB initialized")
    except Exception as e:
        logger.error(f"Database initialization error: {e}")
        raise

# Database cleanup
async def close_db():
    """Close database connections"""
    try:
        if settings.DATABASE_URL:
            await engine.dispose()
            logger.info("🔌 PostgreSQL connection closed")
        else:
            await close_mongodb()
    except Exception as e:
        logger.error(f"Database cleanup error: {e}")
