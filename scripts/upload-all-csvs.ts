import { createClient } from '@supabase/supabase-js';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { env } from '../src/lib/env';

// Load .env file
dotenv.config();

// Use service role key for inserts (bypasses RLS)
// Check multiple possible env variable names
// Priority: SUPABASE_SERVICE_ROLE_KEY > NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY > NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (if it's a service role key)
const SUPABASE_SERVICE_ROLE_KEY = 
  process.env.SUPABASE_SERVICE_ROLE_KEY || 
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  // Use NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY from .env if set (user might have put service role key there)
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY; // Fallback to anon key if service role not available

// Verify if it's a service role key by checking the JWT payload
let isServiceRoleKey = false;
try {
  if (SUPABASE_SERVICE_ROLE_KEY) {
    const parts = SUPABASE_SERVICE_ROLE_KEY.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      isServiceRoleKey = payload.role === 'service_role';
    }
  }
} catch (e) {
  // If we can't decode, assume it might be a service role key
  isServiceRoleKey = true;
}

if (!isServiceRoleKey) {
  console.warn('⚠️  WARNING: The key being used may not be a service role key. This might cause permission errors.');
}

// Get Supabase URL from .env or fallback
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 
  process.env.SUPABASE_URL || 
  env.NEXT_PUBLIC_SUPABASE_URL;

// Initialize Supabase client with service role key for inserts
const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
);

console.log('Supabase URL:', SUPABASE_URL);
console.log('Using key type:', isServiceRoleKey ? 'service_role ✓' : 'anon (will fail for inserts)');

interface UploadResult {
  filename: string;
  tableName: string;
  success: boolean;
  rowsProcessed: number;
  rowsUploaded: number;
  error?: string;
}

interface UploadOptions {
  csvFolder: string;
  batchSize?: number;
  tableNameMapping?: Record<string, string>; // Maps CSV filename (without .csv) to table name
  columnMapping?: Record<string, Record<string, string>>; // Maps table name -> CSV column -> DB column
}

/**
 * Uploads a single CSV file to Supabase
 */
