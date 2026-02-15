import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ShieldCheck, ArrowLeft } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { securityEvents } from "@/lib/securityLogger";

interface TwoFactorVerifyProps {
  onSuccess: () => void;
  onBack?: () => void;
  factorId?: string;
}

export function TwoFactorVerify({ onSuccess, onBack, factorId }: TwoFactorVerifyProps) {
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerify = async () => {
    if (code.length !== 6) return;

    setIsVerifying(true);
    try {
      // Get the factor ID if not provided
      let targetFactorId = factorId;
      
      if (!targetFactorId) {
        const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();
        
        if (factorsError) throw factorsError;
        
        const verifiedFactors = factorsData?.totp?.filter(f => f.status === "verified") || [];
        if (verifiedFactors.length === 0) {
          throw new Error("No MFA factors found");
        }
        
        targetFactorId = verifiedFactors[0].id;
      }

      // Create a challenge
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: targetFactorId,
      });

      if (challengeError) throw challengeError;

      // Verify the challenge
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: targetFactorId,
        challengeId: challengeData.id,
        code,
      });

      if (verifyError) throw verifyError;

      securityEvents.mfaVerificationSuccess();
      toast({
        title: "Verified",
        description: "Two-factor authentication successful.",
      });

      onSuccess();
    } catch (error: any) {
      securityEvents.mfaVerificationFailed(error.message);
      toast({
        variant: "destructive",
        title: "Verification failed",
        description: error.message || "Invalid code. Please try again.",
      });
      setCode("");
    } finally {
      setIsVerifying(false);
    }
  };

  // Auto-submit when 6 digits are entered
  const handleCodeChange = (value: string) => {
    setCode(value);
    if (value.length === 6 && !isVerifying) {
      // Small delay to show the filled input
      setTimeout(() => {
        handleVerify();
      }, 100);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-primary/10 rounded-full">
            <ShieldCheck className="h-8 w-8 text-primary" />
          </div>
        </div>
        <CardTitle>Two-Factor Authentication</CardTitle>
        <CardDescription>
          Enter the 6-digit code from your authenticator app to continue.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex justify-center">
          <InputOTP
            value={code}
            onChange={handleCodeChange}
            maxLength={6}
            disabled={isVerifying}
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

        <div className="space-y-2">
          <Button
            onClick={handleVerify}
            disabled={code.length !== 6 || isVerifying}
            className="w-full"
          >
            {isVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Verify
          </Button>

          {onBack && (
            <Button
              variant="ghost"
              onClick={onBack}
              disabled={isVerifying}
              className="w-full"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Login
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Open your authenticator app (Google Authenticator, Authy, etc.) to view your verification
          code.
        </p>
      </CardContent>
    </Card>
  );
}
