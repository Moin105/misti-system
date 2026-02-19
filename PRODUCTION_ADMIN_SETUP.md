# Production Admin Login Setup

## Current Situation

✅ **Fixed:**
- `user_roles` trigger issue fixed (migration applied)
- Admin user can be created in Supabase Dashboard
- Password reset link generation script ready

⚠️ **Issue:**
- Password reset links are redirecting to `localhost:3000` instead of production URL
- Need to configure Supabase redirect URLs

## Solution: Configure Supabase Redirect URLs

### Step 1: Add Production URL to Supabase

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select project: **sclvjrnnnbbptnhonoks**
3. Go to **Authentication** → **URL Configuration**
4. Under **Redirect URLs**, add:
   ```
   https://misti-system.vercel.app/**
   ```
5. Under **Site URL**, set:
   ```
   https://misti-system.vercel.app
   ```
6. Click **Save**

### Step 2: Generate Fresh Password Reset Link

After configuring redirect URLs, run:

```bash
npm run admin-reset-production
```

This will generate a new link that redirects to production.

### Step 3: Manual Link Fix (If Needed)

If the redirect URL in the link still shows `localhost:3000`, you can manually replace it:

**Original link:**
```
https://sclvjrnnnbbptnhonoks.supabase.co/auth/v1/verify?token=XXX&type=recovery&redirect_to=http://localhost:3000
```

**Replace with:**
```
https://sclvjrnnnbbptnhonoks.supabase.co/auth/v1/verify?token=XXX&type=recovery&redirect_to=https://misti-system.vercel.app
```

(Replace `XXX` with the actual token from the generated link)

## Alternative: Direct Login Setup

If password reset links are problematic, use this approach:

### Option 1: Set Temporary Password in Dashboard

1. Go to Supabase Dashboard → Authentication → Users
2. Find: `milanbrezovac@gmail.com`
3. Click on the user
4. Click **"Reset Password"** or **"Update User"**
5. Set a temporary password
6. Share credentials with client:
   - Email: `milanbrezovac@gmail.com`
   - Password: (temporary password)
7. Client logs in at: https://misti-system.vercel.app
8. Client changes password after login

### Option 2: Use Magic Link (Email)

1. Go to Supabase Dashboard → Authentication → Users
2. Find: `milanbrezovac@gmail.com`
3. Click **"Send Magic Link"** or **"Send Password Reset"**
4. Client receives email
5. Client clicks link in email
6. Sets password and logs in

## Quick Fix Script

Run this to get the latest reset link:

```bash
npm run admin-reset-production
```

Then manually edit the `redirect_to` parameter in the URL if needed.

## Verification

After client sets password:
1. Client should be able to login at: https://misti-system.vercel.app
2. Admin role should be active (check `user_roles` table)
3. Admin features should be accessible

## Troubleshooting

### "Email link is invalid or has expired"

- Links expire after 1 hour
- Generate a fresh link: `npm run admin-reset-production`
- Or use temporary password method

### Redirect still goes to localhost

1. Check Supabase Dashboard → Authentication → URL Configuration
2. Ensure production URL is in Redirect URLs list
3. Manually edit the `redirect_to` parameter in the link

### Client can't login after password reset

1. Verify user exists in `auth.users`
2. Check email is confirmed
3. Verify admin role in `user_roles` table
4. Check if user is banned in `profiles` table
