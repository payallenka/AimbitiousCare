# 🚀 Deploy to Netlify NOW - Simple Steps

## ✅ You're Ready!

Everything is set up:
- ✅ Git repository initialized
- ✅ Code committed
- ✅ Netlify CLI installed
- ✅ Already logged in to Netlify
- ✅ Node 20 active

---

## 🎯 Choose Your Deployment Method

### **Method 1: Quick Deploy (Recommended for First Time)**

Run this single command and follow the prompts:

```bash
netlify deploy --prod --create-site ambitiouscare
```

**What it does:**
1. Creates a new site called "ambitiouscare" (or your chosen name)
2. Builds your app
3. Deploys to production
4. Gives you a live URL!

**If the name is taken**, try:
```bash
netlify deploy --prod --create-site ambitiouscare-mental-health
```

or

```bash
netlify deploy --prod --create-site ambitiouscare-$(date +%s)
```

---

### **Method 2: Interactive Setup**

If you want more control:

#### Step 1: Initialize site
```bash
netlify init
```

**Prompts:**
- **Create project without git?** → Choose "Yes, create and deploy project manually"
- **Team:** → Select your team
- **Site name:** → Enter unique name (e.g., `ambitiouscare-mh`)
- **Build command:** → Press Enter (uses netlify.toml)
- **Directory to deploy:** → Press Enter (uses `dist`)

#### Step 2: Build your app
```bash
npm run build
```

#### Step 3: Deploy!
```bash
netlify deploy --prod
```

---

### **Method 3: Manual via Dashboard**

1. **Build locally:**
   ```bash
   npm run build
   ```

2. **Go to Netlify:**
   - Visit https://app.netlify.com
   - Click "Add new site" → "Deploy manually"
   - Drag and drop the `dist` folder
   - Done! 🎉

---

## ⚡ After Deployment

### 1. Add Environment Variables

Go to your site on Netlify dashboard:

1. **Site settings** → **Environment variables** → **Add a variable**
2. Add these 3 variables:

```
Name: VITE_SUPABASE_URL
Value: https://mtlzydajldbwrxpyhcpq.supabase.co

Name: VITE_SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10bHp5ZGFqbGRid3J4cHloY3BxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5NDc1OTEsImV4cCI6MjA3NjUyMzU5MX0.OfOJp6vXRPlUhei5A89m3Jvg9fGnFgNW2bMYKBR0clw

Name: VITE_OPENAI_API_KEY
Value: sk-your-actual-openai-key-here
```

3. **Save** and **Trigger deploy** (or just deploy again)

### 2. Update Supabase Redirect URLs

1. Go to https://supabase.com/dashboard
2. Select project: **mtlzydajldbwrxpyhcpq**
3. **Authentication** → **URL Configuration**
4. Add your Netlify URL:

**Site URL:**
```
https://your-site-name.netlify.app
```

**Redirect URLs:** (add both)
```
https://your-site-name.netlify.app/setup-profile
https://your-site-name.netlify.app/reset-password
```

---

## 🎉 You're Live!

Your site will be at:
```
https://your-site-name.netlify.app
```

---

## 🔄 Update Your Site Later

Whenever you make changes:

```bash
# Make your changes
# ...

# Build
npm run build

# Deploy
netlify deploy --prod
```

Or set up continuous deployment by connecting to GitHub!

---

## 📝 Quick Command Reference

```bash
# Check status
netlify status

# Open site in browser
netlify open:site

# Open Netlify dashboard
netlify open:admin

# View logs
netlify logs

# Redeploy
netlify deploy --prod
```

---

## 🆘 Need Help?

**Site not loading?**
- Check environment variables are set
- Make sure you deployed with `--prod` flag
- Check build logs: `netlify logs`

**Auth not working?**
- Update Supabase redirect URLs with your Netlify URL

**AI Chatbot not working?**
- Add `VITE_OPENAI_API_KEY` in Netlify environment variables

---

## 🚀 START HERE

Run this one command to deploy now:

```bash
netlify deploy --prod --create-site ambitiouscare-mental-health
```

That's it! 🎉

