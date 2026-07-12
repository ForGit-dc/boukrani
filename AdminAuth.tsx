import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AdminAuthProps {
  onAuthSuccess: (user: any) => void;
}

export function AdminAuth({ onAuthSuccess }: AdminAuthProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Sanitized error message - don't expose system details
        throw new Error("Invalid email or password");
      }

      // Check if user is admin via server-side verification
      const { data: adminUser, error: adminError } = await supabase.functions.invoke("admin-list", {
        body: { resource: "auth_check" },
        headers: { Authorization: `Bearer ${data.session.access_token}` },
      });

      if (adminError || !adminUser?.admin_role) {
        await supabase.auth.signOut();
        // Sanitized error - don't reveal whether account exists
        throw new Error("Access denied. Admin privileges required.");
      }

      onAuthSuccess(data.user);
      toast({
        title: "Welcome back!",
        description: `Logged in as ${adminUser.admin_role}`,
      });
    } catch (error: any) {
      // Log detailed error server-side only
      console.error("[Auth Error]", error);
      
      toast({
        title: "Authentication failed",
        description: error.message || "Invalid credentials or access denied",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Admin Access</CardTitle>
          <CardDescription>
            Sign in to access admin panel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="admin@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Enter your password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}