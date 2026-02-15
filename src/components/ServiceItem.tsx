import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";


import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { prefetchProductDetail } from "@/hooks/useProductDetail";

interface ServiceItemProps {
  title: string;
  image: string;
  features: string[];
  price: string;
  badge?: string;
  gradient?: string;
  slug?: string;
  /** Optional: game slug for prefetching */
  gameSlug?: string;
  /** Optional: category slug for prefetching */
  categorySlug?: string;
  /** Optional: product slug for prefetching */
  productSlug?: string;
}

const ServiceItem = ({
  title,
  image,
  features,
  price,
  badge,
  gradient = "from-background/40 to-background/60",
  slug = "/product/mythic-plus-boost",
  gameSlug,
  categorySlug,
  productSlug,
}: ServiceItemProps) => {
  const queryClient = useQueryClient();
  const [imageLoaded, setImageLoaded] = useState(false);

  // Prefetch product detail on hover for instant navigation
  const handleMouseEnter = useCallback(() => {
    if (gameSlug && categorySlug && productSlug) {
      prefetchProductDetail(queryClient, gameSlug, categorySlug, productSlug);
    }
  }, [queryClient, gameSlug, categorySlug, productSlug]);

  return (
    <Link to={slug} className="block" onMouseEnter={handleMouseEnter}>
      <Card className="group relative overflow-hidden h-72 border-border/40 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/20 transition-all duration-300 cursor-pointer">
        {/* Gradient top accent on hover */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/0 group-hover:via-primary/50 to-transparent transition-all duration-300 z-10" />
        
        {/* Full-bleed image */}
        {!imageLoaded && (
          <div className="absolute inset-0 bg-gradient-to-br from-muted/50 to-muted/30 animate-pulse" />
        )}
        <img
          src={image}
          alt={`${title} - Professional gaming boost service`}
          className={`absolute inset-0 w-full h-full object-cover object-center transition-all duration-500 group-hover:scale-110 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          loading="lazy"
          decoding="async"
          onLoad={() => setImageLoaded(true)}
        />

        {/* Badge */}
        {badge && (
          <Badge className="absolute top-3 right-3 bg-gradient-to-r from-red-500 to-orange-500 text-white border-0 shadow-lg z-10">
            {badge}
          </Badge>
        )}

        {/* Bottom gradient overlay for text legibility */}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        
        {/* Content positioned at bottom */}
        <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col">
          {/* Title floats above the ribbon */}
          <div className="px-5 pb-2">
            <h3 className="text-xl font-bold text-white drop-shadow-lg line-clamp-2">{title}</h3>
          </div>
          
          {/* Price ribbon - always anchored to bottom */}
          <div className="flex items-center justify-between bg-black/40 backdrop-blur-sm px-5 py-3">
            <div>
              <span className="text-xs text-white/70">from</span>
              <p className="text-xl font-bold text-white">{price}</p>
            </div>
            
            {/* Order button - fades in on hover */}
            <Button
              className="bg-white/10 backdrop-blur-md border border-white/20 text-white text-sm
                         hover:bg-white/20 hover:border-white/40
                         opacity-0 group-hover:opacity-100 
                         translate-y-2 group-hover:translate-y-0
                         transition-all duration-300"
              size="sm"
            >
              Order now →
            </Button>
          </div>
        </div>
      </Card>
    </Link>
  );
};

export default ServiceItem;
