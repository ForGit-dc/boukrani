import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";
import { costTrackingSchema } from "../_shared/validation.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

    // Verify admin
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!adminUser) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const validation = costTrackingSchema.safeParse(body);
    
    if (!validation.success) {
      return new Response(JSON.stringify({ error: 'Validation error' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, daily_threshold, monthly_threshold, alert_email } = validation.data;

    if (action === 'get_stats') {
      // Daily costs
      const { data: dailyCosts, error: dailyError } = await supabase
        .from('openai_usage')
        .select('estimated_cost_usd')
        .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString());

      if (dailyError) throw dailyError;

      const dailyTotal = dailyCosts?.reduce((sum, row) => sum + parseFloat(String(row.estimated_cost_usd)), 0) || 0;

      // Monthly costs
      const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const { data: monthlyCosts, error: monthlyError } = await supabase
        .from('openai_usage')
        .select('estimated_cost_usd, model, total_tokens, created_at')
        .gte('created_at', firstDayOfMonth);

      if (monthlyError) throw monthlyError;

      const monthlyTotal = monthlyCosts?.reduce((sum, row) => sum + parseFloat(String(row.estimated_cost_usd)), 0) || 0;

      // Get alert config
      const { data: config } = await supabase
        .from('cost_alert_config')
        .select('*')
        .single();

      // Model breakdown
      const modelBreakdown: Record<string, { count: number; cost: number; tokens: number }> = {};
      monthlyCosts?.forEach((row) => {
        if (!modelBreakdown[row.model]) {
          modelBreakdown[row.model] = { count: 0, cost: 0, tokens: 0 };
        }
        modelBreakdown[row.model].count++;
        modelBreakdown[row.model].cost += parseFloat(String(row.estimated_cost_usd));
        modelBreakdown[row.model].tokens += row.total_tokens;
      });

      return new Response(JSON.stringify({
        daily_cost: dailyTotal.toFixed(4),
        monthly_cost: monthlyTotal.toFixed(4),
        daily_threshold: config?.daily_threshold_usd || 10,
        monthly_threshold: config?.monthly_threshold_usd || 300,
        model_breakdown: modelBreakdown,
        total_requests: monthlyCosts?.length || 0,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'update_thresholds') {
      const { error } = await supabase
        .from('cost_alert_config')
        .update({
          daily_threshold_usd: daily_threshold,
          monthly_threshold_usd: monthly_threshold,
          alert_email,
        })
        .eq('id', (await supabase.from('cost_alert_config').select('id').single()).data?.id);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in cost-tracking:', error);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});