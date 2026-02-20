/**
 * Test script for generate-product-fields Edge Function
 * This helps verify the function is working and environment variables are set
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://sclvjrnnnbbptnhonoks.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

async function testGenerateProductFields() {
  console.log('🧪 Testing generate-product-fields Edge Function...\n');
  
  if (!supabaseAnonKey) {
    console.error('❌ NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY not found in .env');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  // Get current session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !session) {
    console.error('❌ Not authenticated. Please log in first.');
    console.log('\n💡 To test:');
    console.log('1. Log in to your app');
    console.log('2. Then run this script again');
    return;
  }
  
  console.log('✅ Authenticated as:', session.user.email);
  console.log('   User ID:', session.user.id);
  console.log('   Token preview:', session.access_token.substring(0, 30) + '...\n');
  
  // Check if user is admin
  const { data: adminCheck, error: adminError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', session.user.id)
    .eq('role', 'admin')
    .maybeSingle();
  
  if (adminError) {
    console.error('⚠️  Could not check admin role:', adminError.message);
  } else if (!adminCheck) {
    console.error('❌ User is not an admin. This function requires admin access.');
    return;
  } else {
    console.log('✅ User has admin role\n');
  }
  
  // Test the Edge Function
  console.log('📞 Calling generate-product-fields Edge Function...\n');
  
  const testPayload = {
    sourceUrl: 'https://www.amazon.com/Dear-Debbie-Freida-McFadden-ebook/dp/B0FJTF5MJB',
    gameId: '0a0f2234-e160-4ca5-84ed-78cd26249f41',
    categoryId: '1e965791-8265-4fe4-bcbe-30086fcf5810',
    productType: 'simple' as const,
    gameName: 'test game',
    categoryName: 'test game category'
  };
  
  console.log('Request payload:', JSON.stringify(testPayload, null, 2));
  console.log('\n');
  
  const { data, error } = await supabase.functions.invoke('generate-product-fields', {
    body: testPayload,
  });
  
  if (error) {
    console.error('❌ Function call failed:');
    console.error('   Error:', error);
    
    // Try to extract detailed error
    if (error.context) {
      console.error('   Context:', error.context);
    }
    
    // If it's a FunctionsHttpError, try to read the body
    if ((error as any).context?.body) {
      try {
        const body = typeof (error as any).context.body === 'string' 
          ? JSON.parse((error as any).context.body)
          : (error as any).context.body;
        console.error('   Error details:', JSON.stringify(body, null, 2));
      } catch (e) {
        console.error('   Could not parse error body');
      }
    }
    
    console.log('\n💡 Check:');
    console.log('1. Edge Function logs in Supabase Dashboard');
    console.log('2. Environment variables are set (SUPABASE_SERVICE_ROLE_KEY, etc.)');
    console.log('3. Service role key has proper permissions');
  } else {
    console.log('✅ Function call successful!');
    console.log('Response:', JSON.stringify(data, null, 2));
  }
}

testGenerateProductFields().catch(console.error);
