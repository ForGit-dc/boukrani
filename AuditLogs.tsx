import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ScrollText } from "lucide-react";

interface AuditLog {
  id: string;
  timestamp: string;
  table_name: string;
  operation: string;
  session_id?: string;
  user_id?: string;
  metadata?: any;
}

export function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session");

      const { data, error } = await supabase.functions.invoke('admin-list', {
        body: { resource: 'audit_logs', pageSize: 100 },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;
      setLogs(data?.logs || []);
    } catch (error: any) {
      toast({
        title: "Failed to load audit logs",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <ScrollText className="h-5 w-5" />
          Audit Logs (Last 100)
        </CardTitle>
        <Button onClick={fetchLogs} variant="outline" size="sm">
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b">
              <tr>
                <th className="text-left p-2 font-medium text-sm">Timestamp</th>
                <th className="text-left p-2 font-medium text-sm">Table</th>
                <th className="text-left p-2 font-medium text-sm">Operation</th>
                <th className="text-left p-2 font-medium text-sm">Session ID</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="text-center p-4 text-muted-foreground">Loading...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center p-4 text-muted-foreground">No logs found</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="border-b hover:bg-muted/50">
                    <td className="p-2 text-xs">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="p-2 text-xs font-medium">{log.table_name}</td>
                    <td className="p-2 text-xs">
                      <span className={`px-2 py-1 rounded text-xs ${
                        log.operation === 'INSERT' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                        log.operation === 'UPDATE' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                        log.operation === 'DELETE' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                      }`}>
                        {log.operation}
                      </span>
                    </td>
                    <td className="p-2 text-xs text-muted-foreground">
                      {log.session_id?.slice(0, 8) || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}