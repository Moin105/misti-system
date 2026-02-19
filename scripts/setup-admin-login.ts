import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load .env file if exists
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 
  'https://sclvjrnnnbbptnhonoks.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

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

async function setupAdminLogin() {
  console.log('🚀 Setting up Admin Login...\n');
  console.log('='.repeat(80));
  
  // Step 1: Check service role key
  if (!supabaseServiceKey) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found!\n');
    console.error('Please set it in one of these ways:\n');
    console.error('1. Create .env file in project root:');
    console.error('   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key\n');
    console.error('2. Or set environment variable:');
    console.error('   PowerShell: $env:SUPABASE_SERVICE_ROLE_KEY="your-key"');
    console.error('   CMD: set SUPABASE_SERVICE_ROLE_KEY=your-key\n');
    console.error('To get your service role key:');
    console.error('1. Go to https://supabase.com/dashboard');
    console.error('2. Select project: sclvjrnnnbbptnhonoks');
    console.error('3. Settings → API → Copy service_role key\n');
    process.exit(1);
  }
  
  // Verify it's a service role key
  let isServiceRoleKey = false;
  try {
    const parts = supabaseServiceKey.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      isServiceRoleKey = payload.role === 'service_role';
    }
  } catch (e) {
    console.warn('⚠️  Could not verify key type, proceeding anyway...\n');
  }
  
  if (!isServiceRoleKey) {
    console.warn('⚠️  WARNING: Key might not be a service_role key!\n');
  }
  
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  
  console.log('✅ Service role key found\n');
  
  // Verify service role key works
  console.log('🔐 Verifying service role key...');
  try {
    const { data: testList } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 });
    console.log('✅ Service role key verified\n');
  } catch (error: any) {
    console.error('❌ Service role key verification failed:', error.message);
    console.error('\nPlease check:');
    console.error('1. Key is correct (from Supabase Dashboard → Settings → API)');
    console.error('2. Key is for project: sclvjrnnnbbptnhonoks');
    console.error('3. Key has "service_role" in JWT payload\n');
    process.exit(1);
  }
  
  // Step 2: Check if users need to be imported
  console.log('📊 Checking existing auth users...');
  const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  
  if (listError) {
    console.error('❌ Failed to list users:', listError.message);
    process.exit(1);
  }
  
  const existingCount = existingUsers?.users.length || 0;
  console.log(`   Found ${existingCount} existing auth users\n`);
  
  // Step 3: Import users if needed
  const sqlFile = path.join(process.cwd(), 'supabase', 'migrations', 'lovable-auth-users-export.sql');
  
  if (existingCount === 0 && fs.existsSync(sqlFile)) {
    console.log('📥 No auth users found. Importing from SQL file...\n');
    
    const content = fs.readFileSync(sqlFile, 'utf-8');
    const jsonStart = content.indexOf('AUTH_USERS_JSON_START');
    const jsonEnd = content.indexOf('AUTH_USERS_JSON_END');
    
    if (jsonStart === -1 || jsonEnd === -1) {
      console.error('❌ JSON section not found in SQL file');
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
    
    console.log(`   Found ${users.length} users to import\n`);
    
    const existingIds = new Set(existingUsers?.users.map(u => u.id) || []);
    const existingEmails = new Set(
      (existingUsers?.users || [])
        .map(u => u.email?.toLowerCase())
        .filter((e): e is string => !!e)
    );
    
    let imported = 0;
    let skipped = 0;
    let failed = 0;
    
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      
      if (!user.id || !user.email) {
        skipped++;
        continue;
      }
      
      const emailLower = user.email.toLowerCase();
      
      if (existingIds.has(user.id) || existingEmails.has(emailLower)) {
        skipped++;
        continue;
      }
      
      try {
        // Try with ID first (to preserve UUIDs)
        let createResult = await supabaseAdmin.auth.admin.createUser({
          id: user.id,
          email: user.email,
          email_confirm: !!user.email_confirmed_at,
          user_metadata: user.raw_user_meta_data || {},
          app_metadata: {},
        });
        
        // If that fails, try without ID
        if (createResult.error && createResult.error.message.includes('uuid')) {
          console.log(`   ⚠️  Retrying ${user.email} without UUID...`);
          createResult = await supabaseAdmin.auth.admin.createUser({
            email: user.email,
            email_confirm: !!user.email_confirmed_at,
            user_metadata: {
              ...(user.raw_user_meta_data || {}),
              original_id: user.id, // Store original ID in metadata
            },
            app_metadata: {},
          });
        }
        
        if (createResult.error) {
          // Show first error in detail for debugging
          if (failed === 0) {
            console.error(`\n   First error details:`);
            console.error(`   Status: ${createResult.error.status}`);
            console.error(`   Message: ${createResult.error.message}`);
            if (createResult.error.status === 500) {
              console.error(`\n   ⚠️  Server error (500) - This might be a Supabase issue.`);
              console.error(`   Try creating users manually via Supabase Dashboard or check project settings.\n`);
            }
          }
          throw createResult.error;
        }
        
        imported++;
        
        if ((i + 1) % 10 === 0) {
          process.stdout.write(`   Progress: ${i + 1}/${users.length} (${imported} imported)...\r`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        
      } catch (error: any) {
        if (failed < 5) {
          console.error(`   ❌ Failed ${user.email}: ${error.message || 'Unknown error'}`);
        }
        failed++;
      }
    }
    
    console.log(`\n✅ Imported: ${imported}`);
    console.log(`⏭️  Skipped: ${skipped}`);
    if (failed > 0) console.log(`❌ Failed: ${failed}\n`);
    
  } else if (existingCount > 0) {
    console.log('✅ Auth users already exist, skipping import\n');
  }
  
  // Step 4: Find admin user
  console.log('🔍 Finding admin user...');
  
  // Get admin from user_roles table via direct query
  const { Client } = await import('pg');
  
  const connectionString = process.env.DATABASE_URL || 
    'postgresql://postgres.sclvjrnnnbbptnhonoks:V4FsoNxRkH8LR3Bj@aws-0-us-west-2.pooler.supabase.com:6543/postgres';
  
  function encodeConnectionString(connString: string): string {
    try {
      const url = new URL(connString);
      if (url.password) {
        url.password = encodeURIComponent(url.password);
      }
      return url.toString();
    } catch {
      return connString;
    }
  }
  
  function parseConnectionString(connString: string) {
    try {
      const url = new URL(connString);
      return {
        host: url.hostname,
        port: parseInt(url.port) || 5432,
        database: url.pathname.slice(1) || 'postgres',
        user: url.username || 'postgres',
        password: decodeURIComponent(url.password || ''),
        ssl: { rejectUnauthorized: false }
      };
    } catch (error: any) {
      throw new Error(`Invalid connection string: ${error.message}`);
    }
  }
  
  const config = parseConnectionString(encodeConnectionString(connectionString));
  const client = new Client(config);
  
  try {
    await client.connect();
    
    const adminResult = await client.query(`
      SELECT 
        ur.user_id,
        p.email,
        p.full_name
      FROM public.user_roles ur
      JOIN public.profiles p ON ur.user_id = p.id
      WHERE ur.role = 'admin'
      LIMIT 1;
    `);
    
    if (adminResult.rows.length === 0) {
      console.error('❌ No admin user found in user_roles table!');
      await client.end();
      process.exit(1);
    }
    
    const admin = adminResult.rows[0];
    console.log(`   Admin found: ${admin.email} (${admin.user_id})\n`);
    
    // Step 5: Check if admin exists in auth.users
    const { data: adminAuthUser } = await supabaseAdmin.auth.admin.getUserById(admin.user_id);
    
    if (!adminAuthUser?.user) {
      console.error(`❌ Admin user ${admin.email} not found in auth.users!`);
      console.error('   Please run the import script first.');
      await client.end();
      process.exit(1);
    }
    
    // Step 6: Generate password reset link
    console.log('🔐 Generating password reset link for admin...\n');
    
    const { data: resetData, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: admin.email,
    });
    
    if (resetError) {
      console.error('❌ Failed to generate reset link:', resetError.message);
      await client.end();
      process.exit(1);
    }
    
    // Success!
    console.log('='.repeat(80));
    console.log('✅ ADMIN LOGIN SETUP COMPLETE!');
    console.log('='.repeat(80));
    console.log('\n📧 Admin Details:');
    console.log(`   Email: ${admin.email}`);
    console.log(`   Name: ${admin.full_name || 'N/A'}`);
    console.log(`   User ID: ${admin.user_id}\n`);
    console.log('🔗 Password Reset Link:');
    console.log('   ' + resetData.properties.action_link);
    console.log('\n📋 Instructions for Client:');
    console.log('   1. Click the password reset link above');
    console.log('   2. Set a new password');
    console.log('   3. Login with email and new password');
    console.log('\n⚠️  Note: Link expires in 1 hour (default Supabase setting)');
    console.log('   If expired, run: npm run admin-reset-password\n');
    
    // Save to file
    const exportsDir = path.join(process.cwd(), 'supabase', 'exports');
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }
    
    const infoFile = path.join(exportsDir, 'admin-login-info.txt');
    fs.writeFileSync(infoFile, `
Admin Login Information
Generated: ${new Date().toISOString()}

Email: ${admin.email}
Name: ${admin.full_name || 'N/A'}
User ID: ${admin.user_id}

Password Reset Link:
${resetData.properties.action_link}

Instructions:
1. Click the password reset link
2. Set a new password
3. Login with email and new password

Note: Link expires in 1 hour
`.trim());
    
    console.log(`📄 Info saved to: ${infoFile}\n`);
    
    await client.end();
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    await client.end();
    process.exit(1);
  }
}

setupAdminLogin().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
