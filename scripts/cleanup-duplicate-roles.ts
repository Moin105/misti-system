import { Client } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

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

async function cleanupDuplicates() {
  const adminEmail = 'milanbrezovac@gmail.com';
  const adminId = '2dc4b37d-1706-4134-a8d1-a29b204e3606';
  
  const dbUrl = process.env.DATABASE_URL || 
    'postgresql://postgres.sclvjrnnnbbptnhonoks:V4FsoNxRkH8LR3Bj@aws-0-us-west-2.pooler.supabase.com:6543/postgres';
  
  const dbConfig = parseConnectionString(encodeConnectionString(dbUrl));
  const client = new Client(dbConfig);
  
  try {
    await client.connect();
    console.log('✅ Connected to database\n');
    
    console.log('='.repeat(80));
    console.log('CLEANING UP DUPLICATE ROLES');
    console.log('='.repeat(80));
    console.log(`\nUser: ${adminEmail}`);
    console.log(`User ID: ${adminId}\n`);
    
    // Find all roles for this user
    const rolesQuery = await client.query(`
      SELECT id, user_id, role, created_at
      FROM public.user_roles
      WHERE user_id = $1
      ORDER BY role, created_at DESC
    `, [adminId]);
    
    console.log(`Found ${rolesQuery.rows.length} role(s):\n`);
    rolesQuery.rows.forEach((row, idx) => {
      console.log(`${idx + 1}. ${row.role} (ID: ${row.id}, Created: ${row.created_at || 'null'})`);
    });
    
    // Group by role
    const roleGroups: { [key: string]: any[] } = {};
    rolesQuery.rows.forEach(row => {
      if (!roleGroups[row.role]) {
        roleGroups[row.role] = [];
      }
      roleGroups[row.role].push(row);
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('CLEANUP PLAN');
    console.log('='.repeat(80));
    
    let toDelete: string[] = [];
    
    Object.keys(roleGroups).forEach(role => {
      const roles = roleGroups[role];
      console.log(`\n${role.toUpperCase()} role: ${roles.length} instance(s)`);
      
      if (roles.length > 1) {
        // Keep the most recent one (or first one if no created_at)
        const sorted = roles.sort((a, b) => {
          if (!a.created_at && !b.created_at) return 0;
          if (!a.created_at) return 1;
          if (!b.created_at) return -1;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        
        const keep = sorted[0];
        const deleteList = sorted.slice(1);
        
        console.log(`   ✅ Keep: ${keep.id} (Created: ${keep.created_at || 'null'})`);
        deleteList.forEach(del => {
          console.log(`   ❌ Delete: ${del.id} (Created: ${del.created_at || 'null'})`);
          toDelete.push(del.id);
        });
      } else {
        console.log(`   ✅ Keep: ${roles[0].id} (only one instance)`);
      }
    });
    
    if (toDelete.length === 0) {
      console.log('\n✅ No duplicates found! All roles are unique.');
      return;
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('DELETING DUPLICATES');
    console.log('='.repeat(80));
    
    for (const id of toDelete) {
      console.log(`\n🗑️  Deleting role ID: ${id}...`);
      await client.query(`
        DELETE FROM public.user_roles
        WHERE id = $1
      `, [id]);
      console.log(`   ✅ Deleted`);
    }
    
    // Verify final state
    console.log('\n' + '='.repeat(80));
    console.log('FINAL STATE');
    console.log('='.repeat(80));
    
    const finalQuery = await client.query(`
      SELECT id, user_id, role, created_at
      FROM public.user_roles
      WHERE user_id = $1
      ORDER BY role
    `, [adminId]);
    
    console.log(`\nFinal roles (${finalQuery.rows.length}):\n`);
    finalQuery.rows.forEach((row, idx) => {
      console.log(`${idx + 1}. ${row.role} (ID: ${row.id})`);
    });
    
    // Check admin role specifically
    const adminRoles = finalQuery.rows.filter(r => r.role === 'admin');
    if (adminRoles.length === 1) {
      console.log('\n✅ Perfect! User has exactly 1 admin role.');
    } else if (adminRoles.length === 0) {
      console.log('\n❌ WARNING: No admin role found!');
    } else {
      console.log(`\n⚠️  WARNING: Still ${adminRoles.length} admin roles!`);
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ CLEANUP COMPLETE');
    console.log('='.repeat(80));
    console.log('\n💡 Next steps:');
    console.log('   1. Client should logout and login again');
    console.log('   2. Clear browser cache');
    console.log('   3. Try accessing admin panel');
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await client.end();
  }
}

cleanupDuplicates();
