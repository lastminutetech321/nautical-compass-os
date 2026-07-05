import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Loader2, Sparkles, Target, AlertTriangle, TrendingUp, CheckCircle,
  Clock, Zap, Scale, Compass, Users, BookOpen, Cpu, Flag, Database,
  Music, DollarSign, Radio, Star, ExternalLink, ShieldAlert, Activity,
  BarChart3, Lock, Shield, HeartHandshake, Briefcase
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { calcCompletion, calcOverallReadiness } from "@/components/readiness/ReadinessEngine";
import CanonGapsPanel from "@/components/canon/CanonGapsPanel";
import DevMemoryPanel from "@/components/devmemory/DevMemoryPanel";
import { calcCanonReadiness } from "@/components/readiness/CanonReadiness";
import moment from "moment";

const RAILS = [
  { key: "Legal Rail",       icon: Scale,    color: "text-blue-600 bg-blue-50",      tag: "legal_rail",       path: "/legal-issues" },
  { key: "JurisEngine",      icon: Cpu,       color: "text-violet-600 bg-violet-50",  tag: "jurisengine",      path: "/ai-services" },
  { key: "Culture Rail",     icon: Music,     color: "text-amber-600 bg-amber-50",    tag: "culture_rail",     path: "/culture-rail" },
  { key: "Workforce Rail",   icon: Users,     color: "text-emerald-600 bg-emerald-50",tag: "workforce_rail",   path: "/workforce" },
  { key: "Resource Compass", icon: Compass,   color: "text-cyan-600 bg-cyan-50",      tag: "resource_compass", path: "/resource-compass" },
  { key: "NC Canon",         icon: BookOpen,  color: "text-rose-600 bg-rose-50",      tag: "nc_canon",         path: "/canon" },
];

function pctColor(pct) {
  if (pct >= 80) return "text-emerald-600";
  if (pct >= 40) return "text-amber-600";
  return "text-red-500";
}

function pctBg(pct) {
  if (pct >= 80) return "bg-emerald-500";
  if (pct >= 40) return "bg-amber-500";
  return "bg-red-500";
}

