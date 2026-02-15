import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

interface AuthUserData {
  user: User | null;
  isAdmin: boolean;
}

async function fetchUserRoles(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  return !!data;
}

export function useAuthUser() {
  const [user, setUser] = useState<User | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const queryClient = useQueryClient();

  // Fetch admin status only when we have a user
  const { data: isAdmin = false } = useQuery({
    queryKey: ['userRoles', user?.id],
    queryFn: () => fetchUserRoles(user!.id),
    enabled: !!user,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000,
  });

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsInitialized(true);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      
      // Invalidate user-related queries on auth change
      if (!session) {
        queryClient.removeQueries({ queryKey: ['userRoles'] });
        queryClient.removeQueries({ queryKey: ['cashbackData'] });
      }
    });

    return () => subscription.unsubscribe();
  }, [queryClient]);

  return { user, isAdmin, isInitialized };
}

// Separate hook for cashback data - lazy loaded
export function useCashbackData(userId: string | undefined, enabled: boolean = true) {
  return useQuery({
    queryKey: ['cashbackData', userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const [profileResult, tierResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("cashback_balance")
          .eq("id", userId)
          .single(),
        supabase.rpc("get_user_tier", { p_user_id: userId })
      ]);

      // Log errors for debugging but don't throw
      if (tierResult.error) {
        console.error("useCashbackData: get_user_tier RPC error:", tierResult.error.message);
      }
      if (profileResult.error) {
        console.error("useCashbackData: profile fetch error:", profileResult.error.message);
      }

      // Return data even if tier fetch fails - at least show balance
      const tierData = tierResult.data;
      return {
        cashbackBalance: profileResult.data?.cashback_balance || 0,
        tierInfo: (tierData && Array.isArray(tierData) && tierData.length > 0) 
          ? {
              tier_name: tierData[0].tier_name,
              tier_percentage: tierData[0].tier_percentage,
              spending_to_next_tier: tierData[0].spending_to_next_tier,
              next_tier_name: tierData[0].next_tier_name,
            } 
          : null
      };
    },
    enabled: !!userId && enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000,
  });
}
