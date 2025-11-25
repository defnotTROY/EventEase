"""
Participants endpoints
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from supabase import create_client, Client

from app.core.config import settings

router = APIRouter()


def get_supabase() -> Client:
    """Get Supabase client"""
    if not settings.SUPABASE_URL or not settings.SUPABASE_ANON_KEY:
        raise HTTPException(status_code=500, detail="Supabase configuration missing")
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)


class QRCheckInRequest(BaseModel):
    """Request model for QR check-in"""
    event_id: str
    user_id: str
    email: Optional[str] = None


class CheckInResponse(BaseModel):
    """Response model for check-in"""
    success: bool
    message: str
    participant: Optional[dict] = None


@router.post("/check-in", response_model=CheckInResponse)
async def check_in_participant(
    request: QRCheckInRequest,
    supabase: Client = Depends(get_supabase)
):
    """
    Check in a participant using QR code data
    """
    try:
        # Get all participants for this event
        participants_response = supabase.table('participants').select('*').eq('event_id', request.event_id).execute()
        
        if participants_response.data is None:
            raise HTTPException(status_code=500, detail="Failed to fetch participants")
        
        # Find the participant by user_id or email
        participant = None
        for p in participants_response.data:
            if p.get('user_id') == request.user_id or (request.email and p.get('email', '').lower() == request.email.lower()):
                participant = p
                break
        
        if not participant:
            raise HTTPException(
                status_code=404,
                detail=f"Participant not found for this event. User {request.email or request.user_id} is not registered."
            )
        
        # Check if already checked in
        if participant.get('status') == 'attended' or participant.get('status') == 'checked-in':
            return CheckInResponse(
                success=False,
                message=f"{participant.get('first_name', participant.get('email', 'User'))} is already checked in.",
                participant=participant
            )
        
        # Update participant status to 'attended'
        update_data = {
            'status': 'attended',
            'checked_in_at': datetime.utcnow().isoformat()
        }
        
        # Update the participant
        update_response = supabase.table('participants').update(update_data).eq('id', participant['id']).execute()
        
        if not update_response.data or len(update_response.data) == 0:
            raise HTTPException(status_code=500, detail="Failed to update participant status")
        
        updated_participant = update_response.data[0]
        
        return CheckInResponse(
            success=True,
            message=f"{updated_participant.get('first_name', updated_participant.get('email', 'User'))} has been successfully checked in!",
            participant=updated_participant
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error checking in participant: {str(e)}")
