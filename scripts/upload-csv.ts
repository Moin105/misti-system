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
  (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY && 
   process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.includes('service_role') 
   ? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY 
   : null) ||
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// Initialize Supabase client with service role key for inserts
const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
);

interface UploadOptions {
  csvPath: string;
  tableName: string;
  batchSize?: number;
  skipHeaders?: boolean;
  columnMapping?: Record<string, string>; // Maps CSV column names to DB column names
}

/**
 * Uploads CSV data to a Supabase table
 */
async function uploadCSVToSupabase(options: UploadOptions) {
  const {
    csvPath,
    tableName,
    batchSize = 100,
    skipHeaders = true,
    columnMapping = {},
  } = options;

  try {
    // Read and parse CSV file
    console.log(`Reading CSV file: ${csvPath}`);
    const fileContent = fs.readFileSync(csvPath, 'utf-8');

    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: false, // Don't skip empty lines as they might be part of multiline fields
      trim: true,
      cast: true,
      delimiter: ';', // Use semicolon as delimiter
      relax_quotes: true, // Allow quotes in unquoted fields
      relax_column_count: true, // Allow inconsistent column counts
      escape: '"', // Escape character
      quote: '"', // Quote character
      bom: true, // Handle BOM if present
    });

    if (records.length === 0) {
      console.log('No data found in CSV file');
      return;
    }

    console.log(`Found ${records.length} rows in CSV`);

    // Get column names from first record
    const csvColumns = Object.keys(records[0]);
    console.log(`CSV columns: ${csvColumns.join(', ')}`);

    // Transform records: apply column mapping and prepare data
    const transformedRecords = records.map((record: Record<string, any>) => {
      const transformed: Record<string, any> = {};

      for (const csvCol of csvColumns) {
        // Use column mapping if provided, otherwise use CSV column name as-is
        const dbCol = columnMapping[csvCol] || csvCol;
        let value = record[csvCol];

        // Handle empty strings - convert to null for optional fields
        if (value === '' || value === null || value === undefined) {
          value = null;
        }

        transformed[dbCol] = value;
      }

      return transformed;
    });

    // Upload in batches
    console.log(`Uploading to table: ${tableName}`);
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < transformedRecords.length; i += batchSize) {
      const batch = transformedRecords.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(transformedRecords.length / batchSize);

      console.log(
        `Uploading batch ${batchNumber}/${totalBatches} (${batch.length} rows)...`
      );

      const { data, error } = await supabase
        .from(tableName)
        .insert(batch)
        .select();

      if (error) {
        console.error(`Error in batch ${batchNumber}:`, error.message);
        errorCount += batch.length;
      } else {
        successCount += data?.length || 0;
        console.log(`✓ Batch ${batchNumber} uploaded successfully`);
      }
    }

    console.log('\n=== Upload Summary ===');
    console.log(`Total rows processed: ${transformedRecords.length}`);
    console.log(`Successfully uploaded: ${successCount}`);
    console.log(`Failed: ${errorCount}`);
  } catch (error: any) {
    console.error('Error uploading CSV:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log(`
Usage: tsx scripts/upload-csv.ts <csv-file-path> <table-name> [options]

Arguments:
  csv-file-path    Path to the CSV file to upload
  table-name       Name of the Supabase table to insert into

Options:
  --batch-size <n>     Number of rows to insert per batch (default: 100)
  --map <csv-col>:<db-col>  Map CSV column to database column (can be used multiple times)

Examples:
  tsx scripts/upload-csv.ts data.csv my_table
  tsx scripts/upload-csv.ts data.csv my_table --batch-size 50
  tsx scripts/upload-csv.ts data.csv my_table --map "csv_name":"db_name" --map "csv_email":"db_email"
    `);
    process.exit(1);
  }

  const csvPath = path.resolve(args[0]);
  const tableName = args[1];

  // Check if file exists
  if (!fs.existsSync(csvPath)) {
    console.error(`Error: CSV file not found: ${csvPath}`);
    process.exit(1);
  }

  // Parse options
  const options: UploadOptions = {
    csvPath,
    tableName,
  };

  // Parse additional arguments
  for (let i = 2; i < args.length; i++) {
    if (args[i] === '--batch-size' && args[i + 1]) {
      options.batchSize = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--map' && args[i + 1]) {
      const mapping = args[i + 1];
      const [csvCol, dbCol] = mapping.split(':');
      if (csvCol && dbCol) {
        if (!options.columnMapping) {
          options.columnMapping = {};
        }
        options.columnMapping[csvCol] = dbCol;
      }
      i++;
    }
  }

  await uploadCSVToSupabase(options);
}

main();
