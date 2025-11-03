const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('../models/User');
const Event = require('../models/Event');
const Participant = require('../models/Participant');

// Sample data
const sampleUsers = [
  {
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@eventease.com',
    password: 'admin123',
    organization: 'EventEase Inc.',
    role: 'admin',
    isActive: true,
    emailVerified: true
  },
  {
    firstName: 'John',
    lastName: 'Organizer',
    email: 'organizer@eventease.com',
    password: 'organizer123',
    organization: 'Tech Events Corp',
    role: 'organizer',
    isActive: true,
    emailVerified: true
  },
  {
    firstName: 'Sarah',
    lastName: 'Manager',
    email: 'sarah@techcorp.com',
    password: 'sarah123',
    organization: 'TechCorp Solutions',
    role: 'organizer',
    isActive: true,
    emailVerified: true
  }
];

const sampleEvents = [
  {
    title: 'Tech Innovation Summit 2024',
    description: 'Join us for the biggest tech event of the year featuring industry leaders, innovative solutions, and cutting-edge technologies. Network with professionals, attend workshops, and discover the future of technology.',
    startDate: new Date('2024-03-15T09:00:00Z'),
    endDate: new Date('2024-03-15T18:00:00Z'),
    location: {
      name: 'Convention Center',
      address: '123 Tech Street, Downtown',
      city: 'San Francisco',
      state: 'CA',
      country: 'USA'
    },
    category: 'Tech Summit',
    tags: ['technology', 'innovation', 'networking', 'AI'],
    maxParticipants: 500,
    currentParticipants: 450,
    status: 'published',
    contactEmail: 'contact@techsummit.com',
    contactPhone: '+1 (555) 123-4567',
    pricing: {
      isFree: false,
      price: 299,
      currency: 'USD'
    },
    registration: {
      isOpen: true,
      requiresApproval: false
    },
    settings: {
      allowWaitlist: true,
      sendReminders: true,
      collectFeedback: true,
      enableQrCheckin: true
    }
  },
  {
    title: 'Community Health Fair',
    description: 'Free health screenings, wellness workshops, and fitness demonstrations for the whole community. Learn about preventive care, nutrition, and healthy living.',
    startDate: new Date('2024-03-22T10:00:00Z'),
    endDate: new Date('2024-03-22T16:00:00Z'),
    location: {
      name: 'City Park',
      address: '456 Community Ave, Central District',
      city: 'Austin',
      state: 'TX',
      country: 'USA'
    },
    category: 'Community Event',
    tags: ['health', 'wellness', 'community', 'free'],
    maxParticipants: 300,
    currentParticipants: 200,
    status: 'published',
    contactEmail: 'health@community.org',
    contactPhone: '+1 (555) 234-5678',
    pricing: {
      isFree: true
    },
    registration: {
      isOpen: true,
      requiresApproval: false
    },
    settings: {
      allowWaitlist: true,
      sendReminders: true,
      collectFeedback: true,
      enableQrCheckin: true
    }
  },
  {
    title: 'Academic Conference on AI',
    description: 'Research presentations and discussions on the latest developments in artificial intelligence. Join leading researchers and academics in exploring the future of AI.',
    startDate: new Date('2024-03-28T14:00:00Z'),
    endDate: new Date('2024-03-28T20:00:00Z'),
    location: {
      name: 'University Hall',
      address: '789 Science Building, Campus',
      city: 'Boston',
      state: 'MA',
      country: 'USA'
    },
    category: 'Academic Conference',
    tags: ['AI', 'research', 'academic', 'machine learning'],
    maxParticipants: 400,
    currentParticipants: 300,
    status: 'published',
    contactEmail: 'ai@university.edu',
    contactPhone: '+1 (555) 345-6789',
    pricing: {
      isFree: false,
      price: 150,
      currency: 'USD'
    },
    registration: {
      isOpen: true,
      requiresApproval: true
    },
    settings: {
      allowWaitlist: true,
      sendReminders: true,
      collectFeedback: true,
      enableQrCheckin: true
    }
  }
];

const sampleParticipants = [
  {
    firstName: 'John',
    lastName: 'Smith',
    email: 'john.smith@email.com',
    phone: '+1 (555) 123-4567',
    status: 'confirmed',
    registrationSource: 'website',
    checkIn: {
      isCheckedIn: true,
      checkInTime: new Date('2024-03-15T08:45:00Z'),
      checkInMethod: 'qr-code'
    },
    feedback: {
      rating: 5,
      comments: 'Excellent event! Great speakers and networking opportunities.',
      wouldRecommend: true,
      topicsOfInterest: ['AI', 'Machine Learning', 'Networking']
    },
    analytics: {
      emailOpens: 3,
      emailClicks: 2,
      engagementScore: 95,
      lastActivity: new Date('2024-03-15T18:30:00Z')
    }
  },
  {
    firstName: 'Sarah',
    lastName: 'Johnson',
    email: 'sarah.johnson@email.com',
    phone: '+1 (555) 234-5678',
    status: 'confirmed',
    registrationSource: 'social-media',
    checkIn: {
      isCheckedIn: true,
      checkInTime: new Date('2024-03-15T09:15:00Z'),
      checkInMethod: 'mobile-app'
    },
    feedback: {
      rating: 4,
      comments: 'Very informative sessions. Would have liked more hands-on workshops.',
      wouldRecommend: true,
      topicsOfInterest: ['Web Development', 'UI/UX']
    },
    analytics: {
      emailOpens: 2,
      emailClicks: 1,
      engagementScore: 80,
      lastActivity: new Date('2024-03-15T17:45:00Z')
    }
  },
  {
    firstName: 'Michael',
    lastName: 'Brown',
    email: 'michael.brown@email.com',
    phone: '+1 (555) 345-6789',
    status: 'registered',
    registrationSource: 'email',
    checkIn: {
      isCheckedIn: false
    },
    analytics: {
      emailOpens: 1,
      emailClicks: 0,
      engagementScore: 60,
      lastActivity: new Date('2024-03-14T16:20:00Z')
    }
  }
];

