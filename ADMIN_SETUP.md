# 🔐 Admin Account Setup Guide

The admin account is **pre-configured** and not created through the UI. This ensures security and proper access control.

## 📋 Option 1: Using Setup Script (Recommended)

### Prerequisites
1. Get your **Supabase Service Role Key**:
   - Go to: Supabase Dashboard > Settings > API
   - Copy the `service_role` key (NOT the anon key)

2. Set up environment variables:
   ```bash
   # In your .env file or export in terminal
   export SUPABASE_URL="your-supabase-url"
   export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
   export ADMIN_EMAIL="admin@eventease.com"
   export ADMIN_PASSWORD="YourSecurePassword123!"
   export ADMIN_FIRST_NAME="Admin"
   export ADMIN_LAST_NAME="User"
   ```

### Run the Setup Script

1. **Install dependencies** (if not already installed):
   ```bash
   cd EventEase
   npm install @supabase/supabase-js dotenv
   ```

2. **Run the script**:
   ```bash
   node scripts/create-admin.js
   ```

3. **Save the credentials** shown in the output.

### Default Admin Credentials

If you don't set environment variables, the script uses these defaults:
- **Email:** `admin@eventease.com`
- **Password:** `Admin@EventEase2024!`
- **Name:** Admin User

⚠️ **IMPORTANT:** Change the default password immediately after first login!

---

## 📋 Option 2: Manual Setup via Supabase Dashboard

### Step 1: Create User in Supabase

1. Go to your Supabase Dashboard
2. Navigate to **Authentication > Users**
3. Click **"Add user"** > **"Create new user"**
4. Fill in:
   - **Email:** `admin@eventease.com` (or your preferred email)
   - **Password:** Set a secure password
   - **Auto Confirm User:** ✅ Check this box
5. Click **"Create user"**

### Step 2: Set Admin Role

1. Click on the newly created user to view details
2. Scroll to **"Raw User Meta Data"** section
3. Click **"Edit"** or use the SQL Editor:

```sql
-- Update the user's metadata to set admin role
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"Administrator"'
) || jsonb_build_object(
  'first_name', 'Admin',
  'last_name', 'User',
  'organization', 'EventEase Platform',
  'phone', '',
  'timezone', 'UTC-8',
  'language', 'English'
)
WHERE email = 'admin@eventease.com';
```

4. **Replace `admin@eventease.com`** with your actual admin email
5. Run the SQL query

---

## 📋 Option 3: SQL Script (One-time Setup)

You can also run this SQL directly in Supabase SQL Editor:

```sql
-- First, create the admin user (replace with your credentials)
-- Note: This creates the user with email confirmation disabled
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data,
  is_super_admin
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@eventease.com',  -- CHANGE THIS
  crypt('Admin@EventEase2024!', gen_salt('bf')),  -- CHANGE THIS PASSWORD
  NOW(),
  NOW(),
  NOW(),
  jsonb_build_object(
    'first_name', 'Admin',
    'last_name', 'User',
    'role', 'Administrator',
    'organization', 'EventEase Platform',
    'phone', '',
    'timezone', 'UTC-8',
    'language', 'English'
  ),
  false
) ON CONFLICT (email) DO UPDATE
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"Administrator"'
);
```

⚠️ **Note:** The SQL method requires the password to be hashed. It's easier to use Option 1 (script) or Option 2 (Dashboard).

---

## ✅ Verify Admin Account

After setup:

1. **Login** at: `http://localhost:3000/login`
2. Use your admin credentials
3. You should see **Admin Dashboard** in the sidebar
4. Navigate to `/admin` to verify access

---

## 🔒 Security Best Practices

1. **Use a strong password** (min 12 characters, mix of letters, numbers, symbols)
2. **Change default password** immediately after first login
3. **Keep credentials secure** - store them in a password manager
4. **Never commit credentials** to version control
5. **Use environment variables** for the setup script
6. **Limit admin accounts** - only create what's necessary

---

## 🆘 Troubleshooting

### "User already exists"
- The account already exists. Run the script again - it will update the role automatically.

### "Access denied" after login
- Check that `role: 'Administrator'` is set in user metadata
- Verify user metadata in Supabase Dashboard > Authentication > Users

### "Cannot access admin panel"
- Logout and login again to refresh session
- Verify role in user metadata is exactly `'Administrator'` (case-sensitive)

---

## 📞 Need Help?

If you encounter issues:
1. Check Supabase Dashboard > Authentication > Users for user details
2. Verify user metadata contains `role: 'Administrator'`
3. Check browser console for errors
4. Ensure you're using the correct email/password
