import { useGameFAQs } from "@/hooks/useGameFAQs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { sanitizeHtml } from "@/lib/sanitize";

interface GameFAQSectionProps {
  gameId: string;
  gameName: string;
}

const GameFAQSection = ({ gameId, gameName }: GameFAQSectionProps) => {
  const { data: faqs = [], isLoading } = useGameFAQs(gameId);

  if (isLoading) {
    return (
      <section className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto space-y-4">
          <Skeleton className="h-8 w-64 mx-auto" />
          <Skeleton className="h-4 w-96 mx-auto" />
          <div className="space-y-3 mt-8">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (faqs.length === 0) {
    return null;
  }

  return (
    <section className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold mb-2 text-center">
          <span className="bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
            Frequently Asked Questions
          </span>
        </h2>
        <p className="text-muted-foreground text-center mb-8">
          Everything you need to know about {gameName} services
        </p>
        
        <Accordion type="single" collapsible className="space-y-4">
          {faqs.map((faq, index) => (
            <AccordionItem 
              key={faq.id} 
              value={`faq-${index}`}
              className="border rounded-lg px-6 bg-card"
            >
              <AccordionTrigger className="text-left hover:no-underline py-4">
                <span className="font-semibold">{faq.question}</span>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div 
                  className="prose prose-sm max-w-none text-muted-foreground"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(faq.answer) }}
                />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};

export default GameFAQSection;
