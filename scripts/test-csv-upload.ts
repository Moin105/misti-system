import { createClient } from '@supabase/supabase-js';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';
import { env } from '../src/lib/env';

// Use service role key for inserts (bypasses RLS)
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ||
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
);

async function testUpload(csvPath: string, tableName: string) {
  console.log(`Testing upload: ${csvPath} → ${tableName}\n`);
  
  try {
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
    });

    console.log(`Parsed ${records.length} records`);
    console.log(`Columns: ${Object.keys(records[0] || {}).join(', ')}\n`);

    if (records.length === 0) {
      console.log('No records to upload');
      return;
    }

    // Try uploading first record only
    const testRecord = records[0];
    console.log('Test record:', JSON.stringify(testRecord, null, 2));
    console.log('\nAttempting upload...\n');

    const { data, error } = await supabase
      .from(tableName)
      .insert([testRecord])
      .select();

    if (error) {
      console.error('Error:', error.message);
      console.error('Details:', error);
    } else {
      console.log('✓ Success! Uploaded test record');
      console.log('Data:', data);
    }
  } catch (error: any) {
    console.error('Parse error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  }
}

const args = process.argv.slice(2);
if (args.length < 2) {
  console.log('Usage: tsx scripts/test-csv-upload.ts <csv-file> <table-name>');
  process.exit(1);
}

testUpload(path.resolve(args[0]), args[1]);
