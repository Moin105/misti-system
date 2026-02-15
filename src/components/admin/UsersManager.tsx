import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { refreshAdminData } from "@/lib/adminSupabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { format, formatDistanceToNow } from "date-fns";
import { Ban, UserCheck, Loader2, Search, X, ChevronDown, ChevronUp, Users, DollarSign, Gift, Clock } from "lucide-react";
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
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface UserStats {
  id: string;
  email: string;
  full_name: string | null;
  registration_date: string;
  is_banned: boolean;
  cashback_balance: number;
  total_lifetime_spending: number;
  referral_code: string | null;
  referred_by: string | null;
  total_referrals: number;
  referral_earnings: number;
  total_spent: number;
  paid_amount: number;
  total_coupon_discount: number;
  total_cashback_used: number;
  total_referral_discount: number;
  order_count: number;
  recent_purchase_date: string | null;
  recent_order_number: string | null;
  last_sign_in_at: string | null;
}

const UsersManager = () => {
  const [users, setUsers] = useState<UserStats[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserStats | null>(null);
  const [showBanDialog, setShowBanDialog] = useState(false);
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState({
    email: "",
    name: "",
    minSpent: "",
    maxSpent: "",
  });
  const { toast } = useToast();

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase.rpc("get_admin_user_stats");

      if (error) throw error;
      
      // Sort by registration_date descending
      const sortedData = (data || []).sort((a: UserStats, b: UserStats) => 
        new Date(b.registration_date).getTime() - new Date(a.registration_date).getTime()
      );
      
      setUsers(sortedData);
      setFilteredUsers(sortedData);
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

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, users]);

  const applyFilters = () => {
    let filtered = [...users];

    if (filters.email) {
      filtered = filtered.filter((user) =>
        user.email.toLowerCase().includes(filters.email.toLowerCase())
      );
    }

    if (filters.name) {
      filtered = filtered.filter((user) =>
        user.full_name?.toLowerCase().includes(filters.name.toLowerCase())
      );
    }

    if (filters.minSpent) {
      filtered = filtered.filter(
        (user) => Number(user.total_spent) >= Number(filters.minSpent)
      );
    }

    if (filters.maxSpent) {
      filtered = filtered.filter(
        (user) => Number(user.total_spent) <= Number(filters.maxSpent)
      );
    }

    setFilteredUsers(filtered);
  };

  const clearFilters = () => {
    setFilters({
      email: "",
      name: "",
      minSpent: "",
      maxSpent: "",
    });
  };

  const handleBanToggle = async (user: UserStats) => {
    setActionLoading(user.id);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ is_banned: !user.is_banned })
        .eq("id", user.id);

      if (error) throw error;

      await refreshAdminData(['/rest/v1/profiles'], ['users', 'profiles']);
      toast({
        title: "Success",
        description: `User ${user.is_banned ? "unbanned" : "banned"} successfully`,
      });

      await fetchUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
      setShowBanDialog(false);
      setSelectedUser(null);
    }
  };

  const openBanDialog = (user: UserStats) => {
    setSelectedUser(user);
    setShowBanDialog(true);
  };

  const toggleExpanded = (userId: string) => {
    setExpandedUsers(prev => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  // Calculate summary stats
  const summaryStats = {
    totalUsers: users.length,
    totalRevenue: users.reduce((sum, u) => sum + Number(u.paid_amount || 0), 0),
    totalCashbackGiven: users.reduce((sum, u) => sum + Number(u.total_cashback_used || 0), 0),
    activeToday: users.filter(u => u.last_sign_in_at && 
      new Date(u.last_sign_in_at).toDateString() === new Date().toDateString()
    ).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">User Management</h2>
          <div className="flex gap-2">
            <Button onClick={clearFilters} variant="outline" size="sm">
              <X className="w-4 h-4 mr-2" />
              Clear Filters
            </Button>
            <Button onClick={fetchUsers} variant="outline" size="sm">
              Refresh
            </Button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                  <p className="text-2xl font-bold">{summaryStats.totalUsers}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold">${summaryStats.totalRevenue.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/10 rounded-lg">
                  <Gift className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cashback Used</p>
                  <p className="text-2xl font-bold">${summaryStats.totalCashbackGiven.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Clock className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active Today</p>
                  <p className="text-2xl font-bold">{summaryStats.activeToday}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search email..."
                value={filters.email}
                onChange={(e) => setFilters({ ...filters, email: e.target.value })}
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Name</label>
            <Input
              placeholder="Search name..."
              value={filters.name}
              onChange={(e) => setFilters({ ...filters, name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Min Spent</label>
            <Input
              type="number"
              placeholder="Min $"
              value={filters.minSpent}
              onChange={(e) => setFilters({ ...filters, minSpent: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Max Spent</label>
            <Input
              type="number"
              placeholder="Max $"
              value={filters.maxSpent}
              onChange={(e) => setFilters({ ...filters, maxSpent: e.target.value })}
            />
          </div>
        </div>

        <div className="text-sm text-muted-foreground">
          Showing {filteredUsers.length} of {users.length} users
        </div>

        {/* User Cards */}
        <div className="space-y-3">
          {filteredUsers.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No users found
              </CardContent>
            </Card>
          ) : (
            filteredUsers.map((user) => (
              <Collapsible
                key={user.id}
                open={expandedUsers.has(user.id)}
                onOpenChange={() => toggleExpanded(user.id)}
              >
                <Card className={user.is_banned ? "border-destructive/50" : ""}>
                  <CollapsibleTrigger asChild>
                    <CardContent className="py-4 cursor-pointer hover:bg-muted/30 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          {/* User Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium truncate">{user.email}</span>
                              {user.is_banned && (
                                <Badge variant="destructive" className="text-xs">Banned</Badge>
                              )}
                              {user.total_referrals > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  {user.total_referrals} referrals
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                              <span>{user.full_name || "No name"}</span>
                              <span>•</span>
                              <span>Joined {format(new Date(user.registration_date), "MMM d, yyyy")}</span>
                              {user.last_sign_in_at && (
                                <>
                                  <span>•</span>
                                  <span>Last seen {formatDistanceToNow(new Date(user.last_sign_in_at), { addSuffix: true })}</span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Quick Stats */}
                          <div className="hidden md:flex items-center gap-6 text-sm">
                            <div className="text-center">
                              <p className="font-semibold">${Number(user.paid_amount || 0).toFixed(2)}</p>
                              <p className="text-xs text-muted-foreground">Paid</p>
                            </div>
                            <div className="text-center">
                              <p className="font-semibold">{user.order_count || 0}</p>
                              <p className="text-xs text-muted-foreground">Orders</p>
                            </div>
                            <div className="text-center">
                              <p className="font-semibold text-green-600">${Number(user.cashback_balance || 0).toFixed(2)}</p>
                              <p className="text-xs text-muted-foreground">Balance</p>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            <Button
                              variant={user.is_banned ? "outline" : "destructive"}
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                openBanDialog(user);
                              }}
                              disabled={actionLoading === user.id}
                            >
                              {actionLoading === user.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : user.is_banned ? (
                                <UserCheck className="w-4 h-4" />
                              ) : (
                                <Ban className="w-4 h-4" />
                              )}
                            </Button>
                            {expandedUsers.has(user.id) ? (
                              <ChevronUp className="w-5 h-5 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <CardContent className="pt-0 pb-4 border-t">
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-4">
                        {/* Financial Details */}
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Orders Value</p>
                          <p className="text-lg font-semibold">${Number(user.total_spent || 0).toFixed(2)}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground uppercase tracking-wider">Paid (Completed)</p>
                          <p className="text-lg font-semibold text-green-600">${Number(user.paid_amount || 0).toFixed(2)}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground uppercase tracking-wider">Lifetime Spending</p>
                          <p className="text-lg font-semibold">${Number(user.total_lifetime_spending || 0).toFixed(2)}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground uppercase tracking-wider">Order Count</p>
                          <p className="text-lg font-semibold">{user.order_count || 0}</p>
                        </div>

                        {/* Discounts Used */}
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground uppercase tracking-wider">Coupons Used</p>
                          <p className="text-lg font-semibold text-orange-600">${Number(user.total_coupon_discount || 0).toFixed(2)}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground uppercase tracking-wider">Cashback Used</p>
                          <p className="text-lg font-semibold text-orange-600">${Number(user.total_cashback_used || 0).toFixed(2)}</p>
                        </div>

                        {/* Cashback & Referrals */}
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground uppercase tracking-wider">Cashback Balance</p>
                          <p className="text-lg font-semibold text-green-600">${Number(user.cashback_balance || 0).toFixed(2)}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground uppercase tracking-wider">Referral Code</p>
                          <p className="text-lg font-semibold font-mono">{user.referral_code || "-"}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Referrals</p>
                          <p className="text-lg font-semibold">{user.total_referrals || 0}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground uppercase tracking-wider">Referral Earnings</p>
                          <p className="text-lg font-semibold text-purple-600">${Number(user.referral_earnings || 0).toFixed(2)}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground uppercase tracking-wider">Referral Discounts</p>
                          <p className="text-lg font-semibold text-purple-600">${Number(user.total_referral_discount || 0).toFixed(2)}</p>
                        </div>

                        {/* Last Order */}
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground uppercase tracking-wider">Last Order</p>
                          {user.recent_purchase_date ? (
                            <div>
                              <p className="font-semibold">{format(new Date(user.recent_purchase_date), "MMM d, yyyy")}</p>
                              <p className="text-xs text-muted-foreground font-mono">{user.recent_order_number}</p>
                            </div>
                          ) : (
                            <p className="text-lg font-semibold text-muted-foreground">-</p>
                          )}
                        </div>
                      </div>

                      {/* Last Sign In */}
                      {user.last_sign_in_at && (
                        <div className="mt-4 pt-4 border-t">
                          <p className="text-sm text-muted-foreground">
                            <span className="font-medium">Last Login:</span>{" "}
                            {format(new Date(user.last_sign_in_at), "MMMM d, yyyy 'at' h:mm a")}
                            {" "}({formatDistanceToNow(new Date(user.last_sign_in_at), { addSuffix: true })})
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))
          )}
        </div>
      </div>

      <AlertDialog open={showBanDialog} onOpenChange={setShowBanDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedUser?.is_banned ? "Unban User" : "Ban User"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedUser?.is_banned
                ? `Are you sure you want to unban ${selectedUser?.email}? They will regain access to the platform.`
                : `Are you sure you want to ban ${selectedUser?.email}? They will lose access to the platform.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedUser && handleBanToggle(selectedUser)}
              className={selectedUser?.is_banned ? "" : "bg-destructive hover:bg-destructive/90"}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default UsersManager;