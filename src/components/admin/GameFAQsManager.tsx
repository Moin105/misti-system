import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { refreshAdminData } from "@/lib/adminSupabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Eye, EyeOff, GripVertical, Sparkles } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface GameFAQ {
  id: string;
  game_id: string;
  question: string;
  answer: string;
  sort_order: number;
  is_active: boolean;
  generated_by: string;
}

interface Game {
  id: string;
  name: string;
}

interface PreviewFAQ {
  question: string;
  answer: string;
}

export const GameFAQsManager = () => {
  const [games, setGames] = useState<Game[]>([]);
  const [selectedGame, setSelectedGame] = useState<string>("");
  const [faqs, setFaqs] = useState<GameFAQ[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [faqToDelete, setFaqToDelete] = useState<string | null>(null);
  
  // AI Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [questionsCount, setQuestionsCount] = useState(6);
  const [regenerate, setRegenerate] = useState(false);
  const [dryRun, setDryRun] = useState(false);
  const [previewFAQs, setPreviewFAQs] = useState<PreviewFAQ[] | null>(null);

  useEffect(() => {
    fetchGames();
  }, []);

  useEffect(() => {
    if (selectedGame) {
      fetchFAQs(selectedGame);
      setPreviewFAQs(null);
    } else {
      setFaqs([]);
      setPreviewFAQs(null);
    }
  }, [selectedGame]);

  const fetchGames = async () => {
    const { data, error } = await supabase
      .from('games')
      .select('id, name')
      .eq('is_active', true)
      .order('name');

    if (error) {
      toast.error('Failed to fetch games');
      return;
    }

    setGames(data || []);
  };

  const fetchFAQs = async (gameId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('game_faqs')
      .select('*')
      .eq('game_id', gameId)
      .order('sort_order');

    if (error) {
      toast.error('Failed to fetch FAQs');
      setLoading(false);
      return;
    }

    setFaqs(data || []);
    setLoading(false);
  };

  const generateWithAI = async () => {
    if (!selectedGame) {
      toast.error('Please select a game first');
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error('You must be logged in to generate FAQs');
      return;
    }

    setIsGenerating(true);
    setPreviewFAQs(null);

    try {
      const accessToken = session.access_token;
      const { data, error } = await supabase.functions.invoke('generate-game-faqs', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: {
          gameId: selectedGame,
          questionsCount,
          regenerate,
          dryRun
        }
      });

      if (error) {
        if (error.message?.includes('429')) {
          toast.error('Rate limit exceeded. Please try again later.');
        } else if (error.message?.includes('402')) {
          toast.error('AI credits exhausted. Please add funds to continue.');
        } else {
          toast.error(`Failed to generate FAQs: ${error.message}`);
        }
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      if (dryRun && data?.faqs) {
        setPreviewFAQs(data.faqs);
        toast.success(`Preview: ${data.faqs.length} FAQs generated`);
      } else if (data?.generated) {
        toast.success(`Successfully generated ${data.generated} FAQs`);
        fetchFAQs(selectedGame);
      } else if (data?.skipped) {
        toast.info('FAQs already exist. Enable "Regenerate" to replace them.');
      }
    } catch (err) {
      console.error('AI generation error:', err);
      toast.error('Failed to generate FAQs. Check console for details.');
    } finally {
      setIsGenerating(false);
    }
  };

  const addFAQ = async () => {
    if (!selectedGame) {
      toast.error('Please select a game');
      return;
    }

    const maxSortOrder = Math.max(...faqs.map(f => f.sort_order), -1);

    const { error } = await supabase
      .from('game_faqs')
      .insert({
        game_id: selectedGame,
        question: 'New Question',
        answer: 'New Answer',
        sort_order: maxSortOrder + 1,
        generated_by: 'manual'
      });

    if (error) {
      toast.error('Failed to add FAQ');
      return;
    }

    toast.success('FAQ added');
    await refreshAdminData(['/rest/v1/game_faqs'], ['game-faqs']);
    fetchFAQs(selectedGame);
  };

  const updateFAQ = async (id: string, updates: Partial<GameFAQ>) => {
    const { error } = await supabase
      .from('game_faqs')
      .update(updates)
      .eq('id', id);

    if (error) {
      toast.error('Failed to update FAQ');
      return;
    }

    toast.success('FAQ updated');
    await refreshAdminData(['/rest/v1/game_faqs'], ['game-faqs']);
    fetchFAQs(selectedGame);
  };

  const confirmDeleteFAQ = (id: string) => {
    setFaqToDelete(id);
    setDeleteDialogOpen(true);
  };

  const deleteFAQ = async () => {
    if (!faqToDelete) return;

    const { error } = await supabase
      .from('game_faqs')
      .delete()
      .eq('id', faqToDelete);

    if (error) {
      toast.error('Failed to delete FAQ');
      return;
    }

    toast.success('FAQ deleted');
    await refreshAdminData(['/rest/v1/game_faqs'], ['game-faqs']);
    fetchFAQs(selectedGame);
    setDeleteDialogOpen(false);
    setFaqToDelete(null);
  };

  const moveFAQ = async (id: string, direction: 'up' | 'down') => {
    const index = faqs.findIndex(f => f.id === id);
    if (index === -1) return;
    
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= faqs.length) return;

    const currentFAQ = faqs[index];
    const swapFAQ = faqs[newIndex];

    await Promise.all([
      supabase.from('game_faqs').update({ sort_order: swapFAQ.sort_order }).eq('id', currentFAQ.id),
      supabase.from('game_faqs').update({ sort_order: currentFAQ.sort_order }).eq('id', swapFAQ.id)
    ]);

    fetchFAQs(selectedGame);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Game FAQs Manager</h2>
        <p className="text-muted-foreground">
          Manage FAQs for game pages to improve SEO with rich results
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Game</CardTitle>
          <CardDescription>
            Choose a game to manage its FAQs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex gap-4 items-end">
            <div className="flex-1 space-y-2">
              <Label>Game</Label>
              <Select value={selectedGame} onValueChange={setSelectedGame}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a game" />
                </SelectTrigger>
                <SelectContent>
                  {games.map((game) => (
                    <SelectItem key={game.id} value={game.id}>
                      {game.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={addFAQ} disabled={!selectedGame}>
              <Plus className="w-4 h-4 mr-2" />
              Add FAQ
            </Button>
            <Button 
              onClick={generateWithAI} 
              disabled={!selectedGame || isGenerating}
              variant="outline"
              className="border-primary/50 hover:bg-primary/10"
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              Generate with AI
            </Button>
          </div>

          {selectedGame && (
            <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
              <h4 className="font-medium text-sm">AI Generation Options</h4>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-sm">Number of Questions: {questionsCount}</Label>
                </div>
                <Slider
                  value={[questionsCount]}
                  onValueChange={(v) => setQuestionsCount(v[0])}
                  min={3}
                  max={10}
                  step={1}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Generate between 3-10 FAQ questions about the game
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm">Regenerate existing FAQs</Label>
                  <p className="text-xs text-muted-foreground">
                    Replace all existing AI-generated FAQs with new ones
                  </p>
                </div>
                <Switch checked={regenerate} onCheckedChange={setRegenerate} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm">Dry run (preview only)</Label>
                  <p className="text-xs text-muted-foreground">
                    Preview generated FAQs without saving them
                  </p>
                </div>
                <Switch checked={dryRun} onCheckedChange={setDryRun} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Card */}
      {previewFAQs && previewFAQs.length > 0 && (
        <Card className="border-primary/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              AI Generated Preview
            </CardTitle>
            <CardDescription>
              These FAQs are previews and have not been saved. Disable "Dry run" and generate again to save them.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {previewFAQs.map((faq, index) => (
              <div key={index} className="border rounded-lg p-4 bg-muted/20">
                <p className="font-medium mb-2">Q: {faq.question}</p>
                <p className="text-muted-foreground text-sm">A: {faq.answer}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : selectedGame && faqs.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No FAQs found for this game. Click "Add FAQ" to create one manually or "Generate with AI" to auto-generate.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <Card key={faq.id} className={!faq.is_active ? 'opacity-60' : ''}>
              <CardContent className="pt-4 space-y-4">
                <div className="flex items-start gap-4">
                  <div className="flex flex-col gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => moveFAQ(faq.id, 'up')}
                      disabled={index === 0}
                    >
                      <GripVertical className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex-1 space-y-4">
                    <div className="space-y-2">
                      <Label>Question</Label>
                      <Input
                        value={faq.question}
                        onChange={(e) => updateFAQ(faq.id, { question: e.target.value })}
                        placeholder="Enter question"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Answer</Label>
                      <Textarea
                        value={faq.answer}
                        onChange={(e) => updateFAQ(faq.id, { answer: e.target.value })}
                        placeholder="Enter answer"
                        rows={3}
                      />
                    </div>
                    {faq.generated_by && (
                      <p className="text-xs text-muted-foreground">
                        Generated by: {faq.generated_by}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={faq.is_active}
                        onCheckedChange={(checked) => updateFAQ(faq.id, { is_active: checked })}
                      />
                      {faq.is_active ? (
                        <Eye className="w-4 h-4 text-green-500" />
                      ) : (
                        <EyeOff className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => confirmDeleteFAQ(faq.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete FAQ?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the FAQ.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteFAQ} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default GameFAQsManager;