import { Skeleton } from "@/components/ui/skeleton";

interface SectionSkeletonProps {
  height?: string;
  showCards?: boolean;
}

const SectionSkeleton = ({ height = "400px", showCards = false }: SectionSkeletonProps) => {
  return (
    <div className="container mx-auto px-4 py-12" style={{ minHeight: height }}>
      <div className="text-center mb-8">
        <Skeleton className="h-10 w-64 mx-auto mb-4" />
        <Skeleton className="h-6 w-96 mx-auto" />
      </div>
      {showCards && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      )}
    </div>
  );
};

export default SectionSkeleton;
