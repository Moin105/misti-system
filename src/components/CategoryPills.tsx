import { memo } from "react";
import { Link } from "react-router-dom";

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
}

interface CategoryPillsProps {
  gameSlug?: string;
  categories?: Category[];
  selectedCategory?: string;
}

const CategoryPills = memo(({ gameSlug, categories = [], selectedCategory }: CategoryPillsProps) => {
  return (
    <div className="flex flex-wrap gap-2 pb-2">
      {/* All Services pill - always first */}
      <Link to={`/game/${gameSlug}`}>
        <div
          className={`inline-flex items-center h-9 px-4 rounded-full text-sm font-medium transition-all duration-300 cursor-pointer ${
            !selectedCategory
              ? "bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/40 text-foreground shadow-[0_0_12px_rgba(139,92,246,0.2)]"
              : "bg-card/60 backdrop-blur-sm border border-border/50 text-muted-foreground hover:bg-card/80 hover:border-primary/30 hover:text-foreground"
          }`}
        >
          {!selectedCategory && (
            <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 mr-2 shadow-[0_0_6px_rgba(139,92,246,0.6)]" />
          )}
          All Services
        </div>
      </Link>

      {/* Dynamic category pills */}
      {categories.map((category) => {
        const isActive = selectedCategory === category.slug;
        return (
          <Link key={category.id} to={`/game/${gameSlug}/${category.slug}`}>
            <div
              className={`inline-flex items-center h-9 px-4 rounded-full text-sm font-medium transition-all duration-300 cursor-pointer ${
                isActive
                  ? "bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/40 text-foreground shadow-[0_0_12px_rgba(139,92,246,0.2)]"
                  : "bg-card/60 backdrop-blur-sm border border-border/50 text-muted-foreground hover:bg-card/80 hover:border-primary/30 hover:text-foreground"
              }`}
            >
              {isActive && (
                <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 mr-2 shadow-[0_0_6px_rgba(139,92,246,0.6)]" />
              )}
              {category.name}
            </div>
          </Link>
        );
      })}
    </div>
  );
});

CategoryPills.displayName = "CategoryPills";

export default CategoryPills;
