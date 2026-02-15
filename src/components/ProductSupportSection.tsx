import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import {
  Target, TrendingUp, Shield, ShieldCheck, Clock, Zap, Award, Star,
  CheckCircle, Lock, Gift, MessageCircle, Truck, Package, Eye, Gem,
  Crown, Flame, Sparkles, BadgeCheck, ThumbsUp, UserCheck, Heart,
  Headphones, RefreshCw, Coins, Timer, Gauge, Rocket, Trophy,
  type LucideIcon,
} from "lucide-react";
import { ContactSupportDropdown } from "./ContactSupportDropdown";

const guaranteeIconMap: Record<string, LucideIcon> = {
  Target, TrendingUp, Shield, ShieldCheck, Clock, Zap, Award, Star,
  CheckCircle, Lock, Gift, MessageCircle, Truck, Package, Eye, Gem,
  Crown, Flame, Sparkles, BadgeCheck, ThumbsUp, UserCheck, Heart,
  Headphones, RefreshCw, Coins, Timer, Gauge, Rocket, Trophy,
};

// Color accent map per icon name for distinctive badge styling
const iconAccentMap: Record<string, { bg: string; text: string; border: string; shadow: string }> = {
  Shield:      { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-l-emerald-500", shadow: "hover:shadow-emerald-500/20" },
  ShieldCheck: { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-l-emerald-500", shadow: "hover:shadow-emerald-500/20" },
  Lock:        { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-l-emerald-500", shadow: "hover:shadow-emerald-500/20" },
  CheckCircle: { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-l-emerald-500", shadow: "hover:shadow-emerald-500/20" },
  BadgeCheck:  { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-l-emerald-500", shadow: "hover:shadow-emerald-500/20" },
  Coins:       { bg: "bg-amber-500/15",   text: "text-amber-400",   border: "border-l-amber-500",   shadow: "hover:shadow-amber-500/20" },
  Gift:        { bg: "bg-amber-500/15",   text: "text-amber-400",   border: "border-l-amber-500",   shadow: "hover:shadow-amber-500/20" },
  Award:       { bg: "bg-amber-500/15",   text: "text-amber-400",   border: "border-l-amber-500",   shadow: "hover:shadow-amber-500/20" },
  Trophy:      { bg: "bg-amber-500/15",   text: "text-amber-400",   border: "border-l-amber-500",   shadow: "hover:shadow-amber-500/20" },
  Star:        { bg: "bg-amber-500/15",   text: "text-amber-400",   border: "border-l-amber-500",   shadow: "hover:shadow-amber-500/20" },
  Crown:       { bg: "bg-amber-500/15",   text: "text-amber-400",   border: "border-l-amber-500",   shadow: "hover:shadow-amber-500/20" },
  Eye:         { bg: "bg-blue-500/15",    text: "text-blue-400",    border: "border-l-blue-500",    shadow: "hover:shadow-blue-500/20" },
  Zap:         { bg: "bg-blue-500/15",    text: "text-blue-400",    border: "border-l-blue-500",    shadow: "hover:shadow-blue-500/20" },
  Rocket:      { bg: "bg-blue-500/15",    text: "text-blue-400",    border: "border-l-blue-500",    shadow: "hover:shadow-blue-500/20" },
  TrendingUp:  { bg: "bg-blue-500/15",    text: "text-blue-400",    border: "border-l-blue-500",    shadow: "hover:shadow-blue-500/20" },
  Gauge:       { bg: "bg-blue-500/15",    text: "text-blue-400",    border: "border-l-blue-500",    shadow: "hover:shadow-blue-500/20" },
  UserCheck:   { bg: "bg-purple-500/15",  text: "text-purple-400",  border: "border-l-purple-500",  shadow: "hover:shadow-purple-500/20" },
  Headphones:  { bg: "bg-purple-500/15",  text: "text-purple-400",  border: "border-l-purple-500",  shadow: "hover:shadow-purple-500/20" },
  MessageCircle:{ bg: "bg-purple-500/15", text: "text-purple-400",  border: "border-l-purple-500",  shadow: "hover:shadow-purple-500/20" },
  Heart:       { bg: "bg-rose-500/15",    text: "text-rose-400",    border: "border-l-rose-500",    shadow: "hover:shadow-rose-500/20" },
  Flame:       { bg: "bg-orange-500/15",  text: "text-orange-400",  border: "border-l-orange-500",  shadow: "hover:shadow-orange-500/20" },
  Sparkles:    { bg: "bg-cyan-500/15",    text: "text-cyan-400",    border: "border-l-cyan-500",    shadow: "hover:shadow-cyan-500/20" },
};

const defaultAccent = { bg: "bg-primary/15", text: "text-primary", border: "border-l-primary", shadow: "hover:shadow-primary/20" };

interface PaymentIcon {
  id: string;
  name: string;
  icon_url: string;
  sort_order: number;
}

interface ProductGuarantee {
  id: string;
  icon_name: string;
  title: string;
  subtitle: string;
  sort_order: number;
}

interface ChatCTAConfig {
  icon_name: string;
  button_text: string;
}

interface ProductSupportSectionProps {
  productName?: string;
}

export const ProductSupportSection = ({ productName }: ProductSupportSectionProps) => {
  const [paymentIcons, setPaymentIcons] = useState<PaymentIcon[]>([]);
  const [guarantees, setGuarantees] = useState<ProductGuarantee[]>([]);
  const [chatConfig, setChatConfig] = useState<ChatCTAConfig | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const [iconsRes, guaranteesRes, chatRes] = await Promise.all([
        supabase
          .from("payment_icons")
          .select("*")
          .eq("is_active", true)
          .order("sort_order"),
        supabase
          .from("product_guarantees")
          .select("*")
          .eq("is_active", true)
          .order("sort_order"),
        supabase
          .from("chat_cta_config")
          .select("*")
          .eq("is_active", true)
          .limit(1)
          .single(),
      ]);

      if (iconsRes.data) setPaymentIcons(iconsRes.data);
      if (guaranteesRes.data) setGuarantees(guaranteesRes.data);
      if (chatRes.data) setChatConfig(chatRes.data);
    };

    fetchData();
  }, []);

  const getAccent = (iconName: string) => iconAccentMap[iconName] || defaultAccent;

  const renderIcon = (iconName: string) => {
    const Icon = guaranteeIconMap[iconName];
    const accent = getAccent(iconName);
    if (Icon) return <Icon className={`w-5 h-5 ${accent.text}`} />;
    return <div className="w-5 h-5 rounded-full bg-primary/40" />;
  };

  return (
    <div className="mt-4 space-y-4">
      {/* Payment Icons - Centered with grayscale to color transition */}
      {paymentIcons.length > 0 && (
        <div className="flex items-center justify-center gap-4 py-3">
          {paymentIcons.map((icon) => (
            <div
              key={icon.id}
              className="h-8 flex items-center justify-center opacity-80 hover:opacity-100 
                         hover:scale-110 transition-all duration-300"
            >
              <img
                src={icon.icon_url}
                alt={icon.name}
                className="h-full w-auto object-contain"
              />
            </div>
          ))}
        </div>
      )}

      {/* Trust Badges - Glassmorphism containers */}
      {guarantees.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {guarantees.map((guarantee) => {
            const accent = getAccent(guarantee.icon_name);
            return (
              <div
                key={guarantee.id}
                className={`flex items-center gap-3 p-3 rounded-xl border-l-2
                           bg-card/40 backdrop-blur-sm border border-border/30
                           ${accent.border} ${accent.shadow}
                           hover:bg-card/60
                           transition-all duration-300 group`}
              >
                <div className={`p-2.5 rounded-lg ${accent.bg} group-hover:scale-110 transition-transform`}>
                  {renderIcon(guarantee.icon_name)}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-bold text-foreground truncate">
                    {guarantee.title}
                  </span>
                  <span className="text-xs text-muted-foreground truncate">
                    {guarantee.subtitle}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Contact Support - Glass button */}
      <ContactSupportDropdown
        productName={productName}
        className="w-full bg-card/60 backdrop-blur-sm border border-border/40 text-foreground
                   hover:bg-primary/10 hover:border-primary/40 hover:text-primary
                   transition-all duration-300"
        variant="outline"
        size="default"
      />
    </div>
  );
};
