import { Card } from "@/components/ui/card";

/**
 * Skeleton for ServiceItem component
 * Uses fixed aspect-ratio to prevent CLS (Cumulative Layout Shift)
 */
const ServiceItemSkeleton = () => {
  return (
    <Card className="relative overflow-hidden border-border bg-card skeleton-service-item">
      {/* Full image skeleton */}
      <div className="absolute inset-0 bg-muted/40 animate-pulse" />
      
      {/* Bottom gradient overlay skeleton */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-muted/60 to-transparent" />
      
      {/* Content skeleton at bottom */}
      <div className="absolute inset-x-0 bottom-0 p-5 space-y-2">
        {/* Title skeleton */}
        <div className="h-6 bg-muted/50 rounded w-3/4 animate-pulse" />
        
        {/* Price and button row skeleton */}
        <div className="flex items-center justify-between pt-1">
          <div className="space-y-1">
            <div className="h-3 bg-muted/50 rounded w-8 animate-pulse" />
            <div className="h-6 bg-muted/50 rounded w-16 animate-pulse" />
          </div>
          <div className="h-8 bg-muted/50 rounded w-24 animate-pulse" />
        </div>
      </div>
    </Card>
  );
};

export default ServiceItemSkeleton;
