/**
 * Test script to call the generate-product-fields Edge Function directly
 * This helps debug authentication issues
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://sclvjrnnnbbptnhonoks.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

async function testEdgeFunction() {
  console.log('🔍 Testing Edge Function Authentication...\n');
  
  // Create Supabase client
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  // Get current session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !session) {
    console.error('❌ No active session:', sessionError?.message);
    console.log('\n💡 Please log in first, then run this script again.');
    return;
  }
  
  console.log('✅ Session found:', {
    userId: session.user.id,
    email: session.user.email,
    expiresAt: new Date(session.expires_at! * 1000).toISOString()
  });
  
  // Test Edge Function call
  console.log('\n📞 Calling Edge Function...');
  
  const { data, error } = await supabase.functions.invoke('generate-product-fields', {
    body: {
      sourceUrl: 'https://example.com/test',
      gameId: 'test-game-id',
      categoryId: 'test-category-id',
      productType: 'simple'
    }
  });
  
  if (error) {
    console.error('\n❌ Edge Function Error:', {
      message: error.message,
      name: error.name,
      status: (error as any).status,
      details: (error as any).details,
      hint: (error as any).hint,
      fullError: JSON.stringify(error, Object.getOwnPropertyNames(error), 2)
    });
  } else {
    console.log('\n✅ Edge Function Response:', data);
  }
}

testEdgeFunction().catch(console.error);
