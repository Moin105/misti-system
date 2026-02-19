import { Client } from 'pg';
import fs from 'fs';
import path from 'path';

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
      ssl: { rejectUnauthorized: false }
    };
  } catch (error) {
    throw new Error(`Invalid connection string: ${connString}`);
  }
}

// Extract schema from INSERT statements in SQL file
function extractSchemaFromSQL(sqlFilePath: string): Map<string, any[]> {
  console.log('📋 Analyzing SQL file to extract schema...\n');
  
  const sqlContent = fs.readFileSync(sqlFilePath, 'utf-8');
  const tableSchemas = new Map<string, Map<string, string>>();
  
  // Match INSERT INTO statements - handle multi-line
  const lines = sqlContent.split('\n');
  let currentStatement = '';
  let inInsert = false;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip comments
    if (trimmed.startsWith('--')) continue;
    
    if (trimmed.toUpperCase().startsWith('INSERT INTO PUBLIC.')) {
      // Start of new INSERT
      if (currentStatement && inInsert) {
        processInsertStatement(currentStatement, tableSchemas);
      }
      currentStatement = line;
      inInsert = true;
    } else if (inInsert) {
      currentStatement += '\n' + line;
      
      // Check if statement ends
      if (trimmed.endsWith(';')) {
        processInsertStatement(currentStatement, tableSchemas);
        currentStatement = '';
        inInsert = false;
      }
    }
  }
  
  // Handle last statement
  if (currentStatement && inInsert) {
    processInsertStatement(currentStatement, tableSchemas);
  }
  
  // Convert to array format
  const result = new Map();
  tableSchemas.forEach((columns, tableName) => {
    result.set(tableName, Array.from(columns.entries()).map(([name, type]) => ({ name, type })));
  });
  
  console.log(`✓ Found ${result.size} tables with columns\n`);
  return result;
}

function processInsertStatement(statement: string, tableSchemas: Map<string, Map<string, string>>) {
  // Extract table name
  const tableMatch = statement.match(/INSERT INTO public\.(\w+)/i);
  if (!tableMatch) return;
  
  const tableName = tableMatch[1];
  
  // Extract column list
  const columnMatch = statement.match(/INSERT INTO public\.\w+\s*\(([^)]+)\)/i);
  if (!columnMatch) return;
  
  const columns = columnMatch[1]
    .split(',')
    .map(c => c.trim().replace(/"/g, '').replace(/'/g, ''));
  
  // Extract first VALUES to infer types
  const valuesMatch = statement.match(/VALUES\s*\(([^)]+)\)/i);
  if (!valuesMatch) return;
  
  const values = parseValues(valuesMatch[1]);
  
  if (!tableSchemas.has(tableName)) {
    tableSchemas.set(tableName, new Map());
  }
  
  const tableSchema = tableSchemas.get(tableName)!;
  
  columns.forEach((col, index) => {
    if (!tableSchema.has(col)) {
      const value = values[index] || 'NULL';
      const inferredType = inferPostgreSQLType(value);
      tableSchema.set(col, inferredType);
    }
  });
}

function parseValues(valuesString: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;
  let quoteChar = '';
  let depth = 0;
  
  for (let i = 0; i < valuesString.length; i++) {
    const char = valuesString[i];
    const prevChar = i > 0 ? valuesString[i - 1] : '';
    
    if ((char === '"' || char === "'") && prevChar !== '\\') {
      if (!inQuotes) {
        inQuotes = true;
        quoteChar = char;
        current += char;
      } else if (char === quoteChar) {
        inQuotes = false;
        quoteChar = '';
        current += char;
      } else {
        current += char;
      }
    } else if (char === '(' && !inQuotes) {
      depth++;
      current += char;
    } else if (char === ')' && !inQuotes) {
      depth--;
      current += char;
    } else if (char === ',' && !inQuotes && depth === 0) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  if (current.trim()) {
    values.push(current.trim());
  }
  
  return values;
}

function inferPostgreSQLType(value: string): string {
  const trimmed = value.trim();
  
  if (trimmed === 'NULL' || trimmed === 'null') {
    return 'TEXT'; // Default for nullable
  }
  
  if (trimmed.startsWith("'") || trimmed.startsWith('"')) {
    // String value
    const unquoted = trimmed.slice(1, -1);
    
    // Check if it's a UUID
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(unquoted)) {
      return 'UUID';
    }
    
    // Check if it's a timestamp
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(unquoted)) {
      return 'TIMESTAMPTZ';
    }
    
    // Check if it's a boolean string
    if (unquoted === 'true' || unquoted === 'false') {
      return 'BOOLEAN';
    }
    
    return 'TEXT';
  }
  
  // Numeric
  if (/^-?\d+$/.test(trimmed)) {
    return 'INTEGER';
  }
  
  if (/^-?\d+\.\d+$/.test(trimmed)) {
    return 'NUMERIC';
  }
  
  // Boolean
  if (trimmed === 'true' || trimmed === 'false') {
    return 'BOOLEAN';
  }
  
  return 'TEXT';
}

// Generate CREATE TABLE statements from inferred schema
function generateCreateTableStatements(schemas: Map<string, any[]>): string {
  const statements: string[] = [];
  
  schemas.forEach((columns, tableName) => {
    const columnDefs = columns.map(col => {
      let def = `  "${col.name}" ${col.type}`;
      
      // Add NOT NULL for UUIDs and common required fields
      if (col.type === 'UUID' && col.name === 'id') {
        def += ' NOT NULL';
      }
      
      return def;
    });
    
    // Add primary key if id column exists
    let primaryKey = '';
    if (columns.some(c => c.name === 'id')) {
      primaryKey = ',\n  PRIMARY KEY ("id")';
    }
    
    const createTable = `CREATE TABLE IF NOT EXISTS public."${tableName}" (\n${columnDefs.join(',\n')}${primaryKey}\n);`;
    statements.push(createTable);
  });
  
  return statements.join('\n\n');
}

