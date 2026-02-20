/**
 * Check product_rewards table RLS policies and permissions
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const { Pool } = pg;

async function checkProductRewardsPolicies() {
  const dbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
  
  if (!dbUrl) {
    console.error('❌ SUPABASE_DB_URL or DATABASE_URL not found in .env');
    return;
  }

  const pool = new Pool({
    connectionString: dbUrl,
  });

  try {
    console.log('🔍 Checking product_rewards table policies and permissions...\n');

    // 1. Check RLS policies
    console.log('1. RLS Policies:');
    const { rows: policies } = await pool.query(`
      SELECT 
        policyname,
        permissive,
        roles,
        cmd,
        qual,
        with_check
      FROM pg_policies
      WHERE schemaname = 'public' 
      AND tablename = 'product_rewards'
      ORDER BY policyname;
    `);
    
    if (policies.length > 0) {
      policies.forEach((policy: any) => {
        console.log(`   Policy: ${policy.policyname}`);
        console.log(`   Command: ${policy.cmd}`);
        console.log(`   Roles: ${policy.roles}`);
        console.log(`   Using: ${policy.qual || 'N/A'}`);
        console.log(`   With Check: ${policy.with_check || 'N/A'}`);
        console.log('');
      });
    } else {
      console.log('   ⚠️  No policies found!');
    }

    // 2. Check GRANT permissions
    console.log('2. GRANT Permissions:');
    const { rows: grants } = await pool.query(`
      SELECT grantee, privilege_type 
      FROM information_schema.role_table_grants 
      WHERE table_schema = 'public' 
      AND table_name = 'product_rewards'
      AND grantee IN ('authenticated', 'anon', 'service_role')
      ORDER BY grantee, privilege_type;
    `);
    
    if (grants.length > 0) {
      grants.forEach((grant: any) => {
        console.log(`   ${grant.grantee}: ${grant.privilege_type}`);
      });
    } else {
      console.log('   ⚠️  No grants found!');
    }

    // 3. Check if RLS is enabled
    console.log('\n3. RLS Status:');
    const { rows: rlsStatus } = await pool.query(`
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename = 'product_rewards';
    `);
    
    if (rlsStatus.length > 0) {
      console.log(`   RLS Enabled: ${rlsStatus[0].rowsecurity ? '✅ Yes' : '❌ No'}`);
    }

    // 4. Test has_role function
    console.log('\n4. Testing has_role function:');
    const testUserId = '2dc4b37d-1706-4134-a8d1-a29b204e3606'; // Admin user
    const { rows: hasRoleTest } = await pool.query(`
      SELECT public.has_role($1::uuid, 'admin'::app_role) as is_admin;
    `, [testUserId]);
    
    console.log(`   User ${testUserId} is admin: ${hasRoleTest[0]?.is_admin ? '✅ Yes' : '❌ No'}`);

    // 5. Check user_roles for admin
    console.log('\n5. Checking user_roles:');
    const { rows: userRoles } = await pool.query(`
      SELECT user_id, role 
      FROM public.user_roles 
      WHERE user_id = $1 AND role = 'admin';
    `, [testUserId]);
    
    if (userRoles.length > 0) {
      console.log(`   ✅ Admin role found for user`);
    } else {
      console.log(`   ❌ No admin role found for user`);
    }

    console.log('\n✅ Check complete!');
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.code) {
      console.error('   Code:', error.code);
    }
  } finally {
    await pool.end();
  }
}

checkProductRewardsPolicies().catch(console.error);
