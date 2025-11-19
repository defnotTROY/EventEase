# 🎭 EventEase Role-Based Access Control (RBAC) Design

## 🎯 Three-Tier Role System

Your platform needs **3 distinct user roles** with different capabilities:

### 1. **App Administrator** 🔑
- **Who:** Platform managers, EventEase staff
- **Role Value:** `admin`
- **Access:**
  - ✅ All admin panel features
  - ✅ User management (view all users, change roles)
  - ✅ Event management (view all events across platform)
  - ✅ System analytics and monitoring
  - ✅ Platform-wide insights

### 2. **Event Organizer** 📅
- **Who:** Event creators and managers
- **Role Value:** `organizer` (default for signups)
- **Access:**
  - ✅ **Create Events** - Make new events
  - ✅ **Manage Own Events** - Edit/delete their events
  - ✅ **View Own Analytics** - Analytics for their events only
  - ✅ **Manage Own Participants** - For their events
  - ✅ View public events
  - ❌ Cannot manage other users' events
  - ❌ Cannot access admin panel

### 3. **Regular User** 👤
- **Who:** Participants, attendees, browsers
- **Role Value:** `user`
- **Access:**
  - ✅ **Browse Events** - View all public events
  - ✅ **Register for Events** - Join events as participant
  - ✅ **View Own Registrations** - See their upcoming events
  - ✅ Basic profile management
  - ❌ Cannot create events
  - ❌ Cannot access Analytics
  - ❌ Cannot manage participants

## 📊 Current State vs Desired State

### **Current State** ❌
- All authenticated users = Event Organizers
- No role differentiation
- Anyone can create events
- Anyone can access Analytics
- Admin pages protected but organizer/user pages not

### **Desired State** ✅
- Default signup = Event Organizer
- Option to signup as Regular User
- Regular Users cannot create events
- Regular Users cannot access Analytics
- Proper role-based navigation

## 🚀 Implementation Plan

### Phase 1: Database & Signup
1. Update signup flow to set default role
2. Add role selection in signup
3. Update user creation in database

### Phase 2: Route Protection
1. Protect Create Event page (Organizer only)
2. Protect Analytics page (Organizer only)
3. Protect Participants page (Organizer only)
4. Keep Dashboard available to all

### Phase 3: Navigation Updates
1. Hide "Create Event" from Regular Users
2. Hide "Analytics" from Regular Users
3. Hide "Participants" from Regular Users
4. Show appropriate features based on role

### Phase 4: Permission Checks
1. Add role checks to all mutation operations
2. Prevent Regular Users from creating events
3. Show helpful "upgrade" messages

## 🔐 Access Matrix

| Feature | App Admin | Event Organizer | Regular User |
|---------|-----------|-----------------|--------------|
| **Dashboard** | ✅ Full | ✅ Full | ✅ Full |
| **Browse Events** | ✅ All | ✅ All | ✅ All |
| **Create Event** | ✅ Yes | ✅ Yes | ❌ No |
| **Edit Own Events** | ✅ Yes | ✅ Yes | ❌ No |
| **Analytics** | ✅ Platform-wide | ✅ Own only | ❌ No |
| **Participants** | ✅ All | ✅ Own only | ❌ No |
| **Settings** | ✅ All | ✅ All | ✅ All |
| **Admin Panel** | ✅ Yes | ❌ No | ❌ No |

## 💡 User Experience

### Regular User Experience
- See "Browse Events" prominently
- "Upgrade to Organizer" CTA if they try to create event
- Clean, simple interface
- Focus on discovering and registering for events

### Event Organizer Experience
- Full event management capabilities
- Rich analytics for their events
- Participant management
- Professional tools

### App Admin Experience
- Platform-wide oversight
- User and event management
- System monitoring
- Advanced analytics

## 🎯 Key Decisions Needed

1. **Default Role:** Should signup default to Organizer or User?
   - Recommendation: **Organizer** (current behavior)
   
2. **Role Upgrade:** Can Regular Users upgrade to Organizer?
   - Recommendation: **Yes** - via Settings or special page
   
3. **Role Display:** Show role badge in navigation?
   - Recommendation: **Yes** - subtle badge showing current role

## 📝 Next Steps

1. Create role management service
2. Update signup form with role selection
3. Add role-based route guards
4. Update navigation components
5. Add upgrade/role change functionality

