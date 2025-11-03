const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Participant = require('../models/Participant');
const Event = require('../models/Event');
const { protect, authorize, optionalAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// @desc    Get all participants with filtering and pagination
// @route   GET /api/participants
// @access  Private (Organizers and Admins)
router.get('/', protect, authorize('organizer', 'admin'), [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('eventId').optional().isMongoId().withMessage('Event ID must be a valid MongoDB ID'),
  query('status').optional().isIn(['registered', 'confirmed', 'checked-in', 'cancelled', 'no-show']).withMessage('Invalid status'),
  query('search').optional().isString().withMessage('Search must be a string'),
  query('sortBy').optional().isIn(['firstName', 'lastName', 'email', 'registrationDate']).withMessage('Invalid sort field'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc')
], asyncHandler(async (req, res) => {
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

  // Filter by user's events if not admin
  if (req.user.role !== 'admin') {
    const userEvents = await Event.find({ organizer: req.user._id }).select('_id');
    filter.event = { $in: userEvents.map(e => e._id) };
  }

  // Apply additional filters
  if (req.query.eventId) {
    // Verify user can access this event
    const event = await Event.findById(req.query.eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    if (req.user.role !== 'admin' && event.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view participants for your own events.'
      });
    }

    filter.event = req.query.eventId;
  }

  if (req.query.status) {
    filter.status = req.query.status;
  }

  if (req.query.search) {
    filter.$text = { $search: req.query.search };
  }

  // Build sort object
  const sortBy = req.query.sortBy || 'registrationDate';
  const sortOrder = req.query.sortOrder === 'desc' ? -1 : 1;
  const sort = { [sortBy]: sortOrder };

  // If searching, sort by text score first
  if (req.query.search) {
    sort.score = { $meta: 'textScore' };
  }

  const participants = await Participant.find(filter)
    .populate('event', 'title startDate category')
    .sort(sort)
    .skip(skip)
    .limit(limit);

  const total = await Participant.countDocuments(filter);

  res.json({
    success: true,
    data: {
      participants,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalParticipants: total,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1
      }
    }
  });
}));

// @desc    Get single participant
// @route   GET /api/participants/:id
// @access  Private (Event Organizer or Admin)
router.get('/:id', protect, asyncHandler(async (req, res) => {
  const participant = await Participant.findById(req.params.id)
    .populate('event', 'title startDate organizer')
    .populate('organizer', 'firstName lastName email organization');

  if (!participant) {
    return res.status(404).json({
      success: false,
      message: 'Participant not found'
    });
  }

  // Check if user can view this participant
  if (req.user.role !== 'admin' && participant.organizer._id.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. You can only view participants for your own events.'
    });
  }

  res.json({
    success: true,
    data: { participant }
  });
}));

// @desc    Register for event
// @route   POST /api/participants
// @access  Public
router.post('/', [
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('eventId')
    .isMongoId()
    .withMessage('Event ID must be a valid MongoDB ID'),
  body('phone')
    .optional()
    .matches(/^\+?[\d\s-()]+$/)
    .withMessage('Please provide a valid phone number'),
  body('customFields')
    .optional()
    .isArray()
    .withMessage('Custom fields must be an array')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { firstName, lastName, email, eventId, phone, customFields, requirements } = req.body;

  // Check if event exists and is published
  const event = await Event.findById(eventId);
  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Event not found'
    });
  }

  if (event.status !== 'published') {
    return res.status(400).json({
      success: false,
      message: 'Event is not accepting registrations'
    });
  }

  // Check if registration is still open
  const now = new Date();
  if (event.registration.endDate && now > event.registration.endDate) {
    return res.status(400).json({
      success: false,
      message: 'Registration for this event has closed'
    });
  }

  // Check if event is at capacity
  if (event.maxParticipants && event.currentParticipants >= event.maxParticipants) {
    // Check if waitlist is enabled
    if (event.settings.allowWaitlist) {
      // Add to waitlist
      const waitlistPosition = await Participant.countDocuments({
        event: eventId,
        'waitlist.isOnWaitlist': true
      }) + 1;

      const participant = await Participant.create({
        firstName,
        lastName,
        email,
        phone,
        event: eventId,
        organizer: event.organizer,
        organization: event.organization,
        customFields,
        requirements,
        waitlist: {
          isOnWaitlist: true,
          waitlistPosition,
          waitlistDate: new Date()
        }
      });

      await participant.populate('event', 'title startDate');

      return res.status(201).json({
        success: true,
        message: 'Added to waitlist successfully',
        data: {
          participant,
          waitlistPosition
        }
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Event is at maximum capacity'
      });
    }
  }

  // Create participant
  const participantData = {
    firstName,
    lastName,
    email,
    phone,
    event: eventId,
    organizer: event.organizer,
    organization: event.organization,
    customFields,
    requirements,
    status: event.registration.requiresApproval ? 'registered' : 'confirmed'
  };

  const participant = await Participant.create(participantData);

  // Update event participant count
  await event.addParticipant();

  // Populate participant data
  await participant.populate('event', 'title startDate');

  // Emit real-time update
  if (req.io) {
    req.io.to(`org-${event.organization}`).emit('participant-registered', {
      participant,
      event: event.title,
      organizer: event.organizer
    });
  }

  res.status(201).json({
    success: true,
    message: 'Registration successful',
    data: { participant }
  });
}));

