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

async function verifyForeignKeys() {
  const dbUrl = process.env.DATABASE_URL || 
    'postgresql://postgres.sclvjrnnnbbptnhonoks:V4FsoNxRkH8LR3Bj@aws-0-us-west-2.pooler.supabase.com:6543/postgres';
  
  const dbConfig = parseConnectionString(encodeConnectionString(dbUrl));
  const client = new Client(dbConfig);
  
  try {
    await client.connect();
    console.log('✅ Connected to database\n');
    
    console.log('='.repeat(80));
    console.log('VERIFYING FOREIGN KEY CONSTRAINTS');
    console.log('='.repeat(80));
    
    // Check cart_items -> products
    console.log('\n1. cart_items -> products');
    const cartItemsFK = await client.query(`
      SELECT 
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        rc.delete_rule
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      JOIN information_schema.referential_constraints AS rc
        ON rc.constraint_name = tc.constraint_name
        AND rc.constraint_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = 'cart_items'
        AND kcu.column_name = 'product_id'
        AND tc.table_schema = 'public'
    `);
    
    if (cartItemsFK.rows.length > 0) {
      const fk = cartItemsFK.rows[0];
      console.log(`   ✅ Constraint: ${fk.constraint_name}`);
      console.log(`   ✅ ${fk.table_name}.${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name}`);
      console.log(`   ✅ Delete Rule: ${fk.delete_rule}`);
    } else {
      console.log('   ❌ Foreign key NOT FOUND!');
    }
    
    // Check reviews -> review_platforms
    console.log('\n2. reviews -> review_platforms');
    const reviewsFK = await client.query(`
      SELECT 
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        rc.delete_rule
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      JOIN information_schema.referential_constraints AS rc
        ON rc.constraint_name = tc.constraint_name
        AND rc.constraint_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = 'reviews'
        AND kcu.column_name = 'platform_id'
        AND tc.table_schema = 'public'
    `);
    
    if (reviewsFK.rows.length > 0) {
      const fk = reviewsFK.rows[0];
      console.log(`   ✅ Constraint: ${fk.constraint_name}`);
      console.log(`   ✅ ${fk.table_name}.${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name}`);
      console.log(`   ✅ Delete Rule: ${fk.delete_rule}`);
    } else {
      console.log('   ❌ Foreign key NOT FOUND!');
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ VERIFICATION COMPLETE');
    console.log('='.repeat(80));
    console.log('\n💡 IMPORTANT: PostgREST Schema Cache Refresh Required!');
    console.log('   1. Go to: https://supabase.com/dashboard');
    console.log('   2. Select your project');
    console.log('   3. Go to: Settings → API');
    console.log('   4. Click: "Reload Schema" button');
    console.log('   5. Wait 1-2 minutes for changes to propagate');
    console.log('\n   OR wait 5-10 minutes for automatic refresh');
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await client.end();
  }
}

verifyForeignKeys();
