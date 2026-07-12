import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, TrendingUp, AlertCircle } from "lucide-react";

interface CostStats {
  daily_cost: string;
  monthly_cost: string;
  daily_threshold: number;
  monthly_threshold: number;
  model_breakdown: Record<string, { count: number; cost: number; tokens: number }>;
  total_requests: number;
}

export function CostTracking() {
  const [stats, setStats] = useState<CostStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [dailyThreshold, setDailyThreshold] = useState("");
  const [monthlyThreshold, setMonthlyThreshold] = useState("");
  const { toast } = useToast();

  const fetchStats = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session");

      const { data, error } = await supabase.functions.invoke('cost-tracking', {
        body: { action: 'get_stats' },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;
      setStats(data);
      setDailyThreshold(String(data.daily_threshold));
      setMonthlyThreshold(String(data.monthly_threshold));
    } catch (error: any) {
      toast({
        title: "Failed to load cost stats",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleUpdateThresholds = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session");

      const { error } = await supabase.functions.invoke('cost-tracking', {
        body: {
          action: 'update_thresholds',
          daily_threshold: parseFloat(dailyThreshold),
          monthly_threshold: parseFloat(monthlyThreshold),
        },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;

      toast({ title: "Thresholds updated successfully" });
      fetchStats();
    } catch (error: any) {
      toast({
        title: "Failed to update thresholds",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading || !stats) {
    return (
      <Card>
        <CardContent className="p-8 text-center">Loading cost data...</CardContent>
      </Card>
    );
  }

  const dailyCostNum = parseFloat(stats.daily_cost);
  const monthlyCostNum = parseFloat(stats.monthly_cost);
  const dailyWarning = dailyCostNum > stats.daily_threshold;
  const monthlyWarning = monthlyCostNum > stats.monthly_threshold;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          OpenAI Cost Tracking
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Today's Cost</p>
            <p className={`text-2xl font-bold ${dailyWarning ? 'text-destructive' : 'text-foreground'}`}>
              ${stats.daily_cost}
            </p>
            <p className="text-xs text-muted-foreground">Threshold: ${stats.daily_threshold}</p>
            {dailyWarning && (
              <div className="flex items-center gap-1 text-xs text-destructive">
                <AlertCircle className="h-3 w-3" />
                Threshold exceeded
              </div>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">This Month</p>
            <p className={`text-2xl font-bold ${monthlyWarning ? 'text-destructive' : 'text-foreground'}`}>
              ${stats.monthly_cost}
            </p>
            <p className="text-xs text-muted-foreground">Threshold: ${stats.monthly_threshold}</p>
            {monthlyWarning && (
              <div className="flex items-center gap-1 text-xs text-destructive">
                <AlertCircle className="h-3 w-3" />
                Threshold exceeded
              </div>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Total Requests</p>
            <p className="text-2xl font-bold">{stats.total_requests}</p>
            <p className="text-xs text-muted-foreground">This month</p>
          </div>
        </div>

        <div>
          <h3 className="font-medium mb-2 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Model Breakdown
          </h3>
          <div className="space-y-2">
            {Object.entries(stats.model_breakdown).map(([model, data]) => (
              <div key={model} className="flex justify-between items-center p-2 bg-muted rounded">
                <span className="text-sm font-medium">{model}</span>
                <div className="text-right">
                  <p className="text-sm font-bold">${data.cost.toFixed(4)}</p>
                  <p className="text-xs text-muted-foreground">
                    {data.count} req · {data.tokens.toLocaleString()} tokens
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="font-medium">Alert Thresholds</h3>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              step="0.01"
              placeholder="Daily ($)"
              value={dailyThreshold}
              onChange={(e) => setDailyThreshold(e.target.value)}
            />
            <Input
              type="number"
              step="0.01"
              placeholder="Monthly ($)"
              value={monthlyThreshold}
              onChange={(e) => setMonthlyThreshold(e.target.value)}
            />
          </div>
          <Button onClick={handleUpdateThresholds} className="w-full">
            Update Thresholds
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}