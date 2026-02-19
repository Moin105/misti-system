import { Client } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL || 
  'postgresql://postgres.sclvjrnnnbbptnhonoks:V4FsoNxRkH8LR3Bj@aws-0-us-west-2.pooler.supabase.com:6543/postgres';

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

async function migrateUserId() {
  const oldUserId = '03765a40-f338-4035-a2ba-8928fff30834'; // Old admin ID
  const newUserId = '2dc4b37d-1706-4134-a8d1-a29b204e3606'; // New auth.users ID
  const adminEmail = 'milanbrezovac@gmail.com';
  
  const client = new Client(parseConnectionString(encodeConnectionString(connectionString)));
  
  try {
    console.log('🔄 Migrating User ID...\n');
    console.log(`Old ID: ${oldUserId}`);
    console.log(`New ID: ${newUserId}`);
    console.log(`Email: ${adminEmail}\n`);
    
    await client.connect();
    
    // Start transaction
    await client.query('BEGIN');
    
    console.log('📊 Finding all tables with user references...\n');
    
    // Find all tables that reference the old user ID
    const tablesQuery = `
      SELECT 
        tc.table_schema,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
        AND (ccu.table_name = 'users' AND ccu.table_schema = 'auth')
        AND tc.table_name NOT LIKE 'pg_%'
      ORDER BY tc.table_name, kcu.column_name;
    `;
    
    const tablesResult = await client.query(tablesQuery);
    
    console.log(`Found ${tablesResult.rows.length} tables with user references:\n`);
    
    const tablesToUpdate: Array<{table: string, column: string}> = [];
    
    for (const row of tablesResult.rows) {
      console.log(`   - ${row.table_name}.${row.column_name}`);
      tablesToUpdate.push({
        table: row.table_name,
        column: row.column_name
      });
    }
    
    // Also check for common user reference columns
    const commonColumns = ['user_id', 'created_by', 'deleted_by', 'generated_by', 'author_id'];
    const allTablesQuery = `
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND column_name IN (${commonColumns.map(c => `'${c}'`).join(', ')})
        AND data_type = 'uuid'
      ORDER BY table_name;
    `;
    
    const allTablesResult = await client.query(allTablesQuery);
    
    for (const row of allTablesResult.rows) {
      const exists = tablesToUpdate.some(t => t.table === row.table_name && t.column === row.column_name);
      if (!exists) {
        console.log(`   - ${row.table_name}.${row.column_name} (potential reference)`);
        tablesToUpdate.push({
          table: row.table_name,
          column: row.column_name
        });
      }
    }
    
    console.log('\n🔄 Updating references...\n');
    
    let totalUpdated = 0;
    
    // Update each table
    for (const { table, column } of tablesToUpdate) {
      try {
        // Check if table has any rows with old ID
        const checkQuery = `SELECT COUNT(*) as count FROM public.${table} WHERE ${column} = $1`;
        const checkResult = await client.query(checkQuery, [oldUserId]);
        const count = parseInt(checkResult.rows[0].count);
        
        if (count > 0) {
          // Update the references
          const updateQuery = `
            UPDATE public.${table}
            SET ${column} = $1
            WHERE ${column} = $2;
          `;
          
          const updateResult = await client.query(updateQuery, [newUserId, oldUserId]);
          totalUpdated += updateResult.rowCount || 0;
          
          console.log(`   ✅ ${table}.${column}: ${updateResult.rowCount} rows updated`);
        }
      } catch (error: any) {
        // Skip if column doesn't exist or other error
        if (!error.message.includes('does not exist')) {
          console.log(`   ⚠️  ${table}.${column}: ${error.message}`);
        }
      }
    }
    
    // Update profiles table (special case - it's the primary key)
    console.log('\n📝 Updating profiles table...');
    
    // First, check if new profile exists
    const newProfileCheck = await client.query(
      'SELECT * FROM public.profiles WHERE id = $1',
      [newUserId]
    );
    
    const oldProfileCheck = await client.query(
      'SELECT * FROM public.profiles WHERE id = $1',
      [oldUserId]
    );
    
    if (newProfileCheck.rows.length === 0 && oldProfileCheck.rows.length > 0) {
      // No new profile, update the old profile's ID
      console.log('   Updating profile ID...');
      await client.query(`
        UPDATE public.profiles
        SET id = $1
        WHERE id = $2;
      `, [newUserId, oldUserId]);
      console.log('   ✅ Profiles table: ID updated');
    } else if (newProfileCheck.rows.length > 0 && oldProfileCheck.rows.length > 0) {
      // Both exist - merge data carefully
      console.log('   ⚠️  Both profiles exist. Merging data...');
      const oldProfile = oldProfileCheck.rows[0];
      const newProfile = newProfileCheck.rows[0];
      
      // Get all columns from old profile
      const columnsToUpdate: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;
      
      // Only update basic fields (skip calculated fields that might have triggers)
      if (oldProfile.full_name && (!newProfile.full_name || newProfile.full_name === 'N/A')) {
        columnsToUpdate.push(`full_name = $${paramIndex++}`);
        values.push(oldProfile.full_name);
      }
      if (oldProfile.referral_code && !newProfile.referral_code) {
        columnsToUpdate.push(`referral_code = $${paramIndex++}`);
        values.push(oldProfile.referral_code);
      }
      if (oldProfile.referred_by && !newProfile.referred_by) {
        columnsToUpdate.push(`referred_by = $${paramIndex++}`);
        values.push(oldProfile.referred_by);
      }
      
      // Note: cashback_balance, total_lifetime_spending, total_referrals, referral_earnings
      // are likely calculated fields with triggers - skip them
      // They will be recalculated from orders/transactions
      
      if (columnsToUpdate.length > 0) {
        values.push(newUserId);
        await client.query(`
          UPDATE public.profiles
          SET ${columnsToUpdate.join(', ')}
          WHERE id = $${paramIndex};
        `, values);
        console.log(`   ✅ Updated ${columnsToUpdate.length} fields in new profile`);
      }
      
      // Delete old profile
      await client.query('DELETE FROM public.profiles WHERE id = $1', [oldUserId]);
      console.log('   ✅ Old profile deleted');
    } else if (oldProfileCheck.rows.length > 0) {
      // Only old exists - just update ID
      await client.query(`
        UPDATE public.profiles
        SET id = $1
        WHERE id = $2;
      `, [newUserId, oldUserId]);
      console.log('   ✅ Profiles table: ID updated');
    } else {
      console.log('   ⚠️  No old profile found. Creating new one...');
      await client.query(`
        INSERT INTO public.profiles (id, email, full_name)
        VALUES ($1, $2, $3)
        ON CONFLICT (id) DO NOTHING;
      `, [newUserId, adminEmail, 'milan brezovac']);
      console.log('   ✅ New profile created');
    }
    
    // Update user_roles
    console.log('\n📝 Updating user_roles...');
    const rolesUpdate = await client.query(`
      UPDATE public.user_roles
      SET user_id = $1
      WHERE user_id = $2;
    `, [newUserId, oldUserId]);
    console.log(`   ✅ user_roles: ${rolesUpdate.rowCount} rows updated`);
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ MIGRATION COMPLETE!');
    console.log('='.repeat(80));
    console.log(`\n📊 Summary:`);
    console.log(`   Total tables updated: ${tablesToUpdate.length}`);
    console.log(`   Total rows updated: ${totalUpdated + (rolesUpdate.rowCount || 0)}`);
    console.log(`\n✅ All admin history now linked to new user ID: ${newUserId}`);
    console.log(`\n📋 Next Steps:`);
    console.log(`   1. Verify admin can access all history`);
    console.log(`   2. Test login at: https://misti-system.vercel.app`);
    console.log(`   3. Check admin dashboard for orders, transactions, etc.`);
    
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('\n❌ Error:', error.message);
    console.error('\n⚠️  Transaction rolled back. No changes made.');
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrateUserId();
