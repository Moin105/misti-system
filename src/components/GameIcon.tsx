import { memo, useState } from "react";
import { getOptimizedIconUrl } from "@/lib/imageOptimization";

/**
 * GameIcon - Optimized icon component for game cards on landing pages
 * 
 * Uses Supabase image transformation to serve icons at 2x display size
 * (160px for 80px display) with quality reduction. This cuts each icon
 * from ~200 KB to ~15-30 KB while preserving visual quality at display size.
 */

interface GameIconProps {
  /** Icon URL - transformed via Supabase image API */
  src: string | null | undefined;
  /** Alt text for accessibility */
  alt: string;
  /** Display size in pixels (default: 80) */
  size?: number;
  /** Set true for above-fold icons to enable eager loading + high priority */
  priority?: boolean;
  /** Additional CSS classes */
  className?: string;
}

const GameIcon = memo(({ 
  src, 
  alt, 
  size = 80, 
  priority = false, 
  className = "" 
}: GameIconProps) => {
  if (!src) {
    // Fallback gradient for missing icons
    return (
      <div 
        className={`rounded-full bg-gradient-to-br from-blue-500/30 to-purple-500/30 ${className}`}
        style={{ width: size * 0.8, height: size * 0.8 }}
        role="img"
        aria-label={alt}
      />
    );
  }

  const optimizedSrc = getOptimizedIconUrl(src, size);
  const [imageError, setImageError] = useState(false);
  
  // Fallback to original URL if optimized URL fails
  const displaySrc = imageError ? src : optimizedSrc;

  return (
    <img 
      src={displaySrc}
      alt={alt}
      width={size}
      height={size}
      className={`w-full h-full object-contain ${className}`}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
      onError={() => {
        // If optimized URL fails, try original URL
        if (!imageError && optimizedSrc !== src) {
          setImageError(true);
          // Disable transformation globally if it consistently fails
          if (typeof window !== 'undefined') {
            console.warn('Image transformation failed, falling back to original URL');
            // Optionally disable transformation after multiple failures
            const failureCount = parseInt(localStorage.getItem('image-transformation-failures') || '0') + 1;
            localStorage.setItem('image-transformation-failures', String(failureCount));
            if (failureCount >= 3) {
              localStorage.setItem('disable-image-transformation', 'true');
              console.warn('Image transformation disabled due to repeated failures');
            }
          }
        }
      }}
    />
  );
});

GameIcon.displayName = 'GameIcon';

export default GameIcon;
