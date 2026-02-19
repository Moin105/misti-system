import { Client } from 'pg';

// Helper to encode password in connection string if needed
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
    throw new Error(`Invalid connection string format: ${connString}`);
  }
}

async function testConnection() {
  // Debug: show all arguments
  console.log('Debug - process.argv:', process.argv);
  console.log('Debug - DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
  
  const connectionString = process.env.DATABASE_URL || process.argv[2];
  
  if (!connectionString) {
    console.error('Please provide a connection string:');
    console.error('  npm run test-db-connection "postgresql://user:password@host:port/database"');
    console.error('  Or set DATABASE_URL environment variable');
    console.error('\nNote: If using npm run, you may need to use -- to pass arguments:');
    console.error('  npm run test-db-connection -- "postgresql://..."');
    process.exit(1);
  }
  
  console.log('Using connection string:', connectionString.replace(/:[^:@]+@/, ':****@'));
  
  const encoded = encodeConnectionString(connectionString);
  const config = parseConnectionString(encoded);
  
  console.log('\nTesting connection...');
  console.log(`Host: ${config.host}:${config.port}`);
  console.log(`Database: ${config.database}`);
  console.log(`User: ${config.user}`);
  console.log('');
  
  const client = new Client(config);
  
  try {
    await client.connect();
    console.log('✓ Connection successful!');
    
    // Test query
    const result = await client.query('SELECT version();');
    console.log('✓ Database version:', result.rows[0].version.split(' ')[0] + ' ' + result.rows[0].version.split(' ')[1]);
    
    // Get table count
    const tableResult = await client.query(`
      SELECT COUNT(*) as count 
      FROM pg_tables 
      WHERE schemaname = 'public';
    `);
    console.log(`✓ Found ${tableResult.rows[0].count} tables in public schema`);
    
  } catch (error: any) {
    console.error('✗ Connection failed:', error.message);
    if (error.code === 'ENOTFOUND') {
      console.error('\nDNS Error: Could not resolve hostname');
      console.error('Please verify the hostname in your connection string');
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

testConnection();
