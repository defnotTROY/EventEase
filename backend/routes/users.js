const express = require('express');
const { body, validationResult, query } = require('express-validator');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// @desc    Get all users (Admin only)
// @route   GET /api/users
// @access  Private (Admin only)
router.get('/', protect, authorize('admin'), [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('role').optional().isIn(['admin', 'organizer', 'viewer']).withMessage('Invalid role'),
  query('organization').optional().isString().withMessage('Organization must be a string'),
  query('search').optional().isString().withMessage('Search must be a string'),
  query('isActive').optional().isBoolean().withMessage('isActive must be a boolean')
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

  if (req.query.role) {
    filter.role = req.query.role;
  }

  if (req.query.organization) {
    filter.organization = new RegExp(req.query.organization, 'i');
  }

  if (req.query.isActive !== undefined) {
    filter.isActive = req.query.isActive === 'true';
  }

  if (req.query.search) {
    filter.$or = [
      { firstName: new RegExp(req.query.search, 'i') },
      { lastName: new RegExp(req.query.search, 'i') },
      { email: new RegExp(req.query.search, 'i') },
      { organization: new RegExp(req.query.search, 'i') }
    ];
  }

  const users = await User.find(filter)
    .select('-password')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await User.countDocuments(filter);

  res.json({
    success: true,
    data: {
      users,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalUsers: total,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1
      }
    }
  });
}));

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private (Admin or same user)
router.get('/:id', protect, asyncHandler(async (req, res) => {
  // Check if user can view this profile
  if (req.user.role !== 'admin' && req.params.id !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. You can only view your own profile.'
    });
  }

  const user = await User.findById(req.params.id).select('-password');

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  res.json({
    success: true,
    data: { user }
  });
}));

// @desc    Create new user (Admin only)
// @route   POST /api/users
// @access  Private (Admin only)
router.post('/', protect, authorize('admin'), [
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
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('role')
    .isIn(['admin', 'organizer', 'viewer'])
    .withMessage('Invalid role'),
  body('organization')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Organization name cannot exceed 100 characters')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { firstName, lastName, email, password, phone, organization, role } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: 'User already exists with this email'
    });
  }

  // Create user
  const user = await User.create({
    firstName,
    lastName,
    email,
    password,
    phone,
    organization,
    role,
    emailVerified: true // Admin-created users are pre-verified
  });

  res.status(201).json({
    success: true,
    message: 'User created successfully',
    data: {
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        organization: user.organization,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt
      }
    }
  });
}));

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private (Admin or same user)
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
  body('organization')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Organization name cannot exceed 100 characters'),
  body('role')
    .optional()
    .isIn(['admin', 'organizer', 'viewer'])
    .withMessage('Invalid role')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  // Check if user can update this profile
  if (req.user.role !== 'admin' && req.params.id !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. You can only update your own profile.'
    });
  }

  const user = await User.findById(req.params.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Non-admin users cannot change role or isActive
  const allowedUpdates = ['firstName', 'lastName', 'phone', 'organization', 'timezone', 'language', 'avatar'];
  
  if (req.user.role === 'admin') {
    allowedUpdates.push('role', 'isActive', 'emailVerified');
  }

  const updates = {};
  Object.keys(req.body).forEach(key => {
    if (allowedUpdates.includes(key)) {
      updates[key] = req.body[key];
    }
  });

  const updatedUser = await User.findByIdAndUpdate(
    req.params.id,
    updates,
    { new: true, runValidators: true }
  ).select('-password');

  res.json({
    success: true,
    message: 'User updated successfully',
    data: { user: updatedUser }
  });
}));

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private (Admin only)
router.delete('/:id', protect, authorize('admin'), asyncHandler(async (req, res) => {
  // Prevent admin from deleting themselves
  if (req.params.id === req.user._id.toString()) {
    return res.status(400).json({
      success: false,
      message: 'You cannot delete your own account'
    });
  }

  const user = await User.findById(req.params.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  await User.findByIdAndDelete(req.params.id);

  res.json({
    success: true,
    message: 'User deleted successfully'
  });
}));

// @desc    Deactivate user
// @route   PUT /api/users/:id/deactivate
// @access  Private (Admin only)
router.put('/:id/deactivate', protect, authorize('admin'), asyncHandler(async (req, res) => {
  // Prevent admin from deactivating themselves
  if (req.params.id === req.user._id.toString()) {
    return res.status(400).json({
      success: false,
      message: 'You cannot deactivate your own account'
    });
  }

  const user = await User.findById(req.params.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  user.isActive = false;
  await user.save();

  res.json({
    success: true,
    message: 'User deactivated successfully',
    data: { user }
  });
}));

// @desc    Activate user
// @route   PUT /api/users/:id/activate
// @access  Private (Admin only)
router.put('/:id/activate', protect, authorize('admin'), asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  user.isActive = true;
  await user.save();

  res.json({
    success: true,
    message: 'User activated successfully',
    data: { user }
  });
}));

