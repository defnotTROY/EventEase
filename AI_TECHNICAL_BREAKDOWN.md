# 🔧 AI Features - Technical Breakdown

## How Each Feature Works (Step-by-Step)

---

## 1. 🎯 Personalized Event Recommendations

### **Flow Diagram:**
```
User Opens Dashboard
    ↓
Component: AIRecommendations loads
    ↓
Calls: insightsEngineService.getPersonalizedRecommendations(userId)
    ↓
Step 1: Fetch User Data (3 parallel queries)
    ├─→ User's created events
    ├─→ User's participation history
    └─→ All available future events
    ↓
Step 2: Build User Profile
    ├─→ Extract categories from events
    ├─→ Extract tags from events
    ├─→ Calculate top category
    ├─→ Count events created/attended
    └─→ Build participation history
    ↓
Step 3: Score Each Event (100-point system)
    ├─→ Category match (0-30 pts)
    ├─→ Tag matches (0-20 pts)
    ├─→ Date proximity (0-20 pts)
    ├─→ Popularity bonus (0-10 pts)
    └─→ Attendance history (0-20 pts)
    ↓
Step 4: Rank & Filter
    ├─→ Sort by score (highest first)
    ├─→ Take top 5 events
    └─→ Generate reasons for each
    ↓
Step 5: Display Results
    └─→ Show recommendations with confidence scores
```

### **Detailed Algorithm:**

#### **Step 1: Data Collection**
```javascript
// Three parallel database queries:
1. User's created events (events where user_id = userId)
2. User's participation history (participants where user_id = userId)
3. All available events (events where user_id ≠ userId AND date >= today)
```

#### **Step 2: User Profile Building**
```javascript
userProfile = {
  eventsCreated: 5,              // Count of events user created
  eventsAttended: 3,             // Count of events user attended
  favoriteCategories: ["Tech", "Networking"],  // Unique categories
  favoriteTags: ["AI", "Startups"],            // Most common tags
  topCategory: "Tech",           // Most frequent category
  participationHistory: [...]    // Past event participation data
}
```

#### **Step 3: Event Scoring Algorithm**

**For Users WITH History:**
```javascript
Base Score = 50 points

// Category Matching (0-30 points)
if (event.category === userProfile.topCategory) {
  score += 30;  // Perfect match
} else if (userProfile.favoriteCategories.includes(event.category)) {
  score += 15;  // Partial match
}

// Tag Matching (0-20 points)
matchingTags = event.tags.filter(tag => 
  userProfile.favoriteTags.includes(tag)
).length;
score += matchingTags * 5;  // 5 points per matching tag

// Date Proximity (0-20 points)
daysUntilEvent = calculateDaysUntil(event.date);
if (daysUntilEvent <= 7) score += 20;
else if (daysUntilEvent <= 30) score += 15;
else if (daysUntilEvent <= 60) score += 10;

// Popularity Bonus (0-10 points)
fillRate = (event.max_participants / 100) * 10;
score += fillRate;

// Attendance History (0-20 points)
if (userProfile.eventsAttended > 0) {
  attendanceRatio = userProfile.eventsAttended / userProfile.eventsCreated;
  score += Math.min(attendanceRatio * 20, 20);
}

Final Score = Math.min(score, 100);  // Cap at 100
```

**For NEW Users (No History):**
```javascript
Base Score = 30 points

// Date Proximity (0-40 points) - Heavily weighted for new users
if (daysUntilEvent <= 7) score += 40;
else if (daysUntilEvent <= 14) score += 35;
else if (daysUntilEvent <= 30) score += 30;

// Popularity Bonus (0-20 points)
if (event.max_participants >= 50 && event.max_participants <= 300) {
  score += 20;  // Optimal networking size
}

// Category Diversity (0-10 points)
if (event.category in popularCategories) {
  score += 10;
}
```

#### **Step 4: Recommendation Generation**
```javascript
// Sort events by score (descending)
sortedEvents = allEvents.sort((a, b) => b.score - a.score);

// Take top 5
top5 = sortedEvents.slice(0, 5);

// Generate recommendation objects
recommendations = top5.map(event => ({
  eventId: event.id,
  title: event.title,
  reason: generateReason(event, userProfile),  // "Similar to your favorite tech events"
  confidence: Math.round((event.score / 100) * 10),  // Convert to 1-10 scale
  matchFactors: getMatchFactors(event, userProfile)  // ["Category match", "2 tags match"]
}));
```

