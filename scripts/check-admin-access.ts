import { createClient } from '@supabase/supabase-js';
import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 
  'https://sclvjrnnnbbptnhonoks.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const dbUrl = process.env.DATABASE_URL || 
  'postgresql://postgres.sclvjrnnnbbptnhonoks:V4FsoNxRkH8LR3Bj@aws-0-us-west-2.pooler.supabase.com:6543/postgres';

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY required!');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

function encodeConnectionString(connString: string): string {
  try {
    const url = new URL(connString);
    if (url.password) {
      url.password = encodeURIComponent(url.password);
    }
    return url.toString();
  } catch {
    return connString;
  }
}

function parseConnectionString(connString: string) {
  try {
    const url = new URL(connString);
    return {
      host: url.hostname,
      port: parseInt(url.port) || 5432,
      database: url.pathname.slice(1) || 'postgres',
      user: url.username || 'postgres',
      password: decodeURIComponent(url.password || ''),
      ssl: { rejectUnauthorized: false }
    };
  } catch (error: any) {
    throw new Error(`Invalid connection string: ${error.message}`);
  }
}

async function checkAdminAccess() {
  const adminEmail = 'milanbrezovac@gmail.com';
  const adminId = '2dc4b37d-1706-4134-a8d1-a29b204e3606';
  
  console.log('🔍 Checking Admin Access...\n');
  console.log(`Email: ${adminEmail}`);
  console.log(`User ID: ${adminId}\n`);
  
  // Connect to database
  const dbConfig = parseConnectionString(encodeConnectionString(dbUrl));
  const client = new Client(dbConfig);
  
  try {
    await client.connect();
    console.log('✅ Connected to database\n');
    
    // Check user_roles table
    console.log('='.repeat(80));
    console.log('1. USER_ROLES TABLE CHECK');
    console.log('='.repeat(80));
    
    const rolesQuery = await client.query(`
      SELECT id, user_id, role, created_at
      FROM public.user_roles
      WHERE user_id = $1
      ORDER BY created_at DESC
    `, [adminId]);
    
    console.log(`\nFound ${rolesQuery.rows.length} role(s) for this user:\n`);
    
    if (rolesQuery.rows.length === 0) {
      console.log('❌ NO ROLES FOUND! User has no roles assigned.');
    } else {
      rolesQuery.rows.forEach((row, idx) => {
        console.log(`${idx + 1}. Role: ${row.role}`);
        console.log(`   ID: ${row.id}`);
        console.log(`   Created: ${row.created_at}`);
        console.log(`   ${row.role === 'admin' ? '✅ ADMIN ROLE' : '⚠️  NOT ADMIN'}\n`);
      });
    }
    
    // Check if admin role exists
    const adminRoles = rolesQuery.rows.filter(r => r.role === 'admin');
    console.log(`\n📊 Summary: ${adminRoles.length} admin role(s), ${rolesQuery.rows.length - adminRoles.length} other role(s)`);
    
    // Test the exact query used by Admin.tsx
    console.log('\n' + '='.repeat(80));
    console.log('2. TESTING ADMIN.TSX QUERY');
    console.log('='.repeat(80));
    
    const adminCheckQuery = await client.query(`
      SELECT role
      FROM public.user_roles
      WHERE user_id = $1
        AND role = 'admin'
      LIMIT 1
    `, [adminId]);
    
    if (adminCheckQuery.rows.length > 0) {
      console.log('\n✅ Admin check query SUCCESS - Should have access!');
      console.log(`   Found role: ${adminCheckQuery.rows[0].role}`);
    } else {
      console.log('\n❌ Admin check query FAILED - No admin role found!');
    }
    
    // Check via Supabase client (as frontend would)
    console.log('\n' + '='.repeat(80));
    console.log('3. TESTING SUPABASE CLIENT QUERY (Frontend Method)');
    console.log('='.repeat(80));
    
    const { data: supabaseRoles, error: supabaseError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', adminId)
      .eq('role', 'admin')
      .maybeSingle();
    
    if (supabaseError) {
      console.log(`\n❌ Supabase query error: ${supabaseError.message}`);
      console.log(`   Code: ${supabaseError.code}`);
      console.log(`   Details: ${supabaseError.details}`);
    } else if (supabaseRoles) {
      console.log('\n✅ Supabase query SUCCESS - Should have access!');
      console.log(`   Found role: ${supabaseRoles.role}`);
    } else {
      console.log('\n❌ Supabase query returned NULL - No admin role found!');
    }
    
    // Check RLS policies
    console.log('\n' + '='.repeat(80));
    console.log('4. CHECKING RLS POLICIES');
    console.log('='.repeat(80));
    
    const rlsQuery = await client.query(`
      SELECT 
        schemaname,
        tablename,
        policyname,
        permissive,
        roles,
        cmd,
        qual,
        with_check
      FROM pg_policies
      WHERE tablename = 'user_roles'
        AND schemaname = 'public'
    `);
    
    console.log(`\nFound ${rlsQuery.rows.length} RLS policy/policies for user_roles:\n`);
    rlsQuery.rows.forEach((policy, idx) => {
      console.log(`${idx + 1}. ${policy.policyname}`);
      console.log(`   Command: ${policy.cmd}`);
      console.log(`   Roles: ${policy.roles}`);
      console.log(`   Using: ${policy.qual || 'N/A'}`);
      console.log(`   With Check: ${policy.with_check || 'N/A'}\n`);
    });
    
    // Check auth.users
    console.log('='.repeat(80));
    console.log('5. AUTH.USERS CHECK');
    console.log('='.repeat(80));
    
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(adminId);
    
    if (authError) {
      console.log(`\n❌ Auth user error: ${authError.message}`);
    } else if (authUser) {
      console.log('\n✅ Auth user found:');
      console.log(`   Email: ${authUser.user.email}`);
      console.log(`   Email Confirmed: ${authUser.user.email_confirmed_at ? 'Yes' : 'No'}`);
      console.log(`   Last Sign In: ${authUser.user.last_sign_in_at || 'Never'}`);
    }
    
    // Final recommendation
    console.log('\n' + '='.repeat(80));
    console.log('6. RECOMMENDATIONS');
    console.log('='.repeat(80));
    
    if (adminRoles.length === 0) {
      console.log('\n❌ ISSUE: No admin role found!');
      console.log('\n💡 Solution: Assign admin role');
      console.log('   Run: npm run verify-admin');
    } else if (adminRoles.length > 1) {
      console.log('\n⚠️  WARNING: Multiple admin roles found!');
      console.log('   This might cause issues. Consider cleaning up duplicates.');
    } else {
      console.log('\n✅ Admin role exists!');
      console.log('\n💡 If still no access, check:');
      console.log('   1. Browser cache - Clear and hard refresh');
      console.log('   2. Session - Logout and login again');
      console.log('   3. RLS policies - Ensure user_roles is readable');
      console.log('   4. Network tab - Check for 401/403 errors');
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await client.end();
  }
}

checkAdminAccess();
