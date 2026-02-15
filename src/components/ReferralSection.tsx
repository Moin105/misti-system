import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Copy, Share2, Users, DollarSign, CheckCircle, Gift } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useAuthUser } from "@/hooks/useAuthUser";

interface ReferralData {
  referral_code: string;
  total_referrals: number;
  referral_earnings: number;
  referred_by: string | null;
}

interface ReferralConfig {
  referrer_percentage: number;
  referee_discount_percentage: number;
  min_order_amount: number;
  is_active: boolean;
}

interface ReferralTransaction {
  id: string;
  referee_id: string;
  reward_amount: number;
  status: string;
  created_at: string;
  referee_email?: string;
}

// SECURITY FIX: No longer accepts userId prop to prevent IDOR attacks
// Always uses authenticated user's ID from session
export const ReferralSection = () => {
  const [referralData, setReferralData] = useState<ReferralData | null>(null);
  const [referralConfig, setReferralConfig] = useState<ReferralConfig | null>(null);
  const [transactions, setTransactions] = useState<ReferralTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const { formatPrice } = useCurrency();
  const { user, isInitialized } = useAuthUser();

  useEffect(() => {
    if (isInitialized && user) {
      loadReferralData();
    } else if (isInitialized && !user) {
      setLoading(false);
    }
  }, [user, isInitialized]);

  const loadReferralData = async () => {
    if (!user) return;
    
    try {
      // SECURITY: RLS ensures users only see their own profile data
      const { data: profile } = await supabase
        .from("profiles")
        .select("referral_code, total_referrals, referral_earnings, referred_by")
        .eq("id", user.id)
        .maybeSingle();

      if (profile) {
        setReferralData(profile);
      }

      // Fetch referral config
      const { data: config } = await supabase
        .from("referral_config")
        .select("*")
        .eq("is_active", true)
        .maybeSingle();

      if (config) {
        setReferralConfig(config);
      }

      // SECURITY: RLS ensures users only see their own referral transactions
      const { data: txns } = await supabase
        .from("referral_transactions")
        .select("id, referee_id, reward_amount, status, created_at")
        .eq("referrer_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (txns) {
        setTransactions(txns);
      }
    } catch (error) {
      console.error("Error loading referral data:", error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (!referralData?.referral_code) return;
    
    try {
      await navigator.clipboard.writeText(referralData.referral_code);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Referral code copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy code",
        variant: "destructive",
      });
    }
  };

  const shareReferral = async (platform: string) => {
    const referralUrl = `${window.location.origin}/auth?ref=${referralData?.referral_code}`;
    const message = `Join me on misti.services and get ${referralConfig?.referee_discount_percentage || 5}% off your first order! Use my referral code: ${referralData?.referral_code}`;
    
    let shareUrl = "";
    switch (platform) {
      case "twitter":
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}&url=${encodeURIComponent(referralUrl)}`;
        break;
      case "whatsapp":
        shareUrl = `https://wa.me/?text=${encodeURIComponent(message + " " + referralUrl)}`;
        break;
      case "discord":
        // Copy to clipboard for Discord
        await navigator.clipboard.writeText(message + " " + referralUrl);
        toast({
          title: "Copied for Discord!",
          description: "Paste in your Discord chat",
        });
        return;
      case "email":
        shareUrl = `mailto:?subject=${encodeURIComponent("Join misti.services!")}&body=${encodeURIComponent(message + "\n\n" + referralUrl)}`;
        break;
    }
    
    if (shareUrl) {
      window.open(shareUrl, "_blank");
    }
  };

  if (loading) {
    return (
      <Card className="relative overflow-hidden p-6 bg-card/40 backdrop-blur-sm border-border/30">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-1/3"></div>
          <div className="h-10 bg-muted rounded"></div>
          <div className="h-4 bg-muted rounded w-2/3"></div>
        </div>
      </Card>
    );
  }

  if (!user || !referralConfig?.is_active) {
    return null;
  }

  return (
    <Card className="relative overflow-hidden p-6 bg-card/40 backdrop-blur-sm border-border/30 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5">
      {/* Gradient top border */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <Gift className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Refer Friends & Earn Rewards</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Share your referral code and earn {referralConfig?.referrer_percentage}% cashback when friends make their first purchase. 
        They get {referralConfig?.referee_discount_percentage}% off!
      </p>

      <div className="space-y-6">
        {/* Referral Code */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Your Referral Code</label>
          <div className="flex gap-2">
            <Input
              value={referralData?.referral_code || ""}
              readOnly
              className="font-mono text-lg font-bold text-center tracking-wider bg-background/50 border-border/50"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={copyToClipboard}
              className="shrink-0 border-border/50 hover:border-primary/30"
            >
              {copied ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Share Buttons */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Share via</label>
          <div className="flex flex-wrap gap-2">
            {["twitter", "whatsapp", "discord", "email"].map((platform) => (
              <Button
                key={platform}
                variant="outline"
                size="sm"
                onClick={() => shareReferral(platform)}
                className="gap-2 border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all"
              >
                <Share2 className="h-4 w-4" />
                {platform.charAt(0).toUpperCase() + platform.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl p-4 text-center bg-gradient-to-br from-primary/10 to-purple-500/10 border border-primary/20">
            <Users className="h-6 w-6 mx-auto mb-2 text-primary" />
            <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              {referralData?.total_referrals || 0}
            </div>
            <div className="text-sm text-muted-foreground">Friends Referred</div>
          </div>
          <div className="rounded-xl p-4 text-center bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20">
            <DollarSign className="h-6 w-6 mx-auto mb-2 text-green-500" />
            <div className="text-2xl font-bold text-green-500">
              {formatPrice(referralData?.referral_earnings || 0)}
            </div>
            <div className="text-sm text-muted-foreground">Total Earnings</div>
          </div>
        </div>

        {/* Recent Referrals */}
        {transactions.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Recent Referrals</label>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between text-sm p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <span className="text-muted-foreground">
                    {new Date(tx.created_at).toLocaleDateString()}
                  </span>
                  <span className={`font-medium ${tx.status === 'completed' ? 'text-green-500' : 'text-yellow-500'}`}>
                    {tx.status === 'completed' ? `+${formatPrice(tx.reward_amount)}` : 'Pending'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info */}
        <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
          <p className="font-medium mb-1">How it works:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Share your unique code with friends</li>
            <li>They get {referralConfig?.referee_discount_percentage}% off their first qualifying order (min. {formatPrice(referralConfig?.min_order_amount || 10)})</li>
            <li>You earn {referralConfig?.referrer_percentage}% of their order amount as cashback</li>
            <li>Rewards are added to your cashback balance after payment completes</li>
          </ul>
          <p className="mt-2 text-muted-foreground/70">
            <strong>Note:</strong> Referral codes can only be used once per account. Your friend's code links permanently to their account on first use.
          </p>
        </div>
      </div>
    </Card>
  );
};
