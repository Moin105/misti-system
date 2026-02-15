import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Shield, ShieldCheck, Users } from "lucide-react";
import { useAuthUser } from "@/hooks/useAuthUser";

interface EnforcementSettings {
  require_for_admins: boolean;
  require_for_all: boolean;
}

export function MFASettingsManager() {
  const { toast } = useToast();
  const { user } = useAuthUser();
  const [settings, setSettings] = useState<EnforcementSettings>({
    require_for_admins: true,
    require_for_all: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("site_security_settings")
        .select("setting_value")
        .eq("setting_key", "mfa_enforcement")
        .maybeSingle();

      if (error) throw error;

      if (data?.setting_value) {
        const value = data.setting_value as unknown as EnforcementSettings;
        if (typeof value.require_for_admins === "boolean" && typeof value.require_for_all === "boolean") {
          setSettings(value);
        }
      }
    } catch (error) {
      console.error("Error fetching MFA settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateSettings = async (newSettings: EnforcementSettings) => {
    setIsSaving(true);
    try {
      const settingValueJson = JSON.parse(JSON.stringify(newSettings));
      const { error } = await supabase
        .from("site_security_settings")
        .update({
          setting_value: settingValueJson,
          updated_at: new Date().toISOString(),
          updated_by: user?.id,
        })
        .eq("setting_key", "mfa_enforcement");

      if (error) throw error;

      setSettings(newSettings);
      toast({
        title: "Settings updated",
        description: "MFA enforcement settings have been saved.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: error.message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            MFA Security Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Two-Factor Authentication Settings
        </CardTitle>
        <CardDescription>
          Configure 2FA enforcement policies for your site
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <Label htmlFor="require-admins" className="text-base font-medium">
                  Require 2FA for Admins
                </Label>
                <p className="text-sm text-muted-foreground">
                  All admin users must enable two-factor authentication to access the admin panel
                </p>
              </div>
            </div>
            <Switch
              id="require-admins"
              checked={settings.require_for_admins}
              onCheckedChange={(checked) =>
                updateSettings({ ...settings, require_for_admins: checked })
              }
              disabled={isSaving}
            />
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <Label htmlFor="require-all" className="text-base font-medium">
                  Require 2FA for All Users
                </Label>
                <p className="text-sm text-muted-foreground">
                  All users must enable two-factor authentication to use the site
                </p>
              </div>
            </div>
            <Switch
              id="require-all"
              checked={settings.require_for_all}
              onCheckedChange={(checked) =>
                updateSettings({ ...settings, require_for_all: checked })
              }
              disabled={isSaving}
            />
          </div>
        </div>

        <div className="p-4 bg-muted/50 rounded-lg">
          <h4 className="font-medium mb-2">Current Policy</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            {settings.require_for_all ? (
              <li className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                All users must have 2FA enabled
              </li>
            ) : settings.require_for_admins ? (
              <>
                <li className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Admins must have 2FA enabled
                </li>
                <li className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  Regular users can optionally enable 2FA
                </li>
              </>
            ) : (
              <li className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                2FA is optional for all users
              </li>
            )}
          </ul>
        </div>

        {isSaving && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Saving changes...
          </div>
        )}
      </CardContent>
    </Card>
  );
}
