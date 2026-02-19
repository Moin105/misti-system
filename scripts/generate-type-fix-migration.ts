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

interface ColumnInfo {
  column_name: string;
  data_type: string;
  is_nullable: string;
}

async function getTableColumns(client: Client, tableName: string): Promise<ColumnInfo[]> {
  const query = `
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = $1
    ORDER BY ordinal_position;
  `;
  
  const result = await client.query(query, [tableName]);
  return result.rows;
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
    
    // Get all tables
    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    
    const tables = tablesResult.rows.map((r: any) => r.table_name);
    
    console.log(`📊 Found ${tables.length} tables. Generating type fix migration...\n`);
    
    const migrations: string[] = [];
    migrations.push('-- Fix column types that were incorrectly set to TEXT during data import');
    migrations.push('-- Generated automatically based on actual database schema');
    migrations.push('');
    
    for (const table of tables) {
      const columns = await getTableColumns(client, table);
      const fixes: string[] = [];
      
      for (const col of columns) {
        if (col.data_type === 'text') {
          // Try to infer correct type based on column name and data
          let targetType = '';
          
          // UUID columns
          if (col.column_name.endsWith('_id') || col.column_name === 'id') {
            // Check if it's actually UUID data
            const sampleQuery = await client.query(`
              SELECT ${col.column_name}
              FROM ${table}
              WHERE ${col.column_name} IS NOT NULL
              LIMIT 1;
            `);
            
            if (sampleQuery.rows.length > 0) {
              const value = sampleQuery.rows[0][col.column_name];
              if (typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
                targetType = 'UUID';
              }
            }
          }
          
          // Boolean columns
          if (col.column_name.startsWith('is_') || col.column_name.startsWith('has_')) {
            targetType = 'BOOLEAN';
          }
          
          // Timestamp columns
          if (col.column_name.includes('_at') || col.column_name.includes('_date')) {
            targetType = 'TIMESTAMPTZ';
          }
          
          // Integer columns
          if (col.column_name.includes('_count') || 
              col.column_name.includes('_id') && !col.column_name.endsWith('_id') ||
              col.column_name.includes('quantity') ||
              col.column_name.includes('amount') && !col.column_name.includes('total')) {
            // Check if it's numeric
            const sampleQuery = await client.query(`
              SELECT ${col.column_name}
              FROM ${table}
              WHERE ${col.column_name} IS NOT NULL
                AND ${col.column_name} != ''
              LIMIT 1;
            `);
            
            if (sampleQuery.rows.length > 0) {
              const value = sampleQuery.rows[0][col.column_name];
              if (typeof value === 'string' && /^-?\d+$/.test(value)) {
                targetType = 'INTEGER';
              } else if (typeof value === 'string' && /^-?\d+\.\d+$/.test(value)) {
                targetType = 'NUMERIC';
              }
            }
          }
          
          // JSONB columns
          if (col.column_name.includes('config') || 
              col.column_name.includes('options') ||
              col.column_name.includes('preferences') ||
              col.column_name.includes('details') ||
              col.column_name.includes('metadata') ||
              col.column_name.includes('_json')) {
            const sampleQuery = await client.query(`
              SELECT ${col.column_name}
              FROM ${table}
              WHERE ${col.column_name} IS NOT NULL
                AND ${col.column_name} != ''
              LIMIT 1;
            `);
            
            if (sampleQuery.rows.length > 0) {
              const value = sampleQuery.rows[0][col.column_name];
              if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
                try {
                  JSON.parse(value);
                  targetType = 'JSONB';
                } catch {}
              }
            }
          }
          
          if (targetType) {
            const nullable = col.is_nullable === 'YES' ? '' : ' NOT NULL';
            fixes.push(`  ALTER COLUMN ${col.column_name} TYPE ${targetType} USING ${col.column_name}::${targetType}${nullable};`);
          }
        }
      }
      
      if (fixes.length > 0) {
        migrations.push(`-- Fix ${table} table`);
        migrations.push(`ALTER TABLE ${table}`);
        migrations.push(fixes.join('\n'));
        migrations.push('');
      }
    }
    
    // Write migration file
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0].replace('T', '_');
    const migrationFile = path.join(process.cwd(), 'supabase', 'migrations', `${timestamp}_fix_column_types.sql`);
    
    fs.writeFileSync(migrationFile, migrations.join('\n'));
    console.log(`✅ Migration file created: ${migrationFile}`);
    console.log(`\n⚠️  Review the migration file before applying!`);
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
