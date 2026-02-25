import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Trophy, Coins, TrendingUp, Gift, ArrowRight, Star, Shield, Clock, CheckCircle } from "lucide-react";
import SEO from "@/components/SEO";
import Navigation from "@/components/Navigation";
import Footer from "@/components/LazyFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "@/hooks/useAuthUser";
import { CashbackProgress } from "@/components/CashbackProgress";
import { signalPrerenderReady } from "@/lib/prerender";

interface CashbackTier {
  id: string;
  tier_name: string;
  min_spending: number;
  cashback_percentage: number;
  sort_order: number;
}

const toSafeNumber = (value: unknown, fallback = 0): number => {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const tierIcons = [
  { icon: "🥉", color: "from-amber-700 to-amber-600", border: "border-amber-700/50", bg: "bg-amber-900/20" },
  { icon: "🥈", color: "from-gray-400 to-gray-300", border: "border-gray-400/50", bg: "bg-gray-700/20" },
  { icon: "🥇", color: "from-yellow-500 to-yellow-400", border: "border-yellow-500/50", bg: "bg-yellow-900/20" },
  { icon: "💎", color: "from-purple-500 to-blue-500", border: "border-purple-500/50", bg: "bg-purple-900/20" },
];

const howItWorksSteps = [
  {
    number: "01",
    title: "Shop & Spend",
    description: "Browse our services and make purchases as you normally would.",
    icon: Coins,
    highlight: "Every order counts",
  },
  {
    number: "02",
    title: "Earn Cashback",
    description: "Automatically earn a percentage back on every completed order.",
    icon: TrendingUp,
    highlight: "Instant rewards",
  },
  {
    number: "03",
    title: "Level Up",
    description: "Spend more to unlock higher tiers with better cashback rates.",
    icon: Trophy,
    highlight: "Up to 5% back",
  },
  {
    number: "04",
    title: "Use Balance",
    description: "Apply your cashback balance to future orders as a discount.",
    icon: Gift,
    highlight: "Real savings",
  },
];

const faqs = [
  {
    question: "How do I start earning cashback?",
    answer:
      "Simply create an account and start shopping! Your cashback is automatically calculated and added to your balance after each completed order.",
  },
  {
    question: "When is cashback credited to my account?",
    answer:
      "Cashback is credited to your account once your order is marked as completed. This ensures fair rewards for legitimate purchases.",
  },
  {
    question: "How do I use my cashback balance?",
    answer:
      "During checkout, you'll see an option to apply your cashback balance. You can use all or part of it to reduce your order total.",
  },
  {
    question: "Do my tier levels expire?",
    answer: "Your tier is based on your total lifetime spending with us. Once you reach a tier, you keep it!",
  },
  {
    question: "Can I combine cashback with other discounts?",
    answer: "Yes! Cashback can be combined with coupon codes and referral discounts for maximum savings.",
  },
  {
    question: "Is there a minimum purchase to earn cashback?",
    answer:
      "Once you've spent $99 total (Bronze tier), you start earning 1% cashback on all future orders. Higher tiers unlock even better rates!",
  },
];

const Cashback = () => {
  const { user, isInitialized } = useAuthUser();

  const { data: tiers = [], isLoading } = useQuery({
    queryKey: ["cashback-tiers-public"],
    queryFn: async () => {
      // Use the SECURITY DEFINER function to safely fetch tier data
      const { data, error } = await supabase.rpc("get_public_cashback_tiers");

      if (error) throw error;
      if (!Array.isArray(data)) return [];
      return data
        .filter((tier) => tier && typeof tier === "object")
        .map((tier: any, index: number) => ({
          id: `tier-${index}`,
          tier_name: String(tier.tier_name || "").trim() || `Tier ${index + 1}`,
          min_spending: toSafeNumber(tier.min_spending, 0),
          cashback_percentage: toSafeNumber(tier.cashback_percentage, 0),
          sort_order: toSafeNumber(tier.sort_order, index),
        }))
        .sort((a, b) => a.sort_order - b.sort_order) as CashbackTier[];
    },
    staleTime: 10 * 60 * 1000,
  });

  // Signal to prerender services when page is ready
  useEffect(() => {
    if (!isLoading) {
      const timer = setTimeout(() => {
        signalPrerenderReady();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Cashback Rewards Program | Earn Up to 5% Back | misti.services"
        description="Join our cashback rewards program and earn up to 5% back on every order. Level up through tiers and save more with every purchase. Start earning today!"
        canonical="/cashback"
        keywords="cashback rewards, loyalty program, gaming rewards, earn cashback, misti cashback"
        structuredData={structuredData}
      />
      <Navigation />

      {/* Hero Section */}
      <section className="relative pt-24 pb-16 md:pt-32 md:pb-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-purple-600/15 to-background" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-500/10 via-transparent to-transparent" />

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 mb-6">
              <Trophy className="w-5 h-5 text-yellow-500" />
              <span className="text-sm font-medium">Loyalty Rewards Program</span>
            </div>

            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              Earn{" "}
              <span className="bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                Up to 5%
              </span>{" "}
              Cashback
              <br />
              on Every Order
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              The more you shop, the more you earn. Level up through our tier system and unlock higher cashback rates
              with every purchase.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4">
              {user ? (
                <Link to="/account">
                  <Button
                    size="lg"
                    className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold px-8"
                  >
                    View My Rewards
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
              ) : (
                <Link to="/auth">
                  <Button
                    size="lg"
                    className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold px-8"
                  >
                    Start Earning Now
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
              )}
              <Button asChild variant="outline" size="lg" className="border-border hover:border-primary">
                <a href="#tiers" aria-label="View cashback tiers section">
                  View Cashback Tiers
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Separator */}
      <div className="relative h-12 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-500/5 to-transparent" />
        <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-blue-500 to-purple-500" />
      </div>

      {/* Tier Cards Section */}
      <section id="tiers" className="py-16 md:py-24 container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
            Cashback Tiers
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Unlock higher cashback rates as you spend more. Your tier is based on your total lifetime spending.
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse bg-card/50 rounded-xl h-64" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {tiers.map((tier, index) => {
              const tierStyle = tierIcons[index] || tierIcons[0];
              return (
                <Card
                  key={tier.id}
                  className={`relative overflow-hidden border-2 ${tierStyle.border} ${tierStyle.bg} transition-all duration-300 hover:scale-105 hover:shadow-xl`}
                >
                  <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${tierStyle.color}`} />
                  <CardHeader className="text-center pb-2">
                    <div className="text-5xl mb-3">{tierStyle.icon}</div>
                    <CardTitle className="text-2xl font-bold">{tier.tier_name}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center space-y-4">
                    <div
                      className={`text-4xl font-bold bg-gradient-to-r ${tierStyle.color} bg-clip-text text-transparent`}
                    >
                      {tier.cashback_percentage}%
                    </div>
                    <p className="text-sm text-muted-foreground">Cashback Rate</p>
                    <div className="pt-4 border-t border-border">
                      <p className="text-sm text-muted-foreground">Minimum Spending</p>
                      <p className="text-lg font-semibold">${toSafeNumber(tier.min_spending, 0).toLocaleString()}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Example Earnings */}
        <div className="mt-12 bg-card/50 rounded-2xl p-6 md:p-8 border border-border">
          <h3 className="text-xl font-semibold mb-4 text-center">Example Earnings</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {tiers.map((tier, index) => {
              const tierStyle = tierIcons[index] || tierIcons[0];
              const exampleSpend = 100;
              const earnings = (exampleSpend * tier.cashback_percentage) / 100;
              return (
                <div key={tier.id} className="text-center p-4 rounded-xl bg-background/50">
                  <p className="text-sm text-muted-foreground mb-1">Spend $100 as {tier.tier_name}</p>
                  <p className={`text-2xl font-bold bg-gradient-to-r ${tierStyle.color} bg-clip-text text-transparent`}>
                    Earn ${earnings.toFixed(2)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Separator */}
      <div className="relative h-12 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/5 to-transparent" />
        <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-purple-500 to-blue-500" />
      </div>

      {/* How It Works Section */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-background to-card/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
              How It Works
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Earning cashback is simple. Just shop, earn, and save on your next purchase.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {howItWorksSteps.map((step, index) => (
              <div key={step.number} className="relative">
                {index < howItWorksSteps.length - 1 && (
                  <div className="hidden lg:block absolute top-16 left-1/2 w-full h-px bg-gradient-to-r from-blue-500/50 to-purple-500/50" />
                )}
                <Card className="relative z-10 text-center border-border hover:border-primary/50 transition-all duration-300 hover:-translate-y-2">
                  <CardContent className="pt-8 pb-6">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center border border-primary/30">
                      <step.icon className="w-8 h-8 text-primary" />
                    </div>
                    <div className="text-sm font-medium text-primary mb-2">Step {step.number}</div>
                    <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                    <p className="text-muted-foreground text-sm mb-4">{step.description}</p>
                    <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                      <CheckCircle className="w-3 h-3" />
                      {step.highlight}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Separator */}
      <div className="relative h-12 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-card/30 via-purple-500/5 to-background" />
        <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-blue-500 to-purple-500" />
      </div>

      {/* Benefits Section */}
      <section className="py-16 container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-border hover:border-primary/50 transition-colors">
            <CardContent className="pt-6 text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500/20 to-blue-500/10 flex items-center justify-center">
                <Shield className="w-6 h-6 text-blue-500" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Permanent Tiers</h3>
              <p className="text-muted-foreground text-sm">
                Once you unlock a tier, it's yours forever. Your lifetime spending determines your cashback rate.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border hover:border-primary/50 transition-colors">
            <CardContent className="pt-6 text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500/20 to-purple-500/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-purple-500" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Instant Rewards</h3>
              <p className="text-muted-foreground text-sm">
                Cashback is credited as soon as your order is completed. No waiting, no complicated claims.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border hover:border-primary/50 transition-colors">
            <CardContent className="pt-6 text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gradient-to-br from-yellow-500/20 to-yellow-500/10 flex items-center justify-center">
                <Star className="w-6 h-6 text-yellow-500" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Stack with Discounts</h3>
              <p className="text-muted-foreground text-sm">
                Combine cashback with coupons and referral discounts for maximum savings on every order.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* User Progress Section (Only for logged in users) */}
      {isInitialized && user && (
        <>
          {/* Separator */}
          <div className="relative h-12 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/5 to-transparent" />
            <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-purple-500 to-blue-500" />
          </div>

          <section className="py-16 container mx-auto px-4">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                Your Progress
              </h2>
              <p className="text-muted-foreground">Track your tier status and cashback balance</p>
            </div>
            <div className="max-w-4xl mx-auto">
              <CashbackProgress />
            </div>
          </section>
        </>
      )}

      {/* Separator */}
      <div className="relative h-12 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-500/5 to-transparent" />
        <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-blue-500 to-purple-500" />
      </div>

      {/* FAQ Section */}
      <section className="py-16 md:py-24 container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
              Frequently Asked Questions
            </h2>
            <p className="text-muted-foreground text-lg">Everything you need to know about our cashback program</p>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="border border-border rounded-xl px-6 data-[state=open]:border-primary/50 transition-colors"
              >
                <AccordionTrigger className="text-left hover:no-underline py-4">
                  <span className="font-medium">{faq.question}</span>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-4">{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Separator */}
      <div className="relative h-12 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/5 to-transparent" />
        <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-purple-500 to-blue-500" />
      </div>

      {/* CTA Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600/90 to-purple-600/90 p-8 md:p-12 text-center">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent" />

            <div className="relative z-10">
              <Trophy className="w-16 h-16 mx-auto mb-6 text-yellow-400" />
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Ready to Start Earning?</h2>
              <p className="text-lg text-white/80 mb-8 max-w-xl mx-auto">
                Join thousands of satisfied customers who save on every order with our cashback program.
              </p>

              {user ? (
                <Link to="/">
                  <Button size="lg" className="bg-white text-primary hover:bg-white/90 font-semibold px-8">
                    Start Shopping
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
              ) : (
                <Link to="/auth">
                  <Button size="lg" className="bg-white text-primary hover:bg-white/90 font-semibold px-8">
                    Create Free Account
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Cashback;
