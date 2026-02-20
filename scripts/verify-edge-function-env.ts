/**
 * Script to verify Edge Function environment variables are set correctly
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://sclvjrnnnbbptnhonoks.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function verifyEdgeFunctionEnv() {
  console.log('🔍 Verifying Edge Function Environment Variables...\n');
  
  if (!serviceRoleKey) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in .env file');
    console.log('\n💡 To fix:');
    console.log('1. Get service role key from Supabase Dashboard → Settings → API');
    console.log('2. Add to .env file: SUPABASE_SERVICE_ROLE_KEY=your-key-here');
    return;
  }
  
  console.log('✅ Service role key found in .env');
  console.log('   Key preview:', serviceRoleKey.substring(0, 30) + '...\n');
  
  // Verify it's a service role key
  try {
    const parts = serviceRoleKey.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      if (payload.role === 'service_role') {
        console.log('✅ Key is a service_role key');
        console.log('   Project ref:', payload.ref);
      } else {
        console.warn('⚠️  Key role:', payload.role, '(expected: service_role)');
      }
    }
  } catch (e) {
    console.warn('⚠️  Could not decode key (might still be valid)');
  }
  
  // Test the key by creating a client and making a query
  console.log('\n🧪 Testing service role key...');
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  });
  
  // Test 1: Query user_roles table (should work with service role)
  console.log('   Test 1: Querying user_roles table...');
  const { data: roles, error: rolesError } = await supabase
    .from('user_roles')
    .select('user_id, role')
    .limit(1);
  
  if (rolesError) {
    console.error('   ❌ Failed to query user_roles:', rolesError.message);
    console.error('   Code:', rolesError.code);
    console.error('   Details:', rolesError.details);
    console.error('   Hint:', rolesError.hint);
  } else {
    console.log('   ✅ Successfully queried user_roles table');
  }
  
  // Test 2: Call has_role RPC function
  console.log('   Test 2: Calling has_role RPC function...');
  const testUserId = '2dc4b37d-1706-4134-a8d1-a29b204e3606'; // Admin user ID
  const { data: hasAdminRole, error: rpcError } = await supabase
    .rpc('has_role', { _user_id: testUserId, _role: 'admin' });
  
  if (rpcError) {
    console.error('   ❌ Failed to call has_role RPC:', rpcError.message);
    console.error('   Code:', rpcError.code);
    console.error('   Details:', rpcError.details);
    console.error('   Hint:', rpcError.hint);
  } else {
    console.log('   ✅ Successfully called has_role RPC');
    console.log('   Result:', hasAdminRole);
  }
  
  // Test 3: Verify admin user exists
  console.log('   Test 3: Checking admin user...');
  const { data: adminRoles, error: adminError } = await supabase
    .from('user_roles')
    .select('user_id, role')
    .eq('role', 'admin')
    .limit(5);
  
  if (adminError) {
    console.error('   ❌ Failed to query admin roles:', adminError.message);
  } else {
    console.log('   ✅ Found', adminRoles?.length || 0, 'admin user(s)');
    if (adminRoles && adminRoles.length > 0) {
      console.log('   Admin user IDs:', adminRoles.map(r => r.user_id));
    }
  }
  
  console.log('\n📋 Summary:');
  console.log('   Service role key:', serviceRoleKey ? '✅ Found' : '❌ Missing');
  console.log('   Query user_roles:', rolesError ? '❌ Failed' : '✅ Works');
  console.log('   Call has_role RPC:', rpcError ? '❌ Failed' : '✅ Works');
  console.log('   Query admin roles:', adminError ? '❌ Failed' : '✅ Works');
  
  if (rolesError || rpcError || adminError) {
    console.log('\n⚠️  Issues detected!');
    console.log('\n💡 Next steps:');
    console.log('1. Verify SUPABASE_SERVICE_ROLE_KEY is correct in .env');
    console.log('2. Set the same key in Supabase Dashboard → Edge Functions → Settings → Secrets');
    console.log('3. Make sure the key name is: SUPABASE_SERVICE_ROLE_KEY (not SERVICE_ROLE_KEY)');
    console.log('4. Redeploy the function after setting environment variables');
  } else {
    console.log('\n✅ All tests passed! Service role key is working correctly.');
    console.log('\n💡 Make sure this same key is set in Supabase Dashboard → Edge Functions → Settings → Secrets');
  }
}

verifyEdgeFunctionEnv().catch(console.error);
