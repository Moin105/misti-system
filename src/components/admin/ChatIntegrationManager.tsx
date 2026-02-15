import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { refreshAdminData } from "@/lib/adminSupabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Save } from "lucide-react";

interface ChatIntegration {
  id: string;
  provider: string;
  widget_id: string;
  property_id: string;
  sri_hash: string;
  is_active: boolean;
  visitor_name_field?: string | null;
  custom_attributes?: any;
}

const POPULAR_PROVIDERS = [
  { value: "tawk", label: "Tawk.to", docs: "https://www.tawk.to/knowledgebase/getting-started/adding-a-widget-to-your-website/" },
];

const ChatIntegrationManager = () => {
  const [integration, setIntegration] = useState<ChatIntegration | null>(null);
  const [provider, setProvider] = useState("tawk");
  const [widgetId, setWidgetId] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [sriHash, setSriHash] = useState("");
  const [visitorNameField, setVisitorNameField] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadIntegration();
  }, []);

  const loadIntegration = async () => {
    const { data } = await supabase
      .from("chat_integration")
      .select("*")
      .single();

    if (data) {
      setIntegration(data);
      setProvider(data.provider || "tawk");
      setWidgetId(data.widget_id || "");
      setPropertyId(data.property_id || "");
      setSriHash(data.sri_hash || "");
      setVisitorNameField(data.visitor_name_field || "");
      setIsActive(data.is_active);
    }
  };

  const handleSave = async () => {
    if (!widgetId || !propertyId) {
      toast({
        title: "Error",
        description: "Widget ID and Property ID are required",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        provider,
        widget_id: widgetId,
        property_id: propertyId,
        sri_hash: sriHash || null,
        visitor_name_field: visitorNameField || null,
        custom_attributes: {},
        is_active: isActive
      };

      if (integration) {
        const { error } = await supabase
          .from("chat_integration")
          .update(payload)
          .eq("id", integration.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("chat_integration")
          .insert(payload);

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Chat integration settings saved successfully",
      });

      await refreshAdminData(['/rest/v1/chat_integration'], ['chat-integration']);
      loadIntegration();
    } catch (error) {
      console.error("Error saving integration:", error);
      toast({
        title: "Error",
        description: "Failed to save chat integration settings",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const selectedProvider = POPULAR_PROVIDERS.find(p => p.value === provider);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Live Chat Integration
          </CardTitle>
          <CardDescription>
            Configure Tawk.to live chat widget. The widget will persist across all pages and automatically display visitor information for authenticated users.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="provider">Chat Provider</Label>
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger>
                <SelectValue placeholder="Select a provider" />
              </SelectTrigger>
              <SelectContent className="bg-background z-[60]">
                {POPULAR_PROVIDERS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedProvider?.docs && (
              <p className="text-sm text-muted-foreground">
                <a 
                  href={selectedProvider.docs} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  View {selectedProvider.label} installation guide →
                </a>
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="propertyId">Property ID</Label>
            <Input
              id="propertyId"
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
              placeholder="e.g., 5f7b8c9d0e1f2a3b4c5d6e7f"
            />
            <p className="text-sm text-muted-foreground">
              Your Tawk.to property ID (found in the widget installation code)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="widgetId">Widget ID</Label>
            <Input
              id="widgetId"
              value={widgetId}
              onChange={(e) => setWidgetId(e.target.value)}
              placeholder="e.g., 1a2b3c4d5e6f7g8h9i0j"
            />
            <p className="text-sm text-muted-foreground">
              Your Tawk.to widget ID (found in the widget installation code)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sriHash">SRI Hash (Optional but Recommended)</Label>
            <Input
              id="sriHash"
              value={sriHash}
              onChange={(e) => setSriHash(e.target.value)}
              placeholder="sha384-..."
            />
            <p className="text-sm text-muted-foreground">
              Subresource Integrity hash for added security
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="visitorNameField">Visitor Name Field (Optional)</Label>
            <Input
              id="visitorNameField"
              value={visitorNameField}
              onChange={(e) => setVisitorNameField(e.target.value)}
              placeholder="e.g., full_name"
            />
            <p className="text-sm text-muted-foreground">
              User metadata field to use as visitor name. Defaults to email if not set.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
            <Label htmlFor="active" className="cursor-pointer">
              Enable chat widget on the website
            </Label>
          </div>

          <Button
            onClick={handleSave}
            disabled={isLoading || !widgetId.trim() || !propertyId.trim()}
            className="w-full sm:w-auto"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Integration
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Setup Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <h4 className="font-semibold mb-2">For Tawk.to:</h4>
            <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
              <li>Log in to your Tawk.to dashboard</li>
              <li>Go to Administration → Channels → Chat Widget</li>
              <li>Click on your widget, then "Widget Code"</li>
              <li>Copy the Property ID (long alphanumeric string after "tawk.to/")</li>
              <li>Copy the Widget ID (string after the property ID)</li>
              <li>Paste both IDs in the form above</li>
            </ol>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-semibold mb-2">How It Works:</h4>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>The widget loads once when the app starts and persists across all pages</li>
              <li>For logged-in users, their name and email are automatically displayed to support agents</li>
              <li>The widget remains visible during navigation (no disappearing)</li>
              <li>All data is loaded securely from Tawk.to's official CDN</li>
            </ul>
          </div>

          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <p className="text-sm text-amber-800 dark:text-amber-300">
              <strong>⚠️ Security Note:</strong> This implementation loads the official widget from Tawk.to's CDN using a configuration-based approach, preventing script injection attacks.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChatIntegrationManager;
