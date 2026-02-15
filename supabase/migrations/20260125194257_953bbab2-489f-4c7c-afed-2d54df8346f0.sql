-- Security Hardening: Protect audit logs from tampering

-- 1. Prevent updates to audit logs - ensures immutable audit trail
CREATE POLICY "Audit logs are immutable - no updates"
ON public.security_audit_log
FOR UPDATE
TO PUBLIC
USING (false);

-- 2. Prevent deletions by public/authenticated users - only service_role can cleanup old logs if needed
CREATE POLICY "Audit logs cannot be deleted by users"
ON public.security_audit_log
FOR DELETE
TO anon, authenticated
USING (false);

-- 3. Ensure only service_role can insert (already restricted, but explicit deny for others)
DROP POLICY IF EXISTS "Service role can insert audit logs" ON public.security_audit_log;
CREATE POLICY "Only service role can insert audit logs"
ON public.security_audit_log
FOR INSERT
TO service_role
WITH CHECK (true);

-- 4. Explicit deny INSERT for anon and authenticated
CREATE POLICY "Public cannot insert audit logs"
ON public.security_audit_log
FOR INSERT
TO anon, authenticated
WITH CHECK (false);