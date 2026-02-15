import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel";
import ReviewCard from "@/components/ReviewCard";
import { MessageSquare, ExternalLink, Quote, Sparkles } from "lucide-react";

const TestimonialsSection = () => {
  const [activeTab, setActiveTab] = useState("all");

  const { data: platforms } = useQuery({
    queryKey: ["review-platforms"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("review_platforms")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    staleTime: 10 * 60 * 1000,
  });

  const { data: reviews } = useQuery({
    queryKey: ["reviews", activeTab],
    queryFn: async () => {
      let query = supabase
        .from("reviews")
        .select(`
          *,
          review_platforms (name, primary_color, url)
        `)
        .eq("is_active", true)
        .order("posted_at", { ascending: false });

      if (activeTab !== "all") {
        const platform = platforms?.find((p) => p.slug === activeTab);
        if (platform) {
          query = query.eq("platform_id", platform.id);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!platforms,
    staleTime: 2 * 60 * 1000,
  });

  return (
    <section className="py-16 md:py-24 relative overflow-hidden">
      {/* Enhanced background with mesh gradient - animated orbs hidden on mobile for performance */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[120px] hidden md:block animate-pulse [animation-duration:4s]" style={{ willChange: 'opacity' }} />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[120px] hidden md:block animate-pulse [animation-duration:4s] [animation-delay:1s]" style={{ willChange: 'opacity' }} />
      </div>
      
      {/* Decorative quote marks - hidden on mobile */}
      <div className="absolute top-20 left-10 opacity-5 hidden md:block">
        <Quote className="w-32 h-32 text-primary" />
      </div>
      <div className="absolute bottom-20 right-10 opacity-5 rotate-180 hidden md:block">
        <Quote className="w-32 h-32 text-primary" />
      </div>
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Enhanced header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-primary/20 to-purple-500/20 border border-primary/30 mb-6 backdrop-blur-sm">
            <Sparkles className="w-4 h-4 text-primary animate-pulse" />
            <span className="text-sm font-semibold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">Customer Reviews</span>
            <MessageSquare className="w-4 h-4 text-purple-400" />
          </div>
          <h2 className="text-3xl md:text-5xl font-bold mb-5">
            <span className="text-foreground">What Our </span>
            <span className="bg-gradient-to-r from-blue-400 via-primary to-purple-500 bg-clip-text text-transparent">Customers Say</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
            Join thousands of satisfied gamers who trust us for their gaming needs
          </p>
        </div>

        {/* Enhanced tabs with glassmorphism */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex justify-center mb-10">
            <TabsList className="inline-flex gap-2 p-2 bg-card/50 backdrop-blur-md border border-border/50 rounded-2xl shadow-lg">
              <TabsTrigger 
                value="all"
                className="px-5 py-2.5 rounded-xl font-medium transition-all duration-300 
                           data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-purple-500 
                           data-[state=active]:text-white data-[state=active]:shadow-[0_0_20px_rgba(139,92,246,0.4)]
                           data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground data-[state=inactive]:hover:bg-muted/50"
              >
                All Reviews
              </TabsTrigger>
              {platforms?.map((platform) => (
                <TabsTrigger 
                  key={platform.slug} 
                  value={platform.slug}
                  className="px-5 py-2.5 rounded-xl font-medium transition-all duration-300 
                             data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-purple-500 
                             data-[state=active]:text-white data-[state=active]:shadow-[0_0_20px_rgba(139,92,246,0.4)]
                             data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground data-[state=inactive]:hover:bg-muted/50"
                >
                  {platform.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value={activeTab} className="mt-0">
            {reviews && reviews.length > 0 ? (
              <div className="relative group">
                <Carousel
                  opts={{
                    align: "start",
                    loop: true,
                  }}
                  className="w-full"
                >
                  <CarouselContent className="-ml-4 md:-ml-6">
                    {reviews.map((review: any, index: number) => (
                      <CarouselItem 
                        key={review.id} 
                        className="pl-4 md:pl-6 basis-full sm:basis-1/2 lg:basis-1/3"
                      >
                        <div
                          className="animate-fade-in h-full"
                          style={{ animationDelay: `${index * 0.08}s` }}
                        >
                          <ReviewCard
                            platformName={review.review_platforms.name}
                            platformColor={review.review_platforms.primary_color}
                            authorName={review.author_name}
                            rating={review.rating}
                            title={review.title}
                            content={review.content}
                            isVerified={review.is_verified}
                            postedAt={review.posted_at}
                            reviewUrl={review.review_url}
                          />
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  
                  {/* Enhanced navigation buttons */}
                  <CarouselPrevious className="-left-2 md:-left-5 w-12 h-12 bg-card/80 backdrop-blur-md border-border/50 
                                              opacity-0 group-hover:opacity-100 transition-all duration-300
                                              hover:bg-primary hover:text-white hover:border-primary hover:scale-110
                                              hover:shadow-[0_0_25px_rgba(139,92,246,0.4)]" />
                  <CarouselNext className="-right-2 md:-right-5 w-12 h-12 bg-card/80 backdrop-blur-md border-border/50 
                                           opacity-0 group-hover:opacity-100 transition-all duration-300
                                           hover:bg-primary hover:text-white hover:border-primary hover:scale-110
                                           hover:shadow-[0_0_25px_rgba(139,92,246,0.4)]" />
                </Carousel>
                
                {/* Carousel indicators dots */}
                <div className="flex justify-center gap-2 mt-8">
                  {reviews.slice(0, Math.min(5, Math.ceil(reviews.length / 3))).map((_: any, i: number) => (
                    <div 
                      key={i}
                      className="w-2 h-2 rounded-full bg-border transition-all duration-300 hover:bg-primary hover:scale-125"
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
                  <MessageSquare className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground text-lg">No reviews available yet</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Enhanced platform links */}
        {platforms && platforms.length > 0 && (
          <div className="flex flex-wrap justify-center gap-4 mt-12">
            {platforms.map((platform) => (
              <a
                key={platform.id}
                href={platform.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2 px-5 py-2.5 rounded-xl
                           bg-card/50 backdrop-blur-sm border border-border/50
                           text-sm text-muted-foreground hover:text-primary
                           hover:border-primary/40 hover:shadow-[0_0_20px_rgba(139,92,246,0.15)]
                           transition-all duration-300"
              >
                View all {platform.name} reviews
                <ExternalLink className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </a>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default TestimonialsSection;
