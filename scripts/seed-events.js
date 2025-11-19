/**
 * Seed Multiple Events Script
 * 
 * Creates diverse events using the admin account for testing recommendations
 * 
 * Usage:
 *   node scripts/seed-events.js
 * 
 * Environment variables required:
 *   SUPABASE_URL - Your Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY - Your Supabase service role key
 *   ADMIN_EMAIL - Email for the admin account
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@eventease.com';

// Diverse event templates - covering different categories, tags, and preferences
const EVENT_TEMPLATES = [
  // Tech Events
  {
    title: 'AI & Machine Learning Summit 2024',
    description: 'Join industry leaders for a comprehensive exploration of artificial intelligence and machine learning. Features keynote speakers, hands-on workshops, and networking sessions with top tech companies.',
    category: 'Tech Summit',
    tags: ['AI', 'Machine Learning', 'Technology', 'Innovation', 'Data Science'],
    location: 'San Francisco Convention Center',
    maxParticipants: 500,
    dateOffset: 30, // 30 days from now
    time: '09:00'
  },
  {
    title: 'Web Development Bootcamp',
    description: 'Intensive 3-day bootcamp covering modern web development technologies including React, Node.js, and cloud deployment. Perfect for developers looking to level up their skills.',
    category: 'Workshop',
    tags: ['Web Development', 'React', 'JavaScript', 'Coding', 'Programming'],
    location: 'Tech Hub Downtown',
    maxParticipants: 50,
    dateOffset: 45,
    time: '10:00'
  },
  {
    title: 'Cybersecurity Conference',
    description: 'Learn about the latest threats, security best practices, and emerging technologies in cybersecurity. Network with security professionals and learn from expert speakers.',
    category: 'Tech Summit',
    tags: ['Cybersecurity', 'Security', 'Technology', 'Networking', 'Professional'],
    location: 'Seattle Tech Center',
    maxParticipants: 300,
    dateOffset: 60,
    time: '08:00'
  },
  
  // Academic Events
  {
    title: 'International Research Conference on Data Science',
    description: 'Academic conference featuring peer-reviewed research papers, poster sessions, and panel discussions on cutting-edge data science research. Open to researchers, students, and industry professionals.',
    category: 'Academic Conference',
    tags: ['Research', 'Data Science', 'Academic', 'Papers', 'Education'],
    location: 'University Conference Hall',
    maxParticipants: 200,
    dateOffset: 40,
    time: '09:30'
  },
  {
    title: 'Graduate Student Workshop Series',
    description: 'Monthly workshop series for graduate students covering research methodologies, academic writing, and career development in academia.',
    category: 'Workshop',
    tags: ['Academic', 'Graduate Students', 'Research', 'Education', 'Career'],
    location: 'Campus Student Center',
    maxParticipants: 30,
    dateOffset: 20,
    time: '14:00'
  },
  
  // Networking Events
  {
    title: 'Tech Professionals Networking Mixer',
    description: 'Casual networking event for tech professionals. Meet peers, share experiences, and build connections in a relaxed atmosphere with drinks and appetizers.',
    category: 'Networking',
    tags: ['Networking', 'Professional', 'Tech', 'Social', 'Career'],
    location: 'Rooftop Bar & Lounge',
    maxParticipants: 100,
    dateOffset: 15,
    time: '18:00'
  },
  {
    title: 'Startup Founders Meetup',
    description: 'Monthly meetup for startup founders and entrepreneurs. Share challenges, successes, and learn from fellow founders. Great for networking and mentorship.',
    category: 'Networking',
    tags: ['Startup', 'Entrepreneurship', 'Networking', 'Business', 'Innovation'],
    location: 'Co-working Space',
    maxParticipants: 50,
    dateOffset: 25,
    time: '19:00'
  },
  
  // Community Events
  {
    title: 'Community Hackathon for Social Good',
    description: '24-hour hackathon focused on building solutions for local community challenges. Teams will work on projects addressing social issues with prizes and mentorship.',
    category: 'Community Event',
    tags: ['Hackathon', 'Community', 'Social Good', 'Coding', 'Volunteer'],
    location: 'Community Center',
    maxParticipants: 150,
    dateOffset: 35,
    time: '09:00'
  },
  {
    title: 'Local Tech Meetup: Open Source Contributions',
    description: 'Monthly meetup focused on open source contributions. Learn how to contribute to open source projects, network with maintainers, and collaborate on projects.',
    category: 'Community Event',
    tags: ['Open Source', 'Community', 'Coding', 'GitHub', 'Collaboration'],
    location: 'Tech Community Space',
    maxParticipants: 80,
    dateOffset: 28,
    time: '18:30'
  },
  
  // Cultural Events
  {
    title: 'Tech Art & Innovation Exhibition',
    description: 'Interactive exhibition showcasing the intersection of technology and art. Features digital installations, VR experiences, and interactive art pieces from local artists.',
    category: 'Cultural Event',
    tags: ['Art', 'Technology', 'Innovation', 'Culture', 'Exhibition'],
    location: 'Art Gallery Downtown',
    maxParticipants: 200,
    dateOffset: 50,
    time: '16:00'
  },
  
  // Sports Events
  {
    title: 'Tech Company Sports Day',
    description: 'Annual sports day bringing together tech companies for friendly competition. Includes soccer, basketball, volleyball, and team building activities.',
    category: 'Sports Event',
    tags: ['Sports', 'Team Building', 'Networking', 'Fitness', 'Community'],
    location: 'Sports Complex',
    maxParticipants: 300,
    dateOffset: 55,
    time: '10:00'
  },
  
  // Seminars
  {
    title: 'Leadership in Tech Seminar',
    description: 'One-day seminar on leadership skills for tech professionals. Learn effective team management, communication strategies, and how to build inclusive tech teams.',
    category: 'Seminar',
    tags: ['Leadership', 'Management', 'Professional Development', 'Career', 'Skills'],
    location: 'Business Center',
    maxParticipants: 75,
    dateOffset: 42,
    time: '13:00'
  },
  {
    title: 'Blockchain Technology Workshop',
    description: 'Hands-on workshop exploring blockchain fundamentals, smart contracts, and decentralized applications. No prior experience required.',
    category: 'Workshop',
    tags: ['Blockchain', 'Cryptocurrency', 'Web3', 'Technology', 'Coding'],
    location: 'Innovation Lab',
    maxParticipants: 40,
    dateOffset: 38,
    time: '10:00'
  },
  
  // More diverse events
  {
    title: 'Product Management Bootcamp',
    description: 'Comprehensive bootcamp covering product strategy, user research, agile methodologies, and product analytics. Perfect for aspiring and current product managers.',
    category: 'Workshop',
    tags: ['Product Management', 'Business', 'Strategy', 'Career', 'Skills'],
    location: 'Business School',
    maxParticipants: 60,
    dateOffset: 33,
    time: '09:00'
  },
  {
    title: 'Women in Tech Networking Event',
    description: 'Exclusive networking event for women in technology. Meet role models, share experiences, and build a supportive community. All genders welcome as allies.',
    category: 'Networking',
    tags: ['Women in Tech', 'Diversity', 'Networking', 'Community', 'Career'],
    location: 'Modern Event Space',
    maxParticipants: 120,
    dateOffset: 22,
    time: '17:30'
  },
  {
    title: 'Mobile App Development Conference',
    description: 'Conference focused on mobile app development trends, best practices, and emerging technologies. Includes iOS, Android, and cross-platform development sessions.',
    category: 'Tech Summit',
    tags: ['Mobile Development', 'iOS', 'Android', 'Apps', 'Technology'],
    location: 'Conference Center',
    maxParticipants: 400,
    dateOffset: 48,
    time: '09:00'
  },
  {
    title: 'Data Visualization Workshop',
    description: 'Learn to create compelling data visualizations using modern tools. Hands-on workshop covering design principles, tool selection, and storytelling with data.',
    category: 'Workshop',
    tags: ['Data Visualization', 'Analytics', 'Design', 'Data Science', 'Skills'],
    location: 'Design Studio',
    maxParticipants: 35,
    dateOffset: 27,
    time: '14:00'
  }
];

async function seedEvents() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Error: Missing required environment variables');
    console.error('Required:');
    console.error('  - SUPABASE_URL');
    console.error('  - SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  console.log('🌱 Seeding events...\n');

  try {
    // Create Supabase admin client
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Find admin user
    console.log(`🔍 Looking for admin account: ${ADMIN_EMAIL}`);
    const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Error listing users:', listError.message);
      process.exit(1);
    }

    const adminUser = usersData?.users?.find(u => u.email === ADMIN_EMAIL);
    
    if (!adminUser) {
      console.error(`❌ Admin user not found: ${ADMIN_EMAIL}`);
      console.error('   Please create an admin account first using: node scripts/create-admin.js');
      process.exit(1);
    }

    console.log(`✅ Found admin user: ${adminUser.email} (ID: ${adminUser.id})\n`);

    // Calculate dates
    const today = new Date();
    const eventsToCreate = [];

    for (const template of EVENT_TEMPLATES) {
      const eventDate = new Date(today);
      eventDate.setDate(today.getDate() + template.dateOffset);
      
      const eventData = {
        user_id: adminUser.id,
        title: template.title,
        description: template.description,
        date: eventDate.toISOString().split('T')[0], // YYYY-MM-DD format
        time: template.time,
        location: template.location,
        category: template.category,
        tags: template.tags,
        max_participants: template.maxParticipants,
        status: 'upcoming',
        is_virtual: false,
        contact_email: 'admin@eventease.com',
        contact_phone: '+1-555-0100',
        requirements: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      eventsToCreate.push(eventData);
    }

    console.log(`📝 Creating ${eventsToCreate.length} events...\n`);

    // Create events in batches to avoid overwhelming the database
    const batchSize = 5;
    let created = 0;
    let failed = 0;

    for (let i = 0; i < eventsToCreate.length; i += batchSize) {
      const batch = eventsToCreate.slice(i, i + batchSize);
      
      for (const eventData of batch) {
        try {
          const { data, error } = await supabaseAdmin
            .from('events')
            .insert([eventData])
            .select()
            .single();

          if (error) {
            // Check if event already exists
            if (error.message.includes('duplicate') || error.code === '23505') {
              console.log(`⚠️  Event already exists: ${eventData.title}`);
              continue;
            }
            throw error;
          }

          created++;
          console.log(`✅ Created: ${eventData.title} (${eventData.category})`);
        } catch (error) {
          failed++;
          console.error(`❌ Failed to create: ${eventData.title}`);
          console.error(`   Error: ${error.message}`);
        }
      }

      // Small delay between batches
      if (i + batchSize < eventsToCreate.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   ✅ Created: ${created} events`);
    console.log(`   ❌ Failed: ${failed} events`);
    console.log(`   📝 Total: ${eventsToCreate.length} events\n`);

    if (created > 0) {
      console.log('🎉 Events seeded successfully!');
      console.log('\n📋 These events are now visible to all users and will generate personalized recommendations');
      console.log('   based on each user\'s preferences and activity history.\n');
    }

  } catch (error) {
    console.error('❌ Error seeding events:', error.message);
    process.exit(1);
  }
}

// Run the script
seedEvents();

