const express = require('express');
const { query, validationResult } = require('express-validator');
const Event = require('../models/Event');
const Participant = require('../models/Participant');
const { protect, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const OpenAI = require('openai');

const router = express.Router();

// Initialize OpenAI if API key is available
let openai = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

// @desc    Get dashboard analytics
// @route   GET /api/analytics/dashboard
// @access  Private (Organizers and Admins)
router.get('/dashboard', protect, authorize('organizer', 'admin'), [
  query('period').optional().isIn(['7d', '30d', '90d', '1y']).withMessage('Invalid period'),
  query('eventId').optional().isMongoId().withMessage('Event ID must be a valid MongoDB ID')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const period = req.query.period || '30d';
  const eventId = req.query.eventId;

  // Calculate date range based on period
  const endDate = new Date();
  const startDate = new Date();
  
  switch (period) {
    case '7d':
      startDate.setDate(endDate.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(endDate.getDate() - 30);
      break;
    case '90d':
      startDate.setDate(endDate.getDate() - 90);
      break;
    case '1y':
      startDate.setFullYear(endDate.getFullYear() - 1);
      break;
  }

  // Build filter for user's events
  const eventFilter = {};
  if (req.user.role !== 'admin') {
    eventFilter.organizer = req.user._id;
  }
  if (eventId) {
    eventFilter._id = eventId;
  }

  // Get events in date range
  const events = await Event.find({
    ...eventFilter,
    createdAt: { $gte: startDate, $lte: endDate }
  });

  const eventIds = events.map(event => event._id);

  // Get participant statistics
  const participantStats = await Participant.aggregate([
    { $match: { event: { $in: eventIds } } },
    {
      $group: {
        _id: null,
        totalParticipants: { $sum: 1 },
        checkedIn: { $sum: { $cond: ['$checkIn.isCheckedIn', 1, 0] } },
        averageEngagement: { $avg: '$analytics.engagementScore' },
        averageRating: { $avg: '$feedback.rating' }
      }
    }
  ]);

  // Get event statistics
  const eventStats = await Event.aggregate([
    { $match: { _id: { $in: eventIds } } },
    {
      $group: {
        _id: null,
        totalEvents: { $sum: 1 },
        totalViews: { $sum: '$analytics.views' },
        averageEngagement: { $avg: '$analytics.engagementScore' },
        averageSatisfaction: { $avg: '$analytics.satisfactionScore' }
      }
    }
  ]);

  // Get category performance
  const categoryStats = await Event.aggregate([
    { $match: { _id: { $in: eventIds } } },
    {
      $group: {
        _id: '$category',
        eventCount: { $sum: 1 },
        totalParticipants: { $sum: '$currentParticipants' },
        averageEngagement: { $avg: '$analytics.engagementScore' }
      }
    },
    { $sort: { totalParticipants: -1 } }
  ]);

  // Get registration trends
  const registrationTrends = await Participant.aggregate([
    { $match: { event: { $in: eventIds }, registrationDate: { $gte: startDate } } },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$registrationDate' }
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id': 1 } }
  ]);

  // Get upcoming events
  const upcomingEvents = await Event.find({
    ...eventFilter,
    startDate: { $gte: new Date() },
    status: 'published'
  })
  .sort({ startDate: 1 })
  .limit(5)
  .select('title startDate location currentParticipants maxParticipants');

  res.json({
    success: true,
    data: {
      overview: {
        totalEvents: eventStats[0]?.totalEvents || 0,
        totalParticipants: participantStats[0]?.totalParticipants || 0,
        totalViews: eventStats[0]?.totalViews || 0,
        averageEngagement: Math.round(eventStats[0]?.averageEngagement || 0),
        averageSatisfaction: Math.round(eventStats[0]?.averageSatisfaction || 0),
        checkInRate: participantStats[0]?.totalParticipants > 0 
          ? Math.round((participantStats[0].checkedIn / participantStats[0].totalParticipants) * 100)
          : 0
      },
      categoryPerformance: categoryStats,
      registrationTrends,
      upcomingEvents
    }
  });
}));

// @desc    Get event analytics
// @route   GET /api/analytics/events
// @access  Private (Organizers and Admins)
router.get('/events', protect, authorize('organizer', 'admin'), [
  query('period').optional().isIn(['7d', '30d', '90d', '1y']).withMessage('Invalid period'),
  query('category').optional().isString().withMessage('Category must be a string'),
  query('sortBy').optional().isIn(['startDate', 'participants', 'engagement', 'satisfaction']).withMessage('Invalid sort field')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const period = req.query.period || '30d';
  const category = req.query.category;
  const sortBy = req.query.sortBy || 'startDate';

  // Calculate date range
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - parseInt(period.replace('d', '')));

  // Build filter
  const filter = {
    organizer: req.user.role !== 'admin' ? req.user._id : { $exists: true },
    startDate: { $gte: startDate }
  };

  if (category) {
    filter.category = category;
  }

  // Build sort
  let sort = {};
  switch (sortBy) {
    case 'participants':
      sort.currentParticipants = -1;
      break;
    case 'engagement':
      sort['analytics.engagementScore'] = -1;
      break;
    case 'satisfaction':
      sort['analytics.satisfactionScore'] = -1;
      break;
    default:
      sort.startDate = 1;
  }

  const events = await Event.find(filter)
    .populate('organizer', 'firstName lastName organization')
    .sort(sort)
    .select('title category startDate endDate currentParticipants maxParticipants analytics participants');

  // Get detailed analytics for each event
  const eventAnalytics = await Promise.all(
    events.map(async (event) => {
      const participantStats = await Participant.getEventStats(event._id);
      
      return {
        ...event.toObject(),
        participantStats,
        registrationProgress: event.maxParticipants 
          ? Math.round((event.currentParticipants / event.maxParticipants) * 100)
          : 0
      };
    })
  );

  res.json({
    success: true,
    data: {
      events: eventAnalytics,
      totalEvents: events.length
    }
  });
}));

