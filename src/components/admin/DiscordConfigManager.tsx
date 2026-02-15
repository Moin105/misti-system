import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { refreshAdminData } from "@/lib/adminSupabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, MessageSquare, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

interface DiscordConfig {
  id: string;
  discord_url: string;
  heading: string;
  description: string;
  is_active: boolean;
}

export function DiscordConfigManager() {
  const [config, setConfig] = useState<DiscordConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    discord_url: "",
    heading: "",
    description: "",
    is_active: true,
  });

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const { data, error } = await supabase
        .from("discord_config")
        .select("*")
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setConfig(data);
        setFormData({
          discord_url: data.discord_url,
          heading: data.heading,
          description: data.description,
          is_active: data.is_active,
        });
      }
    } catch (error) {
      console.error("Error loading config:", error);
      toast.error("Failed to load Discord configuration");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      if (config) {
        const { error } = await supabase
          .from("discord_config")
          .update(formData)
          .eq("id", config.id);

      if (error) throw error;
        toast.success("Discord configuration updated successfully");
      } else {
        const { error } = await supabase
          .from("discord_config")
          .insert([formData]);

        if (error) throw error;
        toast.success("Discord configuration created successfully");
      }

      await refreshAdminData(['/rest/v1/discord_config'], ['discord-config']);
      loadConfig();
    } catch (error) {
      console.error("Error saving config:", error);
      toast.error("Failed to save Discord configuration");
    } finally {
      setSaving(false);
    }
  };

  const testDiscordLink = () => {
    if (formData.discord_url) {
      window.open(formData.discord_url, "_blank");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          <div>
            <CardTitle>Discord Configuration</CardTitle>
            <CardDescription>
              Manage your Discord server link and messaging displayed on the Contact Us page
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="discord_url">Discord Server URL</Label>
            <div className="flex gap-2">
              <Input
                id="discord_url"
                value={formData.discord_url}
                onChange={(e) => setFormData({ ...formData, discord_url: e.target.value })}
                placeholder="https://discord.gg/yourserver"
                required
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={testDiscordLink}
                disabled={!formData.discord_url}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Enter your Discord invite link (e.g., https://discord.gg/yourserver)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="heading">Heading</Label>
            <Input
              id="heading"
              value={formData.heading}
              onChange={(e) => setFormData({ ...formData, heading: e.target.value })}
              placeholder="Stay Connected with Us 💬"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter your Discord community description..."
              rows={8}
              required
            />
            <p className="text-sm text-muted-foreground">
              This text will be displayed on the Contact Us page to encourage users to join Discord
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
            <Label htmlFor="is_active">Show Discord section on Contact Us page</Label>
          </div>

          <Button type="submit" disabled={saving} className="w-full">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Configuration
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
