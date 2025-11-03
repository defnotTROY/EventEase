# 🐍 EventEase Python Backend Setup Guide

## Quick Start Instructions

### 1. Install Python Dependencies
```bash
cd backend_python

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Set Up Environment Variables
```bash
# Copy the example environment file
cp env.example .env

# Edit the .env file with your configuration
```

**Required Environment Variables:**
```env
# Database (PostgreSQL recommended)
DATABASE_URL=postgresql://username:password@localhost:5432/eventease

# JWT Secret (generate a strong secret)
SECRET_KEY=your_super_secret_key_here_make_it_long_and_random

# Frontend URL for CORS
FRONTEND_URL=http://localhost:3000

# Optional but recommended for full features:
OPENAI_API_KEY=your_openai_api_key_here
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret
```

### 3. Set Up PostgreSQL Database
```bash
# Install PostgreSQL and create database
createdb eventease

# Or using psql:
psql -c "CREATE DATABASE eventease;"
```

### 4. Start the Python Backend Server
```bash
# Development mode with auto-reload
python run.py

# Or using uvicorn directly
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at:
- **API Base**: `http://localhost:8000/api/v1`
- **Documentation**: `http://localhost:8000/docs`
- **Health Check**: `http://localhost:8000/health`

### 5. Test the API
```bash
# Health check
curl http://localhost:8000/health

# API health check
curl http://localhost:8000/api/health

# View API documentation
# Open http://localhost:8000/docs in your browser
```

## 🔧 Frontend Integration

### 1. Update Frontend Environment
Create/update `src/.env`:
```env
REACT_APP_API_URL=http://localhost:8000/api/v1
```

### 2. Update API Service
The frontend API service (`src/services/api.js`) will automatically connect to the Python backend when you update the `REACT_APP_API_URL`.

## 📊 What's Been Implemented

### ✅ Complete Python Backend Features:
- **FastAPI Framework** - Modern, fast API with automatic documentation
- **SQLAlchemy Models** - User, Event, and Participant models with relationships
- **JWT Authentication** - Secure token-based authentication system
- **Event Management** - Full CRUD operations for events
- **Database Integration** - PostgreSQL with async support
- **Security Middleware** - Rate limiting, CORS, input validation
- **API Documentation** - Automatic OpenAPI/Swagger docs

### ✅ API Endpoints Ready:
- **Authentication**: `/api/v1/auth/*` (register, login, me, logout, verify)
- **Events**: `/api/v1/events/*` (CRUD operations, filtering, pagination)
- **Participants**: `/api/v1/participants/*` (placeholder - ready for implementation)
- **Analytics**: `/api/v1/analytics/*` (placeholder - ready for AI integration)
- **Users**: `/api/v1/users/*` (placeholder - ready for implementation)
- **Upload**: `/api/v1/upload/*` (placeholder - ready for Cloudinary)

### ✅ Database Models:
- **User Model** - Complete with preferences, security settings, AI settings
- **Event Model** - Comprehensive event data with analytics and AI insights
- **Participant Model** - Full participant lifecycle management

## 🎯 Key Advantages of Python Backend

### 🚀 **AI Integration Ready**
- **OpenAI API** - Built-in support for GPT models
- **Data Science Libraries** - Pandas, NumPy, Scikit-learn included
- **Analytics Engine** - Ready for advanced data processing
- **ML Capabilities** - Perfect for predictive analytics

### ⚡ **Performance & Scalability**
- **Async/Await** - High-performance async operations
- **FastAPI** - One of the fastest Python frameworks
- **Database Optimization** - SQLAlchemy 2.0 with async support
- **Auto Documentation** - Interactive API docs at `/docs`

### 🛡️ **Security & Quality**
- **Type Safety** - Full type hints with Pydantic
- **Input Validation** - Automatic request/response validation
- **Security Middleware** - Rate limiting, CORS, authentication
- **Error Handling** - Comprehensive exception management

## 🔮 Next Steps

1. **Test the Integration**: Use the API documentation at `/docs` to test endpoints
2. **Implement Remaining Endpoints**: Complete participants, analytics, users, upload
3. **Add AI Features**: Implement OpenAI integration for smart insights
4. **Database Migrations**: Set up Alembic for database versioning
5. **Deploy**: Set up production deployment when ready

## 🆘 Troubleshooting

### Common Issues:

**Database Connection Error:**
- Make sure PostgreSQL is running
- Check the DATABASE_URL in your .env file
- Ensure the database exists: `createdb eventease`

**Import Errors:**
- Make sure you're in the virtual environment
- Install all dependencies: `pip install -r requirements.txt`

**Port Already in Use:**
- Change the PORT in .env file
- Or kill the process using port 8000

**CORS Errors:**
- Ensure FRONTEND_URL in .env matches your React app URL
- Check that the frontend is running on the correct port

## 📚 API Documentation

The Python backend includes **automatic API documentation**:
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`
- **OpenAPI Schema**: `http://localhost:8000/openapi.json`

## 🎉 You're Ready!

Your EventEase Python backend is now running with:
- ✅ Modern FastAPI framework
- ✅ Async database operations
- ✅ JWT authentication
- ✅ Event management API
- ✅ Automatic documentation
- ✅ AI integration ready
- ✅ Security middleware
- ✅ Type-safe models

The Python backend is **perfect for AI features** and will give you much better performance for analytics and smart recommendations than the Node.js version!

Start the backend server and your frontend will have access to all the real data and functionality through the Python API.