async function uploadCSVFile(
  csvPath: string,
  tableName: string,
  options: { batchSize: number; columnMapping?: Record<string, string> }
): Promise<{ success: boolean; rowsProcessed: number; rowsUploaded: number; error?: string }> {
  try {
    // Check if table exists by trying to select from it (with limit 0)
    const { error: tableCheckError } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true })
      .limit(0);
    
    if (tableCheckError) {
      // If it's a "relation does not exist" error, skip this table
      if (tableCheckError.message.includes('does not exist') || 
          tableCheckError.message.includes('relation') ||
          tableCheckError.code === '42P01') {
        return { 
          success: false, 
          rowsProcessed: 0, 
          rowsUploaded: 0, 
          error: `Table '${tableName}' does not exist in database. Skipping.` 
        };
      }
      // For other errors, log but continue (might be permission issue)
      console.warn(`  ⚠️  Warning: Could not verify table '${tableName}': ${tableCheckError.message}`);
    }

    // Read and parse CSV file
    let fileContent = fs.readFileSync(csvPath, 'utf-8');
    
    // Normalize line endings
    fileContent = fileContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: false, // Don't skip empty lines as they might be part of multiline fields
      trim: true,
      cast: false, // Don't auto-cast, handle manually
      delimiter: ';', // Use semicolon as delimiter
      relax_quotes: true, // Allow quotes in unquoted fields
      relax_column_count: true, // Allow inconsistent column counts
      escape: '"', // Escape character
      quote: '"', // Quote character
      bom: true, // Handle BOM if present
      skip_records_with_error: false, // Don't skip records with errors, we want to see them
    });

    if (records.length === 0) {
      console.log(`  ℹ️  CSV file is empty, skipping upload`);
      return { success: true, rowsProcessed: 0, rowsUploaded: 0 };
    }

    // Get column names from first record
    const csvColumns = Object.keys(records[0]);

    // Transform records: apply column mapping and prepare data
    const transformedRecords = records.map((record: Record<string, any>) => {
      const transformed: Record<string, any> = {};

      for (const csvCol of csvColumns) {
        // Use column mapping if provided, otherwise use CSV column name as-is
        const dbCol = options.columnMapping?.[csvCol] || csvCol;
        let value = record[csvCol];

        // Handle empty strings - convert to null for optional fields
        if (value === '' || value === null || value === undefined) {
          value = null;
        }

        // Handle array/JSON fields - try to parse if it looks like JSON
        if (typeof value === 'string' && (value.startsWith('[') || value.startsWith('{'))) {
          try {
            value = JSON.parse(value);
          } catch (e) {
            // If parsing fails, keep as string (might be malformed)
            // Try to fix common issues
            if (value.startsWith('[') && value.includes('"')) {
              // Try to fix malformed array like: "["ARC Raiders","Leveling"]"
              const cleaned = value.replace(/^"\[/, '[').replace(/\]"$/, ']').replace(/\\"/g, '"');
              try {
                value = JSON.parse(cleaned);
              } catch (e2) {
                // Keep original if still fails
              }
            }
          }
        }

        transformed[dbCol] = value;
      }

      return transformed;
    });

    // Upload in batches
    let successCount = 0;
    let errorCount = 0;
    let lastError: string | undefined;

    for (let i = 0; i < transformedRecords.length; i += options.batchSize) {
      const batch = transformedRecords.slice(i, i + options.batchSize);

      // Try upsert first (handles duplicates), if that fails try insert
      let { data, error } = await supabase
        .from(tableName)
        .upsert(batch, { onConflict: 'id', ignoreDuplicates: false })
        .select();

      // If upsert fails with duplicate error, try insert with ignoreDuplicates
      if (error && (error.message.includes('duplicate') || error.message.includes('unique'))) {
        const { data: insertData, error: insertError } = await supabase
          .from(tableName)
          .insert(batch)
          .select();
        
        if (!insertError) {
          data = insertData;
          error = null;
        } else {
          // If still fails, try ignoring duplicates
          const { data: ignoreData, error: ignoreError } = await supabase
            .from(tableName)
            .insert(batch)
            .select();
          
          if (!ignoreError || ignoreError.message.includes('duplicate') || ignoreError.message.includes('unique')) {
            // Silently skip duplicates
            data = ignoreData || [];
            error = null;
          }
        }
      }

      // If foreign key constraint error, try inserting one by one to skip invalid rows
      if (error && error.message.includes('foreign key constraint')) {
        let batchSuccessCount = 0;
        let batchErrorCount = 0;
        
        for (const record of batch) {
          const { data: singleData, error: singleError } = await supabase
            .from(tableName)
            .upsert([record], { onConflict: 'id', ignoreDuplicates: true })
            .select();
          
          if (singleError) {
            // Try insert if upsert fails
            const { error: insertErr } = await supabase
              .from(tableName)
              .insert([record])
              .select();
            
            if (!insertErr) {
              batchSuccessCount++;
            } else {
              batchErrorCount++;
              if (!lastError) lastError = insertErr.message;
            }
          } else {
            batchSuccessCount++;
          }
        }
        
        successCount += batchSuccessCount;
        errorCount += batchErrorCount;
        error = null; // Clear error since we handled it
      } else if (error) {
        lastError = error.message;
        errorCount += batch.length;
      } else {
        successCount += data?.length || 0;
      }
    }

    return {
      success: errorCount === 0,
      rowsProcessed: transformedRecords.length,
      rowsUploaded: successCount,
      error: lastError,
    };
  } catch (error: any) {
    return {
      success: false,
      rowsProcessed: 0,
      rowsUploaded: 0,
      error: error.message,
    };
  }
}

/**
 * Defines the upload order based on foreign key dependencies
 * Tables are grouped by dependency level (lower number = upload first)
 */
