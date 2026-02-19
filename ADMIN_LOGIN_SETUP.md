# Admin Login Setup Guide

## ⚠️ Important Note

Due to Supabase Admin API limitations (500 errors), users need to be created manually via Supabase Dashboard first.

## Quick Setup (Manual + Script)

### Step 1: Create Admin User Manually

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select project: **sclvjrnnnbbptnhonoks**
3. Go to **Authentication** → **Users**
4. Click **"Add User"** or **"Invite User"**
5. Enter:
   - **Email**: `milanbrezovac@gmail.com`
   - **Password**: (set a temporary password)
   - **Auto Confirm User**: ✅ (check this)
6. Click **"Create User"**

### Step 2: Generate Password Reset Link

Once user is created, run:

```bash
npm run admin-reset-password milanbrezovac@gmail.com
```

This will generate a password reset link that you can share with the client.

## Alternative: Automated Setup (If API Works)

If Supabase Admin API is working, you can try:

```bash
npm run setup-admin
```

This will attempt to:
1. ✅ Check for service role key
2. ✅ Import all users from SQL file (if needed)
3. ✅ Find admin user
4. ✅ Generate password reset link
5. ✅ Save info to file

## Step-by-Step Setup

### Step 1: Get Service Role Key

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select project: **sclvjrnnnbbptnhonoks**
3. Go to **Settings** → **API**
4. Copy the **service_role** key (NOT the anon key)

### Step 2: Set Service Role Key

**Option A: Create `.env` file (Recommended)**

Create `.env` file in project root:

```env
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

**Option B: Set Environment Variable**

**PowerShell:**
```powershell
$env:SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"
```

**Command Prompt:**
```cmd
set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### Step 3: Run Setup

```bash
npm run setup-admin
```

### Step 4: Share Password Reset Link with Client

The script will output:
- Admin email
- Password reset link
- Instructions

The link is also saved to: `supabase/exports/admin-login-info.txt`

## Admin User Details

- **Email**: `milanbrezovac@gmail.com`
- **User ID**: `03765a40-f338-4035-a2ba-8928fff30834`
- **Role**: Admin

## Client Instructions

1. Click the password reset link
2. Set a new password
3. Login with email: `milanbrezovac@gmail.com` and the new password

## Troubleshooting

### Error: SUPABASE_SERVICE_ROLE_KEY not found

Make sure you've set the service role key in `.env` file or as environment variable.

### Error: No admin user found

Check if `user_roles` table has admin role assigned:
```bash
npm run check-users
```

### Error: Admin not in auth.users

Run the import script first:
```bash
npm run import-lovable-users
```

### Password Reset Link Expired

Generate a new one:
```bash
npm run admin-reset-password milanbrezovac@gmail.com
```

## Alternative: Manual Password Reset

1. Go to Supabase Dashboard → Authentication → Users
2. Find admin user: `milanbrezovac@gmail.com`
3. Click "Send password reset email"
