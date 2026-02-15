import { supabase } from "@/integrations/supabase/client";
import { env } from "@/lib/env";

// Whitelist of allowed event types (prevents arbitrary logging)
const ALLOWED_EVENTS = [
  // Authentication events
  'login_success', 'login_failed', 'logout',
  'signup_success', 'signup_failed',
  'login_mfa_required',
  
  // MFA events
  'mfa_enrollment_started', 'mfa_enrollment_verified', 
  'mfa_enrollment_cancelled', 'mfa_verification_success',
  'mfa_verification_failed', 'mfa_disabled',
  
  // Password events
  'password_changed', 'password_change_failed',
  'password_reset_requested',
  
  // Account events
  'account_closure_requested',
  'email_change_success', 'email_change_failed',
] as const;

export type SecurityEventName = typeof ALLOWED_EVENTS[number];
export type SecuritySeverity = 'info' | 'warning' | 'error' | 'success';

interface SecurityEventOptions {
  details?: Record<string, unknown>;
  severity?: SecuritySeverity;
}

/**
 * Log a security event to the backend.
 * This is a fire-and-forget function that never blocks the UI.
 * 
 * @param eventName - The name of the security event (must be whitelisted)
 * @param options - Optional details and severity
 */
export async function logSecurityEvent(
  eventName: SecurityEventName,
  options: SecurityEventOptions = {}
): Promise<void> {
  const { details = {}, severity } = options;

  // Validate event name
  if (!ALLOWED_EVENTS.includes(eventName)) {
    console.warn(`[SecurityLogger] Unknown event type: ${eventName}`);
    return;
  }

  try {
    // Get current user if available
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;

    // Prepare the payload
    const payload = {
      eventName,
      details: sanitizeDetails(details),
      severity,
      userId,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    };

    // Use sendBeacon for reliability during page unload, fallback to fetch
    const url = `${env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/log-security-event`;
    const body = JSON.stringify(payload);

    // Try sendBeacon first (more reliable for page unload scenarios)
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' });
      const sent = navigator.sendBeacon(url, blob);
      if (sent) return;
    }

    // Fallback to fetch with short timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      },
      body,
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));
  } catch (error) {
    // Never throw - this is fire-and-forget
    console.warn(`[SecurityLogger] Failed to log event: ${eventName}`, error);
  }
}

/**
 * Sanitize event details to prevent PII leakage
 */
function sanitizeDetails(details: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  const sensitiveKeys = ['password', 'token', 'secret', 'key', 'authorization', 'cookie'];

  for (const [key, value] of Object.entries(details)) {
    const lowerKey = key.toLowerCase();
    
    // Skip sensitive keys entirely
    if (sensitiveKeys.some(k => lowerKey.includes(k))) {
      sanitized[key] = '[REDACTED]';
      continue;
    }

    // Truncate long strings
    if (typeof value === 'string' && value.length > 200) {
      sanitized[key] = value.substring(0, 200) + '...';
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

// Convenience functions for common events
export const securityEvents = {
  loginSuccess: (method: string = 'password') => 
    logSecurityEvent('login_success', { details: { method }, severity: 'success' }),
  
  loginFailed: (reason: string) => 
    logSecurityEvent('login_failed', { details: { reason }, severity: 'error' }),
  
  logout: () => 
    logSecurityEvent('logout', { severity: 'info' }),
  
  signupSuccess: () => 
    logSecurityEvent('signup_success', { severity: 'success' }),
  
  signupFailed: (reason: string) => 
    logSecurityEvent('signup_failed', { details: { reason }, severity: 'warning' }),
  
  mfaRequired: () => 
    logSecurityEvent('login_mfa_required', { severity: 'info' }),
  
  mfaEnrollmentStarted: () => 
    logSecurityEvent('mfa_enrollment_started', { severity: 'info' }),
  
  mfaEnrollmentVerified: () => 
    logSecurityEvent('mfa_enrollment_verified', { severity: 'success' }),
  
  mfaEnrollmentCancelled: () => 
    logSecurityEvent('mfa_enrollment_cancelled', { severity: 'info' }),
  
  mfaVerificationSuccess: () => 
    logSecurityEvent('mfa_verification_success', { severity: 'success' }),
  
  mfaVerificationFailed: (reason?: string) => 
    logSecurityEvent('mfa_verification_failed', { details: reason ? { reason } : {}, severity: 'error' }),
  
  mfaDisabled: () => 
    logSecurityEvent('mfa_disabled', { severity: 'warning' }),
  
  passwordChanged: () => 
    logSecurityEvent('password_changed', { severity: 'success' }),
  
  passwordChangeFailed: (reason: string) => 
    logSecurityEvent('password_change_failed', { details: { reason }, severity: 'error' }),
  
  passwordResetRequested: () => 
    logSecurityEvent('password_reset_requested', { severity: 'info' }),
  
  accountClosureRequested: () => 
    logSecurityEvent('account_closure_requested', { severity: 'warning' }),
  
  emailChangeSuccess: () => 
    logSecurityEvent('email_change_success', { severity: 'success' }),
  
  emailChangeFailed: (reason: string) => 
    logSecurityEvent('email_change_failed', { details: { reason }, severity: 'error' }),
};
