import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Smartphone, Share, Plus, MoreVertical, Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface InstallAppButtonProps {
  variant?: "hero" | "compact" | "icon";
  className?: string;
  hideWhenInstalled?: boolean;
}

type DeviceType = "ios" | "android" | "desktop-chrome" | "desktop-edge" | "desktop-firefox" | "desktop-safari" | "other";

const detectDevice = (): DeviceType => {
  const ua = navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(ua);
  const isAndroid = /android/.test(ua);
  const isChrome = /chrome/.test(ua) && !/edg/.test(ua);
  const isEdge = /edg/.test(ua);
  const isFirefox = /firefox/.test(ua);
  const isSafari = /safari/.test(ua) && !isChrome && !isEdge;
  
  if (isIOS) return "ios";
  if (isAndroid) return "android";
  if (isChrome) return "desktop-chrome";
  if (isEdge) return "desktop-edge";
  if (isFirefox) return "desktop-firefox";
  if (isSafari) return "desktop-safari";
  return "other";
};

const isStandalone = (): boolean => {
  const isIOS = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());
  
  if (isIOS) {
    // On iOS, require BOTH navigator.standalone AND media query to be true
    // This prevents false positives when PWA was installed but user is in Safari browser
    const navigatorStandalone = (window.navigator as any).standalone === true;
    const mediaQueryStandalone = window.matchMedia('(display-mode: standalone)').matches;
    return navigatorStandalone && mediaQueryStandalone;
  }
  
  // For non-iOS, use the standard media query
  return window.matchMedia('(display-mode: standalone)').matches;
};

export const InstallAppButton = ({ variant = "hero", className = "", hideWhenInstalled = true }: InstallAppButtonProps) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [deviceType, setDeviceType] = useState<DeviceType>("other");
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    setDeviceType(detectDevice());
    
    // Delay standalone check to ensure accurate detection after browser APIs initialize
    const timer = setTimeout(() => {
      setIsInstalled(isStandalone());
    }, 100);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    // If native prompt available, use it
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
      return;
    }
    
    // Otherwise show instructions modal
    setShowModal(true);
  };

  // Hide if already installed (only when hideWhenInstalled is true)
  if (hideWhenInstalled && isInstalled) return null;

  const getInstructions = (): { title: string; steps: { icon: React.ReactNode; text: string }[]; note?: string } => {
    switch (deviceType) {
      case "ios":
        return {
          title: "Install on iPhone/iPad",
          steps: [
            { icon: <Share className="h-5 w-5" />, text: "Tap the Share button (□↑) at the bottom of Safari" },
            { icon: <Plus className="h-5 w-5" />, text: 'Scroll down and tap "Add to Home Screen"' },
            { icon: <Smartphone className="h-5 w-5" />, text: 'Tap "Add" in the top-right corner' },
          ],
          note: "Must be using Safari browser (not Chrome or other browsers on iOS)",
        };
      case "android":
        return {
          title: "Install on Android",
          steps: [
            { icon: <MoreVertical className="h-5 w-5" />, text: "Tap the menu button (⋮) in Chrome" },
            { icon: <Download className="h-5 w-5" />, text: 'Tap "Install app" or "Add to Home screen"' },
            { icon: <Smartphone className="h-5 w-5" />, text: "Confirm to install" },
          ],
        };
      case "desktop-chrome":
      case "desktop-edge":
        return {
          title: `Install in ${deviceType === "desktop-chrome" ? "Chrome" : "Edge"}`,
          steps: [
            { icon: <Download className="h-5 w-5" />, text: "Look for the install icon (⊕) in the address bar" },
            { icon: <Smartphone className="h-5 w-5" />, text: 'Click "Install" when prompted' },
            { icon: <Plus className="h-5 w-5" />, text: 'Or use Menu (⋮) → "Install Misti..."' },
          ],
        };
      case "desktop-firefox":
        return {
          title: "Install in Firefox",
          steps: [
            { icon: <MoreVertical className="h-5 w-5" />, text: "Click the menu button (☰) in the top-right" },
            { icon: <Download className="h-5 w-5" />, text: 'Select "More tools" → "Customize toolbar"' },
            { icon: <Plus className="h-5 w-5" />, text: "Drag the page icon to your bookmarks bar or desktop" },
          ],
          note: "Firefox has limited PWA support. For the best app experience, try Chrome or Edge.",
        };
      case "desktop-safari":
        return {
          title: "Install in Safari (Mac)",
          steps: [
            { icon: <Share className="h-5 w-5" />, text: 'Click File menu → "Add to Dock" (macOS Sonoma+)' },
            { icon: <Download className="h-5 w-5" />, text: "Or click Share button → Add to Dock" },
            { icon: <Smartphone className="h-5 w-5" />, text: "The app will appear in your Dock" },
          ],
          note: "Requires macOS Sonoma (14.0) and Safari 17 or later for full PWA support.",
        };
      default:
        return {
          title: "Install Misti App",
          steps: [
            { icon: <Download className="h-5 w-5" />, text: "Open this site in Chrome or Edge" },
            { icon: <Smartphone className="h-5 w-5" />, text: "Look for the install option in the menu" },
            { icon: <Plus className="h-5 w-5" />, text: 'Or "Add to Home Screen" on mobile' },
          ],
        };
    }
  };

  const instructions = getInstructions();

  // Icon variant for navigation
  if (variant === "icon") {
    return (
      <>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleInstall}
          className={`h-9 w-9 ${className}`}
          title="Install App"
        >
          <Smartphone className="h-4 w-4" />
        </Button>
        <InstructionsModal
          open={showModal}
          onOpenChange={setShowModal}
          instructions={instructions}
        />
      </>
    );
  }

  // Compact variant
  if (variant === "compact") {
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          onClick={handleInstall}
          className={`gap-2 ${className}`}
        >
          <Smartphone className="h-4 w-4" />
          Get App
        </Button>
        <InstructionsModal
          open={showModal}
          onOpenChange={setShowModal}
          instructions={instructions}
        />
      </>
    );
  }

  // Hero variant
  return (
    <>
      <Button
        variant="outline"
        size="lg"
        onClick={handleInstall}
        className={`gap-2 bg-background/50 backdrop-blur-sm border-primary/30 hover:bg-primary/10 hover:border-primary/50 transition-all ${className}`}
      >
        <Smartphone className="h-5 w-5" />
        <span>Get the App</span>
      </Button>
      <InstructionsModal
        open={showModal}
        onOpenChange={setShowModal}
        instructions={instructions}
      />
    </>
  );
};

interface InstructionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instructions: {
    title: string;
    steps: { icon: React.ReactNode; text: string }[];
    note?: string;
  };
}

const InstructionsModal = ({ open, onOpenChange, instructions }: InstructionsModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            {instructions.title}
          </DialogTitle>
          <DialogDescription>
            Follow these steps to install Misti on your device
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {instructions.steps.map((step, index) => (
            <div key={index} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                {step.icon}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{step.text}</p>
              </div>
              <span className="text-xs text-muted-foreground font-bold">{index + 1}</span>
            </div>
          ))}
        </div>
        {instructions.note && (
          <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg flex items-start gap-2">
            <span>💡</span>
            <span>{instructions.note}</span>
          </div>
        )}
        <div className="text-center text-xs text-muted-foreground">
          The app works offline and loads faster!
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InstallAppButton;
