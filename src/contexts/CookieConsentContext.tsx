import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface CookiePreferences {
  [key: string]: boolean;
}

interface CookieConsentContextType {
  preferences: CookiePreferences | null;
  hasConsent: boolean;
  acceptAll: () => void;
  rejectAll: () => void;
  savePreferences: (prefs: CookiePreferences) => void;
  openPreferences: () => void;
  isPreferencesOpen: boolean;
  setIsPreferencesOpen: (open: boolean) => void;
}

const CookieConsentContext = createContext<CookieConsentContextType | undefined>(undefined);

const STORAGE_KEY = "cookie_consent";
const SESSION_ID_KEY = "cookie_session_id";

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<CookiePreferences | null>(null);
  const [hasConsent, setHasConsent] = useState(false);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);

  useEffect(() => {
    // Load saved preferences
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setPreferences(parsed);
        setHasConsent(true);
      } catch (e) {
        console.error("Failed to parse cookie preferences:", e);
      }
    }
  }, []);

  const getOrCreateSessionId = () => {
    let sessionId = localStorage.getItem(SESSION_ID_KEY);
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      localStorage.setItem(SESSION_ID_KEY, sessionId);
    }
    return sessionId;
  };

  const logConsent = async (prefs: CookiePreferences) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const sessionId = getOrCreateSessionId();

      await supabase.from("cookie_consent_logs").insert({
        user_id: user?.id || null,
        session_id: sessionId,
        consent_preferences: prefs,
      });
    } catch (error) {
      console.error("Failed to log consent:", error);
    }
  };

  const acceptAll = async () => {
    const allPrefs: CookiePreferences = {
      necessary: true,
      analytics: true,
      marketing: true,
      preferences: true,
    };
    setPreferences(allPrefs);
    setHasConsent(true);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allPrefs));
    await logConsent(allPrefs);
  };

  const rejectAll = async () => {
    const minimalPrefs: CookiePreferences = {
      necessary: true,
      analytics: false,
      marketing: false,
      preferences: false,
    };
    setPreferences(minimalPrefs);
    setHasConsent(true);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(minimalPrefs));
    await logConsent(minimalPrefs);
  };

  const savePreferences = async (prefs: CookiePreferences) => {
    // Necessary cookies are always required
    const finalPrefs = { ...prefs, necessary: true };
    setPreferences(finalPrefs);
    setHasConsent(true);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(finalPrefs));
    await logConsent(finalPrefs);
    setIsPreferencesOpen(false);
  };

  const openPreferences = () => {
    setIsPreferencesOpen(true);
  };

  return (
    <CookieConsentContext.Provider
      value={{
        preferences,
        hasConsent,
        acceptAll,
        rejectAll,
        savePreferences,
        openPreferences,
        isPreferencesOpen,
        setIsPreferencesOpen,
      }}
    >
      {children}
    </CookieConsentContext.Provider>
  );
}

export function useCookieConsent() {
  const context = useContext(CookieConsentContext);
  if (!context) {
    throw new Error("useCookieConsent must be used within CookieConsentProvider");
  }
  return context;
}
