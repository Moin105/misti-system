import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { prefetchGameWithCategories } from "@/hooks/useGameData";

interface Game {
  id: string;
  slug: string;
  name: string;
}

/**
 * Prefetches game data for popular games when page loads.
 * Uses requestIdleCallback to avoid blocking the main thread.
 */
export const usePrefetchPopularGames = (games: Game[], count: number = 3) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (games.length === 0) return;

    const prefetch = () => {
      // Prefetch first N popular games
      games.slice(0, count).forEach((game) => {
        prefetchGameWithCategories(queryClient, game.slug);
      });
    };

    // Use requestIdleCallback if available, otherwise setTimeout
    if ("requestIdleCallback" in window) {
      const id = requestIdleCallback(prefetch, { timeout: 3000 });
      return () => cancelIdleCallback(id);
    } else {
      const timer = setTimeout(prefetch, 1000);
      return () => clearTimeout(timer);
    }
  }, [games, count, queryClient]);
};

/**
 * Prefetches data for visible products/services when entering viewport.
 * Can be used on Services page to prefetch product details.
 */
export const usePrefetchOnIdle = (callback: () => void, deps: unknown[] = []) => {
  useEffect(() => {
    if ("requestIdleCallback" in window) {
      const id = requestIdleCallback(callback, { timeout: 5000 });
      return () => cancelIdleCallback(id);
    } else {
      const timer = setTimeout(callback, 2000);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
};
