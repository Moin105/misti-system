import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 
  'https://sclvjrnnnbbptnhonoks.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY required!');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function generatePasswordReset() {
  const adminEmail = process.argv[2] || 'milanbrezovac@gmail.com';
  
  console.log(`🔐 Generating password reset link for: ${adminEmail}\n`);
  
  try {
    // Generate password reset link
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: adminEmail,
    });
    
    if (error) {
      console.error('❌ Error:', error.message);
      
      if (error.message.includes('User not found')) {
        console.error('\n⚠️  User not found in auth.users!');
        console.error('   Please run: npm run import-lovable-users');
        console.error('   This will import all users including admin.');
      }
      
      process.exit(1);
    }
    
    console.log('✅ Password reset link generated!\n');
    console.log('='.repeat(80));
    console.log('PASSWORD RESET LINK');
    console.log('='.repeat(80));
    console.log(data.properties.action_link);
    console.log('='.repeat(80));
    console.log('\n📧 Send this link to the admin user');
    console.log('   They can click it to set a new password');
    console.log('\n⚠️  Link expires in 1 hour (default Supabase setting)');
    
  } catch (error: any) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

generatePasswordReset();
