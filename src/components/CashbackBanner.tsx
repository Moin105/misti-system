import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Trophy, ArrowRight, Coins, TrendingUp, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "@/hooks/useAuthUser";

interface CashbackTier {
  id: string;
  tier_name: string;
  cashback_percentage: number;
  sort_order: number;
}

const tierColors = [
  "bg-amber-700",
  "bg-gray-400",
  "bg-yellow-500",
  "bg-gradient-to-r from-purple-500 to-blue-500",
];

const CashbackBanner = () => {
  const { user } = useAuthUser();

  const { data: tiers = [] } = useQuery({
    queryKey: ["cashback-tiers-public"],
    queryFn: async () => {
      // Use the SECURITY DEFINER function to safely fetch tier data
      const { data, error } = await supabase.rpc("get_public_cashback_tiers");

      if (error) throw error;
      return (data || []).map((tier: { tier_name: string; min_spending: number; cashback_percentage: number; sort_order: number }, index: number) => ({
        id: `tier-${index}`,
        tier_name: tier.tier_name || '',
        cashback_percentage: tier.cashback_percentage || 0,
        sort_order: tier.sort_order || index,
      })) as CashbackTier[];
    },
    staleTime: 10 * 60 * 1000,
  });

  const maxCashback = tiers.length > 0 
    ? Math.max(...tiers.map(t => t.cashback_percentage))
    : 5;

  return (
    <section className="py-12 md:py-16 container mx-auto px-4">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600/90 via-purple-600/80 to-purple-700/90 p-8 md:p-12">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-white/15 via-transparent to-transparent" />
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-yellow-400/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-400/20 rounded-full blur-3xl" />
        
        <div className="relative z-10 flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
          {/* Left Content */}
          <div className="flex-1 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 mb-4">
              <Trophy className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-medium text-white">Loyalty Rewards</span>
            </div>
            
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Earn Up to <span className="text-yellow-400">{maxCashback}%</span> Cashback
            </h2>
            
            <p className="text-lg text-white/80 mb-6 max-w-lg">
              Shop, earn rewards, and save more with every purchase. Level up through tiers for bigger cashback rates!
            </p>

            {/* Benefits */}
            <div className="flex flex-wrap justify-center lg:justify-start gap-4 mb-8">
              <div className="flex items-center gap-2 text-white/90">
                <Coins className="w-5 h-5 text-yellow-400" />
                <span className="text-sm">Instant Rewards</span>
              </div>
              <div className="flex items-center gap-2 text-white/90">
                <TrendingUp className="w-5 h-5 text-green-400" />
                <span className="text-sm">Level Up Tiers</span>
              </div>
              <div className="flex items-center gap-2 text-white/90">
                <Gift className="w-5 h-5 text-purple-300" />
                <span className="text-sm">Stack with Coupons</span>
              </div>
            </div>

            <Link to="/cashback" aria-label="Explore cashback rewards program - earn up to 5% back on every order">
              <Button 
                size="lg" 
                className="bg-white text-primary hover:bg-white/90 font-semibold px-8 group"
              >
                Explore Cashback Rewards
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>

          {/* Right Content - Tier Preview */}
          <div className="flex-shrink-0">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <p className="text-sm text-white/70 mb-4 text-center">Tier Progression</p>
              
              <div className="flex items-end justify-center gap-3 mb-4">
                {tiers.slice(0, 4).map((tier, index) => (
                  <div key={tier.id} className="flex flex-col items-center gap-2">
                    <div 
                      className={`w-10 h-10 rounded-full ${tierColors[index]} flex items-center justify-center text-white font-bold text-sm shadow-lg`}
                      style={{ 
                        transform: `scale(${1 + (index * 0.1)})`,
                      }}
                    >
                      {tier.cashback_percentage}%
                    </div>
                    <span className="text-xs text-white/70">{tier.tier_name}</span>
                  </div>
                ))}
              </div>

              {user ? (
                <Link to="/account" className="block">
                  <Button variant="outline" size="sm" className="w-full bg-white/10 border-white/30 text-white hover:bg-white/20">
                    View My Progress
                  </Button>
                </Link>
              ) : (
                <Link to="/auth" className="block">
                  <Button variant="outline" size="sm" className="w-full bg-white/10 border-white/30 text-white hover:bg-white/20">
                    Join Now - It's Free
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CashbackBanner;
