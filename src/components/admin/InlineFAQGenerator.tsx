import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Sparkles, ChevronDown, ChevronUp, Edit, Trash2, Plus, HelpCircle, Save, X } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface FAQ {
  id: string;
  product_id: string;
  question: string;
  answer: string;
  sort_order: number;
  is_active: boolean;
  generated_by: string;
}

interface InlineFAQGeneratorProps {
  productId: string;
  productName: string;
  gameId: string;
}

export const InlineFAQGenerator = ({ productId, productName, gameId }: InlineFAQGeneratorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(false);
  const [questionsCount, setQuestionsCount] = useState("6");
  const [editingFaqId, setEditingFaqId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ question: "", answer: "" });
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newFaq, setNewFaq] = useState({ question: "", answer: "" });

  useEffect(() => {
    if (productId) {
      fetchFaqs();
    }
  }, [productId]);

  const fetchFaqs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('product_faqs')
      .select('*')
      .eq('product_id', productId)
      .order('sort_order');

    if (!error) {
      setFaqs(data || []);
    }
    setLoading(false);
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-product-faqs', {
        body: {
          scope: 'product',
          productId,
          gameId,
          dryRun: false,
          regenerate: faqs.length > 0,
          questionsCount: parseInt(questionsCount),
        },
      });

      if (error) {
        throw new Error(error.message || 'Generation failed');
      }

      if (data.generated > 0) {
        toast.success(`Generated ${data.generated} FAQ(s) successfully`);
        await fetchFaqs();
      } else if (data.skipped > 0) {
        toast.info('FAQs already exist. They will be regenerated.');
        await fetchFaqs();
      } else {
        toast.error('No FAQs were generated');
      }
    } catch (error: any) {
      console.error('Generation error:', error);
      toast.error(error.message || 'Failed to generate FAQs');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEditFaq = (faq: FAQ) => {
    setEditingFaqId(faq.id);
    setEditForm({ question: faq.question, answer: faq.answer });
  };

  const handleSaveEdit = async () => {
    if (!editingFaqId) return;

    const { error } = await supabase
      .from('product_faqs')
      .update({ 
        question: editForm.question, 
        answer: editForm.answer 
      })
      .eq('id', editingFaqId);

    if (error) {
      toast.error('Failed to update FAQ');
    } else {
      toast.success('FAQ updated');
      setEditingFaqId(null);
      await fetchFaqs();
    }
  };

  const handleDeleteFaq = async (faqId: string) => {
    if (!confirm('Are you sure you want to delete this FAQ?')) return;

    const { error } = await supabase
      .from('product_faqs')
      .delete()
      .eq('id', faqId);

    if (error) {
      toast.error('Failed to delete FAQ');
    } else {
      toast.success('FAQ deleted');
      await fetchFaqs();
    }
  };

  const handleAddNewFaq = async () => {
    if (!newFaq.question.trim() || !newFaq.answer.trim()) {
      toast.error('Please fill in both question and answer');
      return;
    }

    const maxSortOrder = Math.max(...faqs.map(f => f.sort_order), -1);

    const { error } = await supabase
      .from('product_faqs')
      .insert({
        product_id: productId,
        question: newFaq.question,
        answer: newFaq.answer,
        sort_order: maxSortOrder + 1,
        generated_by: 'manual'
      });

    if (error) {
      toast.error('Failed to add FAQ');
    } else {
      toast.success('FAQ added');
      setIsAddingNew(false);
      setNewFaq({ question: "", answer: "" });
      await fetchFaqs();
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="border rounded-lg bg-muted/30">
      <CollapsibleTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="w-full flex items-center justify-between p-4 hover:bg-muted/50"
        >
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            <span className="font-medium">AI FAQ Generator</span>
            {faqs.length > 0 && (
              <Badge variant="secondary">{faqs.length} FAQ{faqs.length !== 1 ? 's' : ''}</Badge>
            )}
          </div>
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="px-4 pb-4 space-y-4">
        <div className="text-sm text-muted-foreground">
          Generate frequently asked questions for this product using AI.
        </div>

        {/* Generate Controls */}
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <Label className="text-xs">Questions to generate</Label>
            <Select value={questionsCount} onValueChange={setQuestionsCount}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 questions</SelectItem>
                <SelectItem value="4">4 questions</SelectItem>
                <SelectItem value="5">5 questions</SelectItem>
                <SelectItem value="6">6 questions</SelectItem>
                <SelectItem value="8">8 questions</SelectItem>
                <SelectItem value="10">10 questions</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button 
            onClick={handleGenerate} 
            disabled={isGenerating}
            className="flex-1"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                {faqs.length > 0 ? 'Regenerate FAQs' : 'Generate FAQs'}
              </>
            )}
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : faqs.length > 0 ? (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {faqs.map((faq, index) => (
              <div key={faq.id} className="border rounded-lg p-3 bg-background">
                {editingFaqId === faq.id ? (
                  <div className="space-y-2">
                    <Input
                      value={editForm.question}
                      onChange={(e) => setEditForm({ ...editForm, question: e.target.value })}
                      placeholder="Question"
                    />
                    <Textarea
                      value={editForm.answer}
                      onChange={(e) => setEditForm({ ...editForm, answer: e.target.value })}
                      placeholder="Answer"
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSaveEdit}>
                        <Save className="h-3 w-3 mr-1" />
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingFaqId(null)}>
                        <X className="h-3 w-3 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground">Q{index + 1}:</span>
                        <Badge variant="outline" className="text-[10px]">
                          {faq.generated_by === 'ai' ? 'AI' : 'Manual'}
                        </Badge>
                      </div>
                      <p className="font-medium text-sm mt-1 line-clamp-2">{faq.question}</p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{faq.answer}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-7 w-7"
                        onClick={() => handleEditFaq(faq)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-7 w-7 text-destructive"
                        onClick={() => handleDeleteFaq(faq.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-sm text-muted-foreground">
            No FAQs yet. Generate or add them manually.
          </div>
        )}

        {/* Add New FAQ */}
        {isAddingNew ? (
          <div className="border rounded-lg p-3 bg-background space-y-2">
            <Label className="text-xs font-medium">Add New FAQ</Label>
            <Input
              value={newFaq.question}
              onChange={(e) => setNewFaq({ ...newFaq, question: e.target.value })}
              placeholder="Enter question..."
            />
            <Textarea
              value={newFaq.answer}
              onChange={(e) => setNewFaq({ ...newFaq, answer: e.target.value })}
              placeholder="Enter answer..."
              rows={3}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAddNewFaq}>
                <Save className="h-3 w-3 mr-1" />
                Save FAQ
              </Button>
              <Button size="sm" variant="outline" onClick={() => {
                setIsAddingNew(false);
                setNewFaq({ question: "", answer: "" });
              }}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full"
            onClick={() => setIsAddingNew(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Manual FAQ
          </Button>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
};
