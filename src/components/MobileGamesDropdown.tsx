import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import GameCard from "@/components/GameCard";

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
}

interface Game {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  icon_url: string | null;
  is_active: boolean;
  sort_order: number;
  categories?: Category[];
  genreIds?: string[];
}

interface Genre {
  id: string;
  name: string;
  slug: string;
}

interface MobileGamesDropdownProps {
  games: Game[];
  genres: Genre[];
  loading: boolean;
}

const MobileGamesDropdown = ({ games, genres, loading }: MobileGamesDropdownProps) => {
  const [openGenre, setOpenGenre] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-14 rounded-lg bg-muted/30 animate-pulse" />
        ))}
      </div>
    );
  }

  const allGenres = [
    { id: "all", name: "All Games", slug: "all" },
    ...genres,
  ];

  const getGenreGames = (genreId: string) => {
    if (genreId === "all") return games;
    return games.filter((game) => game.genreIds?.includes(genreId));
  };

  return (
    <div className="space-y-3">
      {allGenres.map((genre) => {
        const genreGames = getGenreGames(genre.id);
        const isOpen = openGenre === genre.id;

        return (
          <Collapsible
            key={genre.id}
            open={isOpen}
            onOpenChange={(open) => setOpenGenre(open ? genre.id : null)}
          >
            <CollapsibleTrigger className="w-full flex items-center justify-between p-4 rounded-lg bg-card/60 backdrop-blur-sm border border-border/40 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">{genre.name}</span>
                <span className="text-xs text-muted-foreground">
                  ({genreGames.length})
                </span>
              </div>
              <ChevronDown
                className={`w-5 h-5 text-muted-foreground transition-transform duration-300 ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <div className="grid grid-cols-1 gap-4">
                {genreGames.map((game) => (
                  <GameCard
                    key={game.id}
                    title={game.name}
                    icon={game.icon_url}
                    slug={game.slug}
                  />
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </div>
  );
};

export default MobileGamesDropdown;
