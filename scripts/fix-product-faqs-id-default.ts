/**
 * Fix product_faqs.id default value using Supabase REST API
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

async function fixProductFaqsIdDefault() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required in .env');
    console.error('   Using Supabase REST API to run SQL...');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false }
  });

  try {
    console.log('🔧 Fixing product_faqs.id default value...\n');

    // Use RPC to run the ALTER TABLE command
    // Note: Supabase doesn't have a direct SQL execution endpoint
    // We need to use the database connection string or run via Dashboard
    
    console.log('⚠️  Supabase JS client cannot execute DDL statements directly.');
    console.log('📝 Please run this SQL in Supabase Dashboard → SQL Editor:\n');
    console.log('   ALTER TABLE public.product_faqs');
    console.log('   ALTER COLUMN id SET DEFAULT gen_random_uuid();\n');
    
    // Alternative: Check if we can use PostgREST to verify the current state
    const { data: tableInfo, error } = await supabase
      .rpc('exec_sql', { 
        sql: `SELECT column_default FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'product_faqs' AND column_name = 'id'` 
      });
    
    if (error) {
      console.log('ℹ️  Cannot check current state via API. Please run the SQL manually.\n');
    } else {
      console.log('Current default:', tableInfo || 'NULL');
    }
    
    console.log('\n✅ Instructions provided above. Run the SQL in Dashboard to complete the fix.');
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.log('\n📝 Please run this SQL manually in Supabase Dashboard → SQL Editor:');
    console.log('   ALTER TABLE public.product_faqs ALTER COLUMN id SET DEFAULT gen_random_uuid();');
  }
}

fixProductFaqsIdDefault().catch(console.error);
