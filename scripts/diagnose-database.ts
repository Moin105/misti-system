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

interface TableInfo {
  table_name: string;
  columns: ColumnInfo[];
}

interface ColumnInfo {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
}

interface MigrationTable {
  name: string;
  columns: { [key: string]: string };
  file: string;
}

async function getDatabaseTables(client: Client): Promise<TableInfo[]> {
  const query = `
    SELECT 
      t.table_name,
      json_agg(
        json_build_object(
          'column_name', c.column_name,
          'data_type', c.data_type,
          'is_nullable', c.is_nullable,
          'column_default', c.column_default
        ) ORDER BY c.ordinal_position
      ) as columns
    FROM information_schema.tables t
    JOIN information_schema.columns c ON t.table_name = c.table_name
    WHERE t.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
    GROUP BY t.table_name
    ORDER BY t.table_name;
  `;
  
  const result = await client.query(query);
  return result.rows.map((row: any) => ({
    table_name: row.table_name,
    columns: row.columns
  }));
}

async function getDatabaseFunctions(client: Client): Promise<string[]> {
  const query = `
    SELECT routine_name
    FROM information_schema.routines
    WHERE routine_schema = 'public'
      AND routine_type = 'FUNCTION'
    ORDER BY routine_name;
  `;
  
  const result = await client.query(query);
  return result.rows.map((r: any) => r.routine_name);
}

async function getDatabaseTriggers(client: Client): Promise<string[]> {
  const query = `
    SELECT trigger_name
    FROM information_schema.triggers
    WHERE trigger_schema = 'public'
    ORDER BY trigger_name;
  `;
  
  const result = await client.query(query);
  return result.rows.map((r: any) => r.trigger_name);
}

async function getDatabasePolicies(client: Client): Promise<Array<{table: string, policy: string}>> {
  const query = `
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
    ORDER BY tablename, policyname;
  `;
  
  const result = await client.query(query);
  return result.rows.map((r: any) => ({
    table: r.tablename,
    policy: r.policyname
  }));
}

function extractTablesFromMigrations(migrationsDir: string): Map<string, MigrationTable> {
  const tables = new Map<string, MigrationTable>();
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const content = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    
    // Extract CREATE TABLE statements
    const createTableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?(\w+)\s*\(([\s\S]*?)\)(?:\s*;|$)/gi;
    let match;
    
    while ((match = createTableRegex.exec(content)) !== null) {
      const tableName = match[1];
      const columnsDef = match[2];
      
      if (!tables.has(tableName)) {
        tables.set(tableName, {
          name: tableName,
          columns: {},
          file: file
        });
      }
      
      const table = tables.get(tableName)!;
      
      // Extract column definitions - improved regex
      const lines = columnsDef.split('\n').map(l => l.trim()).filter(l => l);
      for (const line of lines) {
        // Skip constraints, comments, etc.
        if (line.startsWith('PRIMARY KEY') || 
            line.startsWith('FOREIGN KEY') || 
            line.startsWith('UNIQUE') ||
            line.startsWith('CHECK') ||
            line.startsWith('CONSTRAINT') ||
            line.startsWith('--') ||
            line === ')' ||
            line === ',') {
          continue;
        }
        
        // Match column definitions: column_name TYPE [constraints]
        const colMatch = line.match(/^(\w+)\s+([A-Z]+(?:\([^)]+\))?(?:\s+\w+)*)/i);
        if (colMatch) {
          const colName = colMatch[1];
          let colType = colMatch[2].trim();
          // Remove common constraints from type
          colType = colType.replace(/\s+(NOT\s+NULL|NULL|DEFAULT|UNIQUE|PRIMARY\s+KEY).*$/i, '').trim();
          table.columns[colName] = colType;
        }
      }
    }
    
    // Also check ALTER TABLE ADD COLUMN
    const alterTableRegex = /ALTER\s+TABLE\s+(?:public\.)?(\w+)\s+ADD\s+COLUMN\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)\s+([A-Z]+(?:\([^)]+\))?(?:\s+\w+)*)/gi;
    while ((match = alterTableRegex.exec(content)) !== null) {
      const tableName = match[1];
      const colName = match[2];
      let colType = match[3].trim();
      colType = colType.replace(/\s+(NOT\s+NULL|NULL|DEFAULT|UNIQUE).*$/i, '').trim();
      
      if (!tables.has(tableName)) {
        tables.set(tableName, {
          name: tableName,
          columns: {},
          file: file
        });
      }
      
      tables.get(tableName)!.columns[colName] = colType;
    }
  }
  
  return tables;
}

