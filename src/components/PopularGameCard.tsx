import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { memo, useCallback } from "react";
import { Star } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { fetchGameWithCategoriesData } from "@/hooks/useGameData";
import GameIcon from "@/components/GameIcon";

interface PopularGameCardProps {
  title: string;
  icon?: string | null;
  slug: string;
  /** Whether this is a high-priority image (above the fold) */
  priority?: boolean;
}

const PopularGameCard = memo(({ title, icon, slug, priority = false }: PopularGameCardProps) => {
  const queryClient = useQueryClient();

  // Prefetch game data on hover for instant navigation
  const handleMouseEnter = useCallback(() => {
    queryClient.prefetchQuery({
      queryKey: ['gameWithCategories', slug],
      queryFn: () => fetchGameWithCategoriesData(slug),
      staleTime: 15 * 60 * 1000,
    });
  }, [queryClient, slug]);

  return (
    <Link to={`/game/${slug}`} className="block h-[180px]" onMouseEnter={handleMouseEnter}>
      <Card className="group relative p-6 rounded-xl cursor-pointer bg-transparent border border-border/10 hover:border-transparent hover:bg-card/5 transition-all duration-300 hover:scale-105 gradient-card-hover hover:shadow-[0_0_30px_rgba(139,92,246,0.3)] h-full">
        {/* Optional accent badge */}
        <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <Star className="w-3 h-3 text-purple-400 fill-purple-400" />
        </div>
        
        {/* Centered icon */}
        <div className="flex flex-col items-center justify-center space-y-4 h-full">
          <div className="w-20 h-20 flex items-center justify-center flex-shrink-0">
            <GameIcon src={icon} alt={title} size={80} priority={priority} />
          </div>
          
          {/* Game name */}
          <h3 className="text-base font-semibold text-center text-foreground group-hover:bg-gradient-to-r group-hover:from-blue-400 group-hover:to-purple-400 group-hover:bg-clip-text group-hover:text-transparent transition-all duration-300 line-clamp-2">
            {title}
          </h3>
        </div>
      </Card>
    </Link>
  );
});

PopularGameCard.displayName = 'PopularGameCard';

export default PopularGameCard;
