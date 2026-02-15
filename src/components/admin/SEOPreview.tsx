import { Card } from "@/components/ui/card";

interface SEOPreviewProps {
  title: string;
  description: string;
  url: string;
}

export const SEOPreview = ({ title, description, url }: SEOPreviewProps) => {
  const truncateTitle = (text: string, maxLength: number = 60) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const truncateDescription = (text: string, maxLength: number = 160) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const getTitleColor = (length: number) => {
    if (length <= 60) return 'text-green-600';
    if (length <= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getDescriptionColor = (length: number) => {
    if (length >= 155 && length <= 160) return 'text-green-600';
    if (length <= 170) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Card className="p-4">
      <h4 className="text-sm font-semibold mb-2">Google Search Preview</h4>
      <div className="space-y-1">
        <div className="flex items-baseline gap-2">
          <h3 className="text-xl text-blue-600 hover:underline cursor-pointer">
            {truncateTitle(title || 'Product Title')}
          </h3>
          <span className={`text-xs ${getTitleColor(title?.length || 0)}`}>
            {title?.length || 0}/60
          </span>
        </div>
        <p className="text-sm text-green-700">{url || 'https://misti.services/product-url'}</p>
        <div className="flex items-start gap-2">
          <p className="text-sm text-gray-600">
            {truncateDescription(description || 'Add a compelling meta description to improve click-through rate...')}
          </p>
          <span className={`text-xs whitespace-nowrap ${getDescriptionColor(description?.length || 0)}`}>
            {description?.length || 0}/160
          </span>
        </div>
      </div>
      <div className="mt-3 text-xs text-muted-foreground space-y-1">
        <p>💡 <strong>Title:</strong> Green = optimal (≤60), Yellow = warning (≤70), Red = too long</p>
        <p>💡 <strong>Description:</strong> Green = optimal (155-160), Yellow = acceptable (≤170), Red = too long</p>
      </div>
    </Card>
  );
};
