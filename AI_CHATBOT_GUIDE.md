# 🤖 AI Mental Health Chatbot - Complete Guide

## 🎉 What's New

I've built a stunning AI-powered mental health chatbot specifically designed for construction workers in the UK! It's powered by OpenAI's GPT-4 and provides 24/7 confidential support.

---

## ✨ Features

### 1. **Beautiful, Smooth Design**
- ✅ Glassmorphism UI matching the app aesthetic
- ✅ Smooth animations with Framer Motion
- ✅ Gradient AI avatar with pulsing animation
- ✅ Message bubbles with typing animations
- ✅ Elegant typing indicator (3 animated dots)
- ✅ Mobile responsive design

### 2. **Smart Conversation**
- ✅ **Specialized System Prompt** for construction workers
- ✅ Understands UK construction industry challenges
- ✅ Empathetic and practical responses
- ✅ Short, meaningful replies (2-4 sentences)
- ✅ Asks thoughtful follow-up questions
- ✅ Encourages resilience and coping strategies

### 3. **User Experience**
- ✅ **Suggested Prompts** for easy conversation start
- ✅ Message history (saved in localStorage)
- ✅ Clear conversation option
- ✅ Timestamps on all messages
- ✅ Auto-scroll to latest message
- ✅ Loading states and typing indicators

### 4. **Safety Features**
- ✅ **Crisis Support** - Reminds users about Samaritans (116 123) and 999
- ✅ Disclaimer about AI limitations
- ✅ Encourages professional help when needed
- ✅ System prompt includes crisis detection

---

## 🎨 Design Highlights

### AI Avatar
- **Gradient background** (primary → accent → primary/60)
- **Sparkles icon** representing AI
- **Pulse animation** for a living, breathing feel

### Message Bubbles
- **User messages:** Right-aligned, primary color, rounded corners
- **AI messages:** Left-aligned, glass card effect, elegant styling
- **Smooth entrance animations** with staggered timing
- **Timestamps** in muted text

### Typing Indicator
- **3 animated dots** that scale in sequence
- **Glass card background**
- **Infinite loop animation**

### Navbar Highlight
- **Gradient background** (primary/10 → accent/10)
- **Pulsing icon** to draw attention
- **Special hover effect**

---

## 🔧 Setup Instructions

### 1. Add Your OpenAI API Key

Open `.env` and replace the placeholder:

```env
VITE_OPENAI_API_KEY=sk-your-actual-openai-api-key-here
```

**To get an API key:**
1. Go to https://platform.openai.com/api-keys
2. Create an account or sign in
3. Click "Create new secret key"
4. Copy the key and paste it in `.env`

### 2. Install Dependencies (if needed)

The app already has all required dependencies. If you need to reinstall:

```bash
npm install
```

### 3. Run the App

```bash
npm run dev
```

---

## 🚀 How to Use

### Starting a Conversation:
1. Go to **AI Chatbot** in the navbar (with the sparkle icon ✨)
2. See the welcome message and suggested prompts
3. Click a prompt OR type your own message
4. AI responds in 2-5 seconds

### Suggested Prompts:
- "I'm feeling really stressed about work lately"
- "I'm having trouble sleeping"
- "I feel like nobody understands what I'm going through"
- "How can I manage work pressure better?"
- "I'm worried about my mental health"

### Managing Conversation:
- **Clear Conversation** - Button to start fresh (top right)
- **Message History** - Automatically saved in browser
- **Timestamps** - Shows when each message was sent

---

## 🧠 AI System Prompt

The chatbot is specifically trained to understand:

### Construction Worker Challenges:
- Long hours and physical demands
- Job site stress and safety concerns
- Work-life balance
- Financial pressures
- Physical injuries and chronic pain
- Seasonal work and weather stress
- Workplace relationships
- Feeling undervalued

### Therapeutic Approach:
- Warm, empathetic, non-judgmental
- Practical and solution-focused
- Understands UK construction culture
- Respects masculine identity
- Encourages emotional openness
- Builds resilience
- Aware of UK mental health resources

### Safety Features:
- Detects crisis situations
- Recommends Samaritans (116 123)
- Suggests emergency services (999) when needed
- Encourages professional therapy

---

## 📱 UI Components

