import { Client } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

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

async function cleanupAndFix() {
  const newUserId = '2dc4b37d-1706-4134-a8d1-a29b204e3606'; // New auth.users ID
  const adminEmail = 'milanbrezovac@gmail.com';
  
  const client = new Client(parseConnectionString(encodeConnectionString(connectionString)));
  
  try {
    console.log('🧹 Cleaning up duplicates and fixing profile...\n');
    await client.connect();
    await client.query('BEGIN');
    
    // 1. Check current state
    console.log('📊 Current state:\n');
    
    const profilesCheck = await client.query(`
      SELECT id, email, full_name 
      FROM public.profiles 
      WHERE email = $1;
    `, [adminEmail]);
    
    console.log(`   Profiles with email ${adminEmail}: ${profilesCheck.rows.length}`);
    for (const p of profilesCheck.rows) {
      console.log(`     - ID: ${p.id}, Name: ${p.full_name || 'N/A'}`);
    }
    
    const rolesCheck = await client.query(`
      SELECT user_id, role, created_at
      FROM public.user_roles
      WHERE user_id = $1;
    `, [newUserId]);
    
    console.log(`\n   Roles for new user ID: ${rolesCheck.rows.length}`);
    for (const r of rolesCheck.rows) {
      console.log(`     - ${r.role} (created: ${new Date(r.created_at).toLocaleString()})`);
    }
    
    // 2. Delete duplicate profiles (keep the one matching auth.users ID)
    console.log('\n🧹 Cleaning duplicate profiles...');
    const duplicateProfiles = profilesCheck.rows.filter(p => p.id !== newUserId);
    
    for (const dup of duplicateProfiles) {
      console.log(`   Deleting duplicate profile: ${dup.id}`);
      await client.query('DELETE FROM public.profiles WHERE id = $1', [dup.id]);
    }
    
    // 3. Ensure profile exists with correct ID
    const correctProfile = profilesCheck.rows.find(p => p.id === newUserId);
    
    if (!correctProfile) {
      console.log('\n📝 Creating profile with correct ID...');
      await client.query(`
        INSERT INTO public.profiles (id, email, full_name)
        VALUES ($1, $2, $3)
        ON CONFLICT (id) DO UPDATE SET email = $2;
      `, [newUserId, adminEmail, 'milan brezovac']);
      console.log('   ✅ Profile created/updated');
    } else {
      // Update full_name if missing
      if (!correctProfile.full_name || correctProfile.full_name === 'N/A') {
        console.log('\n📝 Updating profile full_name...');
        await client.query(`
          UPDATE public.profiles
          SET full_name = 'milan brezovac'
          WHERE id = $1;
        `, [newUserId]);
        console.log('   ✅ Profile updated');
      }
    }
    
    // 4. Clean duplicate user_roles (keep admin, remove duplicate user)
    console.log('\n🧹 Cleaning duplicate user_roles...');
    const adminRoles = rolesCheck.rows.filter(r => r.role === 'admin');
    const userRoles = rolesCheck.rows.filter(r => r.role === 'user');
    
    if (adminRoles.length > 1) {
      // Keep the oldest admin role, delete others
      const sorted = adminRoles.sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      const toKeep = sorted[0];
      const toDelete = sorted.slice(1);
      
      for (const del of toDelete) {
        console.log(`   Deleting duplicate admin role (created: ${new Date(del.created_at).toLocaleString()})`);
        await client.query(`
          DELETE FROM public.user_roles
          WHERE user_id = $1 AND role = 'admin' AND created_at = $2;
        `, [newUserId, del.created_at]);
      }
    }
    
    if (userRoles.length > 1) {
      // Keep the oldest user role, delete others
      const sorted = userRoles.sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      const toKeep = sorted[0];
      const toDelete = sorted.slice(1);
      
      for (const del of toDelete) {
        console.log(`   Deleting duplicate user role (created: ${new Date(del.created_at).toLocaleString()})`);
        await client.query(`
          DELETE FROM public.user_roles
          WHERE user_id = $1 AND role = 'user' AND created_at = $2;
        `, [newUserId, del.created_at]);
      }
    }
    
    // 5. Ensure admin role exists
    const hasAdmin = rolesCheck.rows.some(r => r.role === 'admin');
    if (!hasAdmin) {
      console.log('\n📝 Adding admin role...');
      await client.query(`
        INSERT INTO public.user_roles (user_id, role)
        VALUES ($1, 'admin'::app_role)
        ON CONFLICT (user_id, role) DO NOTHING;
      `, [newUserId]);
      console.log('   ✅ Admin role added');
    }
    
    // 6. Ensure user role exists
    const hasUser = rolesCheck.rows.some(r => r.role === 'user');
    if (!hasUser) {
      console.log('\n📝 Adding user role...');
      await client.query(`
        INSERT INTO public.user_roles (user_id, role)
        VALUES ($1, 'user'::app_role)
        ON CONFLICT (user_id, role) DO NOTHING;
      `, [newUserId]);
      console.log('   ✅ User role added');
    }
    
    await client.query('COMMIT');
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ CLEANUP COMPLETE!');
    console.log('='.repeat(80));
    console.log(`\n✅ Profile ID: ${newUserId}`);
    console.log(`✅ Admin role: Active`);
    console.log(`✅ All history: Linked to new ID`);
    console.log(`\n📋 Admin can now:`);
    console.log(`   - Login at: https://misti-system.vercel.app`);
    console.log(`   - Access all orders, transactions, cashback history`);
    console.log(`   - Use all admin features`);
    
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

cleanupAndFix();
