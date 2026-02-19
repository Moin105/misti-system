import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Helper to encode password in connection string if needed
function encodeConnectionString(connString: string): string {
  // If password contains special characters and isn't already encoded, encode it
  const match = connString.match(/postgresql:\/\/([^:]+):([^@]+)@(.+)/);
  if (match) {
    const user = match[1];
    let password = match[2];
    const rest = match[3];
    
    // Check if password needs encoding (contains : or ! and not already encoded)
    if (password.includes(':') || password.includes('!')) {
      if (!password.includes('%')) {
        // Encode special characters
        password = encodeURIComponent(password);
      }
    }
    
    return `postgresql://${user}:${password}@${rest}`;
  }
  return connString;
}

// Parse PostgreSQL connection string
// Format: postgresql://user:password@host:port/database
function parseConnectionString(connString: string) {
  try {
    const url = new URL(connString);
    return {
      host: url.hostname,
      port: parseInt(url.port) || 5432,
      database: url.pathname.slice(1) || 'postgres', // Remove leading '/'
      user: url.username || 'postgres',
      password: decodeURIComponent(url.password || ''), // Decode URL-encoded password
      ssl: {
        rejectUnauthorized: false // Supabase requires SSL
      }
    };
  } catch (error) {
    // If URL parsing fails, try manual parsing
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

async function getTableNames(client: Client): Promise<string[]> {
  const query = `
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public'
    ORDER BY tablename;
  `;
  
  const result = await client.query(query);
  return result.rows.map(row => row.tablename);
}

async function dropAllTables(client: Client, tableNames: string[]): Promise<void> {
  console.log(`\nDropping ${tableNames.length} tables...`);
  console.log('⚠️  WARNING: This will DELETE all tables and their data permanently!');
  
  // Disable foreign key checks temporarily
  await client.query('SET session_replication_role = replica;');
  
  // Drop tables in reverse dependency order (child tables first)
  // First, drop all foreign key constraints, then drop tables
  for (const tableName of tableNames) {
    try {
      // Drop table with CASCADE to handle dependencies
      await client.query(`DROP TABLE IF EXISTS public."${tableName}" CASCADE;`);
      console.log(`  ✓ Dropped: ${tableName}`);
    } catch (error: any) {
      console.error(`  ✗ Error dropping ${tableName}: ${error.message}`);
    }
  }
  
  // Re-enable foreign key checks
  await client.query('SET session_replication_role = DEFAULT;');
  console.log('All tables dropped.\n');
}

async function executeSQLFile(client: Client, sqlFilePath: string): Promise<void> {
  console.log(`Reading SQL file: ${sqlFilePath}`);
  const sqlContent = fs.readFileSync(sqlFilePath, 'utf-8');
  
  const fileSizeMB = (sqlContent.length / 1024 / 1024).toFixed(2);
  console.log(`File size: ${fileSizeMB} MB`);
  console.log('Executing SQL statements...\n');
  
  // Disable foreign key constraints temporarily to allow out-of-order inserts
  console.log('Temporarily disabling foreign key constraint checks...');
  await client.query('SET session_replication_role = replica;');
  
  // Get list of existing tables to check before executing
  const existingTables = await getTableNames(client);
  const existingTablesSet = new Set(existingTables.map(t => t.toLowerCase()));
  console.log(`Found ${existingTables.length} existing tables\n`);
  
  // Filter out INSERT statements for non-existent tables
  // This is a simple approach - we'll comment out INSERTs for missing tables
  let filteredSQL = sqlContent;
  const missingTables: string[] = [];
  
  // Find all INSERT INTO statements and check if table exists
  const insertPattern = /INSERT\s+INTO\s+public\.(\w+)/gi;
  let match;
  const tableChecks = new Map<string, boolean>();
  
  while ((match = insertPattern.exec(sqlContent)) !== null) {
    const tableName = match[1].toLowerCase();
    if (!tableChecks.has(tableName)) {
      const exists = existingTablesSet.has(tableName);
      tableChecks.set(tableName, exists);
      if (!exists) {
        missingTables.push(match[1]);
      }
    }
  }
  
  if (missingTables.length > 0) {
    console.log(`⚠ Warning: ${missingTables.length} tables referenced in SQL file don't exist:`);
    missingTables.slice(0, 10).forEach(t => console.log(`   - ${t}`));
    if (missingTables.length > 10) {
      console.log(`   ... and ${missingTables.length - 10} more`);
    }
    console.log('\nThese INSERT statements will be skipped.\n');
    
    // Comment out INSERT statements for missing tables
    missingTables.forEach(tableName => {
      const regex = new RegExp(`INSERT\\s+INTO\\s+public\\.${tableName}\\s*[^;]*;`, 'gi');
      filteredSQL = filteredSQL.replace(regex, (match) => {
        return `-- SKIPPED (table doesn't exist): ${match.substring(0, 100)}...`;
      });
    });
  }
  
  // Execute SQL statement by statement to handle errors gracefully
  // Split by semicolon that's followed by newline (end of statement)
  const statements = filteredSQL
    .split(/;\s*\n/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));
  
  console.log(`Executing ${statements.length} SQL statements...`);
  console.log('(Continuing on errors to import as much data as possible)\n');
  
  let executed = 0;
  let errors = 0;
  const errorMessages = new Set<string>();
  
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    
    // Skip if it's a comment or empty
    if (statement.startsWith('--') || statement.length === 0) {
      continue;
    }
    
    try {
      await client.query(statement + ';');
      executed++;
      
      if (executed % 500 === 0) {
        console.log(`  Progress: ${executed}/${statements.length} statements executed...`);
      }
    } catch (error: any) {
      errors++;
      const errorKey = error.message.substring(0, 100);
      
      // Only track unique error messages
      if (!errorMessages.has(errorKey) && errorMessages.size < 20) {
        errorMessages.add(errorKey);
        // Extract table name if possible
        const tableMatch = statement.match(/INSERT\s+INTO\s+public\.(\w+)/i);
        const tableName = tableMatch ? tableMatch[1] : 'unknown';
        console.error(`  ⚠ Error on statement ${i + 1} (table: ${tableName}): ${error.message.substring(0, 150)}`);
      }
    }
  }
  
  // Re-enable foreign key constraints
  console.log('\nRe-enabling foreign key constraint checks...');
  await client.query('SET session_replication_role = DEFAULT;');
  
  console.log('\n✓ SQL file execution completed!');
  console.log(`  Successfully executed: ${executed} statements`);
  if (errors > 0) {
    console.log(`  Failed: ${errors} statements (schema mismatches or other errors)`);
    if (missingTables.length > 0) {
      console.log(`  Skipped tables: ${missingTables.length} tables don't exist`);
    }
    console.log('\n⚠ Some data may not have been imported due to schema differences.');
    console.log('   This is normal if your database schema differs from the export.');
  } else {
    console.log('  All statements executed successfully!');
  }
  
  if (missingTables.length > 0) {
    console.log(`\n⚠ Note: ${missingTables.length} tables were skipped because they don't exist.`);
    console.log('   If you need these tables, create them first using migrations.');
  }
  
  // Don't throw error - we want to continue even if some statements fail
  // The function completes successfully even if some individual statements fail
}

