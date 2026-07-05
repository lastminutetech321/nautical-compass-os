import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Shield, Scale, FileText, DollarSign, Award, AlertTriangle, Users, TrendingUp, Scroll, BookOpen, Crown, Brain } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

function MetricCard({ icon: Icon, label, value, color = "text-primary" }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4 flex items-center gap-3">
        <Icon className={`w-5 h-5 ${color}`} />
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function NCGovernance() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("constitution");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('ncGovernanceEngine', { operation: 'dashboard' });
      setData(res.data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Shield className="w-8 h-8 text-primary animate-pulse" /></div>;
  if (!data) return <div className="p-8 text-center text-muted-foreground">Failed to load governance data.</div>;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Shield className="w-6 h-6" /> NC Governance Operating System</h1>
        <p className="text-muted-foreground text-sm mt-1">The single source of governance for every policy, compensation rule, trust model, and organizational standard.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <MetricCard icon={Scroll} label="Constitution Principles" value={data.constitution_count} color="text-amber-500" />
        <MetricCard icon={FileText} label="Active Policies" value={data.policy_count} color="text-blue-500" />
        <MetricCard icon={Crown} label="Configurations" value={data.configuration_count} color="text-violet-500" />
        <MetricCard icon={DollarSign} label="Compensation Rules" value={data.compensation_rule_count} color="text-emerald-500" />
        <MetricCard icon={Award} label="Trust Scores" value={data.trust_score_count} color="text-cyan-500" />
        <MetricCard icon={AlertTriangle} label="Open Ethics Cases" value={data.open_ethics_incidents} color={data.critical_ethics_incidents > 0 ? "text-red-500" : "text-amber-500"} />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="constitution"><Scroll className="w-3.5 h-3.5 mr-1.5" /> Constitution</TabsTrigger>
          <TabsTrigger value="policies"><FileText className="w-3.5 h-3.5 mr-1.5" /> Policies</TabsTrigger>
          <TabsTrigger value="config"><Crown className="w-3.5 h-3.5 mr-1.5" /> Founder Config</TabsTrigger>
          <TabsTrigger value="compensation"><DollarSign className="w-3.5 h-3.5 mr-1.5" /> Compensation</TabsTrigger>
          <TabsTrigger value="trust"><Award className="w-3.5 h-3.5 mr-1.5" /> Trust</TabsTrigger>
          <TabsTrigger value="ethics"><AlertTriangle className="w-3.5 h-3.5 mr-1.5" /> Ethics</TabsTrigger>
          <TabsTrigger value="assignments"><Users className="w-3.5 h-3.5 mr-1.5" /> Assignments</TabsTrigger>
          <TabsTrigger value="promotion"><TrendingUp className="w-3.5 h-3.5 mr-1.5" /> Promotion</TabsTrigger>
        </TabsList>

        <TabsContent value="constitution" className="mt-4">
          <ConstitutionPanel principles={data.constitution} onRefresh={load} />
        </TabsContent>
        <TabsContent value="policies" className="mt-4">
          <PolicyPanel policies={data.policies} onRefresh={load} />
        </TabsContent>
        <TabsContent value="config" className="mt-4">
          <ConfigPanel configs={data.configurations} onRefresh={load} />
        </TabsContent>
        <TabsContent value="compensation" className="mt-4">
          <CompensationPanel rules={data.compensation_rules} onRefresh={load} />
        </TabsContent>
        <TabsContent value="trust" className="mt-4">
          <TrustPanel scores={data.trust_scores} />
        </TabsContent>
        <TabsContent value="ethics" className="mt-4">
          <EthicsPanel incidents={data.ethics_incidents} onRefresh={load} />
        </TabsContent>
        <TabsContent value="assignments" className="mt-4">
          <AssignmentPanel assignments={data.special_assignments} onRefresh={load} />
        </TabsContent>
        <TabsContent value="promotion" className="mt-4">
          <PromotionPanel pathways={data.promotion_pathways} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ConstitutionPanel({ principles, onRefresh }) {
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: '', principle_text: '', category: 'value_first', rationale: '' });

  const create = async () => {
    if (!form.title || !form.principle_text) return;
    try {
      await base44.functions.invoke('ncGovernanceEngine', { operation: 'createPrinciple', params: form });
      setForm({ title: '', principle_text: '', category: 'value_first', rationale: '' });
      setCreating(false);
      onRefresh();
    } catch (e) { console.error(e); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-semibold flex items-center gap-2"><Scroll className="w-4 h-4 text-amber-500" /> NC Constitution</h3>
          <p className="text-xs text-muted-foreground">Permanent organizational principles. Requires Founder approval to amend.</p>
        </div>
        <Button size="sm" onClick={() => setCreating(!creating)}>{creating ? 'Cancel' : '+ Add Principle'}</Button>
      </div>

      {creating && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div><Label className="text-xs">Title</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g., Value Before Revenue" /></div>
            <div><Label className="text-xs">Principle</Label><Textarea value={form.principle_text} onChange={e => setForm({ ...form, principle_text: e.target.value })} placeholder="The principle statement..." rows={2} /></div>
            <div><Label className="text-xs">Category</Label>
              <select className="w-full border rounded px-2 py-1.5 text-sm" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                {['value_first', 'trust', 'privacy', 'accuracy', 'founder_authority', 'transparency', 'continuous_learning', 'fairness', 'member_rights', 'organizational_integrity'].map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div><Label className="text-xs">Rationale</Label><Input value={form.rationale} onChange={e => setForm({ ...form, rationale: e.target.value })} placeholder="Why this principle exists" /></div>
            <Button size="sm" onClick={create}>Create Principle</Button>
          </CardContent>
        </Card>
      )}

      {principles.length === 0 && !creating ? (
        <Card><CardContent className="pt-6 pb-6 text-center text-muted-foreground text-sm">No constitution principles yet. Add the foundational principles of NC.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {principles.map((p, i) => (
            <Card key={p.id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className="text-xs capitalize">{p.category?.replace(/_/g, ' ')}</Badge>
                      <span className="text-xs text-muted-foreground">v{p.version}</span>
                      {p.is_permanent && <Badge variant="outline" className="text-xs">Permanent</Badge>}
                    </div>
                    <h4 className="font-semibold">{p.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{p.principle_text}</p>
                    {p.rationale && <p className="text-xs text-muted-foreground mt-1 italic">Rationale: {p.rationale}</p>}
                    {p.approved_by && <p className="text-xs text-muted-foreground mt-1">Approved by {p.approved_by}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function PolicyPanel({ policies, onRefresh }) {
  const typeColors = { compensation: 'text-emerald-500', director: 'text-blue-500', member: 'text-cyan-500', ai_governance: 'text-violet-500', ethics: 'text-red-500', trust: 'text-amber-500' };
  return (
    <div className="space-y-3">
      <div>
        <h3 className="font-semibold flex items-center gap-2"><FileText className="w-4 h-4 text-blue-500" /> Active Policies</h3>
        <p className="text-xs text-muted-foreground">Versioned policies inherited by future companies unless overridden.</p>
      </div>
      {policies.length === 0 ? (
        <Card><CardContent className="pt-6 pb-6 text-center text-muted-foreground text-sm">No active policies yet. Policies are created from the Founder Configuration Engine.</CardContent></Card>
      ) : policies.map(p => (
        <Card key={p.id}>
          <CardContent className="pt-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="secondary" className="text-xs capitalize">{p.policy_type?.replace(/_/g, ' ')}</Badge>
                  <span className="text-xs text-muted-foreground">v{p.version}</span>
                </div>
                <h4 className="font-semibold">{p.name}</h4>
                {p.description && <p className="text-sm text-muted-foreground mt-1">{p.description}</p>}
                {p.rules && Object.keys(p.rules).length > 0 && (
                  <div className="mt-2 text-xs bg-muted p-2 rounded font-mono overflow-x-auto">
                    {JSON.stringify(p.rules, null, 2).slice(0, 300)}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ConfigPanel({ configs, onRefresh }) {
  const [editing, setEditing] = useState(null);
  const [value, setValue] = useState('');

  const save = async (config) => {
    try {
      let parsed = value;
      try { parsed = JSON.parse(value); } catch {}
      await base44.functions.invoke('ncGovernanceEngine', {
        operation: 'updateConfiguration',
        params: { config_key: config.config_key, category: config.category, value: parsed, description: config.description, data_type: config.data_type }
      });
      setEditing(null);
      onRefresh();
    } catch (e) { console.error(e); }
  };

  return (
    <div className="space-y-3">
      <div>
        <h3 className="font-semibold flex items-center gap-2"><Crown className="w-4 h-4 text-violet-500" /> Founder Configuration Engine</h3>
        <p className="text-xs text-muted-foreground">Every configurable rule editable without code. Versioned with history tracking.</p>
      </div>
      {configs.length === 0 ? (
        <Card><CardContent className="pt-6 pb-6 text-center text-muted-foreground text-sm">No configurations set. Configure compensation, trust, contribution, and AI permissions here.</CardContent></Card>
      ) : configs.map(c => (
        <Card key={c.id}>
          <CardContent className="pt-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="secondary" className="text-xs capitalize">{c.category?.replace(/_/g, ' ')}</Badge>
                  <span className="text-xs text-muted-foreground">v{c.version}</span>
                </div>
                <h4 className="font-semibold text-sm">{c.config_key}</h4>
                {c.description && <p className="text-xs text-muted-foreground mt-1">{c.description}</p>}
                <div className="mt-2 text-xs bg-muted p-2 rounded font-mono">{JSON.stringify(c.value)}</div>
              </div>
              <Button size="sm" variant="outline" onClick={() => { setEditing(c); setValue(JSON.stringify(c.value, null, 2)); }}>Edit</Button>
            </div>
            {editing?.id === c.id && (
              <div className="mt-3 space-y-2">
                <Textarea value={value} onChange={e => setValue(e.target.value)} rows={4} className="font-mono text-xs" />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => save(c)}>Save</Button>
                  <Button size="sm" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function CompensationPanel({ rules, onRefresh }) {
  const [calc, setCalc] = useState({ role: 'director', base_amount: 1000 });
  const [result, setResult] = useState(null);

  const calculate = async () => {
    try {
      const res = await base44.functions.invoke('ncGovernanceEngine', { operation: 'calculateCompensation', params: calc });
      setResult(res.data);
    } catch (e) { setResult({ error: e.response?.data?.error || e.message }); }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold flex items-center gap-2"><DollarSign className="w-4 h-4 text-emerald-500" /> Compensation Engine</h3>
        <p className="text-xs text-muted-foreground">Founder-configurable. Never hardcoded percentages.</p>
      </div>
      <Card>
        <CardContent className="pt-4 space-y-3">
          <h4 className="font-medium text-sm">Compensation Calculator</h4>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Role</Label>
              <select className="w-full border rounded px-2 py-1.5 text-sm" value={calc.role} onChange={e => setCalc({ ...calc, role: e.target.value })}>
                <option value="director">Director</option><option value="member">Member</option><option value="employee">Employee</option><option value="vendor">Vendor</option>
              </select>
            </div>
            <div><Label className="text-xs">Base Amount ($)</Label><Input type="number" value={calc.base_amount} onChange={e => setCalc({ ...calc, base_amount: +e.target.value })} /></div>
          </div>
          <Button size="sm" onClick={calculate}>Calculate</Button>
          {result && !result.error && (
            <div className="bg-muted p-3 rounded space-y-1 text-sm">
              <div className="flex justify-between"><span>Base Residual:</span><span className="font-medium">${result.base_residual}</span></div>
              {Object.entries(result.adjustments).map(([k, v]) => <div key={k} className="flex justify-between text-xs"><span className="capitalize">{k.replace(/_/g, ' ')}:</span><span>${v.toFixed(2)}</span></div>)}
              <div className="flex justify-between border-t pt-1 mt-1"><span className="font-semibold">Total:</span><span className="font-bold">${result.total.toFixed(2)}</span></div>
              {result.capped && <p className="text-xs text-amber-500">⚠ Capped at maximum</p>}
            </div>
          )}
          {result?.error && <p className="text-sm text-destructive">{result.error}</p>}
        </CardContent>
      </Card>
      <div className="space-y-2">
        {rules.map(r => (
          <Card key={r.id}>
            <CardContent className="pt-4">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-medium text-sm">{r.rule_name}</h4>
                  <p className="text-xs text-muted-foreground">Role: {r.role}</p>
                </div>
                <div className="text-right text-xs space-y-0.5">
                  <p>Base: {r.base_residual_pct}%</p>
                  <p>Performance: {r.performance_adjustment_pct}%</p>
                  <p>Max cap: ${r.max_compensation_cap || 'None'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function TrustPanel({ scores }) {
  const colorFor = (score) => score >= 75 ? 'text-emerald-500' : score >= 50 ? 'text-amber-500' : 'text-red-500';
  return (
    <div className="space-y-3">
      <div>
        <h3 className="font-semibold flex items-center gap-2"><Award className="w-4 h-4 text-cyan-500" /> Trust Engine</h3>
        <p className="text-xs text-muted-foreground">Independent trust scores. Never based solely on revenue.</p>
      </div>
      {scores.length === 0 ? (
        <Card><CardContent className="pt-6 pb-6 text-center text-muted-foreground text-sm">No trust scores recorded yet.</CardContent></Card>
      ) : scores.map(s => (
        <Card key={s.id}>
          <CardContent className="pt-4">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-medium text-sm">{s.entity_name}</h4>
                <p className="text-xs text-muted-foreground capitalize">{s.entity_type} · {s.trust_type}</p>
              </div>
              <div className="text-right">
                <p className={`text-2xl font-bold ${colorFor(s.score)}`}>{s.score}</p>
                <Badge variant="outline" className="text-xs capitalize">{s.trend}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function EthicsPanel({ incidents, onRefresh }) {
  const sevColor = { low: 'text-blue-500', medium: 'text-amber-500', high: 'text-orange-500', critical: 'text-red-500' };
  return (
    <div className="space-y-3">
      <div>
        <h3 className="font-semibold flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-red-500" /> Ethics Engine</h3>
        <p className="text-xs text-muted-foreground">Monitors conduct. Detects pressure, misrepresentation, and compliance concerns.</p>
      </div>
      {incidents.length === 0 ? (
        <Card><CardContent className="pt-6 pb-6 text-center text-muted-foreground text-sm">No ethics incidents detected. Good organizational health.</CardContent></Card>
      ) : incidents.map(i => (
        <Card key={i.id}>
          <CardContent className="pt-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="secondary" className="text-xs capitalize">{i.incident_type?.replace(/_/g, ' ')}</Badge>
                  <span className={`text-xs font-medium ${sevColor[i.severity]}`}>{i.severity}</span>
                  <Badge variant="outline" className="text-xs capitalize">{i.status}</Badge>
                </div>
                <p className="text-sm">{i.description}</p>
                <p className="text-xs text-muted-foreground mt-1">Detected by {i.detected_by} · {new Date(i.detected_at).toLocaleDateString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function AssignmentPanel({ assignments, onRefresh }) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="font-semibold flex items-center gap-2"><Users className="w-4 h-4 text-indigo-500" /> Special Assignments</h3>
        <p className="text-xs text-muted-foreground">Founder-created organizational assignments with configurable weights and compensation.</p>
      </div>
      {assignments.length === 0 ? (
        <Card><CardContent className="pt-6 pb-6 text-center text-muted-foreground text-sm">No special assignments active. Templates available for Platform Stress Tester, Compliance Auditor, etc.</CardContent></Card>
      ) : assignments.map(a => (
        <Card key={a.id}>
          <CardContent className="pt-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {a.is_template && <Badge variant="outline" className="text-xs">Template</Badge>}
                  <Badge variant="secondary" className="text-xs capitalize">{a.status}</Badge>
                </div>
                <h4 className="font-medium text-sm">{a.title}</h4>
                <p className="text-xs text-muted-foreground mt-1">{a.mission}</p>
                {a.assigned_to && <p className="text-xs text-muted-foreground mt-1">Assigned to: {a.assigned_to}</p>}
                {a.compensation_adjustment_pct > 0 && <p className="text-xs text-emerald-500 mt-1">Compensation: +{a.compensation_adjustment_pct}%</p>}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function PromotionPanel({ pathways }) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="font-semibold flex items-center gap-2"><TrendingUp className="w-4 h-4 text-blue-500" /> Promotion Pathways</h3>
        <p className="text-xs text-muted-foreground">Configurable promotion requirements. Founder override available.</p>
      </div>
      {pathways.length === 0 ? (
        <Card><CardContent className="pt-6 pb-6 text-center text-muted-foreground text-sm">No promotion pathways defined yet.</CardContent></Card>
      ) : pathways.map(p => (
        <Card key={p.id}>
          <CardContent className="pt-4">
            <h4 className="font-medium text-sm">{p.name}</h4>
            <p className="text-xs text-muted-foreground">{p.from_role} → {p.to_role}</p>
            <div className="flex gap-2 mt-2 flex-wrap">
              {p.trust_score_required > 0 && <Badge variant="outline" className="text-xs">Trust ≥ {p.trust_score_required}</Badge>}
              {p.contribution_score_required > 0 && <Badge variant="outline" className="text-xs">Contribution ≥ {p.contribution_score_required}</Badge>}
              {p.experience_required > 0 && <Badge variant="outline" className="text-xs">Exp ≥ {p.experience_required}</Badge>}
              {p.founder_override_allowed && <Badge variant="outline" className="text-xs">Founder override</Badge>}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}