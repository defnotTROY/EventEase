# User Schedule Feature - Dashboard Integration

## ✅ What Was Implemented

A schedule feature that displays events on the Dashboard, customized based on user role:

- **Regular Users**: See events they're registered for
- **Organizers/Admins**: See events they created/manage

## 🎯 Features

- ✅ **Role-Based Display** - Different schedules for users vs organizers
- ✅ **Grouped by Date** - Events organized chronologically
- ✅ **Smart Date Formatting** - Shows "Today", "Tomorrow", or formatted dates
- ✅ **Time Formatting** - Converts 24-hour to 12-hour format
- ✅ **Event Details** - Shows time, location, category, status
- ✅ **Clickable Events** - Links to event detail pages
- ✅ **Empty States** - Helpful messages when no events
- ✅ **Loading States** - Smooth loading experience

## 📊 How It Works

### For Regular Users:
1. Fetches events from `participants` table where `user_id` matches
2. Only shows events with status "registered"
3. Only shows upcoming/ongoing events
4. Displays as "Events you are registered for"

### For Organizers/Admins:
1. Fetches events from `events` table where `user_id` matches
2. Only shows upcoming/ongoing events
3. Includes participant counts
4. Displays as "Events you are managing"

## 🎨 UI Components

### Schedule Card:
- **Header**: "My Schedule" with subtitle based on role
- **Grouped by Date**: Events organized by date
- **Event Cards**: Each event shows:
  - Title (clickable)
  - Time (formatted)
  - Location (or "Virtual Event")
  - Category badge
  - Status badge
  - Participant count (for organizers)

### Date Formatting:
- **Today**: Shows "Today"
- **Tomorrow**: Shows "Tomorrow"
- **Other dates**: "Monday, March 15" format

### Time Formatting:
- Converts 24-hour format (14:30) to 12-hour (2:30 PM)
- Handles existing 12-hour format

## 📝 Code Changes

### Files Created:
1. **`src/services/scheduleService.js`**
   - `getUserSchedule()` - Main method to get schedule based on role
   - `getOrganizerSchedule()` - Gets events organizer created
   - `getUserRegisteredSchedule()` - Gets events user registered for
   - `groupScheduleByDate()` - Groups events by date
   - `formatDate()` - Formats dates (Today/Tomorrow/etc.)
   - `formatTime()` - Formats time (24h to 12h)

2. **`src/components/UserSchedule.js`**
   - React component that displays the schedule
   - Handles loading, error, and empty states
   - Responsive design

### Files Modified:
1. **`src/pages/Dashboard.js`**
   - Added `UserSchedule` component import
   - Added schedule component to overview tab

## 🔍 Technical Details

### Database Queries:

**For Regular Users:**
```sql
SELECT events.* 
FROM participants
JOIN events ON participants.event_id = events.id
WHERE participants.user_id = ?
  AND participants.status = 'registered'
  AND events.status IN ('upcoming', 'ongoing')
ORDER BY events.date, events.time
```

**For Organizers:**
```sql
SELECT events.*
FROM events
WHERE events.user_id = ?
  AND events.status IN ('upcoming', 'ongoing')
ORDER BY events.date, events.time
```

### Sorting:
- Events sorted by date (ascending)
- Within each date, sorted by time (ascending)
- Only shows upcoming/ongoing events

## 🎯 User Experience

### Regular User View:
- Sees events they registered for
- Can click to view event details
- Empty state suggests browsing events

### Organizer View:
- Sees events they created
- Shows participant counts
- Empty state suggests creating events

## 🐛 Edge Cases Handled

- ✅ No events → Shows helpful empty state
- ✅ Loading state → Shows spinner
- ✅ Error state → Shows error message
- ✅ Missing date/time → Handles gracefully
- ✅ Virtual events → Shows "Virtual Event" label
- ✅ Different time formats → Normalized for display

## 📱 Responsive Design

- Works on mobile, tablet, and desktop
- Cards stack vertically on smaller screens
- Hover effects on event cards
- Clickable event titles

## 🚀 Future Enhancements (Optional)

Potential improvements:
- **Calendar View** - Monthly calendar with events marked
- **Week View** - Show events in weekly timeline
- **Filter Options** - Filter by category, status, etc.
- **Export Schedule** - Download as PDF/iCal
- **Reminders** - Show upcoming events with reminders
- **Conflict Warnings** - Highlight scheduling conflicts

## ✅ Status

**Schedule feature is fully implemented and working!**

Users and organizers now see their relevant schedules on the Dashboard, organized by date with all necessary event details.

