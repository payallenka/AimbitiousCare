# New Registration Flow

## ✅ How It Works

### Step 1: Email & Password Only
- User goes to `/register`  
- Enters ONLY email and password
- Clicks "Continue"
- Gets verification email

### Step 2: Email Verification
- User clicks link in email
- Redirected to `/setup-profile`

### Step 3: Choose Role & Complete Profile
- User chooses Patient or Professional role
- Fills in ALL profile details  
- Submits
- **IMMEDIATELY logged in** and sent to dashboard

## ✅ What This Fixes

- **No more 406 errors** - Profile created AFTER email verification
- **No more RLS violations** - User authenticated before uploading
- **Email already in use** - Clear error shown
- **Can't skip profile** - Must complete to access app
- **Smooth flow** - Email → Verify → Profile → Dashboard

## Routes

- `/register` - Email/password signup
- `/verify-email` - Waiting page
- `/setup-profile` - Choose role (after email verify)
- `/setup/patient` - Patient profile form
- `/setup/professional/:role` - Professional profile form
- `/dashboard` - Main app (after profile complete)

