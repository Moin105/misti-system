# CSV Data Folder

Place your CSV files in this folder to upload them to Supabase.

## How it works

1. **Place CSV files** in this folder
2. **Name your CSV files** to match your table names (e.g., `users.csv` → `users` table, `blog_posts.csv` → `blog_posts` table)
3. **Run the upload script:**
   ```bash
   npm run upload-all-csvs data
   ```

## CSV File Naming

The script automatically maps CSV filenames to table names:
- `about_stats.csv` → `about_stats` table
- `blog_posts.csv` → `blog_posts` table
- `users.csv` → `users` table

## Requirements

- CSV files must have a header row with column names
- Column names should match database column names (or use `--map-column` option)
- Tables must exist in your Supabase database

## Examples

**Basic upload:**
```bash
npm run upload-all-csvs data
```

**With custom batch size:**
```bash
npm run upload-all-csvs data --batch-size 50
```

**With table name mapping:**
```bash
npm run upload-all-csvs data --map-file "my_data.csv":"actual_table_name"
```

**With column mapping:**
```bash
npm run upload-all-csvs data --map-column "users":"csv_name":"db_name"
```
