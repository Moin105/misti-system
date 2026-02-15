import { Star, CheckCircle, ExternalLink, Quote } from "lucide-react";
import { format } from "date-fns";
import { memo } from "react";

interface ReviewCardProps {
  platformName: string;
  platformColor: string;
  authorName: string;
  rating: number;
  title: string;
  content: string;
  isVerified: boolean;
  postedAt: string;
  reviewUrl?: string;
}

const ReviewCard = memo(({
  platformName,
  platformColor,
  authorName,
  rating,
  title,
  content,
  isVerified,
  postedAt,
  reviewUrl,
}: ReviewCardProps) => {
  const handleClick = () => {
    if (reviewUrl) {
      window.open(reviewUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`group h-full bg-gradient-to-br from-card/90 to-card/70 backdrop-blur-sm rounded-2xl 
                  border border-border/50 p-6 relative overflow-hidden
                  transition-all duration-500 
                  hover:border-primary/40 hover:shadow-[0_0_40px_rgba(139,92,246,0.15)]
                  ${reviewUrl ? "cursor-pointer hover:-translate-y-2" : ""}`}
    >
      {/* Gradient accent line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-primary to-purple-500 
                      opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Corner accent */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-primary/10 to-transparent 
                      opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-bl-full" />
      
      {/* Decorative quote */}
      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-10 transition-opacity duration-500">
        <Quote className="w-12 h-12 text-primary" />
      </div>
      
      {/* Rating and verification */}
      <div className="flex items-center justify-between mb-5 relative z-10">
        <div className="flex items-center gap-3">
          <div className="flex gap-0.5">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`w-4 h-4 transition-all duration-300 ${
                  i < rating
                    ? "fill-yellow-400 text-yellow-400 group-hover:scale-110"
                    : "fill-muted/50 text-muted/50"
                }`}
                style={{ transitionDelay: `${i * 50}ms` }}
              />
            ))}
          </div>
          {isVerified && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
              <CheckCircle className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-medium text-primary">Verified</span>
            </div>
          )}
        </div>
        {reviewUrl && (
          <div className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center
                          group-hover:bg-primary/20 transition-colors duration-300">
            <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors duration-300" />
          </div>
        )}
      </div>

      {/* Title */}
      <h3 className="font-bold text-lg mb-3 line-clamp-2 text-foreground group-hover:text-primary/90 transition-colors duration-300">
        {title}
      </h3>

      {/* Content */}
      <p className="text-sm text-muted-foreground mb-5 line-clamp-3 leading-relaxed">
        "{content}"
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-border/50 relative z-10">
        <div className="flex items-center gap-3">
          {/* Avatar placeholder */}
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 
                          flex items-center justify-center border border-primary/20
                          group-hover:border-primary/40 transition-colors duration-300">
            <span className="text-sm font-bold text-primary">
              {authorName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{authorName}</p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(postedAt), "MMM d, yyyy")}
            </p>
          </div>
        </div>
        
        {/* Platform badge */}
        <div
          className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-300
                     group-hover:scale-105"
          style={{ 
            backgroundColor: `${platformColor}15`,
            color: platformColor,
            borderColor: `${platformColor}30`,
            borderWidth: '1px'
          }}
        >
          {platformName}
        </div>
      </div>
    </div>
  );
});

ReviewCard.displayName = 'ReviewCard';

export default ReviewCard;
