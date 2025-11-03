# EventEase Python Backend

A modern, AI-powered backend API for EventEase built with FastAPI and Python.

## 🚀 Features

### Core Functionality
- **FastAPI Framework** - Modern, fast, and automatic API documentation
- **SQLAlchemy ORM** - Powerful database abstraction with async support
- **JWT Authentication** - Secure token-based authentication
- **AI Integration** - OpenAI API integration for smart insights
- **File Upload** - Cloudinary integration for image handling
- **Real-time Updates** - WebSocket support for live updates

### AI & Analytics
- **Smart Insights** - AI-powered event recommendations
- **Predictive Analytics** - Data-driven event optimization
- **Sentiment Analysis** - Participant feedback analysis
- **Automated Scheduling** - AI-assisted event planning

### Security & Performance
- **Rate Limiting** - API request throttling
- **Input Validation** - Pydantic model validation
- **CORS Support** - Cross-origin resource sharing
- **Async Operations** - High-performance async/await

## 🛠️ Technology Stack

- **Framework**: FastAPI
- **Database**: PostgreSQL (with async support)
- **ORM**: SQLAlchemy 2.0 (async)
- **Authentication**: JWT with python-jose
- **AI**: OpenAI API
- **File Upload**: Cloudinary
- **Validation**: Pydantic
- **Testing**: pytest
- **Code Quality**: Black, Flake8, MyPy

## 📁 Project Structure

```
backend_python/
├── app/
│   ├── api/
│   │   └── v1/
│   │       ├── api.py          # API router configuration
│   │       └── endpoints/      # API endpoints
│   │           ├── auth.py     # Authentication
│   │           ├── events.py   # Event management
│   │           ├── participants.py # Participant management
│   │           ├── analytics.py # Analytics & AI
│   │           ├── users.py    # User management
│   │           └── upload.py   # File upload
│   ├── core/
│   │   ├── config.py           # Application configuration
│   │   ├── database.py         # Database connection
│   │   ├── security.py         # Security utilities
│   │   ├── exceptions.py       # Custom exceptions
│   │   └── middleware.py       # Custom middleware
│   └── models/
│       ├── user.py             # User model
│       ├── event.py            # Event model
│       └── participant.py      # Participant model
├── main.py                     # FastAPI application
├── run.py                      # Application runner
├── requirements.txt            # Python dependencies
└── README.md                   # This file
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
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

### 2. Environment Setup

```bash
# Copy environment file
cp env.example .env

# Edit .env with your configuration
```

**Required Environment Variables:**
```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/eventease

# JWT Secret
SECRET_KEY=your_super_secret_key_here_make_it_long_and_random

# Frontend URL
FRONTEND_URL=http://localhost:3000

# Optional but recommended:
OPENAI_API_KEY=your_openai_api_key_here
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret
```

### 3. Database Setup

```bash
# Install PostgreSQL and create database
createdb eventease

# Run migrations (when implemented)
alembic upgrade head
```

### 4. Start the Server

```bash
# Development mode
python run.py

# Or using uvicorn directly
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at:
- **API**: http://localhost:8000/api/v1
- **Docs**: http://localhost:8000/docs
- **Health**: http://localhost:8000/health

## 📚 API Documentation

### Authentication Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| POST | `/api/v1/auth/register` | Register new user | Public |
| POST | `/api/v1/auth/login` | Login user | Public |
| GET | `/api/v1/auth/me` | Get current user | Private |
| POST | `/api/v1/auth/logout` | Logout user | Private |
| GET | `/api/v1/auth/verify` | Verify token | Private |

### Event Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| GET | `/api/v1/events` | Get all events | Public |
| GET | `/api/v1/events/{id}` | Get single event | Public |
| POST | `/api/v1/events` | Create event | Private |
| PUT | `/api/v1/events/{id}` | Update event | Private (Owner) |
| DELETE | `/api/v1/events/{id}` | Delete event | Private (Owner) |

## 🔐 Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```python
headers = {
    "Authorization": "Bearer <your-jwt-token>"
}
```

### User Roles

- **Admin**: Full access to all resources
- **Organizer**: Can manage their own events and participants
- **Viewer**: Read-only access to published events

## 🧪 Testing

```bash
# Run tests
pytest

# Run tests with coverage
pytest --cov=app

# Run specific test file
pytest tests/test_auth.py
```

## 🔧 Development

### Code Quality

```bash
# Format code
black app/

# Lint code
flake8 app/

# Type checking
mypy app/
```

### Database Migrations

```bash
# Create migration
alembic revision --autogenerate -m "Description"

# Apply migrations
alembic upgrade head

# Rollback migration
alembic downgrade -1
```

## 🚀 Deployment

### Docker

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Production Checklist

1. **Environment Setup**
   - Set `DEBUG=False`
   - Use production database
   - Configure secure secrets
   - Set up SSL certificates

2. **Security**
   - Enable HTTPS
   - Configure CORS properly
   - Set up rate limiting
   - Use environment variables

3. **Performance**
   - Enable gzip compression
   - Set up database indexes
   - Configure caching
   - Monitor performance

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the API documentation at `/docs`
- Review the example requests

---

**EventEase Python Backend** - Smart event management with AI! 🎉
