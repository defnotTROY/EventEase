const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Event = require('../models/Event');
const Participant = require('../models/Participant');
const { protect, authorize, optionalAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// @desc    Get all events with filtering and pagination
// @route   GET /api/events
// @access  Public
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('category').optional().isString().withMessage('Category must be a string'),
  query('status').optional().isIn(['draft', 'published', 'cancelled', 'completed']).withMessage('Invalid status'),
  query('search').optional().isString().withMessage('Search must be a string'),
  query('sortBy').optional().isIn(['startDate', 'title', 'createdAt', 'currentParticipants']).withMessage('Invalid sort field'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc')
], optionalAuth, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  // Build filter object
  const filter = {};

  // Only show published events to non-authenticated users
  if (!req.user || req.user.role === 'viewer') {
    filter.status = 'published';
  }

  // Apply filters
  if (req.query.category) {
    filter.category = req.query.category;
  }

  if (req.query.status && (req.user && req.user.role !== 'viewer')) {
    filter.status = req.query.status;
  }

  if (req.query.search) {
    filter.$text = { $search: req.query.search };
  }

  // Build sort object
  const sortBy = req.query.sortBy || 'startDate';
  const sortOrder = req.query.sortOrder === 'desc' ? -1 : 1;
  const sort = { [sortBy]: sortOrder };

  // If searching, sort by text score first
  if (req.query.search) {
    sort.score = { $meta: 'textScore' };
  }

  const events = await Event.find(filter)
    .populate('organizer', 'firstName lastName email organization')
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await Event.countDocuments(filter);

  res.json({
    success: true,
    data: {
      events,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalEvents: total,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1
      }
    }
  });
}));

// @desc    Get single event
// @route   GET /api/events/:id
// @access  Public
router.get('/:id', optionalAuth, asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id)
    .populate('organizer', 'firstName lastName email organization avatar');

  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Event not found'
    });
  }

  // Check if user can view this event
  if (event.status !== 'published' && (!req.user || req.user._id.toString() !== event.organizer._id.toString())) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Event is not published or you are not the organizer.'
    });
  }

  // Increment view count
  await event.incrementViews();

  res.json({
    success: true,
    data: { event }
  });
}));

// @desc    Create new event
// @route   POST /api/events
// @access  Private (Organizers and Admins)
router.post('/', protect, authorize('organizer', 'admin'), [
  body('title')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Title must be between 5 and 200 characters'),
  body('description')
    .trim()
    .isLength({ min: 20, max: 2000 })
    .withMessage('Description must be between 20 and 2000 characters'),
  body('startDate')
    .isISO8601()
    .withMessage('Start date must be a valid date'),
  body('endDate')
    .isISO8601()
    .withMessage('End date must be a valid date'),
  body('location.name')
    .trim()
    .notEmpty()
    .withMessage('Location name is required'),
  body('category')
    .isIn(['Academic Conference', 'Tech Summit', 'Community Event', 'Workshop', 'Seminar', 'Networking', 'Cultural Event', 'Sports Event', 'Business Conference', 'Educational Workshop', 'Other'])
    .withMessage('Invalid category'),
  body('contactEmail')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid contact email is required'),
  body('maxParticipants')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Max participants must be a positive integer')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const eventData = {
    ...req.body,
    organizer: req.user._id,
    organization: req.user.organization
  };

  const event = await Event.create(eventData);

  // Populate organizer info
  await event.populate('organizer', 'firstName lastName email organization');

  // Emit real-time update
  if (req.io) {
    req.io.to(`org-${req.user.organization}`).emit('event-created', {
      event: event,
      organizer: req.user.firstName + ' ' + req.user.lastName
    });
  }

  res.status(201).json({
    success: true,
    message: 'Event created successfully',
    data: { event }
  });
}));

// @desc    Update event
// @route   PUT /api/events/:id
// @access  Private (Event Organizer or Admin)
router.put('/:id', protect, [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Title must be between 5 and 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ min: 20, max: 2000 })
    .withMessage('Description must be between 20 and 2000 characters'),
  body('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid date'),
  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid date')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const event = await Event.findById(req.params.id);

  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Event not found'
    });
  }

  // Check if user can update this event
  if (event.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. You can only update your own events.'
    });
  }

  const updatedEvent = await Event.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  ).populate('organizer', 'firstName lastName email organization');

  // Emit real-time update
  if (req.io) {
    req.io.to(`org-${req.user.organization}`).emit('event-updated', {
      event: updatedEvent,
      organizer: req.user.firstName + ' ' + req.user.lastName
    });
  }

  res.json({
    success: true,
    message: 'Event updated successfully',
    data: { event: updatedEvent }
  });
}));

