import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ShieldAlert, Key, Trash2, Mail, User, Gift, Shield, Settings, Trophy, Wallet, Percent, Calendar } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import Navigation from "@/components/Navigation";
import Footer from "@/components/LazyFooter";
import { CashbackProgress } from "@/components/CashbackProgress";
import { ReferralSection } from "@/components/ReferralSection";
import { useAuthUser } from "@/hooks/useAuthUser";
import { TwoFactorSetup } from "@/components/account/TwoFactorSetup";
import { useCurrency } from "@/contexts/CurrencyContext";
import { securityEvents } from "@/lib/securityLogger";

const Account = () => {
  const { user, isInitialized } = useAuthUser();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  
  // Secure email change state
  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [changingEmail, setChangingEmail] = useState(false);

  // Quick stats for overview
  const [quickStats, setQuickStats] = useState<{
    balance: number;
    tierName: string;
    tierPercentage: number;
  } | null>(null);
  
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { convertPrice, formatPrice } = useCurrency();

  // Determine default tab from URL hash
  const getDefaultTab = () => {
    const hash = location.hash.replace('#', '');
    if (['overview', 'rewards', 'security', 'settings'].includes(hash)) {
      return hash;
    }
    return 'overview';
  };

  const [activeTab, setActiveTab] = useState(getDefaultTab);

  // Update URL hash when tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    window.history.replaceState(null, '', `#${value}`);
  };

  useEffect(() => {
    if (isInitialized && !user) {
      navigate("/auth");
    }
  }, [isInitialized, user, navigate]);

  // Fetch quick stats for overview tab
  useEffect(() => {
    if (user) {
      fetchQuickStats();
    }
  }, [user]);

  const fetchQuickStats = async () => {
    if (!user) return;
    
    try {
      const [tierResult, profileResult] = await Promise.all([
        supabase.rpc("get_user_tier", { p_user_id: user.id }),
        supabase.from("profiles").select("cashback_balance").eq("id", user.id).single()
      ]);

      if (tierResult.data && Array.isArray(tierResult.data) && tierResult.data.length > 0) {
        setQuickStats({
          balance: profileResult.data?.cashback_balance || 0,
          tierName: tierResult.data[0].tier_name,
          tierPercentage: tierResult.data[0].tier_percentage
        });
      }
    } catch (error) {
      console.error("Error fetching quick stats:", error);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Passwords don't match",
        description: "Please make sure both passwords are the same.",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        variant: "destructive",
        title: "Password too short",
        description: "Password must be at least 6 characters long.",
      });
      return;
    }

    setChangingPassword(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        securityEvents.passwordChangeFailed(error.message);
        toast({
          variant: "destructive",
          title: "Password change failed",
          description: error.message,
        });
      } else {
        securityEvents.passwordChanged();
        toast({
          title: "Password changed",
          description: "Your password has been updated successfully.",
        });
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (error: any) {
      securityEvents.passwordChangeFailed(error.message);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setChangingPassword(false);
    }
  };

  // SECURITY FIX: Secure email change requiring current password
  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newEmail || !emailPassword) {
      toast({
        variant: "destructive",
        title: "Missing fields",
        description: "Please enter both your current password and new email.",
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      toast({
        variant: "destructive",
        title: "Invalid email",
        description: "Please enter a valid email address.",
      });
      return;
    }

    setChangingEmail(true);

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        toast({
          variant: "destructive",
          title: "Session expired",
          description: "Please log in again.",
        });
        navigate("/auth");
        return;
      }

      const response = await supabase.functions.invoke("change-user-email", {
        body: {
          currentPassword: emailPassword,
          newEmail: newEmail,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to change email");
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      securityEvents.emailChangeSuccess();
      toast({
        title: "Email updated",
        description: response.data?.message || "Your email has been updated successfully.",
      });
      setNewEmail("");
      setEmailPassword("");
    } catch (error: any) {
      securityEvents.emailChangeFailed(error.message);
      toast({
        variant: "destructive",
        title: "Email change failed",
        description: error.message,
      });
    } finally {
      setChangingEmail(false);
    }
  };

  const handleAccountClosure = async () => {
    securityEvents.accountClosureRequested();
    toast({
      title: "Account closure requested",
      description: "Your request has been submitted. Our support team will contact you shortly.",
    });
  };

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SEO 
        title="My Account - misti.services"
        description="Manage your account settings and preferences."
        noindex={true}
      />
      <Navigation />
      
      <main className="flex-1 relative overflow-hidden">
        {/* Background layers for visual depth */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-purple-600/5 to-transparent pointer-events-none" />
        <div className="absolute top-20 right-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl hidden md:block pointer-events-none" />
        <div className="absolute bottom-40 left-10 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl hidden md:block pointer-events-none" />
        
        <div className="container mx-auto px-4 py-24 relative z-10">
          <div className="max-w-4xl mx-auto">
            {/* Enhanced Header with gradient text */}
            <div className="mb-8 text-center">
              <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                My Account
              </h1>
              <p className="text-muted-foreground">Manage your account settings and rewards</p>
            </div>

            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
              {/* Enhanced TabsList with glassmorphism */}
              <TabsList className="grid w-full grid-cols-4 mb-8 bg-card/40 backdrop-blur-sm border border-border/30 p-1.5 rounded-xl h-auto">
                <TabsTrigger 
                  value="overview" 
                  className="gap-2 py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary/20 data-[state=active]:to-purple-500/20 data-[state=active]:border data-[state=active]:border-primary/30 data-[state=active]:shadow-lg data-[state=active]:shadow-primary/10 transition-all duration-300 rounded-lg"
                >
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">Overview</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="rewards" 
                  className="gap-2 py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary/20 data-[state=active]:to-purple-500/20 data-[state=active]:border data-[state=active]:border-primary/30 data-[state=active]:shadow-lg data-[state=active]:shadow-primary/10 transition-all duration-300 rounded-lg"
                >
                  <Gift className="h-4 w-4" />
                  <span className="hidden sm:inline">Rewards</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="security" 
                  className="gap-2 py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary/20 data-[state=active]:to-purple-500/20 data-[state=active]:border data-[state=active]:border-primary/30 data-[state=active]:shadow-lg data-[state=active]:shadow-primary/10 transition-all duration-300 rounded-lg"
                >
                  <Shield className="h-4 w-4" />
                  <span className="hidden sm:inline">Security</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="settings" 
                  className="gap-2 py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary/20 data-[state=active]:to-purple-500/20 data-[state=active]:border data-[state=active]:border-primary/30 data-[state=active]:shadow-lg data-[state=active]:shadow-primary/10 transition-all duration-300 rounded-lg"
                >
                  <Settings className="h-4 w-4" />
                  <span className="hidden sm:inline">Settings</span>
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6 animate-fade-in-up">
                {/* Account Information Card */}
                <Card className="relative overflow-hidden bg-card/40 backdrop-blur-sm border-border/30 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5">
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ShieldAlert className="h-5 w-5 text-primary" />
                      Account Information
                    </CardTitle>
                    <CardDescription>Your account details</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p className="font-medium">{user?.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Account Created</p>
                        <p className="font-medium">
                          {new Date(user?.created_at || "").toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Stats Card */}
                {quickStats && (
                  <Card className="relative overflow-hidden bg-card/40 backdrop-blur-sm border-border/30 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5">
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-primary" />
                        Quick Stats
                      </CardTitle>
                      <CardDescription>Your rewards at a glance</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        {/* Balance Stat */}
                        <div className="group relative p-4 rounded-xl bg-gradient-to-br from-primary/10 to-purple-500/10 border border-primary/20 hover:border-primary/40 transition-all duration-300">
                          <div className="absolute inset-0 rounded-xl bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                          <Wallet className="h-5 w-5 mx-auto mb-2 text-primary relative z-10" />
                          <p className="text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent relative z-10">
                            {formatPrice(convertPrice(quickStats.balance))}
                          </p>
                          <p className="text-xs md:text-sm text-muted-foreground relative z-10">Balance</p>
                        </div>
                        
                        {/* Tier Stat */}
                        <div className="group relative p-4 rounded-xl bg-gradient-to-br from-primary/10 to-purple-500/10 border border-primary/20 hover:border-primary/40 transition-all duration-300">
                          <div className="absolute inset-0 rounded-xl bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                          <Trophy className="h-5 w-5 mx-auto mb-2 text-primary relative z-10" />
                          <p className="text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent relative z-10">
                            {quickStats.tierName}
                          </p>
                          <p className="text-xs md:text-sm text-muted-foreground relative z-10">Current Tier</p>
                        </div>
                        
                        {/* Cashback Rate Stat */}
                        <div className="group relative p-4 rounded-xl bg-gradient-to-br from-primary/10 to-purple-500/10 border border-primary/20 hover:border-primary/40 transition-all duration-300">
                          <div className="absolute inset-0 rounded-xl bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                          <Percent className="h-5 w-5 mx-auto mb-2 text-primary relative z-10" />
                          <p className="text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent relative z-10">
                            {quickStats.tierPercentage}%
                          </p>
                          <p className="text-xs md:text-sm text-muted-foreground relative z-10">Cashback Rate</p>
                        </div>
                      </div>
                      <Button 
                        variant="link" 
                        className="w-full mt-4 text-primary hover:text-primary/80"
                        onClick={() => handleTabChange('rewards')}
                      >
                        View full rewards details →
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Rewards Tab */}
              <TabsContent value="rewards" className="space-y-6 animate-fade-in-up">
                <CashbackProgress />
                <ReferralSection />
              </TabsContent>

              {/* Security Tab */}
              <TabsContent value="security" className="space-y-6 animate-fade-in-up">
                <TwoFactorSetup />

                {/* Change Email */}
                <Card className="relative overflow-hidden bg-card/40 backdrop-blur-sm border-border/30 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5">
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="h-5 w-5 text-primary" />
                      Change Email
                    </CardTitle>
                    <CardDescription>Update your email address (requires password verification)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleEmailChange} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="current-password-email">Current Password</Label>
                        <Input
                          id="current-password-email"
                          type="password"
                          placeholder="Enter your current password"
                          value={emailPassword}
                          onChange={(e) => setEmailPassword(e.target.value)}
                          required
                          autoComplete="current-password"
                          className="bg-background/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new-email">New Email Address</Label>
                        <Input
                          id="new-email"
                          type="email"
                          placeholder="Enter new email address"
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          required
                          autoComplete="email"
                          className="bg-background/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                        />
                      </div>
                      <Button 
                        type="submit" 
                        disabled={changingEmail}
                        variant="solid"
                      >
                        {changingEmail && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Change Email
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                {/* Change Password */}
                <Card className="relative overflow-hidden bg-card/40 backdrop-blur-sm border-border/30 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5">
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Key className="h-5 w-5 text-primary" />
                      Change Password
                    </CardTitle>
                    <CardDescription>Update your password</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handlePasswordChange} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="new-password">New Password</Label>
                        <Input
                          id="new-password"
                          type="password"
                          placeholder="Enter new password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          required
                          minLength={6}
                          autoComplete="new-password"
                          className="bg-background/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirm-password">Confirm Password</Label>
                        <Input
                          id="confirm-password"
                          type="password"
                          placeholder="Confirm new password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          minLength={6}
                          autoComplete="new-password"
                          className="bg-background/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                        />
                      </div>
                      <Button 
                        type="submit" 
                        disabled={changingPassword}
                        variant="solid"
                      >
                        {changingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Change Password
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Settings Tab */}
              <TabsContent value="settings" className="space-y-6 animate-fade-in-up">
                <Card className="relative overflow-hidden border-destructive/30 bg-destructive/5 backdrop-blur-sm hover:border-destructive/50 transition-all duration-300">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-destructive/50 via-red-500/70 to-destructive/50" />
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-destructive">
                      <Trash2 className="h-5 w-5" />
                      Danger Zone
                    </CardTitle>
                    <CardDescription>Irreversible actions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="destructive"
                          className="hover:bg-destructive/90 transition-all"
                        >
                          Request Account Closure
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-card/95 backdrop-blur-sm border-border/50">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Request Account Closure</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to request account closure? Our support team will contact you to confirm this action. This cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleAccountClosure}>
                            Request Closure
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Account;
