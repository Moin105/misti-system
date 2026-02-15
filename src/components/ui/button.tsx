import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Glassmorphism default - glass background with gradient hover
        default: "bg-primary/20 backdrop-blur-sm border border-primary/30 text-primary hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-500 hover:text-white hover:border-transparent hover:shadow-lg hover:shadow-primary/25",
        // Glassmorphism destructive with red glow
        destructive: "bg-destructive/20 backdrop-blur-sm text-destructive border border-destructive/30 hover:bg-destructive hover:text-destructive-foreground hover:shadow-lg hover:shadow-destructive/30",
        // Glassmorphism outline
        outline: "border border-input bg-background/50 backdrop-blur-sm hover:bg-primary/10 hover:border-primary/50 hover:text-primary hover:shadow-md hover:shadow-primary/10",
        // Secondary with glassmorphism
        secondary: "bg-secondary/60 backdrop-blur-sm text-secondary-foreground border border-border/40 hover:bg-secondary/80 hover:border-primary/30 hover:shadow-md",
        // Ghost enhanced
        ghost: "hover:bg-primary/15 hover:text-primary",
        link: "text-primary underline-offset-4 hover:underline",
        // Hero - premium gradient with strong glow
        hero: "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/50 hover:scale-[1.02] border border-white/10",
        accent: "bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg shadow-[0_0_12px_rgba(76,134,198,0.3)] hover:shadow-[0_0_20px_rgba(76,134,198,0.4)]",
        configure: "bg-[hsl(0,0%,39%)] text-white hover:bg-[hsl(0,0%,45%)]",
        gradient: "bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-400 hover:to-purple-400 shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/40 hover:scale-[1.02]",
        cta: "bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-[length:200%_auto] text-white font-semibold shadow-[0_0_20px_rgba(139,92,246,0.4)] hover:bg-[position:right_center] hover:shadow-[0_0_30px_rgba(139,92,246,0.6)] hover:scale-[1.02] duration-500 border border-white/10",
        // Solid variant for primary CTAs that need filled appearance
        solid: "bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold shadow-lg shadow-purple-500/30 hover:from-blue-500 hover:to-purple-500 hover:shadow-xl hover:shadow-purple-500/40 hover:scale-[1.02] border border-white/10",
        // Glassmorphism variants
        glass: "bg-card/60 backdrop-blur-xl border border-border/40 text-foreground hover:bg-primary/15 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10",
        "glass-primary": "bg-primary/20 backdrop-blur-sm border border-primary/30 text-primary hover:bg-primary/30 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/20",
        "glass-success": "bg-green-500/20 backdrop-blur-sm border border-green-500/30 text-green-400 hover:bg-green-500/30 hover:border-green-500/50 hover:shadow-lg hover:shadow-green-500/20",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
