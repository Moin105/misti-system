import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/LazyFooter";
import SEO from "@/components/SEO";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Trash2, 
  Loader2, 
  AlertCircle, 
  ShoppingCart, 
  User, 
  Tag, 
  Receipt, 
  CreditCard, 
  Lock,
  ShoppingBag,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useCurrency } from "@/contexts/CurrencyContext";
import CountrySelector from "@/components/CountrySelector";


// Small order surcharge constants
const SMALL_ORDER_THRESHOLD = 100;
const SMALL_ORDER_SURCHARGE = 1.50;

const checkoutSchema = z.object({
  customerName: z.string()
    .trim()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name contains invalid characters'),
  customerEmail: z.string()
    .trim()
    .email('Invalid email address')
    .max(255, 'Email must be less than 255 characters'),
  contactDetails: z.string()
    .trim()
    .min(1, 'Contact details are required')
    .max(200, 'Contact details must be less than 200 characters'),
  country: z.string()
    .trim()
    .min(1, 'Country is required')
    .max(100, 'Country must be less than 100 characters'),
  address: z.string()
    .max(500, 'Address must be less than 500 characters')
    .optional()
    .or(z.literal('')),
  notes: z.string()
    .max(1000, 'Notes must be less than 1000 characters')
    .optional()
    .or(z.literal(''))
});

