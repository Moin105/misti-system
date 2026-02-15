import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isPrerender } from "@/lib/prerender";

interface ChatConfig {
  provider: string;
  widgetId: string;
  propertyId: string;
  sriHash: string;
  isActive: boolean;
  visitorNameField?: string;
  customAttributes?: any;
}

// Global flag to prevent multiple script loads
let tawkScriptLoaded = false;

const ThirdPartyChatWidget = () => {
  const [chatConfig, setChatConfig] = useState<ChatConfig | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Get current user
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const loadChatIntegration = async () => {
      const { data } = await supabase
        .from("chat_integration")
        .select("provider, widget_id, property_id, sri_hash, is_active, visitor_name_field, custom_attributes")
        .eq("is_active", true)
        .maybeSingle();

      if (data?.widget_id && data?.property_id) {
        setChatConfig({
          provider: data.provider,
          widgetId: data.widget_id,
          propertyId: data.property_id,
          sriHash: data.sri_hash || '',
          isActive: data.is_active,
          visitorNameField: data.visitor_name_field || undefined,
          customAttributes: data.custom_attributes || {},
        });
      } else {
        setChatConfig(null);
        // Hide widget if configuration is removed
        const win = window as any;
        if (win.Tawk_API && typeof win.Tawk_API.hideWidget === 'function') {
          win.Tawk_API.hideWidget();
        }
      }
    };

    loadChatIntegration();

    // Subscribe to changes
    const channel = supabase
      .channel('chat-integration')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_integration'
        },
        () => {
          loadChatIntegration();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!chatConfig || !chatConfig.isActive) {
      return;
    }

    // Skip chat widget for prerender bots to speed up page capture
    if (isPrerender()) {
      return;
    }

    // Only load script once globally
    if (tawkScriptLoaded) {
      // Script already loaded, just show widget
      const win = window as any;
      if (win.Tawk_API && typeof win.Tawk_API.showWidget === 'function') {
        win.Tawk_API.showWidget();
      }
      return;
    }

    // Function to load the Tawk.to script
    const loadTawkScript = () => {
      const win = window as any;

    // Initialize Tawk_API object
    win.Tawk_API = win.Tawk_API || {};
    win.Tawk_LoadStart = new Date();

    // Configure widget before it loads
    win.Tawk_API.onLoad = function() {
      console.log('Tawk.to widget loaded successfully');
      
      // Set visitor information if user is logged in
      if (user) {
        const visitorName = chatConfig.visitorNameField 
          ? user.user_metadata?.[chatConfig.visitorNameField] || user.email 
          : user.email;
        
        win.Tawk_API.setAttributes({
          name: visitorName,
          email: user.email,
          userId: user.id,
          ...chatConfig.customAttributes
        }, function(error: any) {
          if (error) {
            console.error('Error setting Tawk.to attributes:', error);
          }
        });
      }
    };

    try {
      const script = document.createElement('script');
      script.async = true;
      script.charset = 'UTF-8';
      script.setAttribute('crossorigin', '*');
      
      if (chatConfig.provider === 'tawk') {
        script.src = `https://embed.tawk.to/${chatConfig.propertyId}/${chatConfig.widgetId}`;
        
        // Add SRI hash if provided
        if (chatConfig.sriHash) {
          script.integrity = chatConfig.sriHash;
        }
      }
      
      script.onload = () => {
        tawkScriptLoaded = true;
        console.log('Tawk.to script loaded');
      };
      
      script.onerror = () => {
        console.error('Failed to load chat widget script');
        tawkScriptLoaded = false;
      };
      
        document.body.appendChild(script);
      } catch (error) {
        console.error('Error initializing chat widget:', error);
      }
    };

    // Defer loading: Wait for page load + 4 seconds (increased for performance)
    const initializeWithDelay = () => {
      if (document.readyState === 'complete') {
        // Page already loaded, just wait 4 seconds
        setTimeout(loadTawkScript, 4000);
      } else {
        // Wait for page load, then wait 4 seconds
        window.addEventListener('load', () => {
          setTimeout(loadTawkScript, 4000);
        }, { once: true });
      }
    };

    initializeWithDelay();

    // Don't cleanup on unmount - keep widget persistent
    return undefined;
  }, [chatConfig, user]);

  return null;
};

export default ThirdPartyChatWidget;
