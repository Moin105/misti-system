import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 
  'https://sclvjrnnnbbptnhonoks.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY required!');
  console.error('   Set it in .env file or as environment variable');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

interface LovableUser {
  id: string;
  email: string;
  phone: string | null;
  raw_user_meta_data: {
    sub?: string;
    email?: string;
    full_name?: string;
    email_verified?: boolean;
    phone_verified?: boolean;
    [key: string]: any;
  };
  created_at: string;
  email_confirmed_at: string | null;
  last_sign_in_at: string | null;
}

async function importUsers() {
  const sqlFile = path.join(process.cwd(), 'supabase', 'migrations', 'lovable-auth-users-export.sql');
  
  if (!fs.existsSync(sqlFile)) {
    console.error(`❌ File not found: ${sqlFile}`);
    process.exit(1);
  }

  console.log('📄 Reading SQL file...\n');
  const content = fs.readFileSync(sqlFile, 'utf-8');
  
  // Extract JSON from comments
  const jsonStart = content.indexOf('AUTH_USERS_JSON_START');
  const jsonEnd = content.indexOf('AUTH_USERS_JSON_END');
  
  if (jsonStart === -1 || jsonEnd === -1) {
    console.error('❌ JSON section not found in file');
    console.error('   Expected markers: AUTH_USERS_JSON_START and AUTH_USERS_JSON_END');
    process.exit(1);
  }
  
  const jsonContent = content.substring(
    jsonStart + 'AUTH_USERS_JSON_START'.length, 
    jsonEnd
  ).trim();
  
  let users: LovableUser[];
  try {
    users = JSON.parse(jsonContent);
  } catch (error: any) {
    console.error('❌ Failed to parse JSON:', error.message);
    process.exit(1);
  }
  
  console.log(`📊 Found ${users.length} users to import\n`);
  
  // Check existing users
  console.log('🔍 Checking existing users...');
  const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  
  if (listError) {
    console.error('❌ Failed to list existing users:', listError.message);
    process.exit(1);
  }
  
  const existingIds = new Set(existingUsers?.users.map(u => u.id) || []);
  const existingEmails = new Set(
    (existingUsers?.users || [])
      .map(u => u.email?.toLowerCase())
      .filter((e): e is string => !!e)
  );
  
  console.log(`   Found ${existingUsers?.users.length || 0} existing auth users\n`);
  
  const results = {
    success: [] as Array<{email: string, id: string}>,
    failed: [] as Array<{email: string, error: string}>,
    skipped: [] as Array<{email: string, reason: string}>
  };
  
  console.log('🔄 Importing users...\n');
  
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const progress = `[${i + 1}/${users.length}]`;
    
    if (!user.id || !user.email) {
      results.skipped.push({ 
        email: user.email || 'unknown', 
        reason: 'Missing id or email' 
      });
      continue;
    }
    
    const emailLower = user.email.toLowerCase();
    
    if (existingIds.has(user.id)) {
      console.log(`${progress} ⏭️  Skipping ${user.email} (ID exists)`);
      results.skipped.push({ email: user.email, reason: 'ID already exists' });
      continue;
    }
    
    if (existingEmails.has(emailLower)) {
      console.log(`${progress} ⏭️  Skipping ${user.email} (Email exists)`);
      results.skipped.push({ email: user.email, reason: 'Email already exists' });
      continue;
    }
    
    try {
      console.log(`${progress} Creating: ${user.email}...`);
      
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        id: user.id, // Preserve UUID!
        email: user.email,
        email_confirm: !!user.email_confirmed_at,
        user_metadata: user.raw_user_meta_data || {},
        app_metadata: {},
      });
      
      if (error) throw error;
      
      console.log(`   ✅ Created: ${user.email} (${data.user.id})`);
      results.success.push({ email: user.email, id: data.user.id });
      
      // Rate limit protection
      if ((i + 1) % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
    } catch (error: any) {
      console.error(`   ❌ Failed: ${error.message}`);
      results.failed.push({ email: user.email, error: error.message });
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 IMPORT SUMMARY');
  console.log('='.repeat(80));
  console.log(`✅ Success: ${results.success.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);
  console.log(`⏭️  Skipped: ${results.skipped.length}`);
  console.log(`📝 Total: ${users.length}`);
  
  if (results.failed.length > 0) {
    console.log('\n❌ Failed users:');
    results.failed.forEach(f => {
      console.log(`   - ${f.email}: ${f.error}`);
    });
  }
  
  console.log('\n⚠️  IMPORTANT: Passwords are missing!');
  console.log('   Users will need to reset passwords via email');
  console.log('   You can send password reset emails via Supabase Dashboard');
  console.log('   or use: supabase.auth.admin.generateLink({ type: "recovery", email })');
  
  // Save report
  const exportsDir = path.join(process.cwd(), 'supabase', 'exports');
  if (!fs.existsSync(exportsDir)) {
    fs.mkdirSync(exportsDir, { recursive: true });
  }
  
  const reportFile = path.join(
    exportsDir, 
    `import-report-${new Date().toISOString().split('T')[0]}.json`
  );
  fs.writeFileSync(reportFile, JSON.stringify({
    timestamp: new Date().toISOString(),
    total_users: users.length,
    ...results
  }, null, 2));
  
  console.log(`\n📄 Detailed report saved: ${reportFile}`);
}

importUsers().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
