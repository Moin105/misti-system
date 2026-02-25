import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import SEO from "@/components/SEO";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ChevronRight, Trophy, Ticket, Wallet, TrendingUp } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/LazyFooter";
import { useCurrency } from "@/contexts/CurrencyContext";
import OrderProgressTracker from "@/components/OrderProgressTracker";

interface UserTierInfo {
  tier_name: string;
  tier_percentage: number;
  current_spending: number;
}

interface OrderWithCoupon {
  id: string;
  order_number: string;
  created_at: string;
  total_amount: number;
  status: string;
  notes: string | null;
  cashback_used: number;
  cashback_earned: number;
  coupon_discount: number;
  coupon: { code: string; discount_percentage: number } | null;
}

const parseValidDate = (value: string | null | undefined): Date | null => {
  if (!value) return null;
  const date = new Date(value);
  const valid = Number.isFinite(date.getTime()) && date.getUTCFullYear() > 1971;
  return valid ? date : null;
};

const Orders = () => {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderWithCoupon[]>([]);
  const [userTierInfo, setUserTierInfo] = useState<UserTierInfo | null>(null);
  const [cashbackBalance, setCashbackBalance] = useState(0);
  const navigate = useNavigate();
  const { formatPrice } = useCurrency();

  useEffect(() => {
    checkUserAndFetchOrders();
  }, []);

  const checkUserAndFetchOrders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    // Fetch orders with coupon details
    const { data: ordersData, error: ordersError } = await supabase
      .from("orders")
      .select(`
        id,
        order_number,
        created_at,
        total_amount,
        status,
        notes,
        cashback_used,
        cashback_earned,
        coupon_discount,
        coupon:coupons(code, discount_percentage)
      `)
      .order("created_at", { ascending: false });

    if (!ordersError && ordersData) {
      setOrders(
        (ordersData as OrderWithCoupon[]).map((order) => {
          const fallbackIso = new Date().toISOString();
          return {
            ...order,
            created_at: order.created_at || fallbackIso,
          };
        })
      );
    }

    // Fetch user tier info
    const { data: tierData } = await supabase.rpc('get_user_tier', {
      p_user_id: session.user.id
    });

    if (tierData && tierData.length > 0) {
      setUserTierInfo({
        tier_name: tierData[0].tier_name,
        tier_percentage: tierData[0].tier_percentage,
        current_spending: tierData[0].current_spending
      });
    }

    // Fetch cashback balance
    const { data: profileData } = await supabase
      .from("profiles")
      .select("cashback_balance")
      .eq("id", session.user.id)
      .single();

    if (profileData) {
      setCashbackBalance(profileData.cashback_balance);
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SEO 
        title="My Orders - misti.services"
        description="View and track your order history."
        noindex={true}
      />
      <Navigation />
      
      <main className="flex-1 container mx-auto px-4 py-24">
        <div className="max-w-4xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">My Orders</h1>
            <p className="text-muted-foreground">View and track your order history</p>
          </div>

          {/* User Summary Card */}
          {userTierInfo && (
            <Card className="relative overflow-hidden bg-card/60 backdrop-blur-sm border-border/40 hover:border-primary/40 transition-all duration-300">
              {/* Gradient top accent */}
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Cashback Tier */}
                  <div className="flex items-center gap-3 group">
                    <div className="p-3 rounded-xl bg-primary/20 group-hover:bg-primary/30 transition-colors">
                      <Trophy className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Your Tier</p>
                      <p className="font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">{userTierInfo.tier_name}</p>
                      <p className="text-xs text-primary">{userTierInfo.tier_percentage}% cashback</p>
                    </div>
                  </div>

                  {/* Total Spending */}
                  <div className="flex items-center gap-3 group">
                    <div className="p-3 rounded-xl bg-blue-500/20 group-hover:bg-blue-500/30 transition-colors">
                      <TrendingUp className="h-5 w-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Spending</p>
                      <p className="font-bold text-foreground">{formatPrice(userTierInfo.current_spending)}</p>
                    </div>
                  </div>

                  {/* Cashback Balance */}
                  <div className="flex items-center gap-3 group">
                    <div className="p-3 rounded-xl bg-green-500/20 group-hover:bg-green-500/30 transition-colors">
                      <Wallet className="h-5 w-5 text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Cashback Balance</p>
                      <p className="font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">{formatPrice(cashbackBalance)}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="relative overflow-hidden bg-card/60 backdrop-blur-sm border-border/40">
            {/* Gradient top accent */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
            <CardHeader>
              <CardTitle className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Order History</CardTitle>
              <CardDescription>All your past and current orders</CardDescription>
            </CardHeader>
            <CardContent>
              {orders.length === 0 ? (
                <p className="text-sm text-muted-foreground">No orders yet</p>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <Link
                      key={order.id}
                      to={`/order/${order.id}`}
                      className="block group"
                    >
                      <div className="relative border border-border/40 rounded-xl p-5 bg-card/40 backdrop-blur-sm hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 overflow-hidden">
                        {/* Gradient top accent on hover */}
                        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/0 group-hover:via-primary/50 to-transparent transition-all duration-300" />
                        
                        {/* Header: Order number + Amount */}
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="font-bold text-lg">{order.order_number}</p>
                            <p className="text-sm text-muted-foreground">
                              {(() => {
                                const parsed = parseValidDate(order.created_at);
                                if (!parsed) return "Unknown date";
                                return `${parsed.toLocaleDateString()} at ${parsed.toLocaleTimeString()}`;
                              })()}
                            </p>
                          </div>
                          <p className="font-bold text-xl bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">{formatPrice(order.total_amount)}</p>
                        </div>

                        {/* Discount/Cashback Badges */}
                        <div className="flex flex-wrap gap-2 mb-4">
                          {order.coupon && order.coupon_discount > 0 && (
                            <Badge variant="secondary" className="gap-1 bg-purple-500/20 border-purple-500/30 text-purple-400">
                              <Ticket className="h-3 w-3" />
                              {order.coupon.code} (-{formatPrice(order.coupon_discount)})
                            </Badge>
                          )}
                          {order.cashback_used > 0 && (
                            <Badge variant="outline" className="gap-1 bg-amber-500/10 border-amber-500/30 text-amber-400">
                              <Wallet className="h-3 w-3" />
                              Used {formatPrice(order.cashback_used)}
                            </Badge>
                          )}
                          {order.cashback_earned > 0 && (
                            <Badge variant="outline" className="gap-1 bg-emerald-500/10 border-emerald-500/30 text-emerald-400">
                              <TrendingUp className="h-3 w-3" />
                              Earned {formatPrice(order.cashback_earned)}
                            </Badge>
                          )}
                        </div>
                        
                        {/* Progress Tracker */}
                        <OrderProgressTracker status={order.status as any} />
                        
                        {/* Notes (if any) */}
                        {order.notes && (
                          <p className="text-sm text-muted-foreground mt-3">{order.notes}</p>
                        )}
                        
                        {/* View Details CTA */}
                        <div className="flex items-center gap-1 text-primary text-sm mt-3 font-medium group-hover:translate-x-1 transition-transform duration-300">
                          <span>View details</span>
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Orders;
