import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { refreshAdminData } from "@/lib/adminSupabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, X, RefreshCw, Download } from "lucide-react";
import { OrderStatsCards } from "./OrderStatsCards";
import { OrderStatusTabs } from "./OrderStatusTabs";
import { OrdersTable } from "./OrdersTable";
import { OrderDrawer } from "./OrderDrawer";

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
  order_items?: Array<{
    product_name: string;
    quantity: number;
    unit_price: number;
    selected_options: any;
  }>;
  coupon?: { id: string; code: string; discount_percentage: number } | null;
}

const OrdersManager = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [activeStatus, setActiveStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          order_items (
            product_name,
            quantity,
            unit_price,
            selected_options
          ),
          coupon:coupons(id, code, discount_percentage)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    let filtered = [...orders];

    // Filter by status
    if (activeStatus !== "all") {
      filtered = filtered.filter((order) => order.status === activeStatus);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (order) =>
          order.order_number.toLowerCase().includes(query) ||
          order.customer_email.toLowerCase().includes(query) ||
          order.customer_name?.toLowerCase().includes(query) ||
          order.order_items?.some((item) =>
            item.product_name.toLowerCase().includes(query)
          )
      );
    }

    return filtered;
  }, [orders, activeStatus, searchQuery]);

  const clearFilters = () => {
    setActiveStatus("all");
    setSearchQuery("");
  };

  const updateOrderStatus = async (
    orderId: string,
    newStatus: "pending" | "processing" | "completed" | "cancelled"
  ) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("id", orderId);

      if (error) throw error;

      await refreshAdminData(['/rest/v1/orders'], ['orders']);
      toast({
        title: "Success",
        description: "Order status updated successfully",
      });

      fetchOrders();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const exportOrders = () => {
    const headers = ["Order ID", "Customer", "Email", "Amount", "Coupon Code", "Coupon Discount", "Cashback Used", "Cashback Earned", "Referral Discount", "Status", "Date"];
    const rows = filteredOrders.map((order) => [
      order.order_number,
      order.customer_name || "Guest",
      order.customer_email,
      order.total_amount,
      order.coupon?.code || "",
      order.coupon_discount || 0,
      order.cashback_used || 0,
      order.cashback_earned || 0,
      order.referral_discount || 0,
      order.status,
      new Date(order.created_at).toLocaleDateString(),
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Exported",
      description: `${filteredOrders.length} orders exported to CSV`,
    });
  };

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setShowDrawer(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Orders</h2>
          <p className="text-muted-foreground">
            Manage and track all customer orders
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchOrders}
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportOrders}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <OrderStatsCards orders={orders} />

      {/* Status Tabs */}
      <OrderStatusTabs
        orders={orders}
        activeStatus={activeStatus}
        onStatusChange={setActiveStatus}
      />

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by order ID, customer, email, or product..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        {(activeStatus !== "all" || searchQuery) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="gap-2 shrink-0"
          >
            <X className="w-4 h-4" />
            Clear filters
          </Button>
        )}
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {filteredOrders.length} of {orders.length} orders
        </p>
      </div>

      {/* Orders Table */}
      <OrdersTable
        orders={filteredOrders}
        onViewOrder={handleViewOrder}
        onStatusUpdate={updateOrderStatus}
      />

      {/* Order Drawer */}
      <OrderDrawer
        order={selectedOrder}
        open={showDrawer}
        onOpenChange={setShowDrawer}
        onStatusUpdate={updateOrderStatus}
        onDelete={fetchOrders}
      />
    </div>
  );
};

export default OrdersManager;
