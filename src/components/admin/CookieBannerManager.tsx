import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import CookieBanner from "@/components/CookieBanner";

interface BannerConfig {
  id: string;
  heading: string;
  description: string;
  accept_button_text: string;
  reject_button_text: string;
  customize_button_text: string;
  is_active: boolean;
  banner_position: string;
}

export default function CookieBannerManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showPreview, setShowPreview] = useState(false);

  const { data: config, isLoading } = useQuery({
    queryKey: ["cookie-banner-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cookie_banner_config")
        .select("*")
        .single();

      if (error) throw error;
      return data as BannerConfig;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<BannerConfig>) => {
      if (!config?.id) throw new Error("No config found");
      const { error } = await supabase
        .from("cookie_banner_config")
        .update(updates)
        .eq("id", config.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cookie-banner-config"] });
      toast({ title: "Banner settings updated successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating settings",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const updates = {
      heading: formData.get("heading") as string,
      description: formData.get("description") as string,
      accept_button_text: formData.get("accept_button_text") as string,
      reject_button_text: formData.get("reject_button_text") as string,
      customize_button_text: formData.get("customize_button_text") as string,
      banner_position: formData.get("banner_position") as string,
      is_active: formData.get("is_active") === "on",
    };

    updateMutation.mutate(updates);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Cookie Banner Settings</h2>
          <p className="text-muted-foreground">
            Configure the cookie consent banner appearance and text
          </p>
        </div>
        <Button variant="outline" onClick={() => setShowPreview(true)}>
          <Eye className="mr-2 h-4 w-4" />
          Preview Banner
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Banner Configuration</CardTitle>
          <CardDescription>
            Customize the text and appearance of your cookie consent banner
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="heading">Banner Heading</Label>
              <Input
                id="heading"
                name="heading"
                defaultValue={config?.heading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Banner Description</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={config?.description}
                rows={3}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="accept_button_text">Accept Button Text</Label>
                <Input
                  id="accept_button_text"
                  name="accept_button_text"
                  defaultValue={config?.accept_button_text}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reject_button_text">Reject Button Text</Label>
                <Input
                  id="reject_button_text"
                  name="reject_button_text"
                  defaultValue={config?.reject_button_text}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customize_button_text">Customize Button Text</Label>
                <Input
                  id="customize_button_text"
                  name="customize_button_text"
                  defaultValue={config?.customize_button_text}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="banner_position">Banner Position</Label>
              <Select name="banner_position" defaultValue={config?.banner_position}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bottom">Bottom</SelectItem>
                  <SelectItem value="top">Top</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                name="is_active"
                defaultChecked={config?.is_active}
              />
              <Label htmlFor="is_active">
                Enable Cookie Banner (Show on website)
              </Label>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Cookie Banner Preview</DialogTitle>
          </DialogHeader>
          <div className="relative min-h-[400px] bg-muted rounded-lg p-8">
            <p className="text-center text-muted-foreground mb-4">
              This is how your cookie banner will appear to visitors
            </p>
            <CookieBanner previewMode />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
