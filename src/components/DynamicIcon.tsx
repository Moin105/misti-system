import { useState, useEffect, memo } from "react";
import { criticalIcons } from "@/lib/icons/critical";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface DynamicIconProps {
  name: string;
  className?: string;
  strokeWidth?: number;
  size?: number;
  color?: string;
}

// Cache for lazy-loaded icon maps
let commonIconsCache: Record<string, LucideIcon> | null = null;
let extendedIconsCache: Record<string, LucideIcon> | null = null;

/**
 * Load common icons on demand
 */
const loadCommonIcons = async (): Promise<Record<string, LucideIcon>> => {
  if (commonIconsCache) return commonIconsCache;
  const { commonIcons } = await import("@/lib/icons/common");
  commonIconsCache = commonIcons;
  return commonIcons;
};

/**
 * Load extended icons on demand
 */
const loadExtendedIcons = async (): Promise<Record<string, LucideIcon>> => {
  if (extendedIconsCache) return extendedIconsCache;
  const { extendedIcons } = await import("@/lib/icons/extended");
  extendedIconsCache = extendedIcons;
  return extendedIcons;
};

/**
 * A performance-optimized icon component that uses tiered loading:
 * - Critical icons: Loaded synchronously (above-fold)
 * - Common icons: Lazy-loaded on first use
 * - Extended icons: Lazy-loaded on demand
 * 
 * This reduces initial bundle size by ~60KB compared to importing all icons.
 * 
 * Usage:
 * <DynamicIcon name="Shield" className="w-6 h-6" />
 */
export const DynamicIcon = memo(({ 
  name, 
  className = "", 
  strokeWidth = 2,
  size,
  color 
}: DynamicIconProps) => {
  const [LazyIcon, setLazyIcon] = useState<LucideIcon | null>(null);
  const [loading, setLoading] = useState(false);

  // Check critical icons first (synchronous)
  const CriticalIcon = criticalIcons[name];
  
  useEffect(() => {
    // Skip if it's a critical icon or already loading
    if (CriticalIcon || loading || LazyIcon) return;
    
    let mounted = true;
    setLoading(true);
    
    const loadIcon = async () => {
      // Try common icons first
      const common = await loadCommonIcons();
      if (common[name]) {
        if (mounted) {
          setLazyIcon(() => common[name]);
          setLoading(false);
        }
        return;
      }
      
      // Then try extended icons
      const extended = await loadExtendedIcons();
      if (extended[name]) {
        if (mounted) {
          setLazyIcon(() => extended[name]);
          setLoading(false);
        }
        return;
      }
      
      // Icon not found
      if (mounted) {
        setLoading(false);
      }
    };
    
    loadIcon();
    
    return () => {
      mounted = false;
    };
  }, [name, CriticalIcon, loading, LazyIcon]);

  // Render critical icon immediately
  if (CriticalIcon) {
    return <CriticalIcon className={className} strokeWidth={strokeWidth} size={size} color={color} />;
  }
  
  // Render lazy-loaded icon
  if (LazyIcon) {
    return <LazyIcon className={className} strokeWidth={strokeWidth} size={size} color={color} />;
  }
  
  // Show loading placeholder while async loading
  if (loading) {
    return (
      <span 
        className={cn("inline-block animate-pulse rounded-full bg-muted/50", className)} 
        style={{ width: size || 20, height: size || 20 }} 
      />
    );
  }
  
  // Return null if icon not found
  return null;
});

DynamicIcon.displayName = "DynamicIcon";

/**
 * Helper function to get an icon component by name (sync for critical only)
 * For non-critical icons, use DynamicIcon component instead
 */
export const getIconByName = (name: string): LucideIcon | null => {
  return criticalIcons[name] || null;
};

export default DynamicIcon;