#### **Step 5: Display**
- Shows top 3-5 recommendations
- Each shows: title, reason, confidence score (1-10), match factors
- User can click "View Event" or "Register"

---

## 2. ⏰ Automated Scheduling

### **Flow Diagram:**
```
User Opens Event View → Analytics Tab
    ↓
Component: AIScheduler loads
    ↓
User clicks "Generate Schedule"
    ↓
Step 1: Validate Event Data
    ├─→ Check event has: date, time, location
    └─→ If missing → Show error
    ↓
Step 2: Fetch Event Details
    ├─→ Get event from database
    ├─→ Get participant count
    └─→ Get user constraints (start time, breaks, etc.)
    ↓
Step 3: Determine Event Type
    ├─→ Workshop? → Longer sessions (90 min)
    ├─→ Conference? → Opening remarks (30 min)
    └─→ Regular? → Standard sessions (45 min)
    ↓
Step 4: Build Schedule Template
    ├─→ Registration (15-30 min)
    ├─→ Opening Remarks (15-30 min)
    ├─→ Main Sessions (based on type)
    ├─→ Breaks (15 min default)
    ├─→ Lunch (60 min if 6+ hours)
    └─→ Closing Remarks (15 min)
    ↓
Step 5: Calculate Time Slots
    ├─→ Start from user's start time
    ├─→ Add duration for each activity
    ├─→ Calculate end times
    └─→ Ensure fits within end time constraint
    ↓
Step 6: Generate Recommendations
    └─→ Based on participant count and event type
    ↓
Step 7: Display Schedule
    └─→ Show timeline with activities, times, durations
```

### **Detailed Algorithm:**

#### **Step 1: Event Type Detection**
```javascript
const isWorkshop = event.category.toLowerCase().includes('workshop') || 
                   event.category.toLowerCase().includes('training');
const isConference = event.category.toLowerCase().includes('conference');
```

#### **Step 2: Schedule Template Building**

**For Workshops:**
```javascript
schedule = [
  { time: "09:00", duration: 15, activity: "Registration & Welcome", type: "registration" },
  { time: "09:15", duration: 15, activity: "Opening Remarks", type: "presentation" },
  { time: "09:30", duration: 90, activity: "Main Session", type: "workshop" },
  { time: "11:00", duration: 15, activity: "Break", type: "break" },
  { time: "11:15", duration: 90, activity: "Continuation Session", type: "workshop" },
  { time: "12:45", duration: 15, activity: "Closing Remarks", type: "presentation" }
];
```

**For Conferences:**
```javascript
schedule = [
  { time: "09:00", duration: 15, activity: "Registration & Welcome", type: "registration" },
  { time: "09:15", duration: 30, activity: "Opening Remarks", type: "presentation" },  // Longer
  { time: "09:45", duration: 45, activity: "Session 1", type: "session" },
  { time: "10:30", duration: 15, activity: "Break", type: "break" },
  { time: "10:45", duration: 45, activity: "Session 2", type: "session" },
  { time: "11:30", duration: 15, activity: "Break", type: "break" },
  { time: "11:45", duration: 45, activity: "Session 3", type: "session" },
  { time: "12:30", duration: 15, activity: "Closing Remarks", type: "presentation" }
];
```

**For Regular Events:**
```javascript
// Similar to conferences but shorter opening (15 min)
// 3 sessions with breaks between
```

#### **Step 3: Time Calculation**
```javascript
// Parse start time (e.g., "09:00" → 540 minutes from midnight)
startTime = parseTime(constraints.startTime || '09:00');

// Build schedule sequentially
currentTime = startTime;
schedule.forEach(activity => {
  activity.time = formatTime(currentTime);  // "09:00"
  currentTime += activity.duration;  // Move to next activity
});
```

#### **Step 4: Customization**
```javascript
// User can adjust:
constraints = {
  startTime: "09:00",      // When event starts
  endTime: "17:00",        // When event ends
  breakDuration: 15,        // Minutes for breaks
  lunchBreak: 60,          // Minutes for lunch
  sessionLength: 45        // Minutes per session
};
```

#### **Step 5: Recommendations Generation**
```javascript
if (participantCount > 50) {
  recommendations.push('Consider having breakout rooms for better engagement');
}
if (event.is_virtual) {
  recommendations.push('Schedule 5-minute breaks between sessions to avoid screen fatigue');
}
if (participantCount < 10) {
  recommendations.push('Small group size allows for more interactive formats');
}
```

