import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { AdminAuth } from "@/components/AdminAuth";
import { AdminManagement } from "@/components/AdminManagement";
import { CostTracking } from "@/components/CostTracking";
import { AuditLogs } from "@/components/AuditLogs";
import { useToast } from "@/hooks/use-toast";
import { LogOut, Shield, Download, Search, Calendar, Globe } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Row {
  id: string;
  created_at: string;
  session_id: string | null;
  lang: string | null;
  user_text: string | null;
  assistant_text: string | null;
}

export default function AdminPage() {
  const [user, setUser] = useState<any>(null);
  const [adminRole, setAdminRole] = useState<string>("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [term, setTerm] = useState("");
  const [lang, setLang] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const fetchData = async () => {
    if (!user) {
      console.log("User not authenticated");
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("No valid session");
      }

      const response = await supabase.functions.invoke('admin-list', {
        body: {
          from: fromDate || undefined,
          to: toDate || undefined,
          term: term || undefined,
          lang: lang || undefined,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to fetch data");
      }

      const { rows: fetchedRows, count, admin_role } = response.data || {};
      setRows(fetchedRows || []);
      setTotalCount(count || 0);
      setAdminRole(admin_role || "");
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast({
        title: "Failed to fetch data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRows([]);
    setTotalCount(0);
  };

  const handleExport = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("No valid session");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Export failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "conversations_export.csv";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Export successful",
        description: "Conversations data has been downloaded.",
      });
    } catch (error: any) {
      toast({
        title: "Export failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const toggle = (id: string) => {
    const newExpanded = new Set(expanded);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpanded(newExpanded);
  };

  const Trunc = ({ id, text }: { id: string; text: string | null }) => {
    if (!text) return <span className="text-muted-foreground">(empty)</span>;
    const isExpanded = expanded.has(id);
    const displayText = isExpanded ? text : text.slice(0, 100);
    const needsTruncation = text.length > 100;

    return (
      <div className="max-w-xs">
        <p className="text-sm whitespace-pre-wrap break-words">
          {displayText}
          {needsTruncation && !isExpanded && "..."}
        </p>
        {needsTruncation && (
          <button
            onClick={() => toggle(id)}
            className="text-xs text-primary hover:underline mt-1"
          >
            {isExpanded ? "Show less" : "Show more"}
          </button>
        )}
      </div>
    );
  };

  if (!user) {
    return <AdminAuth onAuthSuccess={setUser} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary p-4">
      <div className="max-w-7xl mx-auto">
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-6 w-6 text-primary" />
                <CardTitle className="text-2xl font-bold">
                  Admin Panel - Conversation Data
                </CardTitle>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-sm text-muted-foreground">
                  Role: <span className="font-medium capitalize">{adminRole}</span>
                </div>
                <Button variant="outline" size="sm" onClick={handleSignOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  From Date
                </label>
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  To Date
                </label>
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  <Search className="h-4 w-4" />
                  Search Term
                </label>
                <Input
                  type="text"
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  placeholder="Search in user text"
                  maxLength={100}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  <Globe className="h-4 w-4" />
                  Language
                </label>
                <Select value={lang} onValueChange={setLang}>
                  <SelectTrigger>
                    <SelectValue placeholder="All languages" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All languages</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="ar">Arabic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={fetchData} disabled={loading}>
                <Search className="h-4 w-4 mr-2" />
                {loading ? "Loading..." : "Fetch Data"}
              </Button>
              <Button variant="outline" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Download CSV
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              Total conversations: {totalCount}
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="conversations" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="conversations">Conversations</TabsTrigger>
            <TabsTrigger value="admins">Admin Management</TabsTrigger>
            <TabsTrigger value="costs">Cost Tracking</TabsTrigger>
            <TabsTrigger value="logs">Audit Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="conversations">
            <Card>
              <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b">
                  <tr>
                    <th className="text-left p-4 font-medium">Date</th>
                    <th className="text-left p-4 font-medium">Session</th>
                    <th className="text-left p-4 font-medium">Language</th>
                    <th className="text-left p-4 font-medium">User Message</th>
                    <th className="text-left p-4 font-medium">Assistant Response</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="text-center p-8 text-muted-foreground">
                        Loading...
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center p-8 text-muted-foreground">
                        No data found
                      </td>
                    </tr>
                  ) : (
                    rows.map((row) => (
                      <tr key={row.id} className="border-b hover:bg-muted/50">
                        <td className="p-4 text-sm">
                          {new Date(row.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">
                          {row.session_id?.slice(0, 8) || "-"}
                        </td>
                        <td className="p-4 text-sm">
                          {row.lang?.toUpperCase() || "-"}
                        </td>
                        <td className="p-4">
                          <Trunc id={`user-${row.id}`} text={row.user_text} />
                        </td>
                        <td className="p-4">
                          <Trunc id={`assistant-${row.id}`} text={row.assistant_text} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="admins">
            {adminRole === 'super_admin' ? (
              <AdminManagement />
            ) : (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  Only super admins can manage admin users
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="costs">
            <CostTracking />
          </TabsContent>

          <TabsContent value="logs">
            <AuditLogs />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}