// @desc    Update participant
// @route   PUT /api/participants/:id
// @access  Private (Event Organizer or Admin)
router.put('/:id', protect, [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('phone')
    .optional()
    .matches(/^\+?[\d\s-()]+$/)
    .withMessage('Please provide a valid phone number'),
  body('status')
    .optional()
    .isIn(['registered', 'confirmed', 'checked-in', 'cancelled', 'no-show'])
    .withMessage('Invalid status')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const participant = await Participant.findById(req.params.id);

  if (!participant) {
    return res.status(404).json({
      success: false,
      message: 'Participant not found'
    });
  }

  // Check if user can update this participant
  if (req.user.role !== 'admin' && participant.organizer.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. You can only update participants for your own events.'
    });
  }

  const updatedParticipant = await Participant.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  ).populate('event', 'title startDate');

  // Emit real-time update
  if (req.io) {
    req.io.to(`org-${participant.organization}`).emit('participant-updated', {
      participant: updatedParticipant,
      organizer: req.user.firstName + ' ' + req.user.lastName
    });
  }

  res.json({
    success: true,
    message: 'Participant updated successfully',
    data: { participant: updatedParticipant }
  });
}));

// @desc    Delete participant
// @route   DELETE /api/participants/:id
// @access  Private (Event Organizer or Admin)
router.delete('/:id', protect, asyncHandler(async (req, res) => {
  const participant = await Participant.findById(req.params.id);

  if (!participant) {
    return res.status(404).json({
      success: false,
      message: 'Participant not found'
    });
  }

  // Check if user can delete this participant
  if (req.user.role !== 'admin' && participant.organizer.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. You can only delete participants from your own events.'
    });
  }

  // Update event participant count
  const event = await Event.findById(participant.event);
  if (event && !participant.waitlist.isOnWaitlist) {
    await event.removeParticipant();
  }

  await Participant.findByIdAndDelete(req.params.id);

  // Emit real-time update
  if (req.io) {
    req.io.to(`org-${participant.organization}`).emit('participant-deleted', {
      participantId: req.params.id,
      organizer: req.user.firstName + ' ' + req.user.lastName
    });
  }

  res.json({
    success: true,
    message: 'Participant deleted successfully'
  });
}));

// @desc    Check-in participant
// @route   PUT /api/participants/:id/checkin
// @access  Private (Event Organizer or Admin)
router.put('/:id/checkin', protect, asyncHandler(async (req, res) => {
  const participant = await Participant.findById(req.params.id);

  if (!participant) {
    return res.status(404).json({
      success: false,
      message: 'Participant not found'
    });
  }

  // Check if user can check-in this participant
  if (req.user.role !== 'admin' && participant.organizer.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. You can only check-in participants for your own events.'
    });
  }

  if (participant.checkIn.isCheckedIn) {
    return res.status(400).json({
      success: false,
      message: 'Participant is already checked in'
    });
  }

    await participant.performCheckIn(req.body.method || 'manual', req.user._id);

  // Update event check-in count
  const event = await Event.findById(participant.event);
  if (event) {
    event.analytics.checkIns += 1;
    await event.save({ validateBeforeSave: false });
  }

  // Emit real-time update
  if (req.io) {
    req.io.to(`org-${participant.organization}`).emit('participant-checked-in', {
      participant,
      organizer: req.user.firstName + ' ' + req.user.lastName
    });
  }

  res.json({
    success: true,
    message: 'Participant checked in successfully',
    data: { participant }
  });
}));

