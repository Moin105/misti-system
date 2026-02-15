import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Shield, ShieldCheck, ShieldOff, Copy, CheckCircle2 } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useMFAStatus } from "@/hooks/useMFAStatus";
import { securityEvents } from "@/lib/securityLogger";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface EnrollmentData {
  id: string;
  type: string;
  totp: {
    qr_code: string;
    secret: string;
    uri: string;
  };
}

export function TwoFactorSetup() {
  const { toast } = useToast();
  const { isEnrolled, isRequired, factors, refetch, isLoading: statusLoading } = useMFAStatus();
  
  const [enrollmentData, setEnrollmentData] = useState<EnrollmentData | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isUnenrolling, setIsUnenrolling] = useState(false);
  const [showEnrollment, setShowEnrollment] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  const startEnrollment = async () => {
    setIsEnrolling(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Authenticator App",
      });

      if (error) throw error;

      securityEvents.mfaEnrollmentStarted();
      setEnrollmentData(data);
      setShowEnrollment(true);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Enrollment failed",
        description: error.message,
      });
    } finally {
      setIsEnrolling(false);
    }
  };

  const verifyEnrollment = async () => {
    if (!enrollmentData || verifyCode.length !== 6) return;

    setIsVerifying(true);
    try {
      // Create a challenge for the enrolled factor
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: enrollmentData.id,
      });

      if (challengeError) throw challengeError;

      // Verify the challenge with the TOTP code
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: enrollmentData.id,
        challengeId: challengeData.id,
        code: verifyCode,
      });

      if (verifyError) throw verifyError;

      securityEvents.mfaEnrollmentVerified();
      toast({
        title: "2FA Enabled",
        description: "Two-factor authentication has been successfully enabled for your account.",
      });

      setShowEnrollment(false);
      setEnrollmentData(null);
      setVerifyCode("");
      await refetch();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Verification failed",
        description: error.message || "Invalid code. Please try again.",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const cancelEnrollment = async () => {
    if (enrollmentData) {
      try {
        await supabase.auth.mfa.unenroll({ factorId: enrollmentData.id });
      } catch (error) {
        // Factor might not be fully enrolled yet, ignore error
      }
    }
    securityEvents.mfaEnrollmentCancelled();
    setShowEnrollment(false);
    setEnrollmentData(null);
    setVerifyCode("");
  };

  const unenroll = async () => {
    if (factors.length === 0) return;

    setIsUnenrolling(true);
    try {
      const factorId = factors[0].id;
      const { error } = await supabase.auth.mfa.unenroll({ factorId });

      if (error) throw error;

      securityEvents.mfaDisabled();
      toast({
        title: "2FA Disabled",
        description: "Two-factor authentication has been disabled for your account.",
      });

      await refetch();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to disable 2FA",
        description: error.message,
      });
    } finally {
      setIsUnenrolling(false);
    }
  };

  const copySecret = () => {
    if (enrollmentData?.totp.secret) {
      navigator.clipboard.writeText(enrollmentData.totp.secret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    }
  };

  if (statusLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Two-Factor Authentication
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isEnrolled ? (
            <ShieldCheck className="h-5 w-5 text-green-500" />
          ) : (
            <Shield className="h-5 w-5" />
          )}
          Two-Factor Authentication
          {isRequired && !isEnrolled && (
            <span className="ml-2 text-xs bg-destructive text-destructive-foreground px-2 py-0.5 rounded">
              Required
            </span>
          )}
          {isEnrolled && (
            <span className="ml-2 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">
              Enabled
            </span>
          )}
        </CardTitle>
        <CardDescription>
          {isEnrolled
            ? "Your account is protected with two-factor authentication."
            : "Add an extra layer of security to your account using an authenticator app."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {showEnrollment && enrollmentData ? (
          <div className="space-y-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
              </p>
              <div className="flex justify-center mb-4">
                <div className="bg-white p-4 rounded-lg inline-block">
                  <img
                    src={enrollmentData.totp.qr_code}
                    alt="2FA QR Code"
                    className="w-48 h-48"
                  />
                </div>
              </div>
              <div className="text-sm text-muted-foreground mb-2">
                Or enter this secret manually:
              </div>
              <div className="flex items-center justify-center gap-2">
                <code className="bg-muted px-3 py-1.5 rounded text-sm font-mono break-all max-w-xs">
                  {enrollmentData.totp.secret}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={copySecret}
                  className="shrink-0"
                >
                  {copiedSecret ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Enter the 6-digit code from your authenticator app</Label>
              <div className="flex justify-center">
                <InputOTP
                  value={verifyCode}
                  onChange={setVerifyCode}
                  maxLength={6}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </div>

            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={cancelEnrollment} disabled={isVerifying}>
                Cancel
              </Button>
              <Button
                onClick={verifyEnrollment}
                disabled={verifyCode.length !== 6 || isVerifying}
              >
                {isVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verify & Enable
              </Button>
            </div>
          </div>
        ) : isEnrolled ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-primary/10 border border-primary/20 rounded-lg">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">2FA is active</p>
                <p className="text-xs text-muted-foreground">
                  Your account requires a code from your authenticator app when signing in.
                </p>
              </div>
            </div>

            {!isRequired && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full" disabled={isUnenrolling}>
                    {isUnenrolling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <ShieldOff className="mr-2 h-4 w-4" />
                    Disable 2FA
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Disable Two-Factor Authentication?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will remove the extra security layer from your account. You can re-enable
                      it at any time.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={unenroll}>Disable 2FA</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            {isRequired && (
              <p className="text-xs text-muted-foreground text-center">
                2FA is required for your account and cannot be disabled.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                When enabled, you'll need to enter a code from your authenticator app each time you
                sign in. This helps protect your account even if your password is compromised.
              </p>
            </div>
            <Button onClick={startEnrollment} disabled={isEnrolling} className="w-full">
              {isEnrolling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Shield className="mr-2 h-4 w-4" />
              Enable Two-Factor Authentication
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
