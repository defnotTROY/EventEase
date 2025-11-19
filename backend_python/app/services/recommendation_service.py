"""
Basic AI Recommendation Service
Uses simple machine learning techniques for personalized event recommendations
"""

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from typing import List, Dict, Any
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class RecommendationService:
    """Basic AI service for event recommendations using TF-IDF and cosine similarity"""
    
    def __init__(self):
        self.vectorizer = TfidfVectorizer(
            max_features=100,
            stop_words='english',
            ngram_range=(1, 2)
        )
    
    def calculate_similarity_score(self, user_profile: Dict, event: Dict) -> float:
        """
        Calculate recommendation score for an event based on user profile
        Returns a score from 0-100
        """
        score = 0.0
        
        # 1. Category match (0-30 points)
        user_categories = user_profile.get('favorite_categories', [])
        event_category = event.get('category', '').lower()
        if event_category in [cat.lower() for cat in user_categories]:
            score += 30
        elif user_categories:
            # Partial match
            for cat in user_categories:
                if cat.lower() in event_category or event_category in cat.lower():
                    score += 15
                    break
        
        # 2. Tag match (0-20 points)
        user_tags = user_profile.get('favorite_tags', [])
        event_tags = [tag.lower() if isinstance(tag, str) else str(tag).lower() 
                     for tag in (event.get('tags', []) or [])]
        
        if event_tags:
            matching_tags = sum(1 for tag in user_tags if tag.lower() in event_tags or any(tag.lower() in et for et in event_tags))
            if matching_tags > 0:
                score += min(20, matching_tags * 5)
        
        # 3. Text similarity using TF-IDF (0-25 points)
        user_text = self._build_user_text(user_profile)
        event_text = self._build_event_text(event)
        
        if user_text and event_text:
            try:
                texts = [user_text, event_text]
                tfidf_matrix = self.vectorizer.fit_transform(texts)
                similarity = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
                score += similarity * 25
            except Exception as e:
                logger.warning(f"TF-IDF similarity calculation failed: {e}")
                # Fallback: simple keyword matching
                user_words = set(user_text.lower().split())
                event_words = set(event_text.lower().split())
                common_words = user_words.intersection(event_words)
                if user_words:
                    score += (len(common_words) / len(user_words)) * 25
        
        # 4. Date proximity (0-15 points)
        event_date = event.get('date')
        if event_date:
            try:
                if isinstance(event_date, str):
                    event_date = datetime.fromisoformat(event_date.replace('Z', '+00:00'))
                
                days_away = (event_date.date() - datetime.now().date()).days
                if 0 <= days_away <= 30:
                    # Closer events get higher scores
                    score += max(0, 15 - (days_away / 2))
                elif days_away < 0:
                    # Past events get 0
                    score += 0
            except Exception as e:
                logger.warning(f"Date calculation failed: {e}")
        
        # 5. Popularity bonus (0-10 points)
        current_participants = event.get('current_participants', 0) or 0
        max_participants = event.get('max_participants', 1) or 1
        
        if max_participants > 0:
            popularity = current_participants / max_participants
            # Events that are popular but not full get bonus
            if 0.3 <= popularity <= 0.9:
                score += 10
            elif 0.1 <= popularity < 0.3:
                score += 5
        
        # Normalize to 0-100 and cap
        return min(100, max(0, score))
    
    def _build_user_text(self, user_profile: Dict) -> str:
        """Build text representation of user profile for TF-IDF"""
        parts = []
        
        # Add categories
        categories = user_profile.get('favorite_categories', [])
        parts.extend([cat.lower() for cat in categories])
        
        # Add tags
        tags = user_profile.get('favorite_tags', [])
        parts.extend([tag.lower() if isinstance(tag, str) else str(tag).lower() for tag in tags])
        
        # Add event titles from history
        history = user_profile.get('participation_history', [])
        for item in history:
            if isinstance(item, dict):
                title = item.get('title', '')
                category = item.get('category', '')
                event_tags = item.get('tags', [])
                parts.append(title.lower())
                parts.append(category.lower())
                parts.extend([tag.lower() if isinstance(tag, str) else str(tag).lower() for tag in event_tags])
        
        return ' '.join(parts)
    
    def _build_event_text(self, event: Dict) -> str:
        """Build text representation of event for TF-IDF"""
        parts = []
        
        # Add title
        title = event.get('title', '')
        parts.append(title.lower())
        
        # Add description
        description = event.get('description', '')
        parts.append(description.lower())
        
        # Add category
        category = event.get('category', '')
        parts.append(category.lower())
        
        # Add tags
        tags = event.get('tags', []) or []
        parts.extend([tag.lower() if isinstance(tag, str) else str(tag).lower() for tag in tags])
        
        return ' '.join(parts)
    
    def get_recommendations(self, user_profile: Dict, available_events: List[Dict], top_n: int = 5) -> List[Dict]:
        """
        Get top N personalized event recommendations
        
        Args:
            user_profile: User's preferences and history
            available_events: List of available events
            top_n: Number of recommendations to return
        
        Returns:
            List of recommended events with scores and reasoning
        """
        if not available_events:
            return []
        
        # Score all events
        scored_events = []
        for event in available_events:
            score = self.calculate_similarity_score(user_profile, event)
            
            # If user has no preferences, give base score based on popularity and date proximity
            if (not user_profile.get('favorite_categories') and 
                not user_profile.get('favorite_tags') and 
                not user_profile.get('participation_history')):
                # Base score for new users without preferences
                base_score = 40
                
                # Bonus for popular events (30-90% full)
                current_participants = event.get('current_participants', 0)
                max_participants = event.get('max_participants', 1) or 1
                if max_participants > 0:
                    popularity = current_participants / max_participants
                    if 0.3 <= popularity <= 0.9:
                        base_score += 20
                    elif 0.1 <= popularity < 0.3:
                        base_score += 10
                
                # Bonus for upcoming events (within 30 days)
                try:
                    date_str = event.get('date', '')
                    if date_str:
                        # Handle both ISO format and date-only strings
                        if 'T' in date_str:
                            event_date = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
                        else:
                            event_date = datetime.strptime(date_str, '%Y-%m-%d')
                        
                        days_until = (event_date.date() - datetime.now().date()).days
                        if 0 <= days_until <= 30:
                            base_score += 10
                except Exception as e:
                    logger.debug(f"Date parsing error: {e}")
                    pass
                
                score = base_score
            
            scored_events.append({
                'event': event,
                'score': score,
                'confidence': min(10, max(1, int(score / 10)))  # Convert 0-100 to 1-10, minimum 1
            })
        
        # Sort by score (highest first)
        scored_events.sort(key=lambda x: x['score'], reverse=True)
        
        # Get top N and format
        recommendations = []
        for item in scored_events[:top_n]:
            event = item['event']
            score = item['score']
            confidence = item['confidence']
            
            # Generate match factors
            match_factors = self._get_match_factors(user_profile, event)
            
            # Generate reason
            reason = self._generate_reason(score, match_factors, event)
            
            recommendations.append({
                'eventId': event.get('id'),
                'title': event.get('title'),
                'reason': reason,
                'confidence': confidence,
                'score': round(score, 2),
                'matchFactors': match_factors
            })
        
        return recommendations
    
    def _get_match_factors(self, user_profile: Dict, event: Dict) -> List[str]:
        """Identify why an event matches user preferences"""
        factors = []
        
        # Category match
        user_categories = user_profile.get('favorite_categories', [])
        event_category = event.get('category', '').lower()
        if event_category in [cat.lower() for cat in user_categories]:
            factors.append(f"Matches your interest in {event.get('category')}")
        
        # Tag match
        user_tags = user_profile.get('favorite_tags', [])
        event_tags = [tag.lower() if isinstance(tag, str) else str(tag).lower() 
                     for tag in (event.get('tags', []) or [])]
        matching_tags = [tag for tag in user_tags if tag.lower() in event_tags or any(tag.lower() in et for et in event_tags)]
        if matching_tags:
            factors.append(f"Matches your tags: {', '.join(matching_tags[:2])}")
        
        # Date proximity
        event_date = event.get('date')
        if event_date:
            try:
                if isinstance(event_date, str):
                    event_date = datetime.fromisoformat(event_date.replace('Z', '+00:00'))
                days_away = (event_date.date() - datetime.now().date()).days
                if 0 <= days_away <= 7:
                    factors.append("Happening soon")
                elif 8 <= days_away <= 30:
                    factors.append("Upcoming event")
            except:
                pass
        
        return factors if factors else ["Based on your preferences"]
    
    def _generate_reason(self, score: float, match_factors: List[str], event: Dict) -> str:
        """Generate human-readable reason for recommendation"""
        if score >= 70:
            base = "Highly recommended"
        elif score >= 50:
            base = "Good match"
        elif score >= 30:
            base = "May interest you"
        else:
            base = "Based on your activity"
        
        if match_factors:
            return f"{base}: {match_factors[0]}"
        else:
            return f"{base} based on your event preferences and history"
    
    def generate_insights(self, user_profile: Dict, recommendations: List[Dict]) -> str:
        """Generate overall insights about recommendations"""
        if not recommendations:
            return "No events available for recommendations at this time. Check back later for new events!"
        
        # If user has no preferences, give general insights
        if (not user_profile.get('favorite_categories') and 
            not user_profile.get('favorite_tags') and 
            not user_profile.get('participation_history')):
            return f"Welcome! We've found {len(recommendations)} upcoming event(s) that might interest you. Explore events from different categories to help us personalize future recommendations!"
        
        top_category = user_profile.get('favorite_categories', [])
        if top_category:
            category_name = top_category[0] if isinstance(top_category, list) else top_category
            return f"Based on your interest in {category_name} and your event history, we've found {len(recommendations)} personalized recommendations for you."
        
        return f"We've found {len(recommendations)} events that match your preferences based on your activity and interests."


# Global instance
recommendation_service = RecommendationService()
