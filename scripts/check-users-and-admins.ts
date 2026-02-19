import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

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

async function main() {
  const connectionString = process.env.DATABASE_URL || 
    'postgresql://postgres.sclvjrnnnbbptnhonoks:V4FsoNxRkH8LR3Bj@aws-0-us-west-2.pooler.supabase.com:6543/postgres';
  
  const config = parseConnectionString(encodeConnectionString(connectionString));
  const client = new Client(config);
  
  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✓ Connected!\n');
    
    // Get all profiles
    console.log('='.repeat(80));
    console.log('PROFILES TABLE - ALL USERS');
    console.log('='.repeat(80));
    
    // First get actual columns in profiles table
    const columnsResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'profiles'
      ORDER BY ordinal_position;
    `);
    
    const availableColumns = columnsResult.rows.map((r: any) => r.column_name);
    console.log(`Available columns: ${availableColumns.join(', ')}\n`);
    
    // Build dynamic SELECT based on available columns
    const selectColumns = [
      'id',
      'email',
      'full_name',
      ...(availableColumns.includes('display_name') ? ['display_name'] : []),
      ...(availableColumns.includes('avatar_url') ? ['avatar_url'] : []),
      ...(availableColumns.includes('is_banned') ? ['is_banned'] : []),
      ...(availableColumns.includes('cashback_balance') ? ['cashback_balance'] : []),
      ...(availableColumns.includes('total_lifetime_spending') ? ['total_lifetime_spending'] : []),
      ...(availableColumns.includes('referred_by') ? ['referred_by'] : []),
      ...(availableColumns.includes('total_referrals') ? ['total_referrals'] : []),
      ...(availableColumns.includes('referral_earnings') ? ['referral_earnings'] : []),
      'created_at',
      'updated_at'
    ].filter(col => availableColumns.includes(col));
    
    const profilesResult = await client.query(`
      SELECT ${selectColumns.join(', ')}
      FROM public.profiles
      ORDER BY created_at DESC;
    `);
    
    console.log(`\nTotal Users: ${profilesResult.rows.length}\n`);
    
    if (profilesResult.rows.length > 0) {
      console.log('User Details:');
      console.log('-'.repeat(80));
      
      for (const profile of profilesResult.rows) {
        console.log(`\n👤 User ID: ${profile.id}`);
        console.log(`   Email: ${profile.email || 'N/A'}`);
        console.log(`   Full Name: ${profile.full_name || 'N/A'}`);
        if (profile.display_name !== undefined) {
          console.log(`   Display Name: ${profile.display_name || 'N/A'}`);
        }
        if (profile.avatar_url !== undefined) {
          console.log(`   Avatar: ${profile.avatar_url || 'N/A'}`);
        }
        if (profile.is_banned !== undefined) {
          console.log(`   Banned: ${profile.is_banned ? 'Yes ⚠️' : 'No'}`);
        }
        if (profile.cashback_balance !== undefined) {
          console.log(`   Cashback Balance: ${profile.cashback_balance || 0}`);
        }
        if (profile.total_lifetime_spending !== undefined) {
          console.log(`   Total Spending: ${profile.total_lifetime_spending || 0}`);
        }
        if (profile.referred_by !== undefined) {
          console.log(`   Referred By: ${profile.referred_by || 'N/A'}`);
        }
        if (profile.total_referrals !== undefined) {
          console.log(`   Referrals: ${profile.total_referrals || 0}`);
        }
        if (profile.referral_earnings !== undefined) {
          console.log(`   Referral Earnings: ${profile.referral_earnings || 0}`);
        }
        console.log(`   Created: ${new Date(profile.created_at).toLocaleString()}`);
      }
    } else {
      console.log('⚠️  No users found in profiles table\n');
    }
    
    // Get admin users
    console.log('\n' + '='.repeat(80));
    console.log('ADMIN USERS');
    console.log('='.repeat(80));
    
    const adminsResult = await client.query(`
      SELECT 
        ur.user_id,
        ur.role,
        ur.created_at as role_assigned_at,
        p.email,
        p.full_name,
        p.created_at as user_created_at
      FROM public.user_roles ur
      JOIN public.profiles p ON ur.user_id = p.id
      WHERE ur.role = 'admin'
      ORDER BY ur.created_at DESC;
    `);
    
    console.log(`\nTotal Admins: ${adminsResult.rows.length}\n`);
    
    if (adminsResult.rows.length > 0) {
      console.log('Admin Details:');
      console.log('-'.repeat(80));
      
      for (const admin of adminsResult.rows) {
        console.log(`\n👑 Admin ID: ${admin.user_id}`);
        console.log(`   Email: ${admin.email || 'N/A'}`);
        console.log(`   Full Name: ${admin.full_name || 'N/A'}`);
        console.log(`   Role: ${admin.role}`);
        console.log(`   Role Assigned: ${new Date(admin.role_assigned_at).toLocaleString()}`);
        console.log(`   User Created: ${new Date(admin.user_created_at).toLocaleString()}`);
      }
    } else {
      console.log('⚠️  No admin users found\n');
    }
    
    // Get all user roles
    console.log('\n' + '='.repeat(80));
    console.log('ALL USER ROLES');
    console.log('='.repeat(80));
    
    const rolesResult = await client.query(`
      SELECT 
        ur.user_id,
        ur.role,
        ur.created_at,
        p.email,
        p.full_name
      FROM public.user_roles ur
      LEFT JOIN public.profiles p ON ur.user_id = p.id
      ORDER BY ur.role, ur.created_at DESC;
    `);
    
    console.log(`\nTotal Role Assignments: ${rolesResult.rows.length}\n`);
    
    const roleCounts: { [key: string]: number } = {};
    for (const role of rolesResult.rows) {
      roleCounts[role.role] = (roleCounts[role.role] || 0) + 1;
    }
    
    console.log('Role Distribution:');
    for (const [role, count] of Object.entries(roleCounts)) {
      console.log(`   ${role}: ${count}`);
    }
    
    if (rolesResult.rows.length > 0) {
      console.log('\nDetailed Role List:');
      console.log('-'.repeat(80));
      
      for (const role of rolesResult.rows) {
        console.log(`\n   ${role.role.toUpperCase()}: ${role.email || role.user_id}`);
        console.log(`      User ID: ${role.user_id}`);
        console.log(`      Name: ${role.full_name || 'N/A'}`);
        console.log(`      Assigned: ${new Date(role.created_at).toLocaleString()}`);
      }
    }
    
    // Check auth.users count
    console.log('\n' + '='.repeat(80));
    console.log('AUTH USERS (if accessible)');
    console.log('='.repeat(80));
    
    try {
      const authUsersResult = await client.query(`
        SELECT COUNT(*) as count FROM auth.users;
      `);
      console.log(`\nTotal Auth Users: ${authUsersResult.rows[0].count}`);
      
      // Get sample auth users (without sensitive data)
      const sampleAuthResult = await client.query(`
        SELECT 
          id,
          email,
          email_confirmed_at,
          created_at
        FROM auth.users
        ORDER BY created_at DESC
        LIMIT 10;
      `);
      
      if (sampleAuthResult.rows.length > 0) {
        console.log(`\nSample Auth Users (first 10):`);
        for (const user of sampleAuthResult.rows) {
          console.log(`   ${user.email} (${user.id}) - Created: ${new Date(user.created_at).toLocaleString()}`);
        }
      }
    } catch (error: any) {
      console.log(`\n⚠️  Cannot access auth.users: ${error.message}`);
      console.log('   (This requires service_role access)');
    }
    
    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total Profiles: ${profilesResult.rows.length}`);
    console.log(`Total Admins: ${adminsResult.rows.length}`);
    console.log(`Total Role Assignments: ${rolesResult.rows.length}`);
    
    if (adminsResult.rows.length === 0) {
      console.log('\n⚠️  WARNING: No admin users found!');
      console.log('   You may need to create an admin user.');
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
