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

async function checkPermissions() {
  const adminId = '2dc4b37d-1706-4134-a8d1-a29b204e3606';
  const dbUrl = process.env.DATABASE_URL || 
    'postgresql://postgres.sclvjrnnnbbptnhonoks:V4FsoNxRkH8LR3Bj@aws-0-us-west-2.pooler.supabase.com:6543/postgres';
  
  const dbConfig = parseConnectionString(encodeConnectionString(dbUrl));
  const client = new Client(dbConfig);
  
  try {
    await client.connect();
    console.log('✅ Connected to database\n');
    
    console.log('='.repeat(80));
    console.log('CHECKING GAMES TABLE PERMISSIONS');
    console.log('='.repeat(80));
    
    // Check GRANTs
    console.log('\n1. GRANT Permissions on games table:\n');
    const grantsQuery = await client.query(`
      SELECT 
        grantee,
        privilege_type
      FROM information_schema.role_table_grants
      WHERE table_schema = 'public'
        AND table_name = 'games'
      ORDER BY grantee, privilege_type
    `);
    
    if (grantsQuery.rows.length === 0) {
      console.log('⚠️  No explicit grants found');
    } else {
      grantsQuery.rows.forEach(row => {
        console.log(`   ${row.grantee}: ${row.privilege_type}`);
      });
    }
    
    // Check RLS policies
    console.log('\n2. RLS Policies on games table:\n');
    const policiesQuery = await client.query(`
      SELECT 
        policyname,
        cmd,
        roles,
        qual,
        with_check
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'games'
      ORDER BY policyname
    `);
    
    policiesQuery.rows.forEach(policy => {
      console.log(`   ${policy.policyname}`);
      console.log(`      Command: ${policy.cmd}`);
      console.log(`      Roles: ${JSON.stringify(policy.roles)}`);
      console.log(`      Using: ${policy.qual || 'N/A'}`);
      console.log(`      With Check: ${policy.with_check || 'N/A'}\n`);
    });
    
    // Check if user has admin role
    console.log('3. Checking admin role for user:\n');
    const adminCheck = await client.query(`
      SELECT role
      FROM public.user_roles
      WHERE user_id = $1
        AND role = 'admin'
      LIMIT 1
    `, [adminId]);
    
    if (adminCheck.rows.length > 0) {
      console.log(`   ✅ User has admin role`);
    } else {
      console.log(`   ❌ User does NOT have admin role`);
    }
    
    // Test has_role function
    console.log('\n4. Testing has_role function:\n');
    const hasRoleTest = await client.query(`
      SELECT has_role($1, 'admin'::app_role) as is_admin
    `, [adminId]);
    
    console.log(`   has_role result: ${hasRoleTest.rows[0].is_admin}`);
    
    console.log('\n' + '='.repeat(80));
    console.log('RECOMMENDATIONS');
    console.log('='.repeat(80));
    
    const hasInsert = grantsQuery.rows.some(r => r.privilege_type === 'INSERT' && (r.grantee === 'authenticated' || r.grantee === 'anon'));
    const hasAdminPolicy = policiesQuery.rows.some(p => p.cmd === 'ALL' || p.cmd === 'INSERT');
    
    if (!hasInsert) {
      console.log('\n⚠️  Missing INSERT GRANT for authenticated role');
      console.log('   Need to: GRANT INSERT ON public.games TO authenticated;');
    }
    
    if (!hasAdminPolicy) {
      console.log('\n⚠️  Missing INSERT/ALL policy for admins');
    }
    
    if (hasInsert && hasAdminPolicy && adminCheck.rows.length > 0) {
      console.log('\n✅ Permissions look correct');
      console.log('   Issue might be with has_role function or RLS evaluation');
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await client.end();
  }
}

checkPermissions();