---

## 3. 📊 Intelligent Feedback Analysis

### **Flow Diagram:**
```
User Opens Event View → Analytics Tab
    ↓
Component: AIFeedbackAnalysis loads
    ↓
Step 1: Check for Participants
    ├─→ If no participants → Show "Need data" message
    └─→ If has participants → Continue
    ↓
Step 2: Fetch Event Data
    ├─→ Get event details
    └─→ Get all participants
    ↓
Step 3: Calculate Metrics
    ├─→ Total participants
    ├─→ Attended count
    ├─→ Attendance rate (%)
    └─→ Registration rate (%)
    ↓
Step 4: Calculate Performance Score (1-10)
    ├─→ Attendance rate contribution (0-40 points)
    ├─→ Registration rate contribution (0-30 points)
    └─→ Event quality bonus (0-20 points)
    ↓
Step 5: Generate Analysis
    ├─→ Identify strengths
    ├─→ Identify improvements
    ├─→ Analyze sentiment
    ├─→ Generate recommendations
    └─→ Provide engagement insights
    ↓
Step 6: Display Results
    └─→ Show score, sentiment, strengths, improvements, recommendations
```

### **Detailed Algorithm:**

#### **Step 1: Data Collection**
```javascript
// Fetch event and participants
const event = await getEvent(eventId);
const participants = await getParticipants(eventId);

// Calculate basic metrics
const totalParticipants = participants.length;
const attendedCount = participants.filter(p => p.status === 'attended').length;
const attendanceRate = (attendedCount / totalParticipants) * 100;
const registrationRate = event.max_participants > 0 
  ? (totalParticipants / event.max_participants) * 100 
  : 0;
```

#### **Step 2: Performance Score Calculation (1-10 scale)**
```javascript
let score = 50;  // Base score (out of 100, will convert to 1-10)

// Attendance Rate Contribution (0-40 points)
if (attendanceRate >= 90) score += 40;
else if (attendanceRate >= 80) score += 35;
else if (attendanceRate >= 70) score += 30;
else if (attendanceRate >= 60) score += 20;
else if (attendanceRate >= 50) score += 10;
else if (attendanceRate >= 40) score += 5;

// Registration Rate Contribution (0-30 points)
if (registrationRate >= 100) score += 30;  // Sold out!
else if (registrationRate >= 90) score += 25;
else if (registrationRate >= 80) score += 20;
else if (registrationRate >= 70) score += 15;
else if (registrationRate >= 60) score += 10;
else if (registrationRate >= 50) score += 5;

// Event Quality Bonus (0-20 points)
let qualityScore = 0;
if (event.title && event.title.length > 10) qualityScore += 5;
if (event.description && event.description.length > 50) qualityScore += 5;
if (event.category) qualityScore += 3;
if (event.location || event.is_virtual) qualityScore += 3;
if (event.max_participants > 0) qualityScore += 4;
score += qualityScore;

// Convert to 1-10 scale
performanceScore = Math.min(Math.max(Math.round(score / 10), 1), 10);
```

#### **Step 3: Strengths Identification**
```javascript
const strengths = [];

if (attendanceRate >= 80) {
  strengths.push('Excellent attendance rate');
} else if (attendanceRate >= 70) {
  strengths.push('Strong attendance rate');
}

if (registrationRate >= 90) {
  strengths.push('High registration numbers');
} else if (registrationRate >= 80) {
  strengths.push('Good registration numbers');
}

if (event.category === 'Conference' || event.category === 'Workshop') {
  strengths.push('Professional event format');
}

const cancelRate = participants.filter(p => p.status === 'cancelled').length / totalParticipants;
if (cancelRate < 0.1) {
  strengths.push('Low cancellation rate');
}
```

#### **Step 4: Improvements Identification**
```javascript
const improvements = [];

if (attendanceRate < 70) {
  improvements.push('Improve attendance rate through better follow-up');
}

if (registrationRate < 70 && event.max_participants > 0) {
  improvements.push('Increase marketing and promotion efforts');
}

const daysUntilEvent = calculateDaysUntil(event.date);
if (daysUntilEvent > 30) {
  improvements.push('Consider shorter lead time for events');
}

if (event.is_virtual && attendanceRate < 75) {
  improvements.push('Engage virtual attendees with interactive elements');
}
```

