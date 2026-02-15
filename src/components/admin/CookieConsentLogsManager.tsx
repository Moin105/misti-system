import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Download } from "lucide-react";
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
import { format } from "date-fns";

interface ConsentLog {
  id: string;
  user_id: string | null;
  session_id: string;
  ip_hash: string | null;
  consent_preferences: Record<string, boolean>;
  consent_timestamp: string;
}

export default function CookieConsentLogsManager() {
  const { data: logs, isLoading } = useQuery({
    queryKey: ["cookie-consent-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cookie_consent_logs")
        .select("*")
        .order("consent_timestamp", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as ConsentLog[];
    },
  });

  const exportLogs = () => {
    if (!logs) return;
    
    const csv = [
      ["Timestamp", "User ID", "Session ID", "IP Hash", "Consent Preferences"].join(","),
      ...logs.map((log) =>
        [
          format(new Date(log.consent_timestamp), "yyyy-MM-dd HH:mm:ss"),
          log.user_id || "Anonymous",
          log.session_id,
          log.ip_hash || "N/A",
          JSON.stringify(log.consent_preferences),
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cookie-consent-logs-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Cookie Consent Logs</h2>
          <p className="text-muted-foreground">
            View user consent preferences and timestamps (GDPR compliance)
          </p>
        </div>
        <Button onClick={exportLogs} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export Logs
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Session ID</TableHead>
              <TableHead>Consent Preferences</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs?.map((log) => (
              <TableRow key={log.id}>
                <TableCell>
                  {format(new Date(log.consent_timestamp), "MMM dd, yyyy HH:mm")}
                </TableCell>
                <TableCell>
                  {log.user_id ? (
                    <span className="text-xs font-mono">{log.user_id.substring(0, 8)}...</span>
                  ) : (
                    <Badge variant="secondary">Anonymous</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <span className="text-xs font-mono">{log.session_id.substring(0, 12)}...</span>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(log.consent_preferences).map(([key, value]) => (
                      <Badge
                        key={key}
                        variant={value ? "default" : "secondary"}
                      >
                        {key}: {value ? "✓" : "✗"}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
