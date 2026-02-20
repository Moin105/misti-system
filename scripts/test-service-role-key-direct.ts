/**
 * Test service role key directly to verify it works
 * This helps identify if the key is correct or if permissions are missing
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://sclvjrnnnbbptnhonoks.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function testServiceRoleKey() {
  console.log('🔍 Testing Service Role Key Directly...\n');
  
  if (!serviceRoleKey) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in .env');
    console.log('\n💡 Add it to .env file:');
    console.log('   SUPABASE_SERVICE_ROLE_KEY=your-raw-service-role-key-here');
    return;
  }
  
  console.log('✅ Service role key found in .env');
  console.log('   Key preview:', serviceRoleKey.substring(0, 30) + '...');
  console.log('   Key length:', serviceRoleKey.length);
  
  // Verify it's a JWT
  const parts = serviceRoleKey.split('.');
  if (parts.length !== 3) {
    console.error('❌ Key is not a valid JWT (should have 3 parts separated by dots)');
    return;
  }
  
  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    console.log('   Key role:', payload.role);
    console.log('   Project ref:', payload.ref);
    
    if (payload.role !== 'service_role') {
      console.error('❌ Key is not a service_role key! Role:', payload.role);
      return;
    }
  } catch (e) {
    console.error('❌ Could not decode key:', e);
    return;
  }
  
  console.log('\n🧪 Testing key with Supabase client...\n');
  
  // Create client with service role key
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  });
  
  // Test 1: Query user_roles table
  console.log('Test 1: Querying user_roles table...');
  const { data: roles, error: rolesError } = await supabase
    .from('user_roles')
    .select('user_id, role')
    .limit(5);
  
  if (rolesError) {
    console.error('   ❌ FAILED:', rolesError.message);
    console.error('   Code:', rolesError.code);
    console.error('   Details:', rolesError.details);
    console.error('   Hint:', rolesError.hint);
  } else {
    console.log('   ✅ SUCCESS: Queried', roles?.length || 0, 'roles');
  }
  
  // Test 2: Call has_role RPC
  console.log('\nTest 2: Calling has_role RPC function...');
  const testUserId = '2dc4b37d-1706-4134-a8d1-a29b204e3606'; // Your admin user ID
  const { data: hasAdmin, error: rpcError } = await supabase
    .rpc('has_role', { _user_id: testUserId, _role: 'admin' });
  
  if (rpcError) {
    console.error('   ❌ FAILED:', rpcError.message);
    console.error('   Code:', rpcError.code);
    console.error('   Details:', rpcError.details);
    console.error('   Hint:', rpcError.hint);
  } else {
    console.log('   ✅ SUCCESS: has_role returned:', hasAdmin);
  }
  
  // Test 3: Check admin user
  console.log('\nTest 3: Checking admin user roles...');
  const { data: adminRoles, error: adminError } = await supabase
    .from('user_roles')
    .select('user_id, role')
    .eq('role', 'admin')
    .limit(5);
  
  if (adminError) {
    console.error('   ❌ FAILED:', adminError.message);
  } else {
    console.log('   ✅ SUCCESS: Found', adminRoles?.length || 0, 'admin users');
    if (adminRoles && adminRoles.length > 0) {
      console.log('   Admin IDs:', adminRoles.map(r => r.user_id));
    }
  }
  
  console.log('\n📋 Summary:');
  console.log('   Query user_roles:', rolesError ? '❌' : '✅');
  console.log('   Call has_role RPC:', rpcError ? '❌' : '✅');
  console.log('   Query admin roles:', adminError ? '❌' : '✅');
  
  if (rolesError || rpcError || adminError) {
    console.log('\n⚠️  Issues detected!');
    console.log('\n💡 If you see "permission denied for schema public":');
    console.log('   1. Run this SQL in Supabase Dashboard → SQL Editor:');
    console.log('      GRANT EXECUTE ON FUNCTION public.has_role(_user_id uuid, _role app_role) TO service_role;');
    console.log('      GRANT ALL ON public.user_roles TO service_role;');
    console.log('   2. Verify the key in .env matches Dashboard → Settings → API → service_role key');
    console.log('   3. Make sure you copied the RAW key, not a hash/encrypted version');
  } else {
    console.log('\n✅ All tests passed! Service role key is working.');
    console.log('\n💡 Now set this SAME key in Edge Functions → Settings → Secrets');
    console.log('   Name: SERVICE_ROLE_KEY');
    console.log('   Value: (paste the exact same key from .env)');
  }
}

testServiceRoleKey().catch(console.error);