// @desc    Get participant analytics
// @route   GET /api/analytics/participants
// @access  Private (Organizers and Admins)
router.get('/participants', protect, authorize('organizer', 'admin'), [
  query('period').optional().isIn(['7d', '30d', '90d', '1y']).withMessage('Invalid period'),
  query('eventId').optional().isMongoId().withMessage('Event ID must be a valid MongoDB ID')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const period = req.query.period || '30d';
  const eventId = req.query.eventId;

  // Calculate date range
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - parseInt(period.replace('d', '')));

  // Build event filter
  const eventFilter = {
    organizer: req.user.role !== 'admin' ? req.user._id : { $exists: true }
  };
  if (eventId) {
    eventFilter._id = eventId;
  }

  const events = await Event.find(eventFilter).select('_id');
  const eventIds = events.map(event => event._id);

  // Build participant filter
  const participantFilter = {
    event: { $in: eventIds },
    registrationDate: { $gte: startDate }
  };

  // Get participant demographics
  const demographics = await Participant.aggregate([
    { $match: participantFilter },
    {
      $group: {
        _id: null,
        totalParticipants: { $sum: 1 },
        averageEngagement: { $avg: '$analytics.engagementScore' },
        averageRating: { $avg: '$feedback.rating' },
        checkedIn: { $sum: { $cond: ['$checkIn.isCheckedIn', 1, 0] } },
        onWaitlist: { $sum: { $cond: ['$waitlist.isOnWaitlist', 1, 0] } }
      }
    }
  ]);

  // Get registration sources
  const registrationSources = await Participant.aggregate([
    { $match: participantFilter },
    {
      $group: {
        _id: '$registrationSource',
        count: { $sum: 1 },
        percentage: { $sum: 1 }
      }
    },
    {
      $addFields: {
        percentage: {
          $multiply: [
            { $divide: ['$percentage', demographics[0]?.totalParticipants || 1] },
            100
          ]
        }
      }
    }
  ]);

  // Get engagement distribution
  const engagementDistribution = await Participant.aggregate([
    { $match: participantFilter },
    {
      $bucket: {
        groupBy: '$analytics.engagementScore',
        boundaries: [0, 25, 50, 75, 100],
        default: '100+',
        output: {
          count: { $sum: 1 },
          participants: { $push: { name: '$firstName', engagement: '$analytics.engagementScore' } }
        }
      }
    }
  ]);

  // Get feedback distribution
  const feedbackDistribution = await Participant.aggregate([
    { $match: { ...participantFilter, 'feedback.rating': { $exists: true } } },
    {
      $group: {
        _id: '$feedback.rating',
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id': 1 } }
  ]);

  res.json({
    success: true,
    data: {
      overview: demographics[0] || {
        totalParticipants: 0,
        averageEngagement: 0,
        averageRating: 0,
        checkedIn: 0,
        onWaitlist: 0
      },
      registrationSources,
      engagementDistribution,
      feedbackDistribution
    }
  });
}));

