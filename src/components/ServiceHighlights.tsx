import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DynamicIcon } from "@/components/DynamicIcon";

interface ServiceHighlight {
  id: string;
  icon_name: string;
  title: string;
  description: string;
  sort_order: number;
  is_active: boolean;
}

const ServiceHighlights = () => {
  const { data: highlights } = useQuery({
    queryKey: ["service-highlights"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_highlights")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      
      if (error) throw error;
      return data as ServiceHighlight[];
    },
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  if (!highlights || highlights.length === 0) {
    return null;
  }

  return (
    <section className="py-4 container mx-auto px-4">
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary/90 via-purple-600/80 to-purple-700/90 px-4 py-3 md:px-6 md:py-4">
        <div className="relative z-10">
          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8">
            {highlights.map((highlight, index) => (
              <div 
                key={highlight.id} 
                className={`flex items-center gap-2 animate-fade-in group animation-delay-${(index + 1) * 100}`}
              >
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-all duration-300">
                  <DynamicIcon 
                    name={highlight.icon_name} 
                    className="w-4 h-4 text-yellow-400" 
                    strokeWidth={1.5} 
                  />
                </div>
                <span className="text-xs md:text-sm font-medium text-white">
                  {highlight.title}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ServiceHighlights;
