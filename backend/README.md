# EventEase Backend API

A comprehensive backend API for the EventEase smart event management platform, built with Node.js, Express, and MongoDB.

## 🚀 Features

### Core Functionality
- **User Management** - Registration, authentication, profile management
- **Event Management** - CRUD operations, event lifecycle management
- **Participant Management** - Registration, check-in, feedback collection
- **Analytics & Insights** - AI-powered analytics and performance metrics
- **File Upload** - Image upload with Cloudinary integration
- **Real-time Updates** - WebSocket integration for live updates

### Security & Performance
- **JWT Authentication** - Secure token-based authentication
- **Role-based Access Control** - Admin, Organizer, Viewer roles
- **Rate Limiting** - API request throttling
- **Input Validation** - Comprehensive request validation
- **Error Handling** - Centralized error management
- **Security Headers** - Helmet.js security middleware

### AI Integration
- **OpenAI Integration** - AI-powered event insights
- **Smart Recommendations** - Automated event optimization suggestions
- **Predictive Analytics** - Data-driven insights

## 🛠️ Technology Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **File Upload**: Multer + Cloudinary
- **Real-time**: Socket.IO
- **AI**: OpenAI API
- **Validation**: Express Validator
- **Security**: Helmet, CORS, Rate Limiting

## 📁 Project Structure

```
backend/
├── models/                 # Database models
│   ├── User.js            # User model
│   ├── Event.js           # Event model
│   └── Participant.js     # Participant model
├── routes/                # API routes
│   ├── auth.js           # Authentication routes
│   ├── events.js         # Event management routes
│   ├── participants.js   # Participant management routes
│   ├── analytics.js      # Analytics and insights routes
│   ├── users.js          # User management routes
│   └── upload.js         # File upload routes
├── middleware/            # Custom middleware
│   ├── auth.js           # Authentication middleware
│   ├── errorHandler.js   # Error handling middleware
│   └── notFound.js       # 404 handler
├── scripts/              # Utility scripts
│   └── seedDatabase.js   # Database seeding script
├── server.js             # Main server file
├── package.json          # Dependencies and scripts
└── README.md            # This file
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or cloud instance)
- Cloudinary account (for file uploads)
- OpenAI API key (for AI features)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd eventease/backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   cp env.example .env
   ```
   
   Update `.env` with your configuration:
   ```env
   # Server Configuration
   PORT=5000
   NODE_ENV=development
   
   # Database
   MONGODB_URI=mongodb://localhost:27017/eventease
   
   # JWT Configuration
   JWT_SECRET=your_super_secret_jwt_key_here
   JWT_EXPIRE=7d
   
   # File Upload - Cloudinary
   CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret
   
   # AI Services - OpenAI
   OPENAI_API_KEY=your_openai_api_key_here
   
   # Frontend URL (for CORS)
   FRONTEND_URL=http://localhost:3000
   ```

4. **Start MongoDB**
   ```bash
   # Local MongoDB
   mongod
   
   # Or use MongoDB Atlas (cloud)
   ```

5. **Seed the database** (optional)
   ```bash
   npm run seed
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```

The API will be available at `http://localhost:5000/api`

## 📚 API Documentation

### Authentication Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| POST | `/api/auth/register` | Register new user | Public |
| POST | `/api/auth/login` | Login user | Public |
| GET | `/api/auth/me` | Get current user | Private |
| PUT | `/api/auth/profile` | Update user profile | Private |
| PUT | `/api/auth/settings` | Update user settings | Private |
| PUT | `/api/auth/change-password` | Change password | Private |

### Event Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| GET | `/api/events` | Get all events | Public |
| GET | `/api/events/:id` | Get single event | Public |
| POST | `/api/events` | Create event | Private (Organizer+) |
| PUT | `/api/events/:id` | Update event | Private (Owner/Admin) |
| DELETE | `/api/events/:id` | Delete event | Private (Owner/Admin) |
| GET | `/api/events/:id/participants` | Get event participants | Private (Owner/Admin) |
| GET | `/api/events/:id/analytics` | Get event analytics | Private (Owner/Admin) |
| PUT | `/api/events/:id/publish` | Publish event | Private (Owner/Admin) |
| PUT | `/api/events/:id/cancel` | Cancel event | Private (Owner/Admin) |

