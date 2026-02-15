import React, { memo } from "react";
import { Link } from "react-router-dom";

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
}

interface CategorySidebarProps {
  gameSlug?: string;
  categories?: Category[];
  selectedCategory?: string;
}

const CategorySidebar = memo(({ gameSlug, categories = [], selectedCategory }: CategorySidebarProps) => {
  return (
    <div className="w-full bg-card/80 backdrop-blur-md border border-border rounded-xl p-4 relative overflow-hidden group hover:border-purple-500/40 hover:shadow-[0_0_25px_rgba(139,92,246,0.12)] transition-all duration-300">
      {/* Top gradient accent line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500" />
      {/* Bottom subtle line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />
      
      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-8 h-8 border-l-2 border-t-2 border-blue-500/40 rounded-tl-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="absolute bottom-0 right-0 w-8 h-8 border-r-2 border-b-2 border-purple-500/40 rounded-br-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      {/* Simplified Header Section */}
      <div className="mb-4 pt-1">
        <h3 className="text-lg font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent tracking-tight">
          Browse Services
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {categories.length + 1} categories
        </p>
      </div>
      
      {/* Subtle divider */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-border to-transparent mb-3" />
      
      {/* Category Items */}
      <div className="space-y-0">
        {/* All Services - always first */}
        <Link to={`/game/${gameSlug}`}>
          <div
            className={`relative flex items-center gap-3 p-3 rounded-xl transition-all duration-300 ${
              !selectedCategory
                ? "bg-gradient-to-r from-primary/15 to-purple-500/15 border border-primary/25 shadow-[0_0_15px_rgba(147,51,234,0.15)]"
                : "bg-background/30 border border-transparent hover:bg-background/60 hover:border-primary/20"
            }`}
          >
            {/* Left accent bar for active state */}
            {!selectedCategory && (
              <div className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-gradient-to-b from-primary via-purple-500 to-primary" />
            )}
            
            {/* Bullet indicator */}
            <div className={`w-2 h-2 rounded-full transition-all duration-300 flex-shrink-0 ${
              !selectedCategory 
                ? "bg-gradient-to-r from-blue-400 to-purple-500 shadow-[0_0_8px_rgba(139,92,246,0.5)]"
                : "bg-primary/30"
            }`} />
            
            <span className={`font-medium text-base leading-relaxed tracking-wide ${!selectedCategory ? 'text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'}`}>
              All Services
            </span>
          </div>
        </Link>
        
        {/* Divider after All Services */}
        {categories.length > 0 && (
          <div className="h-px w-full bg-gradient-to-r from-transparent via-border/50 to-transparent my-1.5" />
        )}
        
        {/* Dynamic Categories */}
        {categories.map((category, index) => {
          const isActive = selectedCategory === category.slug;
          
          return (
            <React.Fragment key={category.id}>
              <Link to={`/game/${gameSlug}/${category.slug}`}>
                <div
                  className={`relative flex items-center gap-3 p-3 rounded-xl transition-all duration-300 ${
                    isActive
                      ? "bg-gradient-to-r from-primary/15 to-purple-500/15 border border-primary/25 shadow-[0_0_15px_rgba(147,51,234,0.15)]"
                      : "bg-background/30 border border-transparent hover:bg-background/60 hover:border-primary/20"
                  }`}
                >
                  {/* Left accent bar for active state */}
                  {isActive && (
                    <div className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-gradient-to-b from-primary via-purple-500 to-primary" />
                  )}
                  
                  {/* Bullet indicator */}
                  <div className={`w-2 h-2 rounded-full transition-all duration-300 flex-shrink-0 ${
                    isActive 
                      ? "bg-gradient-to-r from-blue-400 to-purple-500 shadow-[0_0_8px_rgba(139,92,246,0.5)]"
                      : "bg-primary/30"
                  }`} />
                  
                  <span className={`font-medium text-base leading-relaxed tracking-wide ${isActive ? 'text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'}`}>
                    {category.name}
                  </span>
                </div>
              </Link>
              
              {/* Divider between items */}
              {index < categories.length - 1 && (
                <div className="h-px w-full bg-gradient-to-r from-transparent via-border/50 to-transparent my-1.5" />
              )}
            </React.Fragment>
          );
        })}
        
        {categories.length === 0 && (
          <div className="flex items-center justify-center py-6 text-sm text-muted-foreground tracking-wide">
            No categories available
          </div>
        )}
      </div>
    </div>
  );
});

CategorySidebar.displayName = "CategorySidebar";

export default CategorySidebar;
