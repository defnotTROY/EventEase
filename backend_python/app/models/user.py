"""
User model for EventEase
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, JSON, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from passlib.context import CryptContext
from datetime import datetime
from typing import Optional, Dict, Any
import secrets
import string

from app.core.database import Base

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class User(Base):
    """User model for authentication and profile management"""
    
    __tablename__ = "users"
    
    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    
    # Basic information
    first_name = Column(String(50), nullable=False, index=True)
    last_name = Column(String(50), nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    phone = Column(String(20), nullable=True)
    
    # Organization information
    organization = Column(String(100), nullable=True, index=True)
    role = Column(String(20), nullable=False, default="organizer")  # admin, organizer, viewer
    
    # Profile information
    avatar_url = Column(String(500), nullable=True)
    timezone = Column(String(50), default="UTC")
    language = Column(String(10), default="en")
    
    # Account status
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    last_login = Column(DateTime(timezone=True), nullable=True)
    
    # Verification tokens
    verification_token = Column(String(255), nullable=True)
    password_reset_token = Column(String(255), nullable=True)
    password_reset_expires = Column(DateTime(timezone=True), nullable=True)
    
    # Preferences (stored as JSON)
    notification_preferences = Column(JSON, default={
        "email": True,
        "push": True,
        "event_reminders": True,
        "participant_updates": True,
        "system_alerts": False,
        "marketing_emails": False
    })
    
    ai_preferences = Column(JSON, default={
        "ai_insights": True,
        "smart_recommendations": True,
        "automated_scheduling": True,
        "predictive_analytics": True,
        "sentiment_analysis": True,
        "auto_tagging": False
    })
    
    security_settings = Column(JSON, default={
        "two_factor_auth": False,
        "session_timeout": 30,  # minutes
        "password_expiry": 90,  # days
        "login_notifications": True,
        "suspicious_activity_alerts": True
    })
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    events = relationship("Event", back_populates="organizer")
    participants = relationship("Participant", back_populates="organizer_user")
    
    @property
    def full_name(self) -> str:
        """Get user's full name"""
        return f"{self.first_name} {self.last_name}"
    
    @property
    def password(self):
        """Password property (not accessible)"""
        raise AttributeError("Password is not accessible")
    
    @password.setter
    def password(self, password: str):
        """Set password hash"""
        self.password_hash = pwd_context.hash(password)
    
    def verify_password(self, password: str) -> bool:
        """Verify password"""
        return pwd_context.verify(password, self.password_hash)
    
    def generate_verification_token(self) -> str:
        """Generate verification token"""
        token = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(32))
        self.verification_token = token
        return token
    
    def generate_password_reset_token(self) -> str:
        """Generate password reset token"""
        token = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(32))
        self.password_reset_token = token
        self.password_reset_expires = datetime.utcnow() + timedelta(hours=1)
        return token
    
    def update_last_login(self):
        """Update last login timestamp"""
        self.last_login = datetime.utcnow()
    
    def to_dict(self, exclude_password: bool = True) -> Dict[str, Any]:
        """Convert user to dictionary"""
        data = {
            "id": self.id,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "email": self.email,
            "phone": self.phone,
            "organization": self.organization,
            "role": self.role,
            "avatar_url": self.avatar_url,
            "timezone": self.timezone,
            "language": self.language,
            "is_active": self.is_active,
            "is_verified": self.is_verified,
            "last_login": self.last_login.isoformat() if self.last_login else None,
            "notification_preferences": self.notification_preferences,
            "ai_preferences": self.ai_preferences,
            "security_settings": self.security_settings,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat()
        }
        
        if not exclude_password:
            data["password_hash"] = self.password_hash
        
        return data
    
    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}', role='{self.role}')>"