// @desc    Get AI insights
// @route   GET /api/analytics/insights
// @access  Private (Organizers and Admins)
router.get('/insights', protect, authorize('organizer', 'admin'), asyncHandler(async (req, res) => {
  if (!openai) {
    return res.status(503).json({
      success: false,
      message: 'AI insights are not available. OpenAI API key not configured.'
    });
  }

  try {
    // Get recent event data for AI analysis
    const recentEvents = await Event.find({
      organizer: req.user.role !== 'admin' ? req.user._id : { $exists: true },
      status: 'published'
    })
    .populate({
      path: 'participants',
      model: 'Participant',
      select: 'analytics feedback registrationDate checkIn'
    })
    .limit(10)
    .sort({ createdAt: -1 });

    if (recentEvents.length === 0) {
      return res.json({
        success: true,
        data: {
          insights: [],
          message: 'Not enough data to generate insights. Create and run more events to get AI-powered recommendations.'
        }
      });
    }

    // Prepare data for AI analysis
    const eventData = recentEvents.map(event => ({
      title: event.title,
      category: event.category,
      participants: event.currentParticipants,
      maxParticipants: event.maxParticipants,
      engagement: event.analytics.engagementScore,
      satisfaction: event.analytics.satisfactionScore,
      views: event.analytics.views,
      startDate: event.startDate,
      duration: event.duration
    }));

    // Generate AI insights
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are an event management analytics expert. Analyze the provided event data and generate actionable insights and recommendations for improving future events. Focus on engagement, attendance, and satisfaction metrics."
        },
        {
          role: "user",
          content: `Analyze this event data and provide 3-5 key insights with actionable recommendations: ${JSON.stringify(eventData)}`
        }
      ],
      max_tokens: 1000,
      temperature: 0.7
    });

    const aiResponse = completion.choices[0].message.content;

    // Parse AI response into structured insights
    const insights = parseAIInsights(aiResponse);

    // Save insights to events for future reference
    await Promise.all(
      recentEvents.map(event => {
        event.aiInsights = insights.map(insight => ({
          type: insight.type || 'recommendation',
          title: insight.title,
          description: insight.description,
          confidence: insight.confidence || 85,
          actionable: insight.actionable !== false
        }));
        return event.save({ validateBeforeSave: false });
      })
    );

    res.json({
      success: true,
      data: {
        insights,
        generatedAt: new Date(),
        dataPoints: eventData.length
      }
    });

  } catch (error) {
    console.error('AI insights generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate AI insights. Please try again later.'
    });
  }
}));

// @desc    Get performance metrics
// @route   GET /api/analytics/performance
// @access  Private (Organizers and Admins)
router.get('/performance', protect, authorize('organizer', 'admin'), [
  query('period').optional().isIn(['7d', '30d', '90d', '1y']).withMessage('Invalid period')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const period = req.query.period || '30d';

  // Calculate date range
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - parseInt(period.replace('d', '')));

  // Get performance metrics
  const metrics = await Event.aggregate([
    {
      $match: {
        organizer: req.user.role !== 'admin' ? req.user._id : { $exists: true },
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: null,
        totalEvents: { $sum: 1 },
        totalViews: { $sum: '$analytics.views' },
        totalParticipants: { $sum: '$currentParticipants' },
        averageEngagement: { $avg: '$analytics.engagementScore' },
        averageSatisfaction: { $avg: '$analytics.satisfactionScore' },
        averageRegistrationRate: { $avg: '$registrationProgress' }
      }
    }
  ]);

  // Get monthly trends
  const monthlyTrends = await Event.aggregate([
    {
      $match: {
        organizer: req.user.role !== 'admin' ? req.user._id : { $exists: true },
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        },
        events: { $sum: 1 },
        participants: { $sum: '$currentParticipants' },
        views: { $sum: '$analytics.views' },
        engagement: { $avg: '$analytics.engagementScore' }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } }
  ]);

  // Get top performing events
  const topEvents = await Event.find({
    organizer: req.user.role !== 'admin' ? req.user._id : { $exists: true },
    createdAt: { $gte: startDate }
  })
  .sort({ 'analytics.engagementScore': -1 })
  .limit(5)
  .select('title category analytics currentParticipants maxParticipants');

  res.json({
    success: true,
    data: {
      metrics: metrics[0] || {
        totalEvents: 0,
        totalViews: 0,
        totalParticipants: 0,
        averageEngagement: 0,
        averageSatisfaction: 0,
        averageRegistrationRate: 0
      },
      monthlyTrends,
      topEvents
    }
  });
}));

// Helper function to parse AI insights
function parseAIInsights(aiResponse) {
  const insights = [];
  const lines = aiResponse.split('\n');
  
  let currentInsight = {};
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    if (trimmedLine.match(/^\d+\.|^[-*]/)) {
      // New insight
      if (currentInsight.title) {
        insights.push(currentInsight);
      }
      currentInsight = {
        title: trimmedLine.replace(/^\d+\.|^[-*]\s*/, ''),
        description: '',
        type: 'recommendation',
        confidence: 85,
        actionable: true
      };
    } else if (trimmedLine && currentInsight.title) {
      // Description line
      currentInsight.description += (currentInsight.description ? ' ' : '') + trimmedLine;
    }
  }
  
  // Add the last insight
  if (currentInsight.title) {
    insights.push(currentInsight);
  }
  
  return insights;
}

module.exports = router;
