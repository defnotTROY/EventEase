const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Event title is required'],
    trim: true,
    maxlength: [200, 'Event title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Event description is required'],
    trim: true,
    maxlength: [2000, 'Event description cannot exceed 2000 characters']
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true
  },
  startDate: {
    type: Date,
    required: [true, 'Event start date is required']
  },
  endDate: {
    type: Date,
    required: [true, 'Event end date is required']
  },
  timezone: {
    type: String,
    default: 'UTC'
  },
  location: {
    name: {
      type: String,
      required: [true, 'Event location is required'],
      trim: true
    },
    address: String,
    city: String,
    state: String,
    country: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  isVirtual: {
    type: Boolean,
    default: false
  },
  virtualLink: String,
  virtualPlatform: {
    type: String,
    enum: ['zoom', 'teams', 'meet', 'webex', 'custom', 'other'],
    default: 'custom'
  },
  category: {
    type: String,
    required: [true, 'Event category is required'],
    enum: [
      'Academic Conference',
      'Tech Summit',
      'Community Event',
      'Workshop',
      'Seminar',
      'Networking',
      'Cultural Event',
      'Sports Event',
      'Business Conference',
      'Educational Workshop',
      'Other'
    ]
  },
  tags: [String],
  maxParticipants: {
    type: Number,
    min: [1, 'Maximum participants must be at least 1']
  },
  currentParticipants: {
    type: Number,
    default: 0,
    min: [0, 'Current participants cannot be negative']
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'cancelled', 'completed'],
    default: 'draft'
  },
  visibility: {
    type: String,
    enum: ['public', 'private', 'organization'],
    default: 'public'
  },
  image: {
    url: String,
    publicId: String, // For Cloudinary
    alt: String
  },
  requirements: String,
  contactEmail: {
    type: String,
    required: [true, 'Contact email is required'],
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please enter a valid contact email'
    ]
  },
  contactPhone: String,
  
  // Pricing information
  pricing: {
    isFree: { type: Boolean, default: true },
    price: { type: Number, min: 0 },
    currency: { type: String, default: 'USD' },
    earlyBirdPrice: Number,
    earlyBirdEndDate: Date,
    groupDiscounts: [{
      minParticipants: Number,
      discountPercentage: Number
    }]
  },
  
  // Registration settings
  registration: {
    isOpen: { type: Boolean, default: true },
    startDate: Date,
    endDate: Date,
    requiresApproval: { type: Boolean, default: false },
    customFields: [{
      name: String,
      type: { type: String, enum: ['text', 'email', 'phone', 'select', 'textarea'] },
      required: Boolean,
      options: [String] // For select fields
    }]
  },
  
  // Organizer information
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  organization: String,
  
  // Analytics and engagement
  analytics: {
    views: { type: Number, default: 0 },
    registrations: { type: Number, default: 0 },
    checkIns: { type: Number, default: 0 },
    engagementScore: { type: Number, default: 0 },
    satisfactionScore: { type: Number, default: 0 },
    lastAnalyzed: Date
  },
  
  // AI-generated insights
  aiInsights: [{
    type: { type: String, enum: ['recommendation', 'prediction', 'optimization'] },
    title: String,
    description: String,
    confidence: Number,
    actionable: Boolean,
    createdAt: { type: Date, default: Date.now }
  }],
  
  // Event settings
  settings: {
    allowWaitlist: { type: Boolean, default: true },
    sendReminders: { type: Boolean, default: true },
    reminderDays: [Number], // Days before event to send reminders
    collectFeedback: { type: Boolean, default: true },
    generateCertificates: { type: Boolean, default: false },
    enableQrCheckin: { type: Boolean, default: true }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for event duration
eventSchema.virtual('duration').get(function() {
  if (this.startDate && this.endDate) {
    return Math.ceil((this.endDate - this.startDate) / (1000 * 60 * 60 * 24));
  }
  return 0;
});

// Virtual for registration progress
eventSchema.virtual('registrationProgress').get(function() {
  if (!this.maxParticipants) return 0;
  return Math.round((this.currentParticipants / this.maxParticipants) * 100);
});

// Virtual for event status based on dates
eventSchema.virtual('eventStatus').get(function() {
  const now = new Date();
  if (this.status === 'cancelled') return 'cancelled';
  if (this.status === 'completed') return 'completed';
  if (now < this.startDate) return 'upcoming';
  if (now >= this.startDate && now <= this.endDate) return 'ongoing';
  return 'completed';
});

// Indexes for better query performance
eventSchema.index({ title: 'text', description: 'text' });
eventSchema.index({ startDate: 1 });
eventSchema.index({ category: 1 });
eventSchema.index({ status: 1 });
eventSchema.index({ organizer: 1 });
eventSchema.index({ organization: 1 });
eventSchema.index({ tags: 1 });

// Generate slug before saving
eventSchema.pre('save', function(next) {
  if (this.isModified('title') && !this.slug) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');
  }
  next();
});

// Validate end date is after start date
eventSchema.pre('save', function(next) {
  if (this.endDate <= this.startDate) {
    next(new Error('End date must be after start date'));
  } else {
    next();
  }
});

// Update analytics when participants change
eventSchema.pre('save', function(next) {
  if (this.isModified('currentParticipants')) {
    this.analytics.registrations = this.currentParticipants;
    
    // Calculate engagement score based on registration progress
    if (this.maxParticipants) {
      const progress = this.currentParticipants / this.maxParticipants;
      this.analytics.engagementScore = Math.min(progress * 100, 100);
    }
  }
  next();
});

// Instance methods
eventSchema.methods.incrementViews = function() {
  this.analytics.views += 1;
  return this.save({ validateBeforeSave: false });
};

eventSchema.methods.addParticipant = function() {
  if (this.maxParticipants && this.currentParticipants >= this.maxParticipants) {
    throw new Error('Event is at maximum capacity');
  }
  this.currentParticipants += 1;
  return this.save();
};

eventSchema.methods.removeParticipant = function() {
  if (this.currentParticipants > 0) {
    this.currentParticipants -= 1;
    return this.save();
  }
  return this;
};

eventSchema.methods.updateAnalytics = function(data) {
  this.analytics = { ...this.analytics, ...data };
  this.analytics.lastAnalyzed = new Date();
  return this.save({ validateBeforeSave: false });
};

// Static methods
eventSchema.statics.findByDateRange = function(startDate, endDate) {
  return this.find({
    startDate: { $gte: startDate },
    endDate: { $lte: endDate },
    status: { $ne: 'cancelled' }
  });
};

eventSchema.statics.findUpcoming = function(limit = 10) {
  return this.find({
    startDate: { $gte: new Date() },
    status: 'published'
  })
  .sort({ startDate: 1 })
  .limit(limit);
};

eventSchema.statics.findByCategory = function(category) {
  return this.find({ category, status: 'published' });
};

eventSchema.statics.searchEvents = function(query) {
  return this.find({
    $text: { $search: query },
    status: 'published'
  }, {
    score: { $meta: 'textScore' }
  }).sort({ score: { $meta: 'textScore' } });
};

module.exports = mongoose.model('Event', eventSchema);
