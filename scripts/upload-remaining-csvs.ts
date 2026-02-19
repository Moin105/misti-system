import { createClient } from '@supabase/supabase-js';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { env } from '../src/lib/env';

// Load .env file
dotenv.config();

// Use service role key for inserts (bypasses RLS)
const SUPABASE_SERVICE_ROLE_KEY = 
  process.env.SUPABASE_SERVICE_ROLE_KEY || 
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 
  process.env.SUPABASE_URL || 
  env.NEXT_PUBLIC_SUPABASE_URL;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

console.log('Supabase URL:', SUPABASE_URL);
console.log('Processing remaining/failed CSV files...\n');

interface UploadResult {
  filename: string;
  tableName: string;
  success: boolean;
  rowsProcessed: number;
  rowsUploaded: number;
  error?: string;
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
    // Check if table exists
    const { error: tableCheckError } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true })
      .limit(0);
    
    if (tableCheckError) {
      if (tableCheckError.message.includes('does not exist') || 
          tableCheckError.message.includes('relation') ||
          tableCheckError.code === '42P01') {
        return { 
          success: false, 
          rowsProcessed: 0, 
          rowsUploaded: 0, 
          error: `Table '${tableName}' does not exist in database.` 
        };
      }
    }

    // Read and parse CSV file
    let fileContent = fs.readFileSync(csvPath, 'utf-8');
    fileContent = fileContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: false,
      trim: true,
      cast: false,
      delimiter: ';',
      relax_quotes: true,
      relax_column_count: true,
      escape: '"',
      quote: '"',
      bom: true,
      skip_records_with_error: false,
    });

    if (records.length === 0) {
      return { success: true, rowsProcessed: 0, rowsUploaded: 0 };
    }

    const csvColumns = Object.keys(records[0]);
    const transformedRecords = records.map((record: Record<string, any>) => {
      const transformed: Record<string, any> = {};
      for (const csvCol of csvColumns) {
        const dbCol = options.columnMapping?.[csvCol] || csvCol;
        let value = record[csvCol];
        if (value === '' || value === null || value === undefined) {
          value = null;
        }
        if (typeof value === 'string' && (value.startsWith('[') || value.startsWith('{'))) {
          try {
            value = JSON.parse(value);
          } catch (e) {
            if (value.startsWith('[') && value.includes('"')) {
              const cleaned = value.replace(/^"\[/, '[').replace(/\]"$/, ']').replace(/\\"/g, '"');
              try {
                value = JSON.parse(cleaned);
              } catch (e2) {
                // Keep original
              }
            }
          }
        }
        transformed[dbCol] = value;
      }
      return transformed;
    });

    let successCount = 0;
    let errorCount = 0;
    let lastError: string | undefined;

    for (let i = 0; i < transformedRecords.length; i += options.batchSize) {
      const batch = transformedRecords.slice(i, i + options.batchSize);

      let { data, error } = await supabase
        .from(tableName)
        .upsert(batch, { onConflict: 'id', ignoreDuplicates: false })
        .select();

      if (error && (error.message.includes('duplicate') || error.message.includes('unique'))) {
        const { data: insertData, error: insertError } = await supabase
          .from(tableName)
          .insert(batch)
          .select();
        
        if (!insertError) {
          data = insertData;
          error = null;
        } else {
          const { data: ignoreData, error: ignoreError } = await supabase
            .from(tableName)
            .insert(batch)
            .select();
          
          if (!ignoreError || ignoreError.message.includes('duplicate') || ignoreError.message.includes('unique')) {
            data = ignoreData || [];
            error = null;
          }
        }
      }

      if (error && error.message.includes('foreign key constraint')) {
        let batchSuccessCount = 0;
        let batchErrorCount = 0;
        
        for (const record of batch) {
          const { data: singleData, error: singleError } = await supabase
            .from(tableName)
            .upsert([record], { onConflict: 'id', ignoreDuplicates: true })
            .select();
          
          if (singleError) {
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
        error = null;
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
 * Derives table name from CSV filename
 */
function getTableNameFromFilename(filename: string): string {
  let baseName = path.basename(filename, '.csv');
  if (baseName.includes('-export-')) {
    baseName = baseName.split('-export-')[0];
  }
  return baseName.toLowerCase().replace(/[^a-z0-9_]/g, '_');
}

/**
 * Main execution
 */
async function main() {
  const csvFolder = path.resolve('supabase/csv');
  
  // Define files to process in order
  const filesToProcess = [
    // STEP 1: Schema fixes (Priority Level 0)
    'competitor_configs-export-2026-02-17_01-44-50.csv',
    'games-export-2026-02-17_01-53-53.csv',
    'supported_languages-export-2026-02-17_02-08-18.csv',
    'url_redirects-export-2026-02-17_02-08-30.csv',
    'product_mappings-export-2026-02-17_01-58-58.csv',
    
    // STEP 2: Dependency re-upload
    // Level 1
    'categories-export-2026-02-17_01-44-03.csv',
    'footer_links-export-2026-02-17_01-51-13.csv',
    // Level 2
    'game_faqs-export-2026-02-17_01-52-41.csv',
    'game_genre_assignments-export-2026-02-17_01-52-54.csv',
    'products-export-2026-02-17_02-00-18.csv',
    // Level 3
    'cart_items-export-2026-02-17_01-43-34.csv',
    'faq_generation_logs-export-2026-02-17_01-47-17.csv',
    'g2g_price_sync-export-2026-02-17_01-52-27.csv',
    'product_drafts-export-2026-02-17_01-57-25.csv',
    'product_faqs-export-2026-02-17_01-57-34.csv',
    'product_options-export-2026-02-17_01-58-56.csv',
    'product_rewards-export-2026-02-17_01-58-51.csv',
    'seo_generation_logs-export-2026-02-17_02-03-07.csv',
    
    // STEP 3: Pending unprocessed files
    // Level 4
    'g2g_price_history-export-2026-02-17_01-52-13.csv',
    'order_items-export-2026-02-17_01-54-52.csv',
    // Level 5
    'profiles-export-2026-02-17_02-00-34.csv',
    'user_roles-export-2026-02-17_02-10-24.csv',
    // Level 6
    'cashback_transactions-export-2026-02-17_01-43-54.csv',
    'cookie_consent_logs-export-2026-02-17_01-45-39.csv',
    'coupon_usage-export-2026-02-17_01-46-05.csv',
    'deleted_urls-export-2026-02-17_01-46-36.csv',
    'orders-export-2026-02-17_01-55-05.csv',
    'referral_transactions-export-2026-02-17_02-01-35.csv',
    'sitemap_cache-export-2026-02-17_02-07-16.csv',
    // Level 7
    'reviews-export-2026-02-17_02-02-32.csv',
    // Level 8
    'coupons-export-2026-02-17_01-46-15.csv',
    // Level 9
    'price_entities-export-2026-02-17_01-56-12.csv',
    'pricing_rules-export-2026-02-17_01-56-24.csv',
    'product_inquiries-export-2026-02-17_01-58-10.csv',
  ];

  const results: UploadResult[] = [];

  for (let i = 0; i < filesToProcess.length; i++) {
    const filename = filesToProcess[i];
    const csvPath = path.join(csvFolder, filename);
    
    if (!fs.existsSync(csvPath)) {
      console.log(`[${i + 1}/${filesToProcess.length}] ⚠️  File not found: ${filename}`);
      results.push({
        filename,
        tableName: getTableNameFromFilename(filename),
        success: false,
        rowsProcessed: 0,
        rowsUploaded: 0,
        error: 'File not found',
      });
      continue;
    }

    const tableName = getTableNameFromFilename(filename);
    console.log(`[${i + 1}/${filesToProcess.length}] Processing: ${filename}`);
    console.log(`  → Table: ${tableName}`);

    const result = await uploadCSVFile(csvPath, tableName, {
      batchSize: 100,
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

  if (failed.length > 0) {
    process.exit(1);
  }
}

main();
