import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FlaskConical, ShieldCheck, PlayCircle, CheckCircle, AlertTriangle, XCircle, RefreshCw, Rocket, Lock } from "lucide-react";
import { base44 } from "@/api/base44Client";

const statusBadge = (s) => s === "passed" ? "default" : s === "failed" ? "destructive" : "secondary";

export default function PaymentSandboxCommand() {
  const [status, setStatus] = useState(null);
  const [scenarios, setScenarios] = useState([]);
  const [simulations, setSimulations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(null);
  const [selectedScenario, setSelectedScenario] = useState("new_subscription");
  const [simParams, setSimParams] = useState({ gross_amount: 5000, participant_id: "sandbox-dir", participant_name: "Sandbox Director", participant_type: "director" });
  const [lastResult, setLastResult] = useState(null);
  const [productionCheck, setProductionCheck] = useState(null);
  const [activating, setActivating] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [s, sc, sims] = await Promise.all([
        base44.functions.invoke("ncPaymentSandbox", { operation: "get_status" }),
        base44.functions.invoke("ncPaymentSandbox", { operation: "list_scenarios" }),
        base44.functions.invoke("ncPaymentSandbox", { operation: "list_simulations", params: { limit: 30 } })
      ]);
      setStatus(s.data);
      setScenarios(sc.data.scenarios || []);
      setSimulations(sims.data.simulations || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const runSim = async () => {
    setRunning(selectedScenario);
    try {
      const res = await base44.functions.invoke("ncPaymentSandbox", { operation: "run_simulation", params: { scenario_type: selectedScenario, ...simParams } });
      setLastResult(res.data);
      await load();
    } catch (e) { console.error(e); }
    setRunning(null);
  };

  const checkProduction = async () => {
    const res = await base44.functions.invoke("ncPaymentSandbox", { operation: "request_production_activation" });
    setProductionCheck(res.data);
  };

  const activateProduction = async () => {
    setActivating(true);
    try {
      await base44.functions.invoke("ncPaymentSandbox", { operation: "activate_production" });
      await load();
    } catch (e) { alert(e.response?.data?.error || "Production activation failed"); }
    setActivating(false);
  };

  if (loading) return <div className="p-8 flex justify-center"><RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><FlaskConical className="w-6 h-6 text-primary" /> NC Payment Sandbox</h1>
          <p className="text-sm text-muted-foreground mt-1">Test every financial workflow safely before real money moves. Stripe stays the processor; this sits between Fabric and live Stripe.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className="w-4 h-4" /> Refresh</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><div className="flex justify-between"><div><p className="text-xs text-muted-foreground uppercase">Sandbox Mode</p><Badge variant={status.sandbox_active ? "default" : "secondary"} className="mt-1">{status.sandbox_active ? "Active" : "Inactive"}</Badge></div><FlaskConical className="w-7 h-7 text-muted-foreground/30" /></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex justify-between"><div><p className="text-xs text-muted-foreground uppercase">Production Mode</p><Badge variant={status.production_activated ? "destructive" : "secondary"} className="mt-1">{status.production_activated ? "Live" : "Inactive"}</Badge></div><Rocket className="w-7 h-7 text-muted-foreground/30" /></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex justify-between"><div><p className="text-xs text-muted-foreground uppercase">Readiness Score</p><p className="text-2xl font-bold mt-1">{status.readiness_score}%</p></div><ShieldCheck className="w-7 h-7 text-muted-foreground/30" /></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex justify-between"><div><p className="text-xs text-muted-foreground uppercase">Stripe Connection</p><Badge variant={status.production_activated ? "default" : "outline"} className="mt-1">{status.production_activated ? "Connected" : "Sandbox Only"}</Badge></div><Lock className="w-7 h-7 text-muted-foreground/30" /></div></CardContent></Card>
      </div>

      <Tabs defaultValue="simulate">
        <TabsList>
          <TabsTrigger value="simulate">Run Simulation</TabsTrigger>
          <TabsTrigger value="readiness">Stripe Readiness</TabsTrigger>
          <TabsTrigger value="history">Simulation History</TabsTrigger>
        </TabsList>

        <TabsContent value="simulate" className="mt-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle>Scenario</CardTitle><CardDescription>Select a payment scenario to simulate in sandbox</CardDescription></CardHeader>
              <CardContent className="space-y-3">
                <select className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm" value={selectedScenario} onChange={(e) => setSelectedScenario(e.target.value)}>
                  {scenarios.map(s => <option key={s.key} value={s.key}>{s.name}</option>)}
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Gross Amount</Label><Input type="number" value={simParams.gross_amount} onChange={(e) => setSimParams({ ...simParams, gross_amount: Number(e.target.value) })} /></div>
                  <div><Label>Participant Type</Label><select className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm" value={simParams.participant_type} onChange={(e) => setSimParams({ ...simParams, participant_type: e.target.value })}><option>director</option><option>artist</option><option>workforce</option><option>promoter</option><option>referral_partner</option><option>marketplace_provider</option><option>enterprise_partner</option></select></div>
                </div>
                <Button onClick={runSim} disabled={!!running} className="w-full"><PlayCircle className="w-4 h-4" /> {running === selectedScenario ? "Running..." : "Run Simulation"}</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Last Result</CardTitle><CardDescription>Verification outcome & audit</CardDescription></CardHeader>
              <CardContent>
                {!lastResult ? <p className="text-sm text-muted-foreground">Run a simulation to see results.</p> : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant={lastResult.status === "passed" ? "default" : lastResult.status === "failed" ? "destructive" : "secondary"}>
                        {lastResult.status === "passed" ? <CheckCircle className="w-3 h-3 inline" /> : lastResult.status === "failed" ? <XCircle className="w-3 h-3 inline" /> : <AlertTriangle className="w-3 h-3 inline" />}
                        {" "}{lastResult.status} ({lastResult.verification.pass_rate}%)
                      </Badge>
                      <span className="text-xs text-muted-foreground">{lastResult.simulation_key} · {lastResult.duration_ms}ms</span>
                    </div>
                    <pre className="text-xs whitespace-pre-wrap bg-muted/50 p-3 rounded-md max-h-64 overflow-auto font-mono">{lastResult.audit_explanation}</pre>
                    {lastResult.lessons_learned?.length > 0 && (
                      <div><p className="text-xs font-semibold mb-1">Lessons Learned</p>{lastResult.lessons_learned.map((l, i) => <p key={i} className="text-xs text-muted-foreground">• {l}</p>)}</div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="readiness" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Deployment Readiness</CardTitle><CardDescription>Score must reach 100% and all secrets validated before production activation. Nothing goes live without Founder approval.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden"><div className={`h-full transition-all ${status.readiness_score === 100 ? "bg-emerald-500" : "bg-primary"}`} style={{ width: `${status.readiness_score}%` }} /></div>
                <span className="text-sm font-bold">{status.readiness_score}%</span>
              </div>
              <div className="space-y-1.5">
                {status.readiness_checks?.map((c, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    {c.passed ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-rose-500" />}
                    <span className="flex-1">{c.check}</span>
                    <span className="text-xs text-muted-foreground">{c.detail}</span>
                  </div>
                ))}
              </div>
              {status.deployment_blockers?.length > 0 && (
                <div className="p-3 rounded-md bg-rose-50 border border-rose-200">
                  <p className="text-xs font-semibold text-rose-700">Deployment Blockers ({status.deployment_blockers.length})</p>
                  {status.deployment_blockers.map((b, i) => <p key={i} className="text-xs text-rose-600">• {b}</p>)}
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={checkProduction}>Check Production Readiness</Button>
                {productionCheck && (
                  <Button onClick={activateProduction} disabled={activating || !productionCheck.can_activate}>
                    <Rocket className="w-4 h-4" /> {activating ? "Activating..." : "Activate Production (Founder)"}
                  </Button>
                )}
              </div>
              {productionCheck && !productionCheck.can_activate && (
                <p className="text-xs text-rose-600">Cannot activate: {productionCheck.blockers?.join(", ") || "Requires 100% readiness and Founder role"}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <div className="space-y-2">
            {simulations.map(s => (
              <Card key={s.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{s.scenario_type.replace(/_/g, " ")}</span>
                      <Badge variant={statusBadge(s.status)}>{s.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{s.simulation_key} · {s.triggered_by} · {new Date(s.started_at).toLocaleString()} · {s.duration_ms}ms</p>
                    {s.lessons_learned?.length > 0 && <p className="text-xs text-muted-foreground/70 mt-1">• {s.lessons_learned[0]}</p>}
                  </div>
                </CardContent>
              </Card>
            ))}
            {simulations.length === 0 && <p className="text-sm text-muted-foreground">No simulations yet. Run one above.</p>}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}