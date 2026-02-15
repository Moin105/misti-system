import { useSiteFAQs } from "@/hooks/useSiteFAQs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { sanitizeHtml } from "@/lib/sanitize";
import { HelpCircle, Sparkles, MessageCircleQuestion } from "lucide-react";
import { Helmet } from "react-helmet-async";

const SiteFAQSection = () => {
  const { data: faqs = [], isLoading } = useSiteFAQs();

  if (isLoading) {
    return (
      <section className="py-16 md:py-24 relative overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto space-y-4">
            <Skeleton className="h-8 w-64 mx-auto" />
            <Skeleton className="h-4 w-96 mx-auto" />
            <div className="space-y-3 mt-8">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-20 w-full rounded-2xl" />
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (faqs.length === 0) {
    return null;
  }

  // Build FAQPage structured data for SEO rich snippets
  const faqStructuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer.replace(/<[^>]*>/g, ""), // Strip HTML for structured data
      },
    })),
  };

  return (
    <>
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify(faqStructuredData)}
        </script>
      </Helmet>
      
      <section className="py-16 md:py-24 relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
          <div className="absolute top-1/4 left-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-1/4 right-0 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: "1s" }} />
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-20 right-20 opacity-5">
          <MessageCircleQuestion className="w-40 h-40 text-primary" />
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto">
            {/* Enhanced Section Header */}
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-primary/20 to-purple-500/20 border border-primary/30 mb-6 backdrop-blur-sm">
                <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                <span className="text-sm font-semibold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">Got Questions?</span>
                <HelpCircle className="w-4 h-4 text-purple-400" />
              </div>
              <h2 className="text-3xl md:text-5xl font-bold mb-5">
                <span className="text-foreground">Frequently Asked </span>
                <span className="bg-gradient-to-r from-blue-400 via-primary to-purple-500 bg-clip-text text-transparent">Questions</span>
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
                Everything you need to know about our gaming services
              </p>
            </div>

            {/* Enhanced FAQ Accordion */}
            <Accordion type="single" collapsible className="space-y-4">
              {faqs.map((faq, index) => (
                <AccordionItem
                  key={faq.id}
                  value={`faq-${index}`}
                  className="group border border-border/50 rounded-2xl px-6 
                             bg-gradient-to-br from-card/80 to-card/60 backdrop-blur-md
                             hover:border-primary/40 hover:shadow-[0_0_30px_rgba(139,92,246,0.1)]
                             transition-all duration-500 overflow-hidden relative"
                >
                  {/* Gradient accent on hover */}
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 via-primary to-purple-500 
                                  opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  
                  {/* Corner accent */}
                  <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-primary/5 to-transparent 
                                  opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-bl-full" />
                  
                  <AccordionTrigger className="text-left hover:no-underline py-6 relative z-10">
                    <div className="flex items-start gap-4 pr-4">
                      {/* Question number badge */}
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 
                                      border border-primary/30 flex items-center justify-center
                                      group-hover:border-primary/50 group-hover:shadow-[0_0_15px_rgba(139,92,246,0.3)]
                                      transition-all duration-300">
                        <span className="text-sm font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                          {index + 1}
                        </span>
                      </div>
                      <span className="font-semibold text-base md:text-lg text-foreground group-hover:text-primary/90 transition-colors duration-300">
                        {faq.question}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-6 pl-12">
                    <div
                      className="prose prose-sm max-w-none text-muted-foreground leading-relaxed
                                 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-4 [&_li]:mb-1"
                      dangerouslySetInnerHTML={{ __html: sanitizeHtml(faq.answer) }}
                    />
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
            
            {/* Bottom CTA */}
            <div className="mt-12 text-center">
              <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl
                              bg-card/50 backdrop-blur-sm border border-border/50
                              text-muted-foreground">
                <HelpCircle className="w-5 h-5 text-primary" />
                <span className="text-sm">
                  Still have questions? 
                  <a href="/contact-us" className="ml-1 font-semibold text-primary hover:text-primary/80 transition-colors">
                    Contact our support team
                  </a>
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default SiteFAQSection;
