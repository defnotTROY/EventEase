# Supabase Setup Guide for EventEase

## 🚀 Quick Setup Steps

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Sign up/Login to your account
3. Click "New Project"
4. Choose your organization
5. Enter project details:
   - **Name**: eventease
   - **Database Password**: (generate a strong password)
   - **Region**: Choose closest to your users
6. Click "Create new project"

### 2. Get Your Credentials
1. Go to your project dashboard
2. Click on "Settings" → "API"
3. Copy these values:
   - **Project URL** (looks like: `https://xyz.supabase.co`)
   - **Anon/Public Key** (starts with `eyJ...`)

### 3. Configure Environment Variables
Create a `.env` file in your project root with:
```env
REACT_APP_SUPABASE_URL=https://your-project-id.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Enable Email Authentication
1. In Supabase dashboard, go to "Authentication" → "Settings"
2. Under "Auth Providers", make sure "Email" is enabled
3. Configure your email settings:
   - **Site URL**: `http://localhost:3000` (for development)
   - **Redirect URLs**: Add `http://localhost:3000/reset-password`

### 5. Configure Email Templates
1. Go to "Authentication" → "Email Templates"
2. Customize the "Reset Password" template
3. Set the redirect URL to: `http://localhost:3000/reset-password`

## 🔧 Features You'll Get

✅ **Real Email Sending** - Supabase handles email delivery
✅ **Password Reset Links** - Secure, time-limited reset tokens
✅ **User Authentication** - Complete auth system
✅ **Database Integration** - PostgreSQL database
✅ **Real-time Features** - WebSocket support
✅ **File Storage** - Image uploads
✅ **Row Level Security** - Database security

## 📧 Email Configuration Options

### Option 1: Supabase Default (Free)
- Uses Supabase's email service
- Limited to 50 emails/day on free tier
- Perfect for development/testing

### Option 2: Custom SMTP (Recommended for Production)
- Configure your own email provider
- Go to "Authentication" → "Settings" → "SMTP Settings"
- Add your SMTP credentials (Gmail, SendGrid, etc.)

## 🎯 Next Steps

1. **Set up your Supabase project** (5 minutes)
2. **Add credentials to .env file**
3. **Test the password reset** - it will actually send emails!
4. **Customize email templates** to match your brand

## 🆘 Need Help?

- [Supabase Documentation](https://supabase.com/docs)
- [Auth Guide](https://supabase.com/docs/guides/auth)
- [Email Templates](https://supabase.com/docs/guides/auth/email-templates)
