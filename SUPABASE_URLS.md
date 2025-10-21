# Supabase URL Configuration

## 🔧 Configure Redirect URLs in Supabase

Go to: **Supabase Dashboard** → **Authentication** → **URL Configuration**

### Site URL
```
http://localhost:5173
```

### Redirect URLs (add ALL of these)
```
http://localhost:5173/*
http://localhost:5173/setup-profile
http://localhost:5173/dashboard
http://localhost:5173/reset-password
```

---

## 📧 Email Templates

The app automatically uses the correct redirect URLs:

- **Email Verification**: Redirects to `/setup-profile`
- **Password Reset**: Redirects to `/reset-password`

No need to modify email templates unless you want custom styling.

---

## ✅ What Got Fixed

### 1. Duplicate Email Error
- Now properly detects when email is already registered
- Shows: "An account with this email already exists. Please try logging in instead."
- Uses `identities` check to catch Supabase's silent failures

### 2. Forgot Password
- New page: `/forgot-password`
- Sends password reset email
- Link in email redirects to `/reset-password`

### 3. Reset Password
- New page: `/reset-password`
- User sets new password
- Redirects to login after success

---

## 🧪 Test It

### Test Duplicate Email:
1. Sign up with an email
2. Try signing up again with same email
3. Should see: "An account with this email already exists"

### Test Forgot Password:
1. Go to `/login`
2. Click "Forgot password?"
3. Enter your email
4. Check email inbox
5. Click reset link → redirects to `/reset-password`
6. Enter new password
7. Redirects to login

---

## 🚀 Production URLs

When deploying to production, add your production URLs too:

```
https://yourdomain.com/*
https://yourdomain.com/setup-profile
https://yourdomain.com/dashboard
https://yourdomain.com/reset-password
```

That's it! 🎉

