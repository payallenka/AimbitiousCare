# 🚀 Netlify Deployment Guide

## ✅ What's Been Set Up

1. ✅ **Git initialized** and first commit made
2. ✅ **netlify.toml** created with build configuration
3. ✅ **.gitignore** created (protects .env and sensitive files)
4. ✅ **Netlify CLI** installed globally
5. ✅ **Node 20** activated (required for Netlify CLI)

---

## 🚀 Deploy to Netlify (3 Steps)

### Step 1: Login to Netlify

```bash
netlify login
```

This will:
- Open a browser window
- Ask you to authorize Netlify CLI
- Save your credentials locally

### Step 2: Initialize Netlify Site

```bash
netlify init
```

This will ask you:
1. **Create & configure a new site** (select this)
2. **Team:** Choose your Netlify team/account
3. **Site name:** Enter a unique name (e.g., `ambitiouscare-mental-health`)
4. **Build command:** Press Enter (uses `npm run build` from netlify.toml)
5. **Publish directory:** Press Enter (uses `dist` from netlify.toml)

### Step 3: Deploy!

```bash
netlify deploy --prod
```

This will:
- Build your React app
- Upload to Netlify
- Give you a live URL! 🎉

---

## 🔐 Add Environment Variables to Netlify

After deployment, you need to add your environment variables:

### Option A: Via Netlify Dashboard (Recommended)

1. Go to https://app.netlify.com
2. Click on your site
3. Go to **Site settings** → **Environment variables**
4. Add these variables:

```
VITE_SUPABASE_URL = https://mtlzydajldbwrxpyhcpq.supabase.co
VITE_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10bHp5ZGFqbGRid3J4cHloY3BxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5NDc1OTEsImV4cCI6MjA3NjUyMzU5MX0.OfOJp6vXRPlUhei5A89m3Jvg9fGnFgNW2bMYKBR0clw
VITE_OPENAI_API_KEY = your_openai_api_key_here
```

5. Click **Save**
6. Trigger a new deployment

### Option B: Via CLI

```bash
netlify env:set VITE_SUPABASE_URL "https://mtlzydajldbwrxpyhcpq.supabase.co"
netlify env:set VITE_SUPABASE_ANON_KEY "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10bHp5ZGFqbGRid3J4cHloY3BxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5NDc1OTEsImV4cCI6MjA3NjUyMzU5MX0.OfOJp6vXRPlUhei5A89m3Jvg9fGnFgNW2bMYKBR0clw"
netlify env:set VITE_OPENAI_API_KEY "sk-your-openai-key-here"
```

Then redeploy:
```bash
netlify deploy --prod
```

---

## 🔄 Update Supabase Redirect URLs

After deployment, update Supabase:

1. Go to https://supabase.com/dashboard
2. Select your project: **mtlzydajldbwrxpyhcpq**
3. Go to **Authentication** → **URL Configuration**
4. Add your Netlify URL to:
   - **Site URL:** `https://your-site-name.netlify.app`
   - **Redirect URLs:**
     - `https://your-site-name.netlify.app/setup-profile`
     - `https://your-site-name.netlify.app/reset-password`
     - `http://localhost:5173/setup-profile` (for local dev)
     - `http://localhost:5173/reset-password` (for local dev)

---

## 📱 Quick Commands Reference

```bash
# Login to Netlify
netlify login

# Initialize new site
netlify init

# Deploy to production
netlify deploy --prod

# Deploy for preview (draft)
netlify deploy

# Check deployment status
netlify status

# Open site in browser
netlify open

# Open Netlify dashboard
netlify open:admin

# View site logs
netlify logs

# Set environment variable
netlify env:set VAR_NAME "value"

# List all environment variables
netlify env:list
```

---

## 🎯 Continuous Deployment (Optional)

Want automatic deployments on every git push?

### Option 1: Connect Git Repository

1. Go to Netlify Dashboard → **Site settings** → **Build & deploy**
2. Click **Link repository**
3. Connect your GitHub/GitLab/Bitbucket account
4. Select your repository
5. Done! Every push to main branch auto-deploys

### Option 2: Manual Git Workflow

```bash
# Make changes to your code
# ...

# Commit changes
git add .
git commit -m "Your commit message"

# Deploy to Netlify
netlify deploy --prod
```

---

## 🛠️ netlify.toml Configuration

Already created with these settings:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "20"

# SPA routing (redirect all to index.html)
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

# Security headers
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"

# Asset caching
[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

---

## ⚡ What Happens on Deployment

1. **Build Process:**
   - Netlify runs `npm install`
   - Runs `npm run build`
   - Creates optimized production build in `dist/`

2. **Environment Variables:**
   - Injected during build
   - Never exposed in client code (Vite handles this)

3. **Deployment:**
   - Uploads `dist/` folder to Netlify CDN
   - Configures redirects and headers
   - Assigns URL (custom domain optional)

4. **Live Site:**
   - HTTPS enabled automatically
   - Global CDN for fast loading
   - Automatic asset optimization

---

## 🔒 Security Notes

✅ **.env is NOT committed** (in .gitignore)
✅ **Environment variables** stored securely in Netlify
✅ **HTTPS** enabled by default
✅ **Security headers** configured
✅ **Asset caching** for performance

---

## 🐛 Troubleshooting

### Issue: "Build failed"
**Solution:** Check environment variables are set in Netlify

### Issue: "404 on refresh"
**Solution:** Already handled by redirects in netlify.toml

### Issue: "API key not working"
**Solution:** Make sure to set `VITE_OPENAI_API_KEY` in Netlify env vars

### Issue: "Supabase auth not working"
**Solution:** Add your Netlify URL to Supabase redirect URLs

---

## 📦 Your Current Status

✅ Git initialized
✅ Initial commit made (50 files)
✅ Netlify config created
✅ .gitignore protecting sensitive files
✅ Netlify CLI installed
✅ Node 20 active

**Ready to deploy! Run these 3 commands:**

```bash
netlify login
netlify init
netlify deploy --prod
```

---

## 🎉 Post-Deployment Checklist

- [ ] Run `netlify login`
- [ ] Run `netlify init`
- [ ] Run `netlify deploy --prod`
- [ ] Add environment variables in Netlify dashboard
- [ ] Update Supabase redirect URLs
- [ ] Test signup/login flow
- [ ] Test AI chatbot with OpenAI key
- [ ] Test expert browsing and chat
- [ ] Share your live URL! 🚀

---

**Your site will be live at: `https://your-site-name.netlify.app`**

You can also add a custom domain later in Netlify settings!

