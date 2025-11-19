/**
 * Create Admin Account Script
 * 
 * This script creates an admin account in Supabase.
 * Run this once to set up your initial admin account.
 * 
 * Usage:
 *   node scripts/create-admin.js
 * 
 * Environment variables required:
 *   SUPABASE_URL - Your Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY - Your Supabase service role key (from Supabase Dashboard > Settings > API)
 *   ADMIN_EMAIL - Email for the admin account
 *   ADMIN_PASSWORD - Password for the admin account
 *   ADMIN_FIRST_NAME - First name for the admin
 *   ADMIN_LAST_NAME - Last name for the admin
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Admin account details - CHANGE THESE or set as environment variables
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@eventease.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@EventEase2024!';
const ADMIN_FIRST_NAME = process.env.ADMIN_FIRST_NAME || 'Admin';
const ADMIN_LAST_NAME = process.env.ADMIN_LAST_NAME || 'User';

async function createAdminAccount() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Error: Missing required environment variables');
    console.error('Required:');
    console.error('  - SUPABASE_URL');
    console.error('  - SUPABASE_SERVICE_ROLE_KEY');
    console.error('\nGet your service role key from: Supabase Dashboard > Settings > API > service_role key');
    process.exit(1);
  }

  console.log('🔧 Creating admin account...');
  console.log(`📧 Email: ${ADMIN_EMAIL}`);
  console.log(`👤 Name: ${ADMIN_FIRST_NAME} ${ADMIN_LAST_NAME}`);
  console.log('');

  try {
    // Create Supabase admin client (uses service role key for admin operations)
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Create the admin user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        first_name: ADMIN_FIRST_NAME,
        last_name: ADMIN_LAST_NAME,
        role: 'Administrator',
        organization: 'EventEase Platform',
        phone: '',
        timezone: 'UTC-8',
        language: 'English'
      }
    });

    if (authError) {
      // Check if user already exists (various error messages)
      const userExistsMessages = [
        'already registered',
        'already been registered',
        'User already registered',
        'A user with this email address has already been registered'
      ];
      
      const userExists = userExistsMessages.some(msg => 
        authError.message.toLowerCase().includes(msg.toLowerCase())
      );

      if (userExists) {
        console.log('⚠️  Admin account already exists with this email.');
        console.log('   Updating user metadata to ensure admin role...');
        console.log('');
        
        // Get the existing user by email
        const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        
        if (listError) {
          console.error('❌ Error listing users:', listError.message);
          process.exit(1);
        }

        const user = usersData?.users?.find(u => u.email === ADMIN_EMAIL);
        
        if (!user) {
          console.error('❌ User not found in database. Please check the email address.');
          process.exit(1);
        }

        // Check current role
        const currentRole = user.user_metadata?.role;
        if (currentRole === 'Administrator') {
          console.log('✅ User already has Administrator role!');
          console.log('');
          console.log('📋 Admin Credentials:');
          console.log(`   Email: ${ADMIN_EMAIL}`);
          console.log(`   User ID: ${user.id}`);
          console.log('');
          console.log('🔐 You can login with the existing password.');
          console.log('   If you forgot the password, reset it via Supabase Dashboard.');
          console.log('');
          process.exit(0);
        }

        // Update user metadata to ensure admin role
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          user.id,
          {
            user_metadata: {
              ...user.user_metadata,
              first_name: ADMIN_FIRST_NAME,
              last_name: ADMIN_LAST_NAME,
              role: 'Administrator',
              organization: 'EventEase Platform',
              phone: user.user_metadata?.phone || '',
              timezone: user.user_metadata?.timezone || 'UTC-8',
              language: user.user_metadata?.language || 'English'
            }
          }
        );

        if (updateError) {
          console.error('❌ Error updating user:', updateError.message);
          process.exit(1);
        }

        console.log('✅ Admin account updated successfully!');
        console.log('');
        console.log('📋 Admin Credentials:');
        console.log(`   Email: ${ADMIN_EMAIL}`);
        console.log(`   User ID: ${user.id}`);
        console.log('');
        console.log('🔐 You can login with the existing password.');
        console.log('   If you forgot the password, reset it via Supabase Dashboard.');
        console.log('');
        process.exit(0);
      } else {
        throw authError;
      }
    }

    if (!authData || !authData.user) {
      throw new Error('Failed to create admin user');
    }

    console.log('✅ Admin account created successfully!');
    console.log('');
    console.log('📋 Admin Credentials:');
    console.log(`   Email: ${ADMIN_EMAIL}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
    console.log('');
    console.log('🔐 Please save these credentials securely!');
    console.log('');
    console.log('🚀 You can now login at: http://localhost:3000/login');
    console.log('');

  } catch (error) {
    console.error('❌ Error creating admin account:', error.message);
    process.exit(1);
  }
}

// Run the script
createAdminAccount();
