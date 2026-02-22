import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type FooterSection = {
  id: string;
  title: string;
  links: Array<{ id: string; label: string; url: string }>;
};

type SocialLink = {
  id: string;
  platform: string;
  url: string;
  icon_name: string;
};

type FooterLinkItem = { id: string; label: string; url: string };

interface FooterData {
  sections: FooterSection[];
  socialLinks: SocialLink[];
}

/**
 * Hook that defers footer data fetching until the footer comes into viewport.
 * This reduces initial page load API calls.
 */
export function useDeferredFooterData() {
  const [isInView, setIsInView] = useState(false);
  const observerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Start fetching after a short delay even if not in view (fallback for fast scrollers)
    const fallbackTimer = setTimeout(() => {
      setIsInView(true);
    }, 1500);

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsInView(true);
          clearTimeout(fallbackTimer);
          observer.disconnect();
        }
      },
      { rootMargin: "600px" } // Start fetching 600px before it comes into view
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => {
      clearTimeout(fallbackTimer);
      observer.disconnect();
    };
  }, []);

  // Preload common icons chunk when footer becomes visible (contains social icons)
  useEffect(() => {
    if (isInView) {
      import("@/lib/icons/common");
    }
  }, [isInView]);

  const { data: footerData, isLoading } = useQuery<FooterData>({
    queryKey: ["footer-data"],
    queryFn: async () => {
      const [sectionsRes, linksRes, socialRes, legalPagesRes] = await Promise.all([
        supabase.from("footer_sections").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("footer_links").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("social_links").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("blog_posts").select("title, slug").eq("is_published", true).eq("is_legal_page", true).order("title"),
      ]);

      let sections: FooterSection[] = [];
      let socialLinks: SocialLink[] = [];

      if (sectionsRes.data && linksRes.data) {
        const legalPageLinks: FooterLinkItem[] = (legalPagesRes.data ?? []).map((page) => ({
          id: `legal-${page.slug}`,
          label: page.title,
          url: `/blog/${page.slug}`,
        }));

        const mergeUniqueLinks = (links: FooterLinkItem[]) => {
          const seen = new Set<string>();
          return links.filter((link) => {
            const key = `${link.url.toLowerCase()}::${link.label.toLowerCase()}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
        };

        sections = sectionsRes.data.map((section) => {
          const sectionLinks: FooterLinkItem[] = linksRes.data.filter((link) => link.section_id === section.id).map((link) => ({
            id: link.id,
            label: link.label,
            url: link.url,
          }));

          const isLegalSection = section.slug.trim().toLowerCase() === "legal";
          if (isLegalSection) {
            return {
              id: section.id,
              title: section.title,
              links: mergeUniqueLinks([...sectionLinks, ...legalPageLinks]),
            };
          }

          return {
            id: section.id,
            title: section.title,
            links: sectionLinks,
          };
        });

        // If CMS legal section is temporarily missing, keep legal links visible.
        const hasLegalSection = sections.some((section) => section.title.trim().toLowerCase() === "legal");
        if (!hasLegalSection && legalPageLinks.length > 0) {
          sections.push({
            id: "fallback-legal",
            title: "Legal",
            links: legalPageLinks,
          });
        }
      }

      if (socialRes.data) {
        socialLinks = socialRes.data;
      }

      return { sections, socialLinks };
    },
    enabled: isInView, // Only fetch when footer is in/near viewport
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes cache
  });

  return {
    footerData,
    isLoading,
    observerRef,
    isInView,
  };
}