function normalizeType(dbType: string): string {
  // Normalize PostgreSQL types for comparison
  return dbType
    .toUpperCase()
    .replace(/CHARACTER VARYING/g, 'VARCHAR')
    .replace(/TIMESTAMP WITH TIME ZONE/g, 'TIMESTAMPTZ')
    .replace(/TIMESTAMP WITHOUT TIME ZONE/g, 'TIMESTAMP')
    .replace(/DOUBLE PRECISION/g, 'DOUBLE')
    .replace(/USER-DEFINED/g, '')
    .trim();
}

function compareTypes(dbType: string, migrationType: string): boolean {
  const normalizedDb = normalizeType(dbType);
  const normalizedMig = normalizeType(migrationType.toUpperCase());
  
  // Handle NUMERIC variations
  if (normalizedDb.includes('NUMERIC') && normalizedMig.includes('NUMERIC')) {
    return true; // Both are numeric, precision differences are OK
  }
  
  // Handle DECIMAL variations
  if (normalizedDb.includes('DECIMAL') && normalizedMig.includes('DECIMAL')) {
    return true;
  }
  
  // Handle TEXT/VARCHAR variations
  if ((normalizedDb === 'TEXT' || normalizedDb.includes('VARCHAR')) &&
      (normalizedMig === 'TEXT' || normalizedMig.includes('VARCHAR'))) {
    return true;
  }
  
  // Handle UUID
  if (normalizedDb === 'UUID' && normalizedMig === 'UUID') {
    return true;
  }
  
  // Handle BOOLEAN
  if ((normalizedDb === 'BOOLEAN' || normalizedDb === 'BOOL') &&
      (normalizedMig === 'BOOLEAN' || normalizedMig === 'BOOL')) {
    return true;
  }
  
  // Handle INTEGER variations
  if ((normalizedDb.includes('INTEGER') || normalizedDb === 'INT') &&
      (normalizedMig.includes('INTEGER') || normalizedMig === 'INT')) {
    return true;
  }
  
  return normalizedDb === normalizedMig;
}

