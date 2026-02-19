import { Client } from 'pg';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL || 
  'postgresql://postgres.sclvjrnnnbbptnhonoks:V4FsoNxRkH8LR3Bj@aws-0-us-west-2.pooler.supabase.com:6543/postgres';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 
  'https://sclvjrnnnbbptnhonoks.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

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

async function verifyAndSetupAdmin() {
  const adminEmail = 'milanbrezovac@gmail.com';
  const client = new Client(parseConnectionString(encodeConnectionString(connectionString)));
  
  try {
    console.log('🔍 Verifying admin setup...\n');
    await client.connect();
    
    // 1. Check if user exists in auth.users (via Supabase Admin API)
    if (!supabaseServiceKey) {
      console.error('❌ SUPABASE_SERVICE_ROLE_KEY required for auth check');
      process.exit(1);
    }
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    const adminUser = users?.users.find(u => u.email === adminEmail);
    
    if (!adminUser) {
      console.error(`❌ User ${adminEmail} not found in auth.users!`);
      process.exit(1);
    }
    
    console.log('✅ User found in auth.users');
    console.log(`   ID: ${adminUser.id}`);
    console.log(`   Email: ${adminUser.email}`);
    console.log(`   Confirmed: ${adminUser.email_confirmed_at ? 'Yes' : 'No'}\n`);
    
    // 2. Check if profile exists
    const profileResult = await client.query(`
      SELECT id, email, full_name, is_banned
      FROM public.profiles
      WHERE email = $1 OR id = $2;
    `, [adminEmail, adminUser.id]);
    
    if (profileResult.rows.length === 0) {
      console.log('⚠️  Profile not found. Creating profile...');
      await client.query(`
        INSERT INTO public.profiles (id, email, full_name)
        VALUES ($1, $2, $3)
        ON CONFLICT (id) DO UPDATE SET email = $2;
      `, [adminUser.id, adminEmail, 'milan brezovac']);
      console.log('✅ Profile created\n');
    } else {
      console.log('✅ Profile exists');
      const profile = profileResult.rows[0];
      console.log(`   Profile ID: ${profile.id}`);
      console.log(`   Full Name: ${profile.full_name || 'N/A'}`);
      console.log(`   Banned: ${profile.is_banned ? 'Yes ⚠️' : 'No'}\n`);
      
      // Update profile ID if it's different
      if (profile.id !== adminUser.id) {
        console.log('⚠️  Profile ID mismatch. Updating...');
        // This is complex - might need to handle foreign key constraints
        console.log('   Note: Profile has different ID. May need manual update.\n');
      }
    }
    
    // 3. Check if user_roles entry exists
    const rolesResult = await client.query(`
      SELECT user_id, role, created_at
      FROM public.user_roles
      WHERE user_id = $1;
    `, [adminUser.id]);
    
    if (rolesResult.rows.length === 0) {
      console.log('⚠️  No role assigned. Adding admin role...');
      await client.query(`
        INSERT INTO public.user_roles (user_id, role)
        VALUES ($1, 'admin'::app_role)
        ON CONFLICT (user_id, role) DO NOTHING;
      `, [adminUser.id]);
      console.log('✅ Admin role assigned\n');
    } else {
      console.log('✅ Roles found:');
      for (const role of rolesResult.rows) {
        console.log(`   - ${role.role} (assigned: ${new Date(role.created_at).toLocaleString()})`);
      }
      
      // Check if admin role exists for this user ID
      const hasAdmin = rolesResult.rows.some(r => r.role === 'admin' && r.user_id === adminUser.id);
      if (!hasAdmin) {
        console.log('\n⚠️  Admin role missing for new user ID. Adding...');
        await client.query(`
          INSERT INTO public.user_roles (id, user_id, role)
          VALUES (gen_random_uuid(), $1, 'admin'::app_role);
        `, [adminUser.id]);
        console.log('✅ Admin role assigned to new user ID\n');
      } else {
        console.log('\n✅ Admin role confirmed\n');
      }
      
      // Check if old profile has admin role that needs to be transferred
      const oldProfileId = '03765a40-f338-4035-a2ba-8928fff30834';
      if (adminUser.id !== oldProfileId) {
        const oldAdminCheck = await client.query(`
          SELECT role FROM public.user_roles
          WHERE user_id = $1 AND role = 'admin';
        `, [oldProfileId]);
        
        if (oldAdminCheck.rows.length > 0) {
          console.log('⚠️  Old profile has admin role. Consider removing it.');
          console.log(`   Old ID: ${oldProfileId}`);
          console.log(`   New ID: ${adminUser.id}`);
          console.log('   (Keeping both for now - you can clean up later)\n');
        }
      }
    }
    
    // 4. Generate password reset link
    console.log('🔐 Generating password reset link...\n');
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
      console.log('='.repeat(80));
      console.log('✅ ADMIN SETUP COMPLETE!');
      console.log('='.repeat(80));
      console.log('\n📧 Admin Details:');
      console.log(`   Email: ${adminEmail}`);
      console.log(`   User ID: ${adminUser.id}`);
      console.log(`   Confirmed: ${adminUser.email_confirmed_at ? 'Yes' : 'No'}`);
      console.log(`   Last Sign In: ${adminUser.last_sign_in_at ? new Date(adminUser.last_sign_in_at).toLocaleString() : 'Never'}`);
      console.log('\n🔗 Password Reset Link:');
      console.log(`   ${resetData.properties.action_link}`);
      console.log('\n📋 Instructions for Client:');
      console.log('   1. Click the password reset link above');
      console.log('   2. Set a new password');
      console.log('   3. Login at: https://misti-system.vercel.app');
      console.log('   4. Admin features will be available');
      console.log('\n⚠️  Note: Link expires in 1 hour\n');
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

verifyAndSetupAdmin();
