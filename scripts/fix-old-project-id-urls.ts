import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const OLD_PROJECT_ID = 'kdjlhibxxygfdmlvdfcl';
const NEW_PROJECT_ID = 'sclvjrnnnbbptnhonoks';

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

async function fixOldProjectIdUrls() {
  const connectionString = process.env.DATABASE_URL ||
    'postgresql://postgres.sclvjrnnnbbptnhonoks:V4FsoNxRkH8LR3Bj@aws-0-us-west-2.pooler.supabase.com:6543/postgres';

  const config = parseConnectionString(encodeConnectionString(connectionString));
  const client = new Client(config);

  try {
    console.log('✅ Connected to database\n');

    console.log('='.repeat(80));
    console.log('FIXING OLD PROJECT ID URLs');
    console.log('='.repeat(80));
    console.log(`\nReplacing: ${OLD_PROJECT_ID}`);
    console.log(`With: ${NEW_PROJECT_ID}\n`);

    // Tables and columns to update
    const updates = [
      { table: 'games', columns: ['image_url', 'hero_image_url', 'icon_url', 'og_image', 'product_bg_image_url'] },
      { table: 'products', columns: ['image_url', 'og_image'] },
      { table: 'blog_posts', columns: ['featured_image'] },
    ];

    let totalUpdated = 0;

    for (const { table, columns } of updates) {
      console.log(`\n📋 Processing ${table} table...`);
      
      for (const column of columns) {
        // Count rows with old project ID
        const { rows: countRows } = await client.query(
          `SELECT COUNT(*) as count FROM public.${table} WHERE ${column} LIKE $1`,
          [`%${OLD_PROJECT_ID}%`]
        );
        const count = parseInt(countRows[0].count);
        
        if (count > 0) {
          console.log(`   ${column}: ${count} row(s) need updating`);
          
          // Update URLs
          const { rowCount } = await client.query(
            `UPDATE public.${table} 
             SET ${column} = REPLACE(${column}, $1, $2)
             WHERE ${column} LIKE $3`,
            [OLD_PROJECT_ID, NEW_PROJECT_ID, `%${OLD_PROJECT_ID}%`]
          );
          
          console.log(`   ✅ Updated ${rowCount} row(s)`);
          totalUpdated += rowCount;
        } else {
          console.log(`   ${column}: No updates needed`);
        }
      }
    }

    // Also check blog_posts content field for embedded images
    console.log(`\n📋 Processing blog_posts.content field...`);
    const { rows: contentRows } = await client.query(
      `SELECT COUNT(*) as count FROM public.blog_posts WHERE content LIKE $1`,
      [`%${OLD_PROJECT_ID}%`]
    );
    const contentCount = parseInt(contentRows[0].count);
    
    if (contentCount > 0) {
      console.log(`   content: ${contentCount} row(s) need updating`);
      const { rowCount } = await client.query(
        `UPDATE public.blog_posts 
         SET content = REPLACE(content, $1, $2)
         WHERE content LIKE $3`,
        [OLD_PROJECT_ID, NEW_PROJECT_ID, `%${OLD_PROJECT_ID}%`]
      );
      console.log(`   ✅ Updated ${rowCount} row(s)`);
      totalUpdated += rowCount;
    } else {
      console.log(`   content: No updates needed`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ FIX COMPLETE');
    console.log('='.repeat(80));
    console.log(`\nTotal rows updated: ${totalUpdated}`);
    console.log('\n💡 Note: Frontend code has also been updated to handle old URLs automatically.');

  } catch (error: any) {
    console.error(`❌ An unexpected error occurred: ${error.message}`);
    console.error(error);
  } finally {
    await client.end();
  }
}

fixOldProjectIdUrls();
