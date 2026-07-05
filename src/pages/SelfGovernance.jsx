import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Activity, AlertTriangle, CheckCircle, Clock, Loader2, Zap, Shield,
  TrendingUp, DollarSign, Users, Brain, RefreshCw, Eye, ThumbsUp, ThumbsDown,
  Lock, Unlock, BarChart3, Target, Cpu, Wrench, Crown, ArrowRight
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import moment from "moment";

const severityColor = {
  critical: "bg-red-100 text-red-800 border-red-200",
  high: "bg-orange-100 text-orange-800 border-orange-200",
  medium: "bg-amber-100 text-amber-800 border-amber-200",
  low: "bg-slate-100 text-slate-600 border-slate-200",
};

const categoryIcon = {
  missing_feature: "🧩", broken_dependency: "🔗", failed_test: "🧪",
  canon_gap: "📚", blocked_build: "🚧", incomplete_workflow: "⚙️",
  security_risk: "🔒", missing_revenue_path: "💰", agent_gap: "🤖",
  data_integrity: "🗄️", performance: "⚡", compliance: "⚖️"
};

const approvalActionLabels = {
  send_email: "Send Email", charge_customer: "Charge Customer", change_pricing: "Change Pricing",
  publish_legal_output: "Publish Legal Output", deploy_code: "Deploy Code", delete_data: "Delete Data",
  contact_third_party: "Contact Third Party", spend_money: "Spend Money",
  change_canon_law: "Change Canon Law", external_message: "External Message",
  hire_agent: "Hire Agent", cancel_subscription: "Cancel Subscription",
};

const approvalRiskColor = {
  critical: "border-red-300 bg-red-50", high: "border-orange-300 bg-orange-50",
  medium: "border-amber-300 bg-amber-50", low: "border-slate-200 bg-slate-50",
};

