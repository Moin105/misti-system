import { Star } from "lucide-react";
import { memo } from "react";
import { useReviewPlatforms } from "@/hooks/useInitialPageData";
import { Skeleton } from "@/components/ui/skeleton";

interface TrustBadgesProps {
  showDescription?: boolean;
  priority?: 'high' | 'low';
}

// Skeleton placeholder for LCP optimization - renders immediately
const TrustBadgesSkeleton = () => (
  <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-center gap-6">
      {[1, 2].map((i) => (
        <div
          key={i}
          className="flex items-center gap-3 px-5 py-3 rounded-xl bg-white/5 border border-white/10"
        >
          <div className="flex gap-1">
            {[...Array(5)].map((_, j) => (
              <Skeleton key={j} className="w-5 h-5 rounded" />
            ))}
          </div>
          <Skeleton className="h-4 w-32" />
        </div>
      ))}
    </div>
  </div>
);

const TrustBadges = memo(({ showDescription = true, priority = 'high' }: TrustBadgesProps) => {
  // Use consolidated initial data - eliminates separate API call
  const { platforms, isLoading } = useReviewPlatforms();

  // Show skeleton for high priority elements during loading (LCP optimization)
  if (priority === 'high' && isLoading) {
    return <TrustBadgesSkeleton />;
  }

  // Show nothing while loading if low priority
  if (priority === 'low' && isLoading) {
    return null;
  }

  if (!platforms || platforms.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {showDescription && (
        <p className="text-center text-muted-foreground text-sm">
          See what our customers are saying about us
        </p>
      )}
      <div className="flex flex-wrap items-center justify-center gap-6">
        {platforms.map((platform) => (
          <a
            key={platform.id}
            href={platform.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-5 py-3 rounded-xl
                       bg-gradient-to-br from-white/10 to-white/[0.02] backdrop-blur-sm
                       border border-white/10 hover:border-purple-500/40
                       hover:shadow-[0_0_25px_rgba(139,92,246,0.25),0_0_50px_rgba(59,130,246,0.15)]
                       hover:-translate-y-1 transition-all duration-300 group"
          >
            <div className="flex gap-1 group-hover:drop-shadow-[0_0_8px_currentColor] transition-all duration-300">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className="w-5 h-5 fill-current"
                  style={{ color: platform.primary_color }}
                />
              ))}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold">
                Excellent reviews on {platform.name}
              </span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
});

TrustBadges.displayName = 'TrustBadges';

export default TrustBadges;
