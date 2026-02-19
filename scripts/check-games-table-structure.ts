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

async function checkTableStructure() {
  const dbUrl = process.env.DATABASE_URL || 
    'postgresql://postgres.sclvjrnnnbbptnhonoks:V4FsoNxRkH8LR3Bj@aws-0-us-west-2.pooler.supabase.com:6543/postgres';
  
  const dbConfig = parseConnectionString(encodeConnectionString(dbUrl));
  const client = new Client(dbConfig);
  
  try {
    await client.connect();
    console.log('✅ Connected to database\n');
    
    console.log('='.repeat(80));
    console.log('CHECKING GAMES TABLE STRUCTURE');
    console.log('='.repeat(80));
    
    // Check id column definition
    const columnQuery = await client.query(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'games'
        AND column_name = 'id'
    `);
    
    if (columnQuery.rows.length > 0) {
      const col = columnQuery.rows[0];
      console.log('\n📋 ID Column Definition:');
      console.log(`   Column: ${col.column_name}`);
      console.log(`   Type: ${col.data_type}`);
      console.log(`   Nullable: ${col.is_nullable}`);
      console.log(`   Default: ${col.column_default || 'NULL'}`);
      
      if (!col.column_default || !col.column_default.includes('gen_random_uuid')) {
        console.log('\n⚠️  WARNING: Default is missing or incorrect!');
      } else {
        console.log('\n✅ Default is set correctly');
      }
    } else {
      console.log('\n❌ ID column not found!');
    }
    
    // Check for triggers
    console.log('\n📋 Triggers on games table:');
    const triggerQuery = await client.query(`
      SELECT 
        trigger_name,
        event_manipulation,
        action_timing,
        action_statement
      FROM information_schema.triggers
      WHERE event_object_schema = 'public'
        AND event_object_table = 'games'
      ORDER BY trigger_name
    `);
    
    if (triggerQuery.rows.length > 0) {
      triggerQuery.rows.forEach(trigger => {
        console.log(`   ${trigger.trigger_name}`);
        console.log(`      Event: ${trigger.event_manipulation}`);
        console.log(`      Timing: ${trigger.action_timing}`);
        console.log(`      Statement: ${trigger.action_statement}\n`);
      });
    } else {
      console.log('   No triggers found\n');
    }
    
    // Test insert (will rollback)
    console.log('🧪 Testing INSERT (will rollback):');
    await client.query('BEGIN');
    try {
      const testInsert = await client.query(`
        INSERT INTO public.games (name, slug, is_active)
        VALUES ('TEST_GAME_' || gen_random_uuid()::text, 'test-slug-' || gen_random_uuid()::text, true)
        RETURNING id
      `);
      
      if (testInsert.rows.length > 0 && testInsert.rows[0].id) {
        console.log(`   ✅ Test INSERT successful - ID generated: ${testInsert.rows[0].id}`);
      } else {
        console.log('   ❌ Test INSERT failed - No ID generated');
      }
    } catch (error: any) {
      console.log(`   ❌ Test INSERT error: ${error.message}`);
    } finally {
      await client.query('ROLLBACK');
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await client.end();
  }
}

checkTableStructure();
