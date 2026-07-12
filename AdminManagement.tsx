import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Trash2, Shield } from "lucide-react";

interface Admin {
  id: string;
  user_id: string;
  email: string;
  role: string;
  created_at: string;
}

export function AdminManagement() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<"moderator" | "super_admin">("moderator");
  const { toast } = useToast();

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session");

      const { data, error } = await supabase.functions.invoke('admin-manage', {
        body: { action: 'list' },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;
      setAdmins(data.admins || []);
    } catch (error: any) {
      toast({
        title: "Failed to load admins",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleCreate = async () => {
    if (!newEmail.trim()) {
      toast({ title: "Email required", variant: "destructive" });
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session");

      const { error } = await supabase.functions.invoke('admin-manage', {
        body: { action: 'create', email: newEmail, role: newRole },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;

      toast({ title: "Admin created successfully" });
      setNewEmail("");
      fetchAdmins();
    } catch (error: any) {
      toast({
        title: "Failed to create admin",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (adminId: string) => {
    if (!confirm("Are you sure you want to remove this admin?")) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session");

      const { error } = await supabase.functions.invoke('admin-manage', {
        body: { action: 'delete', admin_user_id: adminId },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;

      toast({ title: "Admin removed successfully" });
      fetchAdmins();
    } catch (error: any) {
      toast({
        title: "Failed to remove admin",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Admin User Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Email address"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            type="email"
          />
          <Select value={newRole} onValueChange={(v) => setNewRole(v as any)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="moderator">Moderator</SelectItem>
              <SelectItem value="super_admin">Super Admin</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleCreate}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b">
              <tr>
                <th className="text-left p-2 font-medium">Email</th>
                <th className="text-left p-2 font-medium">Role</th>
                <th className="text-left p-2 font-medium">Created</th>
                <th className="text-right p-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="text-center p-4 text-muted-foreground">Loading...</td>
                </tr>
              ) : admins.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center p-4 text-muted-foreground">No admins found</td>
                </tr>
              ) : (
                admins.map((admin) => (
                  <tr key={admin.id} className="border-b hover:bg-muted/50">
                    <td className="p-2 text-sm">{admin.email}</td>
                    <td className="p-2 text-sm capitalize">{admin.role.replace('_', ' ')}</td>
                    <td className="p-2 text-sm">{new Date(admin.created_at).toLocaleDateString()}</td>
                    <td className="p-2 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(admin.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
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