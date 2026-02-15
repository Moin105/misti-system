import { supabase } from "@/integrations/supabase/client";

interface ImageReference {
  table: string;
  field: string;
  url: string;
  name?: string;
}

interface OrphanedFile {
  bucket: string;
  filename: string;
  size: number;
  url: string;
}

interface BrokenReference {
  table: string;
  id: string;
  field: string;
  url: string;
  name?: string;
}

export interface CleanupReport {
  orphanedFiles: OrphanedFile[];
  brokenReferences: BrokenReference[];
  oldFormatFiles: {
    filename: string;
    bucket: string;
    hasWebPEquivalent: boolean;
    isReferenced: boolean;
  }[];
  totalOrphanedSize: number;
}

const normalizeUrl = (url: string): string => {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
};

export const getAllImageReferencesFromDB = async (): Promise<ImageReference[]> => {
  const references: ImageReference[] = [];

  try {
    // Get all product images
    const { data: products } = await supabase
      .from('products')
      .select('id, name, image_url, og_image');
    
    products?.forEach(p => {
      if (p.image_url) references.push({ table: 'products', field: 'image_url', url: p.image_url, name: p.name });
      if (p.og_image) references.push({ table: 'products', field: 'og_image', url: p.og_image, name: p.name });
    });

    // Get all game images
    const { data: games } = await supabase
      .from('games')
      .select('id, name, image_url, hero_image_url, icon_url');
    
    games?.forEach(g => {
      if (g.image_url) references.push({ table: 'games', field: 'image_url', url: g.image_url, name: g.name });
      if (g.hero_image_url) references.push({ table: 'games', field: 'hero_image_url', url: g.hero_image_url, name: g.name });
      if (g.icon_url) references.push({ table: 'games', field: 'icon_url', url: g.icon_url, name: g.name });
    });

    // Get all blog post images
    const { data: posts } = await supabase
      .from('blog_posts')
      .select('id, title, featured_image, content');
    
    posts?.forEach(p => {
      if (p.featured_image) references.push({ table: 'blog_posts', field: 'featured_image', url: p.featured_image, name: p.title });
      
      // Extract image URLs from content
      if (p.content) {
        const imgRegex = /https?:\/\/[^\s"'<>]+\.(png|jpg|jpeg|webp)/gi;
        const matches = p.content.match(imgRegex);
        matches?.forEach(url => {
          references.push({ table: 'blog_posts', field: 'content', url, name: p.title });
        });
      }
    });

    return references;
  } catch (error) {
    console.error('Error getting image references:', error);
    return [];
  }
};

export const getAllStorageFiles = async (bucket: string): Promise<{ name: string; size: number }[]> => {
  const allFiles: { name: string; size: number }[] = [];
  let offset = 0;
  const limit = 1000;

  try {
    while (true) {
      const { data, error } = await supabase.storage
        .from(bucket)
        .list('', { limit, offset });

      if (error) throw error;
      if (!data || data.length === 0) break;

      const imageFiles = data
        .filter(file => file.name.match(/\.(png|jpg|jpeg|webp)$/i))
        .map(file => ({
          name: file.name,
          size: file.metadata?.size || 0
        }));

      allFiles.push(...imageFiles);
      
      offset += limit;
      if (data.length < limit) break;
    }

    return allFiles;
  } catch (error) {
    console.error(`Error fetching files from ${bucket}:`, error);
    return [];
  }
};

export const generateCleanupReport = async (buckets: string[]): Promise<CleanupReport> => {
  console.log('Generating cleanup report...');
  
  const references = await getAllImageReferencesFromDB();
  const referencedUrls = new Set(references.map(r => normalizeUrl(r.url)));

  const orphanedFiles: OrphanedFile[] = [];
  const oldFormatFiles: Array<{
    filename: string;
    bucket: string;
    hasWebPEquivalent: boolean;
    isReferenced: boolean;
  }> = [];

  // Check storage files
  for (const bucket of buckets) {
    const storageFiles = await getAllStorageFiles(bucket);
    
    for (const file of storageFiles) {
      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(file.name);
      const normalizedUrl = normalizeUrl(publicUrl);
      const isReferenced = referencedUrls.has(normalizedUrl);

      // Check if orphaned
      if (!isReferenced) {
        orphanedFiles.push({
          bucket,
          filename: file.name,
          size: file.size,
          url: publicUrl
        });
      }

      // Check if old format
      if (file.name.match(/\.(png|jpg|jpeg)$/i)) {
        const webpName = file.name.replace(/\.(png|jpg|jpeg)$/i, '.webp');
        const hasWebP = storageFiles.some(f => f.name === webpName);
        
        oldFormatFiles.push({
          filename: file.name,
          bucket,
          hasWebPEquivalent: hasWebP,
          isReferenced
        });
      }
    }
  }

  // Check for broken references (DB points to non-existent files)
  const allStorageUrls = new Set<string>();
  for (const bucket of buckets) {
    const files = await getAllStorageFiles(bucket);
    files.forEach(file => {
      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(file.name);
      allStorageUrls.add(normalizeUrl(publicUrl));
    });
  }

  const brokenReferences: BrokenReference[] = references
    .filter(ref => !allStorageUrls.has(normalizeUrl(ref.url)))
    .map(ref => ({
      table: ref.table,
      id: ref.url,
      field: ref.field,
      url: ref.url,
      name: ref.name
    }));

  const totalOrphanedSize = orphanedFiles.reduce((sum, f) => sum + f.size, 0);

  console.log(`Report complete: ${orphanedFiles.length} orphaned files, ${brokenReferences.length} broken references`);

  return {
    orphanedFiles,
    brokenReferences,
    oldFormatFiles,
    totalOrphanedSize
  };
};

export const deleteOrphanedFiles = async (files: OrphanedFile[]): Promise<{ success: number; failed: number }> => {
  let success = 0;
  let failed = 0;

  for (const file of files) {
    try {
      const { error } = await supabase.storage
        .from(file.bucket)
        .remove([file.filename]);

      if (error) {
        console.error(`Failed to delete ${file.filename}:`, error);
        failed++;
      } else {
        console.log(`Deleted orphaned file: ${file.filename}`);
        success++;
      }
    } catch (error) {
      console.error(`Error deleting ${file.filename}:`, error);
      failed++;
    }
  }

  return { success, failed };
};
