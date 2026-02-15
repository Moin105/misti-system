import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TwoFactorVerify } from "@/components/auth/TwoFactorVerify";
import { securityEvents } from "@/lib/securityLogger";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [showMFAVerification, setShowMFAVerification] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const returnUrl = searchParams.get('returnUrl') || searchParams.get('redirect');
  const defaultTab = searchParams.get('tab') || 'signin';
  const refCode = searchParams.get('ref');

  // Set referral code from URL if present
  useEffect(() => {
    if (refCode) {
      setReferralCode(refCode.toUpperCase());
    }
  }, [refCode]);

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // Check if MFA is required but not verified
        checkMFAAndRedirect(session);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session && event === 'SIGNED_IN') {
        // Don't auto-redirect if we need MFA verification
        if (!showMFAVerification) {
          checkMFAAndRedirect(session);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, returnUrl, showMFAVerification]);

  const checkMFAAndRedirect = async (session: any) => {
    try {
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      const verifiedFactors = factorsData?.totp?.filter(f => f.status === "verified") || [];
      
      if (verifiedFactors.length > 0) {
        // User has MFA enrolled, check if current AAL is high enough
        const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        
        if (aalData?.currentLevel !== aalData?.nextLevel) {
          // Need to verify MFA
          setShowMFAVerification(true);
          return;
        }
      }
      
      // No MFA required or already verified
      navigate(returnUrl || "/");
    } catch (error) {
      console.error("Error checking MFA:", error);
      navigate(returnUrl || "/");
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: authData, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) {
        securityEvents.signupFailed(error.message);
        toast({
          variant: "destructive",
          title: "Signup failed",
          description: error.message,
        });
      } else {
        securityEvents.signupSuccess();
        // Apply referral code if provided
        if (referralCode && authData.user) {
          try {
            // Validate and apply the referral
            const { data: referralData } = await supabase.rpc("validate_referral_code", {
              p_code: referralCode,
              p_user_id: authData.user.id,
            });

            const refResult = referralData as any;
            if (refResult?.valid) {
              // Update the new user's profile with the referrer
              await supabase
                .from("profiles")
                .update({ referred_by: refResult.referrer_id })
                .eq("id", authData.user.id);

              toast({
                title: "Referral applied!",
                description: `You'll get ${refResult.discount_percentage}% off your first order!`,
              });
            }
          } catch (refError) {
            console.error("Failed to apply referral:", refError);
          }
        }

        // Send welcome email via Resend
        try {
          await supabase.functions.invoke('send-welcome-email', {
            body: { email, name: fullName }
          });
          console.log("Welcome email sent successfully");
        } catch (emailError) {
          console.error("Failed to send welcome email:", emailError);
        }

        toast({
          title: "Account created!",
          description: "You have been logged in successfully. Check your email for a welcome message!",
        });
      }
    } catch (error: any) {
      securityEvents.signupFailed(error.message);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        securityEvents.loginFailed(error.message);
        toast({
          variant: "destructive",
          title: "Login failed",
          description: error.message,
        });
      } else if (data.session) {
        // Check if user has MFA enrolled
        const { data: factorsData } = await supabase.auth.mfa.listFactors();
        const verifiedFactors = factorsData?.totp?.filter(f => f.status === "verified") || [];
        
        if (verifiedFactors.length > 0) {
          // User has MFA, need to verify
          securityEvents.mfaRequired();
          setShowMFAVerification(true);
        } else {
          securityEvents.loginSuccess('password');
          toast({
            title: "Welcome back!",
            description: "You have been logged in successfully.",
          });
          navigate(returnUrl || "/");
        }
      }
    } catch (error: any) {
      securityEvents.loginFailed(error.message);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMFASuccess = () => {
    setShowMFAVerification(false);
    toast({
      title: "Welcome back!",
      description: "You have been logged in successfully.",
    });
    navigate(returnUrl || "/");
  };

  const handleMFABack = async () => {
    // Sign out and go back to login
    await supabase.auth.signOut();
    setShowMFAVerification(false);
    setEmail("");
    setPassword("");
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Use custom Resend email via edge function
      const { data, error } = await supabase.functions.invoke("send-password-reset", {
        body: { email },
      });

      if (error) {
        toast({
          variant: "destructive",
          title: "Reset failed",
          description: error.message,
        });
      } else if (data?.error) {
        toast({
          variant: "destructive",
          title: "Reset failed",
          description: data.error,
        });
      } else {
        securityEvents.passwordResetRequested();
        setResetSent(true);
        toast({
          title: "Email sent!",
          description: "Check your email for the password reset link.",
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  // Show MFA verification screen
  if (showMFAVerification) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4">
        <SEO 
          title="Verify 2FA - misti.services"
          description="Enter your two-factor authentication code."
          noindex={true}
        />
        <TwoFactorVerify 
          onSuccess={handleMFASuccess}
          onBack={handleMFABack}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <SEO 
        title="Sign In - misti.services"
        description="Sign in to your account or create a new one."
        noindex={true}
      />
      <Card className="relative w-full max-w-md bg-card/60 backdrop-blur-sm border-border/40 overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Welcome</CardTitle>
          <CardDescription className="text-center">
            Sign in to your account or create a new one
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!resetMode ? (
            <Tabs defaultValue={defaultTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-card/40 backdrop-blur-sm border border-border/30 p-1 rounded-xl">
                <TabsTrigger value="signin" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary/20 data-[state=active]:to-purple-500/20 data-[state=active]:border data-[state=active]:border-primary/30 rounded-lg transition-all">Sign In</TabsTrigger>
                <TabsTrigger value="signup" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary/20 data-[state=active]:to-purple-500/20 data-[state=active]:border data-[state=active]:border-primary/30 rounded-lg transition-all">Sign Up</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" variant="solid" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sign In
                  </Button>
                  <Button
                    type="button"
                    variant="link"
                    className="w-full text-sm"
                    onClick={() => setResetMode(true)}
                  >
                    Forgot password?
                  </Button>
                </form>
              </TabsContent>
            
              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full Name</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Enter your full name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="Create a password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-referral">Referral Code (Optional)</Label>
                    <Input
                      id="signup-referral"
                      type="text"
                      placeholder="Enter referral code"
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                      className="font-mono tracking-wider"
                      maxLength={10}
                    />
                    <p className="text-xs text-muted-foreground">
                      Have a friend's referral code? Get a discount on your first order!
                    </p>
                  </div>
                  <Button type="submit" variant="solid" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Account
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="space-y-4">
              {resetSent ? (
                <Alert>
                  <AlertDescription>
                    Password reset email sent! Check your inbox and follow the link to reset your password.
                  </AlertDescription>
                </Alert>
              ) : (
                <form onSubmit={handlePasswordReset} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">Email</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" variant="solid" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Send Reset Link
                  </Button>
                </form>
              )}
              <Button
                type="button"
                variant="link"
                className="w-full"
                onClick={() => {
                  setResetMode(false);
                  setResetSent(false);
                }}
              >
                Back to sign in
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