export default function SelfGovernance() {
  const [issues, setIssues] = useState([]);
  const [improvements, setImprovements] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [survival, setSurvival] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [rejectionNote, setRejectionNote] = useState({});

  const load = async () => {
    setLoading(true);
    const [iss, imp, appr, surv] = await Promise.all([
      base44.entities.DiagnosticIssue.filter({ status: "open" }, "-created_date", 100).catch(() => []),
      base44.entities.ImprovementItem.list("-created_date", 100).catch(() => []),
      base44.entities.ApprovalGate.filter({ status: "pending" }, "-created_date", 50).catch(() => []),
      base44.entities.SurvivalMetric.list("-created_date", 1).catch(() => []),
    ]);
    setIssues(iss); setImprovements(imp); setApprovals(appr);
    if (surv.length > 0) setSurvival(surv[0]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const runDiagnosis = async () => {
    setScanning(true); setScanResult(null);
    const res = await base44.functions.invoke("selfDiagnosis", {});
    setScanResult(res.data);
    setScanning(false);
    load();
  };

  const approveGate = async (gate) => {
    const user = await base44.auth.me();
    await base44.entities.ApprovalGate.update(gate.id, { status: "approved", reviewed_by: user.full_name || user.email, reviewed_at: new Date().toISOString() });
    load();
  };

  const rejectGate = async (gate) => {
    const user = await base44.auth.me();
    await base44.entities.ApprovalGate.update(gate.id, { status: "rejected", reviewed_by: user.full_name || user.email, reviewed_at: new Date().toISOString(), rejection_reason: rejectionNote[gate.id] || "" });
    setRejectionNote(n => { const c = {...n}; delete c[gate.id]; return c; });
    load();
  };

  const approveItem = async (item) => {
    const user = await base44.auth.me();
    await base44.entities.ImprovementItem.update(item.id, { status: "approved", approved_by: user.full_name || user.email, approved_at: new Date().toISOString() });
    load();
  };

  const dismissItem = async (item) => {
    await base44.entities.ImprovementItem.update(item.id, { status: "dismissed" });
    load();
  };

  const dismissIssue = async (issue) => {
    await base44.entities.DiagnosticIssue.update(issue.id, { status: "dismissed" });
    load();
  };

  const criticalIssues = issues.filter(i => i.severity === "critical");
  const highIssues = issues.filter(i => i.severity === "high");
  const queuedItems = improvements.filter(i => i.status === "queued");
  const approvedItems = improvements.filter(i => i.status === "approved");

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">NCOS · Self-Governance Layer</p>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" />Self-Governance
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Platform health monitoring, improvement queue, approval gates, survival engine</p>
        </div>
        <Button onClick={runDiagnosis} disabled={scanning} className="gap-2">
          {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {scanning ? "Scanning Platform..." : "Run Self-Diagnosis"}
        </Button>
      </div>

      {/* Governance notice */}
      <div className="bg-violet-50 border border-violet-200 rounded-lg px-4 py-2.5 mb-5 text-xs text-violet-800 flex items-start gap-2">
        <Lock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
        <span><strong>Governance policy:</strong> Agents may analyze, draft, propose, test, organize, and create internal tasks. They may NOT send external messages, spend money, alter Canon law, deploy production changes, give legal advice, or promise legal results without founder approval.</span>
      </div>

      {/* Scan result flash */}
      {scanResult && (
        <div className="mb-5 p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-800">
          <CheckCircle className="w-4 h-4 inline mr-1.5" />
          <strong>Diagnosis complete:</strong> {scanResult.issues_found} issues found · {scanResult.new_issues_created} new issues created · {scanResult.auto_repairs_dispatched || 0} auto-repairs dispatched · {scanResult.founder_escalations?.length || 0} founder escalations
          {(scanResult.auto_fixable_issues > 0 || scanResult.requires_founder > 0) && (
            <div className="flex gap-3 mt-2">
              {scanResult.auto_fixable_issues > 0 && (
                <Link to="/self-healing" className="inline-flex items-center gap-1 text-xs text-emerald-700 font-medium hover:underline">
                  <Wrench className="w-3 h-3" />Run Self-Healing Engine ({scanResult.auto_fixable_issues} fixable)
                </Link>
              )}
              {scanResult.requires_founder > 0 && (
                <Link to="/founder-package" className="inline-flex items-center gap-1 text-xs text-amber-700 font-medium hover:underline">
                  <Crown className="w-3 h-3" />View Founder Action Package ({scanResult.requires_founder} decisions)
                </Link>
              )}
            </div>
          )}
        </div>
      )}

      {/* Health KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Critical Issues", value: criticalIssues.length, color: criticalIssues.length > 0 ? "text-red-600 bg-red-50" : "text-emerald-600 bg-emerald-50", icon: AlertTriangle },
          { label: "High Issues", value: highIssues.length, color: highIssues.length > 0 ? "text-orange-600 bg-orange-50" : "text-emerald-600 bg-emerald-50", icon: AlertTriangle },
          { label: "Pending Approvals", value: approvals.length, color: approvals.length > 0 ? "text-amber-600 bg-amber-50" : "text-emerald-600 bg-emerald-50", icon: Shield },
          { label: "Queued Improvements", value: queuedItems.length, color: "text-blue-600 bg-blue-50", icon: Zap },
        ].map(k => (
          <Card key={k.label} className="p-4 border border-border/60">
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${k.color}`}><k.icon className="w-4 h-4" /></div>
              <p className="text-xs text-muted-foreground">{k.label}</p>
            </div>
            <p className="text-2xl font-bold pl-10">{k.value}</p>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="diagnosis">
        <TabsList className="mb-5 flex-wrap h-auto">
          <TabsTrigger value="diagnosis">
            Diagnosis ({issues.length})
            {criticalIssues.length > 0 && <span className="ml-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center">{criticalIssues.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="queue">Improvement Queue ({queuedItems.length})</TabsTrigger>
          <TabsTrigger value="approvals">
            Approval Gates ({approvals.length})
            {approvals.length > 0 && <span className="ml-1.5 w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] flex items-center justify-center">{approvals.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="survival">Survival Engine</TabsTrigger>
          <TabsTrigger value="agent-commands">Agent Commands</TabsTrigger>
          <TabsTrigger value="phase2">Phase 2 Systems</TabsTrigger>
        </TabsList>

        {/* DIAGNOSIS TAB */}
        <TabsContent value="diagnosis">
          {issues.length === 0 ? (
            <div className="text-center py-16">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 text-emerald-500 opacity-60" />
              <p className="text-muted-foreground text-sm">No open issues detected. Run Self-Diagnosis to scan the platform.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {["critical","high","medium","low"].map(severity => {
                const severityIssues = issues.filter(i => i.severity === severity);
                if (severityIssues.length === 0) return null;
                return (
                  <div key={severity}>
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">{severity} severity — {severityIssues.length}</p>
                    <div className="space-y-2">
                      {severityIssues.map(issue => (
                        <Card key={issue.id} className={`p-4 border ${severityColor[issue.severity] || ""}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <span className="text-lg flex-shrink-0">{categoryIcon[issue.category] || "⚠️"}</span>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold">{issue.title}</p>
                                {issue.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{issue.description}</p>}
                                {(issue.affected_modules || []).length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1.5">
                                    {issue.affected_modules.map(m => <Badge key={m} variant="outline" className="text-[9px]">{m}</Badge>)}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2 flex-shrink-0">
                             <Badge variant="outline" className="text-[9px] capitalize">{issue.category.replace(/_/g," ")}</Badge>
                             {issue.can_auto_repair && <Badge className="text-[9px] bg-emerald-100 text-emerald-700 border border-emerald-300"><Zap className="w-2.5 h-2.5 mr-1 inline" />Auto-Fixable</Badge>}
                             {issue.escalate_to === "founder" && <Badge className="text-[9px] bg-amber-100 text-amber-700 border border-amber-300"><Crown className="w-2.5 h-2.5 mr-1 inline" />Founder</Badge>}
                             <button onClick={() => dismissIssue(issue)} className="text-[10px] text-muted-foreground hover:text-foreground">dismiss</button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* IMPROVEMENT QUEUE TAB */}
        <TabsContent value="queue">
          {improvements.length === 0 ? (
            <div className="text-center py-16">
              <Zap className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
              <p className="text-muted-foreground text-sm">No improvements queued. Run Self-Diagnosis to generate recommendations.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {improvements.filter(i => !["dismissed"].includes(i.status)).map(item => (
                <Card key={item.id} className="p-4 border border-border/60">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge variant="outline" className={`text-[10px] ${item.priority === "critical" ? "text-red-600 border-red-300" : item.priority === "high" ? "text-orange-600 border-orange-300" : "text-blue-600"}`}>{item.priority}</Badge>
                        <Badge variant="secondary" className="text-[10px] capitalize">{item.status}</Badge>
                        {item.requires_approval && <Badge className="text-[9px] bg-amber-100 text-amber-700 border border-amber-200"><Lock className="w-2.5 h-2.5 mr-1 inline" />Approval Required</Badge>}
                        {item.strategic_priority_score > 0 && <Badge variant="outline" className="text-[9px]">Score: {item.strategic_priority_score}</Badge>}
                        <span className="text-[10px] text-muted-foreground">{item.estimated_effort || `${item.estimated_hours || "?"}h`}</span>
                      </div>
                      <p className="text-sm font-semibold">{item.title}</p>
                      {item.why_it_matters && <p className="text-xs text-muted-foreground mt-0.5">Why: {item.why_it_matters}</p>}
                      {!item.why_it_matters && item.reason && <p className="text-xs text-muted-foreground mt-0.5">{item.reason}</p>}
                    </div>
                    <div className="text-right flex-shrink-0 space-y-1">
                      {item.estimated_revenue_impact > 0 && (
                        <div><p className="text-[9px] text-muted-foreground">Revenue</p><p className="text-xs font-bold text-emerald-600">+${item.estimated_revenue_impact.toLocaleString()}</p></div>
                      )}
                      {item.readiness_increase_pct > 0 && (
                        <div><p className="text-[9px] text-muted-foreground">Readiness</p><p className="text-xs font-bold text-blue-600">+{item.readiness_increase_pct}%</p></div>
                      )}
                      {item.confidence_score > 0 && (
                        <div><p className="text-[9px] text-muted-foreground">Confidence</p><p className="text-xs font-bold">{item.confidence_score}%</p></div>
                      )}
                    </div>
                  </div>
                  {item.what_it_unlocks && <p className="text-xs text-blue-700 mb-2">🔓 Unlocks: {item.what_it_unlocks}</p>}
                  {item.risk_if_delayed && <p className="text-xs text-amber-700 mb-2">⚠ Risk if delayed: {item.risk_if_delayed}</p>}
                  {item.recommended_fix && (
                    <div className="bg-muted rounded-lg p-3 text-xs mb-3 leading-relaxed">{item.recommended_fix}</div>
                  )}
                  {item.expected_impact && (
                    <p className="text-xs text-emerald-700 mb-3"><Target className="w-3 h-3 inline mr-1" />{item.expected_impact}</p>
                  )}
                  {(item.affected_modules || []).length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {item.affected_modules.map(m => <Badge key={m} variant="outline" className="text-[9px]">{m}</Badge>)}
                    </div>
                  )}
                  {item.status === "queued" && (
                    <div className="flex gap-2 pt-2 border-t border-border/40">
                      <Button size="sm" className="h-7 text-xs" onClick={() => approveItem(item)}>
                        <ThumbsUp className="w-3 h-3 mr-1" />Approve
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => dismissItem(item)}>
                        Dismiss
                      </Button>
                    </div>
                  )}
                  {item.status === "approved" && (
                    <div className="flex items-center gap-2 pt-2 border-t border-border/40">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-xs text-emerald-700">Approved by {item.approved_by} · {item.approved_at ? moment(item.approved_at).fromNow() : ""}</span>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* APPROVAL GATES TAB */}
        <TabsContent value="approvals">
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-4 text-xs text-amber-800 flex items-start gap-2">
            <Shield className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span><strong>Human approval required</strong> for: sending emails, charging customers, changing pricing, publishing legal outputs, deploying code, deleting data, contacting third parties, spending money, or changing verified Canon law. Agents may not bypass these gates.</span>
          </div>
          {approvals.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="w-12 h-12 mx-auto mb-3 text-emerald-500 opacity-60" />
              <p className="text-sm text-muted-foreground">No pending approvals. All gates clear.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {approvals.map(gate => (
                <Card key={gate.id} className={`p-4 border ${approvalRiskColor[gate.risk_level] || "border-border"}`}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge className={`text-[10px] ${gate.risk_level === "critical" ? "bg-red-100 text-red-700 border border-red-200" : gate.risk_level === "high" ? "bg-orange-100 text-orange-700 border border-orange-200" : "bg-amber-100 text-amber-700 border border-amber-200"}`}>
                          <Lock className="w-2.5 h-2.5 mr-1 inline" />{gate.risk_level} risk
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">{approvalActionLabels[gate.action_type] || gate.action_type}</Badge>
                      </div>
                      <p className="text-sm font-semibold">{gate.title}</p>
                      {gate.requesting_agent && <p className="text-xs text-muted-foreground">Requested by: {gate.requesting_agent}</p>}
                    </div>
                    {gate.expires_at && <p className="text-[10px] text-muted-foreground flex-shrink-0">Expires {moment(gate.expires_at).fromNow()}</p>}
                  </div>
                  {gate.description && <p className="text-xs text-muted-foreground mb-2">{gate.description}</p>}
                  {gate.payload_summary && <div className="bg-white border border-border/40 rounded p-2 text-xs mb-3 font-mono">{gate.payload_summary}</div>}
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Rejection reason (optional)..."
                      value={rejectionNote[gate.id] || ""}
                      onChange={e => setRejectionNote(n => ({...n, [gate.id]: e.target.value}))}
                      rows={2}
                      className="text-xs resize-none"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700" onClick={() => approveGate(gate)}>
                        <ThumbsUp className="w-3 h-3 mr-1" />Approve
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50" onClick={() => rejectGate(gate)}>
                        <ThumbsDown className="w-3 h-3 mr-1" />Reject
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* SURVIVAL ENGINE TAB */}
        <TabsContent value="survival">
          <SurvivalEnginePanel survival={survival} onRefresh={load} />
        </TabsContent>

        {/* AGENT COMMAND POLICY TAB */}
        <TabsContent value="agent-commands">
          <AgentCommandPolicy />
        </TabsContent>

        {/* PHASE 2 SYSTEMS TAB */}
        <TabsContent value="phase2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { title: "Self-Healing Engine", desc: "Auto-repairs fixable issues. Escalates those requiring founder decision.", path: "/self-healing", icon: Wrench, color: "text-emerald-600 bg-emerald-50", badge: "New" },
              { title: "Dependency Resolution Engine", desc: "Every build knows what blocks it, who owns it, and what unlocks it.", path: "/dependency-engine", icon: Brain, color: "text-blue-600 bg-blue-50", badge: "New" },
              { title: "Canon Population Hub", desc: "Complete Canon infrastructure: intake, quality scoring, AI drafting, verification.", path: "/canon-population", icon: Shield, color: "text-amber-600 bg-amber-50", badge: "New" },
              { title: "Revenue Survival Mode", desc: "Subscription opportunities, enterprise pipeline, invoice follow-up, cash flow.", path: "/revenue-survival", icon: TrendingUp, color: "text-emerald-600 bg-emerald-50", badge: "New" },
              { title: "AI Workforce Activator", desc: "Activates idle agents, dispatches autonomous work queues to every agent.", path: "/workforce-activator", icon: Cpu, color: "text-violet-600 bg-violet-50", badge: "New" },
              { title: "Founder Action Package", desc: "Everything requiring your decision. Nothing else. All AI systems waiting.", path: "/founder-package", icon: Crown, color: "text-amber-600 bg-amber-50", badge: "Priority" },
            ].map(system => (
              <Link key={system.path} to={system.path}>
                <Card className="p-4 border border-border/60 hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer h-full">
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${system.color}`}>
                      <system.icon className="w-4.5 h-4.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-semibold">{system.title}</p>
                        <Badge className="text-[9px] bg-blue-100 text-blue-700 border border-blue-300">{system.badge}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{system.desc}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SurvivalEnginePanel({ survival, onRefresh }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    period: "", period_date: new Date().toISOString().split("T")[0],
    monthly_platform_cost: 0, ai_api_cost: 0, hosting_cost: 0, other_costs: 0,
    stripe_revenue: 0, subscription_mrr: 0, unpaid_invoices: 0, cash_on_hand: 0,
  });

  useEffect(() => {
    if (survival) setForm({
      period: survival.period || "", period_date: survival.period_date || new Date().toISOString().split("T")[0],
      monthly_platform_cost: survival.monthly_platform_cost || 0,
      ai_api_cost: survival.ai_api_cost || 0, hosting_cost: survival.hosting_cost || 0,
      other_costs: survival.other_costs || 0, stripe_revenue: survival.stripe_revenue || 0,
      subscription_mrr: survival.subscription_mrr || 0, unpaid_invoices: survival.unpaid_invoices || 0,
      cash_on_hand: survival.cash_on_hand || 0,
    });
  }, [survival]);

  const save = async () => {
    setSaving(true);
    const totalCosts = Number(form.monthly_platform_cost) + Number(form.ai_api_cost) + Number(form.hosting_cost) + Number(form.other_costs);
    const totalRevenue = Number(form.stripe_revenue) + Number(form.subscription_mrr);
    const breakEven = totalCosts;
    const runway = totalCosts > 0 && Number(form.cash_on_hand) > 0 ? (Number(form.cash_on_hand) / totalCosts).toFixed(1) : 0;
    const requiredSales = Math.max(0, breakEven - totalRevenue);
    const highest = [];
    if (totalRevenue === 0) highest.push("Convert first paying subscriber — any revenue beats zero");
    if (Number(form.unpaid_invoices) > 0) highest.push(`Collect $${Number(form.unpaid_invoices).toFixed(0)} in unpaid invoices`);
    if (totalRevenue > 0 && totalRevenue < breakEven) highest.push(`Add $${requiredSales.toFixed(0)}/mo to reach break-even`);
    highest.push("Upsell existing customers to Professional plan");
    highest.push("Launch referral program to activate commission-driven growth");
    const data = { ...form, monthly_platform_cost: Number(form.monthly_platform_cost), ai_api_cost: Number(form.ai_api_cost), hosting_cost: Number(form.hosting_cost), other_costs: Number(form.other_costs), stripe_revenue: Number(form.stripe_revenue), subscription_mrr: Number(form.subscription_mrr), unpaid_invoices: Number(form.unpaid_invoices), cash_on_hand: Number(form.cash_on_hand), break_even_mrr: breakEven, cash_runway_months: Number(runway), required_new_sales: requiredSales, highest_value_actions: highest };
    if (survival) await base44.entities.SurvivalMetric.update(survival.id, data);
    else await base44.entities.SurvivalMetric.create(data);
    setSaving(false); setEditing(false); onRefresh();
  };

  const totalCosts = (survival?.monthly_platform_cost || 0) + (survival?.ai_api_cost || 0) + (survival?.hosting_cost || 0) + (survival?.other_costs || 0);
  const totalRevenue = (survival?.stripe_revenue || 0) + (survival?.subscription_mrr || 0);
  const netMonthly = totalRevenue - totalCosts;
  const healthColor = netMonthly >= 0 ? "text-emerald-600" : "text-red-600";

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold">Survival Engine</h3>
          <p className="text-xs text-muted-foreground">Platform financial health and runway</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setEditing(!editing)}>{editing ? "Cancel" : "Update Metrics"}</Button>
      </div>

      {editing ? (
        <Card className="p-4 border border-border/60 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Period Label</label><input className="w-full border rounded px-2 py-1 text-sm" value={form.period} onChange={e => setForm({...form, period: e.target.value})} placeholder="July 2026" /></div>
            <div><label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Period Date</label><input type="date" className="w-full border rounded px-2 py-1 text-sm" value={form.period_date} onChange={e => setForm({...form, period_date: e.target.value})} /></div>
          </div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Monthly Costs</p>
          <div className="grid grid-cols-2 gap-3">
            {[["Platform/Base44","monthly_platform_cost"],["AI/API Costs","ai_api_cost"],["Hosting","hosting_cost"],["Other","other_costs"]].map(([label,key]) => (
              <div key={key}><label className="text-xs text-muted-foreground block mb-1">{label} ($)</label><input type="number" className="w-full border rounded px-2 py-1 text-sm" value={form[key]} onChange={e => setForm({...form, [key]: e.target.value})} /></div>
            ))}
          </div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Monthly Revenue</p>
          <div className="grid grid-cols-2 gap-3">
            {[["Stripe Revenue","stripe_revenue"],["Subscription MRR","subscription_mrr"],["Unpaid Invoices","unpaid_invoices"],["Cash on Hand","cash_on_hand"]].map(([label,key]) => (
              <div key={key}><label className="text-xs text-muted-foreground block mb-1">{label} ($)</label><input type="number" className="w-full border rounded px-2 py-1 text-sm" value={form[key]} onChange={e => setForm({...form, [key]: e.target.value})} /></div>
            ))}
          </div>
          <div className="flex justify-end"><Button size="sm" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save Metrics"}</Button></div>
        </Card>
      ) : !survival ? (
        <div className="text-center py-12 border border-dashed border-border rounded-lg">
          <DollarSign className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-30" />
          <p className="text-sm text-muted-foreground mb-3">No survival metrics recorded yet.</p>
          <Button size="sm" onClick={() => setEditing(true)}>Enter Platform Costs & Revenue</Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Total Monthly Costs", value: `$${totalCosts.toLocaleString()}`, color: "text-red-600 bg-red-50", icon: TrendingUp },
              { label: "Total Revenue", value: `$${totalRevenue.toLocaleString()}`, color: "text-emerald-600 bg-emerald-50", icon: DollarSign },
              { label: "Net Monthly", value: `${netMonthly >= 0 ? "+" : ""}$${netMonthly.toLocaleString()}`, color: netMonthly >= 0 ? "text-emerald-600 bg-emerald-50" : "text-red-600 bg-red-50", icon: BarChart3 },
              { label: "Runway", value: survival.cash_runway_months ? `${survival.cash_runway_months} mo` : "N/A", color: (survival.cash_runway_months || 0) > 6 ? "text-emerald-600 bg-emerald-50" : "text-red-600 bg-red-50", icon: Clock },
            ].map(k => (
              <Card key={k.label} className="p-4 border border-border/60">
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${k.color}`}><k.icon className="w-4 h-4" /></div>
                  <p className="text-xs text-muted-foreground">{k.label}</p>
                </div>
                <p className={`text-xl font-bold pl-10 ${k.color.split(" ")[0]}`}>{k.value}</p>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-4 border border-border/60">
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">Cost Breakdown</p>
              {[
                { label: "Platform/Base44", val: survival.monthly_platform_cost || 0 },
                { label: "AI/API", val: survival.ai_api_cost || 0 },
                { label: "Hosting", val: survival.hosting_cost || 0 },
                { label: "Other", val: survival.other_costs || 0 },
              ].map(c => (
                <div key={c.label} className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">{c.label}</span>
                  <span className="font-medium">${c.val.toLocaleString()}</span>
                </div>
              ))}
              <div className="border-t border-border/40 pt-2 flex items-center justify-between text-sm font-bold">
                <span>Total</span><span className="text-red-600">${totalCosts.toLocaleString()}</span>
              </div>
            </Card>

            <Card className="p-4 border border-border/60">
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">Highest-Value Actions</p>
              {(survival.highest_value_actions || []).length === 0 ? (
                <p className="text-xs text-muted-foreground">Run Self-Diagnosis to generate recommendations.</p>
              ) : (
                <ul className="space-y-2">
                  {survival.highest_value_actions.map((a, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs">
                      <span className="text-emerald-600 font-bold flex-shrink-0">{i+1}.</span>{a}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          {survival.break_even_mrr > 0 && (
            <Card className="p-4 border border-border/60">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Break-Even Progress</p>
                <span className="text-xs text-muted-foreground">Target: ${survival.break_even_mrr}/mo</span>
              </div>
              <Progress value={Math.min(100, Math.round((totalRevenue / Math.max(1, survival.break_even_mrr)) * 100))} className="h-2 mb-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Current: ${totalRevenue.toLocaleString()}/mo</span>
                {survival.required_new_sales > 0 && <span className="text-amber-600">Need ${survival.required_new_sales.toLocaleString()} more to break even</span>}
                {survival.required_new_sales === 0 && <span className="text-emerald-600">✓ Break-even reached</span>}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function AgentCommandPolicy() {
  const ALLOWED = [
    { action: "Analyze", desc: "Run analysis on platform data, Canon entries, evidence, or code", icon: "🔍" },
    { action: "Draft", desc: "Prepare documents, memos, strategies, or plans for human review", icon: "✍️" },
    { action: "Propose", desc: "Suggest improvements, fixes, or changes — pending approval", icon: "💡" },
    { action: "Test", desc: "Run internal tests, verify data integrity, check Canon coverage", icon: "🧪" },
    { action: "Organize", desc: "Tag, sort, categorize, and structure existing data", icon: "🗂️" },
    { action: "Summarize", desc: "Condense reports, case notes, documents, and activity logs", icon: "📝" },
    { action: "Create Internal Tasks", desc: "Add items to the improvement queue and issue tracker", icon: "✅" },
  ];
  const PROHIBITED = [
    { action: "Promise legal results", desc: "Cannot guarantee outcomes, verdicts, or legal findings", icon: "⚖️" },
    { action: "Give legal advice", desc: "All legal output is informational only — not legal advice", icon: "🚫" },
    { action: "Spend money", desc: "No charges, purchases, or financial commitments without approval", icon: "💸" },
    { action: "Send external messages", desc: "No emails, texts, or messages to third parties without approval", icon: "📧" },
    { action: "Alter verified Canon law", desc: "Cannot modify, delete, or override verified Canon entries", icon: "📚" },
    { action: "Deploy production changes", desc: "No code deployments or infrastructure changes without approval", icon: "🚀" },
  ];
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Unlock className="w-4 h-4 text-emerald-600" />
          <h3 className="text-sm font-semibold text-emerald-700">Agents May — Without Approval</h3>
        </div>
        <div className="space-y-2">
          {ALLOWED.map(a => (
            <div key={a.action} className="flex items-start gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <span className="text-base flex-shrink-0">{a.icon}</span>
              <div><p className="text-sm font-medium text-emerald-800">{a.action}</p><p className="text-xs text-emerald-700">{a.desc}</p></div>
            </div>
          ))}
        </div>
      </div>
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Lock className="w-4 h-4 text-red-600" />
          <h3 className="text-sm font-semibold text-red-700">Agents May NOT — Requires Founder Approval</h3>
        </div>
        <div className="space-y-2">
          {PROHIBITED.map(a => (
            <div key={a.action} className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <span className="text-base flex-shrink-0">{a.icon}</span>
              <div><p className="text-sm font-medium text-red-800">{a.action}</p><p className="text-xs text-red-700">{a.desc}</p></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}