export default function ExecutiveCommand() {
  const [briefing, setBriefing] = useState(null);
  const [crmMetrics, setCrmMetrics] = useState(null);
  const [resourceMetrics, setResourceMetrics] = useState(null);
  const [goals, setGoals] = useState([]);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [aiServices, setAiServices] = useState([]);
  const [builds, setBuilds] = useState([]);
  const [canonEntries, setCanonEntries] = useState([]);
  const [diagnosticIssues, setDiagnosticIssues] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [survivalMetric, setSurvivalMetric] = useState(null);
  const [ncdmOverview, setNcdmOverview] = useState(null);
  const [csMetrics, setCsMetrics] = useState(null);
  const [workforceMetrics, setWorkforceMetrics] = useState(null);
  const [paymentDashboard, setPaymentDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [p, t, g, b, a, br, ce, di, appr, surv] = await Promise.all([
      base44.entities.Project.list("-created_date", 50),
      base44.entities.Task.list("-created_date", 200),
      base44.entities.StrategicGoal.list("-created_date", 20),
      base44.entities.DailyBriefing.filter({ date: moment().format("YYYY-MM-DD") }),
      base44.entities.AIService.list("-created_date", 20),
      base44.entities.BuildRegistry.list("-created_date", 200).catch(() => []),
      base44.entities.CanonEntry.list("-created_date", 500).catch(() => []),
      base44.entities.DiagnosticIssue.filter({ status: "open" }, "-created_date", 50).catch(() => []),
      base44.entities.ApprovalGate.filter({ status: "pending" }, "-created_date", 20).catch(() => []),
      base44.entities.SurvivalMetric.list("-created_date", 1).catch(() => []),
    ]);
    setProjects(p); setTasks(t); setGoals(g); setAiServices(a);
    setBuilds(br); setCanonEntries(ce);
    setDiagnosticIssues(di); setPendingApprovals(appr);
    if (surv.length > 0) setSurvivalMetric(surv[0]);
    if (b.length > 0) setBriefing(b[0]);
    setLoading(false);
    // Load Resource Compass in background
    Promise.all([
      base44.entities.ResourceCase.list("-created_date", 50).catch(() => []),
      base44.entities.ResourceApplication.list("-created_date", 100).catch(() => []),
      base44.entities.ResourceReminder.filter({ status: "pending" }, "due_date", 50).catch(() => []),
    ]).then(([cases, apps, reminders]) => {
      const activeCases = cases.filter(c => ["intake","assessment","active"].includes(c.status));
      const crisisCases = cases.filter(c => ["crisis","emergency"].includes(c.crisis_level));
      const overdueReminders = reminders.filter(r => r.due_date && new Date(r.due_date) < new Date());
      const approved = apps.filter(a => a.status === "approved").length;
      setResourceMetrics({ activeCases: activeCases.length, crisisCases: crisisCases.length, overdueReminders: overdueReminders.length, totalApps: apps.length, approved });
    });

    // Load CRM in background
    Promise.all([
      base44.entities.CRMOpportunity.list("-created_date", 200).catch(() => []),
      base44.entities.CRMDeal.list("-created_date", 200).catch(() => []),
      base44.entities.CRMLead.list("-created_date", 200).catch(() => []),
      base44.entities.CRMContract.list("-created_date", 200).catch(() => []),
    ]).then(([opps, deals, leads, contracts]) => {
      const pipeline = opps.filter(o => !["closed_won","closed_lost"].includes(o.stage)).reduce((s,o) => s+(o.value||0), 0);
      const mrr = deals.filter(d => ["signed","active"].includes(d.status)).reduce((s,d) => s+(d.mrr||0), 0);
      const atRisk = [...opps, ...deals].filter(r => r.relationship_health === "at_risk").length;
      const expiring = contracts.filter(c => c.end_date && new Date(c.end_date) < new Date(Date.now() + 60*24*60*60*1000) && c.status === "active").length;
      setCrmMetrics({ pipeline, mrr, atRisk, expiring, leads: leads.filter(l=>l.status==="new").length, opps: opps.length });
    });

    // Load Customer Success dashboard in background
    base44.functions.invoke('ncCustomerSuccess', { operation: 'dashboard', params: {} })
      .then(res => setCsMetrics(res.data?.metrics))
      .catch(() => {});

    // Load Workforce Gateway executive metrics in background
    base44.functions.invoke('ncWorkforceGateway', { operation: 'executive_metrics', params: {} })
      .then(res => setWorkforceMetrics(res.data?.metrics))
      .catch(() => {});

    // Load Payment Sandbox & Verification dashboard in background
    base44.functions.invoke('ncPaymentSandbox', { operation: 'get_executive_dashboard' })
      .then(res => setPaymentDashboard(res.data))
      .catch(() => {});

    // Load Development Memory overview in background
    base44.functions.invoke('generateBlueprint', { operation: 'overview', params: {} })
      .then(res => setNcdmOverview(res.data?.overview))
      .catch(() => {
        Promise.all([
          base44.entities.EngineeringJournal.list('-created_date', 500).catch(() => []),
          base44.entities.ADR.list('-created_date', 100).catch(() => []),
          base44.entities.PromptLibrary.list('-created_date', 200).catch(() => []),
          base44.entities.BugKnowledgeBase.list('-created_date', 200).catch(() => []),
          base44.entities.LessonLearned.list('-created_date', 200).catch(() => []),
        ]).then(([j, a, p, b, l]) => setNcdmOverview({
          total_journal_entries: j.length, total_adrs: a.length, total_prompts: p.length,
          total_bugs: b.length, total_lessons: l.length,
          total_time_invested_hours: j.reduce((s, x) => s + (x.time_required_hours || 0), 0),
          total_readiness_increase: j.reduce((s, x) => s + (x.readiness_increase || 0), 0),
          accepted_adrs: a.filter(x => x.status === 'accepted').length,
          open_bugs: b.filter(x => x.status === 'open').length,
          applied_lessons: l.filter(x => x.applied_to_future).length,
          avg_prompt_score: p.length > 0 ? Math.round(p.reduce((s, x) => s + (x.success_score || 0), 0) / p.length) : 0,
        }));
      });
  };

  // ── Calculated metrics (no hardcoded %) ──────────────────────────────────

  // Per-rail task-based completion from BuildRegistry
  const railCompletion = RAILS.reduce((acc, rail) => {
    const railBuilds = builds.filter(b => b.rail === rail.tag);
    if (railBuilds.length === 0) {
      // Fallback to Project progress if no registry entry
      const proj = projects.find(p =>
        (p.tags || []).includes(rail.tag) ||
        p.name.toLowerCase().includes(rail.tag.replace(/_/g, " "))
      );
      acc[rail.tag] = proj?.progress || 0;
    } else {
      const totalRequired = railBuilds.reduce((s, b) => s + (b.required_tasks || []).length, 0);
      const totalCompleted = railBuilds.reduce((s, b) => s + (b.completed_tasks || []).length, 0);
      acc[rail.tag] = totalRequired ? Math.round((totalCompleted / totalRequired) * 100) : 0;
    }
    return acc;
  }, {});

  // Canon readiness from real CanonEntry data
  const canonReadiness = calcCanonReadiness(canonEntries);

  // Override NC Canon rail with real calculated value
  railCompletion["nc_canon"] = canonReadiness;

  // Overall platform readiness = average of all rails
  const overallReadiness = Math.round(
    Object.values(railCompletion).reduce((s, v) => s + v, 0) / RAILS.length
  );

  // Build Registry aggregates
  const blockedBuilds = builds.filter(b => b.is_blocked || (b.blocked_by || []).length > 0);
  const criticalBuilds = builds.filter(b => b.priority === "critical");

  // Task metrics
  const activeProjects = projects.filter(p => p.status === "active").length;
  const doneTasks = tasks.filter(t => t.status === "done").length;
  const inProgressTasks = tasks.filter(t => t.status === "in_progress").length;
  const overdueTasks = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== "done").length;
  const totalTasks = tasks.length;
  const taskCompletionPct = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;

  // Readiness engine — from BuildRegistry dimension averages
  const platformBuild = builds.filter(b => b.rail === "platform");
  const avgReadinessDims = platformBuild.length > 0
    ? {
        architecture: Math.round(platformBuild.reduce((s,b) => s+(b.architecture_pct||0),0)/platformBuild.length),
        backend:       Math.round(platformBuild.reduce((s,b) => s+(b.backend_pct||0),0)/platformBuild.length),
        database:      Math.round(platformBuild.reduce((s,b) => s+(b.database_pct||0),0)/platformBuild.length),
        ai:            Math.round(platformBuild.reduce((s,b) => s+(b.ai_pct||0),0)/platformBuild.length),
        testing:       Math.round(platformBuild.reduce((s,b) => s+(b.testing_pct||0),0)/platformBuild.length),
        deployment:    Math.round(platformBuild.reduce((s,b) => s+(b.deployment_pct||0),0)/platformBuild.length),
      }
    : null;

  const generateBriefing = async () => {
    setGenerating(true);
    const active = projects.filter(p => p.status === "active");
    const overdue = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== "done");
    const inProgress = tasks.filter(t => t.status === "in_progress");
    const todo = tasks.filter(t => t.status === "todo");

    const railSummary = RAILS.map(r => {
      const pct = railCompletion[r.tag] || 0;
      return `${r.key}: ${pct}% complete`;
    }).join("\n");

    const buildSummary = builds.length > 0
      ? `\nBUILD REGISTRY (${builds.length} builds):\n` +
        builds.slice(0, 10).map(b => {
          const pct = calcCompletion(b.required_tasks, b.completed_tasks);
          const blocked = b.is_blocked || (b.blocked_by||[]).length > 0;
          return `- ${b.name} [${b.rail}]: ${pct}% complete, priority=${b.priority}${blocked ? " ⚠ BLOCKED" : ""}`;
        }).join("\n")
      : "";

    const canonSummary = `\nNC CANON: ${canonReadiness}% complete (${canonEntries.filter(e=>e.verified&&e.status==="active").length} verified active entries of ${canonEntries.length} total)`;

    const criticalDiagnostics = diagnosticIssues.filter(i => i.severity === "critical");
    const mrr = survivalMetric?.subscription_mrr || 0;
    const runway = survivalMetric?.cash_runway_months || 0;
    const totalCosts = (survivalMetric?.monthly_platform_cost||0) + (survivalMetric?.ai_api_cost||0) + (survivalMetric?.hosting_cost||0);

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are the Chief AI of Nautical Compass OS (NCOS), the operating system for Apex Vision Holdings LLC.
Date: ${moment().format("MMMM D, YYYY")}

