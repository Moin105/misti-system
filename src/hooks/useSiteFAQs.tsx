import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SiteFAQ {
  id: string;
  question: string;
  answer: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useSiteFAQs = () => {
  return useQuery({
    queryKey: ["site-faqs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_faqs")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data as SiteFAQ[];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};
