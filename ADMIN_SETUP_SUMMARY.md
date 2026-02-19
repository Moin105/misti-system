# Admin Login Setup - Complete Summary

## Current Situation

✅ **What's Ready:**
- Admin user exists in `profiles` table: `milanbrezovac@gmail.com`
- Admin role assigned in `user_roles` table
- Scripts created for password reset link generation
- Service role key configured

❌ **What's Missing:**
- Admin user in `auth.users` table (required for login)
- Supabase Admin API giving 500 errors when creating users programmatically

## Solution: Manual Setup Required

Due to Supabase API limitations, admin user must be created manually.

### Step-by-Step Instructions

#### 1. Create Admin User in Supabase Dashboard

1. Go to: https://supabase.com/dashboard
2. Select project: **sclvjrnnnbbptnhonoks**
3. Navigate to: **Authentication** → **Users**
4. Click: **"Add User"** or **"Invite User"**
5. Fill in:
   - **Email**: `milanbrezovac@gmail.com`
   - **Password**: (set any temporary password)
   - **Auto Confirm User**: ✅ (check this box)
6. Click: **"Create User"**

#### 2. Verify User Created

- User should appear in the users list
- Email should show as confirmed
- User ID should be: `03765a40-f338-4035-a2ba-8928fff30834` (if possible, but new UUID is also fine)

#### 3. Generate Password Reset Link

Run this command:

```bash
npm run admin-reset-password milanbrezovac@gmail.com
```

This will output a password reset link.

#### 4. Share with Client

Send the password reset link to the client. They can:
1. Click the link
2. Set a new password
3. Login with email and new password

## Alternative: Direct Login with Temporary Password

If you set a temporary password in Step 1, the client can:
1. Login directly with:
   - Email: `milanbrezovac@gmail.com`
   - Password: (temporary password you set)
2. Change password after login

## Files Created

1. **`scripts/setup-admin-login.ts`** - Full automated setup (currently failing due to API)
2. **`scripts/create-admin-user.ts`** - Simple admin creation (also failing)
3. **`scripts/generate-admin-password-reset.ts`** - ✅ **This works!** Use this after manual user creation
4. **`scripts/import-lovable-auth-users.ts`** - Bulk user import (failing due to API)

## Commands Available

```bash
# Generate password reset link (WORKS - use this!)
npm run admin-reset-password milanbrezovac@gmail.com

# Try automated setup (may fail due to API)
npm run setup-admin

# Try simple admin creation (may fail due to API)
npm run create-admin

# Check users and admins
npm run check-users
```

## Next Steps

1. ✅ Create admin user manually in Supabase Dashboard
2. ✅ Run `npm run admin-reset-password` to get reset link
3. ✅ Share link with client
4. ✅ Client sets password and logs in

## Troubleshooting

### "User not found" error when generating reset link

- Make sure user was created in Supabase Dashboard
- Verify email is exactly: `milanbrezovac@gmail.com`
- Check user appears in Authentication → Users list

### Client can't login after password reset

- Verify user email is confirmed in Supabase Dashboard
- Check if user is banned in `profiles` table (should be `is_banned = false`)
- Verify admin role exists in `user_roles` table

### Need to create more users

Currently, bulk import via API is not working. Options:
1. Create users manually one by one in Dashboard
2. Wait for Supabase API issue to resolve
3. Use Supabase CLI if available

## Contact

If issues persist, check:
- Supabase Dashboard for any project restrictions
- Service role key is correct
- Project is active and not paused
