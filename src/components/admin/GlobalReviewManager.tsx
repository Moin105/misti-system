import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { refreshAdminData } from "@/lib/adminSupabase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Star, Loader2, ExternalLink } from "lucide-react";

interface GlobalReviewConfig {
  id: string;
  average_rating: number;
  total_reviews: number;
  trustpilot_url: string | null;
  reviews_io_url: string | null;
  is_active: boolean;
}

const GlobalReviewManager = () => {
  const [config, setConfig] = useState<GlobalReviewConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from("global_review_config")
        .select("*")
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setConfig(data);
      }
    } catch (error) {
      console.error("Error fetching config:", error);
      toast({
        title: "Error",
        description: "Failed to load review configuration",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("global_review_config")
        .update({
          average_rating: config.average_rating,
          total_reviews: config.total_reviews,
          trustpilot_url: config.trustpilot_url,
          reviews_io_url: config.reviews_io_url,
          is_active: config.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq("id", config.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Review configuration updated successfully",
      });
      await refreshAdminData(['/rest/v1/global_review_config'], ['global-review-config']);
    } catch (error) {
      console.error("Error saving config:", error);
      toast({
        title: "Error",
        description: "Failed to save configuration",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (!config) {
    return (
      <Card className="p-6">
        <p className="text-muted-foreground">No configuration found</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <Star className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Global Review Configuration</h3>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="average_rating">Average Rating</Label>
            <Input
              id="average_rating"
              type="number"
              step="0.1"
              min="0"
              max="5"
              value={config.average_rating}
              onChange={(e) =>
                setConfig({ ...config, average_rating: parseFloat(e.target.value) || 0 })
              }
            />
            <p className="text-xs text-muted-foreground">
              Rating displayed on all product pages (0-5)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="total_reviews">Total Reviews</Label>
            <Input
              id="total_reviews"
              type="number"
              min="0"
              value={config.total_reviews}
              onChange={(e) =>
                setConfig({ ...config, total_reviews: parseInt(e.target.value) || 0 })
              }
            />
            <p className="text-xs text-muted-foreground">
              Number of reviews displayed
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="trustpilot_url">Trustpilot Page URL</Label>
            <div className="flex gap-2">
              <Input
                id="trustpilot_url"
                type="url"
                placeholder="https://www.trustpilot.com/review/yoursite.com"
                value={config.trustpilot_url || ""}
                onChange={(e) =>
                  setConfig({ ...config, trustpilot_url: e.target.value })
                }
              />
              {config.trustpilot_url && (
                <Button
                  variant="outline"
                  size="icon"
                  asChild
                >
                  <a
                    href={config.trustpilot_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reviews_io_url">Reviews.io Page URL</Label>
            <div className="flex gap-2">
              <Input
                id="reviews_io_url"
                type="url"
                placeholder="https://www.reviews.io/company-reviews/store/yoursite"
                value={config.reviews_io_url || ""}
                onChange={(e) =>
                  setConfig({ ...config, reviews_io_url: e.target.value })
                }
              />
              {config.reviews_io_url && (
                <Button
                  variant="outline"
                  size="icon"
                  asChild
                >
                  <a
                    href={config.reviews_io_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is_active"
            checked={config.is_active}
            onChange={(e) =>
              setConfig({ ...config, is_active: e.target.checked })
            }
            className="rounded"
          />
          <Label htmlFor="is_active" className="cursor-pointer">
            Display reviews on product pages
          </Label>
        </div>

        <div className="pt-4">
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Configuration
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default GlobalReviewManager;