const nodeEnv = process.env.NODE_ENV ?? "development";

const fallbackSupabaseUrl = "https://sclvjrnnnbbptnhonoks.supabase.co";
const fallbackSupabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjbHZqcm5ubmJicHRuaG9ub2tzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyNjk3MjEsImV4cCI6MjA4Njg0NTcyMX0.YK_RfC9JiclVdReaRK05-F1xMvjZtvJKzjrml-AkWbM";

export const env = {
  DEV: nodeEnv !== "production",
  PROD: nodeEnv === "production",
  NEXT_PUBLIC_SUPABASE_URL:
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.SUPABASE_URL ??
    fallbackSupabaseUrl,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    fallbackSupabaseAnonKey,
} as const;