// @desc    Cancel participant registration
// @route   PUT /api/participants/:id/cancel
// @access  Private (Event Organizer or Admin)
router.put('/:id/cancel', protect, asyncHandler(async (req, res) => {
  const participant = await Participant.findById(req.params.id);

  if (!participant) {
    return res.status(404).json({
      success: false,
      message: 'Participant not found'
    });
  }

  // Check if user can cancel this participant
  if (req.user.role !== 'admin' && participant.organizer.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. You can only cancel participants for your own events.'
    });
  }

  if (participant.status === 'cancelled') {
    return res.status(400).json({
      success: false,
      message: 'Participant registration is already cancelled'
    });
  }

  await participant.cancelRegistration();

  // Update event participant count if not on waitlist
  if (!participant.waitlist.isOnWaitlist) {
    const event = await Event.findById(participant.event);
    if (event) {
      await event.removeParticipant();
    }
  }

  // Emit real-time update
  if (req.io) {
    req.io.to(`org-${participant.organization}`).emit('participant-cancelled', {
      participant,
      organizer: req.user.firstName + ' ' + req.user.lastName
    });
  }

  res.json({
    success: true,
    message: 'Participant registration cancelled successfully',
    data: { participant }
  });
}));

// @desc    Submit participant feedback
// @route   POST /api/participants/:id/feedback
// @access  Public
router.post('/:id/feedback', [
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  body('comments')
    .optional()
    .isString()
    .isLength({ max: 1000 })
    .withMessage('Comments cannot exceed 1000 characters'),
  body('wouldRecommend')
    .optional()
    .isBoolean()
    .withMessage('Would recommend must be a boolean'),
  body('topicsOfInterest')
    .optional()
    .isArray()
    .withMessage('Topics of interest must be an array')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const participant = await Participant.findById(req.params.id);

  if (!participant) {
    return res.status(404).json({
      success: false,
      message: 'Participant not found'
    });
  }

  await participant.updateFeedback(req.body);

  // Update event satisfaction score
  const event = await Event.findById(participant.event);
  if (event) {
    const feedbackStats = await Participant.aggregate([
      { $match: { event: event._id, 'feedback.rating': { $exists: true } } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$feedback.rating' },
          totalResponses: { $sum: 1 }
        }
      }
    ]);

    if (feedbackStats.length > 0) {
      event.analytics.satisfactionScore = Math.round(feedbackStats[0].averageRating * 20); // Convert to percentage
      await event.save({ validateBeforeSave: false });
    }
  }

  res.json({
    success: true,
    message: 'Feedback submitted successfully',
    data: { participant }
  });
}));

// @desc    Get participant statistics
// @route   GET /api/participants/stats
// @access  Private (Organizers and Admins)
router.get('/stats', protect, authorize('organizer', 'admin'), asyncHandler(async (req, res) => {
  const filter = {};

  // Filter by user's events if not admin
  if (req.user.role !== 'admin') {
    const userEvents = await Event.find({ organizer: req.user._id }).select('_id');
    filter.event = { $in: userEvents.map(e => e._id) };
  }

  const stats = await Participant.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        totalParticipants: { $sum: 1 },
        checkedIn: { $sum: { $cond: ['$checkIn.isCheckedIn', 1, 0] } },
        onWaitlist: { $sum: { $cond: ['$waitlist.isOnWaitlist', 1, 0] } },
        averageEngagement: { $avg: '$analytics.engagementScore' },
        averageRating: { $avg: '$feedback.rating' }
      }
    }
  ]);

  const statusBreakdown = await Participant.aggregate([
    { $match: filter },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  res.json({
    success: true,
    data: {
      overview: stats[0] || {
        totalParticipants: 0,
        checkedIn: 0,
        onWaitlist: 0,
        averageEngagement: 0,
        averageRating: 0
      },
      statusBreakdown
    }
  });
}));

module.exports = router;
