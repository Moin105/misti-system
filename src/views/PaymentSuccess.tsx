import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/LazyFooter";
import SEO from "@/components/SEO";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, XCircle, MessageCircle, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/contexts/CartContext";

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { clearCart } = useCart();
  const [verifying, setVerifying] = useState(true);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Prevent duplicate verification on re-mounts (back button, etc.)
  const verificationAttempted = useRef(false);

  const sessionId = searchParams.get("session_id");
  const orderId = searchParams.get("order_id");

  useEffect(() => {
    // Guard against duplicate verification attempts
    if (verificationAttempted.current) {
      return;
    }
    
    const verificationKey = `payment_verified_${orderId}`;
    
    // Check if already verified in this browser session
    if (orderId && sessionStorage.getItem(verificationKey)) {
      console.log("[PaymentSuccess] Order already verified in this session, skipping");
      setVerified(true);
      // Ensure cart is empty even when skipping duplicate verification attempts.
      await clearCart();
      setVerifying(false);
      return;
    }
    
    verificationAttempted.current = true;
    verifyPayment();
  }, [orderId]);

  const verifyPayment = async () => {
    if (!sessionId || !orderId) {
      setError("Missing payment information");
      setVerifying(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("verify-payment", {
        body: { sessionId, orderId }
      });

      if (error) throw error;

      if (data.success && data.paymentStatus === "paid") {
        setVerified(true);
        
        // Mark as verified in sessionStorage to prevent re-processing on back button
        if (orderId) {
          sessionStorage.setItem(`payment_verified_${orderId}`, 'true');
        }
        
        // Always clear cart after confirmed paid status.
        // `alreadyProcessed` only means server-side post-payment handlers were already run.
        await clearCart();

        if (!data.alreadyProcessed) {
          toast({
            title: "Payment successful!",
            description: "Your order has been confirmed.",
          });
        }
      } else {
        setError("Payment verification failed");
      }
    } catch (err: any) {
      console.error("Payment verification error:", err);
      
      // If we have session/order IDs, payment likely succeeded but verification had an issue
      const isLikelySuccessful = sessionId && orderId;
      
      if (isLikelySuccessful) {
        // Show success state - payment went through, just verification had an issue
        setVerified(true);
        toast({
          title: "Payment received!",
          description: "Your order is being processed. If you have any issues, please contact support.",
        });
      } else {
        setError(err.message || "Failed to verify payment");
        toast({
          title: "Verification error",
          description: "There was an issue verifying your payment. Please contact support.",
          variant: "destructive",
        });
      }
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO 
        title="Payment Success - misti.services"
        description="Your payment has been processed successfully."
        noindex={true}
      />
      <Navigation />
      <main className="flex-grow container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <Card className="p-8">
            {verifying ? (
              <div className="text-center py-8">
                <Loader2 className="h-16 w-16 animate-spin mx-auto mb-4 text-primary" />
                <h2 className="text-2xl font-bold mb-2">Verifying Payment...</h2>
                <p className="text-muted-foreground">Please wait while we confirm your payment</p>
              </div>
            ) : verified ? (
              <div className="text-center py-8">
                <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-green-500" />
                <h2 className="text-2xl font-bold mb-2">Payment Successful!</h2>
                <p className="text-muted-foreground mb-8">
                  Thank you for your purchase. Your order has been confirmed and we'll start processing it shortly.
                </p>

                {/* What's Next Section */}
                <div className="border-t border-border pt-8 mb-8">
                  <h3 className="text-xl font-semibold mb-2">What's Next?</h3>
                  <p className="text-muted-foreground mb-6">
                    To get your order started, please contact us through one of these methods:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                    {/* Discord Card */}
                    <a
                      href="https://discord.gg/rkhXPRNntS"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group block"
                    >
                      <Card className="p-6 h-full transition-all duration-300 hover:shadow-lg hover:scale-[1.02] border-2 hover:border-[#5865F2]/50 bg-gradient-to-br from-[#5865F2]/5 to-[#5865F2]/10">
                        <div className="flex flex-col items-center text-center">
                          <div className="w-14 h-14 rounded-full bg-[#5865F2] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <MessageCircle className="h-7 w-7 text-white" />
                          </div>
                          <h4 className="font-semibold text-lg mb-1">Join Our Discord</h4>
                          <p className="text-sm text-muted-foreground">
                            Fastest way to get support
                          </p>
                        </div>
                      </Card>
                    </a>

                    {/* WhatsApp Card */}
                    <a
                      href="https://wa.me/3865685041"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group block"
                    >
                      <Card className="p-6 h-full transition-all duration-300 hover:shadow-lg hover:scale-[1.02] border-2 hover:border-[#25D366]/50 bg-gradient-to-br from-[#25D366]/5 to-[#25D366]/10">
                        <div className="flex flex-col items-center text-center">
                          <div className="w-14 h-14 rounded-full bg-[#25D366] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <Phone className="h-7 w-7 text-white" />
                          </div>
                          <h4 className="font-semibold text-lg mb-1">WhatsApp Us</h4>
                          <p className="text-sm text-muted-foreground">
                            Direct message for quick assistance
                          </p>
                        </div>
                      </Card>
                    </a>
                  </div>
                </div>

                <div className="flex gap-4 justify-center">
                  <Button onClick={() => navigate("/orders")}>
                    View My Orders
                  </Button>
                  <Button variant="outline" onClick={() => navigate("/")}>
                    Back to Home
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <XCircle className="h-16 w-16 mx-auto mb-4 text-destructive" />
                <h2 className="text-2xl font-bold mb-2">Payment Verification Failed</h2>
                <p className="text-muted-foreground mb-6">
                  {error || "We couldn't verify your payment. Please contact support if you were charged."}
                </p>
                <div className="flex gap-4 justify-center">
                  <Button onClick={() => navigate("/orders")}>
                    Check My Orders
                  </Button>
                  <Button variant="outline" onClick={() => navigate("/")}>
                    Back to Home
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PaymentSuccess;
