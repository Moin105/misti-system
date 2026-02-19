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

async function backupEverything(client: Client, outputDir: string) {
  console.log('📦 Starting comprehensive backup...\n');
  
  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const backupFile = path.join(outputDir, `complete-backup-${timestamp}.sql`);
  const writer = fs.createWriteStream(backupFile);
  
  // Write header
  writer.write(`-- =====================================================\n`);
  writer.write(`-- COMPREHENSIVE SUPABASE BACKUP\n`);
  writer.write(`-- Generated: ${new Date().toISOString()}\n`);
  writer.write(`-- Includes: Tables, Data, Functions, Triggers, RLS Policies, Constraints\n`);
  writer.write(`-- =====================================================\n\n`);
  
  // 1. Backup Schema (Tables, Types, Extensions)
  console.log('📋 Step 1: Backing up schema...');
  writer.write(`-- =====================================================\n`);
  writer.write(`-- SCHEMA: Types, Extensions, Tables\n`);
  writer.write(`-- =====================================================\n\n`);
  
  // Get all custom types
  const typesResult = await client.query(`
    SELECT 
      t.typname as type_name,
      pg_catalog.format_type(t.oid, NULL) as type_definition
    FROM pg_catalog.pg_type t
    LEFT JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
    WHERE (t.typrelid = 0 OR (SELECT c.relkind = 'c' FROM pg_catalog.pg_class c WHERE c.oid = t.typrelid))
      AND NOT EXISTS(SELECT 1 FROM pg_catalog.pg_type el WHERE el.oid = t.typelem AND el.typarray = t.oid)
      AND n.nspname = 'public'
      AND t.typtype = 'e'
    ORDER BY t.typname;
  `);
  
  for (const type of typesResult.rows) {
    writer.write(`-- Type: ${type.type_name}\n`);
    writer.write(`-- ${type.type_definition}\n\n`);
  }
  
  // Get table schemas
  const tablesResult = await client.query(`
    SELECT 
      schemaname,
      tablename
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename;
  `);
  
  for (const table of tablesResult.rows) {
    const createTableResult = await client.query(`
      SELECT 
        'CREATE TABLE ' || quote_ident(table_schema) || '.' || quote_ident(table_name) || ' (' ||
        string_agg(
          quote_ident(column_name) || ' ' || 
          CASE 
            WHEN data_type = 'USER-DEFINED' THEN udt_name
            WHEN data_type = 'ARRAY' THEN udt_name || '[]'
            ELSE data_type || 
              CASE 
                WHEN character_maximum_length IS NOT NULL THEN '(' || character_maximum_length || ')'
                WHEN numeric_precision IS NOT NULL THEN '(' || numeric_precision || 
                  CASE WHEN numeric_scale IS NOT NULL THEN ',' || numeric_scale ELSE '' END || ')'
                ELSE ''
              END
          END ||
          CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
          CASE WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default ELSE '' END,
          ', '
          ORDER BY ordinal_position
        ) || ');' as create_statement
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      GROUP BY table_schema, table_name;
    `, [table.tablename]);
    
    if (createTableResult.rows.length > 0) {
      writer.write(`-- Table: ${table.tablename}\n`);
      writer.write(`${createTableResult.rows[0].create_statement}\n\n`);
    }
  }
  
  // 2. Backup Constraints (Foreign Keys, Unique, Check)
  console.log('🔗 Step 2: Backing up constraints...');
  writer.write(`-- =====================================================\n`);
  writer.write(`-- CONSTRAINTS: Foreign Keys, Unique, Check\n`);
  writer.write(`-- =====================================================\n\n`);
  
  const constraintsResult = await client.query(`
    SELECT
      conname as constraint_name,
      conrelid::regclass as table_name,
      pg_get_constraintdef(oid) as constraint_definition
    FROM pg_constraint
    WHERE connamespace = 'public'::regnamespace
      AND contype IN ('f', 'u', 'c', 'p')
    ORDER BY conrelid::regclass::text, conname;
  `);
  
  for (const constraint of constraintsResult.rows) {
    writer.write(`-- Constraint: ${constraint.constraint_name} on ${constraint.table_name}\n`);
    writer.write(`ALTER TABLE ${constraint.table_name} ADD CONSTRAINT ${constraint.constraint_name} ${constraint.constraint_definition};\n\n`);
  }
  
  // 3. Backup Functions
  console.log('⚙️  Step 3: Backing up functions...');
  writer.write(`-- =====================================================\n`);
  writer.write(`-- FUNCTIONS\n`);
  writer.write(`-- =====================================================\n\n`);
  
  const functionsResult = await client.query(`
    SELECT
      p.proname as function_name,
      pg_get_functiondef(p.oid) as function_definition
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    ORDER BY p.proname;
  `);
  
  for (const func of functionsResult.rows) {
    writer.write(`-- Function: ${func.function_name}\n`);
    writer.write(`${func.function_definition};\n\n`);
  }
  
  // 4. Backup Triggers
  console.log('🔔 Step 4: Backing up triggers...');
  writer.write(`-- =====================================================\n`);
  writer.write(`-- TRIGGERS\n`);
  writer.write(`-- =====================================================\n\n`);
  
  const triggersResult = await client.query(`
    SELECT
      trigger_name,
      event_object_table as table_name,
      action_statement,
      action_timing,
      event_manipulation
    FROM information_schema.triggers
    WHERE trigger_schema = 'public'
    ORDER BY event_object_table, trigger_name;
  `);
  
  for (const trigger of triggersResult.rows) {
    writer.write(`-- Trigger: ${trigger.trigger_name} on ${trigger.table_name}\n`);
    writer.write(`CREATE TRIGGER ${trigger.trigger_name}\n`);
    writer.write(`  ${trigger.action_timing} ${trigger.event_manipulation} ON ${trigger.table_name}\n`);
    writer.write(`  FOR EACH ROW\n`);
    writer.write(`  ${trigger.action_statement};\n\n`);
  }
  
  // 5. Backup RLS Policies
  console.log('🔒 Step 5: Backing up RLS policies...');
  writer.write(`-- =====================================================\n`);
  writer.write(`-- ROW LEVEL SECURITY POLICIES\n`);
  writer.write(`-- =====================================================\n\n`);
  
  const policiesResult = await client.query(`
    SELECT
      schemaname,
      tablename,
      policyname,
      permissive,
      roles,
      cmd,
      qual,
      with_check
    FROM pg_policies
    WHERE schemaname = 'public'
    ORDER BY tablename, policyname;
  `);
  
  for (const policy of policiesResult.rows) {
    writer.write(`-- Policy: ${policy.policyname} on ${policy.tablename}\n`);
    writer.write(`CREATE POLICY ${policy.policyname}\n`);
    writer.write(`  ON ${policy.tablename}\n`);
    writer.write(`  FOR ${policy.cmd}\n`);
    if (policy.roles && policy.roles.length > 0) {
      writer.write(`  TO ${policy.roles.join(', ')}\n`);
    }
    if (policy.qual) {
      writer.write(`  USING (${policy.qual})\n`);
    }
    if (policy.with_check) {
      writer.write(`  WITH CHECK (${policy.with_check})\n`);
    }
    writer.write(`;\n\n`);
  }
  
  // 6. Backup Data (All Tables)
  console.log('💾 Step 6: Backing up data...');
  writer.write(`-- =====================================================\n`);
  writer.write(`-- DATA: All Tables\n`);
  writer.write(`-- =====================================================\n\n`);
  
  for (const table of tablesResult.rows) {
    console.log(`  Backing up ${table.tablename}...`);
    
    const dataResult = await client.query(`
      SELECT * FROM ${table.tablename} ORDER BY 1;
    `);
    
    if (dataResult.rows.length > 0) {
      writer.write(`-- Table: ${table.tablename} (${dataResult.rows.length} rows)\n`);
      
      // Get column names
      const columns = Object.keys(dataResult.rows[0]);
      
      // Write INSERT statements in batches
      const batchSize = 100;
      for (let i = 0; i < dataResult.rows.length; i += batchSize) {
        const batch = dataResult.rows.slice(i, i + batchSize);
        writer.write(`INSERT INTO ${table.tablename} (${columns.map(c => `"${c}"`).join(', ')}) VALUES\n`);
        
        const values = batch.map((row, idx) => {
          const rowValues = columns.map(col => {
            const value = row[col];
            if (value === null) return 'NULL';
            if (typeof value === 'string') {
              return `'${value.replace(/'/g, "''")}'`;
            }
            if (typeof value === 'boolean') return value ? 'true' : 'false';
            if (value instanceof Date) return `'${value.toISOString()}'`;
            if (typeof value === 'object') return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
            return String(value);
          });
          return `  (${rowValues.join(', ')})`;
        });
        
        writer.write(values.join(',\n'));
        writer.write(`;\n\n`);
      }
    } else {
      writer.write(`-- Table: ${table.tablename} (0 rows)\n\n`);
    }
  }
  
  // 7. Backup Auth Users (CRITICAL - with encrypted passwords)
  console.log('👤 Step 7: Backing up auth users...');
  writer.write(`-- =====================================================\n`);
  writer.write(`-- AUTH USERS (with encrypted passwords)\n`);
  writer.write(`-- =====================================================\n`);
  writer.write(`-- WARNING: This requires service_role access to auth schema\n`);
  writer.write(`-- =====================================================\n\n`);
  
  try {
    // First check if we can access auth schema
    const schemaCheck = await client.query(`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name = 'auth';
    `);
    
    if (schemaCheck.rows.length === 0) {
      writer.write(`-- WARNING: auth schema not accessible\n`);
      writer.write(`-- Use service_role connection string to backup auth users\n\n`);
    } else {
      // Try to get auth users
      const authUsersResult = await client.query(`
        SELECT 
          id,
          email,
          encrypted_password,
          email_confirmed_at,
          created_at,
          updated_at,
          raw_user_meta_data,
          raw_app_meta_data,
          confirmed_at,
          last_sign_in_at,
          phone,
          phone_confirmed_at,
          recovery_sent_at,
          email_change,
          email_change_token_new,
          email_change_sent_at,
          banned_until,
          reauthentication_token,
          reauthentication_sent_at,
          is_sso_user,
          deleted_at
        FROM auth.users
        ORDER BY created_at;
      `);
      
      writer.write(`-- Auth Users: ${authUsersResult.rows.length} users\n`);
      writer.write(`-- Note: Passwords are encrypted (bcrypt) and preserved\n`);
      writer.write(`-- Users can log in with their original passwords after restore\n\n`);
      
      if (authUsersResult.rows.length > 0) {
        writer.write(`-- Disable triggers temporarily for auth.users\n`);
        writer.write(`ALTER TABLE auth.users DISABLE TRIGGER ALL;\n\n`);
        
        for (const user of authUsersResult.rows) {
          writer.write(`-- User: ${user.email || 'No email'}\n`);
          writer.write(`INSERT INTO auth.users (\n`);
          writer.write(`  id, email, encrypted_password, email_confirmed_at, created_at, updated_at,\n`);
          writer.write(`  raw_user_meta_data, raw_app_meta_data, confirmed_at, last_sign_in_at,\n`);
          writer.write(`  phone, phone_confirmed_at, recovery_sent_at, email_change,\n`);
          writer.write(`  email_change_token_new, email_change_sent_at, banned_until,\n`);
          writer.write(`  reauthentication_token, reauthentication_sent_at, is_sso_user, deleted_at\n`);
          writer.write(`) VALUES (\n`);
          writer.write(`  '${user.id}'::uuid,\n`);
          writer.write(`  ${user.email ? `'${user.email.replace(/'/g, "''")}'` : 'NULL'},\n`);
          writer.write(`  ${user.encrypted_password ? `'${user.encrypted_password.replace(/'/g, "''")}'` : 'NULL'},\n`);
          writer.write(`  ${user.email_confirmed_at ? `'${user.email_confirmed_at}'::timestamptz` : 'NULL'},\n`);
          writer.write(`  '${user.created_at}'::timestamptz,\n`);
          writer.write(`  '${user.updated_at}'::timestamptz,\n`);
          writer.write(`  ${user.raw_user_meta_data ? `'${JSON.stringify(user.raw_user_meta_data).replace(/'/g, "''")}'::jsonb` : `'{}'::jsonb`},\n`);
          writer.write(`  ${user.raw_app_meta_data ? `'${JSON.stringify(user.raw_app_meta_data).replace(/'/g, "''")}'::jsonb` : `'{}'::jsonb`},\n`);
          writer.write(`  ${user.confirmed_at ? `'${user.confirmed_at}'::timestamptz` : 'NULL'},\n`);
          writer.write(`  ${user.last_sign_in_at ? `'${user.last_sign_in_at}'::timestamptz` : 'NULL'},\n`);
          writer.write(`  ${user.phone ? `'${user.phone.replace(/'/g, "''")}'` : 'NULL'},\n`);
          writer.write(`  ${user.phone_confirmed_at ? `'${user.phone_confirmed_at}'::timestamptz` : 'NULL'},\n`);
          writer.write(`  ${user.recovery_sent_at ? `'${user.recovery_sent_at}'::timestamptz` : 'NULL'},\n`);
          writer.write(`  ${user.email_change ? `'${user.email_change.replace(/'/g, "''")}'` : 'NULL'},\n`);
          writer.write(`  ${user.email_change_token_new ? `'${user.email_change_token_new.replace(/'/g, "''")}'` : 'NULL'},\n`);
          writer.write(`  ${user.email_change_sent_at ? `'${user.email_change_sent_at}'::timestamptz` : 'NULL'},\n`);
          writer.write(`  ${user.banned_until ? `'${user.banned_until}'::timestamptz` : 'NULL'},\n`);
          writer.write(`  ${user.reauthentication_token ? `'${user.reauthentication_token.replace(/'/g, "''")}'` : 'NULL'},\n`);
          writer.write(`  ${user.reauthentication_sent_at ? `'${user.reauthentication_sent_at}'::timestamptz` : 'NULL'},\n`);
          writer.write(`  ${user.is_sso_user !== null ? user.is_sso_user : 'false'},\n`);
          writer.write(`  ${user.deleted_at ? `'${user.deleted_at}'::timestamptz` : 'NULL'}\n`);
          writer.write(`);\n\n`);
        }
        
        writer.write(`-- Re-enable triggers\n`);
        writer.write(`ALTER TABLE auth.users ENABLE TRIGGER ALL;\n\n`);
      } else {
        writer.write(`-- No auth users found (database may be empty or access denied)\n\n`);
      }
    }
  } catch (error: any) {
    writer.write(`-- ERROR: Could not backup auth users: ${error.message}\n`);
    writer.write(`-- This requires service_role connection or direct database access\n`);
    writer.write(`-- Connection string format: postgresql://postgres.[PROJECT_REF]:[PASSWORD]@[HOST]:5432/postgres\n\n`);
    console.error(`  ⚠️  Could not backup auth users: ${error.message}`);
  }
  
  // 8. Backup Indexes
  console.log('📇 Step 8: Backing up indexes...');
  writer.write(`-- =====================================================\n`);
  writer.write(`-- INDEXES\n`);
  writer.write(`-- =====================================================\n\n`);
  
  const indexesResult = await client.query(`
    SELECT
      indexname,
      tablename,
      indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
    ORDER BY tablename, indexname;
  `);
  
  for (const index of indexesResult.rows) {
    if (!index.indexname.startsWith('pg_')) {
      writer.write(`-- Index: ${index.indexname} on ${index.tablename}\n`);
      writer.write(`${index.indexdef};\n\n`);
    }
  }
  
  writer.end();
  
  console.log(`\n✅ Backup complete!`);
  console.log(`📁 File: ${backupFile}`);
  console.log(`\n⚠️  IMPORTANT NOTES:`);
  console.log(`   1. Auth users passwords are encrypted - users may need to reset passwords`);
  console.log(`   2. Review the backup file before using it`);
  console.log(`   3. Test restore on a staging database first`);
  console.log(`   4. Keep this file secure - it contains sensitive data`);
  
  return backupFile;
}

async function main() {
  const connectionString = process.env.DATABASE_URL || 
    'postgresql://postgres.sclvjrnnnbbptnhonoks:V4FsoNxRkH8LR3Bj@aws-0-us-west-2.pooler.supabase.com:6543/postgres';
  
  const outputDir = process.argv[2] || path.join(process.cwd(), 'supabase', 'backups');
  
  const config = parseConnectionString(encodeConnectionString(connectionString));
  const client = new Client(config);
  
  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✓ Connected!\n');
    
    await backupEverything(client, outputDir);
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
