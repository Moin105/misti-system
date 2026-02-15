import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { refreshAdminData } from "@/lib/adminSupabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Trash2, Plus, Save } from "lucide-react";

interface CashbackTier {
  id: string;
  name: string;
  min_spending: number;
  cashback_percentage: number;
  sort_order: number;
  is_active: boolean;
}

export const CashbackTiersManager = () => {
  const [tiers, setTiers] = useState<CashbackTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTier, setNewTier] = useState({
    name: "",
    min_spending: 0,
    cashback_percentage: 0,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchTiers();
  }, []);

  const fetchTiers = async () => {
    try {
      const { data, error } = await supabase
        .from("cashback_tiers")
        .select("*")
        .order("sort_order", { ascending: true });

      if (error) throw error;
      setTiers(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddTier = async () => {
    if (!newTier.name || newTier.cashback_percentage <= 0) {
      toast({
        title: "Validation Error",
        description: "Please fill in all fields correctly",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.from("cashback_tiers").insert([
        {
          ...newTier,
          sort_order: tiers.length + 1,
        },
      ]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Cashback tier added successfully",
      });

      await refreshAdminData(['/rest/v1/cashback_tiers'], ['cashback-tiers']);
      setNewTier({ name: "", min_spending: 0, cashback_percentage: 0 });
      fetchTiers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleUpdateTier = async (tier: CashbackTier) => {
    try {
      const { error } = await supabase
        .from("cashback_tiers")
        .update({
          name: tier.name,
          min_spending: tier.min_spending,
          cashback_percentage: tier.cashback_percentage,
          is_active: tier.is_active,
        })
        .eq("id", tier.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Tier updated successfully",
      });

      await refreshAdminData(['/rest/v1/cashback_tiers'], ['cashback-tiers']);
      fetchTiers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteTier = async (id: string) => {
    if (!confirm("Are you sure you want to delete this tier?")) return;

    try {
      const { error } = await supabase
        .from("cashback_tiers")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Tier deleted successfully",
      });

      await refreshAdminData(['/rest/v1/cashback_tiers'], ['cashback-tiers']);
      fetchTiers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Cashback Tiers Management</h2>
        <p className="text-muted-foreground">
          Configure reward tiers based on customer spending
        </p>
      </div>

      {/* Add New Tier */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Add New Tier</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label htmlFor="tier-name">Tier Name</Label>
            <Input
              id="tier-name"
              placeholder="e.g., Gold"
              value={newTier.name}
              onChange={(e) =>
                setNewTier({ ...newTier, name: e.target.value })
              }
            />
          </div>
          <div>
            <Label htmlFor="min-spending">Min Spending ($)</Label>
            <Input
              id="min-spending"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={newTier.min_spending}
              onChange={(e) =>
                setNewTier({
                  ...newTier,
                  min_spending: parseFloat(e.target.value) || 0,
                })
              }
            />
          </div>
          <div>
            <Label htmlFor="cashback-percentage">Cashback %</Label>
            <Input
              id="cashback-percentage"
              type="number"
              step="0.1"
              placeholder="1.0"
              value={newTier.cashback_percentage}
              onChange={(e) =>
                setNewTier({
                  ...newTier,
                  cashback_percentage: parseFloat(e.target.value) || 0,
                })
              }
            />
          </div>
          <div className="flex items-end">
            <Button onClick={handleAddTier} className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Add Tier
            </Button>
          </div>
        </div>
      </Card>

      {/* Existing Tiers */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Existing Tiers</h3>
        {tiers.map((tier) => (
          <Card key={tier.id} className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
              <div>
                <Label>Tier Name</Label>
                <Input
                  value={tier.name}
                  onChange={(e) =>
                    setTiers(
                      tiers.map((t) =>
                        t.id === tier.id ? { ...t, name: e.target.value } : t
                      )
                    )
                  }
                />
              </div>
              <div>
                <Label>Min Spending ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={tier.min_spending}
                  onChange={(e) =>
                    setTiers(
                      tiers.map((t) =>
                        t.id === tier.id
                          ? { ...t, min_spending: parseFloat(e.target.value) || 0 }
                          : t
                      )
                    )
                  }
                />
              </div>
              <div>
                <Label>Cashback %</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={tier.cashback_percentage}
                  onChange={(e) =>
                    setTiers(
                      tiers.map((t) =>
                        t.id === tier.id
                          ? {
                              ...t,
                              cashback_percentage: parseFloat(e.target.value) || 0,
                            }
                          : t
                      )
                    )
                  }
                />
              </div>
              <div>
                <Label>Status</Label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                  value={tier.is_active ? "active" : "inactive"}
                  onChange={(e) =>
                    setTiers(
                      tiers.map((t) =>
                        t.id === tier.id
                          ? { ...t, is_active: e.target.value === "active" }
                          : t
                      )
                    )
                  }
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleUpdateTier(tier)}
                  variant="outline"
                  className="flex-1"
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save
                </Button>
                <Button
                  onClick={() => handleDeleteTier(tier.id)}
                  variant="destructive"
                  size="icon"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
