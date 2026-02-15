import TrustBadges from "@/components/TrustBadges";
import InstallAppButton from "@/components/InstallAppButton";

const Hero = () => {
  return (
    <section className="relative pt-24 pb-12 md:pt-32 md:pb-20 overflow-hidden">
      {/* Multi-layer gradient background - NO IMAGE */}
      <div className="absolute inset-0 z-0">
        {/* Base gradient: Deeper navy/purple */}
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(220,45%,12%)] via-[hsl(220,40%,10%)] to-[hsl(215,40%,8%)]" />
        
        {/* Mesh gradient orbs - optimized: hide animations on mobile to reduce GPU thrashing */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-500/8 rounded-full blur-[120px] md:animate-pulse animate-duration-4s will-change-opacity hidden md:block" />
        <div className="absolute top-20 right-1/4 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[100px] md:animate-pulse animate-duration-5s animation-delay-100 will-change-opacity hidden md:block" />
        {/* Mobile fallback: simple gradient without animation */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 md:hidden" />
        
        {/* Subtle radial glow - purple tint */}
        <div className="absolute inset-0 opacity-30 bg-gradient-radial-purple" />
        
        {/* Bottom fade to background */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 text-center">
        <h1 className="text-4xl md:text-6xl font-extrabold mb-6 leading-tight drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)]">
          Save your time getting<br />
          <span className="bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(168,85,247,0.4)]">
            items, currency and skills
          </span>
        </h1>
        
        {/* Trust badges */}
        <TrustBadges />
        
        {/* Only show on mobile devices - hidden on desktop via CSS */}
        <div className="mt-8 md:hidden">
          <InstallAppButton variant="hero" hideWhenInstalled={false} />
        </div>
      </div>
    </section>
  );
};

export default Hero;
