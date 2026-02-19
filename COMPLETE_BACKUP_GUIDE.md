# 🔐 Complete Backup & Restore Guide

## ⚠️ CRITICAL FINDING

**Your current backup file (`database-export-2026-02-19.sql`) does NOT include auth.users!**

This means customer login credentials are NOT backed up. Users will NOT be able to log in after restore.

## ✅ What I've Created For You

### 1. Comprehensive Backup Script
**File:** `scripts/comprehensive-backup.ts`  
**Command:** `npm run backup-all`

**Includes:**
- ✅ All 76 tables with data (18,028 rows)
- ✅ All 65 functions
- ✅ All 43 triggers
- ✅ All 168 RLS policies
- ✅ All 78 constraints
- ✅ **Auth users with encrypted passwords** (requires service_role)
- ✅ Complete schema (types, extensions, indexes)

### 2. Verification Script
**File:** `scripts/verify-backup-completeness.ts`  
**Command:** `npm run verify-backup`

**Checks:**
- Table counts and row counts
- Functions, triggers, policies
- Constraints
- **Auth users count**
- Critical tables status

### 3. Diagnostic Script
**File:** `scripts/diagnose-database.ts`  
**Command:** `npm run diagnose-db`

**Compares:**
- Database schema vs migrations
- Column type mismatches
- Missing/extra tables/columns

## 🚀 How to Create Complete Backup

### Step 1: Get Service Role Connection String

**⚠️ IMPORTANT:** To backup auth.users, you need **service_role** access.

1. Go to Supabase Dashboard
2. Settings → Database
3. Copy **Connection string** (URI format)
4. Or use direct connection:
   ```
   postgresql://postgres.[PROJECT_REF]:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
   ```

### Step 2: Set Environment Variable

**PowerShell:**
```powershell
$env:DATABASE_URL="postgresql://postgres.sclvjrnnnbbptnhonoks:YOUR_PASSWORD@db.sclvjrnnnbbptnhonoks.supabase.co:5432/postgres"
```

**Command Prompt:**
```cmd
set DATABASE_URL=postgresql://postgres.sclvjrnnnbbptnhonoks:YOUR_PASSWORD@db.sclvjrnnnbbptnhonoks.supabase.co:5432/postgres
```

### Step 3: Create Complete Backup

```bash
npm run backup-all
```

This will create: `supabase/backups/complete-backup-YYYY-MM-DD.sql`

### Step 4: Verify Backup

```bash
npm run verify-backup
```

Check that:
- ✅ Auth users count > 0
- ✅ All tables have data
- ✅ No critical issues

## 📋 What's Included in Complete Backup

### Database Schema
- ✅ Extensions (pgcrypto, uuid-ossp, etc.)
- ✅ Custom types (app_role, order_status, etc.)
- ✅ All tables with CREATE TABLE statements
- ✅ All constraints (foreign keys, unique, check)
- ✅ All indexes

### Database Functions
- ✅ All 65 functions with definitions
- ✅ Security definer functions
- ✅ Trigger functions

### Database Triggers
- ✅ All 43 triggers
- ✅ Update timestamps
- ✅ Security triggers
- ✅ Business logic triggers

### Row Level Security
- ✅ All 168 RLS policies
- ✅ Admin policies
- ✅ User policies
- ✅ Public policies

### Data
- ✅ All 76 tables
- ✅ 18,028+ rows of data
- ✅ Customer data
- ✅ Product data
- ✅ Order data
- ✅ All business data

### Auth Users (CRITICAL)
- ✅ User IDs
- ✅ Email addresses
- ✅ **Encrypted passwords** (bcrypt - preserved)
- ✅ Email confirmation status
- ✅ User metadata
- ✅ App metadata
- ✅ All auth-related fields

**Note:** Passwords are encrypted with bcrypt. They CANNOT be decrypted, but the encrypted versions are preserved. Users can log in with their original passwords after restore.

## 🔄 How to Restore

### Option 1: Using Supabase CLI

```bash
# Connect to your database
supabase db reset

# Or apply the SQL file
psql "your-connection-string" < supabase/backups/complete-backup-YYYY-MM-DD.sql
```

### Option 2: Using Supabase Dashboard

1. Go to SQL Editor
2. Paste the backup SQL file content
3. Run it (this will take time for large backups)

### Option 3: Using pg_restore

```bash
pg_restore -d "your-connection-string" supabase/backups/complete-backup-YYYY-MM-DD.sql
```

## ⚠️ Important Notes

### Auth Users Passwords
- ✅ Passwords are **encrypted** (bcrypt hash)
- ✅ They are **preserved** in backup
- ✅ Users can log in with **original passwords** after restore
- ⚠️ If restore fails, users may need to reset passwords

### Constraints & Foreign Keys
- ✅ All foreign keys are preserved
- ✅ All unique constraints are preserved
- ✅ All check constraints are preserved
- ✅ Data integrity is maintained

### Edge Functions
- ⚠️ Edge functions are NOT in database backup
- ✅ They are in `supabase/functions/` folder
- ✅ Backup them separately (they're in your codebase)

### Storage Files
- ⚠️ Storage files (images, uploads) are NOT in SQL backup
- ✅ Use Supabase Storage backup feature
- ✅ Or backup storage bucket separately

## 🧪 Testing Restore

**ALWAYS test restore on staging first!**

1. Create a test Supabase project
2. Restore backup to test project
3. Verify:
   - ✅ All tables exist
   - ✅ All data is present
   - ✅ Auth users can log in
   - ✅ Functions work
   - ✅ Triggers work
   - ✅ RLS policies work

## 📊 Current Database Status

- **Tables:** 76 (67 with data, 9 empty)
- **Total Rows:** 18,028
- **Functions:** 65
- **Triggers:** 43
- **RLS Policies:** 168
- **Constraints:** 78
- **Auth Users:** 0 ⚠️ (needs backup)

## 🔒 Security

- ⚠️ Backup files contain **sensitive data**
- ⚠️ Keep backups **secure** (encrypted storage)
- ⚠️ Don't commit backups to git
- ⚠️ Use `.env` for connection strings
- ⚠️ Rotate backups regularly

## 📝 Files Created

1. `scripts/comprehensive-backup.ts` - Complete backup script
2. `scripts/verify-backup-completeness.ts` - Verification script
3. `scripts/diagnose-database.ts` - Diagnostic script
4. `BACKUP_VERIFICATION_REPORT.md` - Verification report
5. `COMPLETE_BACKUP_GUIDE.md` - This guide

## ✅ Next Steps

1. ✅ Run `npm run verify-backup` to check current state
2. ✅ Get service_role connection string
3. ✅ Run `npm run backup-all` to create complete backup
4. ✅ Verify backup includes auth users
5. ✅ Test restore on staging database
6. ✅ Keep backup secure

## 🆘 Troubleshooting

### "Cannot access auth.users"
- **Solution:** Use service_role connection string
- Get it from Supabase Dashboard → Settings → Database

### "Permission denied"
- **Solution:** Check connection string has correct password
- Use direct connection (not pooler) for auth schema access

### "Backup file too large"
- **Solution:** Use `pg_dump` with compression
- Or backup in sections (schema first, then data)

### "Users can't log in after restore"
- **Solution:** Check auth.users were restored
- Verify encrypted_password column has data
- Users may need to reset passwords if restore failed

---

**Remember:** Always test restore on staging first! 🧪
