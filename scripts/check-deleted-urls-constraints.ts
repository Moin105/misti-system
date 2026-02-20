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

async function checkConstraints() {
  const dbUrl = process.env.DATABASE_URL || 
    'postgresql://postgres.sclvjrnnnbbptnhonoks:V4FsoNxRkH8LR3Bj@aws-0-us-west-2.pooler.supabase.com:6543/postgres';
  
  const dbConfig = parseConnectionString(encodeConnectionString(dbUrl));
  const client = new Client(dbConfig);
  
  try {
    await client.connect();
    console.log('✅ Connected to database\n');
    
    console.log('='.repeat(80));
    console.log('CHECKING deleted_urls TABLE CONSTRAINTS');
    console.log('='.repeat(80));
    
    // Check table structure
    console.log('\n1. Table Structure:');
    const columnsQuery = await client.query(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'deleted_urls'
      ORDER BY ordinal_position
    `);
    
    columnsQuery.rows.forEach(col => {
      console.log(`   ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
    });
    
    // Check unique constraints
    console.log('\n2. Unique Constraints:');
    const uniqueQuery = await client.query(`
      SELECT 
        tc.constraint_name,
        kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      WHERE tc.table_schema = 'public'
        AND tc.table_name = 'deleted_urls'
        AND tc.constraint_type = 'UNIQUE'
      ORDER BY tc.constraint_name, kcu.ordinal_position
    `);
    
    if (uniqueQuery.rows.length === 0) {
      console.log('   ❌ NO UNIQUE CONSTRAINTS FOUND!');
      console.log('   ⚠️  This is the problem - track_deleted_game() uses ON CONFLICT (url_path)');
    } else {
      uniqueQuery.rows.forEach(constraint => {
        console.log(`   ✅ ${constraint.constraint_name} on ${constraint.column_name}`);
      });
    }
    
    // Check indexes
    console.log('\n3. Indexes:');
    const indexQuery = await client.query(`
      SELECT 
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = 'deleted_urls'
      ORDER BY indexname
    `);
    
    indexQuery.rows.forEach(idx => {
      console.log(`   ${idx.indexname}`);
      console.log(`      ${idx.indexdef}\n`);
    });
    
    console.log('='.repeat(80));
    console.log('RECOMMENDATION');
    console.log('='.repeat(80));
    
    const hasUrlPathUnique = uniqueQuery.rows.some(r => r.column_name === 'url_path');
    
    if (!hasUrlPathUnique) {
      console.log('\n❌ Missing UNIQUE constraint on url_path column!');
      console.log('\n💡 Solution: Add UNIQUE constraint');
      console.log('   ALTER TABLE public.deleted_urls ADD CONSTRAINT deleted_urls_url_path_key UNIQUE (url_path);');
    } else {
      console.log('\n✅ UNIQUE constraint exists on url_path');
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await client.end();
  }
}

checkConstraints();
