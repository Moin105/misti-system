interface RateLimitConfig {
  endpoint: string;
  limit: number;
  windowMs: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function checkRateLimit(
  supabase: any,
  identifier: string,
  config: RateLimitConfig
): Promise<{ allowed: boolean; remaining: number }> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - config.windowMs);
  
  // Clean up old entries first
  await supabase
    .from('rate_limits')
    .delete()
    .eq('identifier', identifier)
    .eq('endpoint', config.endpoint)
    .lt('created_at', windowStart.toISOString());
  
  // Count requests in window
  const { count, error: countError } = await supabase
    .from('rate_limits')
    .select('*', { count: 'exact', head: true })
    .eq('identifier', identifier)
    .eq('endpoint', config.endpoint)
    .gte('created_at', windowStart.toISOString());
  
  if (countError) {
    console.error('Rate limit check error:', countError);
    return { allowed: true, remaining: config.limit }; // Fail open
  }
  
  const currentCount = count || 0;
  
  if (currentCount >= config.limit) {
    return { allowed: false, remaining: 0 };
  }
  
  // Log request
  const { error: insertError } = await supabase
    .from('rate_limits')
    .insert({
      identifier,
      endpoint: config.endpoint,
      created_at: now.toISOString()
    });
  
  if (insertError) {
    console.error('Rate limit insert error:', insertError);
  }
  
  return { allowed: true, remaining: config.limit - currentCount - 1 };
}

export function getClientIP(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
         req.headers.get('x-real-ip') || 
         'unknown';
}
