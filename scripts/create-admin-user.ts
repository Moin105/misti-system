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

async function createAdminUser() {
  const adminEmail = 'milanbrezovac@gmail.com';
  const adminId = '03765a40-f338-4035-a2ba-8928fff30834';
  const tempPassword = `TempPass${Date.now()}!`; // Temporary password
  
  console.log('🔐 Creating admin user...\n');
  console.log(`Email: ${adminEmail}`);
  console.log(`Temporary Password: ${tempPassword}\n`);
  
  try {
    // Check if user already exists
    const { data: existing } = await supabaseAdmin.auth.admin.getUserById(adminId);
    
    if (existing?.user) {
      console.log('✅ Admin user already exists!\n');
      console.log('Generating password reset link...\n');
    } else {
      // Create user with temporary password
      console.log('Creating new admin user...');
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        id: adminId,
        email: adminEmail,
        email_confirm: true,
        password: tempPassword,
        user_metadata: {
          full_name: 'milan brezovac',
          email_verified: true,
        },
      });
      
      if (createError) {
        // Try without ID
        console.log('⚠️  Failed with UUID, trying without...');
        const { data: newUser2, error: createError2 } = await supabaseAdmin.auth.admin.createUser({
          email: adminEmail,
          email_confirm: true,
          password: tempPassword,
          user_metadata: {
            full_name: 'milan brezovac',
            email_verified: true,
            original_id: adminId,
          },
        });
        
        if (createError2) {
          throw createError2;
        }
        
        console.log('✅ Admin user created (new UUID assigned)\n');
        console.log(`New User ID: ${newUser2.user.id}\n`);
        console.log('⚠️  Note: UUID changed. You may need to update profiles table.\n');
      } else {
        console.log('✅ Admin user created!\n');
      }
    }
    
    // Generate password reset link
    const { data: resetData, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: adminEmail,
    });
    
    if (resetError) {
      throw resetError;
    }
    
    console.log('='.repeat(80));
    console.log('✅ ADMIN USER READY!');
    console.log('='.repeat(80));
    console.log('\n📧 Login Credentials:');
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Temporary Password: ${tempPassword}`);
    console.log('\n🔗 Password Reset Link (Recommended):');
    console.log('   ' + resetData.properties.action_link);
    console.log('\n📋 Instructions for Client:');
    console.log('   Option 1: Use temporary password above to login, then change password');
    console.log('   Option 2: Click reset link to set new password directly');
    console.log('\n⚠️  Note: Reset link expires in 1 hour\n');
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('\n💡 Alternative: Create admin user manually via Supabase Dashboard:');
    console.error('   1. Go to https://supabase.com/dashboard');
    console.error('   2. Select project: sclvjrnnnbbptnhonoks');
    console.error('   3. Authentication → Users → Add User');
    console.error('   4. Email: milanbrezovac@gmail.com');
    console.error('   5. Set password and confirm email');
    console.error('   6. Then run: npm run admin-reset-password\n');
    process.exit(1);
  }
}

createAdminUser();
