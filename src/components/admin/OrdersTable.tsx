import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, Copy, CheckCircle, Clock, XCircle, Loader2, Ticket, Wallet, Sparkles } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useToast } from "@/hooks/use-toast";
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
}

interface OrdersTableProps {
  orders: Order[];
  onViewOrder: (order: Order) => void;
  onStatusUpdate: (orderId: string, status: "pending" | "processing" | "completed" | "cancelled") => void;
}

export const OrdersTable = ({ orders, onViewOrder, onStatusUpdate }: OrdersTableProps) => {
  const { formatPrice } = useCurrency();
  const { toast } = useToast();

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "completed":
        return {
          className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
          icon: CheckCircle,
        };
      case "processing":
        return {
          className: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
          icon: Loader2,
        };
      case "pending":
        return {
          className: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
          icon: Clock,
        };
      case "cancelled":
        return {
          className: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
          icon: XCircle,
        };
      default:
        return {
          className: "bg-muted text-muted-foreground",
          icon: Clock,
        };
    }
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
  };

  const copyOrderId = (orderNumber: string) => {
    navigator.clipboard.writeText(orderNumber);
    toast({
      title: "Copied",
      description: "Order ID copied to clipboard",
    });
  };

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 mb-4 rounded-full bg-muted flex items-center justify-center">
          <Clock className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-1">No orders found</h3>
        <p className="text-sm text-muted-foreground">
          Try adjusting your filters or check back later
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="font-semibold">Order</TableHead>
            <TableHead className="font-semibold">Customer</TableHead>
            <TableHead className="font-semibold">Products</TableHead>
            <TableHead className="font-semibold text-right">Amount</TableHead>
            <TableHead className="font-semibold">Discounts</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="font-semibold">Date</TableHead>
            <TableHead className="font-semibold text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => {
            const statusConfig = getStatusConfig(order.status);
            const StatusIcon = statusConfig.icon;
            const hasCoupon = order.coupon?.code;
            const hasCashbackUsed = (order.cashback_used || 0) > 0;
            const hasCashbackEarned = (order.cashback_earned || 0) > 0;

            return (
              <TableRow
                key={order.id}
                className="group cursor-pointer transition-colors hover:bg-muted/30"
                onClick={() => onViewOrder(order)}
              >
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-medium">
                      {order.order_number}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        copyOrderId(order.order_number);
                      }}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                      {getInitials(order.customer_name, order.customer_email)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        {order.customer_name || "Guest"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {order.customer_email}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="max-w-[200px]">
                    {order.order_items?.slice(0, 2).map((item, idx) => (
                      <p key={idx} className="text-sm truncate">
                        {item.product_name}
                        {item.quantity > 1 && (
                          <span className="text-muted-foreground"> ×{item.quantity}</span>
                        )}
                      </p>
                    ))}
                    {(order.order_items?.length || 0) > 2 && (
                      <p className="text-xs text-muted-foreground">
                        +{(order.order_items?.length || 0) - 2} more
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <span className="font-semibold tabular-nums">
                    {formatPrice(Number(order.total_amount))}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1 max-w-[180px]">
                    {hasCoupon && (
                      <Badge variant="outline" className="gap-1 text-xs bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20">
                        <Ticket className="w-3 h-3" />
                        {order.coupon?.code}
                      </Badge>
                    )}
                    {hasCashbackUsed && (
                      <Badge variant="outline" className="gap-1 text-xs bg-pink-500/10 text-pink-700 dark:text-pink-400 border-pink-500/20">
                        <Wallet className="w-3 h-3" />
                        -{formatPrice(order.cashback_used)}
                      </Badge>
                    )}
                    {hasCashbackEarned && (
                      <Badge variant="outline" className="gap-1 text-xs bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/20">
                        <Sparkles className="w-3 h-3" />
                        +{formatPrice(order.cashback_earned)}
                      </Badge>
                    )}
                    {!hasCoupon && !hasCashbackUsed && !hasCashbackEarned && (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </div>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Badge
                    variant="outline"
                    className={cn("gap-1 font-medium", statusConfig.className)}
                  >
                    <StatusIcon
                      className={cn(
                        "w-3 h-3",
                        order.status === "processing" && "animate-spin"
                      )}
                    />
                    {order.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    <p className="text-muted-foreground">
                      {formatDistanceToNow(new Date(order.created_at), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewOrder(order);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Select
                      value={order.status}
                      onValueChange={(value) =>
                        onStatusUpdate(
                          order.id,
                          value as "pending" | "processing" | "completed" | "cancelled"
                        )
                      }
                    >
                      <SelectTrigger className="w-[130px] h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="processing">Processing</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};