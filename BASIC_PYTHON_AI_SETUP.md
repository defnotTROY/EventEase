# 🐍 Basic Python AI Recommendation System

## ✅ What We Built

Replaced OpenAI with a **simple, basic AI system using Python and scikit-learn** for personalized event recommendations on the Dashboard.

## 🎯 Overview

- **Removed:** OpenAI API dependency (no more API keys or costs!)
- **Added:** Python backend with TF-IDF + cosine similarity for recommendations
- **Result:** Free, self-hosted AI recommendations that work instantly

## 🏗️ Architecture

```
Frontend (React)
    ↓
recommendationService.js
    ↓
Python Backend (/api/v1/analytics/recommendations/{user_id})
    ↓
recommendation_service.py (TF-IDF + Scoring Algorithm)
    ↓
Supabase Database (Event & User Data)
```

## 📁 Files Created/Modified

### Backend (Python)
1. **`backend_python/app/services/recommendation_service.py`**
   - Basic AI using TF-IDF vectorization
   - Cosine similarity for text matching
   - Scoring algorithm (0-100 points):
     - Category match: 30 points
     - Tag match: 20 points
     - Text similarity (TF-IDF): 25 points
     - Date proximity: 15 points
     - Popularity bonus: 10 points

2. **`backend_python/app/api/v1/endpoints/analytics.py`**
   - `/analytics/recommendations/{user_id}` endpoint
   - Builds user profile from event history
   - Fetches available events from Supabase
   - Returns top N recommendations with confidence scores

3. **`backend_python/requirements.txt`**
   - Added `supabase==2.0.0` for database access
   - Already had: `scikit-learn`, `numpy`, `pandas` (for AI)

### Frontend (React)
1. **`src/services/recommendationService.js`** (NEW)
   - Calls Python backend API
   - Handles errors gracefully
   - Falls back to rule-based engine if Python service unavailable

2. **`src/components/AIRecommendations.js`** (MODIFIED)
   - Removed OpenAI dependency
   - Now uses `recommendationService` (Python backend)
   - Falls back to `insightsEngineService` if Python unavailable

3. **`src/pages/Dashboard.js`** (MODIFIED)
   - Added `<AIRecommendations />` component to overview tab
   - Shows personalized recommendations at top of dashboard

## 🔧 How It Works

### 1. User Profile Building
The Python backend analyzes:
- Events the user created
- Events the user attended/registered for
- Favorite categories (from history)
- Favorite tags (from history)

### 2. Recommendation Scoring
For each available event, calculates:
- **Category match:** Does event category match user's favorites?
- **Tag match:** How many tags overlap?
- **Text similarity:** TF-IDF cosine similarity between user profile text and event description
- **Date proximity:** Closer events get higher scores
- **Popularity:** Events that are popular but not full get bonus

### 3. Ranking & Return
- Sorts events by total score (0-100)
- Returns top N with:
  - Confidence score (1-10)
  - Match factors (why it was recommended)
  - Personalized reasoning

## 🚀 Setup Instructions

### 1. Install Python Dependencies
```bash
cd backend_python
pip install -r requirements.txt
```

### 2. Configure Environment Variables
Add to your `.env` file in `backend_python/`:
```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Start Python Backend
```bash
cd backend_python
python run.py
# or
uvicorn main:app --reload --port 8000
```

### 4. Configure Frontend
Add to your `.env` in the root:
```env
REACT_APP_PYTHON_API_URL=http://localhost:8000/api/v1
```

### 5. Test the Endpoint
```bash
curl http://localhost:8000/api/v1/analytics/health
# Should return: {"status":"healthy","service":"analytics","ai_enabled":true,"ai_type":"basic_ml_tfidf"}
```

## 💡 Features

### Basic AI Techniques Used
- **TF-IDF Vectorization:** Converts text (event descriptions, user interests) into numerical vectors
- **Cosine Similarity:** Measures how similar user preferences are to event content
- **Rule-Based Scoring:** Combines multiple factors for accurate recommendations

### Why This Is "AI"
Even though it's simple, it uses:
- Machine learning techniques (TF-IDF, similarity metrics)
- Pattern recognition (learning from user history)
- Intelligent scoring (combining multiple signals)

### Advantages Over OpenAI
- ✅ **Free** - No API costs
- ✅ **Fast** - No network latency
- ✅ **Privacy** - Data stays on your server
- ✅ **Reliable** - No rate limits or downtime
- ✅ **Customizable** - Easy to adjust algorithms

## 📊 Example Response

```json
{
  "success": true,
  "data": {
    "recommendations": [
      {
        "eventId": "uuid-123",
        "title": "Tech Conference 2024",
        "reason": "Highly recommended: Matches your interest in Technology",
        "confidence": 8,
        "score": 78.5,
        "matchFactors": [
          "Matches your interest in Technology",
          "Matches your tags: networking, coding",
          "Upcoming event"
        ]
      }
    ],
    "insights": "Based on your interest in Technology and your event history, we've found 5 personalized recommendations for you."
  }
}
```

## 🔄 Fallback System

The system gracefully handles failures:

1. **Try Python AI service** (recommendationService)
2. **If unavailable → Fall back to rule-based engine** (insightsEngineService)
3. **If that fails → Show friendly error message**

Users always get recommendations, even if the Python service is down!

## 🧪 Testing

### Test Python Endpoint
```bash
# Health check
curl http://localhost:8000/api/v1/analytics/health

# Get recommendations (replace USER_ID)
curl http://localhost:8000/api/v1/analytics/recommendations/USER_ID?top_n=5
```

### Test Frontend
1. Log in to Dashboard
2. Navigate to Dashboard → Overview tab
3. Should see "AI Recommendations" section at top
4. Recommendations should load automatically

## 🎓 How to Customize

### Adjust Scoring Weights
Edit `backend_python/app/services/recommendation_service.py`:
```python
# Change these values in calculate_similarity_score()
score += 30  # Category match (currently 30 points)
score += 20  # Tag match (currently 20 points)
score += 25  # Text similarity (currently 25 points)
```

### Change Number of Recommendations
In frontend: `recommendationService.getPersonalizedRecommendations(userId, topN=10)`

In backend: `?top_n=10` query parameter

## ❌ Removed Dependencies

- ✅ Removed OpenAI API calls from frontend
- ✅ Removed `REACT_APP_OPENAI_API_KEY` requirement
- ⚠️ Note: OpenAI is still in `requirements.txt` but not used for recommendations

## 🐛 Troubleshooting

### "Python AI service not available"
- Check if Python backend is running on port 8000
- Verify `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set
- Check Python backend logs for errors

### "No recommendations available"
- User needs to have created or attended some events first
- Need available events in the database
- Check Supabase connection

### Recommendations seem off
- Adjust scoring weights in `recommendation_service.py`
- Check user profile data in Supabase
- Verify event data has categories and tags

## 📝 Next Steps

Possible improvements:
- Add location-based recommendations (if events have coordinates)
- Implement collaborative filtering (users with similar interests)
- Add time-of-day preferences
- Cache recommendations for performance
- Add A/B testing for different scoring algorithms

---

**Status:** ✅ Complete and Ready to Use!

The Dashboard now shows personalized AI recommendations powered by Python!
