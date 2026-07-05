import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Crown, Activity, Scale, BookOpen, Shield, Brain, DollarSign,
  Clock, TrendingUp, TrendingDown, AlertTriangle, CheckCircle,
  Users, Zap, Target, BarChart3, RefreshCw, Loader2, Lock
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import moment from "moment";
// calcCanonReadiness inlined to avoid broken import
function calcCanonReadiness(entries) {
  const verified = entries.filter(e => e.verified && e.status === "active").length;
  return Math.min(100, Math.round((verified / 25) * 100));
}

function pct(val) { return Math.min(100, Math.max(0, Math.round(val || 0))); }
function pctColor(v) { return v >= 80 ? "text-emerald-600" : v >= 50 ? "text-amber-600" : "text-red-500"; }
function pctBg(v) { return v >= 80 ? "bg-emerald-500" : v >= 50 ? "bg-amber-500" : "bg-red-500"; }

// Weighted readiness formula — transparent calculation
function calcPlatformReadiness({ canonEntries, builds, agents, tasks, issues }) {
  const canonV = canonEntries.filter(e => e.verified && e.status === "active").length;
  const canonTotal = Math.max(1, canonEntries.length);
  const canonScore = pct((canonV / Math.max(1, 25)) * 100); // 25 = target verified entries

  const buildsDone = builds.reduce((s, b) => s + (b.completed_tasks || []).length, 0);
  const buildsTotal = builds.reduce((s, b) => s + (b.required_tasks || []).length, 0);
  const buildScore = buildsTotal > 0 ? pct((buildsDone / buildsTotal) * 100) : 0;

  const agentActive = agents.filter(a => a.tasks_completed > 0).length;
  const agentScore = pct((agentActive / Math.max(1, 8)) * 100); // 8 = target agents

  const tasksDone = tasks.filter(t => t.status === "done").length;
  const taskScore = pct((tasksDone / Math.max(1, tasks.length)) * 100);

  const criticalIssues = issues.filter(i => i.severity === "critical" && i.status === "open").length;
  const securityScore = pct(Math.max(0, 100 - criticalIssues * 20));

  return {
    canon: canonScore,
    engineering: pct((buildScore * 0.6 + taskScore * 0.4)),
    legal: pct((canonScore * 0.7 + agentScore * 0.3)),
    evidence: pct(Math.min(100, builds.filter(b => b.rail === "legal_rail").reduce((s,b)=>(b.completed_tasks||[]).length+s,0) * 10)),
    ai: agentScore,
    security: securityScore,
    overall: pct((canonScore * 0.25 + buildScore * 0.25 + agentScore * 0.15 + taskScore * 0.15 + securityScore * 0.20)),
  };
}

