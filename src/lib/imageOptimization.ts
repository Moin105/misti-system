// Image optimization utility for Supabase storage
// Uses Supabase's image transformation API for on-the-fly resizing
import { fixSupabaseUrl } from './urlUtils';

interface OptimizeOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'origin' | 'webp';
  resize?: 'cover' | 'contain' | 'fill';
  useTransformation?: boolean; // Option to disable transformation
}

// Check if image transformation is enabled
// Disabled by default due to 400 errors - can be enabled via localStorage
const IMAGE_TRANSFORMATION_ENABLED = 
  typeof window !== 'undefined' 
    ? window.localStorage.getItem('enable-image-transformation') === 'true'
    : false; // Disabled by default until Supabase transformation API is configured

/**
 * Transform a Supabase Storage public URL to use the image transformation API.
 * Returns the original URL if transformation is disabled or not a valid Supabase storage URL.
 * 
 * Note: Supabase only supports width, height, quality, and format params.
 * The aspect ratio is maintained by default (fit to dimensions).
 * 
 * If transformation fails (400 errors), disable it via localStorage:
 * localStorage.setItem('disable-image-transformation', 'true')
 */
export const getOptimizedImageUrl = (
  url: string | null | undefined,
  options: OptimizeOptions = {}
): string => {
  if (!url) return '';
  
  // Fix old project ID first
  url = fixSupabaseUrl(url);
  
  // Only transform Supabase storage URLs
  if (!url.includes('supabase.co/storage/v1/object/public/')) {
    return url;
  }
  
  // Don't re-transform URLs that are already using render/image
  if (url.includes('/storage/v1/render/image/')) {
    return url;
  }
  
  // Check if transformation is disabled
  const useTransformation = options.useTransformation !== false && IMAGE_TRANSFORMATION_ENABLED;
  if (!useTransformation) {
    return url; // Return original URL without transformation
  }
  
  try {
    // Parse the URL properly to handle existing query params
    const urlObj = new URL(url);
    
    // Transform path from /object/public/ to /render/image/public/
    urlObj.pathname = urlObj.pathname.replace(
      '/storage/v1/object/public/',
      '/storage/v1/render/image/public/'
    );
    
    // Add optimization params (only the ones Supabase supports)
    const { width, height, quality, format, resize } = options;
    
    if (width) urlObj.searchParams.set('width', String(width));
    if (height) urlObj.searchParams.set('height', String(height));
    if (quality) urlObj.searchParams.set('quality', String(quality));
    if (format) urlObj.searchParams.set('format', format);
    if (resize) urlObj.searchParams.set('resize', resize);
    
    return urlObj.toString();
  } catch {
    // If URL parsing fails, return original
    return url;
  }
};

/**
 * Preset for game icons (square, high DPR support).
 * Fetches at 2x the display size for retina displays.
 * @param url - The Supabase storage URL
 * @param displaySize - The CSS display size in pixels (default 80)
 */
export const getOptimizedIconUrl = (
  url: string | null | undefined,
  displaySize: number = 80
): string => {
  // Fetch at 2x for retina, capped at reasonable size
  const fetchSize = Math.min(displaySize * 2, 256);
  
  return getOptimizedImageUrl(url, {
    width: fetchSize,
    height: fetchSize,
    quality: 65,
    resize: 'contain', // Preserve aspect ratio for icons
  });
};

/**
 * Preset for cover images (cards, hero backgrounds).
 * @param url - The Supabase storage URL
 * @param width - Target width in pixels
 * @param height - Optional target height
 */
export const getOptimizedCoverUrl = (
  url: string | null | undefined,
  width: number,
  height?: number
): string => {
  return getOptimizedImageUrl(url, {
    width,
    height,
    quality: 55,
  });
};

/**
 * Generate srcSet for responsive images.
 * @param url - The Supabase storage URL
 * @param widths - Array of widths to generate (default: [400, 800, 1200])
 */
export const getResponsiveSrcSet = (
  url: string | null | undefined,
  widths: number[] = [400, 800, 1200],
  quality: number = 55
): string => {
  if (!url) return '';
  
  return widths
    .map(w => `${getOptimizedImageUrl(url, { width: w, quality })} ${w}w`)
    .join(', ');
};

/**
 * Legacy function signature for backward compatibility.
 * @deprecated Use getOptimizedImageUrl with options object instead.
 */
export const getOptimizedImageUrlLegacy = (
  url: string | null | undefined,
  width: number = 480,
  quality: number = 30
): string => {
  return getOptimizedImageUrl(url, { width, quality });
};