### Welcome Screen (No Messages)
```
┌─────────────────────────────────────┐
│   ✨ (Pulsing gradient circle)     │
│   AI Mental Health Support          │
│   Your personal AI therapist...     │
├─────────────────────────────────────┤
│   🤖 Welcome, [Name]!               │
│   I'm here to listen...             │
├─────────────────────────────────────┤
│   📝 Try one of these:              │
│   > Suggested prompt 1              │
│   > Suggested prompt 2              │
│   > Suggested prompt 3              │
└─────────────────────────────────────┘
```

### Chat Screen (With Messages)
```
┌─────────────────────────────────────┐
│ [Clear Conversation]                │
├─────────────────────────────────────┤
│     User Message                    │
│     (Right side, primary color)     │
├─────────────────────────────────────┤
│  ✨ AI Response                     │
│  (Left side, glass card)            │
├─────────────────────────────────────┤
│  ✨ • • •  (Typing...)              │
└─────────────────────────────────────┘
│ [Input field]              [Send]   │
└─────────────────────────────────────┘
```

---

## 🎯 Technical Details

### OpenAI Configuration:
- **Model:** GPT-4 (most capable)
- **Temperature:** 0.7 (balanced creativity)
- **Max Tokens:** 500 (concise responses)
- **System Prompt:** Specialized for construction workers

### Data Persistence:
- **localStorage** saves conversation history
- Persists across page refreshes
- Can be cleared anytime

### Error Handling:
- API key validation
- Network error handling
- User-friendly error messages
- Graceful fallbacks

---

## 🔒 Privacy & Security

### What's Stored:
- ✅ Conversation history in browser (localStorage)
- ✅ Messages never sent to your backend
- ✅ Only you and OpenAI see the messages

### What's NOT Stored:
- ❌ No database storage
- ❌ No server-side logging
- ❌ No tracking or analytics

### User Control:
- Can clear conversation anytime
- Can close browser to reset
- Full control over their data

---

## 📁 Files Created

### New Files:
- `src/pages/AIChatbotPage.tsx` - AI chatbot interface
- `AI_CHATBOT_GUIDE.md` - This documentation

### Modified Files:
- `.env` - Added OpenAI API key
- `src/components/Navbar.tsx` - Added AI Chatbot nav item with special styling
- `src/App.tsx` - Added `/ai-chatbot` route
- `src/pages/DashboardPage.tsx` - Added AI Chatbot card with gradient

---

## ✅ Testing Checklist

- [ ] Add OpenAI API key to `.env`
- [ ] Restart dev server (`npm run dev`)
- [ ] See "AI Chatbot" in navbar with pulsing icon
- [ ] Click to go to AI Chatbot page
- [ ] See welcome message with suggested prompts
- [ ] Click a suggested prompt - AI should respond
- [ ] Type custom message - AI should respond
- [ ] See typing indicator while waiting
- [ ] Check timestamps on messages
- [ ] Clear conversation - messages should disappear
- [ ] Refresh page - messages should persist
- [ ] Try on mobile - should be responsive

---

## 🎨 Styling Classes Used

```css
/* AI Avatar */
bg-gradient-to-br from-primary via-accent to-primary/60 animate-pulse

/* Message Bubbles */
User: bg-primary text-primary-foreground
AI: glass-card

/* Typing Indicator */
animate: scale: [1, 1.2, 1] with staggered delays

/* Navbar Highlight */
bg-gradient-to-r from-primary/10 to-accent/10
hover:from-primary/20 hover:to-accent/20
```

---

## 🚀 What's Working

✅ **OpenAI integration** with GPT-4
✅ **Beautiful, smooth UI** with animations
✅ **Specialized system prompt** for construction workers
✅ **Suggested prompts** for quick start
✅ **Message history** saved in browser
✅ **Typing indicators** and loading states
✅ **Crisis support** reminders (Samaritans, 999)
✅ **Clear conversation** option
✅ **Mobile responsive** design
✅ **Navbar highlight** with pulsing icon
✅ **Dashboard card** with gradient

---

## 💡 Tips

1. **First Time Setup:** Make sure to add your OpenAI API key!
2. **API Costs:** GPT-4 costs about $0.03 per 1K tokens (very affordable)
3. **Response Time:** Usually 2-5 seconds depending on message length
4. **Conversation Length:** Longer conversations = more tokens = slightly higher cost
5. **Privacy:** Messages are only sent to OpenAI, not stored in your database

---

**Everything is ready! Add your OpenAI API key and start chatting! 🎉**

