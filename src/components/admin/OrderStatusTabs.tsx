import { cn } from "@/lib/utils";

interface Order {
  status: string;
}

interface OrderStatusTabsProps {
  orders: Order[];
  activeStatus: string;
  onStatusChange: (status: string) => void;
}

export const OrderStatusTabs = ({
  orders,
  activeStatus,
  onStatusChange,
}: OrderStatusTabsProps) => {
  const getCount = (status: string) => {
    if (status === "all") return orders.length;
    return orders.filter((o) => o.status === status).length;
  };

  const tabs = [
    { id: "all", label: "All Orders" },
    { id: "processing", label: "Processing" },
    { id: "pending", label: "Pending" },
    { id: "completed", label: "Completed" },
    { id: "cancelled", label: "Cancelled" },
  ];

  return (
    <div className="flex items-center gap-1 p-1.5 bg-card/60 backdrop-blur-sm border border-border/40 rounded-xl overflow-x-auto">
      {tabs.map((tab) => {
        const count = getCount(tab.id);
        const isActive = activeStatus === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => onStatusChange(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300 whitespace-nowrap",
              isActive
                ? "bg-gradient-to-r from-primary/20 to-purple-500/20 text-foreground border border-primary/30 shadow-lg shadow-primary/10"
                : "text-muted-foreground hover:text-foreground hover:bg-primary/10"
            )}
          >
            {tab.label}
            <span
              className={cn(
                "px-2 py-0.5 text-xs rounded-full transition-all duration-300",
                isActive
                  ? "bg-primary/20 text-primary border border-primary/30"
                  : "bg-muted/50 text-muted-foreground"
              )}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
};
