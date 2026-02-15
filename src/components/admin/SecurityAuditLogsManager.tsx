import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Loader2, Download, RefreshCw, AlertTriangle, CheckCircle, Info, ShieldAlert,
  Shield, Lock, DollarSign, Users, Settings, ChevronDown, ChevronRight, XCircle
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { format } from "date-fns";
import type { Json } from "@/integrations/supabase/types";

interface SecurityAuditLog {
  id: string;
  function_name: string;
  user_id: string | null;
  operation_details: Json;
  ip_address: string | null;
  created_at: string;
  severity: string | null;
  event_category: string | null;
  request_id: string | null;
  user_agent: string | null;
  error_code: string | null;
  error_message: string | null;
}

type Severity = "error" | "warning" | "success" | "info";
type Category = "authentication" | "financial" | "access_control" | "admin" | "system";

const ITEMS_PER_PAGE = 25;

const normalizeSeverity = (dbSeverity: string | null, functionName: string): Severity => {
  if (dbSeverity) {
    const normalized = dbSeverity.toLowerCase();
    if (normalized === "error" || normalized === "alert") return "error";
    if (normalized === "warning") return "warning";
    if (normalized === "success") return "success";
    return "info";
  }
  
  // Fallback to function name analysis
  const lowerName = functionName.toLowerCase();
  if (
    lowerName.includes("failed") ||
    lowerName.includes("locked") ||
    lowerName.includes("error") ||
    lowerName.includes("blocked") ||
    lowerName.includes("unauthorized")
  ) {
    return "error";
  }
  if (
    lowerName.includes("warning") ||
    lowerName.includes("invalid") ||
    lowerName.includes("denied") ||
    lowerName.includes("expired")
  ) {
    return "warning";
  }
  if (
    lowerName.includes("success") ||
    lowerName.includes("verified") ||
    lowerName.includes("completed") ||
    lowerName.includes("granted")
  ) {
    return "success";
  }
  return "info";
};

const SeverityBadge = ({ severity }: { severity: Severity }) => {
  const variants: Record<Severity, { variant: "destructive" | "warning" | "success" | "secondary"; icon: typeof AlertTriangle }> = {
    error: { variant: "destructive", icon: ShieldAlert },
    warning: { variant: "warning", icon: AlertTriangle },
    success: { variant: "success", icon: CheckCircle },
    info: { variant: "secondary", icon: Info },
  };

  const { variant, icon: Icon } = variants[severity];

  return (
    <Badge variant={variant} className="gap-1">
      <Icon className="h-3 w-3" />
      {severity.charAt(0).toUpperCase() + severity.slice(1)}
    </Badge>
  );
};