// @desc    Get user statistics
// @route   GET /api/users/stats
// @access  Private (Admin only)
router.get('/stats', protect, authorize('admin'), asyncHandler(async (req, res) => {
  const stats = await User.aggregate([
    {
      $group: {
        _id: null,
        totalUsers: { $sum: 1 },
        activeUsers: { $sum: { $cond: ['$isActive', 1, 0] } },
        inactiveUsers: { $sum: { $cond: ['$isActive', 0, 1] } },
        verifiedUsers: { $sum: { $cond: ['$emailVerified', 1, 0] } },
        unverifiedUsers: { $sum: { $cond: ['$emailVerified', 0, 1] } }
      }
    }
  ]);

  const roleStats = await User.aggregate([
    {
      $group: {
        _id: '$role',
        count: { $sum: 1 }
      }
    }
  ]);

  const organizationStats = await User.aggregate([
    {
      $match: { organization: { $exists: true, $ne: null } }
    },
    {
      $group: {
        _id: '$organization',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } },
    { $limit: 10 }
  ]);

  const recentUsers = await User.find()
    .select('firstName lastName email organization role createdAt')
    .sort({ createdAt: -1 })
    .limit(5);

  res.json({
    success: true,
    data: {
      overview: stats[0] || {
        totalUsers: 0,
        activeUsers: 0,
        inactiveUsers: 0,
        verifiedUsers: 0,
        unverifiedUsers: 0
      },
      roleBreakdown: roleStats,
      topOrganizations: organizationStats,
      recentUsers
    }
  });
}));

// @desc    Get user activity
// @route   GET /api/users/:id/activity
// @access  Private (Admin or same user)
router.get('/:id/activity', protect, asyncHandler(async (req, res) => {
  // Check if user can view this activity
  if (req.user.role !== 'admin' && req.params.id !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. You can only view your own activity.'
    });
  }

  const user = await User.findById(req.params.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Get user's events
  const Event = require('../models/Event');
  const events = await Event.find({ organizer: req.params.id })
    .select('title category startDate status currentParticipants maxParticipants analytics')
    .sort({ createdAt: -1 })
    .limit(10);

  // Get user's participants
  const Participant = require('../models/Participant');
  const participantStats = await Participant.aggregate([
    { $match: { organizer: user._id } },
    {
      $group: {
        _id: null,
        totalParticipants: { $sum: 1 },
        checkedIn: { $sum: { $cond: ['$checkIn.isCheckedIn', 1, 0] } },
        averageEngagement: { $avg: '$analytics.engagementScore' }
      }
    }
  ]);

  res.json({
    success: true,
    data: {
      user: {
        id: user._id,
        name: user.fullName,
        email: user.email,
        organization: user.organization,
        role: user.role,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt
      },
      events,
      participantStats: participantStats[0] || {
        totalParticipants: 0,
        checkedIn: 0,
        averageEngagement: 0
      }
    }
  });
}));

module.exports = router;
