import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DynamicIcon } from "@/components/DynamicIcon";
import { criticalIcons } from "@/lib/icons/critical";

interface WhyWeFeature {
  id: string;
  title: string;
  description: string;
  icon_name: string;
  sort_order: number;
  is_active: boolean;
}

const FeaturesSection = () => {
  const { data: features = [], isLoading: loading } = useQuery({
    queryKey: ["why-we-features"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("why_we_features")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");

      if (error) throw error;
      return data || [];
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  if (loading) {
    return (
      <section className="py-16 md:py-20 bg-gradient-to-b from-primary/5 via-purple-600/5 to-transparent">
        <div className="container mx-auto px-4 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </section>
    );
  }

  return (
    <section
      className="py-20 md:py-28 relative overflow-hidden bg-gradient-to-b from-primary/10 via-purple-600/5 to-transparent"
      aria-labelledby="why-choose-us-heading"
    >
      {/* Decorative background elements - hidden on mobile for performance */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl hidden md:block will-change-opacity" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl hidden md:block will-change-opacity" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Main content wrapper */}
        <div className="max-w-7xl mx-auto">
          {/* Header section with SEO-rich content */}
          <header className="text-center mb-12 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-primary/20 to-purple-500/20 border border-primary/30 mb-6">
              <DynamicIcon name="Star" className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                Why Choose Us
              </span>
            </div>

            <h2 id="why-choose-us-heading" className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
              <span className="text-foreground">Your Trusted Partner for</span>
              <br />
              <span className="bg-gradient-to-r from-primary via-purple-500 to-primary bg-clip-text text-transparent">
                Professional Game Boosting
              </span>
            </h2>
          </header>

          {/* Integrated content container */}
          <div className="relative rounded-3xl bg-card/40 backdrop-blur-sm border border-border/30 p-6 md:p-10 lg:p-12">
            {/* Gradient top border accent */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />

            {/* SEO-rich content section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 mb-10">
              {/* Left column - Main SEO content */}
              <article className="space-y-5 animate-fade-in">
                <div className="prose prose-lg max-w-none">
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    Since 2013, <strong className="text-foreground">misti.services</strong> has been the go-to
                    destination for gamers seeking premium{" "}
                    <strong className="text-foreground">game boosting services</strong>,{" "}
                    <strong className="text-foreground">WoW boost</strong> solutions, and professional{" "}
                    <strong className="text-foreground">game carry</strong> assistance. With more than{" "}
                    <strong className="text-foreground">8,000 satisfied customers</strong>, we've established ourselves
                    as industry leaders in delivering fast, secure, and reliable gaming services.
                  </p>

                  <p className="text-muted-foreground leading-relaxed">
                    Whether you're looking to buy <strong className="text-foreground">WoW gold</strong>, need expert{" "}
                    <strong className="text-foreground">power leveling</strong> for your characters, or want
                    professional assistance with challenging <strong className="text-foreground">raid carries</strong>{" "}
                    and <strong className="text-foreground">mythic dungeon runs</strong>, our team of skilled players is
                    ready to help you achieve your gaming goals. We specialize in{" "}
                    <strong className="text-foreground">games boosting</strong> across all major titles including World
                    of Warcraft, Diablo 4, Destiny 2, and many more popular games.
                  </p>

                  <p className="text-muted-foreground leading-relaxed">
                    Our comprehensive <strong className="text-foreground">boosting services</strong> cover everything
                    from <strong className="text-foreground">character leveling</strong> and{" "}
                    <strong className="text-foreground">rank boost</strong> to{" "}
                    <strong className="text-foreground">PvP boosts</strong>, achievement hunting, and exclusive mount
                    farming. Each service is delivered by verified professional players who understand the importance of
                    account security and customer satisfaction.
                  </p>
                </div>
              </article>

              {/* Right column - Additional SEO content */}
              <article className="space-y-5 animate-fade-in animation-delay-100">
                <div className="prose prose-lg max-w-none">
                  <p className="text-muted-foreground leading-relaxed">
                    What sets our <strong className="text-foreground">game boosting</strong> services apart is our
                    unwavering commitment to quality and transparency. Every{" "}
                    <strong className="text-foreground">boost service</strong> we offer comes with real-time progress
                    tracking, secure payment options, and dedicated customer support available around the clock. Our
                    boosters are carefully vetted professionals who treat your account with the utmost care and
                    confidentiality.
                  </p>

                  <p className="text-muted-foreground leading-relaxed">
                    For World of Warcraft enthusiasts, our <strong className="text-foreground">WoW boosting</strong>{" "}
                    catalog includes everything from <strong className="text-foreground">Mythic+ carries</strong> and{" "}
                    <strong className="text-foreground">raid boosts</strong> to{" "}
                    <strong className="text-foreground">arena rating</strong> services and{" "}
                    <strong className="text-foreground">glory achievement</strong> runs. Need to gear up quickly? Our{" "}
                    <strong className="text-foreground">WoW power leveling</strong> and gear farming services will have
                    your character raid-ready in no time.
                  </p>

                  <p className="text-muted-foreground leading-relaxed">
                    Beyond WoW, we offer premium <strong className="text-foreground">Diablo 4 boosting</strong>,{" "}
                    <strong className="text-foreground">Destiny 2 carries</strong>, and services for other top-tier
                    games. Our <strong className="text-foreground">professional gaming services</strong> are designed to
                    help you skip the grind and enjoy the content you love most. With competitive pricing, a generous
                    cashback program, and a proven track record of excellence, misti.services remains the trusted choice
                    for gamers worldwide seeking reliable <strong className="text-foreground">game carry</strong> and{" "}
                    <strong className="text-foreground">boosting solutions</strong>.
                  </p>
                </div>
              </article>
            </div>

            {/* Integrated divider with trust indicators */}
            <div className="relative flex items-center justify-center gap-6 py-6 mb-8">
              {/* Left gradient line */}
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-primary/30" />

              {/* Trust badges - centered */}
              <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
                  <DynamicIcon name="Trophy" className="w-4 h-4 text-primary" />
                  <span className="text-xs font-semibold text-foreground whitespace-nowrap">Since 2013</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
                  <DynamicIcon name="Users" className="w-4 h-4 text-primary" />
                  <span className="text-xs font-semibold text-foreground whitespace-nowrap">8,000+ Gamers</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
                  <DynamicIcon name="ShieldCheck" className="w-4 h-4 text-primary" />
                  <span className="text-xs font-semibold text-foreground whitespace-nowrap">100% Secure</span>
                </div>
              </div>

              {/* Right gradient line */}
              <div className="flex-1 h-px bg-gradient-to-l from-transparent via-border to-purple-500/30" />
            </div>

            {/* Features grid - integrated style */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in animation-delay-200">
              {features.map((feature, index) => {
                // Use critical icon if available, otherwise DynamicIcon handles lazy loading
                const CriticalIcon = criticalIcons[feature.icon_name];
                return (
                  <article key={feature.id} className={`relative group animation-delay-${(index + 1) * 100}`}>
                    {/* Feature item with left accent */}
                    <div className="relative pl-5 py-4 pr-4 rounded-xl bg-background/50 border border-border/30 hover:border-primary/30 hover:bg-background/80 transition-all duration-300">
                      {/* Left gradient accent bar */}
                      <div className="absolute left-0 top-3 bottom-3 w-1 rounded-full bg-gradient-to-b from-primary via-purple-500 to-primary opacity-60 group-hover:opacity-100 transition-opacity" />

                      {/* Icon and title row */}
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/15 to-purple-500/15 border border-primary/20 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:border-primary/40 transition-all duration-300">
                          {CriticalIcon ? (
                            <CriticalIcon className="w-5 h-5 text-primary" strokeWidth={2} />
                          ) : (
                            <DynamicIcon name={feature.icon_name} className="w-5 h-5 text-primary" strokeWidth={2} />
                          )}
                        </div>
                        <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors leading-tight">
                          {feature.title}
                        </h3>
                      </div>

                      {/* Description */}
                      <p className="text-sm text-muted-foreground leading-relaxed pl-13">{feature.description}</p>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* CTA section at bottom */}
            <div className="mt-8 p-5 rounded-xl bg-gradient-to-r from-primary/10 via-purple-500/10 to-primary/10 border border-primary/20 text-center">
              <h3 className="text-lg font-bold text-foreground mb-1">Ready to Level Up?</h3>
              <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
                Browse our extensive catalog of <strong className="text-foreground">boost services</strong> and join
                thousands of satisfied gamers who trust misti.services for all their gaming needs.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
