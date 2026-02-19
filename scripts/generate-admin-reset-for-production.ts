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

async function generateResetLink() {
  const adminEmail = 'milanbrezovac@gmail.com';
  const productionUrl = 'https://misti-system.vercel.app';
  
  console.log('🔐 Generating password reset link for PRODUCTION...\n');
  console.log(`Email: ${adminEmail}`);
  console.log(`Production URL: ${productionUrl}\n`);
  
  try {
    // Check if user exists
    const { data: userList } = await supabaseAdmin.auth.admin.listUsers();
    const adminUser = userList?.users.find(u => u.email === adminEmail);
    
    if (!adminUser) {
      console.error('❌ User not found in auth.users!');
      console.error('\nPlease create the user first:');
      console.error('1. Go to Supabase Dashboard → Authentication → Users');
      console.error('2. Click "Add User"');
      console.error('3. Email: milanbrezovac@gmail.com');
      console.error('4. Set password and confirm email');
      console.error('5. Then run this script again\n');
      process.exit(1);
    }
    
    console.log('✅ User found in auth.users\n');
    
    // Generate password reset link with production redirect
    const { data: resetData, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: adminEmail,
      options: {
        redirectTo: `${productionUrl}/`,
      },
    });
    
    if (resetError) {
      throw resetError;
    }
    
    console.log('='.repeat(80));
    console.log('✅ PASSWORD RESET LINK GENERATED FOR PRODUCTION');
    console.log('='.repeat(80));
    console.log('\n📧 Admin Email:');
    console.log(`   ${adminEmail}\n`);
    console.log('🔗 Password Reset Link:');
    console.log(`   ${resetData.properties.action_link}\n`);
    console.log('📋 Instructions for Client:');
    console.log('   1. Click the link above');
    console.log('   2. Set a new password');
    console.log('   3. You will be redirected to: https://misti-system.vercel.app');
    console.log('   4. Login with email and new password\n');
    console.log('⚠️  Important Notes:');
    console.log('   - Link expires in 1 hour');
    console.log('   - Link works on production URL: https://misti-system.vercel.app');
    console.log('   - Share this link securely with client\n');
    
    // Also save to file
    const fs = await import('fs');
    const path = await import('path');
    
    const exportsDir = path.join(process.cwd(), 'supabase', 'exports');
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }
    
    const infoFile = path.join(exportsDir, 'admin-reset-link-production.txt');
    fs.writeFileSync(infoFile, `
Admin Password Reset Link - PRODUCTION
Generated: ${new Date().toISOString()}

Email: ${adminEmail}
Production URL: ${productionUrl}

Password Reset Link:
${resetData.properties.action_link}

Instructions:
1. Click the link above
2. Set a new password
3. You will be redirected to production site
4. Login with email and new password

Note: Link expires in 1 hour
`.trim());
    
    console.log(`📄 Link saved to: ${infoFile}\n`);
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('\n💡 Alternative Solutions:');
    console.error('   1. Create user manually in Supabase Dashboard');
    console.error('   2. Set temporary password in Dashboard');
    console.error('   3. Client can login directly with temporary password');
    console.error('   4. Then change password after login\n');
    process.exit(1);
  }
}

generateResetLink();