// Connect to database
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/eventease');
    console.log('✅ MongoDB connected for seeding');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
};

// Clear existing data
const clearDatabase = async () => {
  try {
    await User.deleteMany({});
    await Event.deleteMany({});
    await Participant.deleteMany({});
    console.log('🗑️  Cleared existing data');
  } catch (error) {
    console.error('Error clearing database:', error);
  }
};

// Seed users
const seedUsers = async () => {
  try {
    const users = await User.insertMany(sampleUsers);
    console.log(`👥 Seeded ${users.length} users`);
    return users;
  } catch (error) {
    console.error('Error seeding users:', error);
    return [];
  }
};

// Seed events
const seedEvents = async (users) => {
  try {
    const organizer = users.find(user => user.role === 'organizer');
    if (!organizer) {
      console.error('No organizer found');
      return [];
    }

    const events = sampleEvents.map(eventData => ({
      ...eventData,
      organizer: organizer._id,
      organization: organizer.organization
    }));

    const createdEvents = await Event.insertMany(events);
    console.log(`📅 Seeded ${createdEvents.length} events`);
    return createdEvents;
  } catch (error) {
    console.error('Error seeding events:', error);
    return [];
  }
};

// Seed participants
const seedParticipants = async (events, users) => {
  try {
    const participants = [];
    
    for (let i = 0; i < sampleParticipants.length; i++) {
      const participantData = {
        ...sampleParticipants[i],
        event: events[i % events.length]._id,
        organizer: events[i % events.length].organizer,
        organization: events[i % events.length].organization
      };
      
      participants.push(participantData);
    }

    // Add more participants for variety
    for (let i = 0; i < 20; i++) {
      const eventIndex = i % events.length;
      const participantData = {
        firstName: `Participant${i + 1}`,
        lastName: `User${i + 1}`,
        email: `participant${i + 1}@example.com`,
        phone: `+1 (555) ${100 + i}-${1000 + i}`,
        event: events[eventIndex]._id,
        organizer: events[eventIndex].organizer,
        organization: events[eventIndex].organization,
        status: ['registered', 'confirmed', 'checked-in'][Math.floor(Math.random() * 3)],
        registrationSource: ['website', 'social-media', 'email', 'direct'][Math.floor(Math.random() * 4)],
        analytics: {
          emailOpens: Math.floor(Math.random() * 5),
          emailClicks: Math.floor(Math.random() * 3),
          engagementScore: Math.floor(Math.random() * 100),
          lastActivity: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
        }
      };

      // Random check-in status
      if (Math.random() > 0.3) {
        participantData.checkIn = {
          isCheckedIn: true,
          checkInTime: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
          checkInMethod: ['qr-code', 'manual', 'mobile-app'][Math.floor(Math.random() * 3)]
        };
      }

      // Random feedback
      if (Math.random() > 0.4) {
        participantData.feedback = {
          rating: Math.floor(Math.random() * 5) + 1,
          comments: `Great event! ${['Excellent speakers', 'Good networking', 'Informative sessions', 'Well organized'][Math.floor(Math.random() * 4)]}.`,
          wouldRecommend: Math.random() > 0.2
        };
      }

      participants.push(participantData);
    }

    const createdParticipants = await Participant.insertMany(participants);
    console.log(`👤 Seeded ${createdParticipants.length} participants`);

    // Update event participant counts
    for (const event of events) {
      const participantCount = await Participant.countDocuments({
        event: event._id,
        status: { $ne: 'cancelled' }
      });
      event.currentParticipants = participantCount;
      await event.save();
    }

    return createdParticipants;
  } catch (error) {
    console.error('Error seeding participants:', error);
    return [];
  }
};

// Main seeding function
const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...');
    
    await connectDB();
    await clearDatabase();
    
    const users = await seedUsers();
    const events = await seedEvents(users);
    const participants = await seedParticipants(events, users);
    
    console.log('\n✅ Database seeding completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - Users: ${users.length}`);
    console.log(`   - Events: ${events.length}`);
    console.log(`   - Participants: ${participants.length}`);
    
    console.log('\n🔑 Default Login Credentials:');
    console.log('   Admin: admin@eventease.com / admin123');
    console.log('   Organizer: organizer@eventease.com / organizer123');
    console.log('   Manager: sarah@techcorp.com / sarah123');
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
    process.exit(0);
  }
};

// Run seeding if called directly
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };
