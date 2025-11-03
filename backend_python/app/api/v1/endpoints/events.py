"""
Events endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from app.core.database import get_db
from app.models.event import Event
from app.api.v1.endpoints.auth import get_current_user
from app.models.user import User

router = APIRouter()


# Pydantic models
class EventCreate(BaseModel):
    title: str
    description: str
    start_date: datetime
    end_date: datetime
    location_name: str
    category: str
    contact_email: str
    max_participants: Optional[int] = None
    contact_phone: Optional[str] = None
    is_virtual: bool = False
    virtual_link: Optional[str] = None


class EventResponse(BaseModel):
    id: int
    title: str
    description: str
    start_date: datetime
    end_date: datetime
    location_name: str
    category: str
    contact_email: str
    max_participants: Optional[int]
    current_participants: int
    status: str
    organizer_id: int
    created_at: datetime


# Events endpoints
@router.get("/", response_model=List[EventResponse])
async def get_events(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    category: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Get all events with filtering and pagination"""
    
    # Build query
    query = "SELECT * FROM events WHERE 1=1"
    params = {}
    
    if category:
        query += " AND category = :category"
        params["category"] = category
    
    if status:
        query += " AND status = :status"
        params["status"] = status
    
    if search:
        query += " AND (title ILIKE :search OR description ILIKE :search)"
        params["search"] = f"%{search}%"
    
    # Add pagination
    offset = (page - 1) * limit
    query += " ORDER BY created_at DESC LIMIT :limit OFFSET :offset"
    params.update({"limit": limit, "offset": offset})
    
    # Execute query
    result = await db.execute(query, params)
    events = result.fetchall()
    
    return [EventResponse(**dict(event)) for event in events]


@router.get("/{event_id}", response_model=EventResponse)
async def get_event(
    event_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get single event by ID"""
    
    result = await db.execute(
        "SELECT * FROM events WHERE id = :event_id",
        {"event_id": event_id}
    )
    event = result.fetchone()
    
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )
    
    return EventResponse(**dict(event))


@router.post("/", response_model=EventResponse)
async def create_event(
    event_data: EventCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create new event"""
    
    # Create event
    result = await db.execute(
        """
        INSERT INTO events (
            title, description, start_date, end_date, location_name, category,
            contact_email, max_participants, contact_phone, is_virtual, virtual_link,
            organizer_id, organization_name, status, created_at, updated_at
        )
        VALUES (
            :title, :description, :start_date, :end_date, :location_name, :category,
            :contact_email, :max_participants, :contact_phone, :is_virtual, :virtual_link,
            :organizer_id, :organization_name, :status, :created_at, :updated_at
        )
        RETURNING id
        """,
        {
            "title": event_data.title,
            "description": event_data.description,
            "start_date": event_data.start_date,
            "end_date": event_data.end_date,
            "location_name": event_data.location_name,
            "category": event_data.category,
            "contact_email": event_data.contact_email,
            "max_participants": event_data.max_participants,
            "contact_phone": event_data.contact_phone,
            "is_virtual": event_data.is_virtual,
            "virtual_link": event_data.virtual_link,
            "organizer_id": current_user.id,
            "organization_name": current_user.organization,
            "status": "draft",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
    )
    
    event_id = result.fetchone()[0]
    await db.commit()
    
    # Get created event
    result = await db.execute(
        "SELECT * FROM events WHERE id = :event_id",
        {"event_id": event_id}
    )
    event = result.fetchone()
    
    return EventResponse(**dict(event))


@router.put("/{event_id}", response_model=EventResponse)
async def update_event(
    event_id: int,
    event_data: EventCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update event"""
    
    # Check if event exists and user can update it
    result = await db.execute(
        "SELECT * FROM events WHERE id = :event_id",
        {"event_id": event_id}
    )
    event = result.fetchone()
    
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )
    
    if event.organizer_id != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. You can only update your own events."
        )
    
    # Update event
    await db.execute(
        """
        UPDATE events SET
            title = :title,
            description = :description,
            start_date = :start_date,
            end_date = :end_date,
            location_name = :location_name,
            category = :category,
            contact_email = :contact_email,
            max_participants = :max_participants,
            contact_phone = :contact_phone,
            is_virtual = :is_virtual,
            virtual_link = :virtual_link,
            updated_at = :updated_at
        WHERE id = :event_id
        """,
        {
            "event_id": event_id,
            "title": event_data.title,
            "description": event_data.description,
            "start_date": event_data.start_date,
            "end_date": event_data.end_date,
            "location_name": event_data.location_name,
            "category": event_data.category,
            "contact_email": event_data.contact_email,
            "max_participants": event_data.max_participants,
            "contact_phone": event_data.contact_phone,
            "is_virtual": event_data.is_virtual,
            "virtual_link": event_data.virtual_link,
            "updated_at": datetime.utcnow()
        }
    )
    await db.commit()
    
    # Get updated event
    result = await db.execute(
        "SELECT * FROM events WHERE id = :event_id",
        {"event_id": event_id}
    )
    event = result.fetchone()
    
    return EventResponse(**dict(event))


@router.delete("/{event_id}")
async def delete_event(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete event"""
    
    # Check if event exists and user can delete it
    result = await db.execute(
        "SELECT * FROM events WHERE id = :event_id",
        {"event_id": event_id}
    )
    event = result.fetchone()
    
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )
    
    if event.organizer_id != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. You can only delete your own events."
        )
    
    # Check if event has participants
    result = await db.execute(
        "SELECT COUNT(*) FROM participants WHERE event_id = :event_id",
        {"event_id": event_id}
    )
    participant_count = result.fetchone()[0]
    
    if participant_count > 0 and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete event with registered participants. Cancel the event instead."
        )
    
    # Delete event
    await db.execute(
        "DELETE FROM events WHERE id = :event_id",
        {"event_id": event_id}
    )
    await db.commit()
    
    return {"message": "Event deleted successfully"}
