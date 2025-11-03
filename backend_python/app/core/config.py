"""
Application configuration settings
"""

from pydantic_settings import BaseSettings
from pydantic import validator
from typing import List, Optional
import os
from pathlib import Path


class Settings(BaseSettings):
    """Application settings"""
    
    # Server Configuration
    DEBUG: bool = True
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    RELOAD: bool = True
    
    # Database Configuration
    DATABASE_URL: str = "postgresql://username:password@localhost:5432/eventease"
    MONGODB_URL: Optional[str] = None
    
    # JWT Configuration
    SECRET_KEY: str = "your_super_secret_key_here_make_it_long_and_random"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours
    
    # AI Services
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-3.5-turbo"
    
    # File Upload - Cloudinary
    CLOUDINARY_CLOUD_NAME: Optional[str] = None
    CLOUDINARY_API_KEY: Optional[str] = None
    CLOUDINARY_API_SECRET: Optional[str] = None
    
    # Email Configuration
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USERNAME: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_TLS: bool = True
    SMTP_SSL: bool = False
    
    # Redis Configuration
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # CORS Configuration
    FRONTEND_URL: str = "http://localhost:3000"
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]
    
    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 60
    RATE_LIMIT_BURST: int = 100
    
    # Security
    BCRYPT_ROUNDS: int = 12
    PASSWORD_MIN_LENGTH: int = 6
    
    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    
    # Environment
    ENVIRONMENT: str = "development"
    
    @validator("ALLOWED_ORIGINS", pre=True)
    def assemble_cors_origins(cls, v):
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)
    
    @validator("SECRET_KEY")
    def validate_secret_key(cls, v):
        if len(v) < 32:
            raise ValueError("SECRET_KEY must be at least 32 characters long")
        return v
    
    class Config:
        env_file = ".env"
        case_sensitive = True


# Create settings instance
settings = Settings()

# Database URL validation
if not settings.DATABASE_URL and not settings.MONGODB_URL:
    raise ValueError("Either DATABASE_URL or MONGODB_URL must be set")

# Log configuration info
print(f"🔧 Configuration loaded:")
print(f"   Environment: {settings.ENVIRONMENT}")
print(f"   Debug mode: {settings.DEBUG}")
print(f"   Database: {'PostgreSQL' if settings.DATABASE_URL else 'MongoDB'}")
print(f"   AI Features: {'Enabled' if settings.OPENAI_API_KEY else 'Disabled'}")
print(f"   File Upload: {'Enabled' if settings.CLOUDINARY_CLOUD_NAME else 'Disabled'}")