async function main() {
  // Connection string from environment variable or command line argument
  // Note: Password with special characters should be URL-encoded
  // eQn:te3A8MBpL!h should be eQn%3Ate3A8MBpL%21h
  let connectionString = process.env.DATABASE_URL || process.argv[3];
  
  if (!connectionString) {
    // Default connection string - password will be auto-encoded if needed
    connectionString = 'postgresql://postgres:eQn:te3A8MBpL!h@db.sclvjrnnnbbptnhonoks.supabase.co:5432/postgres';
  }
  
  // Encode connection string if needed
  connectionString = encodeConnectionString(connectionString);
  
  // SQL file path
  const sqlFilePath = process.argv[2] || 
    path.join(process.cwd(), 'supabase', 'mysql', 'database-export-2026-02-17 (1).sql');
  
  if (!fs.existsSync(sqlFilePath)) {
    console.error(`Error: SQL file not found: ${sqlFilePath}`);
    process.exit(1);
  }
  
  console.log('Connection string (password hidden):', connectionString.replace(/:[^:@]+@/, ':****@'));
  
  let config;
  try {
    config = parseConnectionString(connectionString);
  } catch (error: any) {
    console.error('Error parsing connection string:', error.message);
    console.error('\nPlease check your connection string format:');
    console.error('Format: postgresql://user:password@host:port/database');
    console.error('Note: Special characters in password (:, !, @, etc.) should be URL-encoded');
    process.exit(1);
  }
  const client = new Client(config);
  
  try {
    console.log('Connecting to PostgreSQL database...');
    console.log(`Host: ${config.host}:${config.port}`);
    console.log(`Database: ${config.database}`);
    console.log(`User: ${config.user}`);
    
    try {
      await client.connect();
      console.log('✓ Connected successfully!\n');
    } catch (connectError: any) {
      if (connectError.code === 'ENOTFOUND') {
        console.error('\n✗ DNS Error: Could not resolve hostname');
        console.error(`  Hostname: ${config.host}`);
        console.error('\nPossible issues:');
        console.error('  1. The hostname might be incorrect');
        console.error('  2. Check your internet connection');
        console.error('  3. Verify the connection string from Supabase Dashboard');
        console.error('\nTo get your connection string:');
        console.error('  1. Go to Supabase Dashboard → Settings → Database');
        console.error('  2. Copy the "Connection string" under "Connection parameters"');
        console.error('  3. Set it as DATABASE_URL environment variable or pass as argument');
      } else if (connectError.code === 'ETIMEDOUT') {
        console.error('\n✗ Connection Timeout: Could not connect to database');
        console.error('  Check your firewall settings and network connection');
      } else {
        console.error('\n✗ Connection Error:', connectError.message);
      }
      throw connectError;
    }
    
    // Get all table names
    console.log('Fetching table names...');
    const tableNames = await getTableNames(client);
    console.log(`Found ${tableNames.length} tables in the database.\n`);
    
    // Ask for confirmation (in production, you might want to add a prompt)
    console.log('⚠️  WARNING: This will DROP (DELETE) all tables and their data permanently!');
    console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Don't drop tables - let migrations handle schema
    // Instead, just truncate all tables to clear data
    console.log('\n⚠️  Note: Keeping tables structure intact.');
    console.log('   Will truncate all tables (clear data) instead of dropping them.');
    console.log('   Then run migrations to ensure schema is up-to-date.');
    console.log('   Finally, import data from SQL file.\n');
    
    // Truncate all tables instead of dropping
    await client.query('SET session_replication_role = replica;');
    for (const tableName of tableNames) {
      try {
        await client.query(`TRUNCATE TABLE public."${tableName}" CASCADE;`);
      } catch (error: any) {
        // Ignore errors - table might not exist or have dependencies
      }
    }
    await client.query('SET session_replication_role = DEFAULT;');
    console.log(`✓ Truncated ${tableNames.length} tables\n`);
    
    // Close connection temporarily to run migrations
    await client.end();
    console.log('Database connection closed temporarily.\n');
    
    // Run migrations to ensure all tables exist and are up-to-date
    console.log('🔄 Running migrations to ensure all tables exist...');
    console.log('   This will apply all migration files from supabase/migrations/\n');
    
    let migrationsSucceeded = false;
    try {
      // Try with npx first, then direct command
      try {
        execSync('npx supabase db push --yes', { 
          stdio: 'inherit',
          cwd: process.cwd(),
          shell: true,
          env: { ...process.env }
        });
        migrationsSucceeded = true;
        console.log('\n✓ Migrations applied successfully!\n');
      } catch (npxError: any) {
        // Try direct command
        execSync('supabase db push --yes', { 
          stdio: 'inherit',
          cwd: process.cwd(),
          shell: true,
          env: { ...process.env }
        });
        migrationsSucceeded = true;
        console.log('\n✓ Migrations applied successfully!\n');
      }
    } catch (error: any) {
      console.error('\n⚠ Migration error occurred.');
      console.error('   This might be expected if some migrations reference non-existent tables.');
      console.error('   Continuing with data import - tables should still exist from previous run.\n');
    }
    
    // Reconnect to database
    console.log('Reconnecting to database...');
    const newClient = new Client(config);
    await newClient.connect();
    console.log('✓ Reconnected successfully!\n');
    
    // Verify tables exist
    const finalTableNames = await getTableNames(newClient);
    console.log(`✓ Found ${finalTableNames.length} tables ready for data import\n`);
    
    if (finalTableNames.length === 0) {
      console.error('✗ No tables found! Please run migrations manually:');
      console.error('   supabase db push');
      console.error('   or');
      console.error('   npx supabase db push');
      await newClient.end();
      process.exit(1);
    }
    
    // Execute SQL file to import data
    await executeSQLFile(newClient, sqlFilePath);
    
    // Close the new connection
    await newClient.end();
    
    console.log('\n✓ Database import completed successfully!');
    
  } catch (error: any) {
    console.error('Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    await client.end();
    console.log('\nDatabase connection closed.');
  }
}

main();
