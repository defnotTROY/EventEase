# 🌱 Event Seeding Guide

This guide explains how to create multiple diverse events using the admin account for testing personalized recommendations.

## 📋 Overview

The event seeding script creates **20 diverse events** across different categories, tags, and dates. These events are:
- ✅ Created by the admin account
- ✅ Visible to all users in the system
- ✅ Used for generating **dynamic, personalized recommendations** based on user preferences and activity history

## 🚀 Quick Start

### 1. Prerequisites

Make sure you have:
- ✅ Admin account created (`npm run create-admin`)
- ✅ Environment variables set up (`.env` file)

### 2. Run the Seed Script

```bash
npm run seed-events
```

Or directly:
```bash
node scripts/seed-events.js
```

## 📝 Environment Variables Required

Create a `.env` file in the project root with:

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
ADMIN_EMAIL=admin@eventease.com
```

**Where to find these:**
- `SUPABASE_URL`: Supabase Dashboard > Project Settings > API > Project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase Dashboard > Project Settings > API > service_role key (keep secret!)
- `ADMIN_EMAIL`: The email you used when creating the admin account

## 🎯 What Events Are Created?

The script creates **20 diverse events** covering:

### Categories:
- Tech Summit (3 events)
- Workshop (4 events)
- Academic Conference (2 events)
- Networking (3 events)
- Community Event (2 events)
- Cultural Event (1 event)
- Sports Event (1 event)
- Seminar (2 events)
- Other (2 events)

### Topics Covered:
- AI & Machine Learning
- Web Development
- Cybersecurity
- Blockchain
- Mobile Development
- Data Science
- Product Management
- Open Source
- Leadership
- Diversity & Inclusion
- And more!

### Date Distribution:
- Events spread over **15-60 days** from today
- Different times (morning, afternoon, evening)
- Mix of event sizes (30-500 participants)

## ✅ How It Works

1. **Finds Admin Account**: Looks up the admin user by email
2. **Creates Events**: Inserts events into the `events` table
3. **Sets Visibility**: All events are visible to all users (via RLS policies)
4. **Dynamic Recommendations**: Events are automatically used for personalized recommendations

## 🎯 Personalized Recommendations System

### For New Users (No History):
- Recommendations based on:
  - Event recency (closer dates = higher priority)
  - Event popularity (moderate-sized events preferred)
  - Popular categories (Tech, Networking, Workshops)

### For Users with History:
- Recommendations based on:
  - **Category preferences** (from created/attended events)
  - **Tag matches** (matching interests)
  - **Date proximity** (upcoming events)
  - **Participation history** (attendance patterns)

### Dynamic Scoring:
- **Not hardcoded** - Each user gets different recommendations
- **Not static** - Recommendations update as users interact with events
- **Accurate** - Based on real user activity and preferences

## 🔍 Verifying It Works

### 1. Check Events Are Created:
```sql
-- In Supabase SQL Editor
SELECT COUNT(*) FROM events;
-- Should show 20+ events
```

### 2. Check Event Visibility:
- Login as any user
- Go to `/events` page
- Should see all seeded events

### 3. Test Recommendations:
1. Login as a new user (no history)
2. Go to Dashboard
3. Check "AI Event Recommendations" section
4. Should see 5 personalized recommendations

### 4. Test with User History:
1. Create or attend some events
2. Refresh recommendations
3. Should see different recommendations based on your activity

## 🛠️ Customization

### Add More Events:

Edit `scripts/seed-events.js` and add more templates to `EVENT_TEMPLATES` array:

```javascript
{
  title: 'Your Event Title',
  description: 'Event description...',
  category: 'Tech Summit',
  tags: ['Tag1', 'Tag2', 'Tag3'],
  location: 'Event Location',
  maxParticipants: 100,
  dateOffset: 45, // Days from now
  time: '14:00'
}
```

### Modify Event Distribution:

Change `dateOffset` values to adjust when events happen:
- `15` = 15 days from now
- `30` = 30 days from now
- `60` = 60 days from now

## 📊 Recommendation Algorithm Details

### Scoring System:

**For New Users:**
- Base Score: 30 points
- Date Proximity: 0-40 points (closer = higher)
- Popularity: 0-20 points (moderate size = higher)
- Category Bonus: 0-10 points (popular categories)

**For Users with History:**
- Base Score: 50 points
- Category Match: 0-30 points
- Tag Matches: 0-20 points (5 points per tag)
- Date Proximity: 0-20 points
- Popularity: 0-10 points
- Attendance History: 0-20 points

### Recommendation Factors:
1. **Category Match**: Events matching user's favorite categories
2. **Tag Matching**: Events with tags matching user interests
3. **Date Proximity**: Upcoming events get priority
4. **Popularity**: Moderate-sized events preferred
5. **Activity History**: Based on past attendance patterns

## 🐛 Troubleshooting

### "Admin user not found"
- Make sure you've created the admin account: `npm run create-admin`
- Check that `ADMIN_EMAIL` in `.env` matches the admin email

### "Events already exist"
- The script will skip events that already exist
- To reset, delete events from Supabase dashboard or use SQL

### "No recommendations showing"
- Make sure events are created successfully
- Check that events have future dates (`date >= today`)
- Verify RLS policies allow users to view events

### "Recommendations are the same for all users"
- This shouldn't happen! Recommendations are dynamic
- Check user activity history (created/attended events)
- New users will see similar recommendations, but they change as users interact

## 📈 Next Steps

After seeding events:

1. **Test with Different Users**:
   - Create multiple user accounts
   - Each user should see different recommendations
   - As users interact, recommendations should change

2. **Monitor Recommendations**:
   - Check Dashboard for each user
   - Verify recommendations match user preferences
   - Test with users who have different activity histories

3. **Add More Events**:
   - Create more events manually or via script
   - Recommendations will automatically include new events

## 🎉 Result

You now have:
- ✅ 20+ diverse events in the system
- ✅ Dynamic, personalized recommendation system
- ✅ Events visible to all users
- ✅ Recommendations that adapt to user behavior

**The recommendation system is NOT hardcoded or static - it's fully dynamic and based on real user preferences and activity history!**

