import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Banknote, CheckCircle, Clock, AlertCircle, Plus, RefreshCw, Shield } from "lucide-react";
import { base44 } from "@/api/base44Client";

const fmt = (n) => (n || 0).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

const roleOptions = ["founder","director","employee","contractor","artist","creator","musician","workforce","promoter","referral_partner","enterprise_partner","marketplace_provider","special_assignment","custom"];

export default function PayoutCenter() {
  const [policies, setPolicies] = useState([]);
  const [runs, setRuns] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPolicyForm, setShowPolicyForm] = useState(false);
  const [newPolicy, setNewPolicy] = useState({ policy_name: "", policy_key: "", target_role: "director", base_pct: 20, max_cap_pct: 30, hold_period_days: 7, approval_threshold: 500, payout_timing: "monthly", residual_enabled: false, residual_pct: 0, referral_enabled: false, referral_pct: 0 });
  const [calcInput, setCalcInput] = useState({ participant_id: "", participant_name: "", participant_type: "director", payout_type: "commission", gross_amount: 1000 });
  const [calcResult, setCalcResult] = useState(null);
  const [calcLoading, setCalcLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [p, r, i] = await Promise.all([
        base44.functions.invoke("ncPaymentFabric", { operation: "get_payout_policies" }),
        base44.functions.invoke("ncPaymentFabric", { operation: "get_payout_runs" }),
        base44.functions.invoke("ncPaymentFabric", { operation: "get_payout_items" })
      ]);
      setPolicies(p.data.policies || []);
      setRuns(r.data.runs || []);
      setItems(i.data.items || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const createPolicy = async () => {
    try {
      await base44.functions.invoke("ncPaymentFabric", { operation: "upsert_payout_policy", params: newPolicy });
      setShowPolicyForm(false);
      await load();
    } catch (e) { console.error(e); }
  };

  const activatePolicy = async (id) => {
    try { await base44.functions.invoke("ncPaymentFabric", { operation: "activate_payout_policy", params: { policy_id: id } }); await load(); }
    catch (e) { alert(e.response?.data?.error || "Activation requires Founder role"); }
  };

  const calculatePayout = async () => {
    setCalcLoading(true);
    try {
      const res = await base44.functions.invoke("ncPaymentFabric", { operation: "calculate_payout", params: calcInput });
      setCalcResult(res.data.payout_item);
      await load();
    } catch (e) { console.error(e); }
    setCalcLoading(false);
  };

  const approveItem = async (id) => {
    try { await base44.functions.invoke("ncPaymentFabric", { operation: "approve_payout_item", params: { payout_id: id } }); await load(); }
    catch (e) { alert(e.response?.data?.error || "Approval requires Founder role"); }
  };

  const approveRun = async (id) => {
    try { await base44.functions.invoke("ncPaymentFabric", { operation: "approve_payout_run", params: { run_id: id } }); await load(); }
    catch (e) { alert(e.response?.data?.error || "Approval requires Founder role"); }
  };

  if (loading) return <div className="p-8 flex justify-center"><RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Banknote className="w-6 h-6 text-primary" /> Payout Center</h1>
          <p className="text-sm text-muted-foreground mt-1">Configurable payout policies, batch runs & full audit trail</p>
        </div>
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className="w-4 h-4" /> Refresh</Button>
      </div>

      <Tabs defaultValue="policies">
        <TabsList>
          <TabsTrigger value="policies">Payout Policies</TabsTrigger>
          <TabsTrigger value="calculate">Calculate Payout</TabsTrigger>
          <TabsTrigger value="runs">Payout Runs</TabsTrigger>
          <TabsTrigger value="items">Payout Items</TabsTrigger>
        </TabsList>

        <TabsContent value="policies" className="mt-4">
          <div className="flex justify-between items-center mb-3">
            <p className="text-sm text-muted-foreground">{policies.length} policies · No role requires code changes</p>
            <Button size="sm" onClick={() => setShowPolicyForm(!showPolicyForm)}><Plus className="w-4 h-4" /> New Policy</Button>
          </div>
          {showPolicyForm && (
            <Card className="mb-4">
              <CardContent className="p-4 space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div><Label>Policy Name</Label><Input value={newPolicy.policy_name} onChange={(e) => setNewPolicy({ ...newPolicy, policy_name: e.target.value })} /></div>
                  <div><Label>Policy Key</Label><Input value={newPolicy.policy_key} onChange={(e) => setNewPolicy({ ...newPolicy, policy_key: e.target.value })} placeholder="director_default" /></div>
                  <div>
                    <Label>Target Role</Label>
                    <select className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm" value={newPolicy.target_role} onChange={(e) => setNewPolicy({ ...newPolicy, target_role: e.target.value })}>
                      {roleOptions.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div><Label>Base %</Label><Input type="number" value={newPolicy.base_pct} onChange={(e) => setNewPolicy({ ...newPolicy, base_pct: Number(e.target.value) })} /></div>
                  <div><Label>Max Cap %</Label><Input type="number" value={newPolicy.max_cap_pct} onChange={(e) => setNewPolicy({ ...newPolicy, max_cap_pct: Number(e.target.value) })} /></div>
                  <div><Label>Hold Period (days)</Label><Input type="number" value={newPolicy.hold_period_days} onChange={(e) => setNewPolicy({ ...newPolicy, hold_period_days: Number(e.target.value) })} /></div>
                  <div><Label>Approval Threshold ($)</Label><Input type="number" value={newPolicy.approval_threshold} onChange={(e) => setNewPolicy({ ...newPolicy, approval_threshold: Number(e.target.value) })} /></div>
                  <div><Label>Residual %</Label><Input type="number" value={newPolicy.residual_pct} onChange={(e) => setNewPolicy({ ...newPolicy, residual_enabled: Number(e.target.value) > 0, residual_pct: Number(e.target.value) })} /></div>
                  <div><Label>Referral %</Label><Input type="number" value={newPolicy.referral_pct} onChange={(e) => setNewPolicy({ ...newPolicy, referral_enabled: Number(e.target.value) > 0, referral_pct: Number(e.target.value) })} /></div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={createPolicy}>Create Policy</Button>
                  <Button variant="outline" onClick={() => setShowPolicyForm(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}
          <div className="space-y-2">
            {policies.map(p => (
              <Card key={p.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{p.policy_name}</span>
                      <Badge variant={p.status === "active" ? "default" : "outline"}>{p.status}</Badge>
                      <Badge variant="secondary">{p.target_role}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Base {p.base_pct}% · Cap {p.max_cap_pct}% · Hold {p.hold_period_days}d · Threshold ${p.approval_threshold} · v{p.version}</p>
                  </div>
                  {p.status !== "active" && <Button size="sm" variant="outline" onClick={() => activatePolicy(p.id)}><Shield className="w-3 h-3" /> Activate (Founder)</Button>}
                </CardContent>
              </Card>
            ))}
            {policies.length === 0 && <p className="text-sm text-muted-foreground">No policies yet. Create one or rely on the Founder doctrine defaults.</p>}
          </div>
        </TabsContent>

        <TabsContent value="calculate" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Calculate Single Payout</CardTitle><CardDescription>Computes base, contribution adjustment, trust adjustment, penalty, cap, and full audit explanation</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div><Label>Participant ID</Label><Input value={calcInput.participant_id} onChange={(e) => setCalcInput({ ...calcInput, participant_id: e.target.value })} /></div>
                <div><Label>Participant Name</Label><Input value={calcInput.participant_name} onChange={(e) => setCalcInput({ ...calcInput, participant_name: e.target.value })} /></div>
                <div>
                  <Label>Participant Type</Label>
                  <select className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm" value={calcInput.participant_type} onChange={(e) => setCalcInput({ ...calcInput, participant_type: e.target.value })}>
                    {roleOptions.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Payout Type</Label>
                  <select className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm" value={calcInput.payout_type} onChange={(e) => setCalcInput({ ...calcInput, payout_type: e.target.value })}>
                    {["commission","residual","referral","artist","workforce","special_assignment","marketplace","enterprise","director","bonus"].map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div><Label>Gross Amount ($)</Label><Input type="number" value={calcInput.gross_amount} onChange={(e) => setCalcInput({ ...calcInput, gross_amount: Number(e.target.value) })} /></div>
              </div>
              <Button onClick={calculatePayout} disabled={calcLoading}>{calcLoading ? "Calculating..." : "Calculate Payout"}</Button>
              {calcResult && (
                <div className="mt-4 p-4 rounded-md border bg-muted/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Net Payout: {fmt(calcResult.net_amount)}</span>
                    <Badge variant={calcResult.approval_required ? "destructive" : "secondary"}>{calcResult.approval_required ? "Needs Founder Approval" : "Auto-approved"}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{calcResult.calculation_explanation}</p>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>Base: {fmt(calcResult.base_amount)}</div>
                    <div>Contribution adj: {fmt(calcResult.contribution_adjustment)}</div>
                    <div>Trust adj: {fmt(calcResult.trust_adjustment)}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>Penalty adj: {fmt(calcResult.penalty_adjustment)}</div>
                    <div>Gross: {fmt(calcResult.gross_amount)}</div>
                  </div>
                  {calcResult.hold_until && <p className="text-xs text-amber-600">Held until {new Date(calcResult.hold_until).toLocaleDateString()}</p>}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="runs" className="mt-4">
          <div className="space-y-2">
            {runs.map(r => (
              <Card key={r.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{r.run_name}</span>
                      <Badge variant={r.status === "approved" ? "default" : r.status === "pending_approval" ? "destructive" : "outline"}>{r.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{r.run_key} · {r.period} · {r.item_count} items · Total {fmt(r.total_payout)} · {r.pending_approvals} pending</p>
                  </div>
                  {r.status === "pending_approval" && <Button size="sm" onClick={() => approveRun(r.id)}><CheckCircle className="w-3 h-3" /> Approve All (Founder)</Button>}
                </CardContent>
              </Card>
            ))}
            {runs.length === 0 && <p className="text-sm text-muted-foreground">No payout runs yet.</p>}
          </div>
        </TabsContent>

        <TabsContent value="items" className="mt-4">
          <div className="space-y-2">
            {items.map(it => (
              <Card key={it.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{it.participant_name}</span>
                      <Badge variant="secondary">{it.payout_type}</Badge>
                      <Badge variant={it.status === "approved" ? "default" : it.approval_status === "pending" ? "destructive" : "outline"}>
                        {it.status === "approved" ? <><CheckCircle className="w-3 h-3 inline" /> Approved</> : it.approval_status === "pending" ? <><Clock className="w-3 h-3 inline" /> Pending Approval</> : it.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{it.payout_key} · Net {fmt(it.net_amount)} · {it.policy_name} v{it.policy_version}</p>
                    <p className="text-xs text-muted-foreground/70 mt-1 line-clamp-1">{it.calculation_explanation}</p>
                  </div>
                  {it.approval_status === "pending" && <Button size="sm" variant="outline" onClick={() => approveItem(it.id)}><CheckCircle className="w-3 h-3" /> Approve (Founder)</Button>}
                </CardContent>
              </Card>
            ))}
            {items.length === 0 && <p className="text-sm text-muted-foreground">No payout items yet. Use Calculate Payout to create one.</p>}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}