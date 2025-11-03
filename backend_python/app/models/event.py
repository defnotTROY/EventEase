"""
Event model for EventEase
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, JSON, Text, ForeignKey, Float
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from datetime import datetime
from typing import Optional, Dict, Any, List
import uuid

from app.core.database import Base


class Event(Base):
    """Event model for event management"""
    
    __tablename__ = "events"
    
    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    
    # Basic information
    title = Column(String(200), nullable=False, index=True)
    description = Column(Text, nullable=False)
    slug = Column(String(255), unique=True, nullable=True, index=True)
    
    # Event timing
    start_date = Column(DateTime(timezone=True), nullable=False, index=True)
    end_date = Column(DateTime(timezone=True), nullable=False)
    timezone = Column(String(50), default="UTC")
    
    # Location information
    location_name = Column(String(200), nullable=False)
    location_address = Column(String(500), nullable=True)
    location_city = Column(String(100), nullable=True)
    location_state = Column(String(100), nullable=True)
    location_country = Column(String(100), nullable=True)
    location_latitude = Column(Float, nullable=True)
    location_longitude = Column(Float, nullable=True)
    
    # Virtual event settings
    is_virtual = Column(Boolean, default=False, nullable=False)
    virtual_link = Column(String(500), nullable=True)
    virtual_platform = Column(String(50), default="custom")  # zoom, teams, meet, webex, custom
    
    # Event details
    category = Column(String(100), nullable=False, index=True)
    tags = Column(JSON, default=list)
    max_participants = Column(Integer, nullable=True)
    current_participants = Column(Integer, default=0, nullable=False)
    
    # Event status and visibility
    status = Column(String(20), default="draft", nullable=False, index=True)  # draft, published, cancelled, completed
    visibility = Column(String(20), default="public", nullable=False)  # public, private, organization
    
    # Media
    image_url = Column(String(500), nullable=True)
    image_public_id = Column(String(255), nullable=True)
    image_alt = Column(String(200), nullable=True)
    
    # Contact information
    contact_email = Column(String(255), nullable=False)
    contact_phone = Column(String(20), nullable=True)
    
    # Pricing information
    pricing_info = Column(JSON, default={
        "is_free": True,
        "price": 0,
        "currency": "USD",
        "early_bird_price": None,
        "early_bird_end_date": None,
        "group_discounts": []
    })
    
    # Registration settings
    registration_settings = Column(JSON, default={
        "is_open": True,
        "start_date": None,
        "end_date": None,
        "requires_approval": False,
        "custom_fields": []
    })
    
    # Event settings
    event_settings = Column(JSON, default={
        "allow_waitlist": True,
        "send_reminders": True,
        "reminder_days": [7, 3, 1],
        "collect_feedback": True,
        "generate_certificates": False,
        "enable_qr_checkin": True
    })
    
    # Analytics and engagement
    analytics = Column(JSON, default={
        "views": 0,
        "registrations": 0,
        "check_ins": 0,
        "engagement_score": 0,
        "satisfaction_score": 0,
        "last_analyzed": None
    })
    
    # AI insights
    ai_insights = Column(JSON, default=list)
    
    # Requirements and additional info
    requirements = Column(Text, nullable=True)
    
    # Organizer information
    organizer_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    organization_name = Column(String(100), nullable=True, index=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    organizer = relationship("User", back_populates="events")
    participants = relationship("Participant", back_populates="event")
    
    @property
    def duration_days(self) -> int:
        """Get event duration in days"""
        if self.start_date and self.end_date:
            return (self.end_date - self.start_date).days + 1
        return 0
    
    @property
    def registration_progress(self) -> float:
        """Get registration progress percentage"""
        if not self.max_participants:
            return 0
        return round((self.current_participants / self.max_participants) * 100, 2)
    
    @property
    def event_status(self) -> str:
        """Get current event status based on dates"""
        now = datetime.utcnow()
        
        if self.status == "cancelled":
            return "cancelled"
        elif self.status == "completed":
            return "completed"
        elif now < self.start_date:
            return "upcoming"
        elif self.start_date <= now <= self.end_date:
            return "ongoing"
        else:
            return "completed"
    
    def increment_views(self):
        """Increment view count"""
        if not self.analytics:
            self.analytics = {"views": 0}
        self.analytics["views"] = self.analytics.get("views", 0) + 1
    
    def add_participant(self):
        """Add participant to event"""
        if self.max_participants and self.current_participants >= self.max_participants:
            raise ValueError("Event is at maximum capacity")
        
        self.current_participants += 1
        self.analytics["registrations"] = self.current_participants
        
        # Update engagement score
        if self.max_participants:
            progress = self.current_participants / self.max_participants
            self.analytics["engagement_score"] = min(progress * 100, 100)
    
    def remove_participant(self):
        """Remove participant from event"""
        if self.current_participants > 0:
            self.current_participants -= 1
            self.analytics["registrations"] = self.current_participants
    
    def update_analytics(self, analytics_data: Dict[str, Any]):
        """Update analytics data"""
        if not self.analytics:
            self.analytics = {}
        
        self.analytics.update(analytics_data)
        self.analytics["last_analyzed"] = datetime.utcnow().isoformat()
    
    def add_ai_insight(self, insight: Dict[str, Any]):
        """Add AI insight to event"""
        if not self.ai_insights:
            self.ai_insights = []
        
        insight["created_at"] = datetime.utcnow().isoformat()
        self.ai_insights.append(insight)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert event to dictionary"""
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "slug": self.slug,
            "start_date": self.start_date.isoformat(),
            "end_date": self.end_date.isoformat(),
            "timezone": self.timezone,
            "location": {
                "name": self.location_name,
                "address": self.location_address,
                "city": self.location_city,
                "state": self.location_state,
                "country": self.location_country,
                "coordinates": {
                    "latitude": self.location_latitude,
                    "longitude": self.location_longitude
                }
            },
            "is_virtual": self.is_virtual,
            "virtual_link": self.virtual_link,
            "virtual_platform": self.virtual_platform,
            "category": self.category,
            "tags": self.tags,
            "max_participants": self.max_participants,
            "current_participants": self.current_participants,
            "status": self.status,
            "visibility": self.visibility,
            "image": {
                "url": self.image_url,
                "public_id": self.image_public_id,
                "alt": self.image_alt
            },
            "contact_email": self.contact_email,
            "contact_phone": self.contact_phone,
            "pricing": self.pricing_info,
            "registration": self.registration_settings,
            "settings": self.event_settings,
            "analytics": self.analytics,
            "ai_insights": self.ai_insights,
            "requirements": self.requirements,
            "organizer_id": self.organizer_id,
            "organization": self.organization_name,
            "duration_days": self.duration_days,
            "registration_progress": self.registration_progress,
            "event_status": self.event_status,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat()
        }
    
    def __repr__(self):
        return f"<Event(id={self.id}, title='{self.title}', status='{self.status}')>"