const UPLOAD_ORDER = [
  // Level 0: No dependencies (base tables)
  ['games', 'review_platforms', 'footer_sections', 'about_stats', 'blog_categories', 
   'cashback_tiers', 'chat_cta_config', 'chat_integration', 'contact_info', 
   'cookie_banner_config', 'cookie_categories', 'discord_config', 'exchange_rates',
   'global_review_config', 'how_it_works_showcase', 'how_it_works_steps',
   'payment_icons', 'payment_methods', 'product_guarantees', 'product_trust_badges',
   'rate_limits', 'referral_config', 'security_audit_log', 'service_highlights',
   'sitemap_config', 'sitemap_static_pages', 'site_faqs', 'site_security_settings',
   'social_links', 'why_we_features', 'work_applications', 'supported_languages',
   'url_redirects', 'competitor_configs', 'inquiry_rate_limits', 'mfa_settings',
   'password_failed_verification_attempts', 'password_reset_tokens', 'translations'],
  
  // Level 1: Depends on Level 0
  ['categories', 'game_genres', 'cms_pages', 'blog_posts', 'footer_links', 'competitor_prices'], // categories depends on games, competitor_prices depends on competitor_configs
  
  // Level 2: Depends on Level 1
  ['products', 'game_faqs', 'game_genre_assignments', 'subcategories'], // products depends on categories, subcategories depends on categories
  
  // Level 3: Depends on Level 2 (products)
  ['product_options', 'product_faqs', 'product_rewards', 'product_drafts',
   'product_mappings', 'g2g_price_sync', 'cart_items', 'faq_generation_logs',
   'seo_generation_logs'],
  
  // Level 4: Depends on Level 3
  ['g2g_price_history', 'order_items'], // g2g_price_history depends on g2g_price_sync
  
  // Level 5: User-dependent tables (may need auth.users to exist)
  ['profiles', 'user_roles'],
  
  // Level 6: Depends on users and other tables
  ['orders', 'cashback_transactions', 'cookie_consent_logs', 'coupon_usage',
   'deleted_urls', 'referral_transactions', 'sitemap_cache'],
  
  // Level 7: Depends on Level 6
  ['reviews'], // reviews depends on review_platforms (already in Level 0)
  
  // Level 8: Depends on coupons (if coupons table exists)
  ['coupons'],
  
  // Level 9: Special cases - may not exist or have schema issues
  ['price_entities', 'pricing_rules', 'product_inquiries'],
  
  // Level 10: Depends on Level 9 (price_entities, pricing_rules, product_mappings)
  ['price_change_log', 'price_comparisons'], // price_change_log depends on price_entities, products, pricing_rules; price_comparisons depends on price_entities, product_mappings
];

/**
 * Gets the upload priority for a table (lower number = upload first)
 */
function getUploadPriority(tableName: string): number {
  for (let i = 0; i < UPLOAD_ORDER.length; i++) {
    if (UPLOAD_ORDER[i].includes(tableName)) {
      return i;
    }
  }
  // If not found, put it at the end
  return UPLOAD_ORDER.length;
}

/**
 * Derives table name from CSV filename
 */
function getTableNameFromFilename(
  filename: string,
  mapping?: Record<string, string>
): string {
  // Remove .csv extension
  let baseName = path.basename(filename, '.csv');
  
  // Handle export pattern: {table_name}-export-{timestamp}
  // Extract table name before "-export-"
  if (baseName.includes('-export-')) {
    baseName = baseName.split('-export-')[0];
  }
  
  // Use mapping if provided (check both full filename and extracted name)
  const fullFilename = path.basename(filename, '.csv');
  if (mapping && mapping[fullFilename]) {
    return mapping[fullFilename];
  }
  if (mapping && mapping[baseName]) {
    return mapping[baseName];
  }
  
  // Default: use extracted table name (already in snake_case typically)
  return baseName.toLowerCase().replace(/[^a-z0-9_]/g, '_');
}

/**
 * Uploads all CSV files from a folder to Supabase
 */
