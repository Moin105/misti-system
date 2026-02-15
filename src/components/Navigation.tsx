import { Button } from "@/components/ui/button";
import { getOptimizedIconUrl } from "@/lib/imageOptimization";
import { ShoppingCart, User, LogOut, Shield, Package, Trash2, Gift, TrendingUp, Gamepad2, ChevronDown, Search } from "lucide-react";
import mistiLogoSrc from "@/assets/misti-logo.png";

// Ensure logo is a string URL
const mistiLogo = typeof mistiLogoSrc === 'string' ? mistiLogoSrc : (mistiLogoSrc as any)?.default || (mistiLogoSrc as any)?.src || String(mistiLogoSrc);

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useState, useCallback, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { InlineSearch } from "@/components/InlineSearch";
import { useCart } from "@/contexts/CartContext";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import CurrencySelector from "@/components/CurrencySelector";
import { useCurrency } from "@/contexts/CurrencyContext";
import { fetchGameWithCategoriesData } from "@/hooks/useGameData";
import { useAuthUser, useCashbackData } from "@/hooks/useAuthUser";
import { useGames } from "@/hooks/useInitialPageData";
import { InstallAppButton } from "@/components/InstallAppButton";

const Navigation = () => {
  const { user, isAdmin } = useAuthUser();
  const { items, itemCount, cartTotal, removeFromCart } = useCart();
  const navigate = useNavigate();
  const [cartOpen, setCartOpen] = useState(false);
  const { formatPrice, convertPrice } = useCurrency();
  const [gamesOpen, setGamesOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
  const queryClient = useQueryClient();

  // Lazy load cashback data only when dropdown is opened
  const { data: cashbackData } = useCashbackData(user?.id, accountDropdownOpen);

  // Prefetch game data on hover for instant navigation
  const handleGamePrefetch = useCallback((gameSlug: string) => {
    queryClient.prefetchQuery({
      queryKey: ['gameWithCategories', gameSlug],
      queryFn: () => fetchGameWithCategoriesData(gameSlug),
      staleTime: 15 * 60 * 1000,
    });
  }, [queryClient]);

  // Use consolidated initial page data hook - shares cache with Index.tsx
  const { games } = useGames();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const tierInfo = cashbackData?.tierInfo;
  const cashbackBalance = cashbackData?.cashbackBalance || 0;

  // Track scroll position for glass effect
  const [isScrolled, setIsScrolled] = useState(false);
  
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 8);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Check initial position
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Determine if any menu is open (needs solid background for readability)
  const isMenuOpen = gamesOpen || mobileSearchOpen || cartOpen || accountDropdownOpen;

  return (
    <nav 
      className={`
        fixed top-0 left-0 right-0 z-50
        backdrop-blur-xl border-b
        transition-all duration-200
        ${isMenuOpen || isScrolled 
          ? 'bg-background/60 border-border/40 shadow-lg' 
          : 'bg-background/10 border-border/20'
        }
        hover:bg-background/75 hover:border-border/50
      `}
    >
      <div className="container mx-auto px-2 sm:px-4 h-16 flex items-center justify-between gap-2">
        <Link to="/" className="flex items-center flex-shrink-0 mr-1 sm:mr-2">
          <img 
            src={mistiLogo} 
            alt="Misti Services" 
            width={217}
            height={40}
            className="h-6 sm:h-10 w-auto object-contain"
            loading="eager"
            fetchPriority="high"
          />
        </Link>
        
        <div className="flex items-center gap-2 sm:gap-4 flex-1 mx-1 sm:mx-4">
          <DropdownMenu open={gamesOpen} onOpenChange={setGamesOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1 sm:gap-2 h-9 px-2 sm:px-3">
                <Gamepad2 className="h-4 w-4" />
                <span className="hidden md:inline">Games</span>
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="start" 
              className="w-64 max-h-[400px] overflow-y-auto bg-card/95 backdrop-blur-xl border border-border/40 shadow-xl shadow-primary/5 z-[60]"
            >
              {games.map((game) => (
                <DropdownMenuItem 
                  key={game.id} 
                  className="cursor-pointer flex items-center gap-2 mx-1 my-0.5 rounded-lg hover:bg-primary/10 focus:bg-primary/10 transition-all duration-200"
                  onMouseEnter={() => handleGamePrefetch(game.slug)}
                  onClick={() => {
                    setGamesOpen(false);
                    navigate(`/game/${game.slug}`);
                  }}
                >
                  {game.icon_url ? (
                    <img
                      src={getOptimizedIconUrl(game.icon_url, 20)}
                      alt=""
                      width={20}
                      height={20}
                      className="w-5 h-5 rounded object-contain flex-shrink-0"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-5 h-5 rounded bg-muted flex-shrink-0" />
                  )}
                  <span>{game.name}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex-1 max-w-md hidden lg:block">
            <InlineSearch />
          </div>
          
          {/* Mobile Search Button */}
          <Sheet open={mobileSearchOpen} onOpenChange={setMobileSearchOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9 lg:hidden flex-shrink-0">
                <Search className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="top" className="h-auto">
              <SheetHeader>
                <SheetTitle>Search Services</SheetTitle>
              </SheetHeader>
              <div className="mt-4">
                <InlineSearch onResultSelect={() => setMobileSearchOpen(false)} />
              </div>
            </SheetContent>
          </Sheet>
        </div>
        <div className="flex items-center gap-1 sm:gap-2 md:gap-4 flex-shrink-0">
          <Link to="/work-with-us" className="hidden md:inline text-sm font-medium hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-500 hover:bg-clip-text hover:text-transparent transition-all duration-300">
            Work With Us
          </Link>
          <div className="hidden md:block">
            <InstallAppButton variant="icon" />
          </div>
          <div className="flex-shrink-0 min-w-[50px] sm:min-w-[70px]">
            <CurrencySelector />
          </div>
          {user ? (
          <DropdownMenu open={accountDropdownOpen} onOpenChange={setAccountDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-9 px-2 md:px-3">
                <User className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Account</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="end" 
              className="w-72 bg-card/80 backdrop-blur-xl border-border/40 shadow-xl shadow-primary/5 rounded-xl overflow-hidden"
            >
              {/* Enhanced Cashback Summary Header */}
              {tierInfo && (
                <>
                  <div className="relative p-4 bg-gradient-to-br from-primary/10 via-purple-500/5 to-transparent border-b border-border/30">
                    {/* Gradient top accent */}
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
                    
                    {/* Tier badge with glow */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-primary/20 border border-primary/30">
                          <Gift className="h-4 w-4 text-primary" />
                        </div>
                        <span className="font-semibold text-sm bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                          {tierInfo.tier_name} Rank
                        </span>
                      </div>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
                        {tierInfo.tier_percentage}% Cashback
                      </span>
                    </div>
                    
                    {/* Balance with gradient text */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Balance</span>
                      <span className="text-lg font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                        {formatPrice(convertPrice(cashbackBalance))}
                      </span>
                    </div>
                    
                    {/* Progress to next tier */}
                    {tierInfo.next_tier_name && (
                      <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                        <TrendingUp className="h-3 w-3 text-primary" />
                        <span>
                          {formatPrice(convertPrice(tierInfo.spending_to_next_tier))} to {tierInfo.next_tier_name}
                        </span>
                      </div>
                    )}
                    
                    {/* Gradient CTA button */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-3 h-8 text-xs bg-primary/10 border-primary/30 hover:bg-primary/20 hover:border-primary/50 transition-all"
                      asChild
                    >
                      <Link to="/account">View Full Progress</Link>
                    </Button>
                  </div>
                </>
              )}
              
              {/* Menu Items with enhanced styling */}
              <div className="py-2">
                <DropdownMenuItem 
                  className="cursor-pointer mx-2 my-1 rounded-lg hover:bg-primary/10 focus:bg-primary/10 transition-all duration-200 group" 
                  asChild
                >
                  <Link to="/account" className="flex items-center gap-3 px-3 py-2.5">
                    <div className="p-1.5 rounded-md bg-muted/50 group-hover:bg-primary/20 transition-colors">
                      <User className="h-4 w-4 group-hover:text-primary transition-colors" />
                    </div>
                    <span className="font-medium">My Account</span>
                  </Link>
                </DropdownMenuItem>
                
                <DropdownMenuItem 
                  className="cursor-pointer mx-2 my-1 rounded-lg hover:bg-primary/10 focus:bg-primary/10 transition-all duration-200 group" 
                  asChild
                >
                  <Link to="/orders" className="flex items-center gap-3 px-3 py-2.5">
                    <div className="p-1.5 rounded-md bg-muted/50 group-hover:bg-primary/20 transition-colors">
                      <Package className="h-4 w-4 group-hover:text-primary transition-colors" />
                    </div>
                    <span className="font-medium">My Orders</span>
                  </Link>
                </DropdownMenuItem>
                
                {isAdmin && (
                  <>
                    {/* Gradient separator */}
                    <div className="mx-4 my-2 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />
                    
                    <DropdownMenuItem 
                      className="cursor-pointer mx-2 my-1 rounded-lg hover:bg-amber-500/10 focus:bg-amber-500/10 transition-all duration-200 group" 
                      asChild
                    >
                      <Link to="/admin" className="flex items-center gap-3 px-3 py-2.5">
                        <div className="p-1.5 rounded-md bg-amber-500/10 group-hover:bg-amber-500/20 transition-colors">
                          <Shield className="h-4 w-4 text-amber-500" />
                        </div>
                        <span className="font-medium text-amber-500">Admin Dashboard</span>
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                
                {/* Gradient separator */}
                <div className="mx-4 my-2 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />
                
                <DropdownMenuItem 
                  className="cursor-pointer mx-2 my-1 mb-2 rounded-lg hover:bg-destructive/10 focus:bg-destructive/10 transition-all duration-200 group"
                  onClick={handleSignOut}
                >
                  <div className="flex items-center gap-3 px-3 py-2.5">
                    <div className="p-1.5 rounded-md bg-muted/50 group-hover:bg-destructive/20 transition-colors">
                      <LogOut className="h-4 w-4 group-hover:text-destructive transition-colors" />
                    </div>
                    <span className="font-medium group-hover:text-destructive transition-colors">Sign Out</span>
                  </div>
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          ) : (
            <Button variant="ghost" size="sm" className="h-9 px-2 sm:px-3" asChild>
              <Link to="/auth"><span className="hidden sm:inline">Log in</span><User className="h-4 w-4 sm:hidden" /></Link>
            </Button>
          )}
          <Popover open={cartOpen} onOpenChange={setCartOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" className="relative h-9 w-9 flex-shrink-0">
                <ShoppingCart className="h-4 w-4" />
                {itemCount > 0 && (
                  <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs">
                    {itemCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 bg-background border border-border shadow-lg z-[60]" align="end">
              <div className="flex flex-col">
                <div className="p-4 border-b">
                  <h3 className="font-semibold">Shopping Cart</h3>
                  <p className="text-sm text-muted-foreground">
                    {itemCount} {itemCount === 1 ? 'item' : 'items'}
                  </p>
                </div>
                
                {items.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    Your cart is empty
                  </div>
                ) : (
                  <>
                    <ScrollArea className="max-h-[400px]">
                      <div className="p-4 space-y-4">
                        {items.map((item) => (
                          <div key={item.id} className="flex gap-3 items-start">
                            {item.product_image && (
                              <img
                                src={item.product_image}
                                alt={item.product_name}
                                className="w-16 h-16 object-cover rounded flex-shrink-0"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-medium break-words line-clamp-2 mb-1">
                                {item.product_name}
                              </h4>
                              <p className="text-xs text-muted-foreground">
                                Qty: {item.quantity}
                              </p>
                              <p className="text-sm font-semibold mt-1">
                                {formatPrice(item.total_price)}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeFromCart(item.id)}
                              className="h-8 w-8 flex-shrink-0 hover:bg-destructive/10 hover:text-destructive"
                              title="Remove item"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                    
                    <Separator />
                    
                    <div className="p-4 space-y-4">
                      <div className="flex justify-between font-semibold">
                        <span>Total</span>
                        <span>{formatPrice(cartTotal)}</span>
                      </div>
                      <Button 
                        variant="solid"
                        className="w-full" 
                        onClick={() => {
                          setCartOpen(false);
                          navigate("/checkout");
                        }}
                      >
                        Go to Checkout
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