// Import data in correct order
async function importDataInOrder(
  client: Client,
  sqlFilePath: string,
  tableOrder: string[]
): Promise<void> {
  console.log('📥 Importing data...\n');
  
  const sqlContent = fs.readFileSync(sqlFilePath, 'utf-8');
  
  // Group INSERTs by table
  const insertsByTable = new Map<string, string[]>();
  
  // Parse INSERT statements
  const lines = sqlContent.split('\n');
  let currentInsert = '';
  let currentTable = '';
  let inInsert = false;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    if (trimmed.startsWith('--')) continue;
    
    if (trimmed.toUpperCase().startsWith('INSERT INTO PUBLIC.')) {
      // Start of new INSERT
      if (currentInsert && currentTable) {
        if (!insertsByTable.has(currentTable)) {
          insertsByTable.set(currentTable, []);
        }
        insertsByTable.get(currentTable)!.push(currentInsert.trim());
      }
      
      const match = trimmed.match(/INSERT INTO public\.(\w+)/i);
      if (match) {
        currentTable = match[1];
        currentInsert = line;
        inInsert = true;
      }
    } else if (inInsert) {
      currentInsert += '\n' + line;
      
      // Check if statement ends
      if (trimmed.endsWith(';')) {
        if (currentTable) {
          if (!insertsByTable.has(currentTable)) {
            insertsByTable.set(currentTable, []);
          }
          insertsByTable.get(currentTable)!.push(currentInsert.trim());
        }
        currentInsert = '';
        currentTable = '';
        inInsert = false;
      }
    }
  }
  
  // Handle last statement
  if (currentInsert && currentTable) {
    if (!insertsByTable.has(currentTable)) {
      insertsByTable.set(currentTable, []);
    }
    insertsByTable.get(currentTable)!.push(currentInsert.trim());
  }
  
  // Disable foreign key checks
  await client.query('SET session_replication_role = replica;');
  
  let totalInserted = 0;
  let totalErrors = 0;
  
  // Import in table order
  for (const tableName of tableOrder) {
    const inserts = insertsByTable.get(tableName.toLowerCase()) || 
                   insertsByTable.get(tableName) ||
                   Array.from(insertsByTable.keys()).find(k => k.toLowerCase() === tableName.toLowerCase()) 
                     ? insertsByTable.get(Array.from(insertsByTable.keys()).find(k => k.toLowerCase() === tableName.toLowerCase())!)
                     : null;
    
    if (!inserts || inserts.length === 0) {
      continue;
    }
    
    console.log(`  Importing ${inserts.length} rows into ${tableName}...`);
    
    for (const insert of inserts) {
      try {
        await client.query(insert);
        totalInserted++;
      } catch (error: any) {
        totalErrors++;
        if (totalErrors <= 10) {
          console.error(`    ⚠ ${error.message.substring(0, 80)}`);
        }
      }
    }
    
    console.log(`  ✓ ${tableName}: ${inserts.length} rows\n`);
    
    if (totalInserted % 1000 === 0) {
      console.log(`  Progress: ${totalInserted} rows imported...\n`);
    }
  }
  
  await client.query('SET session_replication_role = DEFAULT;');
  
  console.log(`✅ Total: ${totalInserted} rows imported`);
  if (totalErrors > 0) {
    console.log(`⚠️  ${totalErrors} errors occurred`);
  }
}

async function main() {
  const connectionString = process.env.DATABASE_URL || 
    'postgresql://postgres.sclvjrnnnbbptnhonoks:V4FsoNxRkH8LR3Bj@aws-0-us-west-2.pooler.supabase.com:6543/postgres';
  
  const sqlFilePath = process.argv[2] || 
    path.join(process.cwd(), 'supabase', 'mysql', 'database-export-2026-02-17 (1).sql');
  
  if (!fs.existsSync(sqlFilePath)) {
    console.error(`Error: SQL file not found: ${sqlFilePath}`);
    process.exit(1);
  }
  
  const config = parseConnectionString(encodeConnectionString(connectionString));
  const client = new Client(config);
  
  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✓ Connected!\n');
    
    console.log('⚠️  WARNING: This will DROP all tables and recreate them!');
    console.log('Press Ctrl+C to cancel, or wait 5 seconds...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Step 1: Extract schema from SQL file
    const schemas = extractSchemaFromSQL(sqlFilePath);
    
    // Step 2: Drop all existing tables
    console.log('🗑️  Dropping all existing tables...');
    await client.query(`
      DO $$ 
      DECLARE r RECORD;
      BEGIN
        FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') 
        LOOP
          EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
        END LOOP;
      END $$;
    `);
    console.log('✓ All tables dropped\n');
    
    // Step 3: Generate and apply CREATE TABLE statements
    console.log('🏗️  Creating tables from SQL file schema...');
    const createStatements = generateCreateTableStatements(schemas);
    
    // Apply statements one by one
    const statements = createStatements.split(';').filter(s => s.trim());
    let created = 0;
    for (const stmt of statements) {
      if (stmt.trim()) {
        try {
          await client.query(stmt.trim() + ';');
          created++;
        } catch (error: any) {
          console.error(`  ⚠ Error: ${error.message.substring(0, 80)}`);
        }
      }
    }
    console.log(`✓ Created ${created} tables\n`);
    
    // Step 4: Get table order
    const tableOrder = Array.from(schemas.keys()).sort();
    
    // Step 5: Import data
    await importDataInOrder(client, sqlFilePath, tableOrder);
    
    console.log('\n✅ Complete! Database imported from SQL file!');
    
  } catch (error: any) {
    console.error('Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
