# 🚀 EventEase Backend Setup Guide

## Quick Start Instructions

### 1. Install Backend Dependencies
```bash
cd backend
npm install
```

### 2. Set Up Environment Variables
```bash
# Copy the example environment file
cp env.example .env

# Edit the .env file with your configuration
```

**Required Environment Variables:**
```env
# Database
MONGODB_URI=mongodb://localhost:27017/eventease

# JWT Secret (generate a strong secret)
JWT_SECRET=your_super_secret_jwt_key_here

# Frontend URL for CORS
FRONTEND_URL=http://localhost:3000

# Optional but recommended:
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret
OPENAI_API_KEY=your_openai_api_key
```

### 3. Start MongoDB
```bash
# If you have MongoDB installed locally:
mongod

# Or use MongoDB Atlas (cloud) and update MONGODB_URI in .env
```

### 4. Seed the Database (Optional)
```bash
npm run seed
```

This will create sample users, events, and participants for testing.

**Default Login Credentials:**
- Admin: `admin@eventease.com` / `admin123`
- Organizer: `organizer@eventease.com` / `organizer123`
- Manager: `sarah@techcorp.com` / `sarah123`

### 5. Start the Backend Server
```bash
# Development mode with auto-restart
npm run dev

# Or production mode
npm start
```

The API will be available at `http://localhost:5000/api`

### 6. Test the API
```bash
# Health check
curl http://localhost:5000/api/health

# Get events (should return sample events)
curl http://localhost:5000/api/events
```

## 🔧 Frontend Integration

### 1. Update Frontend Environment
Create/update `src/.env`:
```env
REACT_APP_API_URL=http://localhost:5000/api
```

### 2. Start Frontend
```bash
# In the main project directory
npm start
```

The frontend will connect to the backend API automatically.

## 📊 What's Been Implemented

### ✅ Complete Backend Features:
- **Authentication System** - JWT-based auth with role management
- **User Management** - Registration, login, profile management
- **Event Management** - Full CRUD operations with advanced features
- **Participant Management** - Registration, check-in, feedback
- **Analytics API** - Dashboard metrics and AI insights
- **File Upload** - Image upload with Cloudinary integration
- **Real-time Updates** - WebSocket support for live updates
- **Security** - Rate limiting, CORS, input validation

### ✅ Database Models:
- **User Model** - Complete user management with preferences
- **Event Model** - Comprehensive event data with analytics
- **Participant Model** - Full participant lifecycle management

### ✅ API Endpoints:
- **Authentication**: `/api/auth/*`
- **Events**: `/api/events/*`
- **Participants**: `/api/participants/*`
- **Analytics**: `/api/analytics/*`
- **Users**: `/api/users/*`
- **Upload**: `/api/upload/*`

## 🎯 Next Steps

1. **Test the Integration**: Use the sample data to test all features
2. **Configure Cloudinary**: Set up image uploads for events and avatars
3. **Add OpenAI**: Enable AI-powered insights and recommendations
4. **Customize**: Modify the models and API to match your specific needs
5. **Deploy**: Set up production deployment when ready

## 🆘 Troubleshooting

### Common Issues:

**MongoDB Connection Error:**
- Make sure MongoDB is running
- Check the MONGODB_URI in your .env file
- Try `mongodb://127.0.0.1:27017/eventease` instead

**CORS Errors:**
- Ensure FRONTEND_URL in .env matches your React app URL
- Check that the frontend is running on the correct port

**Authentication Errors:**
- Make sure JWT_SECRET is set in .env
- Try logging in with the seeded credentials

**File Upload Issues:**
- Set up Cloudinary account and add credentials to .env
- Or comment out upload routes if not needed

## 📚 API Documentation

The backend includes comprehensive API documentation in `backend/README.md`. All endpoints are documented with examples and access levels.

## 🎉 You're Ready!

Your EventEase backend is now fully functional with:
- ✅ Complete API for all frontend features
- ✅ Sample data for testing
- ✅ Authentication and security
- ✅ Real-time capabilities
- ✅ File upload support
- ✅ AI integration ready

Start the backend server and your frontend will have access to all the real data and functionality!
