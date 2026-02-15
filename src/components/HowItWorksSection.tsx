import { useState } from "react";
import { Rocket, ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { criticalIcons } from "@/lib/icons/critical";
import DynamicIcon from "@/components/DynamicIcon";

const HowItWorksSection = () => {
  const [activeStep, setActiveStep] = useState(0);

  const { data: steps = [] } = useQuery({
    queryKey: ['how-it-works-steps'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("how_it_works_steps")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");

      if (error) throw error;
      return data || [];
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  return (
    <section className="py-16 md:py-24 relative overflow-hidden bg-gradient-to-b from-primary/10 via-purple-600/5 to-transparent">
      {/* Decorative blurred orbs - hidden on mobile for performance */}
      <div className="absolute top-20 right-1/4 w-64 h-64 bg-primary/20 rounded-full blur-3xl hidden md:block" style={{ willChange: 'opacity' }} />
      <div className="absolute bottom-20 left-1/4 w-48 h-48 bg-purple-500/15 rounded-full blur-3xl hidden md:block" style={{ willChange: 'opacity' }} />
      
      {/* Radial gradient overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Unified container with backdrop */}
        <div className="relative rounded-3xl bg-card/40 backdrop-blur-sm border border-border/30 p-8 md:p-12">
          {/* Gradient top border accent */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
          
          {/* Header */}
          <div className="text-center mb-10 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-4">
              <Rocket className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">How It Works</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              <span className="bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">Simple, Fast & Secure</span>
              {" "}
              <span className="text-foreground">Process</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Get started in minutes with our streamlined ordering process
            </p>
          </div>

          {/* Process indicator divider */}
          <div className="flex items-center justify-center gap-4 mb-10">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-border" />
            <div className="flex items-center gap-2">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <Badge 
                    variant="outline" 
                    className={`text-xs px-2 py-0.5 transition-all duration-300 ${
                      activeStep === index 
                        ? "bg-primary/20 border-primary/40 text-primary" 
                        : "bg-muted/50 border-border/50 text-muted-foreground"
                    }`}
                  >
                    Step {step.number}
                  </Badge>
                  {index < steps.length - 1 && (
                    <ArrowRight className="w-3 h-3 mx-1 text-muted-foreground/50" />
                  )}
                </div>
              ))}
            </div>
            <div className="flex-1 h-px bg-gradient-to-l from-transparent via-border to-border" />
          </div>

          {/* Steps Grid - 2x2 on desktop */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className="group cursor-pointer transition-all duration-300 animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
                onMouseEnter={() => setActiveStep(index)}
              >
                <div
                  className={`relative flex gap-4 p-5 rounded-xl transition-all duration-300 bg-background/50 border border-border/30 hover:border-primary/30 hover:bg-background/80 ${
                    activeStep === index ? "border-primary/40 bg-background/70" : ""
                  }`}
                >
                  {/* Left gradient accent bar */}
                  <div className={`absolute left-0 top-4 bottom-4 w-1 rounded-full bg-gradient-to-b transition-all duration-300 ${
                    activeStep === index 
                      ? "from-primary via-purple-500 to-primary opacity-100" 
                      : "from-primary/30 via-purple-500/30 to-primary/30 opacity-50 group-hover:opacity-80"
                  }`} />

                  {/* Icon container */}
                  <div className="flex-shrink-0 ml-2">
                    <div
                      className={`relative w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 bg-gradient-to-br from-primary/15 to-purple-500/15 border border-primary/20 ${
                        activeStep === index ? "from-primary/25 to-purple-500/25 border-primary/40 shadow-lg shadow-primary/10" : ""
                      }`}
                    >
                      {criticalIcons[step.icon_name] ? (
                        (() => {
                          const Icon = criticalIcons[step.icon_name];
                          return <Icon className={`w-6 h-6 transition-all duration-300 ${
                            activeStep === index ? "text-primary" : "text-primary/70"
                          }`} strokeWidth={1.5} />;
                        })()
                      ) : (
                        <DynamicIcon 
                          name={step.icon_name} 
                          className={`w-6 h-6 transition-all duration-300 ${
                            activeStep === index ? "text-primary" : "text-primary/70"
                          }`} 
                          strokeWidth={1.5} 
                        />
                      )}
                      <span className={`absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                        activeStep === index
                          ? "bg-gradient-to-br from-primary to-purple-500 text-primary-foreground shadow-md"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {step.number}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <h3 className={`text-base font-semibold transition-colors duration-300 ${
                        activeStep === index ? "text-foreground" : "text-foreground/90"
                      }`}>
                        {step.title}
                      </h3>
                      {activeStep === index && step.highlight && (
                        <Badge className="text-xs bg-primary/20 text-primary border-primary/30 px-1.5 py-0">
                          {step.highlight}
                        </Badge>
                      )}
                    </div>
                    <p className={`text-sm leading-relaxed transition-all duration-300 ${
                      activeStep === index ? "text-muted-foreground" : "text-muted-foreground/80"
                    }`}>
                      {step.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
