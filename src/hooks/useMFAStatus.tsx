import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "./useAuthUser";

interface MFAFactor {
  id: string;
  friendly_name?: string;
  factor_type: string;
  status: string;
}

interface MFAStatus {
  isEnrolled: boolean;
  isVerified: boolean;
  isRequired: boolean;
  needsSetup: boolean;
  factors: MFAFactor[];
  isLoading: boolean;
  refetch: () => Promise<void>;
}

interface EnforcementSettings {
  require_for_admins: boolean;
  require_for_all: boolean;
}

export function useMFAStatus(): MFAStatus {
  const { user, isAdmin } = useAuthUser();
  const [factors, setFactors] = useState<MFAFactor[]>([]);
  const [enforcementSettings, setEnforcementSettings] = useState<EnforcementSettings>({
    require_for_admins: true,
    require_for_all: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchMFAStatus = async () => {
    if (!user) {
      setFactors([]);
      setIsLoading(false);
      return;
    }

    try {
      // Fetch MFA factors from Supabase Auth
      const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();
      
      if (factorsError) {
        console.error("Error fetching MFA factors:", factorsError);
      } else {
        setFactors(factorsData?.totp || []);
      }

      // Fetch enforcement settings
      const { data: settingsData, error: settingsError } = await supabase
        .from("site_security_settings")
        .select("setting_value")
        .eq("setting_key", "mfa_enforcement")
        .maybeSingle();

      if (!settingsError && settingsData?.setting_value) {
        const value = settingsData.setting_value as unknown as EnforcementSettings;
        if (typeof value.require_for_admins === "boolean" && typeof value.require_for_all === "boolean") {
          setEnforcementSettings(value);
        }
      }
    } catch (error) {
      console.error("Error fetching MFA status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMFAStatus();
  }, [user?.id]);

  // Check if user has verified TOTP factors
  const verifiedFactors = factors.filter((f) => f.status === "verified");
  const isEnrolled = verifiedFactors.length > 0;
  const isVerified = isEnrolled; // For now, enrolled = verified

  // Determine if MFA is required for this user
  const isRequired = enforcementSettings.require_for_all || 
    (isAdmin && enforcementSettings.require_for_admins);

  // User needs to set up MFA if it's required but not enrolled
  const needsSetup = isRequired && !isEnrolled;

  return {
    isEnrolled,
    isVerified,
    isRequired,
    needsSetup,
    factors: verifiedFactors,
    isLoading,
    refetch: fetchMFAStatus,
  };
}
