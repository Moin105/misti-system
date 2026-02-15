import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface GameFAQ {
  id: string;
  game_id: string;
  question: string;
  answer: string;
  sort_order: number;
  is_active: boolean;
  generated_by: string;
  created_at: string;
  updated_at: string;
}

export const useGameFAQs = (gameId: string | undefined) => {
  return useQuery({
    queryKey: ['game-faqs', gameId],
    queryFn: async () => {
      if (!gameId) return [];

      const { data, error } = await supabase
        .from("game_faqs")
        .select("*")
        .eq("game_id", gameId)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return (data || []) as GameFAQ[];
    },
    enabled: !!gameId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};