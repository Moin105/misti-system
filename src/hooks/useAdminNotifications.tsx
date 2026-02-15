import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { debounce } from "@/lib/debounce";
import { getErrorMessage } from "@/lib/errorHandler";

interface NotificationCounts {
  orders: number;
  workApplications: number;
  inquiries: number;
}

export const useAdminNotifications = () => {
  const [counts, setCounts] = useState<NotificationCounts>({
    orders: 0,
    workApplications: 0,
    inquiries: 0,
  });
  const [loading, setLoading] = useState(true);
  const [connectionState, setConnectionState] = useState<'connected' | 'disconnected' | 'reconnecting'>('disconnected');
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  // Fetch initial counts
  const fetchCounts = async () => {
    try {
      const [ordersRes, applicationsRes, inquiriesRes] = await Promise.all([
        // Count pending/processing orders
        supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .in("status", ["pending", "processing"]),
        
        // Count pending work applications
        supabase
          .from("work_applications")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),
        
        // Count pending product inquiries
        supabase
          .from("product_inquiries")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),
      ]);

      // Check for individual errors but don't fail the whole operation
      if (ordersRes.error) {
        console.warn("Error fetching orders count:", ordersRes.error.message);
      }
      if (applicationsRes.error) {
        console.warn("Error fetching work applications count:", applicationsRes.error.message);
      }
      if (inquiriesRes.error) {
        console.warn("Error fetching inquiries count:", inquiriesRes.error.message);
      }

      setCounts({
        orders: ordersRes.error ? 0 : (ordersRes.count || 0),
        workApplications: applicationsRes.error ? 0 : (applicationsRes.count || 0),
        inquiries: inquiriesRes.error ? 0 : (inquiriesRes.count || 0),
      });
      setConnectionState('connected');
      retryCountRef.current = 0; // Reset retry count on success
    } catch (error) {
      console.error("Error fetching notification counts:", getErrorMessage(error));
      setConnectionState('disconnected');
    } finally {
      setLoading(false);
    }
  };

  // Debounced version to prevent API flooding
  const debouncedFetchCounts = useCallback(
    debounce(() => fetchCounts(), 500),
    []
  );

  // Setup subscriptions with error handling and retry logic
  const setupSubscriptions = useCallback(() => {
    try {
      const ordersChannel = supabase
        .channel("admin-orders-notifications")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "orders",
            filter: "status=in.(pending,processing)",
          },
          () => {
            debouncedFetchCounts();
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            setConnectionState('connected');
            retryCountRef.current = 0;
          } else if (status === 'CHANNEL_ERROR') {
            setConnectionState('disconnected');
            handleSubscriptionError();
          }
        });

      const applicationsChannel = supabase
        .channel("admin-applications-notifications")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "work_applications",
            filter: "status=eq.pending",
          },
          () => {
            debouncedFetchCounts();
          }
        )
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR') {
            handleSubscriptionError();
          }
        });

      const inquiriesChannel = supabase
        .channel("admin-inquiries-notifications")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "product_inquiries",
            filter: "status=eq.pending",
          },
          () => {
            debouncedFetchCounts();
          }
        )
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR') {
            handleSubscriptionError();
          }
        });

      return [ordersChannel, applicationsChannel, inquiriesChannel];
    } catch (error) {
      console.error("Error setting up subscriptions:", getErrorMessage(error));
      handleSubscriptionError();
      return [];
    }
  }, [debouncedFetchCounts]);

  // Handle subscription errors with exponential backoff
  const handleSubscriptionError = useCallback(() => {
    if (retryCountRef.current < maxRetries) {
      const backoffTime = Math.pow(2, retryCountRef.current) * 1000;
      retryCountRef.current += 1;
      setConnectionState('reconnecting');
      
      setTimeout(() => {
        fetchCounts();
      }, backoffTime);
    } else {
      setConnectionState('disconnected');
      console.error("Max retries reached for realtime subscriptions");
    }
  }, []);

  useEffect(() => {
    fetchCounts();
    const channels = setupSubscriptions();

    // Cleanup subscriptions on unmount
    return () => {
      channels.forEach(channel => {
        if (channel) {
          supabase.removeChannel(channel);
        }
      });
    };
  }, [setupSubscriptions]);

  const totalCount = counts.orders + counts.workApplications + counts.inquiries;

  return {
    counts,
    totalCount,
    loading,
    connectionState,
    refetch: fetchCounts,
  };
};
