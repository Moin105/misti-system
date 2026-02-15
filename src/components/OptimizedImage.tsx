import { memo } from 'react';
import { getOptimizedIconUrl, getOptimizedCoverUrl } from '@/lib/imageOptimization';
import { cn } from '@/lib/utils';

interface OptimizedImageProps {
  src: string | null | undefined;
  alt: string;
  width: number;
  height: number;
  /** How the image should fit its container (CSS object-fit) */
  fit?: 'contain' | 'cover';
  /** Image quality 1-100 (default varies by preset) */
  quality?: number;
  /** Whether this is a high-priority image (above the fold) */
  priority?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Callback when image fails to load */
  onError?: (e: React.SyntheticEvent<HTMLImageElement>) => void;
}

/**
 * Optimized image component that:
 * - Always sets explicit width/height to prevent CLS
 * - Uses appropriate object-fit based on the fit prop
 * - Fetches optimized images from Supabase storage (2x for retina)
 */
const OptimizedImage = memo(({
  src,
  alt,
  width,
  height,
  fit = 'cover',
  priority = false,
  className,
  onError,
}: OptimizedImageProps) => {
  // Generate optimized URL based on fit mode
  // For contain (icons), use square dimensions at 2x
  // For cover (cards), use the actual dimensions at 2x
  const optimizedSrc = fit === 'contain'
    ? getOptimizedIconUrl(src, Math.max(width, height))
    : getOptimizedCoverUrl(src, width * 2, height * 2);

  return (
    <img
      src={optimizedSrc}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? 'eager' : 'lazy'}
      decoding={priority ? 'sync' : 'async'}
      fetchPriority={priority ? 'high' : 'low'}
      className={cn(
        fit === 'contain' ? 'object-contain' : 'object-cover',
        className
      )}
      onError={onError}
    />
  );
});

OptimizedImage.displayName = 'OptimizedImage';

export default OptimizedImage;