const CategoryBadge = ({ category }: { category: string | null }) => {
  const categoryConfig: Record<string, { color: string; icon: typeof Shield; label: string }> = {
    authentication: { color: "bg-blue-500/20 text-blue-400 border-blue-500/50", icon: Lock, label: "Auth" },
    financial: { color: "bg-green-500/20 text-green-400 border-green-500/50", icon: DollarSign, label: "Financial" },
    access_control: { color: "bg-orange-500/20 text-orange-400 border-orange-500/50", icon: Shield, label: "Access" },
    admin: { color: "bg-purple-500/20 text-purple-400 border-purple-500/50", icon: Users, label: "Admin" },
    system: { color: "bg-gray-500/20 text-gray-400 border-gray-500/50", icon: Settings, label: "System" },
    mfa: { color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/50", icon: Shield, label: "MFA" },
    password: { color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/50", icon: Lock, label: "Password" },
  };

  // Auto-detect category if not explicitly set
  const detectedCategory = category || "system";
  const config = categoryConfig[detectedCategory] || categoryConfig.system;
  const Icon = config.icon;

  return (
    <Badge className={`gap-1 ${config.color} border`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
};

export default function SecurityAuditLogsManager() {
  const [page, setPage] = useState(1);
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [userIdFilter, setUserIdFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Fetch logs with pagination
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["security-audit-logs", page, eventTypeFilter, severityFilter, categoryFilter, userIdFilter, dateFrom, dateTo],
    queryFn: async () => {
      let query = supabase
        .from("security_audit_log")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE - 1);

      if (eventTypeFilter !== "all") {
        query = query.ilike("function_name", `%${eventTypeFilter}%`);
      }

      if (severityFilter !== "all") {
        query = query.eq("severity", severityFilter);
      }

      if (categoryFilter !== "all") {
        query = query.eq("event_category", categoryFilter);
      }

      if (userIdFilter.trim()) {
        query = query.ilike("user_id", `%${userIdFilter.trim()}%`);
      }

      if (dateFrom) {
        query = query.gte("created_at", new Date(dateFrom).toISOString());
      }

      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        query = query.lte("created_at", endDate.toISOString());
      }

      const { data, error, count } = await query;

      if (error) throw error;
      return { logs: data as SecurityAuditLog[], totalCount: count || 0 };
    },
  });

  // Fetch enhanced stats for summary cards
  const { data: stats } = useQuery({
    queryKey: ["security-audit-stats-enhanced"],
    queryFn: async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Get logs from last 24 hours
      const { data: recentLogs, error } = await supabase
        .from("security_audit_log")
        .select("function_name, user_id, severity, event_category, created_at, ip_address")
        .gte("created_at", yesterday.toISOString());

      if (error) throw error;

      const totalEvents = recentLogs?.length || 0;
      
      // Count by severity
      const errorEvents = recentLogs?.filter((log) => {
        const sev = normalizeSeverity(log.severity, log.function_name);
        return sev === "error";
      }).length || 0;

      const warningEvents = recentLogs?.filter((log) => {
        const sev = normalizeSeverity(log.severity, log.function_name);
        return sev === "warning";
      }).length || 0;

      // Failed logins in last hour
      const failedLoginsLastHour = recentLogs?.filter((log) => {
        const isLoginFail = log.function_name.toLowerCase().includes("login") && 
                           log.function_name.toLowerCase().includes("failed");
        const isRecent = new Date(log.created_at) >= oneHourAgo;
        return isLoginFail && isRecent;
      }).length || 0;

      // Failed MFA attempts in last hour
      const failedMFALastHour = recentLogs?.filter((log) => {
        const isMFAFail = log.function_name.toLowerCase().includes("mfa") && 
                         log.function_name.toLowerCase().includes("failed");
        const isRecent = new Date(log.created_at) >= oneHourAgo;
        return isMFAFail && isRecent;
      }).length || 0;

      // Password resets today
      const passwordResetsToday = recentLogs?.filter((log) => {
        return log.function_name.toLowerCase().includes("password_reset");
      }).length || 0;

      // New signups today
      const signupsToday = recentLogs?.filter((log) => {
        return log.function_name.toLowerCase().includes("signup_success");
      }).length || 0;

      // Unique IPs with failed attempts
      const failedAttemptIPs = new Set(
        recentLogs?.filter((log) => {
          const sev = normalizeSeverity(log.severity, log.function_name);
          return sev === "error" && log.ip_address;
        }).map(l => l.ip_address)
      ).size;

      // Category breakdown with better detection
      const categoryBreakdown: Record<string, number> = {};
      recentLogs?.forEach((log) => {
        let cat = log.event_category || "system";
        // Improve category detection
        const fn = log.function_name.toLowerCase();
        if (fn.includes("mfa") || fn.includes("2fa")) cat = "mfa";
        else if (fn.includes("password")) cat = "password";
        else if (fn.includes("login") || fn.includes("signup") || fn.includes("logout")) cat = "authentication";
        else if (fn.includes("checkout") || fn.includes("payment") || fn.includes("cashback")) cat = "financial";
        
        categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + 1;
      });

      const uniqueUsers = new Set(recentLogs?.filter(l => l.user_id).map((l) => l.user_id)).size;

      // Most common event
      const eventCounts: Record<string, number> = {};
      recentLogs?.forEach((log) => {
        eventCounts[log.function_name] = (eventCounts[log.function_name] || 0) + 1;
      });
      const topEvent = Object.entries(eventCounts).sort((a, b) => b[1] - a[1])[0];

      return {
        totalEvents,
        errorEvents,
        warningEvents,
        uniqueUsers,
        failedLoginsLastHour,
        failedMFALastHour,
        passwordResetsToday,
        signupsToday,
        failedAttemptIPs,
        categoryBreakdown,
        topEvent: topEvent ? { name: topEvent[0], count: topEvent[1] } : null,
      };
    },
    staleTime: 30 * 1000, // 30 seconds
  });

  // Fetch unique event types for filter dropdown
  const { data: eventTypes } = useQuery({
    queryKey: ["security-event-types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("security_audit_log")
        .select("function_name")
        .limit(500);

      if (error) throw error;

      const uniqueTypes = [...new Set(data?.map((d) => d.function_name))].sort();
      return uniqueTypes;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const exportLogs = async () => {
    let query = supabase
      .from("security_audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000);

    if (eventTypeFilter !== "all") {
      query = query.ilike("function_name", `%${eventTypeFilter}%`);
    }
    if (severityFilter !== "all") {
      query = query.eq("severity", severityFilter);
    }
    if (categoryFilter !== "all") {
      query = query.eq("event_category", categoryFilter);
    }
    if (userIdFilter.trim()) {
      query = query.ilike("user_id", `%${userIdFilter.trim()}%`);
    }
    if (dateFrom) {
      query = query.gte("created_at", new Date(dateFrom).toISOString());
    }
    if (dateTo) {
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999);
      query = query.lte("created_at", endDate.toISOString());
    }

    const { data: exportData } = await query;
    if (!exportData) return;

    const csv = [
      ["Timestamp", "Event Type", "Severity", "Category", "User ID", "IP Address", "Error Code", "Error Message", "Details"].join(","),
      ...exportData.map((log: SecurityAuditLog) =>
        [
          format(new Date(log.created_at), "yyyy-MM-dd HH:mm:ss"),
          `"${log.function_name}"`,
          log.severity || "info",
          log.event_category || "system",
          log.user_id || "System",
          log.ip_address || "N/A",
          log.error_code || "",
          `"${(log.error_message || "").replace(/"/g, '""')}"`,
          `"${JSON.stringify(log.operation_details).replace(/"/g, '""')}"`,
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `security-audit-logs-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const totalPages = Math.ceil((data?.totalCount || 0) / ITEMS_PER_PAGE);

  const clearFilters = () => {
    setEventTypeFilter("all");
    setSeverityFilter("all");
    setCategoryFilter("all");
    setUserIdFilter("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Security Audit Logs</h2>
          <p className="text-muted-foreground">
            Monitor authentication, access, and security events in real-time
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => refetch()} variant="outline" disabled={isFetching}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={exportLogs} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Enhanced Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Last 24 Hours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalEvents || 0}</div>
            <p className="text-xs text-muted-foreground">Total security events</p>
          </CardContent>
        </Card>

        <Card className={stats?.errorEvents && stats.errorEvents > 0 ? "border-destructive" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <XCircle className="h-4 w-4 text-destructive" />
              Errors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats?.errorEvents && stats.errorEvents > 0 ? "text-destructive" : ""}`}>
              {stats?.errorEvents || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.warningEvents || 0} warnings
            </p>
          </CardContent>
        </Card>

        <Card className={stats?.failedLoginsLastHour && stats.failedLoginsLastHour > 5 ? "border-orange-500" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Lock className="h-4 w-4 text-orange-400" />
              Failed Logins (1h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats?.failedLoginsLastHour && stats.failedLoginsLastHour > 5 ? "text-orange-400" : ""}`}>
              {stats?.failedLoginsLastHour || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.failedAttemptIPs || 0} unique IPs with failures
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Active Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.uniqueUsers || 0}</div>
            <p className="text-xs text-muted-foreground">Unique users in 24h</p>
          </CardContent>
        </Card>
      </div>

      {/* Security Alerts Panel - Only shows when there are concerning patterns */}
      {(stats?.failedLoginsLastHour && stats.failedLoginsLastHour > 5) || 
       (stats?.failedMFALastHour && stats.failedMFALastHour > 3) ||
       (stats?.errorEvents && stats.errorEvents > 10) ? (
        <Card className="border-destructive bg-destructive/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-destructive flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" />
              Security Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats?.failedLoginsLastHour && stats.failedLoginsLastHour > 5 && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <span>High number of failed login attempts ({stats.failedLoginsLastHour}) in the last hour</span>
                </div>
              )}
              {stats?.failedMFALastHour && stats.failedMFALastHour > 3 && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Multiple failed MFA attempts ({stats.failedMFALastHour}) in the last hour</span>
                </div>
              )}
              {stats?.errorEvents && stats.errorEvents > 10 && (
                <div className="flex items-center gap-2 text-sm text-orange-400">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Elevated error rate ({stats.errorEvents} errors) in the last 24 hours</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-cyan-400" />
              <span className="text-sm text-muted-foreground">Failed MFA (1h)</span>
            </div>
            <p className={`text-xl font-bold mt-1 ${stats?.failedMFALastHour && stats.failedMFALastHour > 3 ? "text-destructive" : ""}`}>
              {stats?.failedMFALastHour || 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-yellow-400" />
              <span className="text-sm text-muted-foreground">Password Resets</span>
            </div>
            <p className="text-xl font-bold mt-1">{stats?.passwordResetsToday || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-green-400" />
              <span className="text-sm text-muted-foreground">New Signups</span>
            </div>
            <p className="text-xl font-bold mt-1">{stats?.signupsToday || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Top Event</span>
            </div>
            <p className="text-sm font-medium mt-1 truncate" title={stats?.topEvent?.name}>
              {stats?.topEvent?.name?.replace(/_/g, " ") || "N/A"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown */}
      {stats?.categoryBreakdown && Object.keys(stats.categoryBreakdown).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Event Categories (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {Object.entries(stats.categoryBreakdown).map(([category, count]) => (
                <div key={category} className="flex items-center gap-2">
                  <CategoryBadge category={category} />
                  <span className="text-sm font-medium">{count as number}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enhanced Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium">Event Type</label>
              <Select value={eventTypeFilter} onValueChange={(v) => { setEventTypeFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All events" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Events</SelectItem>
                  {eventTypes?.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Severity</label>
              <Select value={severityFilter} onValueChange={(v) => { setSeverityFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="authentication">Auth</SelectItem>
                  <SelectItem value="financial">Financial</SelectItem>
                  <SelectItem value="access_control">Access</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                  <SelectItem value="mfa">MFA</SelectItem>
                  <SelectItem value="password">Password</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">User ID</label>
              <Input
                placeholder="Filter by user ID..."
                value={userIdFilter}
                onChange={(e) => { setUserIdFilter(e.target.value); setPage(1); }}
                className="w-[180px]"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">From Date</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                className="w-[150px]"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">To Date</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                className="w-[150px]"
              />
            </div>

            <Button variant="ghost" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Logs Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]"></TableHead>
              <TableHead className="w-[160px]">Timestamp</TableHead>
              <TableHead>Event Type</TableHead>
              <TableHead className="w-[100px]">Severity</TableHead>
              <TableHead className="w-[100px]">Category</TableHead>
              <TableHead className="w-[120px]">User</TableHead>
              <TableHead className="w-[100px]">IP</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.logs && data.logs.length > 0 ? (
              data.logs.map((log) => {
                const severity = normalizeSeverity(log.severity, log.function_name);
                const hasDetails = (log.operation_details && Object.keys(log.operation_details).length > 0) ||
                                   log.error_code || log.error_message || log.request_id || log.user_agent;
                const isExpanded = expandedRows.has(log.id);

                return (
                  <Collapsible key={log.id} open={isExpanded} onOpenChange={() => toggleRow(log.id)} asChild>
                    <>
                      <TableRow className={severity === "error" ? "bg-destructive/5" : severity === "warning" ? "bg-orange-500/5" : ""}>
                        <TableCell className="py-2">
                          {hasDetails && (
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              </Button>
                            </CollapsibleTrigger>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs py-2">
                          {format(new Date(log.created_at), "MMM dd, HH:mm:ss")}
                        </TableCell>
                        <TableCell className="py-2">
                          <span className="font-medium text-sm" title={log.function_name}>
                            {log.function_name.replace(/_/g, " ")}
                          </span>
                        </TableCell>
                        <TableCell className="py-2">
                          <SeverityBadge severity={severity} />
                        </TableCell>
                        <TableCell className="py-2">
                          <CategoryBadge category={log.event_category} />
                        </TableCell>
                        <TableCell className="py-2">
                          {log.user_id ? (
                            <span className="font-mono text-xs" title={log.user_id}>
                              {log.user_id.substring(0, 8)}...
                            </span>
                          ) : (
                            <Badge variant="secondary" className="text-xs">System</Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs py-2">
                          {log.ip_address || "—"}
                        </TableCell>
                      </TableRow>
                      {hasDetails && (
                        <CollapsibleContent asChild>
                          <tr>
                            <td colSpan={7} className="bg-muted/50 p-4 border-t-0">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Error Details */}
                                {(log.error_code || log.error_message) && (
                                  <div className="space-y-2">
                                    <h4 className="text-sm font-semibold text-destructive flex items-center gap-2">
                                      <XCircle className="h-4 w-4" />
                                      Error Details
                                    </h4>
                                    <div className="bg-destructive/10 p-3 rounded-md text-sm">
                                      {log.error_code && (
                                        <div className="flex gap-2">
                                          <span className="text-muted-foreground">Code:</span>
                                          <code className="font-mono text-destructive">{log.error_code}</code>
                                        </div>
                                      )}
                                      {log.error_message && (
                                        <div className="mt-1">
                                          <span className="text-muted-foreground">Message:</span>
                                          <p className="mt-1 text-foreground">{log.error_message}</p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Request Context */}
                                {(log.request_id || log.user_agent) && (
                                  <div className="space-y-2">
                                    <h4 className="text-sm font-semibold flex items-center gap-2">
                                      <Info className="h-4 w-4" />
                                      Request Context
                                    </h4>
                                    <div className="bg-muted p-3 rounded-md text-xs space-y-1">
                                      {log.request_id && (
                                        <div className="flex gap-2">
                                          <span className="text-muted-foreground">Request ID:</span>
                                          <code className="font-mono">{log.request_id}</code>
                                        </div>
                                      )}
                                      {log.user_agent && (
                                        <div className="flex gap-2">
                                          <span className="text-muted-foreground">User Agent:</span>
                                          <span className="truncate max-w-[300px]" title={log.user_agent}>
                                            {log.user_agent}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Operation Details */}
                                {log.operation_details && Object.keys(log.operation_details).length > 0 && (
                                  <div className="space-y-2 md:col-span-2">
                                    <h4 className="text-sm font-semibold">Operation Details</h4>
                                    <pre className="text-xs bg-background p-3 rounded-md overflow-auto max-h-[200px] border">
                                      {JSON.stringify(log.operation_details, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        </CollapsibleContent>
                      )}
                    </>
                  </Collapsible>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No security events found matching your filters
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {((page - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(page * ITEMS_PER_PAGE, data?.totalCount || 0)} of {data?.totalCount || 0} events
          </p>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                return (
                  <PaginationItem key={pageNum}>
                    <PaginationLink
                      onClick={() => setPage(pageNum)}
                      isActive={page === pageNum}
                      className="cursor-pointer"
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}
              <PaginationItem>
                <PaginationNext
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className={page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}
