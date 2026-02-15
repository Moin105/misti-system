import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface NotificationBadgeProps {
  count: number;
  className?: string;
  variant?: "default" | "destructive" | "outline" | "secondary";
}

export const NotificationBadge = ({ 
  count, 
  className,
  variant = "destructive" 
}: NotificationBadgeProps) => {
  if (count === 0) return null;

  return (
    <Badge 
      variant={variant}
      className={cn(
        "ml-auto h-5 min-w-[20px] px-1.5 flex items-center justify-center text-xs font-bold",
        "animate-pulse",
        className
      )}
    >
      {count > 99 ? "99+" : count}
    </Badge>
  );
};
