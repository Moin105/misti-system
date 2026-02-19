# CSV Upload Scripts

These scripts allow you to upload CSV data to your Supabase database.

## Scripts Available

### 1. Single CSV Upload (`upload-csv.ts`)

Upload a single CSV file to a specific table.

```bash
npm run upload-csv <csv-file-path> <table-name> [options]
```

**Examples:**
```bash
npm run upload-csv data.csv my_table
npm run upload-csv data.csv my_table --batch-size 50
npm run upload-csv data.csv my_table --map "csv_name":"db_name"
```

### 2. Batch CSV Upload (`upload-all-csvs.ts`) ⭐ Recommended

Upload all CSV files from a folder to their corresponding tables automatically.

```bash
npm run upload-all-csvs <csv-folder-path> [options]
```

**Examples:**
```bash
# Upload all CSVs from the data folder
npm run upload-all-csvs data

# With custom batch size
npm run upload-all-csvs data --batch-size 50

# With table name mapping
npm run upload-all-csvs data --map-file "users.csv":"user_profiles"

# With column mapping
npm run upload-all-csvs data --map-column "users":"csv_name":"db_name"
```

## How Batch Upload Works

1. Place all your CSV files in a folder (e.g., `data/`)
2. Name your CSV files to match table names:
   - `about_stats.csv` → `about_stats` table
   - `blog_posts.csv` → `blog_posts` table
   - `users.csv` → `users` table
3. Run: `npm run upload-all-csvs data`
4. The script will process all CSV files and show a summary

## Requirements

1. CSV files must have a header row with column names
2. Tables must exist in your Supabase database
3. CSV column names should match database column names (or use mapping options)

## Notes

- Empty values in CSV will be converted to `null` in the database
- Data is uploaded in batches of 100 rows by default (configurable with `--batch-size`)
- Both scripts show progress and a summary when complete
- The batch upload script processes files sequentially and provides a comprehensive summary
