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

async function fixAdminPassword() {
  const adminEmail = 'milanbrezovac@gmail.com';
  const adminId = '2dc4b37d-1706-4134-a8d1-a29b204e3606';
  
  console.log('🔐 Fixing Admin Password...\n');
  console.log(`Email: ${adminEmail}`);
  console.log(`User ID: ${adminId}\n`);
  
  try {
    // Get user details
    const { data: userData, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(adminId);
    
    if (getUserError || !userData?.user) {
      console.error('❌ User not found:', getUserError?.message);
      process.exit(1);
    }
    
    const user = userData.user;
    
    console.log('📊 Current User Status:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`);
    console.log(`   Last Sign In: ${user.last_sign_in_at || 'Never'}`);
    console.log(`   Created: ${new Date(user.created_at).toLocaleString()}\n`);
    
    // Check if user has encrypted_password (means password is set)
    // We can't directly check this, but we can try to update the user
    
    console.log('🔧 Options to fix password:\n');
    console.log('Option 1: Generate new password reset link');
    console.log('Option 2: Set temporary password via Admin API');
    console.log('Option 3: Update user and trigger password reset\n');
    
    // Option 1: Generate fresh reset link
    console.log('📧 Generating fresh password reset link...\n');
    const { data: resetData, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: adminEmail,
      options: {
        redirectTo: 'https://misti-system.vercel.app',
      },
    });
    
    if (resetError) {
      console.error('❌ Failed to generate reset link:', resetError.message);
    } else {
      console.log('✅ Fresh Password Reset Link:');
      console.log('='.repeat(80));
      console.log(resetData.properties.action_link);
      console.log('='.repeat(80));
      console.log('\n📋 Instructions:');
      console.log('   1. Share this link with client');
      console.log('   2. Client clicks link');
      console.log('   3. Sets NEW password');
      console.log('   4. Login with new password\n');
    }
    
    // Option 2: Try to update user to ensure password can be set
    console.log('🔧 Updating user to ensure email is confirmed...\n');
    const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      adminId,
      {
        email_confirm: true,
      }
    );
    
    if (updateError) {
      console.error('⚠️  Update warning:', updateError.message);
    } else {
      console.log('✅ User updated (email confirmed)\n');
    }
    
    // Option 3: Check if we can set password directly
    console.log('💡 Alternative Solution:\n');
    console.log('If password reset link doesn\'t work, try:');
    console.log('1. Go to Supabase Dashboard → Authentication → Users');
    console.log(`2. Find: ${adminEmail}`);
    console.log('3. Click on user');
    console.log('4. Click "Send password reset email"');
    console.log('5. Client receives email and sets password\n');
    
    console.log('Or manually set password:');
    console.log('1. Supabase Dashboard → Authentication → Users');
    console.log(`2. Find: ${adminEmail}`);
    console.log('3. Click "Update User"');
    console.log('4. Set password directly');
    console.log('5. Save\n');
    
    console.log('='.repeat(80));
    console.log('✅ PASSWORD RESET LINK READY');
    console.log('='.repeat(80));
    console.log('\n🔗 Link:');
    console.log(resetData.properties.action_link);
    console.log('\n⚠️  If client says password doesn\'t work:');
    console.log('   - Make sure they click the reset link FIRST');
    console.log('   - Then set password via the link');
    console.log('   - Don\'t use the password from Dashboard invite');
    console.log('   - The reset link sets the actual password\n');
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixAdminPassword();
