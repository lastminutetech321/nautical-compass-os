import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Webhook, Play, CheckCircle, XCircle, RefreshCw, Zap } from "lucide-react";
import { base44 } from "@/api/base44Client";

const WEBHOOK_TYPES = [
  "checkout.session.completed", "invoice.paid", "invoice.payment_failed",
  "customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted",
  "charge.refunded", "charge.dispute.created", "payment_intent.succeeded", "payment_intent.payment_failed"
];

export default function WebhookTestingCenter() {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(null);
  const [runningAll, setRunningAll] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke("ncPaymentSandbox", { operation: "list_webhook_tests", params: { limit: 50 } });
      setTests(res.data.tests || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const testOne = async (eventType) => {
    setTesting(eventType);
    try {
      await base44.functions.invoke("ncPaymentSandbox", { operation: "test_webhook", params: { event_type: eventType } });
      await load();
    } catch (e) { console.error(e); }
    setTesting(null);
  };

  const runAll = async () => {
    setRunningAll(true);
    try {
      await base44.functions.invoke("ncPaymentSandbox", { operation: "run_all_webhook_tests" });
      await load();
    } catch (e) { console.error(e); }
    setRunningAll(false);
  };

  if (loading) return <div className="p-8 flex justify-center"><RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  const passed = tests.filter(t => t.passed).length;
  const byType = {};
  tests.forEach(t => { if (!byType[t.event_type] || new Date(t.tested_at) > new Date(byType[t.event_type].tested_at)) byType[t.event_type] = t; });

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Webhook className="w-6 h-6 text-primary" /> Webhook Testing Center</h1>
          <p className="text-sm text-muted-foreground mt-1">Simulate every Stripe webhook and verify the Payment Fabric responds correctly.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="w-4 h-4" /> Refresh</Button>
          <Button size="sm" onClick={runAll} disabled={runningAll}><Zap className="w-4 h-4" /> {runningAll ? "Running all..." : "Test All Webhooks"}</Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase">Webhook Types</p><p className="text-2xl font-bold mt-1">{WEBHOOK_TYPES.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase">Tests Run</p><p className="text-2xl font-bold mt-1">{tests.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase">Pass Rate</p><p className="text-2xl font-bold mt-1 text-emerald-600">{tests.length ? Math.round((passed / tests.length) * 100) : 0}%</p></CardContent></Card>
      </div>

      <div className="space-y-2">
        {WEBHOOK_TYPES.map(et => {
          const latest = byType[et];
          return (
            <Card key={et}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {latest ? (latest.passed ? <CheckCircle className="w-5 h-5 text-emerald-500" /> : <XCircle className="w-5 h-5 text-rose-500" />) : <div className="w-5 h-5 rounded-full border-2 border-muted" />}
                  <div>
                    <span className="font-mono text-sm font-medium">{et}</span>
                    {latest && <p className="text-xs text-muted-foreground">{latest.test_key} · {latest.latency_ms}ms · {new Date(latest.tested_at).toLocaleString()}</p>}
                    {latest?.missing_actions?.length > 0 && <p className="text-xs text-rose-600">Missing: {latest.missing_actions.join(", ")}</p>}
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => testOne(et)} disabled={testing === et}>
                  <Play className="w-3 h-3" /> {testing === et ? "Testing..." : "Test"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}