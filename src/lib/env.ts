const nodeEnv = process.env.NODE_ENV ?? "development";

const fallbackSupabaseUrl = "https://kdjlhibxxygfdmlvdfcl.supabase.co";
const fallbackSupabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkamxoaWJ4eHlnZmRtbHZkZmNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MzkxOTMsImV4cCI6MjA3NTAxNTE5M30.yzK3OTDrA-whQuTyOnth8j0SjY2MrodfjUDBojzgL6I";

export const env = {
  DEV: nodeEnv !== "production",
  PROD: nodeEnv === "production",
  NEXT_PUBLIC_SUPABASE_URL:
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE ??
    process.env.SUPABASE_URL ??
    fallbackSupabaseUrl,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    fallbackSupabaseAnonKey,
} as const;
