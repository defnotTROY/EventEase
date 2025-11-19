/**
 * Reset Admin Password Script
 * 
 * This script resets the password for an existing admin account.
 * 
 * Usage:
 *   node scripts/reset-admin-password.js
 * 
 * Environment variables required:
 *   SUPABASE_URL - Your Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY - Your Supabase service role key
 *   ADMIN_EMAIL - Email for the admin account
 *   ADMIN_NEW_PASSWORD - New password to set
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@eventease.com';
const ADMIN_NEW_PASSWORD = process.env.ADMIN_NEW_PASSWORD || 'Admin@EventEase2024!';

async function resetAdminPassword() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Error: Missing required environment variables');
    console.error('Required:');
    console.error('  - SUPABASE_URL');
    console.error('  - SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  console.log('🔐 Resetting admin password...');
  console.log(`📧 Email: ${ADMIN_EMAIL}`);
  console.log('');

  try {
    // Create Supabase admin client
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Find the user by email
    const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Error listing users:', listError.message);
      process.exit(1);
    }

    const user = usersData?.users?.find(u => u.email === ADMIN_EMAIL);
    
    if (!user) {
      console.error('❌ User not found with email:', ADMIN_EMAIL);
      console.error('   Please check the email address.');
      process.exit(1);
    }

    // Update the password
    const { data, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      {
        password: ADMIN_NEW_PASSWORD
      }
    );

    if (updateError) {
      console.error('❌ Error updating password:', updateError.message);
      process.exit(1);
    }

    console.log('✅ Password reset successfully!');
    console.log('');
    console.log('📋 Admin Credentials:');
    console.log(`   Email: ${ADMIN_EMAIL}`);
    console.log(`   Password: ${ADMIN_NEW_PASSWORD}`);
    console.log('');
    console.log('🔐 You can now login with the new password.');
    console.log('🚀 Login at: http://localhost:3000/login');
    console.log('');

  } catch (error) {
    console.error('❌ Error resetting password:', error.message);
    process.exit(1);
  }
}

// Run the script
resetAdminPassword();
