# 🤖 AI Features Setup Guide

## 🚀 Quick Setup (5 minutes)

### 1. Get Your OpenAI API Key
1. Go to [platform.openai.com](https://platform.openai.com)
2. Sign up or log in to your account
3. Navigate to **API Keys** section
4. Click **"Create new secret key"**
5. Copy the key (starts with `sk-...`)

### 2. Add to Your Environment
Add this line to your `eventease.env` file:
```env
REACT_APP_OPENAI_API_KEY=sk-your-api-key-here
```

### 3. Restart Your App
```bash
npm start
```

## 🎯 What You'll Get

### ✅ **Personalized Event Recommendations**
- AI analyzes your event history and preferences
- Suggests events you'd be interested in attending
- Confidence scores for each recommendation
- Match factors explaining why events are recommended

### ✅ **Automated Scheduling**
- AI generates optimal event timelines
- Considers best practices and participant engagement
- Customizable constraints (start time, breaks, session length)
- Professional schedule with activity types and durations

### ✅ **Intelligent Feedback Analysis**
- AI analyzes attendance patterns and performance metrics
- Provides sentiment analysis and engagement insights
- Generates actionable recommendations for improvement
- Performance scoring and next steps guidance

## 💰 **Cost Information**

**OpenAI API Pricing (as of 2024):**
- **GPT-3.5-turbo**: ~$0.002 per 1K tokens
- **Typical cost per AI request**: $0.01 - $0.05
- **Monthly estimate for active use**: $5 - $20

**Free Tier Available:**
- $5 free credits for new accounts
- Perfect for testing and development

## 🔧 **Features Breakdown**

### **AI Recommendations**
- Analyzes your event creation patterns
- Considers your participation history
- Matches events by category, tags, and timing
- Provides confidence scores and reasoning

### **AI Scheduler**
- Creates professional event timelines
- Balances engagement and breaks
- Considers event type and duration
- Generates actionable schedule with time slots

### **AI Feedback Analysis**
- Processes attendance and registration data
- Identifies strengths and improvement areas
- Provides sentiment analysis
- Generates specific recommendations

## 🛡️ **Security & Privacy**

- **API Key Security**: Never commit your API key to version control
- **Data Privacy**: Only event metadata is sent to OpenAI (no personal data)
- **Local Processing**: All data processing happens in your app
- **No Data Storage**: OpenAI doesn't store your event data

## 🚨 **Troubleshooting**

### **"AI Service Not Configured" Error**
- Check that `REACT_APP_OPENAI_API_KEY` is in your `.env` file
- Restart your development server
- Verify the API key is valid

### **API Rate Limits**
- OpenAI has rate limits based on your account tier
- Free tier: 3 requests per minute
- Paid tier: Higher limits available

### **API Errors**
- Check your OpenAI account balance
- Verify API key permissions
- Check OpenAI service status

## 🎉 **You're Ready!**

Once you add your API key, your EventEase platform will have:
- ✅ **Real AI-powered recommendations**
- ✅ **Intelligent scheduling optimization**
- ✅ **Smart feedback analysis**
- ✅ **Professional AI insights**

Your events will now be powered by artificial intelligence! 🤖✨
