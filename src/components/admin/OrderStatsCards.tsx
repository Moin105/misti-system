import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, ShoppingCart, Clock, CheckCircle, Wallet, Ticket, TrendingUp, Gift } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";

interface Order {
  id: string;
  total_amount: number;
  status: string;
  created_at: string;
  cashback_used: number;
  cashback_earned: number;
  coupon_discount: number;
  coupon?: { id: string; code: string; discount_percentage: number } | null;
}

interface OrderStatsCardsProps {
  orders: Order[];
}

export const OrderStatsCards = ({ orders }: OrderStatsCardsProps) => {
  const { formatPrice } = useCurrency();

  const totalRevenue = orders
    .filter((o) => o.status === "completed")
    .reduce((sum, o) => sum + Number(o.total_amount), 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const ordersToday = orders.filter(
    (o) => new Date(o.created_at) >= today
  ).length;

  const pendingOrders = orders.filter(
    (o) => o.status === "pending" || o.status === "processing"
  ).length;

  const completedOrders = orders.filter((o) => o.status === "completed").length;

  // New stats for cashback and coupons
  const totalCashbackEarned = orders
    .filter((o) => o.status === "completed")
    .reduce((sum, o) => sum + Number(o.cashback_earned || 0), 0);

  const totalCashbackUsed = orders.reduce(
    (sum, o) => sum + Number(o.cashback_used || 0),
    0
  );

  const totalCouponDiscounts = orders.reduce(
    (sum, o) => sum + Number(o.coupon_discount || 0),
    0
  );

  const ordersWithCoupons = orders.filter((o) => o.coupon?.id).length;

  const primaryStats = [
    {
      label: "Total Revenue",
      value: formatPrice(totalRevenue),
      icon: DollarSign,
      gradient: "from-emerald-500/20 to-emerald-500/5",
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Orders Today",
      value: ordersToday.toString(),
      icon: ShoppingCart,
      gradient: "from-blue-500/20 to-blue-500/5",
      iconBg: "bg-blue-500/10",
      iconColor: "text-blue-600 dark:text-blue-400",
    },
    {
      label: "Pending Orders",
      value: pendingOrders.toString(),
      icon: Clock,
      gradient: "from-amber-500/20 to-amber-500/5",
      iconBg: "bg-amber-500/10",
      iconColor: "text-amber-600 dark:text-amber-400",
    },
    {
      label: "Completed",
      value: completedOrders.toString(),
      icon: CheckCircle,
      gradient: "from-violet-500/20 to-violet-500/5",
      iconBg: "bg-violet-500/10",
      iconColor: "text-violet-600 dark:text-violet-400",
    },
  ];

  const secondaryStats = [
    {
      label: "Cashback Earned",
      value: formatPrice(totalCashbackEarned),
      icon: TrendingUp,
      gradient: "from-teal-500/20 to-teal-500/5",
      iconBg: "bg-teal-500/10",
      iconColor: "text-teal-600 dark:text-teal-400",
    },
    {
      label: "Cashback Used",
      value: formatPrice(totalCashbackUsed),
      icon: Wallet,
      gradient: "from-pink-500/20 to-pink-500/5",
      iconBg: "bg-pink-500/10",
      iconColor: "text-pink-600 dark:text-pink-400",
    },
    {
      label: "Coupon Discounts",
      value: formatPrice(totalCouponDiscounts),
      icon: Ticket,
      gradient: "from-orange-500/20 to-orange-500/5",
      iconBg: "bg-orange-500/10",
      iconColor: "text-orange-600 dark:text-orange-400",
    },
    {
      label: "Orders w/ Coupons",
      value: ordersWithCoupons.toString(),
      icon: Gift,
      gradient: "from-indigo-500/20 to-indigo-500/5",
      iconBg: "bg-indigo-500/10",
      iconColor: "text-indigo-600 dark:text-indigo-400",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {primaryStats.map((stat) => (
          <Card
            key={stat.label}
            className={`relative overflow-hidden bg-gradient-to-br ${stat.gradient} border-0 shadow-sm`}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.label}
                  </p>
                  <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-xl ${stat.iconBg}`}>
                  <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {secondaryStats.map((stat) => (
          <Card
            key={stat.label}
            className={`relative overflow-hidden bg-gradient-to-br ${stat.gradient} border-0 shadow-sm`}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.label}
                  </p>
                  <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-xl ${stat.iconBg}`}>
                  <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};