import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Sparkles, ChevronDown, ChevronUp, Check, Edit, Trash2, RefreshCw, Gift } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { sanitizeHtml } from "@/lib/sanitize";
import { env } from "@/lib/env";

interface ProductReward {
  id: string;
  product_id: string;
  rewards_content: string;
  is_approved: boolean;
  generated_at: string;
  approved_at: string | null;
}

interface InlineRewardsGeneratorProps {
  productId: string;
  productName: string;
}

export const InlineRewardsGenerator = ({ productId, productName }: InlineRewardsGeneratorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [existingReward, setExistingReward] = useState<ProductReward | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (productId) {
      fetchExistingReward();
    }
  }, [productId]);

  const fetchExistingReward = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('product_rewards')
      .select('*')
      .eq('product_id', productId)
      .maybeSingle();

    if (!error && data) {
      setExistingReward(data);
      setEditContent(data.rewards_content);
    } else {
      setExistingReward(null);
    }
    setLoading(false);
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Not authenticated');
        return;
      }

      const response = await fetch(
        `${env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-product-rewards`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            scope: 'product',
            productId,
            dryRun: false,
            regenerate: !!existingReward,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Generation failed');
      }

      const result = await response.json();
      
      if (result.generated > 0) {
        toast.success('Rewards generated successfully');
        await fetchExistingReward();
      } else if (result.skipped > 0) {
        toast.info('Reward already exists. Enable regenerate to replace.');
      } else {
        toast.error('No rewards were generated');
      }
    } catch (error: any) {
      console.error('Generation error:', error);
      toast.error(error.message || 'Failed to generate rewards');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApprove = async () => {
    if (!existingReward) return;
    
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('product_rewards')
      .update({
        is_approved: true,
        approved_at: new Date().toISOString(),
        approved_by: user?.id,
      })
      .eq('id', existingReward.id);

    if (error) {
      toast.error('Failed to approve reward');
    } else {
      toast.success('Reward approved and published');
      await fetchExistingReward();
    }
  };

  const handleSaveEdit = async () => {
    if (!existingReward) return;
    
    const { error } = await supabase
      .from('product_rewards')
      .update({ rewards_content: editContent })
      .eq('id', existingReward.id);

    if (error) {
      toast.error('Failed to update reward');
    } else {
      toast.success('Reward updated');
      setIsEditing(false);
      await fetchExistingReward();
    }
  };

  const handleDelete = async () => {
    if (!existingReward || !confirm('Are you sure you want to delete this reward?')) return;
    
    const { error } = await supabase
      .from('product_rewards')
      .delete()
      .eq('id', existingReward.id);

    if (error) {
      toast.error('Failed to delete reward');
    } else {
      toast.success('Reward deleted');
      setExistingReward(null);
      setIsEditing(false);
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
            <Gift className="h-5 w-5 text-primary" />
            <span className="font-medium">AI Rewards Generator</span>
            {existingReward && (
              <Badge variant={existingReward.is_approved ? "default" : "secondary"}>
                {existingReward.is_approved ? "Published" : "Pending"}
              </Badge>
            )}
          </div>
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="px-4 pb-4 space-y-4">
        <div className="text-sm text-muted-foreground">
          Generate "What You Get" rewards section for this product using AI.
        </div>

        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : existingReward ? (
          <div className="space-y-3">
            {isEditing ? (
              <div className="space-y-2">
                <Label>Edit Rewards Content</Label>
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={8}
                  className="font-mono text-sm"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveEdit}>
                    Save Changes
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => {
                    setIsEditing(false);
                    setEditContent(existingReward.rewards_content);
                  }}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="border rounded-lg p-3 bg-background">
                  <div 
                    className="prose prose-sm max-w-none text-foreground"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(existingReward.rewards_content) }}
                  />
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {!existingReward.is_approved && (
                    <Button size="sm" onClick={handleApprove}>
                      <Check className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={handleGenerate}
                    disabled={isGenerating}
                  >
                    {isGenerating ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-1" />
                    )}
                    Regenerate
                  </Button>
                  <Button size="sm" variant="destructive" onClick={handleDelete}>
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </>
            )}
          </div>
        ) : (
          <Button 
            onClick={handleGenerate} 
            disabled={isGenerating}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Rewards...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate "What You Get" Section
              </>
            )}
          </Button>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
};
