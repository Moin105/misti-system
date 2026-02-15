import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useCookieConsent } from "@/contexts/CookieConsentContext";
import { useState, useEffect } from "react";
import { Shield, TrendingUp, Target, Settings } from "lucide-react";

const iconMap: Record<string, any> = {
  necessary: Shield,
  analytics: TrendingUp,
  marketing: Target,
  preferences: Settings,
};

export default function CookiePreferencesModal() {
  const { isPreferencesOpen, setIsPreferencesOpen, savePreferences, preferences } =
    useCookieConsent();
  const [localPrefs, setLocalPrefs] = useState<Record<string, boolean>>({});

  const { data: categories } = useQuery({
    queryKey: ["cookie-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cookie_categories")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");

      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (preferences) {
      setLocalPrefs(preferences);
    } else if (categories) {
      // Initialize with necessary cookies only
      const initial = categories.reduce((acc, cat) => {
        acc[cat.slug] = cat.is_required;
        return acc;
      }, {} as Record<string, boolean>);
      setLocalPrefs(initial);
    }
  }, [preferences, categories]);

  const handleToggle = (slug: string, value: boolean) => {
    setLocalPrefs((prev) => ({ ...prev, [slug]: value }));
  };

  const handleSave = () => {
    savePreferences(localPrefs);
  };

  return (
    <Dialog open={isPreferencesOpen} onOpenChange={setIsPreferencesOpen}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cookie Preferences</DialogTitle>
          <DialogDescription>
            Manage your cookie preferences. You can enable or disable different types of
            cookies below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {categories?.map((category) => {
            const Icon = iconMap[category.slug] || Shield;
            return (
              <div key={category.id} className="space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="rounded-lg bg-primary/10 p-2 flex-shrink-0">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Label
                          htmlFor={category.slug}
                          className="text-base font-semibold cursor-pointer"
                        >
                          {category.name}
                        </Label>
                        {category.is_required && (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                            Required
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {category.description}
                      </p>
                    </div>
                  </div>
                  <Switch
                    id={category.slug}
                    checked={localPrefs[category.slug] || false}
                    onCheckedChange={(checked) => handleToggle(category.slug, checked)}
                    disabled={category.is_required}
                  />
                </div>
                {categories.indexOf(category) < categories.length - 1 && (
                  <Separator className="mt-4" />
                )}
              </div>
            );
          })}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => setIsPreferencesOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Preferences</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