PLATFORM HEALTH:
- Overall Readiness: ${overallReadiness}%
- Canon Readiness: ${canonReadiness}%
- Blocked Builds: ${blockedBuilds.length}
- Open Diagnostic Issues: ${diagnosticIssues.length} (${criticalDiagnostics.length} critical)
- Pending Approvals: ${pendingApprovals.length}

RAIL STATUS:
${railSummary}
${canonSummary}

REVENUE HEALTH:
- MRR: $${mrr}/mo
- Cash Runway: ${runway > 0 ? runway + " months" : "Not recorded"}
- Monthly Platform Costs: $${totalCosts}
- Unpaid Invoices: $${survivalMetric?.unpaid_invoices || 0}

CUSTOMER SUCCESS:
- Total Customers: ${csMetrics?.total_customers || 0}
- At-Risk Customers: ${csMetrics?.at_risk_count || 0} (${csMetrics?.critical_count || 0} critical churn risk)
- Founder Alerts: ${csMetrics?.founder_alerts || 0}
- Average Health Score: ${csMetrics?.avg_health_score || 0}/100
- Total CS MRR: $${csMetrics?.total_mrr || 0}
- Upcoming Renewals (30d): ${csMetrics?.upcoming_renewals_30d || 0}
- Stalled Onboarding: ${csMetrics?.stalled_onboarding || 0}
- Avg Feature Adoption: ${csMetrics?.avg_feature_adoption || 0}%
- Avg Onboarding Progress: ${csMetrics?.avg_onboarding_progress || 0}%

ACTIVE PROJECTS (${active.length}):
${active.map(p => `- ${p.name}: ${p.progress}% complete`).join("\n") || "none"}
${buildSummary}

BLOCKED BUILDS (${blockedBuilds.length}):
${blockedBuilds.map(b => `- ${b.name}: blocked by ${(b.blocked_by||[]).join(", ")}`).join("\n") || "none"}

CRITICAL DIAGNOSTIC ISSUES:
${criticalDiagnostics.map(i => `- [${i.category}] ${i.title}`).join("\n") || "none"}

TASK HEALTH: ${doneTasks} done / ${totalTasks} total (${taskCompletionPct}% complete)
- Overdue: ${overdue.map(t=>t.title).join(", ") || "none"}

DEVELOPMENT MEMORY (NCDM):
- Journal Entries: ${ncdmOverview?.total_journal_entries || 0}
- Architecture Decisions: ${ncdmOverview?.total_adrs || 0} (${ncdmOverview?.accepted_adrs || 0} accepted)
- Prompt Library: ${ncdmOverview?.total_prompts || 0} prompts (avg score: ${ncdmOverview?.avg_prompt_score || 0}/100)
- Bug Knowledge Base: ${ncdmOverview?.total_bugs || 0} (${ncdmOverview?.open_bugs || 0} open)
- Lessons Learned: ${ncdmOverview?.total_lessons || 0} (${ncdmOverview?.applied_lessons || 0} applied to future)
- Engineering Time Invested: ${Math.round(ncdmOverview?.total_time_invested_hours || 0)}h
- Readiness Gained: +${ncdmOverview?.total_readiness_increase || 0}%

STRATEGIC GOALS:
${goals.map(g => `${g.title} [${g.status}] — ${g.progress}%`).join("\n") || "none set"}

