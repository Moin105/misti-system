-- Create cron job to update exchange rates every 24 hours at midnight UTC
SELECT cron.schedule(
  'update-exchange-rates-daily',
  '0 0 * * *', -- Run at midnight UTC every day
  $$
  SELECT
    net.http_post(
        url:='https://kdjlhibxxygfdmlvdfcl.supabase.co/functions/v1/update-exchange-rates',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkamxoaWJ4eHlnZmRtbHZkZmNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MzkxOTMsImV4cCI6MjA3NTAxNTE5M30.yzK3OTDrA-whQuTyOnth8j0SjY2MrodfjUDBojzgL6I"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);