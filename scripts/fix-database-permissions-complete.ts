/**
 * Complete database permissions fix for Edge Functions
 * This fixes "permission denied for schema public" errors
 */

import pg from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

async function fixDatabasePermissions() {
  // Try multiple possible env var names
  const dbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
  
  if (!dbUrl) {
    console.error('❌ SUPABASE_DB_URL or DATABASE_URL not found in .env');
    console.log('\n💡 Please set one of these in your .env file:');
    console.log('   SUPABASE_DB_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres');
    console.log('   OR');
    console.log('   DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres');
    return;
  }

  const pool = new Pool({
    connectionString: dbUrl,
  });

  try {
    console.log('🔧 Fixing Database Permissions for Edge Functions...\n');

    // 1. Grant EXECUTE on has_role function
    console.log('1. Granting EXECUTE on has_role function...');
    try {
      await pool.query(`
        GRANT EXECUTE ON FUNCTION public.has_role(_user_id uuid, _role app_role) TO service_role;
      `);
      console.log('   ✅ Granted EXECUTE to service_role');
    } catch (e: any) {
      if (e.code === '42704') {
        console.log('   ⚠️  Function does not exist (might be in different schema)');
      } else {
        console.error('   ❌ Error:', e.message);
      }
    }

    try {
      await pool.query(`
        GRANT EXECUTE ON FUNCTION public.has_role(_user_id uuid, _role app_role) TO authenticated;
      `);
      console.log('   ✅ Granted EXECUTE to authenticated');
    } catch (e: any) {
      console.error('   ⚠️  Error granting to authenticated:', e.message);
    }

    // 2. Grant ALL on user_roles table to service_role
    console.log('\n2. Granting ALL permissions on user_roles table...');
    try {
      await pool.query(`
        GRANT ALL ON public.user_roles TO service_role;
      `);
      console.log('   ✅ Granted ALL on user_roles to service_role');
    } catch (e: any) {
      console.error('   ❌ Error:', e.message);
    }

    // 3. Grant USAGE on public schema
    console.log('\n3. Granting USAGE on public schema...');
    try {
      await pool.query(`
        GRANT USAGE ON SCHEMA public TO service_role;
      `);
      console.log('   ✅ Granted USAGE on schema public to service_role');
    } catch (e: any) {
      console.error('   ⚠️  Error:', e.message);
    }

    // 4. Grant SELECT on user_roles to authenticated (for RLS policies)
    console.log('\n4. Granting SELECT on user_roles to authenticated...');
    try {
      await pool.query(`
        GRANT SELECT ON public.user_roles TO authenticated;
      `);
      console.log('   ✅ Granted SELECT to authenticated');
    } catch (e: any) {
      console.error('   ⚠️  Error:', e.message);
    }

    // 5. Verify has_role function exists and check its definition
    console.log('\n5. Verifying has_role function...');
    try {
      const { rows } = await pool.query(`
        SELECT 
          p.proname as function_name,
          pg_get_function_identity_arguments(p.oid) as arguments,
          p.prosecdef as is_security_definer,
          p.proacl as acl
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' 
        AND p.proname = 'has_role';
      `);
      
      if (rows.length > 0) {
        console.log('   ✅ has_role function exists');
        console.log('   Arguments:', rows[0].arguments);
        console.log('   Security definer:', rows[0].is_security_definer);
      } else {
        console.log('   ⚠️  has_role function not found in public schema');
      }
    } catch (e: any) {
      console.error('   ⚠️  Error checking function:', e.message);
    }

    // 6. Check current permissions on user_roles
    console.log('\n6. Checking current permissions on user_roles table...');
    try {
      const { rows } = await pool.query(`
        SELECT 
          grantee,
          privilege_type
        FROM information_schema.role_table_grants
        WHERE table_schema = 'public' 
        AND table_name = 'user_roles'
        AND grantee IN ('service_role', 'authenticated');
      `);
      
      if (rows.length > 0) {
        console.log('   Current permissions:');
        rows.forEach((row: any) => {
          console.log(`   - ${row.grantee}: ${row.privilege_type}`);
        });
      } else {
        console.log('   ⚠️  No permissions found for service_role or authenticated');
      }
    } catch (e: any) {
      console.error('   ⚠️  Error checking permissions:', e.message);
    }

    // 7. Test query with service_role (if we can)
    console.log('\n7. Testing service_role permissions...');
    try {
      // This will only work if we're connected as service_role
      const { rows } = await pool.query(`
        SELECT COUNT(*) as count FROM public.user_roles LIMIT 1;
      `);
      console.log('   ✅ Can query user_roles table');
    } catch (e: any) {
      console.log('   ⚠️  Cannot test directly (expected if not connected as service_role)');
      console.log('   Error:', e.message);
    }

    console.log('\n✅ Permission fixes applied!');
    console.log('\n💡 Next steps:');
    console.log('1. Test the Edge Function again');
    console.log('2. If still getting errors, check function logs in Dashboard');
    console.log('3. Verify SERVICE_ROLE_KEY secret is set with RAW JWT token (not hash)');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    if (error.code) {
      console.error('   Code:', error.code);
    }
    if (error.detail) {
      console.error('   Detail:', error.detail);
    }
  } finally {
    await pool.end();
  }
}

fixDatabasePermissions().catch(console.error);
