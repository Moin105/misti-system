import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

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

async function setPasswordDirect() {
  const adminEmail = 'milanbrezovac@gmail.com';
  const adminId = '2dc4b37d-1706-4134-a8d1-a29b204e3606';
  const password = process.argv[2] || '2_,L._aP^FP~Q:%';
  
  console.log('🔐 Setting Admin Password Directly...\n');
  console.log(`Email: ${adminEmail}`);
  console.log(`User ID: ${adminId}`);
  console.log(`Password: ${'*'.repeat(password.length)}\n`);
  
  try {
    // Update user with password
    console.log('🔄 Setting password...');
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      adminId,
      {
        password: password,
        email_confirm: true,
      }
    );
    
    if (error) {
      console.error('❌ Error:', error.message);
      console.error('\n💡 Trying alternative method...\n');
      
      // Alternative: Try to generate magic link with auto-confirm
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: adminEmail,
        options: {
          redirectTo: 'https://misti-system.vercel.app',
        },
      });
      
      if (linkError) {
        console.error('❌ Magic link also failed:', linkError.message);
        console.error('\n⚠️  Supabase Admin API may not support direct password setting.');
        console.error('\n💡 Solution: Use Supabase Dashboard');
        console.error('   1. Go to: https://supabase.com/dashboard');
        console.error('   2. Authentication → Users');
        console.error(`   3. Find: ${adminEmail}`);
        console.error('   4. Click "Update User"');
        console.error('   5. Set password field');
        console.error('   6. Save\n');
        process.exit(1);
      }
      
      console.log('✅ Magic link generated (alternative method)');
      console.log('   Link:', linkData.properties.action_link);
      return;
    }
    
    console.log('✅ Password set successfully!\n');
    console.log('='.repeat(80));
    console.log('✅ PASSWORD SET COMPLETE');
    console.log('='.repeat(80));
    console.log(`\n📧 Login Credentials:`);
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${password}`);
    console.log(`\n🌐 Login URL: https://misti-system.vercel.app`);
    console.log(`\n✅ Client can now login directly with these credentials!`);
    console.log(`\n⚠️  Note: Password is set. Client should be able to login now.`);
    
  } catch (error: any) {
    console.error('❌ Fatal error:', error.message);
    console.error('\n💡 Alternative: Set password via Supabase Dashboard');
    console.error('   1. Go to: https://supabase.com/dashboard');
    console.error('   2. Authentication → Users');
    console.error(`   3. Find: ${adminEmail}`);
    console.error('   4. Click "Update User"');
    console.error('   5. Enter password in password field');
    console.error('   6. Save\n');
    process.exit(1);
  }
}

setPasswordDirect();