async function main() {
  const connectionString = process.env.DATABASE_URL || 
    'postgresql://postgres.sclvjrnnnbbptnhonoks:V4FsoNxRkH8LR3Bj@aws-0-us-west-2.pooler.supabase.com:6543/postgres';
  
  const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');
  
  if (!fs.existsSync(migrationsDir)) {
    console.error(`❌ Migrations directory not found: ${migrationsDir}`);
    process.exit(1);
  }
  
  const config = parseConnectionString(encodeConnectionString(connectionString));
  const client = new Client(config);
  
  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✓ Connected!\n');
    
    console.log('📊 Analyzing database schema...\n');
    
    // Get database state
    const dbTables = await getDatabaseTables(client);
    const dbFunctions = await getDatabaseFunctions(client);
    const dbTriggers = await getDatabaseTriggers(client);
    const dbPolicies = await getDatabasePolicies(client);
    
    // Get migration definitions
    const migrationTables = extractTablesFromMigrations(migrationsDir);
    
    console.log('='.repeat(80));
    console.log('DATABASE SUMMARY');
    console.log('='.repeat(80));
    console.log(`Tables in database: ${dbTables.length}`);
    console.log(`Functions in database: ${dbFunctions.length}`);
    console.log(`Triggers in database: ${dbTriggers.length}`);
    console.log(`RLS Policies in database: ${dbPolicies.length}`);
    console.log(`Tables in migrations: ${migrationTables.size}\n`);
    
    // Find missing tables
    console.log('='.repeat(80));
    console.log('MISSING TABLES (in migrations but not in database)');
    console.log('='.repeat(80));
    const dbTableNames = new Set(dbTables.map(t => t.table_name));
    const missingTables: string[] = [];
    
    for (const [tableName, tableInfo] of migrationTables) {
      if (!dbTableNames.has(tableName)) {
        missingTables.push(tableName);
        console.log(`❌ ${tableName} (defined in ${tableInfo.file})`);
      }
    }
    
    if (missingTables.length === 0) {
      console.log('✅ All migration tables exist in database\n');
    } else {
      console.log(`\n⚠️  Found ${missingTables.length} missing tables\n`);
    }
    
    // Find extra tables (in database but not in migrations)
    console.log('='.repeat(80));
    console.log('EXTRA TABLES (in database but not in migrations)');
    console.log('='.repeat(80));
    const migrationTableNames = new Set(migrationTables.keys());
    const extraTables: string[] = [];
    
    for (const dbTable of dbTables) {
      if (!migrationTableNames.has(dbTable.table_name)) {
        extraTables.push(dbTable.table_name);
        console.log(`⚠️  ${dbTable.table_name} (exists in DB but not in migrations)`);
      }
    }
    
    if (extraTables.length === 0) {
      console.log('✅ All database tables have migrations\n');
    } else {
      console.log(`\n⚠️  Found ${extraTables.length} extra tables\n`);
    }
    
    // Check column type mismatches
    console.log('='.repeat(80));
    console.log('COLUMN TYPE MISMATCHES');
    console.log('='.repeat(80));
    const mismatches: Array<{
      table: string;
      column: string;
      dbType: string;
      migrationType: string;
      migrationFile: string;
    }> = [];
    
    for (const dbTable of dbTables) {
      const migrationTable = migrationTables.get(dbTable.table_name);
      if (!migrationTable) continue;
      
      for (const dbColumn of dbTable.columns) {
        const migrationType = migrationTable.columns[dbColumn.column_name];
        if (migrationType) {
          if (!compareTypes(dbColumn.data_type, migrationType)) {
            mismatches.push({
              table: dbTable.table_name,
              column: dbColumn.column_name,
              dbType: dbColumn.data_type,
              migrationType: migrationType,
              migrationFile: migrationTable.file
            });
          }
        }
      }
    }
    
    if (mismatches.length === 0) {
      console.log('✅ No column type mismatches found\n');
    } else {
      console.log(`⚠️  Found ${mismatches.length} column type mismatches:\n`);
      for (const mismatch of mismatches) {
        console.log(`Table: ${mismatch.table}`);
        console.log(`  Column: ${mismatch.column}`);
        console.log(`  Database type: ${mismatch.dbType}`);
        console.log(`  Migration type: ${mismatch.migrationType}`);
        console.log(`  Migration file: ${mismatch.migrationFile}\n`);
      }
    }
    
    // Check missing columns
    console.log('='.repeat(80));
    console.log('MISSING COLUMNS (in migrations but not in database)');
    console.log('='.repeat(80));
    const missingColumns: Array<{table: string, column: string, type: string, file: string}> = [];
    
    for (const dbTable of dbTables) {
      const migrationTable = migrationTables.get(dbTable.table_name);
      if (!migrationTable) continue;
      
      const dbColumnNames = new Set(dbTable.columns.map(c => c.column_name));
      
      for (const [colName, colType] of Object.entries(migrationTable.columns)) {
        if (!dbColumnNames.has(colName)) {
          missingColumns.push({
            table: dbTable.table_name,
            column: colName,
            type: colType,
            file: migrationTable.file
          });
        }
      }
    }
    
    if (missingColumns.length === 0) {
      console.log('✅ All migration columns exist in database\n');
    } else {
      console.log(`⚠️  Found ${missingColumns.length} missing columns:\n`);
      for (const col of missingColumns) {
        console.log(`Table: ${col.table}, Column: ${col.column}, Type: ${col.type} (${col.file})\n`);
      }
    }
    
    // Check extra columns (in database but not in migrations)
    console.log('='.repeat(80));
    console.log('EXTRA COLUMNS (in database but not in migrations)');
    console.log('='.repeat(80));
    const extraColumns: Array<{table: string, column: string, type: string}> = [];
    
    for (const dbTable of dbTables) {
      const migrationTable = migrationTables.get(dbTable.table_name);
      if (!migrationTable) continue;
      
      const migrationColumnNames = new Set(Object.keys(migrationTable.columns));
      
      for (const dbColumn of dbTable.columns) {
        if (!migrationColumnNames.has(dbColumn.column_name)) {
          extraColumns.push({
            table: dbTable.table_name,
            column: dbColumn.column_name,
            type: dbColumn.data_type
          });
        }
      }
    }
    
    if (extraColumns.length === 0) {
      console.log('✅ No extra columns found\n');
    } else {
      console.log(`⚠️  Found ${extraColumns.length} extra columns:\n`);
      for (const col of extraColumns) {
        console.log(`Table: ${col.table}, Column: ${col.column}, Type: ${col.type}\n`);
      }
    }
    
    // Summary
    console.log('='.repeat(80));
    console.log('SUMMARY');
    console.log('='.repeat(80));
    console.log(`Missing tables: ${missingTables.length}`);
    console.log(`Extra tables: ${extraTables.length}`);
    console.log(`Column type mismatches: ${mismatches.length}`);
    console.log(`Missing columns: ${missingColumns.length}`);
    console.log(`Extra columns: ${extraColumns.length}`);
    
    if (missingTables.length === 0 && mismatches.length === 0 && missingColumns.length === 0) {
      console.log('\n✅ Database schema matches migrations!');
    } else {
      console.log('\n⚠️  Action required: Fix the issues above');
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
