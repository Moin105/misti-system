# Password Reset Instructions for Client

## ⚠️ Link Expired Error

If you see: `Email link is invalid or has expired`

This means the password reset link has expired (links expire after 1 hour).

## ✅ Solution: Get Fresh Link

### Option 1: Developer Will Generate Fresh Link

Ask your developer to run:
```bash
npm run fix-admin-password
```

They will provide you with a new link.

### Option 2: Use Supabase Dashboard

1. Go to: https://supabase.com/dashboard
2. Select project: **sclvjrnnnbbptnhonoks**
3. Go to: **Authentication** → **Users**
4. Find: `milanbrezovac@gmail.com`
5. Click on the user
6. Click **"Send password reset email"**
7. Check your email inbox
8. Click the link in email
9. Set new password

## 📋 Step-by-Step Process

1. **Get Fresh Link** (from developer or Dashboard)
2. **Click the Link** (must be clicked within 1 hour)
3. **Set New Password** (choose a strong password)
4. **Login** at: https://misti-system.vercel.app
5. **Use New Password** to login

## ⚠️ Important Notes

- **Links expire in 1 hour** - use them quickly
- **Don't use Dashboard invite password** - it won't work
- **Must use reset link** to set actual password
- **After setting password**, login with that password

## 🔄 If Link Keeps Expiring

If links keep expiring before you can use them:

1. Ask developer to generate link
2. **Immediately** click the link
3. Set password **right away**
4. Don't wait or save link for later

## ✅ After Password is Set

Once password is set via reset link:
- Login at: https://misti-system.vercel.app
- Email: `milanbrezovac@gmail.com`
- Password: (the one you set via reset link)
- All admin features will be available
