import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCurrency } from "@/contexts/CurrencyContext";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Trash2, 
  CheckCircle, 
  Copy, 
  Mail, 
  User, 
  MapPin, 
  Calendar,
  Package,
  Clock,
  XCircle,
  Loader2,
  MessageSquare,
  Trophy,
  Ticket,
  Gift,
  TrendingUp,
  Wallet
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface OrderItem {
  product_name: string;
  quantity: number;
  unit_price: number;
  selected_options: any;
}

interface Order {
  id: string;
  order_number: string;
  customer_email: string;
  customer_name: string | null;
  contact_details: string | null;
  country: string | null;
  address: string | null;
  notes: string | null;
  total_amount: number;
  cashback_used: number;
  cashback_earned: number;
  coupon_discount: number;
  referral_discount: number;
  status: string;
  created_at: string;
  updated_at: string;
  order_items?: OrderItem[];
  coupon?: { id: string; code: string; discount_percentage: number } | null;
  user_id?: string;
}

interface CustomerStats {
  total_lifetime_spending: number;
  cashback_balance: number;
  tier_name: string | null;
  tier_percentage: number | null;
}

interface OrderDrawerProps {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusUpdate: (orderId: string, status: string) => void;
  onDelete: () => void;
}

export const OrderDrawer = ({
  order,
  open,
  onOpenChange,
  onStatusUpdate,
  onDelete,
}: OrderDrawerProps) => {
  const { formatPrice } = useCurrency();
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [customerStats, setCustomerStats] = useState<CustomerStats | null>(null);

  useEffect(() => {
    const fetchCustomerStats = async () => {
      if (!order?.user_id) {
        setCustomerStats(null);
        return;
      }

      try {
        // Fetch profile data
        const { data: profile } = await supabase
          .from("profiles")
          .select("total_lifetime_spending, cashback_balance")
          .eq("id", order.user_id)
          .single();

        // Fetch tier info
        const { data: tierData } = await supabase
          .rpc("get_user_tier", { p_user_id: order.user_id });

        setCustomerStats({
          total_lifetime_spending: profile?.total_lifetime_spending || 0,
          cashback_balance: profile?.cashback_balance || 0,
          tier_name: tierData?.[0]?.tier_name || null,
          tier_percentage: tierData?.[0]?.tier_percentage || null,
        });
      } catch (error) {
        console.error("Error fetching customer stats:", error);
        setCustomerStats(null);
      }
    };

    if (open && order) {
      fetchCustomerStats();
    }
  }, [open, order?.user_id]);

  if (!order) return null;

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "completed":
        return {
          className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
          icon: CheckCircle,
          label: "Completed",
        };
      case "processing":
        return {
          className: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
          icon: Loader2,
          label: "Processing",
        };
      case "pending":
        return {
          className: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
          icon: Clock,
          label: "Pending",
        };
      case "cancelled":
        return {
          className: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
          icon: XCircle,
          label: "Cancelled",
        };
      default:
        return {
          className: "bg-muted text-muted-foreground",
          icon: Clock,
          label: status,
        };
    }
  };

  const statusConfig = getStatusConfig(order.status);
  const StatusIcon = statusConfig.icon;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: `${label} copied to clipboard`,
    });
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("orders")
        .delete()
        .eq("id", order.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Order deleted successfully",
      });

      setShowDeleteDialog(false);
      onOpenChange(false);
      onDelete();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const subtotal = order.order_items?.reduce(
    (sum, item) => sum + item.unit_price * item.quantity,
    0
  ) || 0;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg p-0">
          <SheetHeader className="p-6 pb-0">
            <div className="flex items-start justify-between">
              <div>
                <SheetTitle className="flex items-center gap-2 text-lg">
                  {order.order_number}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => copyToClipboard(order.order_number, "Order ID")}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </SheetTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                </p>
              </div>
              <Badge
                variant="outline"
                className={cn("gap-1.5 font-medium", statusConfig.className)}
              >
                <StatusIcon
                  className={cn(
                    "w-3.5 h-3.5",
                    order.status === "processing" && "animate-spin"
                  )}
                />
                {statusConfig.label}
              </Badge>
            </div>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-180px)]">
            <div className="p-6 space-y-6">
              {/* Customer Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Customer
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {order.customer_name || "Guest Customer"}
                      </p>
                      <div className="flex items-center gap-1">
                        <p className="text-sm text-muted-foreground truncate">
                          {order.customer_email}
                        </p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 shrink-0"
                          onClick={() => copyToClipboard(order.customer_email, "Email")}
                        >
                          <Copy className="h-2.5 w-2.5" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {order.contact_details && (
                    <div className="flex items-start gap-3 text-sm">
                      <Mail className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <span>{order.contact_details}</span>
                    </div>
                  )}

                  {(order.country || order.address) && (
                    <div className="flex items-start gap-3 text-sm">
                      <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <span>
                        {[order.address, order.country].filter(Boolean).join(", ")}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Customer Stats Section */}
              {customerStats && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                      Customer Stats
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {customerStats.tier_name && (
                        <div className="p-3 rounded-lg bg-violet-500/10 border border-violet-500/20">
                          <div className="flex items-center gap-2 mb-1">
                            <Trophy className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                            <span className="text-xs text-muted-foreground">Tier</span>
                          </div>
                          <p className="font-semibold text-violet-700 dark:text-violet-400">
                            {customerStats.tier_name}
                            {customerStats.tier_percentage && (
                              <span className="text-xs ml-1">({customerStats.tier_percentage}%)</span>
                            )}
                          </p>
                        </div>
                      )}
                      <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <div className="flex items-center gap-2 mb-1">
                          <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-xs text-muted-foreground">Total Spent</span>
                        </div>
                        <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                          {formatPrice(customerStats.total_lifetime_spending)}
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-teal-500/10 border border-teal-500/20 col-span-2">
                        <div className="flex items-center gap-2 mb-1">
                          <Wallet className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                          <span className="text-xs text-muted-foreground">Cashback Balance</span>
                        </div>
                        <p className="font-semibold text-teal-700 dark:text-teal-400">
                          {formatPrice(customerStats.cashback_balance)}
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}

              <Separator />

              {/* Order Items */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Items
                </h3>
                <div className="space-y-3">
                  {order.order_items?.map((item, index) => (
                    <div
                      key={index}
                      className="p-4 rounded-lg bg-muted/50 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center shrink-0">
                            <Package className="w-4 h-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium">{item.product_name}</p>
                            <p className="text-sm text-muted-foreground">
                              Qty: {item.quantity} × {formatPrice(item.unit_price)}
                            </p>
                          </div>
                        </div>
                        <p className="font-semibold tabular-nums whitespace-nowrap">
                          {formatPrice(item.unit_price * item.quantity)}
                        </p>
                      </div>

                      {item.selected_options &&
                        Object.keys(item.selected_options).length > 0 && (
                          <div className="pl-11 space-y-1">
                            {Object.entries(item.selected_options).map(
                              ([key, value]) => (
                                <p
                                  key={key}
                                  className="text-xs text-muted-foreground"
                                >
                                  <span className="font-medium">{key}:</span>{" "}
                                  {String(value)}
                                </p>
                              )
                            )}
                          </div>
                        )}
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Payment Summary */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Payment
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  {order.coupon && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <Ticket className="w-3.5 h-3.5 text-orange-500" />
                        Coupon ({order.coupon.code})
                      </span>
                      <span className="text-red-600">
                        -{formatPrice(order.coupon_discount || 0)}
                      </span>
                    </div>
                  )}
                  {(order.referral_discount || 0) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <Gift className="w-3.5 h-3.5 text-purple-500" />
                        Referral Discount
                      </span>
                      <span className="text-red-600">
                        -{formatPrice(order.referral_discount)}
                      </span>
                    </div>
                  )}
                  {order.cashback_used > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <Wallet className="w-3.5 h-3.5 text-pink-500" />
                        Cashback Used
                      </span>
                      <span className="text-red-600">
                        -{formatPrice(order.cashback_used)}
                      </span>
                    </div>
                  )}
                  {order.cashback_earned > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-teal-500" />
                        Cashback Earned
                      </span>
                      <span className="text-emerald-600">
                        +{formatPrice(order.cashback_earned)}
                      </span>
                    </div>
                  )}
                  <Separator className="my-2" />
                  <div className="flex justify-between">
                    <span className="font-semibold">Total</span>
                    <span className="font-bold text-lg">
                      {formatPrice(order.total_amount)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {order.notes && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                      Notes
                    </h3>
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <p className="text-sm">{order.notes}</p>
                    </div>
                  </div>
                </>
              )}

              <Separator />

              {/* Timeline */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Timeline
                </h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 text-sm">
                    <Calendar className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">Order Created</p>
                      <p className="text-muted-foreground">
                        {format(new Date(order.created_at), "PPpp")}
                      </p>
                    </div>
                  </div>
                  {order.updated_at !== order.created_at && (
                    <div className="flex items-start gap-3 text-sm">
                      <Clock className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium">Last Updated</p>
                        <p className="text-muted-foreground">
                          {format(new Date(order.updated_at), "PPpp")}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>

          {/* Footer Actions */}
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-background">
            <div className="flex gap-2">
              {order.status === "processing" && (
                <Button
                  className="flex-1 gap-2"
                  onClick={() => onStatusUpdate(order.id, "completed")}
                >
                  <CheckCircle className="w-4 h-4" />
                  Mark Completed
                </Button>
              )}
              {order.status === "pending" && (
                <Button
                  className="flex-1 gap-2"
                  onClick={() => onStatusUpdate(order.id, "processing")}
                >
                  <Loader2 className="w-4 h-4" />
                  Start Processing
                </Button>
              )}
              {order.status === "cancelled" && (
                <Button
                  variant="destructive"
                  className="flex-1 gap-2"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Order
                </Button>
              )}
              {(order.status === "completed" || order.status === "cancelled") && order.status !== "cancelled" && (
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => onOpenChange(false)}
                >
                  Close
                </Button>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete order{" "}
              <strong>{order.order_number}</strong>? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};