async function uploadAllCSVs(options: UploadOptions): Promise<UploadResult[]> {
  const { csvFolder, batchSize = 100, tableNameMapping = {}, columnMapping = {} } = options;

  // Check if folder exists
  if (!fs.existsSync(csvFolder)) {
    console.error(`Error: Folder not found: ${csvFolder}`);
    process.exit(1);
  }

  // Get all CSV files
  const files = fs.readdirSync(csvFolder).filter((file) => file.endsWith('.csv'));

  if (files.length === 0) {
    console.log(`No CSV files found in: ${csvFolder}`);
    return [];
  }

  console.log(`Found ${files.length} CSV file(s) to upload\n`);

  // Sort files by upload priority (dependency order)
  const filesWithPriority = files.map((filename) => {
    const tableName = getTableNameFromFilename(filename, tableNameMapping);
    return {
      filename,
      tableName,
      priority: getUploadPriority(tableName),
    };
  });

  // Sort by priority (lower priority = upload first)
  filesWithPriority.sort((a, b) => a.priority - b.priority);

  console.log('Upload order (by dependency):\n');
  const priorityGroups: Record<number, string[]> = {};
  filesWithPriority.forEach(({ filename, priority }) => {
    if (!priorityGroups[priority]) {
      priorityGroups[priority] = [];
    }
    priorityGroups[priority].push(filename);
  });

  Object.keys(priorityGroups)
    .sort((a, b) => parseInt(a) - parseInt(b))
    .forEach((priority) => {
      const level = parseInt(priority);
      if (level < UPLOAD_ORDER.length) {
        console.log(`Level ${level}: ${priorityGroups[level].join(', ')}`);
      }
    });
  console.log('\n');

  const results: UploadResult[] = [];

  // Process each CSV file in dependency order
  for (let i = 0; i < filesWithPriority.length; i++) {
    const { filename, tableName, priority } = filesWithPriority[i];
    const csvPath = path.join(csvFolder, filename);
    const tableColumnMapping = columnMapping[tableName] || columnMapping[filename] || {};

    console.log(`[${i + 1}/${filesWithPriority.length}] Processing: ${filename}`);
    console.log(`  → Table: ${tableName} (Priority Level: ${priority})`);

    const result = await uploadCSVFile(csvPath, tableName, {
      batchSize,
      columnMapping: tableColumnMapping,
    });

    const uploadResult: UploadResult = {
      filename,
      tableName,
      success: result.success,
      rowsProcessed: result.rowsProcessed,
      rowsUploaded: result.rowsUploaded,
      error: result.error,
    };

    results.push(uploadResult);

    if (result.success) {
      console.log(`  ✓ Successfully uploaded ${result.rowsUploaded} rows (processed ${result.rowsProcessed})\n`);
    } else {
      if (result.error?.includes('does not exist')) {
        console.log(`  ⚠️  Skipped: ${result.error}\n`);
      } else {
        console.log(`  ✗ Failed: ${result.error}\n`);
        if (result.rowsUploaded > 0) {
          console.log(`  ⚠️  Partial success: ${result.rowsUploaded}/${result.rowsProcessed} rows uploaded\n`);
        }
      }
    }
  }

  return results;
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.log(`
Usage: tsx scripts/upload-all-csvs.ts <csv-folder-path> [options]

Arguments:
  csv-folder-path    Path to the folder containing CSV files

Options:
  --batch-size <n>     Number of rows to insert per batch (default: 100)
  --map-file <csv-file>:<table-name>  Map CSV filename to table name (can be used multiple times)
  --map-column <table>:<csv-col>:<db-col>  Map CSV column to database column (can be used multiple times)

Examples:
  tsx scripts/upload-all-csvs.ts data
  tsx scripts/upload-all-csvs.ts ./csv-data --batch-size 50
  tsx scripts/upload-all-csvs.ts data --map-file "users.csv":"user_profiles"
  tsx scripts/upload-all-csvs.ts data --map-column "users":"csv_name":"db_name"
    `);
    process.exit(1);
  }

  const csvFolder = path.resolve(args[0]);

  // Parse options
  const options: UploadOptions = {
    csvFolder,
  };

  const tableNameMapping: Record<string, string> = {};
  const columnMapping: Record<string, Record<string, string>> = {};

  // Parse additional arguments
  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--batch-size' && args[i + 1]) {
      options.batchSize = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--map-file' && args[i + 1]) {
      const mapping = args[i + 1];
      const [csvFile, tableName] = mapping.split(':');
      if (csvFile && tableName) {
        // Remove .csv extension if present
        const baseName = csvFile.replace(/\.csv$/, '');
        tableNameMapping[baseName] = tableName;
      }
      i++;
    } else if (args[i] === '--map-column' && args[i + 1]) {
      const mapping = args[i + 1];
      const [table, csvCol, dbCol] = mapping.split(':');
      if (table && csvCol && dbCol) {
        if (!columnMapping[table]) {
          columnMapping[table] = {};
        }
        columnMapping[table][csvCol] = dbCol;
      }
      i++;
    }
  }

  if (Object.keys(tableNameMapping).length > 0) {
    options.tableNameMapping = tableNameMapping;
  }

  if (Object.keys(columnMapping).length > 0) {
    options.columnMapping = columnMapping;
  }

  // Upload all CSVs
  const results = await uploadAllCSVs(options);

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('UPLOAD SUMMARY');
  console.log('='.repeat(60));

  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  console.log(`\nTotal files processed: ${results.length}`);
  console.log(`Successful: ${successful.length}`);
  console.log(`Failed: ${failed.length}`);

  if (successful.length > 0) {
    console.log('\n✓ Successful uploads:');
    successful.forEach((result) => {
      console.log(`  - ${result.filename} → ${result.tableName} (${result.rowsUploaded} rows)`);
    });
  }

  if (failed.length > 0) {
    console.log('\n✗ Failed uploads:');
    failed.forEach((result) => {
      console.log(`  - ${result.filename} → ${result.tableName}`);
      console.log(`    Error: ${result.error}`);
    });
  }

  const totalRows = results.reduce((sum, r) => sum + r.rowsUploaded, 0);
  console.log(`\nTotal rows uploaded: ${totalRows}`);
  console.log('='.repeat(60) + '\n');

  // Exit with error code if any uploads failed
  if (failed.length > 0) {
    process.exit(1);
  }
}

main();
