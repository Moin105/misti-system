import { Link } from "react-router-dom";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock } from "lucide-react";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { DynamicIcon } from "@/components/DynamicIcon";
import { fixSupabaseUrl } from "@/lib/urlUtils";
import { getOptimizedCoverUrl } from "@/lib/imageOptimization";

interface Category {
  id?: string;
  name: string;
  icon_name: string | null;
  color: string;
}

interface BlogPostCardProps {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  created_at: string;
  featured_image?: string | null;
  author_name?: string | null;
  read_time_minutes?: number | null;
  category_id?: string | null;
  category?: Category;
}

const BlogPostCard = ({ 
  title, 
  slug, 
  created_at, 
  featured_image,
  read_time_minutes,
  category 
}: BlogPostCardProps) => {
  const imageUrl = fixSupabaseUrl(featured_image);

  return (
    <Link to={`/blog/${slug}`} className="group">
      <Card className="h-full overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-primary/50 hover:-translate-y-1">
        {imageUrl && (
          <div className="relative overflow-hidden bg-muted">
            <AspectRatio ratio={16 / 9}>
              <img 
                src={getOptimizedCoverUrl(imageUrl, 900, 506)}
                alt={title}
                className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
              />
            </AspectRatio>
          </div>
        )}
        <CardHeader>
          {category && (
            <Badge 
              className="mb-2 w-fit font-medium border"
              style={{ 
                backgroundColor: category.color + "15",
                color: category.color,
                borderColor: category.color + "40"
              }}
            >
              <span className="flex items-center gap-1">
                {category.icon_name && (
                  <DynamicIcon name={category.icon_name} className="w-3 h-3" />
                )}
                <span>{category.name}</span>
              </span>
            </Badge>
          )}
          <CardTitle className="line-clamp-3 group-hover:text-primary transition-colors leading-tight">
            {title}
          </CardTitle>
          <CardDescription className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(created_at).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>
            {read_time_minutes && (
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {read_time_minutes} min read
              </span>
            )}
          </CardDescription>
        </CardHeader>
      </Card>
    </Link>
  );
};

export default BlogPostCard;