Generate a comprehensive executive briefing with ALL of these sections:
1. summary: 2-3 sentence NC ecosystem overview — platform health, revenue health, most critical issue
2. priorities: Top 5 concrete actions for today (prioritize Canon population, revenue, and blockers)
3. alerts: All blockers, risks, critical gaps, revenue warnings
4. ai_recommendations: 3-5 strategic recommendations
5. platform_health: One sentence on platform health status
6. revenue_health: One sentence on revenue status and what it means for survival
7. runway_status: Cash runway assessment (or "Not recorded — enter in Survival Engine")
8. highest_value_action: Single most impactful action the founder can take TODAY
9. highest_risk_issue: Single most dangerous risk to platform or mission
10. recommended_sprint: 3-5 sprint tasks for this week
11. approvals_needed: List any items waiting for founder approval (${pendingApprovals.length} pending)
12. development_memory_summary: One sentence on engineering knowledge accumulated (journal entries, ADRs, lessons) and how it makes the next project faster
13. customer_health_summary: One paragraph on overall customer health — average health score, how many at-risk, key patterns
14. retention_risks: Top 2-3 retention risks from the customer success data (specific customers or patterns)
15. expansion_opportunities: 1-2 expansion opportunities (customers showing high adoption who could upgrade)
16. common_onboarding_failures: 1-2 common onboarding failure patterns detected
17. satisfaction_trends: One sentence on satisfaction trend based on NPS and interactions
18. cs_founder_actions: 1-2 specific founder actions for customer success`,
      response_json_schema: {
        type: "object",
        properties: {
          summary: { type: "string" },
          priorities: { type: "array", items: { type: "string" } },
          alerts: { type: "array", items: { type: "object", properties: { type: { type: "string" }, message: { type: "string" }, severity: { type: "string" } }, required: ["type","message","severity"] } },
          ai_recommendations: { type: "array", items: { type: "string" } },
          platform_health: { type: "string" },
          revenue_health: { type: "string" },
          runway_status: { type: "string" },
          highest_value_action: { type: "string" },
          highest_risk_issue: { type: "string" },
          recommended_sprint: { type: "array", items: { type: "string" } },
          approvals_needed: { type: "array", items: { type: "string" } },
          customer_health_summary: { type: "string" },
          retention_risks: { type: "array", items: { type: "string" } },
          expansion_opportunities: { type: "array", items: { type: "string" } },
          common_onboarding_failures: { type: "array", items: { type: "string" } },
          satisfaction_trends: { type: "string" },
          cs_founder_actions: { type: "array", items: { type: "string" } }
        },
        required: ["summary","priorities","alerts","ai_recommendations","platform_health","revenue_health","highest_value_action","highest_risk_issue","recommended_sprint"]
      }
    });

    const created = await base44.entities.DailyBriefing.create({
      date: moment().format("YYYY-MM-DD"),
      ...result,
      metrics_snapshot: {
        overall_readiness: overallReadiness,
        canon_readiness: canonReadiness,
        active_projects: active.length,
        overdue_tasks: overdue.length,
        blocked_builds: blockedBuilds.length,
        total_tasks: totalTasks,
        done_tasks: doneTasks,
        mrr: mrr,
        runway_months: runway,
        diagnostic_issues: diagnosticIssues.length,
        pending_approvals: pendingApprovals.length,
        cs_total_customers: csMetrics?.total_customers || 0,
        cs_at_risk: csMetrics?.at_risk_count || 0,
        cs_critical: csMetrics?.critical_count || 0,
        cs_founder_alerts: csMetrics?.founder_alerts || 0,
        cs_avg_health: csMetrics?.avg_health_score || 0,
      },
      generated_by: "AI"
    });
    setBriefing(created);
    setGenerating(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">NCOS · Executive Command</p>
          <h1 className="text-3xl font-bold tracking-tight">Mission Control</h1>
          <p className="text-muted-foreground mt-1">{moment().format("dddd, MMMM D, YYYY")} · Apex Vision Holdings LLC</p>
        </div>
        <Button onClick={generateBriefing} disabled={generating} className="gap-2">
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {generating ? "Generating NC Briefing..." : "Generate NC Briefing"}
        </Button>
      </div>

      {/* ── Self-Governance Alerts (inline) ── */}
      {(diagnosticIssues.filter(i => i.severity === "critical").length > 0 || pendingApprovals.length > 0) && (
        <div className="flex flex-wrap gap-3">
          {diagnosticIssues.filter(i => i.severity === "critical").length > 0 && (
            <Link to="/self-governance" className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 hover:bg-red-100 transition-colors">
              <AlertTriangle className="w-3.5 h-3.5" />
              <strong>{diagnosticIssues.filter(i => i.severity === "critical").length} critical issues</strong> — click to review
            </Link>
          )}
          {pendingApprovals.length > 0 && (
            <Link to="/self-governance" className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 hover:bg-amber-100 transition-colors">
              <Lock className="w-3.5 h-3.5" />
              <strong>{pendingApprovals.length} approvals pending</strong> — requires founder action
            </Link>
          )}
        </div>
      )}

      {/* ── CEO Readiness Overview ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Overall NC Readiness",
            value: `${overallReadiness}%`,
            icon: Activity,
            color: overallReadiness >= 60 ? "text-emerald-600 bg-emerald-50" : "text-amber-600 bg-amber-50",
            sub: "Calculated from all Rails"
          },
          {
            label: "Canon Readiness",
            value: `${canonReadiness}%`,
            icon: BookOpen,
            color: canonReadiness >= 60 ? "text-blue-600 bg-blue-50" : "text-red-600 bg-red-50",
            sub: `${canonEntries.filter(e=>e.verified&&e.status==="active").length} verified entries`
          },
          {
            label: "Blocked Builds",
            value: blockedBuilds.length,
            icon: ShieldAlert,
            color: blockedBuilds.length > 0 ? "text-red-600 bg-red-50" : "text-emerald-600 bg-emerald-50",
            sub: blockedBuilds.length > 0 ? blockedBuilds.map(b=>b.name).slice(0,2).join(", ") : "None blocked"
          },
          {
            label: "Task Completion",
            value: `${taskCompletionPct}%`,
            icon: CheckCircle,
            color: taskCompletionPct >= 60 ? "text-emerald-600 bg-emerald-50" : "text-amber-600 bg-amber-50",
            sub: `${doneTasks} of ${totalTasks} tasks done`
          },
        ].map(m => (
          <Card key={m.label} className="p-4 border border-border/60">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground">{m.label}</p>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${m.color}`}>
                <m.icon className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold">{m.value}</p>
            <p className="text-[10px] text-muted-foreground mt-1 truncate">{m.sub}</p>
          </Card>
        ))}
      </div>

      {/* ── Rails & Compasses — Calculated ── */}
      <Card className="p-5 border border-border/60">
        <div className="flex items-center gap-2 mb-4">
          <Database className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold">NC Rails & Compasses</h2>
          <Badge variant="outline" className="text-[10px] ml-auto">Calculated from Build Registry + Tasks</Badge>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {RAILS.map(rail => {
            const pct = railCompletion[rail.tag] || 0;
            const railBuilds = builds.filter(b => b.rail === rail.tag);
            const blockedRail = railBuilds.some(b => b.is_blocked || (b.blocked_by||[]).length > 0);
            return (
              <Link key={rail.key} to={rail.path} className="flex items-center gap-3 p-3 rounded-lg border border-border/40 bg-muted/20 hover:bg-muted/40 transition-colors">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${rail.color}`}>
                  <rail.icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-semibold truncate">{rail.key}</p>
                    <div className="flex items-center gap-1.5">
                      {blockedRail && <AlertTriangle className="w-3 h-3 text-red-500" />}
                      <span className={`text-[10px] font-bold ${pctColor(pct)}`}>{pct}%</span>
                    </div>
                  </div>
                  <Progress value={pct} className="h-1.5" />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {railBuilds.length > 0
                      ? `${railBuilds.reduce((s,b)=>(b.completed_tasks||[]).length+s,0)} / ${railBuilds.reduce((s,b)=>(b.required_tasks||[]).length+s,0)} tasks`
                      : "No registry entries"
                    }
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </Card>

      {/* ── Platform Readiness Engine (if data exists) ── */}
      {avgReadinessDims && (
        <Card className="p-5 border border-border/60">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold">Platform Readiness Engine</h2>
            <Badge variant="outline" className="text-[10px] ml-auto">Auto-calculated · No manual %</Badge>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: "Architecture", val: avgReadinessDims.architecture },
              { label: "Backend",      val: avgReadinessDims.backend },
              { label: "Database",     val: avgReadinessDims.database },
              { label: "AI",           val: avgReadinessDims.ai },
              { label: "Testing",      val: avgReadinessDims.testing },
              { label: "Deployment",   val: avgReadinessDims.deployment },
            ].map(d => (
              <div key={d.label} className="text-center p-3 rounded-lg border border-border/40">
                <p className={`text-xl font-black ${pctColor(d.val)}`}>{d.val}%</p>
                <p className="text-[10px] text-muted-foreground mt-1">{d.label}</p>
                <div className="mt-1.5 h-1 rounded-full bg-muted overflow-hidden">
                  <div className={`h-full rounded-full ${pctBg(d.val)} transition-all`} style={{ width: `${d.val}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Blocked Builds Alert ── */}
      {blockedBuilds.length > 0 && (
        <Card className="p-4 border border-red-200 bg-red-50">
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert className="w-4 h-4 text-red-600" />
            <h2 className="text-sm font-semibold text-red-700">Blocked Builds ({blockedBuilds.length})</h2>
          </div>
          <div className="space-y-2">
            {blockedBuilds.map(b => (
              <div key={b.id} className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-red-200">
                <div>
                  <p className="text-sm font-medium text-red-800">{b.name}</p>
                  {(b.blocked_by||[]).length > 0 && (
                    <p className="text-xs text-red-600 mt-0.5">Waiting on: {b.blocked_by.join(", ")}</p>
                  )}
                </div>
                <Badge variant="outline" className="text-[10px] text-red-600 border-red-300">{b.priority}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Briefing + Recommendations ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5 border border-border/60">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold">NC Executive Briefing</h2>
            {briefing && <Badge variant="outline" className="text-[10px] ml-auto">Generated {moment(briefing.created_date).fromNow()}</Badge>}
          </div>
          {!briefing ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground mb-2">No briefing generated yet for today.</p>
              <p className="text-xs text-muted-foreground mb-4">Briefing includes platform health, revenue health, runway, blockers, and recommended sprint.</p>
              <Button size="sm" onClick={generateBriefing} disabled={generating}>
                {generating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                Generate NC Briefing
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">{briefing.summary}</p>

              {/* Governance health row */}
              {(briefing.platform_health || briefing.revenue_health || briefing.runway_status) && (
                <div className="grid grid-cols-1 gap-2">
                  {briefing.platform_health && <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-100 rounded text-xs text-blue-800"><Activity className="w-3.5 h-3.5 flex-shrink-0" /><span><strong>Platform:</strong> {briefing.platform_health}</span></div>}
                  {briefing.revenue_health && <div className="flex items-center gap-2 p-2 bg-emerald-50 border border-emerald-100 rounded text-xs text-emerald-800"><DollarSign className="w-3.5 h-3.5 flex-shrink-0" /><span><strong>Revenue:</strong> {briefing.revenue_health}</span></div>}
                  {briefing.runway_status && <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-100 rounded text-xs text-amber-800"><Clock className="w-3.5 h-3.5 flex-shrink-0" /><span><strong>Runway:</strong> {briefing.runway_status}</span></div>}
                </div>
              )}

              {/* Highest value + highest risk */}
              {(briefing.highest_value_action || briefing.highest_risk_issue) && (
                <div className="grid grid-cols-1 gap-2">
                  {briefing.highest_value_action && <div className="flex items-start gap-2 p-2.5 bg-violet-50 border border-violet-100 rounded text-xs text-violet-800"><Zap className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /><span><strong>Highest-Value Action Today:</strong> {briefing.highest_value_action}</span></div>}
                  {briefing.highest_risk_issue && <div className="flex items-start gap-2 p-2.5 bg-red-50 border border-red-100 rounded text-xs text-red-800"><ShieldAlert className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /><span><strong>Highest Risk:</strong> {briefing.highest_risk_issue}</span></div>}
                </div>
              )}

              {(briefing.alerts||[]).length > 0 && (
                <div className="space-y-1.5">
                  {briefing.alerts.map((a,i) => (
                    <div key={i} className={`flex items-start gap-2 p-2.5 rounded-lg text-xs ${a.severity==="critical"?"bg-red-50 text-red-700 border border-red-100":"bg-amber-50 text-amber-700 border border-amber-100"}`}>
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                      <span><strong>{a.type}:</strong> {a.message}</span>
                    </div>
                  ))}
                </div>
              )}

              {(briefing.priorities||[]).length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Today's NC Priorities</p>
                  <ul className="space-y-1.5">
                    {briefing.priorities.map((p,i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="text-primary font-bold mt-0.5 flex-shrink-0">{i+1}.</span>{p}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {(briefing.recommended_sprint||[]).length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Recommended Sprint</p>
                  <ul className="space-y-1">
                    {briefing.recommended_sprint.map((s,i) => (
                      <li key={i} className="flex items-start gap-2 text-xs">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />{s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {(briefing.approvals_needed||[]).length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-xs font-semibold text-amber-800 mb-1 flex items-center gap-1"><Lock className="w-3 h-3" />Approvals Needed</p>
                  <ul className="space-y-0.5">{briefing.approvals_needed.map((a,i) => <li key={i} className="text-xs text-amber-700">• {a}</li>)}</ul>
                </div>
              )}
            </div>
          )}
        </Card>

        <Card className="p-5 border border-border/60">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold">NC Strategic Recommendations</h2>
          </div>
          {!briefing || !(briefing.ai_recommendations||[]).length ? (
            <p className="text-sm text-muted-foreground text-center py-8">Generate today's briefing to see strategic recommendations.</p>
          ) : (
            <ul className="space-y-3">
              {briefing.ai_recommendations.map((r,i) => (
                <li key={i} className="flex items-start gap-3 p-3 bg-primary/5 rounded-lg border border-primary/10">
                  <Sparkles className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-sm">{r}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* ── Strategic Goals ── */}
      <Card className="p-5 border border-border/60">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold">NC Strategic Goals</h2>
          </div>
          <Badge variant="outline" className="text-xs">{goals.length} goals tracked</Badge>
        </div>
        {goals.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No strategic goals defined yet.</p>
        ) : (
          <div className="space-y-3">
            {goals.map(goal => (
              <div key={goal.id} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{goal.title}</p>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold ${pctColor(goal.progress||0)}`}>{goal.progress||0}%</span>
                    <Badge variant="outline" className={`text-[10px] ${goal.status==="achieved"?"text-emerald-600":goal.status==="at_risk"?"text-red-600":"text-blue-600"}`}>{goal.status}</Badge>
                  </div>
                </div>
                <Progress value={goal.progress||0} className="h-1.5" />
                {goal.target_date && (
                  <p className="text-[10px] text-muted-foreground">Target: {moment(goal.target_date).format("MMM D, YYYY")} · {moment(goal.target_date).fromNow()}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ── Active NC Builds ── */}
      <Card className="p-0 border border-border/60 overflow-hidden">
        <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Active NC Builds</h2>
          <Badge variant="outline" className="text-xs">{activeProjects} active</Badge>
        </div>
        <div className="divide-y divide-border/40">
          {projects.filter(p=>p.status==="active").map(p => (
            <div key={p.id} className="flex items-center justify-between px-5 py-3.5">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{p.name}</p>
                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{p.description}</p>
              </div>
              <div className="text-right flex-shrink-0 ml-4">
                <p className={`text-xs font-semibold ${pctColor(p.progress||0)}`}>{p.progress||0}%</p>
                <div className="w-28 h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${pctBg(p.progress||0)}`} style={{width:`${p.progress||0}%`}} />
                </div>
                {p.end_date && <p className="text-[10px] text-muted-foreground mt-1">Due {moment(p.end_date).fromNow()}</p>}
              </div>
            </div>
          ))}
          {activeProjects===0 && <p className="px-5 py-6 text-sm text-muted-foreground text-center">No active builds</p>}
        </div>
      </Card>

      {/* ── Canon Population Stats ── */}
      <Card className="p-5 border border-border/60">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-violet-500" />
            <h2 className="text-sm font-semibold">NC Canon Population</h2>
          </div>
          <Link to="/canon-ingestion">
            <Badge variant="outline" className="text-[10px] text-violet-600 border-violet-200 cursor-pointer hover:bg-violet-50">Open Ingestion Pipeline →</Badge>
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Total Entries",      value: canonEntries.length,                                                           color: "text-foreground" },
            { label: "Federal Statutes",   value: canonEntries.filter(e => e.category === "federal_statute").length,             color: "text-blue-600" },
            { label: "Case Law",           value: canonEntries.filter(e => e.category === "case_law").length,                    color: "text-violet-600" },
            { label: "Civil Rights",       value: canonEntries.filter(e => e.category === "civil_rights").length,                color: "text-rose-600" },
            { label: "Pending Review",     value: canonEntries.filter(e => e.status === "pending_review").length,                color: canonEntries.filter(e => e.status === "pending_review").length > 0 ? "text-amber-600" : "text-muted-foreground" },
            { label: "Verified Active",    value: canonEntries.filter(e => e.verified === true && e.status === "active").length, color: "text-emerald-600" },
          ].map(s => (
            <div key={s.label} className="text-center p-2 rounded-lg border border-border/40 bg-muted/20">
              <p className={`text-lg font-black ${s.color}`}>{s.value}</p>
              <p className="text-[9px] text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
        <div className="mt-3">
          <CanonGapsPanel compact={true} />
        </div>
        {canonEntries.filter(e => !e.is_canon_gap).length === 0 && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-xs text-amber-700">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            <span><strong>No verified Canon entries.</strong> JurisEngine and all AI services are operating without legal knowledge. Use the Canon Ingestion Pipeline to import federal statutes, case law, and civil rights doctrine.</span>
          </div>
        )}
      </Card>

      {/* ── Resource Compass Strip ── */}
      {resourceMetrics && (
        <Card className="p-4 border border-border/60">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-cyan-500" />
              <h2 className="text-sm font-semibold">Resource Compass Rail</h2>
            </div>
            <Link to="/resource-compass"><Badge variant="outline" className="text-[10px] cursor-pointer hover:bg-muted">Open Rail →</Badge></Link>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
            {[
              { label: "Active Cases", value: resourceMetrics.activeCases, color: resourceMetrics.activeCases > 0 ? "text-blue-600" : "text-muted-foreground" },
              { label: "Crisis Cases", value: resourceMetrics.crisisCases, color: resourceMetrics.crisisCases > 0 ? "text-red-600" : "text-emerald-600" },
              { label: "Applications", value: resourceMetrics.totalApps, color: "text-violet-600" },
              { label: "Approved", value: resourceMetrics.approved, color: "text-emerald-600" },
              { label: "Overdue Deadlines", value: resourceMetrics.overdueReminders, color: resourceMetrics.overdueReminders > 0 ? "text-amber-600" : "text-emerald-600" },
            ].map(m => (
              <div key={m.label} className="text-center p-2.5 bg-muted/30 rounded-lg">
                <p className={`text-lg font-black ${m.color}`}>{m.value}</p>
                <p className="text-[9px] text-muted-foreground mt-0.5">{m.label}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── CRM Metrics Strip ── */}
      {crmMetrics && (
        <Card className="p-4 border border-border/60">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-rose-500" />
              <h2 className="text-sm font-semibold">Enterprise CRM</h2>
            </div>
            <Link to="/crm"><Badge variant="outline" className="text-[10px] cursor-pointer hover:bg-muted">Open CRM →</Badge></Link>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {[
              { label: "Pipeline", value: `$${crmMetrics.pipeline.toLocaleString()}`, color: "text-blue-600" },
              { label: "Active MRR", value: `$${crmMetrics.mrr.toLocaleString()}`, color: "text-emerald-600" },
              { label: "Opportunities", value: crmMetrics.opps, color: "text-violet-600" },
              { label: "New Leads", value: crmMetrics.leads, color: "text-cyan-600" },
              { label: "At Risk", value: crmMetrics.atRisk, color: crmMetrics.atRisk > 0 ? "text-orange-600" : "text-emerald-600" },
              { label: "Expiring Contracts", value: crmMetrics.expiring, color: crmMetrics.expiring > 0 ? "text-red-600" : "text-emerald-600" },
            ].map(m => (
              <div key={m.label} className="text-center p-2.5 bg-muted/30 rounded-lg">
                <p className={`text-lg font-black ${m.color}`}>{m.value}</p>
                <p className="text-[9px] text-muted-foreground mt-0.5">{m.label}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Customer Success Strip ── */}
      {csMetrics && (
        <Card className="p-4 border border-border/60">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <HeartHandshake className="w-4 h-4 text-violet-500" />
              <h2 className="text-sm font-semibold">NC Customer Success</h2>
              {(csMetrics.founder_alerts > 0 || csMetrics.critical_count > 0) && (
                <Badge variant="outline" className="text-[10px] text-red-600 border-red-200 bg-red-50">{csMetrics.founder_alerts} founder alert{(csMetrics.founder_alerts !== 1) ? 's' : ''}</Badge>
              )}
            </div>
            <Link to="/customer-success"><Badge variant="outline" className="text-[10px] cursor-pointer hover:bg-muted">Open CS OS →</Badge></Link>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {[
              { label: "Total Customers", value: csMetrics.total_customers || 0, color: "text-violet-600" },
              { label: "At-Risk", value: csMetrics.at_risk_count || 0, color: (csMetrics.at_risk_count || 0) > 0 ? "text-orange-600" : "text-emerald-600" },
              { label: "Critical Churn", value: csMetrics.critical_count || 0, color: (csMetrics.critical_count || 0) > 0 ? "text-red-600" : "text-emerald-600" },
              { label: "Avg Health", value: `${csMetrics.avg_health_score || 0}/100`, color: (csMetrics.avg_health_score || 0) >= 65 ? "text-emerald-600" : (csMetrics.avg_health_score || 0) >= 45 ? "text-amber-600" : "text-red-600" },
              { label: "CS MRR", value: `$${(csMetrics.total_mrr || 0).toLocaleString()}`, color: "text-emerald-600" },
              { label: "Renewals 30d", value: csMetrics.upcoming_renewals_30d || 0, color: (csMetrics.upcoming_renewals_30d || 0) > 0 ? "text-amber-600" : "text-muted-foreground" },
            ].map(m => (
              <div key={m.label} className="text-center p-2.5 bg-muted/30 rounded-lg">
                <p className={`text-lg font-black ${m.color}`}>{m.value}</p>
                <p className="text-[9px] text-muted-foreground mt-0.5">{m.label}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Workforce Gateway Strip ── */}
      {workforceMetrics && (
        <Card className="p-4 border border-border/60">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-teal-500" />
              <h2 className="text-sm font-semibold">NC Workforce Gateway</h2>
              {workforceMetrics.health_declining && (
                <Badge variant="outline" className="text-[10px] text-red-600 border-red-200 bg-red-50">Health declining</Badge>
              )}
            </div>
            <Link to="/workforce-gateway"><Badge variant="outline" className="text-[10px] cursor-pointer hover:bg-muted">Open Gateway →</Badge></Link>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {[
              { label: "Applicants", value: workforceMetrics.applicants || 0, color: "text-cyan-600" },
              { label: "Workers Ready", value: workforceMetrics.workers_ready || 0, color: "text-emerald-600" },
              { label: "In Training", value: workforceMetrics.workers_in_training || 0, color: "text-violet-600" },
              { label: "Assignments Done", value: workforceMetrics.assignments_completed || 0, color: "text-blue-600" },
              { label: "Avg Readiness", value: `${workforceMetrics.avg_readiness || 0}/100`, color: (workforceMetrics.avg_readiness || 0) >= 60 ? "text-emerald-600" : (workforceMetrics.avg_readiness || 0) >= 40 ? "text-amber-600" : "text-red-600" },
              { label: "Avg Trust", value: `${workforceMetrics.avg_trust || 0}/100`, color: (workforceMetrics.avg_trust || 0) >= 60 ? "text-emerald-600" : (workforceMetrics.avg_trust || 0) >= 40 ? "text-amber-600" : "text-red-600" },
              { label: "Avg Contribution", value: `${workforceMetrics.avg_contribution || 0}/100`, color: "text-purple-600" },
              { label: "Training Pct", value: `${workforceMetrics.training_completion_pct || 0}%`, color: (workforceMetrics.training_completion_pct || 0) >= 60 ? "text-emerald-600" : "text-amber-600" },
              { label: "Retention", value: `${workforceMetrics.retention_pct || 0}%`, color: (workforceMetrics.retention_pct || 0) >= 70 ? "text-emerald-600" : "text-red-600" },
              { label: "Total Workers", value: workforceMetrics.total_workers || 0, color: "text-teal-600" },
              { label: "Coaching Notes", value: workforceMetrics.coaching_notes_total || 0, color: "text-blue-600" },
              { label: "Est. Revenue", value: `$${(workforceMetrics.revenue_generated || 0).toLocaleString()}`, color: "text-emerald-600" },
            ].map(m => (
              <div key={m.label} className="text-center p-2.5 bg-muted/30 rounded-lg">
                <p className={`text-lg font-black ${m.color}`}>{m.value}</p>
                <p className="text-[9px] text-muted-foreground mt-0.5">{m.label}</p>
              </div>
            ))}
          </div>
          {(workforceMetrics.recommended_actions || []).length > 0 && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs font-semibold text-amber-800 mb-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Workforce Health Recommendations</p>
              <ul className="space-y-0.5">
                {workforceMetrics.recommended_actions.map((a, i) => <li key={i} className="text-xs text-amber-700">• {a}</li>)}
              </ul>
            </div>
          )}
          {(workforceMetrics.director_effectiveness || []).length > 0 && (
            <div className="mt-3">
              <p className="text-[10px] font-semibold text-muted-foreground mb-1">Director Effectiveness</p>
              <div className="flex flex-wrap gap-2">
                {workforceMetrics.director_effectiveness.map((d, i) => (
                  <div key={i} className="text-[10px] px-2 py-1 rounded bg-muted/40">
                    <span className="font-medium">{d.director_name}</span>: {d.workers} workers, readiness {d.avg_readiness}%
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* ── Payment Verification Dashboard ── */}
      {paymentDashboard && (
        <Card className="p-4 border border-border/60">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-500" />
              <h2 className="text-sm font-semibold">Payment Verification Dashboard</h2>
              <Badge variant={paymentDashboard.production_status === "active" ? "destructive" : "secondary"} className="text-[10px]">
                {paymentDashboard.production_status === "active" ? "Production Live" : "Sandbox Mode"}
              </Badge>
            </div>
            <Link to="/payment-sandbox"><Badge variant="outline" className="text-[10px] cursor-pointer hover:bg-muted">Open Sandbox →</Badge></Link>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {[
              { label: "Readiness", value: `${paymentDashboard.readiness_score}%`, color: paymentDashboard.readiness_score === 100 ? "text-emerald-600" : paymentDashboard.readiness_score >= 60 ? "text-amber-600" : "text-red-600" },
              { label: "Stripe", value: paymentDashboard.stripe_connection === "connected" ? "Connected" : "Sandbox", color: paymentDashboard.stripe_connection === "connected" ? "text-emerald-600" : "text-muted-foreground" },
              { label: "Simulations", value: paymentDashboard.simulation_count, color: "text-violet-600" },
              { label: "Failed Sims", value: paymentDashboard.failed_simulations, color: paymentDashboard.failed_simulations > 0 ? "text-red-600" : "text-emerald-600" },
              { label: "Webhook Health", value: `${paymentDashboard.webhook_health}%`, color: paymentDashboard.webhook_health >= 80 ? "text-emerald-600" : "text-amber-600" },
              { label: "Verif. Failures", value: paymentDashboard.verification_failures, color: paymentDashboard.verification_failures > 0 ? "text-red-600" : "text-emerald-600" },
            ].map(m => (
              <div key={m.label} className="text-center p-2.5 bg-muted/30 rounded-lg">
                <p className={`text-lg font-black ${m.color}`}>{m.value}</p>
                <p className="text-[9px] text-muted-foreground mt-0.5">{m.label}</p>
              </div>
            ))}
          </div>
          {paymentDashboard.deployment_blockers?.length > 0 && (
            <div className="mt-3 p-2.5 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-xs text-amber-700">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              <span><strong>{paymentDashboard.deployment_blockers.length} deployment blockers</strong> before production activation — {paymentDashboard.deployment_blockers.slice(0,3).join(", ")}{paymentDashboard.deployment_blockers.length > 3 ? "..." : ""}</span>
            </div>
          )}
        </Card>
      )}

      {/* ── Culture Rail Summary ── */}
      <Link to="/culture-rail" className="block group">
        <div className="relative overflow-hidden rounded-xl cursor-pointer transition-all group-hover:scale-[1.01]" style={{background:"#0d0a00",border:"1px solid #3d2e00"}}>
          <div className="absolute inset-0 pointer-events-none" style={{background:"radial-gradient(ellipse at 30% 50%, rgba(201,151,58,0.08) 0%, transparent 70%)"}} />
          <div className="relative p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4" style={{color:"#c9973a"}} />
                <span className="text-xs font-bold tracking-widest uppercase" style={{color:"#c9973a"}}>NC · Culture Rail</span>
                <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{background:"#c9973a"}} />
              </div>
              <div className="flex items-center gap-1.5 text-xs" style={{color:"rgba(201,151,58,0.5)"}}>
                Enter Rail <ExternalLink className="w-3 h-3" />
              </div>
            </div>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {[
                {label:"Artists",     value:"4",     icon:Star},
                {label:"Releases",    value:"2",     icon:Music},
                {label:"Community",   value:"8,412", icon:Users},
                {label:"Radio Spins", value:"298",   icon:Radio},
                {label:"Revenue",     value:"$12.4K",icon:DollarSign},
                {label:"Subscribers", value:"2,109", icon:TrendingUp},
              ].map(m => (
                <div key={m.label} className="text-center">
                  <m.icon className="w-4 h-4 mx-auto mb-1" style={{color:"#c9973a"}} />
                  <p className="text-base font-black" style={{color:"#f5e9c8"}}>{m.value}</p>
                  <p className="text-[9px] mt-0.5" style={{color:"rgba(201,151,58,0.5)"}}>{m.label}</p>
                </div>
              ))}
            </div>
            <p className="text-[9px] uppercase tracking-[0.3em] mt-4 text-center" style={{color:"rgba(201,151,58,0.3)"}}>Truth Is Our North Star</p>
          </div>
        </div>
      </Link>

      {/* ── Development Memory ── */}
      <DevMemoryPanel />

      {/* ── Outstanding Tasks ── */}
      <Card className="p-0 border border-border/60 overflow-hidden">
        <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Outstanding Development Tasks</h2>
          <Badge variant="outline" className="text-xs">{tasks.filter(t=>t.status!=="done").length} open</Badge>
        </div>
        <div className="divide-y divide-border/40">
          {tasks.filter(t=>t.status!=="done").slice(0,8).map(task => (
            <div key={task.id} className="flex items-start justify-between px-5 py-3.5 gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{task.title}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {(task.tags||[]).map(tag=>(
                    <span key={tag} className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">#{tag}</span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge variant="outline" className={`text-[10px] ${task.priority==="critical"?"text-red-600 border-red-200":task.priority==="high"?"text-amber-600 border-amber-200":"text-blue-600 border-blue-200"}`}>{task.priority}</Badge>
                <Badge variant="secondary" className="text-[10px]">{task.status?.replace("_"," ")}</Badge>
              </div>
            </div>
          ))}
          {tasks.filter(t=>t.status!=="done").length===0 && (
            <p className="px-5 py-6 text-sm text-muted-foreground text-center">All tasks complete ✓</p>
          )}
        </div>
      </Card>
    </div>
  );
}