interface PaymentMethod {
  id: string;
  name: string;
  type: string;
  is_active: boolean;
  fee_text: string | null;
  logo_url: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface PaymentIcon {
  id: string;
  name: string;
  icon_url: string;
  sort_order: number;
  is_active: boolean;
}

// Section Header Component for consistent styling
const SectionHeader = ({ 
  icon: Icon, 
  title, 
  subtitle 
}: { 
  icon: React.ElementType; 
  title: string; 
  subtitle?: string;
}) => (
  <div className="flex items-center gap-3 mb-6">
    <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20 border border-primary/30">
      <Icon className="h-5 w-5 text-primary" />
    </div>
    <div>
      <h2 className="text-xl font-bold">{title}</h2>
      {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
    </div>
  </div>
);

// Glassmorphism Card Wrapper
const GlassCard = ({ 
  children, 
  className,
  sticky = false
}: { 
  children: React.ReactNode; 
  className?: string;
  sticky?: boolean;
}) => (
  <Card className={cn(
    "relative overflow-hidden bg-card/40 backdrop-blur-sm border-border/30",
    "hover:border-primary/30 transition-all duration-300",
    "hover:shadow-lg hover:shadow-primary/5",
    sticky && "sticky top-24",
    className
  )}>
    {/* Gradient top border */}
    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
    <div className="p-6">
      {children}
    </div>
  </Card>
);

const Checkout = () => {
  const navigate = useNavigate();
  const { items, removeFromCart, updateQuantity, clearCart, cartTotal, loading: cartLoading } = useCart();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [paymentIcons, setPaymentIcons] = useState<PaymentIcon[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [contactDetails, setContactDetails] = useState("");
  const [country, setCountry] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [cashbackBalance, setCashbackBalance] = useState(0);
  const [useCashback, setUseCashback] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const [discountCode, setDiscountCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [appliedReferral, setAppliedReferral] = useState<any>(null);
  const [isValidatingCode, setIsValidatingCode] = useState(false);
  const [currentTierPercentage, setCurrentTierPercentage] = useState(0);
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const [showAllErrors, setShowAllErrors] = useState(false);
  const { formatPrice } = useCurrency();

  // Validation helper function
  const getValidationErrors = () => {
    const errors: Record<string, string> = {};
    
    if (!customerName.trim()) {
      errors.customerName = "Name is required";
    } else if (!/^[a-zA-Z\s'-]+$/.test(customerName)) {
      errors.customerName = "Name contains invalid characters";
    }
    
    if (!customerEmail.trim()) {
      errors.customerEmail = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      errors.customerEmail = "Invalid email address";
    }
    
    if (!contactDetails.trim()) {
      errors.contactDetails = "Contact details are required";
    }
    
    if (!country.trim()) {
      errors.country = "Country is required";
    }
    
    return errors;
  };

  const validationErrors = getValidationErrors();
  const hasValidationErrors = Object.keys(validationErrors).length > 0;

  useEffect(() => {
    checkAuthAndLoad();
  }, []);

  const checkAuthAndLoad = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast({
        title: "Authentication required",
        description: "Please log in to access checkout",
        variant: "destructive",
      });
      navigate("/auth?redirect=/checkout");
      return;
    }
    loadPaymentMethods();
    loadUserData();
  };

  const loadUserData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      setUserId(session.user.id);
      setCustomerEmail(session.user.email || "");
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, cashback_balance")
        .eq("id", session.user.id)
        .maybeSingle();
      if (profile) {
        setCustomerName(profile.full_name || "");
        setCashbackBalance(profile.cashback_balance || 0);
      }

      // Fetch user's cashback tier percentage
      const { data: tierData } = await supabase.rpc("get_user_tier", {
        p_user_id: session.user.id,
        p_pending_amount: 0,
      });
      if (tierData && tierData.length > 0) {
        setCurrentTierPercentage(tierData[0].tier_percentage || 0);
      }
    }
  };

  const loadPaymentMethods = async () => {
    // Fetch payment methods and icons in parallel
    const [methodsRes, iconsRes] = await Promise.all([
      supabase.rpc("get_public_payment_methods"),
      supabase
        .from("payment_icons")
        .select("*")
        .eq("is_active", true)
        .order("sort_order")
    ]);
    
    if (methodsRes.data) {
      setPaymentMethods(methodsRes.data as PaymentMethod[]);
      if (methodsRes.data.length > 0) {
        setSelectedPaymentMethod(methodsRes.data[0].id);
      }
    }
    
    if (iconsRes.data) {
      setPaymentIcons(iconsRes.data);
    }
  };

  const handleCheckout = async () => {
    // Show all validation errors on submit attempt
    setShowAllErrors(true);
    
    // Check inline validation first
    if (hasValidationErrors) {
      toast({
        title: "Please complete required fields",
        description: "Fill in all highlighted fields to continue",
        variant: "destructive",
      });
      return;
    }
    
    // Validate inputs with zod schema for additional checks
    try {
      checkoutSchema.parse({
        customerName: customerName,
        customerEmail: customerEmail,
        contactDetails: contactDetails,
        country: country,
        address: address,
        notes: notes
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Invalid Input",
          description: error.errors[0].message,
          variant: "destructive",
        });
        return;
      }
    }

    if (!selectedPaymentMethod) {
      toast({
        title: "Select payment method",
        description: "Please select a payment method",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast({
        title: "Authentication required",
        description: "Please log in to complete checkout",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Calculate cashback amounts and discount (coupon OR referral)
    const couponDiscount = appliedCoupon?.discount_amount || 0;
    const referralDiscount = appliedReferral ? (cartTotal * appliedReferral.discount_percentage / 100) : 0;
    const totalDiscount = couponDiscount + referralDiscount;
    const subtotal = cartTotal - totalDiscount;
    const cashbackUsed = useCashback ? Math.min(cashbackBalance, subtotal) : 0;
    const preSurchargeTotal = subtotal - cashbackUsed;
    
    // Apply small order surcharge for orders under $100
    const surchargeAmount = preSurchargeTotal < SMALL_ORDER_THRESHOLD ? SMALL_ORDER_SURCHARGE : 0;
    const finalTotal = preSurchargeTotal + surchargeAmount;

    // Validate final total is positive
    if (finalTotal <= 0) {
      toast({
        title: "Invalid Total",
        description: "Order total must be greater than $0. Please adjust your discounts.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Validate cashback balance before proceeding
    if (useCashback && cashbackUsed > cashbackBalance) {
      toast({
        title: "Insufficient Cashback",
        description: "You don't have enough cashback balance for this purchase.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Calculate cashback earned based on user's tier INCLUDING pending order
    const { data: tierData } = await supabase.rpc("get_user_tier", {
      p_user_id: session.user.id,
      p_pending_amount: finalTotal,
    });

    const cashbackPercentage = tierData && tierData.length > 0 ? tierData[0].tier_percentage : 0;
    // Option B: Earn cashback on amount after coupon but before cashback used
    const cashbackEarned = (subtotal * cashbackPercentage) / 100;

    // Create order with pending status (avoid post-insert select to prevent RLS readback failures)
    const orderId = crypto.randomUUID();
    const orderNumber = `ORD-${Date.now()}`;
    const { error: orderError } = await supabase
      .from("orders")
      .insert([{
        id: orderId,
        user_id: session.user.id,
        customer_name: customerName,
        customer_email: customerEmail,
        contact_details: contactDetails,
        country: country,
        address: address || null,
        total_amount: finalTotal,
        cashback_used: cashbackUsed,
        cashback_earned: cashbackEarned,
        notes: notes || null,
        status: "pending" as const,
        order_number: orderNumber,
        coupon_id: appliedCoupon?.coupon_id || null,
        coupon_discount: couponDiscount,
        referrer_id: appliedReferral?.referrer_id || null,
        referral_discount: referralDiscount,
      }]);

    if (orderError) {
      toast({
        title: "Error",
        description: `Failed to create order: ${orderError.message}`,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const toSafeQuantity = (value: unknown) => {
      const parsed = Math.round(Number(value));
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
    };

    const toSafeNumber = (value: unknown, fallback: number = 0) => {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : fallback;
    };

    // Create order items (sanitize payload to match DB integer/numeric types)
    const orderItems = items.map(item => ({
      order_id: orderId,
      product_id: item.product_id,
      product_name: item.product_name,
      quantity: toSafeQuantity(item.quantity),
      unit_price: toSafeNumber(item.base_price, 0),
      selected_options: item.selected_options,
    }));

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItems);

    if (itemsError) {
      toast({
        title: "Error",
        description: "Failed to save order items",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Note: Order notifications are sent AFTER payment is verified in verify-payment edge function
    // This ensures customers only receive confirmation when payment succeeds

    // Cashback will be processed after payment verification
    // Don't process cashback here - it happens in verify-payment edge function

    // Create Stripe checkout session
    try {
      const { data: stripeData, error: stripeError } = await supabase.functions.invoke(
        "create-checkout-session",
        {
          body: {
            orderId,
            orderNumber,
            totalAmount: finalTotal,
            items: items.map(item => ({
              name: item.product_name,
              quantity: toSafeQuantity(item.quantity),
              unitPrice: toSafeNumber(item.total_price, 0),
            })),
            couponDiscount: couponDiscount > 0 ? couponDiscount : undefined,
            couponCode: appliedCoupon?.code,
          },
        }
      );

      if (stripeError) throw stripeError;

      if (stripeData?.url) {
        // Redirect to Stripe Checkout in same tab
        window.location.href = stripeData.url;
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (error: any) {
      console.error("Stripe checkout error:", error);
      toast({
        title: "Payment Error",
        description: error.message || "Failed to initiate payment. Please try again.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Note: Coupon usage will be tracked after payment verification in verify-payment function
    setLoading(false);
  };

  const handleApplyCode = async () => {
    if (!discountCode.trim()) {
      toast({
        title: "Error",
        description: "Please enter a discount or referral code",
        variant: "destructive",
      });
      return;
    }

    // Don't allow applying if already have a discount
    if (appliedCoupon || appliedReferral) {
      toast({
        title: "Error",
        description: "A discount is already applied. Remove it first.",
        variant: "destructive",
      });
      return;
    }

    setIsValidatingCode(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        toast({
          title: "Error",
          description: "Please log in to apply codes",
          variant: "destructive",
        });
        return;
      }

      // Try as coupon first
      const cartItems = items.map(item => ({
        product_id: item.product_id,
        total_price: item.total_price
      }));

      const { data: couponData, error: couponError } = await supabase.rpc("validate_coupon", {
        p_code: discountCode.toUpperCase(),
        p_user_id: user.user.id,
        p_cart_items: cartItems
      }) as { data: any; error: any };

      if (!couponError && couponData?.valid) {
        setAppliedCoupon(couponData);
        toast({
          title: "Coupon Applied!",
          description: `${couponData.discount_percentage}% discount added`,
        });
        return;
      }

      // If coupon failed, try as referral code
      const { data: referralData, error: referralError } = await supabase.rpc("validate_referral_code", {
        p_code: discountCode.toUpperCase(),
        p_user_id: user.user.id
      }) as { data: any; error: any };

      if (!referralError && referralData?.valid) {
        // Check minimum order amount
        if (cartTotal < referralData.min_order_amount) {
          toast({
            title: "Minimum Order Required",
            description: `This referral code requires a minimum order of ${formatPrice(referralData.min_order_amount)}. Your friend will receive ${referralData.discount_percentage}% cashback once you place a qualifying order.`,
            variant: "destructive",
          });
          return;
        }
        
        // referred_by is set by verify-payment edge function after payment succeeds
        // No premature profile update needed here - the order stores referrer_id
        setAppliedReferral(referralData);
        toast({
          title: "Referral Code Applied!",
          description: `You get ${referralData.discount_percentage}% off! ${referralData.referrer_name} will receive cashback when your order completes.`,
        });
        return;
      }

      // Neither worked - provide helpful error messaging
      const errorMessage = couponData?.error || referralData?.error || "This code is not valid";
      let helpText = errorMessage;
      
      // Add context for common errors
      if (errorMessage.includes("already used")) {
        helpText = "This referral code is already linked to your account. Referral codes can only be used once per account.";
      } else if (errorMessage.includes("own referral")) {
        helpText = "You cannot use your own referral code.";
      }
      
      toast({
        title: "Invalid Code",
        description: helpText,
        variant: "destructive",
      });
    } catch (error: any) {
      console.error("Code validation error:", error);
      toast({
        title: "Error",
        description: "Failed to validate code",
        variant: "destructive",
      });
    } finally {
      setIsValidatingCode(false);
    }
  };

  const handleRemoveDiscount = async () => {
    // No profile cleanup needed - referred_by is only set after payment in verify-payment
    setAppliedCoupon(null);
    setAppliedReferral(null);
    setDiscountCode("");
    toast({
      title: "Discount Removed",
      description: "You can apply a different code now",
    });
  };

  // Loading State with Gradient Background
  if (cartLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1 relative overflow-hidden">
          {/* Gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-[hsl(220,45%,12%)] via-[hsl(220,40%,10%)] to-[hsl(215,40%,8%)]" />
          <div className="absolute top-20 right-1/4 w-72 h-72 bg-primary/10 rounded-full blur-3xl hidden md:block" />
          <div className="absolute bottom-20 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl hidden md:block" />
          
          <div className="flex items-center justify-center min-h-[60vh] relative z-10">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
              <p className="text-muted-foreground">Loading your cart...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Empty Cart State with Premium Styling
  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1 relative overflow-hidden">
          {/* Gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-[hsl(220,45%,12%)] via-[hsl(220,40%,10%)] to-[hsl(215,40%,8%)]" />
          <div className="absolute top-20 right-1/4 w-72 h-72 bg-primary/10 rounded-full blur-3xl hidden md:block" />
          <div className="absolute bottom-20 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl hidden md:block" />
          
          <div className="flex items-center justify-center min-h-[60vh] relative z-10 pt-16">
            <GlassCard className="max-w-md mx-4">
              <div className="text-center py-8">
                <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 border border-primary/30 flex items-center justify-center mb-6">
                  <ShoppingBag className="w-10 h-10 text-primary" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Your cart is empty</h2>
                <p className="text-muted-foreground mb-6">
                  Browse our services to find something you like
                </p>
                <Button 
                  variant="solid" 
                  size="lg"
                  onClick={() => navigate("/")}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Continue Shopping
                </Button>
              </div>
            </GlassCard>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SEO 
        title="Checkout - misti.services"
        description="Complete your purchase securely."
        noindex={true}
      />
      <Navigation />
      
      <main className="flex-1 relative overflow-hidden">
        {/* Gradient mesh background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(220,45%,12%)] via-[hsl(220,40%,10%)] to-[hsl(215,40%,8%)]" />
        
        {/* Animated orbs - hidden on mobile */}
        <div className="absolute top-20 right-1/4 w-72 h-72 bg-primary/10 rounded-full blur-3xl hidden md:block animate-pulse" />
        <div className="absolute bottom-40 left-1/6 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl hidden md:block" />
        <div className="absolute top-1/2 right-1/6 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl hidden lg:block" />
        
        {/* Radial glow overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent opacity-30" />
        
        <div className="container mx-auto px-4 py-24 relative z-10">
          {/* Page Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20 border border-primary/30">
                <Lock className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-400 via-primary to-purple-400 bg-clip-text text-transparent">
                Secure Checkout
              </h1>
            </div>
            <p className="text-muted-foreground text-lg">
              Complete your order securely with our trusted payment system
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Cart & Customer Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Cart Items Card */}
              <GlassCard>
                <SectionHeader 
                  icon={ShoppingCart} 
                  title="Cart Items" 
                  subtitle={`${items.length} ${items.length === 1 ? 'item' : 'items'} in your cart`}
                />
                <div className="space-y-0">
                  {items.map((item, index) => (
                    <div key={item.id}>
                      <div className="flex gap-4 py-4">
                        {item.product_image && (
                          <img
                            src={item.product_image}
                            alt={item.product_name}
                            className="w-20 h-20 object-cover rounded-lg border border-border/30"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold truncate">{item.product_name}</h3>
                          <p className="text-sm text-muted-foreground">{formatPrice(item.base_price)} each</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                              className="h-8 w-8 p-0"
                            >
                              -
                            </Button>
                            <span className="w-8 text-center font-medium">{item.quantity}</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="h-8 w-8 p-0"
                            >
                              +
                            </Button>
                          </div>
                        </div>
                        <div className="text-right flex flex-col items-end justify-between">
                          <p className="font-bold text-lg bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                            {formatPrice(item.total_price)}
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFromCart(item.id)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      {index < items.length - 1 && (
                        <div className="h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />
                      )}
                    </div>
                  ))}
                </div>
              </GlassCard>

              {/* Customer Information Card */}
              <GlassCard>
                <SectionHeader 
                  icon={User} 
                  title="Customer Information" 
                  subtitle="How can we reach you?"
                />
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name" className="text-sm font-medium">Full Name *</Label>
                    <Input
                      id="name"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      onBlur={() => setTouchedFields(prev => ({ ...prev, customerName: true }))}
                      placeholder="John Doe"
                      maxLength={100}
                      className={cn(
                        "mt-1.5 bg-background/50 border-border/50 focus:border-primary/50",
                        (touchedFields.customerName || showAllErrors) && validationErrors.customerName && "border-destructive focus-visible:ring-destructive"
                      )}
                    />
                    {(touchedFields.customerName || showAllErrors) && validationErrors.customerName && (
                      <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {validationErrors.customerName}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="email" className="text-sm font-medium">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      onBlur={() => setTouchedFields(prev => ({ ...prev, customerEmail: true }))}
                      placeholder="john@example.com"
                      maxLength={255}
                      className={cn(
                        "mt-1.5 bg-background/50 border-border/50 focus:border-primary/50",
                        (touchedFields.customerEmail || showAllErrors) && validationErrors.customerEmail && "border-destructive focus-visible:ring-destructive"
                      )}
                    />
                    {(touchedFields.customerEmail || showAllErrors) && validationErrors.customerEmail && (
                      <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {validationErrors.customerEmail}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="contact" className="text-sm font-medium">Contact Details (Discord, Phone, etc.) *</Label>
                    <Input
                      id="contact"
                      value={contactDetails}
                      onChange={(e) => setContactDetails(e.target.value)}
                      onBlur={() => setTouchedFields(prev => ({ ...prev, contactDetails: true }))}
                      placeholder="Discord: username#1234 or Phone: +1234567890"
                      maxLength={200}
                      className={cn(
                        "mt-1.5 bg-background/50 border-border/50 focus:border-primary/50",
                        (touchedFields.contactDetails || showAllErrors) && validationErrors.contactDetails && "border-destructive focus-visible:ring-destructive"
                      )}
                    />
                    {(touchedFields.contactDetails || showAllErrors) && validationErrors.contactDetails && (
                      <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {validationErrors.contactDetails}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="country" className="text-sm font-medium">Country *</Label>
                    <div className="mt-1.5">
                      <CountrySelector
                        value={country}
                        onChange={(val) => {
                          setCountry(val);
                          setTouchedFields(prev => ({ ...prev, country: true }));
                        }}
                      />
                    </div>
                    {(touchedFields.country || showAllErrors) && validationErrors.country && (
                      <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {validationErrors.country}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="address" className="text-sm font-medium">Address (Optional)</Label>
                    <Textarea
                      id="address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Street address, city, state, postal code..."
                      rows={2}
                      maxLength={500}
                      className="mt-1.5 bg-background/50 border-border/50 focus:border-primary/50"
                    />
                  </div>
                  <div>
                    <Label htmlFor="notes" className="text-sm font-medium">Order Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Any special instructions..."
                      rows={3}
                      maxLength={1000}
                      className="mt-1.5 bg-background/50 border-border/50 focus:border-primary/50"
                    />
                  </div>
                </div>
              </GlassCard>

            </div>

            {/* Right Column - Order Summary */}
            <div>
              <GlassCard sticky>
                <SectionHeader 
                  icon={Receipt} 
                  title="Order Summary"
                />

                {/* Discount Code Section - Prominent Position */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Tag className="w-4 h-4 text-primary" />
                    <Label className="font-medium">Discount Code</Label>
                  </div>
                  {!appliedCoupon && !appliedReferral ? (
                    <div className="flex gap-2">
                      <Input
                        placeholder="Coupon or referral code"
                        value={discountCode}
                        onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                        onKeyPress={(e) => e.key === 'Enter' && handleApplyCode()}
                        className="bg-background/50 border-border/50 focus:border-primary/50 text-sm"
                      />
                      <Button 
                        onClick={handleApplyCode} 
                        disabled={isValidatingCode || !discountCode.trim()}
                        variant="solid"
                        size="sm"
                      >
                        {isValidatingCode ? "..." : "Apply"}
                      </Button>
                    </div>
                  ) : appliedCoupon ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2.5 bg-green-500/10 rounded-lg border border-green-500/20">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-green-400 text-sm">
                            {appliedCoupon.code}
                          </span>
                          <span className="text-xs text-green-400">
                            -{appliedCoupon.discount_percentage}%
                          </span>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={handleRemoveDiscount}
                          className="text-muted-foreground hover:text-foreground h-7 px-2 text-xs"
                        >
                          Remove
                        </Button>
                      </div>
                      
                      {/* Warning for non-applicable items */}
                      {appliedCoupon.non_applicable_items?.length > 0 && (
                        <div className="p-2.5 bg-amber-500/10 rounded-lg border border-amber-500/30">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                            <div className="text-xs">
                              <p className="font-medium text-amber-400">Some items not eligible:</p>
                              <ul className="mt-1 text-muted-foreground">
                                {appliedCoupon.non_applicable_items.map((item: any, idx: number) => (
                                  <li key={idx}>• {item.product_name}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : appliedReferral ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2.5 bg-purple-500/10 rounded-lg border border-purple-500/20">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-purple-400 text-sm">
                            {appliedReferral.referrer_name}
                          </span>
                          <span className="text-xs text-purple-400">
                            -{appliedReferral.discount_percentage}%
                          </span>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={handleRemoveDiscount}
                          className="text-muted-foreground hover:text-foreground h-7 px-2 text-xs"
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* Gradient divider */}
                <div className="h-px bg-gradient-to-r from-transparent via-border/50 to-transparent mb-6" />
                
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span>{formatPrice(cartTotal)}</span>
                  </div>

                  {appliedCoupon && (
                    <>
                      <div className="flex justify-between text-green-400">
                        <span>Coupon ({appliedCoupon.code})</span>
                        <span>-{formatPrice(appliedCoupon.discount_amount)}</span>
                      </div>
                    </>
                  )}

                  {appliedReferral && (
                    <>
                      <div className="flex justify-between text-purple-400">
                        <span>Referral ({appliedReferral.discount_percentage}%)</span>
                        <span>-{formatPrice(cartTotal * appliedReferral.discount_percentage / 100)}</span>
                      </div>
                    </>
                  )}

                  {/* Cashback Section */}
                  {cashbackBalance > 0 && (
                    <div className="py-3 border-t border-border/30 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setUseCashback(!useCashback)}>
                          <Checkbox
                            checked={useCashback}
                            onCheckedChange={(checked) => setUseCashback(checked === true)}
                          />
                          <Label className="cursor-pointer text-sm">Use Cashback Balance</Label>
                        </div>
                        <span className="text-green-400 font-medium text-sm">
                          {formatPrice(cashbackBalance)}
                        </span>
                      </div>
                      {useCashback && (
                        <div className="flex justify-between text-green-400 text-sm">
                          <span>Cashback Applied</span>
                          <span>-{formatPrice(Math.min(cashbackBalance, cartTotal - (appliedCoupon?.discount_amount || 0) - (appliedReferral ? cartTotal * appliedReferral.discount_percentage / 100 : 0)))}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Small Order Surcharge */}
                  {(() => {
                    const couponAmt = appliedCoupon?.discount_amount || 0;
                    const referralAmt = appliedReferral ? cartTotal * appliedReferral.discount_percentage / 100 : 0;
                    const afterDiscount = cartTotal - couponAmt - referralAmt;
                    const cashbackAmt = useCashback ? Math.min(cashbackBalance, afterDiscount) : 0;
                    const preSurcharge = afterDiscount - cashbackAmt;
                    
                    return preSurcharge < SMALL_ORDER_THRESHOLD && preSurcharge > 0 ? (
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Small Order Fee</span>
                        <span>+{formatPrice(SMALL_ORDER_SURCHARGE)}</span>
                      </div>
                    ) : null;
                  })()}

                  {/* Gradient divider */}
                  <div className="h-px bg-gradient-to-r from-transparent via-border/50 to-transparent my-2" />

                  {/* Total Display with Gradient Background */}
                  <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-purple-500/10 border border-primary/30">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold">Total to Pay</span>
                      <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                        {(() => {
                          const couponAmt = appliedCoupon?.discount_amount || 0;
                          const referralAmt = appliedReferral ? cartTotal * appliedReferral.discount_percentage / 100 : 0;
                          const afterDiscount = cartTotal - couponAmt - referralAmt;
                          const cashbackAmt = useCashback ? Math.min(cashbackBalance, afterDiscount) : 0;
                          const preSurcharge = afterDiscount - cashbackAmt;
                          const surcharge = preSurcharge < SMALL_ORDER_THRESHOLD ? SMALL_ORDER_SURCHARGE : 0;
                          return formatPrice(preSurcharge + surcharge);
                        })()}
                      </span>
                    </div>
                  </div>

                  {/* Cashback Earned */}
                  {(() => {
                    const couponAmt = appliedCoupon?.discount_amount || 0;
                    const referralAmt = appliedReferral ? cartTotal * appliedReferral.discount_percentage / 100 : 0;
                    const subtotal = cartTotal - couponAmt - referralAmt;
                    const cashbackUsed = useCashback ? Math.min(cashbackBalance, subtotal) : 0;
                    const finalTotal = subtotal - cashbackUsed;
                    
                    // Calculate cashback earned (Option B: based on subtotal after discount, before cashback used)
                    const estimatedCashbackEarned = (subtotal * currentTierPercentage) / 100;
                    
                    return estimatedCashbackEarned > 0 && finalTotal > 0 ? (
                      <div className="flex justify-between text-sm text-green-400 pt-2">
                        <span className="flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          You'll Earn ({currentTierPercentage}%)
                        </span>
                        <span>+{formatPrice(estimatedCashbackEarned)}</span>
                      </div>
                    ) : null;
                  })()}
                </div>

                {/* Payment Method Section */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <CreditCard className="w-4 h-4 text-primary" />
                    <Label className="font-medium">Payment Method</Label>
                  </div>
                  <RadioGroup value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                    {paymentMethods.map((method) => (
                      <div key={method.id} className="mb-3 p-4 rounded-xl bg-background/30 border border-border/30 hover:border-primary/30 transition-all">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <RadioGroupItem value={method.id} id={method.id} />
                            <Label htmlFor={method.id} className="cursor-pointer flex items-center gap-2">
                              {method.logo_url && (
                                <img src={method.logo_url} alt={method.name} className="h-6 w-auto" />
                              )}
                            </Label>
                          </div>
                          {method.fee_text && (
                            <span className="text-xs text-green-400 font-medium">{method.fee_text}</span>
                          )}
                        </div>
                        
                        {/* Payment Icons - Show for Stripe method */}
                        {method.type === 'stripe' && paymentIcons.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-border/20">
                            <div className="flex flex-wrap items-center justify-center gap-3 py-2 px-3 bg-background/30 rounded-lg">
                              {paymentIcons.map((icon) => (
                                <img
                                  key={icon.id}
                                  src={icon.icon_url}
                                  alt={icon.name}
                                  title={icon.name}
                                  className="h-6 w-auto object-contain hover:scale-110 transition-transform duration-200"
                                />
                              ))}
                            </div>
                            <p className="text-xs text-muted-foreground text-center mt-2">
                              All major cards & wallets accepted
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </RadioGroup>
                  {paymentMethods.length === 0 && (
                    <p className="text-sm text-muted-foreground">No payment methods available</p>
                  )}
                </div>

                {/* Validation Error Banner */}
                {showAllErrors && hasValidationErrors && (
                  <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <p className="text-sm text-destructive font-medium flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Please fill in all required fields to continue
                    </p>
                  </div>
                )}

                {/* Place Order Button */}
                <Button
                  className="w-full"
                  size="lg"
                  variant="solid"
                  onClick={handleCheckout}
                  disabled={loading || paymentMethods.length === 0}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 mr-2" />
                      Place Order
                    </>
                  )}
                </Button>
              </GlassCard>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Checkout;
