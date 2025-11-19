"""
Analytics endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any, List
from datetime import datetime
from supabase import create_client, Client
from app.services.recommendation_service import recommendation_service
from app.core.config import settings

router = APIRouter()

def get_supabase() -> Client:
    """Get Supabase client"""
    if not settings.SUPABASE_URL or not settings.SUPABASE_ANON_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase configuration missing. Please set SUPABASE_URL and SUPABASE_ANON_KEY in your .env file."
        )
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)


async def build_user_profile(user_id: str, supabase: Client) -> Dict[str, Any]:
    """Build user profile from their event history and initial signup preferences"""
    try:
        # First, get user's initial preferences from metadata (signup preferences)
        # Try to get from auth.users via RPC or direct query
        initial_categories = []
        initial_tags = []
        
        try:
            # Try getting from auth.users table (requires service role key, but fallback to anon)
            # Note: with anon key, we can't directly query auth.users, so we'll rely on the metadata
            # being accessible via the user session or stored in a profiles table
            # For now, we'll check if there's a profiles/users table
            try:
                # Check if there's a users table in public schema
                users_response = supabase.table('users').select('raw_user_meta_data').eq('id', user_id).execute()
                if users_response.data and len(users_response.data) > 0:
                    user_metadata = users_response.data[0].get('raw_user_meta_data', {}) or {}
                    initial_categories = user_metadata.get('selected_categories', []) or []
                    initial_tags = user_metadata.get('selected_tags', []) or []
            except Exception:
                # If no users table, preferences will be empty initially
                # They'll be populated as user interacts with events
                pass
        except Exception as e:
            logger.debug(f"Could not fetch initial preferences from metadata: {e}")
            pass
        
        # Get user's created events
        user_events_response = supabase.table('events').select(
            'id, title, description, category, tags'
        ).eq('user_id', user_id).execute()
        
        user_events = user_events_response.data if user_events_response.data else []
        
        # Get user's participation history (separate query)
        participations_response = supabase.table('participants').select(
            'event_id, status'
        ).eq('user_id', user_id).execute()
        
        participations = participations_response.data if participations_response.data else []
        
        # Get event details for participations
        event_ids = [p['event_id'] for p in participations if p.get('event_id')]
        participation_events = {}
        if event_ids:
            events_response = supabase.table('events').select(
                'id, title, category, tags, description'
            ).in_('id', event_ids).execute()
            participation_events = {e['id']: e for e in (events_response.data or [])}
        
        # Extract preferences
        categories = {}
        tags = {}
        participation_history = []
        
        # Start with initial preferences from signup (lower weight for new users)
        for cat in initial_categories:
            if cat:
                categories[cat] = categories.get(cat, 0) + 1
        
        for tag in initial_tags:
            if tag:
                tags[tag] = tags.get(tag, 0) + 1
        
        # From created events
        for event in user_events:
            category = event.get('category')
            if category:
                categories[category] = categories.get(category, 0) + 2  # Higher weight than initial prefs
            
            event_tags = event.get('tags', []) or []
            for tag in event_tags:
                if tag:
                    tags[tag] = tags.get(tag, 0) + 2  # Higher weight than initial prefs
        
        # From participations
        for participation in participations:
            event_id = participation.get('event_id')
            if event_id and event_id in participation_events:
                event_data = participation_events[event_id]
                category = event_data.get('category')
                if category:
                    categories[category] = categories.get(category, 0) + 2  # Higher weight
                
                event_tags = event_data.get('tags', []) or []
                for tag in event_tags:
                    if tag:
                        tags[tag] = tags.get(tag, 0) + 2  # Higher weight
                
                participation_history.append({
                    'title': event_data.get('title', ''),
                    'category': category or '',
                    'tags': event_tags
                })
        
        # Get top categories and tags
        favorite_categories = sorted(categories.items(), key=lambda x: x[1], reverse=True)[:3]
        favorite_categories = [cat for cat, _ in favorite_categories] if favorite_categories else initial_categories[:3]
        
        favorite_tags = sorted(tags.items(), key=lambda x: x[1], reverse=True)[:5]
        favorite_tags = [tag for tag, _ in favorite_tags] if favorite_tags else initial_tags[:5]
        
        # If no history, use initial preferences
        if len(user_events) == 0 and len(participations) == 0:
            favorite_categories = initial_categories[:3] if initial_categories else []
            favorite_tags = initial_tags[:5] if initial_tags else []
        
        return {
            'favorite_categories': favorite_categories,
            'favorite_tags': favorite_tags,
            'participation_history': participation_history,
            'events_created': len(user_events),
            'events_attended': len([p for p in participations if p.get('status') == 'attended']),
            'has_initial_preferences': len(initial_categories) > 0 or len(initial_tags) > 0
        }
    except Exception as e:
        logger.error(f"Error building user profile: {e}")
        # Return minimal profile on error
        return {
            'favorite_categories': [],
            'favorite_tags': [],
            'participation_history': [],
            'events_created': 0,
            'events_attended': 0,
            'has_initial_preferences': False
        }


@router.get("/recommendations/{user_id}")
async def get_personalized_recommendations(
    user_id: str,
    top_n: int = 5,
    initial_categories: str = None,  # Comma-separated categories from frontend
    initial_tags: str = None,  # Comma-separated tags from frontend
    supabase: Client = Depends(get_supabase)
):
    """
    Get personalized event recommendations using basic AI (TF-IDF + similarity scoring)
    
    Accepts optional initial_categories and initial_tags query params for new users
    to provide immediate recommendations based on signup preferences.
    """
    try:
        # Build user profile
        user_profile = await build_user_profile(user_id, supabase)
        
        # If no history and frontend provides initial preferences, use them
        if (user_profile.get('events_created', 0) == 0 and 
            user_profile.get('events_attended', 0) == 0 and
            (initial_categories or initial_tags)):
            if initial_categories:
                cats = [c.strip() for c in initial_categories.split(',') if c.strip()]
                if cats:
                    user_profile['favorite_categories'] = cats[:3]
            if initial_tags:
                tags = [t.strip() for t in initial_tags.split(',') if t.strip()]
                if tags:
                    user_profile['favorite_tags'] = tags[:5]
        
        # Get available events (not created by user, future events)
        today = datetime.now().date().isoformat()
        events_response = supabase.table('events').select(
            'id, title, description, category, tags, date, location, max_participants'
        ).neq('user_id', user_id).gte('date', today).execute()
        
        available_events = events_response.data if events_response.data else []
        
        # Get current participant counts for popularity scoring
        for event in available_events:
            try:
                participants_response = supabase.table('participants').select(
                    'id'
                ).eq('event_id', event['id']).execute()
                
                event['current_participants'] = len(participants_response.data) if participants_response.data else 0
            except:
                event['current_participants'] = 0
            event['max_participants'] = event.get('max_participants', 0) or 0
        
        # Get recommendations using AI service
        # Even if user has no preferences, we'll still show popular/upcoming events
        recommendations = recommendation_service.get_recommendations(
            user_profile=user_profile,
            available_events=available_events,
            top_n=top_n
        )
        
        # If no recommendations but we have events, return popular events as fallback
        if not recommendations and available_events:
            # Sort by popularity and date
            sorted_events = sorted(
                available_events,
                key=lambda e: (
                    e.get('current_participants', 0),
                    -((datetime.fromisoformat(e.get('date', datetime.now().isoformat())).date() - datetime.now().date()).days if e.get('date') else 999)
                ),
                reverse=True
            )
            
            # Create basic recommendations from top events
            for event in sorted_events[:top_n]:
                recommendations.append({
                    'event': event,
                    'score': 50,
                    'confidence': 5,
                    'reason': 'Popular upcoming event - check it out!',
                    'matchFactors': ['Popular event', 'Upcoming soon']
                })
        
        # Generate insights
        insights = recommendation_service.generate_insights(user_profile, recommendations)
        
        return {
            "success": True,
            "data": {
                "recommendations": recommendations,
                "insights": insights,
                "user_profile": {
                    "favorite_categories": user_profile['favorite_categories'],
                    "favorite_tags": user_profile['favorite_tags'],
                    "total_events_created": user_profile['events_created'],
                    "total_events_attended": user_profile['events_attended']
                }
            }
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate recommendations: {str(e)}"
        )


@router.get("/health")
async def health_check():
    """Health check for analytics service"""
    return {
        "status": "healthy",
        "service": "analytics",
        "ai_enabled": True,
        "ai_type": "basic_ml_tfidf"
    }
