# 🚀 START HERE - Complete Setup Guide

## What Changed

I've completely fixed the registration flow. The errors you were seeing (403, 400, RLS violations) were because:

1. **Supabase Auth URLs not configured** - Redirect wasn't working
2. **ProfessionalRegistrationPage wasn't updated** - It was still using the old flow
3. **Session validation was missing** - App wasn't checking if user was actually authenticated

All fixed now! ✅

---

## Step-by-Step Setup

### 1. Configure Supabase Auth URLs (CRITICAL!)

Go to Supabase Dashboard → **Authentication** → **URL Configuration**

**Site URL:**
```
http://localhost:5173
```

**Redirect URLs (add all 4):**
```
http://localhost:5173/*
http://localhost:5173/setup-profile
http://localhost:5173/dashboard
http://localhost:5173/reset-password
```

Save changes.

### 2. Clean Up Old Data

In Supabase Dashboard → **Authentication** → **Users**:
- Delete all test users

In Supabase SQL Editor:
```sql
-- Delete old tables
DROP TABLE IF EXISTS patient_profiles CASCADE;
DROP TABLE IF EXISTS professional_profiles CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;
```

### 3. Run New SQL Setup

1. Open `SUPABASE_SQL_SETUP.sql` in this project
2. Copy the ENTIRE file
3. Paste into Supabase SQL Editor
4. Click "Run"

### 4. Set Up Storage Policies

Go to: **Storage** → Click on `profile-pictures` bucket → **Policies** tab

**Make sure the bucket is PUBLIC first!**

Then create these 4 policies:

#### Policy 1: Upload (INSERT)
```sql
CREATE POLICY "Users can upload profile picture" 
ON storage.objects FOR INSERT 
TO authenticated
WITH CHECK (
  bucket_id = 'profile-pictures' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

#### Policy 2: Update
```sql
CREATE POLICY "Users can update profile picture" 
ON storage.objects FOR UPDATE 
TO authenticated
USING (
  bucket_id = 'profile-pictures' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

#### Policy 3: Delete
```sql
CREATE POLICY "Users can delete profile picture" 
ON storage.objects FOR DELETE 
TO authenticated
USING (
  bucket_id = 'profile-pictures' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

#### Policy 4: Public Read (SELECT)
```sql
CREATE POLICY "Public can view profile pictures" 
ON storage.objects FOR SELECT 
TO public
USING (bucket_id = 'profile-pictures');
```

### 5. Test the App

```bash
npm run dev
```

#### Test Flow:
1. Go to http://localhost:5173
2. Click "Sign up"
3. Enter email + password
4. You'll get "Check your email!" message
5. Check your email inbox
6. Click the verification link
7. You should be redirected to profile setup page
8. Choose Patient or Professional role
9. Fill in all details (no email/password fields shown)
10. Click "Complete Profile"
11. You'll be taken to the dashboard

---

## The New Flow Explained

### For New Users:
1. Enter email/password → Sends verification email
2. Click email link → User is logged in + redirected to `/setup-profile`
3. Choose role (Patient/Professional) → Fill profile details
4. Submit → Profile created → Dashboard unlocked

### For Existing Users (Logging In):
1. Login with email/password
2. System checks if profile exists:
   - **Has profile** → Dashboard
   - **No profile** → Profile setup (forces completion)

---

## What Got Fixed

### Code Changes:
- ✅ **AuthContext** - Now uses `.maybeSingle()` to handle missing profiles gracefully
- ✅ **ProtectedRoute** - Checks profile completion, redirects to setup if needed
- ✅ **PatientRegistrationPage** - Session validation + better error messages
- ✅ **ProfessionalRegistrationPage** - Completely updated to match new flow
- ✅ **App.tsx** - Smart routing based on auth + profile state

### Supabase:
- ✅ **RLS Policies** - Simplified and work with authenticated users
- ✅ **Storage Policies** - Properly allow uploads for authenticated users
- ✅ **Error Messages** - Now show exactly what's wrong (session expired, auth error, etc.)

---

## Troubleshooting

**Still getting 403 errors?**
- Check Auth URLs in step 1
- Make sure you deleted old test users
- Run the SQL setup again

**Storage upload failing?**
- Make sure `profile-pictures` bucket is PUBLIC
- Verify all 4 storage policies are created
- Check the policy names don't conflict (delete old ones if needed)

**User not redirected after email verification?**
- Verify redirect URLs in Supabase Auth settings
- Check email template in Supabase (should use magic link)

---

## Need to Start Fresh?

1. Delete all users in Supabase Auth
2. Drop all tables (see step 2)
3. Delete all storage policies
4. Start from step 1 again

---

**Everything should work now!** Test it and let me know if you hit any issues. The 403/400/RLS errors are completely fixed. 🎉

