import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface CartItem {
  id: string;
  product_id: string;
  product_name: string;
  product_image?: string;
  quantity: number;
  base_price: number;
  selected_options: Record<string, any>;
  total_price: number;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (item: Omit<CartItem, 'id'>) => Promise<boolean>;
  removeFromCart: (itemId: string) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  cartTotal: number;
  itemCount: number;
  loading: boolean;
  refetchCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

async function fetchCartItems(userId: string): Promise<CartItem[]> {
  const { data: cartItems, error } = await supabase
    .from("cart_items")
    .select(`
      id,
      product_id,
      quantity,
      selected_options,
      total_price,
      products (
        name,
        base_price,
        image_url
      )
    `)
    .eq("user_id", userId);

  if (error) {
    console.error("Failed to fetch cart items:", error.message);
    throw new Error("Failed to fetch cart items");
  }

  if (!cartItems) return [];

  // Filter out items with inaccessible/deactivated products instead of crashing
  return cartItems
    .filter((item: any) => item.products !== null)
    .map((item: any) => ({
      id: item.id,
      product_id: item.product_id,
      product_name: item.products.name,
      product_image: item.products.image_url,
      quantity: item.quantity,
      base_price: item.products.base_price,
      selected_options: item.selected_options || {},
      total_price: item.total_price,
    }));
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check auth on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
      if (!session) {
        queryClient.removeQueries({ queryKey: ['cart'] });
      }
    });

    return () => subscription.unsubscribe();
  }, [queryClient]);

  // React Query for cart data with caching
  const { data: items = [], isLoading: loading, refetch } = useQuery({
    queryKey: ['cart', userId],
    queryFn: () => fetchCartItems(userId!),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes cache
    gcTime: 10 * 60 * 1000,
  });

  const refetchCart = useCallback(() => {
    refetch();
  }, [refetch]);

  const addToCart = useCallback(async (item: Omit<CartItem, 'id'>) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast({
        title: "Authentication required",
        description: "Please log in to add items to cart",
        variant: "destructive",
      });
      return false;
    }

    // Optimistic update — immediately show item in cart
    const tempId = crypto.randomUUID();
    const optimisticItem: CartItem = { ...item, id: tempId };
    queryClient.setQueryData(
      ['cart', session.user.id],
      (old: CartItem[] | undefined) => [...(old || []), optimisticItem]
    );

    const { error } = await supabase.from("cart_items").insert({
      user_id: session.user.id,
      product_id: item.product_id,
      quantity: item.quantity,
      selected_options: item.selected_options,
      total_price: item.total_price,
    });

    if (error) {
      // Rollback optimistic update
      queryClient.setQueryData(
        ['cart', session.user.id],
        (old: CartItem[] | undefined) => (old || []).filter(i => i.id !== tempId)
      );
      toast({
        title: "Error",
        description: "Failed to add item to cart",
        variant: "destructive",
      });
      return false;
    }

    // Background refetch for real server-generated IDs
    queryClient.invalidateQueries({ queryKey: ['cart', session.user.id] });
    toast({
      title: "Added to cart",
      description: `${item.product_name} has been added to your cart`,
    });
    return true;
  }, [queryClient, toast]);

  const removeFromCart = useCallback(async (itemId: string) => {
    // Optimistic removal
    queryClient.setQueryData(
      ['cart', userId],
      (old: CartItem[] | undefined) => (old || []).filter(i => i.id !== itemId)
    );

    const { error } = await supabase
      .from("cart_items")
      .delete()
      .eq("id", itemId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to remove item from cart",
        variant: "destructive",
      });
      // Refetch to restore correct state
      queryClient.invalidateQueries({ queryKey: ['cart', userId] });
      return;
    }

    queryClient.invalidateQueries({ queryKey: ['cart', userId] });
  }, [queryClient, toast, userId]);

  const updateQuantity = useCallback(async (itemId: string, quantity: number) => {
    if (quantity < 1) return;

    const { error } = await supabase
      .from("cart_items")
      .update({ quantity })
      .eq("id", itemId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update quantity",
        variant: "destructive",
      });
      return;
    }

    queryClient.invalidateQueries({ queryKey: ['cart', userId] });
  }, [queryClient, toast, userId]);

  const clearCart = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase
      .from("cart_items")
      .delete()
      .eq("user_id", session.user.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to clear cart",
        variant: "destructive",
      });
      return;
    }

    queryClient.invalidateQueries({ queryKey: ['cart', session.user.id] });
  }, [queryClient, toast]);

  const cartTotal = items.reduce((sum, item) => sum + item.total_price, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartTotal,
        itemCount,
        loading,
        refetchCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
