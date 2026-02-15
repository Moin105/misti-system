import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { getOptimizedCoverUrl } from "@/lib/imageOptimization";

interface ServiceCardProps {
  title: string;
  image: string;
  tags: string[];
  gradient?: string;
  slug: string;
}

const ServiceCard = ({ title, image, tags, gradient = "from-purple-900/50 to-purple-950/50", slug }: ServiceCardProps) => {
  return (
    <Link to={`/game/${slug}`}>
      <Card className="group relative overflow-hidden border-2 border-border hover:border-blue-500 bg-gradient-to-br from-card via-card to-card/90 hover:shadow-[0_0_25px_rgba(59,130,246,0.3)] hover:scale-[1.02] transition-all duration-300 cursor-pointer shadow-inner">
      <div className="relative h-80 overflow-hidden">
        {/* Background image */}
        <img 
          src={getOptimizedCoverUrl(image, 400, 320)} 
          alt={`${title} boost services - Professional gaming services`}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
          width="400"
          height="320"
          decoding="async"
        />
        
        {/* Gradient overlay */}
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-80`} />
        
        {/* Content */}
        <div className="relative h-full p-6 flex flex-col">
          <h3 className="text-2xl font-bold mb-4">{title}</h3>
          
          <div className="flex flex-wrap gap-2 mb-4">
            {tags.slice(0, 6).map((tag, index) => (
              <Badge 
                key={index} 
                variant="secondary" 
                className="bg-secondary/80 backdrop-blur-sm hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                {tag}
              </Badge>
            ))}
          </div>

          <div className="mt-auto">
            <Badge variant="outline" className="border-primary text-primary">
              All services <ArrowRight className="ml-1 w-3 h-3" />
            </Badge>
          </div>
        </div>
      </div>
    </Card>
    </Link>
  );
};

export default ServiceCard;
