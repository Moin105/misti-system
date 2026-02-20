/**
 * Grant EXECUTE permission on has_role function to service_role
 * This fixes "permission denied for schema public" errors in Edge Functions
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const { Pool } = pg;

async function grantHasRolePermissions() {
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
    console.log('🔧 Granting EXECUTE permission on has_role function...\n');

    // Grant to service_role
    await pool.query(`
      GRANT EXECUTE ON FUNCTION public.has_role(_user_id uuid, _role app_role) TO service_role;
    `);
    console.log('✅ Granted EXECUTE to service_role');

    // Grant to authenticated (for frontend checks)
    await pool.query(`
      GRANT EXECUTE ON FUNCTION public.has_role(_user_id uuid, _role app_role) TO authenticated;
    `);
    console.log('✅ Granted EXECUTE to authenticated');

    // Grant service_role full access to user_roles table
    await pool.query(`
      GRANT ALL ON public.user_roles TO service_role;
    `);
    console.log('✅ Granted ALL on user_roles to service_role');

    console.log('\n✅ All permissions granted successfully!');
    console.log('\n💡 Now test the Edge Function again.');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.code) {
      console.error('   Code:', error.code);
    }
  } finally {
    await pool.end();
  }
}

grantHasRolePermissions().catch(console.error);
