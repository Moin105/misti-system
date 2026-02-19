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

async function verifyBackupCompleteness(client: Client) {
  console.log('🔍 Verifying database completeness...\n');
  
  const report: {
    tables: { name: string; rowCount: number; hasData: boolean }[];
    functions: string[];
    triggers: string[];
    policies: string[];
    constraints: string[];
    authUsers: number;
    issues: string[];
  } = {
    tables: [],
    functions: [],
    triggers: [],
    policies: [],
    constraints: [],
    authUsers: 0,
    issues: []
  };
  
  // 1. Check all tables and row counts
  console.log('📊 Checking tables...');
  const tablesResult = await client.query(`
    SELECT 
      schemaname,
      tablename
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename;
  `);
  
  for (const table of tablesResult.rows) {
    try {
      const countResult = await client.query(`SELECT COUNT(*) as count FROM ${table.tablename}`);
      const rowCount = parseInt(countResult.rows[0].count);
      report.tables.push({
        name: table.tablename,
        rowCount,
        hasData: rowCount > 0
      });
    } catch (error: any) {
      report.issues.push(`Error counting rows in ${table.tablename}: ${error.message}`);
    }
  }
  
  // 2. Check functions
  console.log('⚙️  Checking functions...');
  const functionsResult = await client.query(`
    SELECT proname as function_name
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    ORDER BY p.proname;
  `);
  report.functions = functionsResult.rows.map((r: any) => r.function_name);
  
  // 3. Check triggers
  console.log('🔔 Checking triggers...');
  const triggersResult = await client.query(`
    SELECT trigger_name
    FROM information_schema.triggers
    WHERE trigger_schema = 'public'
    ORDER BY trigger_name;
  `);
  report.triggers = triggersResult.rows.map((r: any) => r.trigger_name);
  
  // 4. Check RLS policies
  console.log('🔒 Checking RLS policies...');
  const policiesResult = await client.query(`
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
    ORDER BY policyname;
  `);
  report.policies = policiesResult.rows.map((r: any) => r.policyname);
  
  // 5. Check constraints
  console.log('🔗 Checking constraints...');
  const constraintsResult = await client.query(`
    SELECT conname as constraint_name
    FROM pg_constraint
    WHERE connamespace = 'public'::regnamespace
      AND contype IN ('f', 'u', 'c', 'p')
    ORDER BY conname;
  `);
  report.constraints = constraintsResult.rows.map((r: any) => r.constraint_name);
  
  // 6. Check auth users (CRITICAL)
  console.log('👤 Checking auth users...');
  try {
    const authUsersResult = await client.query(`
      SELECT COUNT(*) as count FROM auth.users;
    `);
    report.authUsers = parseInt(authUsersResult.rows[0].count);
    
    // Check if passwords are encrypted
    const sampleUser = await client.query(`
      SELECT id, email, encrypted_password
      FROM auth.users
      LIMIT 1;
    `);
    
    if (sampleUser.rows.length > 0) {
      const hasPassword = sampleUser.rows[0].encrypted_password && 
                         sampleUser.rows[0].encrypted_password.length > 0;
      if (!hasPassword) {
        report.issues.push('⚠️  Some auth users may not have encrypted passwords');
      }
    }
  } catch (error: any) {
    report.issues.push(`Cannot access auth.users: ${error.message} (requires service_role)`);
  }
  
  // 7. Check for tables with foreign keys to auth.users
  console.log('🔍 Checking auth.users dependencies...');
  const authDepsResult = await client.query(`
    SELECT
      tc.table_name,
      kcu.column_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND kcu.table_schema = 'public'
      AND kcu.column_name LIKE '%user_id%'
    ORDER BY tc.table_name;
  `);
  
  if (authDepsResult.rows.length > 0) {
    console.log(`  Found ${authDepsResult.rows.length} tables referencing users`);
  }
  
  // Print report
  console.log('\n' + '='.repeat(80));
  console.log('VERIFICATION REPORT');
  console.log('='.repeat(80));
  console.log(`\n📊 Tables: ${report.tables.length}`);
  console.log(`   With data: ${report.tables.filter(t => t.hasData).length}`);
  console.log(`   Empty: ${report.tables.filter(t => !t.hasData).length}`);
  console.log(`   Total rows: ${report.tables.reduce((sum, t) => sum + t.rowCount, 0).toLocaleString()}`);
  
  console.log(`\n⚙️  Functions: ${report.functions.length}`);
  console.log(`🔔 Triggers: ${report.triggers.length}`);
  console.log(`🔒 RLS Policies: ${report.policies.length}`);
  console.log(`🔗 Constraints: ${report.constraints.length}`);
  console.log(`👤 Auth Users: ${report.authUsers}`);
  
  if (report.issues.length > 0) {
    console.log(`\n⚠️  Issues Found: ${report.issues.length}`);
    report.issues.forEach(issue => console.log(`   - ${issue}`));
  }
  
  // Check for empty critical tables
  const criticalTables = ['profiles', 'orders', 'products', 'users'];
  const emptyCritical = report.tables.filter(t => 
    criticalTables.includes(t.name) && !t.hasData
  );
  
  if (emptyCritical.length > 0) {
    console.log(`\n⚠️  WARNING: Critical tables are empty:`);
    emptyCritical.forEach(t => console.log(`   - ${t.name}`));
  }
  
  // Save detailed report
  const reportFile = path.join(process.cwd(), 'supabase', 'backups', `verification-report-${new Date().toISOString().split('T')[0]}.json`);
  const reportDir = path.dirname(reportFile);
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  console.log(`\n📄 Detailed report saved: ${reportFile}`);
  
  return report;
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
    
    await verifyBackupCompleteness(client);
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
