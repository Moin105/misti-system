import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Trophy, TrendingUp, DollarSign } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useAuthUser } from "@/hooks/useAuthUser";

interface UserTierInfo {
  tier_id: string;
  tier_name: string;
  tier_percentage: number;
  min_spending: number;
  current_spending: number;
  next_tier_name: string | null;
  next_tier_min_spending: number | null;
  spending_to_next_tier: number;
}

// SECURITY FIX: No longer accepts userId prop to prevent IDOR attacks
// Always uses authenticated user's ID from session
export const CashbackProgress = () => {
  const [tierInfo, setTierInfo] = useState<UserTierInfo | null>(null);
  const [cashbackBalance, setCashbackBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const { convertPrice, formatPrice } = useCurrency();
  const { user, isInitialized } = useAuthUser();

  useEffect(() => {
    if (isInitialized && user) {
      fetchUserTierInfo();
    } else if (isInitialized && !user) {
      setLoading(false);
    }
  }, [user, isInitialized]);

  const fetchUserTierInfo = async () => {
    if (!user) return;
    
    try {
      // Fetch tier and profile data in parallel for better performance
      const [tierResult, profileResult] = await Promise.all([
        supabase.rpc("get_user_tier", { p_user_id: user.id }),
        supabase.from("profiles").select("cashback_balance").eq("id", user.id).single()
      ]);

      // Handle tier data - log errors but don't throw
      if (tierResult.error) {
        console.error("RPC get_user_tier error:", tierResult.error.message);
      } else if (tierResult.data && Array.isArray(tierResult.data) && tierResult.data.length > 0) {
        setTierInfo(tierResult.data[0]);
      }

      // Handle profile data - log errors but don't throw
      if (profileResult.error) {
        console.error("Profile fetch error:", profileResult.error.message);
      } else {
        setCashbackBalance(profileResult.data?.cashback_balance || 0);
      }
    } catch (error: any) {
      console.error("Error fetching tier info:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-1/3"></div>
          <div className="h-4 bg-muted rounded w-2/3"></div>
        </div>
      </Card>
    );
  }

  if (!user || !tierInfo) {
    return null;
  }

  const progressPercentage =
    tierInfo.next_tier_min_spending
      ? ((tierInfo.current_spending - tierInfo.min_spending) /
          (tierInfo.next_tier_min_spending - tierInfo.min_spending)) *
        100
      : 100;

  return (
    <div className="space-y-4">
      {/* Current Rank Card */}
      <Card className="relative overflow-hidden p-6 bg-card/40 backdrop-blur-sm border-border/30 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Your Rank</h3>
            </div>
            <p className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              {tierInfo.tier_name}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground mb-1">Cashback Rate</p>
            <p className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">{tierInfo.tier_percentage}%</p>
          </div>
        </div>

        {tierInfo.next_tier_name && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Progress to {tierInfo.next_tier_name}
              </span>
              <span className="font-medium">
                {formatPrice(convertPrice(tierInfo.spending_to_next_tier))} to
                go
              </span>
            </div>
            <div className="relative h-2 rounded-full bg-muted/50 overflow-hidden">
              <div 
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary to-purple-500 transition-all duration-500"
                style={{ width: `${Math.min(progressPercentage, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                {formatPrice(convertPrice(tierInfo.current_spending))} spent
              </span>
              <span>
                {formatPrice(
                  convertPrice(tierInfo.next_tier_min_spending || 0)
                )}{" "}
                needed
              </span>
            </div>
          </div>
        )}

        {!tierInfo.next_tier_name && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Trophy className="h-4 w-4 text-primary" />
            <span>You've reached the highest tier!</span>
          </div>
        )}
      </Card>

      {/* Cashback Balance Card */}
      <Card className="relative overflow-hidden p-6 bg-card/40 backdrop-blur-sm border-border/30 hover:border-green-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/5">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-green-500/50 to-transparent" />
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-5 w-5 text-green-500" />
              <h3 className="text-lg font-semibold">Cashback Balance</h3>
            </div>
            <p className="text-3xl font-bold text-green-500">
              {formatPrice(convertPrice(cashbackBalance))}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground mb-1">
              Total Spending
            </p>
            <p className="text-xl font-semibold">
              {formatPrice(convertPrice(tierInfo.current_spending))}
            </p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-4">
          Use your cashback at checkout for discounts on your next purchase
        </p>
      </Card>

      {/* Stats Card */}
      <Card className="relative overflow-hidden p-6 bg-card/40 backdrop-blur-sm border-border/30 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Earning Details</h3>
        </div>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
            <span className="text-muted-foreground">Current Tier:</span>
            <span className="font-medium">{tierInfo.tier_name}</span>
          </div>
          <div className="flex justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
            <span className="text-muted-foreground">Cashback Rate:</span>
            <span className="font-medium">{tierInfo.tier_percentage}%</span>
          </div>
          <div className="flex justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
            <span className="text-muted-foreground">
              Cashback on $100 purchase:
            </span>
            <span className="font-medium text-green-500">
              {formatPrice(
                convertPrice((tierInfo.tier_percentage / 100) * 100)
              )}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
};
