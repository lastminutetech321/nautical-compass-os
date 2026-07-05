import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wallet, TrendingUp, DollarSign, AlertCircle, CheckCircle, Settings, RefreshCw } from "lucide-react";
import { base44 } from "@/api/base44Client";

const fmt = (n) => (n || 0).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function MetricCard({ label, value, icon: Icon, tone = "default" }) {
  const tones = { default: "text-foreground", positive: "text-emerald-600", negative: "text-rose-600", accent: "text-primary" };
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${tones[tone]}`}>{value}</p>
          </div>
          <Icon className="w-8 h-8 text-muted-foreground/30" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function PaymentFabricCommand() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState(null);
  const [savingConfig, setSavingConfig] = useState(false);
  const [editConfig, setEditConfig] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke("ncPaymentFabric", { operation: "get_dashboard" });
      setDashboard(res.data.dashboard);
      setConfig(res.data.dashboard.founder_config);
      setEditConfig({
        base_pct: res.data.dashboard.founder_config.payout_doctrine.base_pct,
        max_cap_pct: res.data.dashboard.founder_config.payout_doctrine.max_cap_pct,
        hold_period_days: res.data.dashboard.founder_config.payout_doctrine.hold_period_days,
        approval_threshold: res.data.dashboard.founder_config.payout_doctrine.approval_threshold
      });
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const saveConfig = async () => {
    setSavingConfig(true);
    try {
      await base44.functions.invoke("ncPaymentFabric", {
        operation: "update_founder_config",
        params: {
          config_key: "payout_doctrine",
          category: "compensation",
          value: { ...config.payout_doctrine, ...editConfig },
          description: "Payout doctrine: base %, max cap, hold period, approval threshold"
        }
      });
      await load();
    } catch (e) { console.error(e); }
    setSavingConfig(false);
  };

  if (loading) return <div className="p-8 flex justify-center"><RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Wallet className="w-6 h-6 text-primary" /> NC Payment Fabric</h1>
          <p className="text-sm text-muted-foreground mt-1">Financial operating system — subscriptions, payouts, contribution economy & Founder doctrine</p>
        </div>
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className="w-4 h-4" /> Refresh</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="MRR" value={fmt(dashboard.mrr)} icon={DollarSign} tone="positive" />
        <MetricCard label="ARR" value={fmt(dashboard.arr)} icon={TrendingUp} tone="positive" />
        <MetricCard label="Active Subscriptions" value={dashboard.active_subscriptions} icon={CheckCircle} />
        <MetricCard label="Outstanding Invoices" value={fmt(dashboard.outstanding_total)} icon={AlertCircle} tone={dashboard.outstanding_total > 0 ? "negative" : "default"} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Total Revenue" value={fmt(dashboard.total_revenue)} icon={DollarSign} tone="positive" />
        <MetricCard label="Total Expenses" value={fmt(dashboard.total_expenses)} icon={DollarSign} tone="negative" />
        <MetricCard label="Net Cash Flow" value={fmt(dashboard.net_cash_flow)} icon={TrendingUp} tone={dashboard.net_cash_flow >= 0 ? "positive" : "negative"} />
        <MetricCard label="Founder Profitability" value={fmt(dashboard.founder_profitability)} icon={Wallet} tone={dashboard.founder_profitability >= 0 ? "positive" : "negative"} />
      </div>

      <Tabs defaultValue="intelligence">
        <TabsList>
          <TabsTrigger value="intelligence">Financial Intelligence</TabsTrigger>
          <TabsTrigger value="payouts">Payouts & Forecast</TabsTrigger>
          <TabsTrigger value="doctrine">Founder Doctrine</TabsTrigger>
          <TabsTrigger value="credits">Credits & Refunds</TabsTrigger>
        </TabsList>

        <TabsContent value="intelligence" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Revenue by Plan</CardTitle><CardDescription>Revenue distribution across subscription plans</CardDescription></CardHeader>
            <CardContent>
              {Object.keys(dashboard.revenue_by_plan || {}).length === 0 ? (
                <p className="text-sm text-muted-foreground">No revenue events recorded yet.</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(dashboard.revenue_by_plan).map(([plan, amt]) => (
                    <div key={plan} className="flex justify-between items-center py-2 border-b">
                      <span className="text-sm font-medium">{plan}</span>
                      <span className="text-sm font-bold">{fmt(amt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payouts" className="mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard label="Pending Payouts" value={fmt(dashboard.pending_payout_total)} icon={AlertCircle} tone="accent" />
            <MetricCard label="Completed Payouts" value={fmt(dashboard.completed_payout_total)} icon={CheckCircle} tone="positive" />
            <MetricCard label="Commission Forecast" value={fmt(dashboard.commission_forecast)} icon={DollarSign} />
            <MetricCard label="Residual Forecast" value={fmt(dashboard.residual_forecast)} icon={DollarSign} />
          </div>
          <Card className="mt-4">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">
                Payout forecast (30d): <strong>{fmt(dashboard.payout_forecast_30d)}</strong> ·
                Pending approvals: <strong>{dashboard.pending_payouts}</strong> ·
                Completed: <strong>{dashboard.completed_payouts}</strong>
              </p>
              <p className="text-xs text-muted-foreground mt-2">All payouts above the Founder-configured approval threshold require Founder approval before execution. No payout is issued without authorization.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="doctrine" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Settings className="w-4 h-4" /> Founder Payout Doctrine</CardTitle><CardDescription>Founder-controlled compensation defaults. Everything is configurable — nothing hardcoded.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Base Participation %</Label>
                  <Input type="number" value={editConfig.base_pct} onChange={(e) => setEditConfig({ ...editConfig, base_pct: Number(e.target.value) })} />
                  <p className="text-xs text-muted-foreground mt-1">Default doctrine: 20% starting point</p>
                </div>
                <div>
                  <Label>Maximum Cap %</Label>
                  <Input type="number" value={editConfig.max_cap_pct} onChange={(e) => setEditConfig({ ...editConfig, max_cap_pct: Number(e.target.value) })} />
                  <p className="text-xs text-muted-foreground mt-1">Default doctrine: below 30%</p>
                </div>
                <div>
                  <Label>Hold Period (days)</Label>
                  <Input type="number" value={editConfig.hold_period_days} onChange={(e) => setEditConfig({ ...editConfig, hold_period_days: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Approval Threshold ($)</Label>
                  <Input type="number" value={editConfig.approval_threshold} onChange={(e) => setEditConfig({ ...editConfig, approval_threshold: Number(e.target.value) })} />
                  <p className="text-xs text-muted-foreground mt-1">Payouts at or above this require Founder approval</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button onClick={saveConfig} disabled={savingConfig}>{savingConfig ? "Saving..." : "Update Doctrine"}</Button>
                <Badge variant="outline">Requires Founder approval</Badge>
              </div>
              <div className="mt-4 p-3 rounded-md bg-muted/50">
                <p className="text-xs font-semibold mb-1">Scoring Weights (Contribution Economy)</p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(config?.scoring_weights || {}).map(([k, v]) => (
                    <Badge key={k} variant="secondary" className="text-xs">{k}: {v}</Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="credits" className="mt-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <MetricCard label="Credits Outstanding" value={fmt(dashboard.credits_outstanding)} icon={DollarSign} />
            <MetricCard label="Pending Refunds" value={fmt(dashboard.pending_refund_total)} icon={AlertCircle} tone="negative" />
            <MetricCard label="Platform Profitability" value={fmt(dashboard.platform_profitability)} icon={TrendingUp} tone={dashboard.platform_profitability >= 0 ? "positive" : "negative"} />
          </div>
          <Card className="mt-4">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Refunds and manual credits above the approval threshold require Founder authorization. Every credit and refund is recorded with full audit trail, reason, and authorizer.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}