import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { refreshAdminData } from "@/lib/adminSupabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Users, DollarSign, TrendingUp } from "lucide-react";

interface ReferralConfig {
  id: string;
  referrer_percentage: number;
  referee_discount_percentage: number;
  min_order_amount: number;
  is_active: boolean;
}

interface ReferralTransaction {
  id: string;
  referrer_id: string;
  referee_id: string;
  order_id: string | null;
  reward_amount: number;
  referee_discount: number;
  status: string;
  created_at: string;
  referrer_email?: string;
  referee_email?: string;
}

interface ReferralStats {
  total_referrals: number;
  total_rewards_paid: number;
  active_referrers: number;
  conversion_rate: number;
}

export const ReferralManager = () => {
  const [config, setConfig] = useState<ReferralConfig | null>(null);
  const [transactions, setTransactions] = useState<ReferralTransaction[]>([]);
  const [stats, setStats] = useState<ReferralStats>({
    total_referrals: 0,
    total_rewards_paid: 0,
    active_referrers: 0,
    conversion_rate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load config
      const { data: configData } = await supabase
        .from("referral_config")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (configData) {
        setConfig(configData);
      }

      // Load transactions with profile emails
      const { data: txns } = await supabase
        .from("referral_transactions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (txns) {
        // Fetch emails for referrers and referees
        const userIds = [...new Set([...txns.map(t => t.referrer_id), ...txns.map(t => t.referee_id)])];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, email")
          .in("id", userIds);

        const emailMap = new Map(profiles?.map(p => [p.id, p.email]) || []);
        
        const enrichedTxns = txns.map(tx => ({
          ...tx,
          referrer_email: emailMap.get(tx.referrer_id) || "Unknown",
          referee_email: emailMap.get(tx.referee_id) || "Unknown",
        }));
        
        setTransactions(enrichedTxns);
      }

      // Calculate stats
      const { data: statsData } = await supabase
        .from("referral_transactions")
        .select("referrer_id, reward_amount, status");

      if (statsData) {
        const completed = statsData.filter(t => t.status === "completed");
        const uniqueReferrers = new Set(statsData.map(t => t.referrer_id));
        setStats({
          total_referrals: statsData.length,
          total_rewards_paid: completed.reduce((sum, t) => sum + Number(t.reward_amount), 0),
          active_referrers: uniqueReferrers.size,
          conversion_rate: statsData.length > 0 ? (completed.length / statsData.length) * 100 : 0,
        });
      }
    } catch (error) {
      console.error("Error loading referral data:", error);
      toast({
        title: "Error",
        description: "Failed to load referral data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from("referral_config")
        .update({
          referrer_percentage: config.referrer_percentage,
          referee_discount_percentage: config.referee_discount_percentage,
          min_order_amount: config.min_order_amount,
          is_active: config.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq("id", config.id);

      if (error) throw error;

      await refreshAdminData(['/rest/v1/referral_config'], ['referral-config']);
      toast({
        title: "Success",
        description: "Referral settings saved",
      });
    } catch (error) {
      console.error("Error saving config:", error);
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Referral Program</h2>
        <p className="text-muted-foreground">Configure and monitor the referral program</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <div className="text-2xl font-bold">{stats.total_referrals}</div>
                <div className="text-sm text-muted-foreground">Total Referrals</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <DollarSign className="h-8 w-8 text-green-500" />
              <div>
                <div className="text-2xl font-bold">${stats.total_rewards_paid.toFixed(2)}</div>
                <div className="text-sm text-muted-foreground">Rewards Paid</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Users className="h-8 w-8 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{stats.active_referrers}</div>
                <div className="text-sm text-muted-foreground">Active Referrers</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <TrendingUp className="h-8 w-8 text-purple-500" />
              <div>
                <div className="text-2xl font-bold">{stats.conversion_rate.toFixed(1)}%</div>
                <div className="text-sm text-muted-foreground">Conversion Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Referral Settings</CardTitle>
          <CardDescription>Configure reward percentages and program status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Program Active</Label>
              <p className="text-sm text-muted-foreground">Enable or disable the referral program</p>
            </div>
            <Switch
              checked={config?.is_active || false}
              onCheckedChange={(checked) => setConfig(prev => prev ? { ...prev, is_active: checked } : null)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="referrer_percentage">Referrer Reward (%)</Label>
              <Input
                id="referrer_percentage"
                type="number"
                min="0"
                max="50"
                step="0.5"
                value={config?.referrer_percentage || 0}
                onChange={(e) => setConfig(prev => prev ? { ...prev, referrer_percentage: parseFloat(e.target.value) || 0 } : null)}
              />
              <p className="text-xs text-muted-foreground">Cashback % for the referrer</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="referee_discount">Referee Discount (%)</Label>
              <Input
                id="referee_discount"
                type="number"
                min="0"
                max="50"
                step="0.5"
                value={config?.referee_discount_percentage || 0}
                onChange={(e) => setConfig(prev => prev ? { ...prev, referee_discount_percentage: parseFloat(e.target.value) || 0 } : null)}
              />
              <p className="text-xs text-muted-foreground">Discount % for new user's first order</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="min_order">Minimum Order Amount ($)</Label>
              <Input
                id="min_order"
                type="number"
                min="0"
                step="1"
                value={config?.min_order_amount || 0}
                onChange={(e) => setConfig(prev => prev ? { ...prev, min_order_amount: parseFloat(e.target.value) || 0 } : null)}
              />
              <p className="text-xs text-muted-foreground">Min order for referral to count</p>
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4" />
            Save Settings
          </Button>
        </CardContent>
      </Card>

      {/* Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Referral Activity</CardTitle>
          <CardDescription>Track all referral transactions</CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No referral transactions yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Referrer</TableHead>
                  <TableHead>Referee</TableHead>
                  <TableHead>Reward</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell>{new Date(tx.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="font-mono text-sm">{tx.referrer_email}</TableCell>
                    <TableCell className="font-mono text-sm">{tx.referee_email}</TableCell>
                    <TableCell className="font-medium">${Number(tx.reward_amount).toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={tx.status === "completed" ? "default" : tx.status === "pending" ? "secondary" : "destructive"}>
                        {tx.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ReferralManager;
