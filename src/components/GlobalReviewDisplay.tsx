import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Star } from "lucide-react";
import { Helmet } from "react-helmet-async";

interface GlobalReviewConfig {
  average_rating: number;
  total_reviews: number;
  trustpilot_url: string | null;
  reviews_io_url: string | null;
  is_active: boolean;
}

const GlobalReviewDisplay = () => {
  const [config, setConfig] = useState<GlobalReviewConfig | null>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from("global_review_config")
        .select("*")
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;
      if (data) setConfig(data);
    } catch (error) {
      console.error("Error fetching review config:", error);
    }
  };

  if (!config || !config.is_active) {
    return null;
  }

  const renderStars = () => {
    const stars = [];
    const fullStars = Math.floor(config.average_rating);
    const hasHalfStar = config.average_rating % 1 >= 0.5;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Star 
          key={`full-${i}`} 
          className="w-5 h-5 fill-accent text-accent drop-shadow-[0_0_8px_rgba(76,201,240,0.3)]" 
        />
      );
    }

    if (hasHalfStar && fullStars < 5) {
      stars.push(
        <div key="half" className="relative">
          <Star className="w-5 h-5 text-accent/30" />
          <div className="absolute inset-0 overflow-hidden w-1/2">
            <Star className="w-5 h-5 fill-accent text-accent drop-shadow-[0_0_8px_rgba(76,201,240,0.3)]" />
          </div>
        </div>
      );
    }

    const emptyStars = 5 - stars.length;
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Star key={`empty-${i}`} className="w-5 h-5 text-accent/30" />
      );
    }

    return stars;
  };

  const reviewPlatformUrl = config.trustpilot_url || config.reviews_io_url;
  const platformName = config.trustpilot_url ? "Trustpilot" : config.reviews_io_url ? "Reviews.io" : "";

  return (
    <>
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "AggregateRating",
            "ratingValue": config.average_rating.toFixed(1),
            "reviewCount": config.total_reviews,
            "bestRating": "5",
            "worstRating": "1",
            "itemReviewed": {
              "@type": "Organization",
              "name": "misti.services"
            }
          })}
        </script>
      </Helmet>
      <div className="flex flex-col items-center gap-3 px-6 py-4 rounded-lg bg-card/50 border border-border/50 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            {renderStars()}
          </div>
          <span className="font-bold text-xl bg-gradient-to-r from-accent to-accent/70 bg-clip-text text-transparent">
            {config.average_rating.toFixed(1)}
          </span>
        </div>
        {reviewPlatformUrl && platformName ? (
          <a
            href={reviewPlatformUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground hover:text-accent transition-colors font-medium"
          >
            {config.total_reviews.toLocaleString()} reviews on {platformName}
          </a>
        ) : (
          <span className="text-sm text-muted-foreground font-medium">
            {config.total_reviews.toLocaleString()} reviews
          </span>
        )}
      </div>
    </>
  );
};

export default GlobalReviewDisplay;