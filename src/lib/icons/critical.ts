/**
 * Critical Icons - Above-fold, high-priority icons
 * 
 * These icons are loaded synchronously in the initial bundle because they appear
 * above the fold on the landing page. Adding icons here increases initial bundle size.
 * 
 * Guidelines:
 * - Only add icons that appear in Navigation, Hero, or first visible section
 * - Maximum ~20 icons to keep initial payload small
 * - For below-fold icons, add to common.ts or extended.ts instead
 */
import {
  Star,
  Shield,
  ShieldCheck,
  Clock,
  Lock,
  Gift,
  Users,
  Trophy,
  Gamepad2,
  ShoppingCart,
  User,
  ChevronDown,
  ChevronUp,
  Search,
  Menu,
  X,
  Award,
  Zap,
  Rocket,
  CheckCircle,
  DollarSign,
  type LucideIcon,
} from "lucide-react";

export const criticalIcons: Record<string, LucideIcon> = {
  Star,
  Shield,
  ShieldCheck,
  Clock,
  Lock,
  Gift,
  Users,
  Trophy,
  Gamepad2,
  ShoppingCart,
  User,
  ChevronDown,
  ChevronUp,
  Search,
  Menu,
  X,
  Award,
  Zap,
  Rocket,
  CheckCircle,
  DollarSign,
};

export type CriticalIconName = keyof typeof criticalIcons;
