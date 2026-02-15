import { supabase } from "@/integrations/supabase/client";

export interface ConversionResult {
  success: boolean;
  originalPath: string;
  newPath?: string;
  originalSize: number;
  newSize?: number;
  error?: string;
  updateDetails?: Array<{
    table: string;
    id: string;
    name: string;
    fields: string[];
  }>;
}

export const convertImageToWebP = async (
  imageBlob: Blob,
  quality: number = 0.85
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0);
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Conversion to WebP failed'));
          }
        },
        'image/webp',
        quality
      );
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(imageBlob);
  });
};

export const getImageFileName = (path: string): string => {
  return path.split('/').pop() || path;
};

export const replaceExtensionWithWebP = (filename: string): string => {
  return filename.replace(/\.(png|jpg|jpeg)$/i, '.webp');
};

const normalizeUrl = (url: string): string => {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
};

export const updateProductImageReferences = async (
  oldUrl: string,
  newUrl: string
): Promise<{ count: number; details: any[] }> => {
  try {
    const oldNormalized = normalizeUrl(oldUrl);
    
    const { data: products } = await supabase
      .from('products')
      .select('id, name, image_url, og_image')
      .or(`image_url.ilike.%${oldNormalized}%,og_image.ilike.%${oldNormalized}%`);

    if (!products || products.length === 0) {
      return { count: 0, details: [] };
    }

    const details = [];
    let updatedCount = 0;

    for (const product of products) {
      const updates: any = {};
      const fields = [];
      
      if (product.image_url?.includes(oldNormalized)) {
        updates.image_url = newUrl;
        fields.push('image_url');
      }
      if (product.og_image?.includes(oldNormalized)) {
        updates.og_image = newUrl;
        fields.push('og_image');
      }

      if (Object.keys(updates).length > 0) {
        const { error } = await supabase
          .from('products')
          .update(updates)
          .eq('id', product.id);

        if (!error) {
          updatedCount++;
          details.push({
            table: 'products',
            id: product.id,
            name: product.name,
            fields
          });
          console.log(`Updated product "${product.name}" (${fields.join(', ')})`);
        } else {
          console.error(`Failed to update product ${product.id}:`, error);
        }
      }
    }

    return { count: updatedCount, details };
  } catch (error) {
    console.error('Error updating product references:', error);
    return { count: 0, details: [] };
  }
};

export const updateBlogPostImageReferences = async (
  oldUrl: string,
  newUrl: string
): Promise<{ count: number; details: any[] }> => {
  try {
    const oldNormalized = normalizeUrl(oldUrl);
    
    const { data: posts } = await supabase
      .from('blog_posts')
      .select('id, title, content, featured_image')
      .or(`featured_image.ilike.%${oldNormalized}%,content.ilike.%${oldNormalized}%`);

    if (!posts || posts.length === 0) {
      return { count: 0, details: [] };
    }

    const details = [];
    let updatedCount = 0;

    for (const post of posts) {
      const updates: any = {};
      const fields = [];
      
      if (post.featured_image?.includes(oldNormalized)) {
        updates.featured_image = newUrl;
        fields.push('featured_image');
      }
      
      if (post.content?.includes(oldNormalized)) {
        updates.content = post.content.replace(
          new RegExp(oldUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
          newUrl
        );
        fields.push('content');
      }

      if (Object.keys(updates).length > 0) {
        const { error } = await supabase
          .from('blog_posts')
          .update(updates)
          .eq('id', post.id);

        if (!error) {
          updatedCount++;
          details.push({
            table: 'blog_posts',
            id: post.id,
            name: post.title,
            fields
          });
          console.log(`Updated blog post "${post.title}" (${fields.join(', ')})`);
        } else {
          console.error(`Failed to update blog post ${post.id}:`, error);
        }
      }
    }

    return { count: updatedCount, details };
  } catch (error) {
    console.error('Error updating blog post references:', error);
    return { count: 0, details: [] };
  }
};

export const updateGameImageReferences = async (
  oldUrl: string,
  newUrl: string
): Promise<{ count: number; details: any[] }> => {
  try {
    const oldNormalized = normalizeUrl(oldUrl);
    
    const { data: games } = await supabase
      .from('games')
      .select('id, name, image_url, hero_image_url, icon_url')
      .or(`image_url.ilike.%${oldNormalized}%,hero_image_url.ilike.%${oldNormalized}%,icon_url.ilike.%${oldNormalized}%`);

    if (!games || games.length === 0) {
      return { count: 0, details: [] };
    }

    const details = [];
    let updatedCount = 0;

    for (const game of games) {
      const updates: any = {};
      const fields = [];
      
      if (game.image_url?.includes(oldNormalized)) {
        updates.image_url = newUrl;
        fields.push('image_url');
      }
      if (game.hero_image_url?.includes(oldNormalized)) {
        updates.hero_image_url = newUrl;
        fields.push('hero_image_url');
      }
      if (game.icon_url?.includes(oldNormalized)) {
        updates.icon_url = newUrl;
        fields.push('icon_url');
      }

      if (Object.keys(updates).length > 0) {
        const { error } = await supabase
          .from('games')
          .update(updates)
          .eq('id', game.id);

        if (!error) {
          updatedCount++;
          details.push({
            table: 'games',
            id: game.id,
            name: game.name,
            fields
          });
          console.log(`Updated game "${game.name}" (${fields.join(', ')})`);
        } else {
          console.error(`Failed to update game ${game.id}:`, error);
        }
      }
    }

    return { count: updatedCount, details };
  } catch (error) {
    console.error('Error updating game references:', error);
    return { count: 0, details: [] };
  }
};

export const checkIfStillReferenced = async (url: string): Promise<boolean> => {
  const normalized = normalizeUrl(url);
  
  const [products, posts, games] = await Promise.all([
    supabase.from('products').select('id').or(`image_url.ilike.%${normalized}%,og_image.ilike.%${normalized}%`).limit(1),
    supabase.from('blog_posts').select('id').or(`featured_image.ilike.%${normalized}%,content.ilike.%${normalized}%`).limit(1),
    supabase.from('games').select('id').or(`image_url.ilike.%${normalized}%,hero_image_url.ilike.%${normalized}%,icon_url.ilike.%${normalized}%`).limit(1)
  ]);

  return !!(products.data?.length || posts.data?.length || games.data?.length);
};