### Participant Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| GET | `/api/participants` | Get all participants | Private (Organizer+) |
| GET | `/api/participants/:id` | Get single participant | Private (Owner/Admin) |
| POST | `/api/participants` | Register for event | Public |
| PUT | `/api/participants/:id` | Update participant | Private (Owner/Admin) |
| DELETE | `/api/participants/:id` | Delete participant | Private (Owner/Admin) |
| PUT | `/api/participants/:id/checkin` | Check-in participant | Private (Owner/Admin) |
| POST | `/api/participants/:id/feedback` | Submit feedback | Public |

### Analytics Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| GET | `/api/analytics/dashboard` | Get dashboard analytics | Private (Organizer+) |
| GET | `/api/analytics/events` | Get event analytics | Private (Organizer+) |
| GET | `/api/analytics/participants` | Get participant analytics | Private (Organizer+) |
| GET | `/api/analytics/insights` | Get AI insights | Private (Organizer+) |
| GET | `/api/analytics/performance` | Get performance metrics | Private (Organizer+) |

### File Upload Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| POST | `/api/upload/image` | Upload single image | Private |
| POST | `/api/upload/images` | Upload multiple images | Private |
| POST | `/api/upload/avatar` | Upload user avatar | Private |
| POST | `/api/upload/event-image` | Upload event image | Private |
| DELETE | `/api/upload/:publicId` | Delete image | Private |

## 🔐 Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```javascript
headers: {
  'Authorization': 'Bearer <your-jwt-token>'
}
```

### User Roles

- **Admin**: Full access to all resources
- **Organizer**: Can manage their own events and participants
- **Viewer**: Read-only access to published events

## 📊 Database Models

### User Model
- Personal information (name, email, phone)
- Authentication data (password, JWT tokens)
- Preferences (notifications, AI settings, security)
- Organization and role information

### Event Model
- Event details (title, description, dates, location)
- Registration settings and capacity
- Analytics and engagement metrics
- AI-generated insights

### Participant Model
- Registration information
- Check-in status and feedback
- Communication preferences
- Engagement analytics

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port | No (default: 5000) |
| `NODE_ENV` | Environment mode | No (default: development) |
| `MONGODB_URI` | MongoDB connection string | Yes |
| `JWT_SECRET` | JWT signing secret | Yes |
| `JWT_EXPIRE` | JWT expiration time | No (default: 7d) |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | Yes (for uploads) |
| `CLOUDINARY_API_KEY` | Cloudinary API key | Yes (for uploads) |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | Yes (for uploads) |
| `OPENAI_API_KEY` | OpenAI API key | No (for AI features) |
| `FRONTEND_URL` | Frontend URL for CORS | No (default: localhost:3000) |

## 🚀 Deployment

### Production Checklist

1. **Environment Setup**
   - Set `NODE_ENV=production`
   - Use production MongoDB instance
   - Configure secure JWT secrets
   - Set up Cloudinary production account

2. **Security**
   - Enable HTTPS
   - Configure proper CORS settings
   - Set up rate limiting
   - Use environment variables for secrets

3. **Performance**
   - Enable gzip compression
   - Set up caching headers
   - Configure database indexes
   - Monitor API performance

### Docker Deployment

```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

### Heroku Deployment

```bash
# Install Heroku CLI
npm install -g heroku

# Login and create app
heroku login
heroku create your-app-name

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set MONGODB_URI=your-mongodb-uri
heroku config:set JWT_SECRET=your-jwt-secret

# Deploy
git push heroku main
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- --grep "Authentication"
```

## 📈 Monitoring & Logging

### Health Check
- Endpoint: `GET /api/health`
- Returns server status and version information

### Logging
- Console logging for development
- Structured logging for production
- Error tracking and monitoring

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the API documentation
- Review the example requests

## 🔮 Roadmap

- [ ] GraphQL API support
- [ ] Advanced caching strategies
- [ ] Microservices architecture
- [ ] Advanced AI features
- [ ] Mobile app API endpoints
- [ ] Webhook system
- [ ] Advanced analytics dashboard
- [ ] Multi-language support

---

**EventEase Backend API** - Powering smart event management! 🎉