#### **Step 5: Sentiment Analysis**
```javascript
let sentiment;
if (attendanceRate >= 80 && registrationRate >= 80) {
  sentiment = 'very positive';
} else if (attendanceRate >= 70 && registrationRate >= 70) {
  sentiment = 'positive';
} else if (attendanceRate >= 60 && registrationRate >= 60) {
  sentiment = 'neutral';
} else if (attendanceRate >= 50 || registrationRate >= 50) {
  sentiment = 'mixed';
} else {
  sentiment = 'needs_improvement';
}
```

#### **Step 6: Recommendations Generation**
```javascript
const recommendations = [];

if (attendanceRate < 70) {
  recommendations.push('Send reminder emails 24-48 hours before the event');
  recommendations.push('Consider adjusting event timing or format');
}

if (registrationRate < 70 && event.max_participants > 0) {
  recommendations.push('Expand marketing channels and reach');
  recommendations.push('Adjust registration pricing if applicable');
}

if (attendanceRate >= 80 && registrationRate >= 90) {
  recommendations.push('Consider expanding event capacity for next time');
  recommendations.push('Plan follow-up events in the same category');
}
```

#### **Step 7: Engagement Insights**
```javascript
let engagementInsights;
if (attendanceRate >= 90) {
  engagementInsights = 'Exceptional participant engagement and interest in your event content';
} else if (attendanceRate >= 80) {
  engagementInsights = 'Strong participant engagement with high commitment to attendance';
} else if (attendanceRate >= 70) {
  engagementInsights = 'Good engagement levels with room for improvement in follow-up';
} else if (attendanceRate >= 60) {
  engagementInsights = 'Moderate engagement - consider adjusting event timing or format';
} else {
  engagementInsights = 'Engagement needs improvement - analyze barriers to attendance';
}
```

---

## 🔄 Hybrid System (AI vs Rule-Based)

### **How It Works:**

```javascript
// All three components use this pattern:

try {
  // Try OpenAI AI first (if API key configured)
  if (aiService.isConfigured()) {
    data = await aiService.getFeature(eventId);
  } else {
    throw new Error('AI not configured');
  }
} catch (aiError) {
  // Fall back to rule-based engine (always works)
  console.log('Using rule-based engine:', aiError.message);
  data = await insightsEngineService.getFeature(eventId);
}
```

### **When Each Is Used:**

**OpenAI AI (if configured):**
- Uses GPT-3.5-turbo
- Natural language processing
- More nuanced insights
- Costs ~$0.01-0.05 per request
- Requires API key

**Rule-Based Engine (default):**
- Mathematical formulas
- Scoring algorithms
- Template-based responses
- Zero cost
- No API key needed
- Always available

---

## 📊 Data Flow Summary

### **Recommendations:**
```
Database → User Profile → Scoring Algorithm → Ranking → Display
```

### **Scheduler:**
```
Database → Event Type Detection → Template Selection → Time Calculation → Display
```

### **Feedback Analysis:**
```
Database → Metrics Calculation → Score Algorithm → Analysis Generation → Display
```

---

## 🎯 Key Algorithms

### **Scoring Formula (Recommendations):**
```
Score = Base(50) 
      + CategoryMatch(0-30) 
      + TagMatch(0-20) 
      + Proximity(0-20) 
      + Popularity(0-10) 
      + History(0-20)
Max = 100 points
```

### **Performance Score (Feedback):**
```
Score = Base(50)
      + AttendanceRate(0-40)
      + RegistrationRate(0-30)
      + EventQuality(0-20)
Final = Score / 10 (converted to 1-10 scale)
```

### **Schedule Building:**
```
StartTime → Registration → Opening → Sessions → Breaks → Closing
Each activity: time + duration = next activity start time
```

---

## 🔍 Technical Details

### **Database Queries:**
- Uses Supabase (PostgreSQL)
- Parallel queries for performance
- Filters: user_id, date, status
- Limits: 50-100 records per query

### **Performance:**
- Rule-based: < 100ms (instant)
- OpenAI: 1-3 seconds (API call)
- Caching: None (real-time data)

### **Error Handling:**
- Graceful fallback to rule-based
- User never sees "API error"
- Always returns results

---

This is how your AI features work under the hood! 🚀

