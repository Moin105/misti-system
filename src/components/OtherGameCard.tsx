import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { memo, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { fetchGameWithCategoriesData } from "@/hooks/useGameData";
import GameIcon from "@/components/GameIcon";

interface OtherGameCardProps {
  title: string;
  icon?: string | null;
  slug: string;
}

const OtherGameCard = memo(({ title, icon, slug }: OtherGameCardProps) => {
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
    <Link to={`/game/${slug}`} className="block" onMouseEnter={handleMouseEnter}>
      <Card className="group relative p-6 rounded-xl cursor-pointer bg-transparent border border-border/10 hover:border-transparent hover:bg-card/5 transition-all duration-300 hover:scale-105 gradient-card-hover hover:shadow-[0_0_30px_rgba(139,92,246,0.3)]">
        {/* Centered icon */}
        <div className="flex flex-col items-center justify-center space-y-4 min-h-[140px]">
          <div className="w-20 h-20 flex items-center justify-center">
            <GameIcon src={icon} alt={title} size={80} />
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

OtherGameCard.displayName = 'OtherGameCard';

export default OtherGameCard;
