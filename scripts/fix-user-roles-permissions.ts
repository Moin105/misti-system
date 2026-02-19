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

async function fixPermissions() {
  const dbUrl = process.env.DATABASE_URL || 
    'postgresql://postgres.sclvjrnnnbbptnhonoks:V4FsoNxRkH8LR3Bj@aws-0-us-west-2.pooler.supabase.com:6543/postgres';
  
  const dbConfig = parseConnectionString(encodeConnectionString(dbUrl));
  const client = new Client(dbConfig);
  
  try {
    await client.connect();
    console.log('✅ Connected to database\n');
    
    console.log('='.repeat(80));
    console.log('FIXING USER_ROLES PERMISSIONS');
    console.log('='.repeat(80));
    
    // Check current grants
    console.log('\n📋 Current GRANTs on user_roles:\n');
    const grantsQuery = await client.query(`
      SELECT 
        grantee,
        privilege_type
      FROM information_schema.role_table_grants
      WHERE table_schema = 'public'
        AND table_name = 'user_roles'
      ORDER BY grantee, privilege_type
    `);
    
    if (grantsQuery.rows.length === 0) {
      console.log('⚠️  No explicit grants found (using default permissions)');
    } else {
      grantsQuery.rows.forEach(row => {
        console.log(`   ${row.grantee}: ${row.privilege_type}`);
      });
    }
    
    // Grant SELECT to authenticated role
    console.log('\n🔧 Granting SELECT permission to authenticated role...');
    await client.query(`
      GRANT SELECT ON public.user_roles TO authenticated;
    `);
    console.log('✅ SELECT permission granted');
    
    // Grant SELECT to anon role (if needed for public access)
    console.log('\n🔧 Granting SELECT permission to anon role...');
    await client.query(`
      GRANT SELECT ON public.user_roles TO anon;
    `);
    console.log('✅ SELECT permission granted to anon');
    
    // Verify policies exist
    console.log('\n📋 Verifying RLS policies:\n');
    const policiesQuery = await client.query(`
      SELECT 
        policyname,
        cmd,
        roles,
        qual
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'user_roles'
      ORDER BY policyname
    `);
    
    policiesQuery.rows.forEach(policy => {
      console.log(`   ${policy.policyname}`);
      console.log(`      Command: ${policy.cmd}`);
      console.log(`      Roles: ${JSON.stringify(policy.roles)}`);
      console.log(`      Using: ${policy.qual || 'N/A'}\n`);
    });
    
    // Test query as authenticated user would
    console.log('='.repeat(80));
    console.log('TESTING QUERY (simulating authenticated user)');
    console.log('='.repeat(80));
    
    const testUserId = '2dc4b37d-1706-4134-a8d1-a29b204e3606';
    
    // Set role to authenticated
    await client.query('SET ROLE authenticated');
    
    try {
      const testQuery = await client.query(`
        SELECT role
        FROM public.user_roles
        WHERE user_id = $1
          AND role = 'admin'
        LIMIT 1
      `, [testUserId]);
      
      if (testQuery.rows.length > 0) {
        console.log('\n✅ Query SUCCESS!');
        console.log(`   Found role: ${testQuery.rows[0].role}`);
      } else {
        console.log('\n⚠️  Query returned no rows (but no permission error)');
      }
    } catch (error: any) {
      console.log(`\n❌ Query failed: ${error.message}`);
    } finally {
      await client.query('RESET ROLE');
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ PERMISSIONS FIXED');
    console.log('='.repeat(80));
    console.log('\n💡 Next steps:');
    console.log('   1. Client should logout and login again');
    console.log('   2. Clear browser cache');
    console.log('   3. Try accessing admin panel again');
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await client.end();
  }
}

fixPermissions();
