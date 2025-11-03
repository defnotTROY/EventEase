"""
Participant model for EventEase
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, JSON, Text, ForeignKey, Float
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from datetime import datetime
from typing import Optional, Dict, Any, List

from app.core.database import Base


class Participant(Base):
    """Participant model for event registration and management"""
    
    __tablename__ = "participants"
    
    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    
    # Basic information
    first_name = Column(String(50), nullable=False, index=True)
    last_name = Column(String(50), nullable=False, index=True)
    email = Column(String(255), nullable=False, index=True)
    phone = Column(String(20), nullable=True)
    avatar_url = Column(String(500), nullable=True)
    
    # Event information
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False, index=True)
    organizer_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    organization_name = Column(String(100), nullable=True, index=True)
    
    # Registration information
    registration_date = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    status = Column(String(20), default="registered", nullable=False, index=True)  # registered, confirmed, checked-in, cancelled, no-show
    registration_source = Column(String(20), default="website")  # website, social-media, email, referral, direct, other
    referral_code = Column(String(50), nullable=True)
    
    # Check-in information
    check_in_data = Column(JSON, default={
        "is_checked_in": False,
        "check_in_time": None,
        "check_in_method": None,  # qr-code, manual, mobile-app
        "checked_in_by": None
    })
    
    # Custom fields (from event registration form)
    custom_fields = Column(JSON, default=list)
    
    # Payment information
    payment_info = Column(JSON, default={
        "is_paid": False,
        "amount": None,
        "currency": "USD",
        "payment_method": None,
        "transaction_id": None,
        "payment_date": None,
        "refunded": False,
        "refund_amount": None,
        "refund_date": None
    })
    
    # Communication preferences
    communication_preferences = Column(JSON, default={
        "email_updates": True,
        "sms_updates": False,
        "push_notifications": True
    })
    
    # Requirements and accessibility
    requirements_info = Column(JSON, default={
        "dietary_restrictions": [],
        "accessibility_needs": None,
        "allergies": [],
        "emergency_contact": {
            "name": None,
            "phone": None,
            "relationship": None
        }
    })
    
    # Feedback and engagement
    feedback_data = Column(JSON, default={
        "rating": None,
        "comments": None,
        "would_recommend": None,
        "topics_of_interest": [],
        "submitted_at": None
    })
    
    # Analytics
    analytics_data = Column(JSON, default={
        "email_opens": 0,
        "email_clicks": 0,
        "last_email_sent": None,
        "engagement_score": 0,
        "last_activity": None
    })
    
    # Waitlist information
    waitlist_info = Column(JSON, default={
        "is_on_waitlist": False,
        "waitlist_position": None,
        "waitlist_date": None,
        "promoted_date": None
    })
    
    # Additional information
    tags = Column(JSON, default=list)
    notes = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    event = relationship("Event", back_populates="participants")
    organizer_user = relationship("User", back_populates="participants")
    
    @property
    def full_name(self) -> str:
        """Get participant's full name"""
        return f"{self.first_name} {self.last_name}"
    
    @property
    def registration_age_days(self) -> int:
        """Get registration age in days"""
        return (datetime.utcnow() - self.registration_date).days
    
    @property
    def is_checked_in(self) -> bool:
        """Check if participant is checked in"""
        return self.check_in_data.get("is_checked_in", False)
    
    @property
    def is_on_waitlist(self) -> bool:
        """Check if participant is on waitlist"""
        return self.waitlist_info.get("is_on_waitlist", False)
    
    def check_in(self, method: str = "manual", checked_in_by: Optional[int] = None):
        """Check in participant"""
        self.check_in_data.update({
            "is_checked_in": True,
            "check_in_time": datetime.utcnow().isoformat(),
            "check_in_method": method,
            "checked_in_by": checked_in_by
        })
        self.status = "checked-in"
        self._update_analytics()
    
    def cancel_registration(self):
        """Cancel participant registration"""
        self.status = "cancelled"
        self._update_analytics()
    
    def add_to_waitlist(self, position: int):
        """Add participant to waitlist"""
        self.waitlist_info.update({
            "is_on_waitlist": True,
            "waitlist_position": position,
            "waitlist_date": datetime.utcnow().isoformat()
        })
        self.status = "registered"
        self._update_analytics()
    
    def promote_from_waitlist(self):
        """Promote participant from waitlist"""
        self.waitlist_info.update({
            "is_on_waitlist": False,
            "promoted_date": datetime.utcnow().isoformat()
        })
        self.status = "confirmed"
        self._update_analytics()
    
    def update_feedback(self, feedback_data: Dict[str, Any]):
        """Update participant feedback"""
        self.feedback_data.update(feedback_data)
        self.feedback_data["submitted_at"] = datetime.utcnow().isoformat()
        self._update_analytics()
    
    def increment_email_open(self):
        """Increment email open count"""
        current_opens = self.analytics_data.get("email_opens", 0)
        self.analytics_data["email_opens"] = current_opens + 1
        self._update_analytics()
    
    def increment_email_click(self):
        """Increment email click count"""
        current_clicks = self.analytics_data.get("email_clicks", 0)
        self.analytics_data["email_clicks"] = current_clicks + 1
        self._update_analytics()
    
    def _update_analytics(self):
        """Update analytics data"""
        # Update last activity
        self.analytics_data["last_activity"] = datetime.utcnow().isoformat()
        
        # Calculate engagement score
        score = 0
        if self.is_checked_in:
            score += 50
        if self.feedback_data.get("rating"):
            score += 20
        if self.feedback_data.get("comments"):
            score += 10
        if self.analytics_data.get("email_opens", 0) > 0:
            score += 10
        if self.analytics_data.get("email_clicks", 0) > 0:
            score += 10
        
        self.analytics_data["engagement_score"] = min(score, 100)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert participant to dictionary"""
        return {
            "id": self.id,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "full_name": self.full_name,
            "email": self.email,
            "phone": self.phone,
            "avatar_url": self.avatar_url,
            "event_id": self.event_id,
            "organizer_id": self.organizer_id,
            "organization": self.organization_name,
            "registration_date": self.registration_date.isoformat(),
            "status": self.status,
            "registration_source": self.registration_source,
            "referral_code": self.referral_code,
            "check_in": self.check_in_data,
            "custom_fields": self.custom_fields,
            "payment": self.payment_info,
            "communication": self.communication_preferences,
            "requirements": self.requirements_info,
            "feedback": self.feedback_data,
            "analytics": self.analytics_data,
            "waitlist": self.waitlist_info,
            "tags": self.tags,
            "notes": self.notes,
            "registration_age_days": self.registration_age_days,
            "is_checked_in": self.is_checked_in,
            "is_on_waitlist": self.is_on_waitlist,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat()
        }
    
    def __repr__(self):
        return f"<Participant(id={self.id}, name='{self.full_name}', event_id={self.event_id})>"