// @desc    Delete event
// @route   DELETE /api/events/:id
// @access  Private (Event Organizer or Admin)
router.delete('/:id', protect, asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);

  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Event not found'
    });
  }

  // Check if user can delete this event
  if (event.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. You can only delete your own events.'
    });
  }

  // Check if event has participants
  const participantCount = await Participant.countDocuments({ event: event._id });
  if (participantCount > 0 && req.user.role !== 'admin') {
    return res.status(400).json({
      success: false,
      message: 'Cannot delete event with registered participants. Cancel the event instead.'
    });
  }

  // Delete related participants
  await Participant.deleteMany({ event: event._id });

  await Event.findByIdAndDelete(req.params.id);

  // Emit real-time update
  if (req.io) {
    req.io.to(`org-${req.user.organization}`).emit('event-deleted', {
      eventId: req.params.id,
      organizer: req.user.firstName + ' ' + req.user.lastName
    });
  }

  res.json({
    success: true,
    message: 'Event deleted successfully'
  });
}));

// @desc    Get event participants
// @route   GET /api/events/:id/participants
// @access  Private (Event Organizer or Admin)
router.get('/:id/participants', protect, asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);

  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Event not found'
    });
  }

  // Check if user can view participants
  if (event.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. You can only view participants for your own events.'
    });
  }

  const participants = await Participant.find({ event: req.params.id })
    .sort({ registrationDate: -1 });

  res.json({
    success: true,
    data: { participants }
  });
}));

// @desc    Get event analytics
// @route   GET /api/events/:id/analytics
// @access  Private (Event Organizer or Admin)
router.get('/:id/analytics', protect, asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);

  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Event not found'
    });
  }

  // Check if user can view analytics
  if (event.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. You can only view analytics for your own events.'
    });
  }

  // Get participant statistics
  const stats = await Participant.getEventStats(req.params.id);
  
  // Get participant demographics
  const demographics = await Participant.aggregate([
    { $match: { event: event._id } },
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

  // Get registration trends (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const registrationTrends = await Participant.aggregate([
    {
      $match: {
        event: event._id,
        registrationDate: { $gte: thirtyDaysAgo }
      }
    },
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

  res.json({
    success: true,
    data: {
      event: {
        id: event._id,
        title: event.title,
        status: event.status,
        startDate: event.startDate,
        endDate: event.endDate,
        maxParticipants: event.maxParticipants,
        currentParticipants: event.currentParticipants
      },
      analytics: {
        overview: demographics[0] || {
          totalParticipants: 0,
          checkedIn: 0,
          averageEngagement: 0,
          averageRating: 0
        },
        statusBreakdown: stats,
        registrationTrends,
        engagementScore: event.analytics.engagementScore,
        views: event.analytics.views,
        aiInsights: event.aiInsights
      }
    }
  });
}));

// @desc    Publish event
// @route   PUT /api/events/:id/publish
// @access  Private (Event Organizer or Admin)
router.put('/:id/publish', protect, asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);

  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Event not found'
    });
  }

  // Check if user can publish this event
  if (event.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. You can only publish your own events.'
    });
  }

  event.status = 'published';
  await event.save();

  // Emit real-time update
  if (req.io) {
    req.io.to(`org-${req.user.organization}`).emit('event-published', {
      event: event,
      organizer: req.user.firstName + ' ' + req.user.lastName
    });
  }

  res.json({
    success: true,
    message: 'Event published successfully',
    data: { event }
  });
}));

// @desc    Cancel event
// @route   PUT /api/events/:id/cancel
// @access  Private (Event Organizer or Admin)
router.put('/:id/cancel', protect, asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);

  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Event not found'
    });
  }

  // Check if user can cancel this event
  if (event.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. You can only cancel your own events.'
    });
  }

  event.status = 'cancelled';
  await event.save();

  // Emit real-time update
  if (req.io) {
    req.io.to(`org-${req.user.organization}`).emit('event-cancelled', {
      event: event,
      organizer: req.user.firstName + ' ' + req.user.lastName
    });
  }

  res.json({
    success: true,
    message: 'Event cancelled successfully',
    data: { event }
  });
}));

module.exports = router;
