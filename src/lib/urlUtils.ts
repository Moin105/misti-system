/**
 * Utility functions for URL manipulation and fixing
 */

const OLD_PROJECT_ID = 'kdjlhibxxygfdmlvdfcl';
const NEW_PROJECT_ID = 'sclvjrnnnbbptnhonoks';

/**
 * Replace old Supabase project ID with new one in any URL
 * This ensures all image URLs and storage URLs use the correct project
 */
export const fixSupabaseUrl = (url: string | null | undefined): string => {
  if (!url) return '';
  
  // Replace old project ID with new one if present
  if (url.includes(OLD_PROJECT_ID)) {
    return url.replace(new RegExp(OLD_PROJECT_ID, 'g'), NEW_PROJECT_ID);
  }
  
  return url;
};

/**
 * Fix Supabase URL in an object (for product/game objects)
 */
export const fixSupabaseUrlsInObject = <T extends Record<string, any>>(
  obj: T,
  urlFields: string[] = ['image_url', 'og_image', 'hero_image_url', 'icon_url', 'product_bg_image_url', 'featured_image']
): T => {
  if (!obj) return obj;
  
  const fixed = { ...obj };
  
  for (const field of urlFields) {
    if (fixed[field]) {
      fixed[field] = fixSupabaseUrl(fixed[field]);
    }
  }
  
  return fixed;
};
