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

async function checkStoragePolicies() {
  const adminId = '2dc4b37d-1706-4134-a8d1-a29b204e3606';
  const dbUrl = process.env.DATABASE_URL || 
    'postgresql://postgres.sclvjrnnnbbptnhonoks:V4FsoNxRkH8LR3Bj@aws-0-us-west-2.pooler.supabase.com:6543/postgres';
  
  const dbConfig = parseConnectionString(encodeConnectionString(dbUrl));
  const client = new Client(dbConfig);
  
  try {
    await client.connect();
    console.log('✅ Connected to database\n');
    
    console.log('='.repeat(80));
    console.log('CHECKING STORAGE POLICIES FOR game-images BUCKET');
    console.log('='.repeat(80));
    
    // Check policies on storage.objects for game-images bucket
    console.log('\n1. Storage Policies for game-images:\n');
    const policiesQuery = await client.query(`
      SELECT 
        policyname,
        cmd,
        qual,
        with_check
      FROM pg_policies
      WHERE schemaname = 'storage'
        AND tablename = 'objects'
        AND (qual LIKE '%game-images%' OR with_check LIKE '%game-images%')
      ORDER BY cmd, policyname
    `);
    
    if (policiesQuery.rows.length === 0) {
      console.log('   ❌ NO POLICIES FOUND!');
    } else {
      policiesQuery.rows.forEach(policy => {
        console.log(`   ${policy.policyname}`);
        console.log(`      Command: ${policy.cmd}`);
        console.log(`      Using: ${policy.qual || 'N/A'}`);
        console.log(`      With Check: ${policy.with_check || 'N/A'}\n`);
      });
    }
    
    // Check if user has admin role
    console.log('2. Checking admin role:\n');
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
    console.log('\n3. Testing has_role function:\n');
    const hasRoleTest = await client.query(`
      SELECT has_role($1, 'admin'::app_role) as is_admin
    `, [adminId]);
    
    console.log(`   has_role result: ${hasRoleTest.rows[0].is_admin}`);
    
    console.log('\n' + '='.repeat(80));
    console.log('RECOMMENDATIONS');
    console.log('='.repeat(80));
    
    const hasInsertPolicy = policiesQuery.rows.some(p => p.cmd === 'INSERT');
    
    if (!hasInsertPolicy) {
      console.log('\n❌ Missing INSERT policy for game-images!');
    } else {
      console.log('\n✅ INSERT policy exists');
      console.log('   Issue might be with has_role function evaluation in storage context');
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await client.end();
  }
}

checkStoragePolicies();
