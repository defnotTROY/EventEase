const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please enter a valid email'
    ]
  },
  phone: {
    type: String,
    trim: true,
    match: [/^\+?[\d\s-()]+$/, 'Please enter a valid phone number']
  },
  avatar: {
    type: String, // URL to avatar image
    default: null
  },
  
  // Event information
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  
  // Registration information
  registrationDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['registered', 'confirmed', 'checked-in', 'cancelled', 'no-show'],
    default: 'registered'
  },
  registrationSource: {
    type: String,
    enum: ['website', 'social-media', 'email', 'referral', 'direct', 'other'],
    default: 'website'
  },
  referralCode: String,
  
  // Check-in information
  checkIn: {
    isCheckedIn: { type: Boolean, default: false },
    checkInTime: Date,
    checkInMethod: {
      type: String,
      enum: ['qr-code', 'manual', 'mobile-app']
    },
    checkedInBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  
  // Custom fields (from event registration form)
  customFields: [{
    name: String,
    value: mongoose.Schema.Types.Mixed,
    type: String
  }],
  
  // Payment information
  payment: {
    isPaid: { type: Boolean, default: false },
    amount: Number,
    currency: { type: String, default: 'USD' },
    paymentMethod: String,
    transactionId: String,
    paymentDate: Date,
    refunded: { type: Boolean, default: false },
    refundAmount: Number,
    refundDate: Date
  },
  
  // Communication preferences
  communication: {
    emailUpdates: { type: Boolean, default: true },
    smsUpdates: { type: Boolean, default: false },
    pushNotifications: { type: Boolean, default: true }
  },
  
  // Dietary requirements and accessibility
  requirements: {
    dietaryRestrictions: [String],
    accessibilityNeeds: String,
    allergies: [String],
    emergencyContact: {
      name: String,
      phone: String,
      relationship: String
    }
  },
  
  // Feedback and engagement
  feedback: {
    rating: { type: Number, min: 1, max: 5 },
    comments: String,
    wouldRecommend: Boolean,
    topicsOfInterest: [String],
    submittedAt: Date
  },
  
  // Analytics
  analytics: {
    emailOpens: { type: Number, default: 0 },
    emailClicks: { type: Number, default: 0 },
    lastEmailSent: Date,
    engagementScore: { type: Number, default: 0 },
    lastActivity: { type: Date, default: Date.now }
  },
  
  // Waitlist information
  waitlist: {
    isOnWaitlist: { type: Boolean, default: false },
    waitlistPosition: Number,
    waitlistDate: Date,
    promotedDate: Date
  },
  
  // Tags for organization
  tags: [String],
  notes: String,
  
  // Organizer information
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  organization: String
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for full name
participantSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for registration age (days since registration)
participantSchema.virtual('registrationAge').get(function() {
  return Math.floor((new Date() - this.registrationDate) / (1000 * 60 * 60 * 24));
});

// Compound indexes for better query performance
participantSchema.index({ event: 1, email: 1 }, { unique: true }); // Prevent duplicate registrations
participantSchema.index({ event: 1, status: 1 });
participantSchema.index({ organizer: 1 });
participantSchema.index({ registrationDate: -1 });
participantSchema.index({ 'checkIn.isCheckedIn': 1 });
participantSchema.index({ tags: 1 });

// Text search index
participantSchema.index({ 
  firstName: 'text', 
  lastName: 'text', 
  email: 'text' 
});

// Pre-save middleware
participantSchema.pre('save', function(next) {
  // Update last activity
  this.analytics.lastActivity = new Date();
  
  // Calculate engagement score
  let score = 0;
  if (this.checkIn.isCheckedIn) score += 50;
  if (this.feedback.rating) score += 20;
  if (this.feedback.comments) score += 10;
  if (this.analytics.emailOpens > 0) score += 10;
  if (this.analytics.emailClicks > 0) score += 10;
  
  this.analytics.engagementScore = Math.min(score, 100);
  
  next();
});

// Instance methods
participantSchema.methods.performCheckIn = function(method = 'manual', checkedInBy = null) {
  this.checkIn.isCheckedIn = true;
  this.checkIn.checkInTime = new Date();
  this.checkIn.checkInMethod = method;
  this.checkIn.checkedInBy = checkedInBy;
  this.status = 'checked-in';
  return this.save();
};

participantSchema.methods.cancelRegistration = function() {
  this.status = 'cancelled';
  return this.save();
};

participantSchema.methods.addToWaitlist = function(position) {
  this.waitlist.isOnWaitlist = true;
  this.waitlist.waitlistPosition = position;
  this.waitlist.waitlistDate = new Date();
  this.status = 'registered';
  return this.save();
};

participantSchema.methods.promoteFromWaitlist = function() {
  this.waitlist.isOnWaitlist = false;
  this.waitlist.promotedDate = new Date();
  this.status = 'confirmed';
  return this.save();
};

participantSchema.methods.updateFeedback = function(feedbackData) {
  this.feedback = { ...this.feedback, ...feedbackData };
  this.feedback.submittedAt = new Date();
  return this.save();
};

participantSchema.methods.incrementEmailOpen = function() {
  this.analytics.emailOpens += 1;
  return this.save({ validateBeforeSave: false });
};

participantSchema.methods.incrementEmailClick = function() {
  this.analytics.emailClicks += 1;
  return this.save({ validateBeforeSave: false });
};

// Static methods
participantSchema.statics.findByEvent = function(eventId) {
  return this.find({ event: eventId }).populate('event', 'title startDate');
};

participantSchema.statics.findByOrganizer = function(organizerId) {
  return this.find({ organizer: organizerId }).populate('event', 'title startDate category');
};

participantSchema.statics.findCheckedIn = function(eventId) {
  return this.find({ 
    event: eventId, 
    'checkIn.isCheckedIn': true 
  });
};

participantSchema.statics.findOnWaitlist = function(eventId) {
  return this.find({ 
    event: eventId, 
    'waitlist.isOnWaitlist': true 
  }).sort({ 'waitlist.waitlistPosition': 1 });
};

participantSchema.statics.searchParticipants = function(query, eventId = null) {
  const searchQuery = {
    $text: { $search: query }
  };
  
  if (eventId) {
    searchQuery.event = eventId;
  }
  
  return this.find(searchQuery, {
    score: { $meta: 'textScore' }
  }).sort({ score: { $meta: 'textScore' } });
};

participantSchema.statics.getEventStats = function(eventId) {
  return this.aggregate([
    { $match: { event: mongoose.Types.ObjectId(eventId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        checkedIn: {
          $sum: { $cond: ['$checkIn.isCheckedIn', 1, 0] }
        }
      }
    }
  ]);
};

// Validation for unique email per event
participantSchema.pre('save', async function(next) {
  if (this.isNew) {
    const existingParticipant = await this.constructor.findOne({
      event: this.event,
      email: this.email
    });
    
    if (existingParticipant) {
      const error = new Error('Participant already registered for this event');
      error.code = 11000;
      return next(error);
    }
  }
  next();
});

module.exports = mongoose.model('Participant', participantSchema);