export default function FounderDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    const [builds, canon, agents, tasks, issues, improvements, subs, invoices, survival, goals] = await Promise.all([
      base44.entities.BuildRegistry.list("-created_date", 200).catch(() => []),
      base44.entities.CanonEntry.list("-created_date", 500).catch(() => []),
      base44.entities.AgentProfile.list("-created_date", 100).catch(() => []),
      base44.entities.Task.list("-created_date", 200).catch(() => []),
      base44.entities.DiagnosticIssue.filter({ status: "open" }, "-created_date", 100).catch(() => []),
      base44.entities.ImprovementItem.filter({ status: "queued" }, "-created_date", 50).catch(() => []),
      base44.entities.Subscription.filter({ status: "active" }).catch(() => []),
      base44.entities.Invoice.filter({ status: "open" }).catch(() => []),
      base44.entities.SurvivalMetric.list("-created_date", 1).catch(() => []),
      base44.entities.StrategicGoal.list("-created_date", 10).catch(() => []),
    ]);
    const s = survival[0] || null;
    const readiness = calcPlatformReadiness({ canonEntries: canon, builds, agents, tasks, issues });
    const mrr = subs.reduce((acc, sub) => acc + (sub.mrr || 0), 0);
    const unpaid = invoices.reduce((acc, inv) => acc + (inv.amount_due || 0), 0);
    const totalCosts = s ? (s.monthly_platform_cost||0)+(s.ai_api_cost||0)+(s.hosting_cost||0)+(s.other_costs||0) : 0;
    const netMonthly = (s ? (s.stripe_revenue||0)+(s.subscription_mrr||0) : mrr) - totalCosts;
    setData({ builds, canon, agents, tasks, issues, improvements, subs, invoices, survival: s, goals, readiness, mrr, unpaid, totalCosts, netMonthly });
    if (isRefresh) setRefreshing(false); else setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  const { builds, canon, agents, tasks, issues, improvements, subs, survival, goals, readiness, mrr, unpaid, totalCosts, netMonthly } = data;
  const critIssues = issues.filter(i => i.severity === "critical");
  const blockedBuilds = builds.filter(b => b.is_blocked || (b.blocked_by||[]).length > 0);
  const verifiedCanon = canon.filter(e => e.verified && e.status === "active").length;
  const runway = survival?.cash_runway_months || 0;

  const healthDimensions = [
    { label: "Overall Platform", value: readiness.overall, icon: Activity, path: "/", desc: `${readiness.overall}% across all systems` },
    { label: "Engineering", value: readiness.engineering, icon: Zap, path: "/build-registry", desc: `${builds.filter(b=>!b.is_blocked).length}/${builds.length} builds unblocked` },
    { label: "Legal Readiness", value: readiness.legal, icon: Scale, path: "/jurisengine", desc: `${verifiedCanon} verified Canon entries` },
    { label: "Canon Completion", value: readiness.canon, icon: BookOpen, path: "/canon-ingestion", desc: `${verifiedCanon} of 25+ target entries` },
    { label: "Evidence Readiness", value: readiness.evidence, icon: Shield, path: "/evidence", desc: "Legal Rail build completion" },
    { label: "AI Readiness", value: readiness.ai, icon: Brain, path: "/agent-roster", desc: `${agents.filter(a=>a.tasks_completed>0).length}/${agents.length} agents activated` },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">NCOS · Executive Intelligence</p>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Crown className="w-6 h-6 text-amber-500" />Founder Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">Complete platform health — every metric calculated from live data</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => load(true)} disabled={refreshing}>
          {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        </Button>
      </div>

      {/* Top-level health grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {healthDimensions.map(d => (
          <Link key={d.label} to={d.path}>
            <Card className="p-4 border border-border/60 hover:shadow-md transition-all h-full">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <d.icon className="w-4 h-4 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">{d.label}</p>
                </div>
                <span className={`text-sm font-black ${pctColor(d.value)}`}>{d.value}%</span>
              </div>
              <Progress value={d.value} className="h-2 mb-1.5" />
              <p className="text-[10px] text-muted-foreground">{d.desc}</p>
            </Card>
          </Link>
        ))}
      </div>

      {/* Revenue health row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Revenue Health", value: mrr > 0 ? `$${mrr.toLocaleString()}/mo` : "$0 MRR", icon: DollarSign, color: mrr > 0 ? "text-emerald-600 bg-emerald-50" : "text-red-600 bg-red-50", sub: mrr > 0 ? "Active MRR" : "No revenue yet" },
          { label: "Cash Runway", value: runway > 0 ? `${runway} months` : "Not recorded", icon: Clock, color: runway >= 6 ? "text-emerald-600 bg-emerald-50" : runway > 0 ? "text-amber-600 bg-amber-50" : "text-slate-400 bg-slate-50", sub: "Months of operating capital" },
          { label: "Monthly Net", value: totalCosts > 0 ? `${netMonthly >= 0 ? "+" : ""}$${netMonthly.toLocaleString()}` : "Not tracked", icon: netMonthly >= 0 ? TrendingUp : TrendingDown, color: netMonthly >= 0 ? "text-emerald-600 bg-emerald-50" : totalCosts > 0 ? "text-red-600 bg-red-50" : "text-slate-400 bg-slate-50", sub: totalCosts > 0 ? `Revenue vs $${totalCosts.toLocaleString()} costs` : "Record costs in Survival Engine" },
          { label: "Uncollected", value: unpaid > 0 ? `$${unpaid.toLocaleString()}` : "$0", icon: AlertTriangle, color: unpaid > 0 ? "text-amber-600 bg-amber-50" : "text-emerald-600 bg-emerald-50", sub: `${data.invoices.length} open invoices` },
        ].map(k => (
          <Card key={k.label} className="p-4 border border-border/60">
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${k.color}`}><k.icon className="w-4 h-4" /></div>
              <p className="text-xs text-muted-foreground">{k.label}</p>
            </div>
            <p className="text-lg font-bold pl-10">{k.value}</p>
            <p className="text-[10px] text-muted-foreground pl-10">{k.sub}</p>
          </Card>
        ))}
      </div>

      {/* Highest risk + highest opportunity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4 border border-red-200 bg-red-50">
          <p className="text-xs font-bold text-red-700 uppercase tracking-wide mb-3 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" />Highest Risk</p>
          {critIssues.length === 0 && blockedBuilds.length === 0 ? (
            <p className="text-sm text-emerald-700">✓ No critical risks detected</p>
          ) : (
            <div className="space-y-2">
              {critIssues.slice(0,3).map(i => (
                <div key={i.id} className="p-2 bg-white border border-red-200 rounded text-xs">
                  <p className="font-medium text-red-800">{i.title}</p>
                  {i.description && <p className="text-red-600 mt-0.5 line-clamp-1">{i.description}</p>}
                </div>
              ))}
              {blockedBuilds.slice(0,2).map(b => (
                <div key={b.id} className="p-2 bg-white border border-red-200 rounded text-xs">
                  <p className="font-medium text-red-800">🚧 {b.name} — blocked</p>
                  {(b.blocked_by||[]).length > 0 && <p className="text-red-600 mt-0.5">Waiting on: {b.blocked_by.join(", ")}</p>}
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-4 border border-emerald-200 bg-emerald-50">
          <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide mb-3 flex items-center gap-1.5"><Target className="w-3.5 h-3.5" />Highest Opportunity</p>
          <div className="space-y-2">
            {improvements.slice(0,4).map(i => (
              <div key={i.id} className="p-2 bg-white border border-emerald-200 rounded text-xs">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-emerald-800 truncate">{i.title}</p>
                  {i.estimated_revenue_impact > 0 && <span className="text-emerald-600 font-bold flex-shrink-0">+${i.estimated_revenue_impact.toLocaleString()}</span>}
                </div>
                {i.expected_impact && <p className="text-emerald-600 mt-0.5 line-clamp-1">{i.expected_impact}</p>}
              </div>
            ))}
            {improvements.length === 0 && <p className="text-sm text-muted-foreground">Run Self-Diagnosis to generate opportunities.</p>}
          </div>
        </Card>
      </div>

      {/* Recommended sprint */}
      <Card className="p-5 border border-border/60">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5"><Target className="w-3.5 h-3.5" />Recommended Sprint — This Week</p>
        <SprintRecommendation canon={canon} builds={builds} agents={agents} mrr={mrr} issues={issues} />
      </Card>

      {/* Readiness formula transparency */}
      <Card className="p-5 border border-border/60">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1">How Readiness Is Calculated</p>
        <p className="text-[10px] text-muted-foreground mb-3">Every percentage is derived from live data — never manually set.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {[
            { label: "Canon Score", formula: `${verifiedCanon} verified entries ÷ 25 target × 100 = ${readiness.canon}%`, weight: "25%" },
            { label: "Engineering Score", formula: `Build task completion (60%) + Task completion (40%) = ${readiness.engineering}%`, weight: "25%" },
            { label: "Agent Score", formula: `${agents.filter(a=>a.tasks_completed>0).length} active agents ÷ 8 target × 100 = ${readiness.ai}%`, weight: "15%" },
            { label: "Security Score", formula: `100 − (${critIssues.length} critical issues × 20) = ${readiness.security}%`, weight: "20%" },
          ].map(r => (
            <div key={r.label} className="p-3 bg-muted rounded-lg">
              <div className="flex items-center justify-between mb-1"><span className="font-semibold">{r.label}</span><Badge variant="outline" className="text-[9px]">Weight: {r.weight}</Badge></div>
              <p className="text-muted-foreground">{r.formula}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Strategic goals */}
      {goals.length > 0 && (
        <Card className="p-5 border border-border/60">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5"><Target className="w-3.5 h-3.5" />Strategic Goals</p>
          <div className="space-y-3">
            {goals.map(g => (
              <div key={g.id}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{g.title}</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold ${pctColor(g.progress||0)}`}>{g.progress||0}%</span>
                    <Badge variant="outline" className="text-[10px] capitalize">{g.status}</Badge>
                  </div>
                </div>
                <Progress value={g.progress||0} className="h-1.5" />
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Autonomy policy */}
      <Card className="p-4 border border-violet-200 bg-violet-50">
        <p className="text-xs font-bold text-violet-700 uppercase tracking-wide mb-2 flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" />Long-Term Autonomy Policy</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <p className="font-semibold text-violet-800 mb-1.5">NCOS May Autonomously:</p>
            <ul className="space-y-1 text-violet-700">
              {["Diagnose itself","Plan and prioritize","Document itself","Test itself","Forecast revenue and expenses","Predict blockers and delays","Organize work","Recommend improvements","Forecast hiring and infrastructure needs"].map(a => (
                <li key={a} className="flex items-center gap-1.5"><CheckCircle className="w-2.5 h-2.5 text-emerald-500" />{a}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-semibold text-red-700 mb-1.5">Requires Founder Approval:</p>
            <ul className="space-y-1 text-red-700">
              {["Deploy production","Spend money","Charge customers","Send legal documents","Contact customers","Change verified Canon","Publish legal conclusions","Delete data"].map(a => (
                <li key={a} className="flex items-center gap-1.5"><Lock className="w-2.5 h-2.5 text-red-500" />{a}</li>
              ))}
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}

function SprintRecommendation({ canon, builds, agents, mrr, issues }) {
  const tasks = [];
  const verifiedCanon = canon.filter(e => e.verified && e.status === "active").length;
  if (verifiedCanon === 0) tasks.push({ priority: 1, task: "Upload + verify §1983, FOIA, FCRA into Canon", why: "Unblocks all legal AI services", hours: 4 });
  else if (verifiedCanon < 10) tasks.push({ priority: 1, task: `Add ${10 - verifiedCanon} more verified Canon entries`, why: "Increase JurisEngine coverage to meaningful level", hours: 3 });
  if (mrr === 0) tasks.push({ priority: 2, task: "Create first subscription plan + activate Stripe", why: "Zero MRR = zero runway. First revenue unlocks survival calculation.", hours: 6 });
  const blocked = builds.filter(b => b.is_blocked || (b.blocked_by||[]).length > 0);
  if (blocked.length > 0) tasks.push({ priority: 3, task: `Unblock ${blocked[0].name}`, why: `Blocking ${(blocked[0].blocked_by||[]).join(", ")}`, hours: 2 });
  const critIssues = issues.filter(i => i.severity === "critical");
  if (critIssues.length > 0) tasks.push({ priority: 4, task: "Resolve critical diagnostic issues", why: `${critIssues.length} critical issues degrading platform health`, hours: 4 });
  const idleAgents = agents.filter(a => a.tasks_completed === 0 || a.tasks_completed === undefined);
  if (idleAgents.length > 2) tasks.push({ priority: 5, task: `Dispatch ${idleAgents.length} idle agents to initial tasks`, why: "Unused agents provide zero value", hours: 1 });
  tasks.push({ priority: 6, task: "Run Self-Diagnosis + review Improvement Queue", why: "Keep platform self-aware and improvements moving", hours: 1 });
  tasks.push({ priority: 7, task: "Review Canon Review Queue — verify pending entries", why: "Pending entries block JurisEngine until verified", hours: 2 });

  return (
    <div className="space-y-2">
      {tasks.slice(0, 7).map((t, i) => (
        <div key={i} className="flex items-start gap-3 p-2.5 bg-muted rounded-lg">
          <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] flex items-center justify-center flex-shrink-0 font-bold mt-0.5">{i+1}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{t.task}</p>
            <p className="text-xs text-muted-foreground">{t.why}</p>
          </div>
          <span className="text-[10px] text-muted-foreground flex-shrink-0">{t.hours}h</span>
        </div>
      ))}
    </div>
  );
}