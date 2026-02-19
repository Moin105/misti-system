# Execute SQL File Script

This script executes a SQL file against your PostgreSQL database, replacing all existing data.

## Usage

### Basic Usage

```bash
npm run execute-sql
```

This will:
1. Connect to your PostgreSQL database
2. Truncate all existing tables
3. Execute the SQL file: `supabase/mysql/database-export-2026-02-17 (1).sql`

### Custom SQL File

```bash
npm run execute-sql path/to/your/file.sql
```

### Custom Database Connection

Set the `DATABASE_URL` environment variable:

```bash
# PowerShell
$env:DATABASE_URL="postgresql://user:password@host:port/database"
npm run execute-sql

# Command Prompt
set DATABASE_URL=postgresql://user:password@host:port/database
npm run execute-sql
```

Or pass it as the third argument:

```bash
npm run execute-sql file.sql "postgresql://user:password@host:port/database"
```

## Testing Your Connection

Before running the import, test your connection:

```bash
npm run test-db-connection "your-connection-string"
```

Or set the environment variable:
```bash
$env:DATABASE_URL="your-connection-string"
npm run test-db-connection
```

## Getting Your Connection String from Supabase

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **Database**
4. Scroll down to **Connection string**
5. Select **URI** format
6. Copy the connection string (it will look like: `postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres`)

**Note:** For direct database connections (not pooler), use the format:
```
postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
```

## Default Connection

The script uses this connection string by default (if not provided):
```
postgresql://postgres:eQn:te3A8MBpL!h@db.sclvjrnnnbbptnhonoks.supabase.co:5432/postgres
```

**⚠️ If you get DNS errors, verify the hostname is correct in your Supabase Dashboard.**

## What the Script Does

1. **Connects** to your PostgreSQL database
2. **Lists** all tables in the `public` schema
3. **Truncates** all tables (removes all data but keeps table structure)
4. **Executes** the SQL file to insert new data
5. **Reports** success or errors

## Warning

⚠️ **This will DELETE ALL DATA in your database tables!** 

The script will wait 3 seconds before proceeding to give you a chance to cancel (Ctrl+C).

## Requirements

- Node.js and npm installed
- PostgreSQL database accessible
- SQL file must be valid PostgreSQL syntax
