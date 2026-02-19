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
  
  const migrationFile = process.argv[2] || 
    path.join(process.cwd(), 'supabase', 'migrations', '20260219210000_fix_reviews_platform_relationship.sql');
  
  if (!fs.existsSync(migrationFile)) {
    console.error(`❌ Migration file not found: ${migrationFile}`);
    process.exit(1);
  }
  
  const config = parseConnectionString(encodeConnectionString(connectionString));
  const client = new Client(config);
  
  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✓ Connected!\n');
    
    console.log(`📄 Reading migration: ${path.basename(migrationFile)}\n`);
    const migrationSQL = fs.readFileSync(migrationFile, 'utf-8');
    
    console.log('🔄 Applying migration...\n');
    await client.query(migrationSQL);
    
    console.log('✅ Migration applied successfully!\n');
    
    // Verify the constraint exists
    const verifyResult = await client.query(`
      SELECT 
        conname as constraint_name,
        conrelid::regclass as table_name,
        confrelid::regclass as referenced_table
      FROM pg_constraint
      WHERE conname = 'reviews_platform_id_fkey'
        AND conrelid = 'public.reviews'::regclass;
    `);
    
    if (verifyResult.rows.length > 0) {
      console.log('✓ Foreign key constraint verified:');
      console.log(`  Constraint: ${verifyResult.rows[0].constraint_name}`);
      console.log(`  Table: ${verifyResult.rows[0].table_name}`);
      console.log(`  References: ${verifyResult.rows[0].referenced_table}\n`);
    } else {
      console.log('⚠️  Warning: Could not verify constraint (might still be creating)\n');
    }
    
    console.log('📝 Next Steps:');
    console.log('   1. Refresh PostgREST schema cache:');
    console.log('      - Go to Supabase Dashboard → Settings → API → Reload Schema');
    console.log('      - OR restart PostgREST service');
    console.log('   2. Test the query again');
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('already exists')) {
      console.log('\n⚠️  Constraint already exists. This is okay - migration was already applied.');
    } else {
      console.error(error.stack);
      process.exit(1);
    }
  } finally {
    await client.end();
  }
}

main();
