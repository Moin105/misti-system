import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Helper functions from execute-sql-file.ts
function encodeConnectionString(connString: string): string {
  const match = connString.match(/postgresql:\/\/([^:]+):([^@]+)@(.+)/);
  if (match) {
    const user = match[1];
    let password = match[2];
    const rest = match[3];
    
    if (password.includes(':') || password.includes('!')) {
      if (!password.includes('%')) {
        password = encodeURIComponent(password);
      }
    }
    
    return `postgresql://${user}:${password}@${rest}`;
  }
  return connString;
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
      ssl: {
        rejectUnauthorized: false
      }
    };
  } catch (error) {
    const match = connString.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
    if (match) {
      return {
        host: match[3],
        port: parseInt(match[4]) || 5432,
        database: match[5],
        user: decodeURIComponent(match[1]),
        password: decodeURIComponent(match[2]),
        ssl: {
          rejectUnauthorized: false
        }
      };
    }
    throw new Error(`Invalid connection string format: ${connString}`);
  }
}

async function dropAllTables(client: Client): Promise<void> {
  const result = await client.query(`
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public'
    ORDER BY tablename;
  `);
  
  const tableNames = result.rows.map(row => row.tablename);
  
  if (tableNames.length === 0) {
    console.log('No tables to drop.\n');
    return;
  }
  
  console.log(`Dropping ${tableNames.length} tables...`);
  await client.query('SET session_replication_role = replica;');
  
  for (const tableName of tableNames) {
    try {
      await client.query(`DROP TABLE IF EXISTS public."${tableName}" CASCADE;`);
      console.log(`  ✓ Dropped: ${tableName}`);
    } catch (error: any) {
      console.error(`  ✗ Error dropping ${tableName}: ${error.message}`);
    }
  }
  
  await client.query('SET session_replication_role = DEFAULT;');
  console.log('All tables dropped.\n');
}

async function applyCreateTableStatements(client: Client, migrationsDir: string): Promise<void> {
  console.log('📁 Reading migration files...');
  const files = fs.readdirSync(migrationsDir);
  const migrationFiles = files
    .filter(f => f.endsWith('.sql'))
    .map(f => path.join(migrationsDir, f))
    .sort(); // Sort by filename (which includes timestamp)
  
  console.log(`Found ${migrationFiles.length} migration files\n`);
  
  let tablesCreated = 0;
  const createdTables = new Set<string>();
  
  for (const filePath of migrationFiles) {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Extract CREATE TABLE statements
    const createTableRegex = /CREATE TABLE (?:IF NOT EXISTS )?public\.(\w+)\s*\([^;]+\)/gi;
    let match;
    
    while ((match = createTableRegex.exec(content)) !== null) {
      const tableName = match[1];
      if (!createdTables.has(tableName)) {
        // Extract the full CREATE TABLE statement
        const fullMatch = content.substring(match.index);
        const endIndex = fullMatch.indexOf(');') + 2;
        const createStatement = fullMatch.substring(0, endIndex);
        
        try {
          await client.query(createStatement);
          createdTables.add(tableName);
          tablesCreated++;
          console.log(`  ✓ Created table: ${tableName}`);
        } catch (error: any) {
          // Table might already exist or have dependencies - that's okay
          if (!error.message.includes('already exists')) {
            console.log(`  ⚠ Skipped ${tableName}: ${error.message.substring(0, 60)}`);
          }
        }
      }
    }
  }
  
  console.log(`\n✓ Created ${tablesCreated} tables from migrations\n`);
}

async function importData(client: Client, sqlFilePath: string): Promise<void> {
  console.log(`📥 Importing data from SQL file...`);
  const sqlContent = fs.readFileSync(sqlFilePath, 'utf-8');
  
  const fileSizeMB = (sqlContent.length / 1024 / 1024).toFixed(2);
  console.log(`File size: ${fileSizeMB} MB\n`);
  
  // Disable foreign key checks
  await client.query('SET session_replication_role = replica;');
  
  // Get existing tables
  const result = await client.query(`
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public'
    ORDER BY tablename;
  `);
  const existingTables = new Set(result.rows.map(r => r.tablename.toLowerCase()));
  
  // Split into statements and execute
  const statements = sqlContent
    .split(/;\s*\n/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));
  
  console.log(`Executing ${statements.length} INSERT statements...\n`);
  
  let executed = 0;
  let skipped = 0;
  let errors = 0;
  
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    const tableMatch = statement.match(/INSERT\s+INTO\s+public\.(\w+)/i);
    
    if (tableMatch) {
      const tableName = tableMatch[1].toLowerCase();
      if (!existingTables.has(tableName)) {
        skipped++;
        continue;
      }
    }
    
    try {
      await client.query(statement + ';');
      executed++;
      if (executed % 500 === 0) {
        console.log(`  Progress: ${executed} statements executed...`);
      }
    } catch (error: any) {
      errors++;
      if (errors <= 10) {
        const tableName = tableMatch ? tableMatch[1] : 'unknown';
        console.error(`  ⚠ Error (${tableName}): ${error.message.substring(0, 100)}`);
      }
    }
  }
  
  await client.query('SET session_replication_role = DEFAULT;');
  
  console.log(`\n✓ Data import completed!`);
  console.log(`  Executed: ${executed} statements`);
  console.log(`  Skipped: ${skipped} statements`);
  if (errors > 0) {
    console.log(`  Errors: ${errors} statements`);
  }
}

async function main() {
  const connectionString = process.env.DATABASE_URL || 
    'postgresql://postgres.sclvjrnnnbbptnhonoks:V4FsoNxRkH8LR3Bj@aws-0-us-west-2.pooler.supabase.com:6543/postgres';
  
  const sqlFilePath = process.argv[2] || 
    path.join(process.cwd(), 'supabase', 'mysql', 'database-export-2026-02-17 (1).sql');
  
  const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');
  
  if (!fs.existsSync(sqlFilePath)) {
    console.error(`Error: SQL file not found: ${sqlFilePath}`);
    process.exit(1);
  }
  
  if (!fs.existsSync(migrationsDir)) {
    console.error(`Error: Migrations directory not found: ${migrationsDir}`);
    process.exit(1);
  }
  
  const encoded = encodeConnectionString(connectionString);
  const config = parseConnectionString(encoded);
  const client = new Client(config);
  
  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✓ Connected!\n');
    
    console.log('⚠️  WARNING: This will DROP all tables and recreate them!');
    console.log('Press Ctrl+C to cancel, or wait 5 seconds...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Step 1: Drop all tables
    await dropAllTables(client);
    
    // Step 2: Apply CREATE TABLE statements from migrations
    await applyCreateTableStatements(client, migrationsDir);
    
    // Step 3: Import data
    await importData(client, sqlFilePath);
    
    console.log('\n✅ All done! Tables created and data imported successfully!');
    
  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
