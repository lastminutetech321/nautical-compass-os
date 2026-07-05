import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Compass, Loader2, Sparkles, RefreshCw, Crown, Target, Shield, Zap, TrendingUp, Network, Activity, DollarSign, Bot, Users, Building2, BookOpen, FlaskConical, Server, Database, Cloud, Lock, AlertTriangle, Calendar, FileText, Clock, HeartHandshake } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import moment from "moment";

import { useMissionData, calcReadinessScore } from "@/hooks/useMissionData";
import PlatformMap from "@/components/mission/PlatformMap";
import SystemHealth from "@/components/mission/SystemHealth";
import DomainStatus from "@/components/mission/DomainStatus";
import Governance from "@/components/mission/Governance";
import RoadmapTimeline from "@/components/mission/RoadmapTimeline";
import Digests from "@/components/mission/Digests";
import ReadinessBreakdown from "@/components/mission/ReadinessBreakdown";
import DevMemoryPanel from "@/components/devmemory/DevMemoryPanel";

function ReadinessGauge({ score }) {
  const color = score >= 70 ? "text-emerald-600" : score >= 40 ? "text-amber-600" : "text-red-600";
  const bg = score >= 70 ? "from-emerald-500 to-emerald-600" : score >= 40 ? "from-amber-500 to-amber-600" : "from-red-500 to-red-600";
  return (
    <Card className="p-5 border-0 bg-gradient-to-br from-slate-900 to-slate-800 text-white">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-400 font-semibold">Mission Readiness Score</p>
          <p className="text-5xl font-black mt-1">{score}<span className="text-2xl text-slate-400">/100</span></p>
        </div>
        <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${bg} flex items-center justify-center`}>
          <Target className="w-9 h-9 text-white" />
        </div>
      </div>
      <Progress value={score} className="h-2 bg-slate-700" />
      <div className="grid grid-cols-3 gap-2 mt-3 text-center">
        <div><p className="text-xs text-slate-400">Build</p><p className="text-sm font-bold">30%</p></div>
        <div><p className="text-xs text-slate-400">Canon</p><p className="text-sm font-bold">20%</p></div>
        <div><p className="text-xs text-slate-400">Health</p><p className="text-sm font-bold">20%</p></div>
      </div>
      <p className="text-[10px] text-slate-400 mt-2 text-center">
        {score >= 70 ? "Mission ready — all systems operational" : score >= 40 ? "Partial readiness — address critical gaps" : "Mission at risk — immediate action required"}
      </p>
    </Card>
  );
}

function QuickStat({ icon: Icon, label, value, sub, color }) {
  return (
    <Card className="p-3 border border-border/60">
      <div className="flex items-center gap-2 mb-1">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${color}`}><Icon className="w-3.5 h-3.5 text-white" /></div>
        <p className="text-[10px] text-muted-foreground">{label}</p>
      </div>
      <p className="text-lg font-bold pl-9">{value}</p>
      <p className="text-[9px] text-muted-foreground pl-9">{sub}</p>
    </Card>
  );
}

export default function MissionControl() {
  const { data, loading } = useMissionData();
  const [generating, setGenerating] = useState(false);
  const [csMetrics, setCsMetrics] = useState(null);

  useEffect(() => {
    base44.functions.invoke('ncCustomerSuccess', { operation: 'dashboard', params: {} })
      .then(res => setCsMetrics(res.data?.metrics))
      .catch(() => {});
  }, []);

  const readinessScore = calcReadinessScore(data);

  const generateBriefing = async () => {
    if (!data) return;
    setGenerating(true);
    const { builds, canon, agents, tasks, issues, improvements, subs, invoices, survival } = data;
    const verifiedCanon = canon.filter(e => e.verified && e.status === "active").length;
    const blockedBuilds = builds.filter(b => b.is_blocked || (b.blocked_by || []).length > 0);
    const critIssues = issues.filter(i => i.severity === "critical");
    const mrr = subs.reduce((s, sub) => s + (sub.mrr || 0), 0);
    const totalCosts = survival ? (survival.monthly_platform_cost || 0) + (survival.ai_api_cost || 0) + (survival.hosting_cost || 0) + (survival.other_costs || 0) : 0;
    const totalDone = builds.reduce((s, b) => (b.completed_tasks || []).length + s, 0);
    const totalReq = builds.reduce((s, b) => (b.required_tasks || []).length + s, 0);
    const overallPct = totalReq > 0 ? Math.round((totalDone / totalReq) * 100) : 0;

    let ncdmOverview = null;
    try {
      const ncdmRes = await base44.functions.invoke('generateBlueprint', { operation: 'overview', params: {} });
      ncdmOverview = ncdmRes.data?.overview;
    } catch (e) { ncdmOverview = null; }

    let csMetrics = null;
    try {
      const csRes = await base44.functions.invoke('ncCustomerSuccess', { operation: 'dashboard', params: {} });
      csMetrics = csRes.data?.metrics;
    } catch (e) { csMetrics = null; }

    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are the NCOS Executive Intelligence. Generate a comprehensive daily briefing for the Founder.

Date: ${moment().format("MMMM D, YYYY")}
Mission Readiness Score: ${readinessScore}/100

PLATFORM STATE:
- Overall build completion: ${overallPct}%
- Verified Canon entries: ${verifiedCanon} (target: 25+)
- Open diagnostic issues: ${issues.length} (${critIssues.length} critical)
- Blocked builds: ${blockedBuilds.length}
- Active agents: ${agents.filter(a => a.tasks_completed > 0).length}/${agents.length} (${agents.filter(a => a.agent_type === "c_suite").length} C-suite)

REVENUE STATE:
- MRR: $${mrr}/mo
- Monthly costs: $${totalCosts}
- Net: $${mrr - totalCosts}/mo
- Runway: ${survival?.cash_runway_months || "not recorded"} months

CUSTOMER SUCCESS:
- Total Customers: ${csMetrics?.total_customers || 0}
- At-Risk: ${csMetrics?.at_risk_count || 0} (${csMetrics?.critical_count || 0} critical)
- Founder Alerts: ${csMetrics?.founder_alerts || 0}
- Avg Health: ${csMetrics?.avg_health_score || 0}/100
- CS MRR: $${csMetrics?.total_mrr || 0}
- Renewals 30d: ${csMetrics?.upcoming_renewals_30d || 0}
- Stalled Onboarding: ${csMetrics?.stalled_onboarding || 0}

DEVELOPMENT MEMORY (NCDM):
- Journal Entries: ${ncdmOverview?.total_journal_entries || 0}
- Architecture Decisions: ${ncdmOverview?.total_adrs || 0} (${ncdmOverview?.accepted_adrs || 0} accepted)
- Prompt Library: ${ncdmOverview?.total_prompts || 0} (avg score: ${ncdmOverview?.avg_prompt_score || 0}/100)
- Bug KB: ${ncdmOverview?.total_bugs || 0} (${ncdmOverview?.open_bugs || 0} open)
- Lessons Learned: ${ncdmOverview?.total_lessons || 0} (${ncdmOverview?.applied_lessons || 0} applied)
- Engineering Time Invested: ${Math.round(ncdmOverview?.total_time_invested_hours || 0)}h
- Readiness Gained from Dev Memory: +${ncdmOverview?.total_readiness_increase || 0}%

Generate an Executive Briefing covering: what_happened_today, highest_value_action_today, biggest_threat, founder_decision_needed, build_today (array), highest_roi, readiness_increase, revenue_fastest, prevents_technical_debt, development_memory_status (how accumulated engineering knowledge accelerates the next project).`,
      response_json_schema: {
        type: "object",
        properties: {
          what_happened_today: { type: "string" },
          highest_value_action_today: { type: "string" },
          biggest_threat: { type: "string" },
          founder_decision_needed: { type: "string" },
          build_today: { type: "array", items: { type: "string" } },
          highest_roi: { type: "string" },
          readiness_increase: { type: "string" },
          revenue_fastest: { type: "string" },
          prevents_technical_debt: { type: "string" },
        },
        required: ["what_happened_today", "highest_value_action_today", "biggest_threat", "founder_decision_needed", "build_today"]
      }
    });

    await base44.entities.DailyBriefing.create({
      date: moment().format("YYYY-MM-DD"),
      summary: res.what_happened_today,
      priorities: res.build_today || [],
      alerts: [
        ...(res.biggest_threat ? [{ type: "threat", message: res.biggest_threat, severity: "critical" }] : []),
        ...(critIssues.length > 0 ? [{ type: "diagnostic", message: `${critIssues.length} critical issues open`, severity: "high" }] : []),
      ],
      ai_recommendations: [res.highest_roi, res.readiness_increase, res.revenue_fastest, res.prevents_technical_debt].filter(Boolean),
      platform_health: `${overallPct}% build · ${verifiedCanon} verified Canon · ${readinessScore}/100 readiness`,
      revenue_health: mrr > 0 ? `$${mrr}/mo MRR · net $${mrr - totalCosts}/mo` : "Zero MRR — revenue activation critical",
      runway_status: survival?.cash_runway_months ? `${survival.cash_runway_months} months` : "Not recorded",
      highest_value_action: res.highest_value_action_today,
      highest_risk_issue: res.biggest_threat,
      recommended_sprint: res.build_today || [],
      approvals_needed: res.founder_decision_needed ? [res.founder_decision_needed] : [],
      metrics_snapshot: { overall_readiness: overallPct, verified_canon: verifiedCanon, mrr, diagnostic_issues: issues.length, blocked_builds: blockedBuilds.length, active_agents: agents.filter(a => a.tasks_completed > 0).length, readiness_score: readinessScore, cs_total_customers: csMetrics?.total_customers || 0, cs_at_risk: csMetrics?.at_risk_count || 0, cs_founder_alerts: csMetrics?.founder_alerts || 0, cs_avg_health: csMetrics?.avg_health_score || 0 },
      generated_by: "NCOS Mission Control v3",
      extended_data: res,
    });
    setGenerating(false);
    window.location.reload();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!data) return null;

  const { builds, canon, agents, issues, subs, survival, approvals, notifications } = data;
  const verifiedCanon = canon.filter(e => e.verified && e.status === "active").length;
  const critIssues = issues.filter(i => i.severity === "critical").length;
  const mrr = subs.reduce((s, sub) => s + (sub.mrr || 0), 0);
  const openApprovals = approvals.length;
  const activeAlerts = notifications.filter(n => !n.read && (n.severity === "high" || n.severity === "critical" || n.type === "error" || n.type === "approval_needed")).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">NCOS · Mission Control v3</p>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Compass className="w-6 h-6 text-primary" />Mission Control
          </h1>
          <p className="text-muted-foreground text-sm">{moment().format("dddd, MMMM D, YYYY")} · Readiness: {readinessScore}/100 · 25 monitoring modules</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => window.location.reload()} variant="outline" size="sm"><RefreshCw className="w-4 h-4 mr-1.5" />Refresh</Button>
          <Button onClick={generateBriefing} disabled={generating} size="sm">
            {generating ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Sparkles className="w-4 h-4 mr-1.5" />}
            {generating ? "Generating…" : "Founder Briefing"}
          </Button>
        </div>
      </div>

      {/* Top Row: Readiness Score + Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <ReadinessGauge score={readinessScore} />
        <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-3">
          <QuickStat icon={TrendingUp} label="MRR" value={`$${mrr.toLocaleString()}`} sub={mrr > 0 ? "Monthly recurring" : "Zero revenue"} color="bg-emerald-600" />
          <QuickStat icon={Shield} label="Critical Issues" value={critIssues} sub={`${issues.length} total open`} color={critIssues > 0 ? "bg-red-600" : "bg-emerald-600"} />
          <QuickStat icon={Crown} label="Canon Verified" value={verifiedCanon} sub={`${canon.length} total entries`} color="bg-amber-600" />
          <QuickStat icon={Zap} label="AI Workforce" value={agents.length} sub={`${agents.filter(a => a.status === "active").length} active`} color="bg-violet-600" />
          <QuickStat icon={Target} label="Open Approvals" value={openApprovals} sub="Pending founder review" color={openApprovals > 0 ? "bg-amber-600" : "bg-emerald-600"} />
          <QuickStat icon={Shield} label="Active Alerts" value={activeAlerts} sub="Unread high/critical" color={activeAlerts > 0 ? "bg-red-600" : "bg-emerald-600"} />
          <QuickStat icon={TrendingUp} label="Builds" value={builds.length} sub={`${builds.filter(b => b.is_blocked).length} blocked`} color="bg-blue-600" />
          <QuickStat icon={Crown} label="Runway" value={survival?.cash_runway_months ? `${survival.cash_runway_months}mo` : "—"} sub={survival?.cash_on_hand ? `$${(survival.cash_on_hand || 0).toLocaleString()} cash` : "Not recorded"} color={survival?.cash_runway_months && survival.cash_runway_months < 6 ? "bg-red-600" : "bg-emerald-600"} />
          <QuickStat icon={HeartHandshake} label="Cust. Success" value={csMetrics ? `${csMetrics.at_risk_count} at risk` : "—"} sub={csMetrics ? `${csMetrics.total_customers} total · ${csMetrics.avg_health_score}/100 health` : "Not loaded"} color={csMetrics && csMetrics.at_risk_count > 0 ? "bg-orange-600" : "bg-violet-600"} />
        </div>
      </div>

      {/* Main Content Tabs — 7 tabs mapping to all 25 modules */}
      <Tabs defaultValue="command">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="command"><Target className="w-3.5 h-3.5 mr-1" />Command</TabsTrigger>
          <TabsTrigger value="platform"><Network className="w-3.5 h-3.5 mr-1" />Platform</TabsTrigger>
          <TabsTrigger value="health"><Activity className="w-3.5 h-3.5 mr-1" />System Health</TabsTrigger>
          <TabsTrigger value="domains"><Building2 className="w-3.5 h-3.5 mr-1" />Domains</TabsTrigger>
          <TabsTrigger value="governance"><Lock className="w-3.5 h-3.5 mr-1" />Governance</TabsTrigger>
          <TabsTrigger value="timeline"><Calendar className="w-3.5 h-3.5 mr-1" />Timeline</TabsTrigger>
          <TabsTrigger value="briefings"><Crown className="w-3.5 h-3.5 mr-1" />Briefings</TabsTrigger>
        </TabsList>

        {/* COMMAND TAB — Mission Readiness Score + Breakdown */}
        <TabsContent value="command" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ReadinessBreakdown data={data} score={readinessScore} />
            <SystemHealth data={data} />
          </div>
        </TabsContent>

        {/* PLATFORM TAB — Platform Map + Dependency Graph */}
        <TabsContent value="platform" className="space-y-4 mt-4">
          <PlatformMap data={data} />
        </TabsContent>

        {/* SYSTEM HEALTH TAB — Live System Health (System, Hosting, Database, API, Infrastructure, Automation) */}
        <TabsContent value="health" className="space-y-4 mt-4">
          <SystemHealth data={data} />
        </TabsContent>

        {/* DOMAINS TAB — Revenue, AI Workforce, Customer, Enterprise, Canon, Evidence, Workforce, Authority, Build */}
        <TabsContent value="domains" className="space-y-4 mt-4">
          <DomainStatus data={data} />
        </TabsContent>

        {/* GOVERNANCE TAB — Approvals, Alerts, Risks, Forecasts, Roadmap */}
        <TabsContent value="governance" className="space-y-4 mt-4">
          <Governance data={data} />
        </TabsContent>

        {/* TIMELINE TAB — Roadmap + Executive Timeline */}
        <TabsContent value="timeline" className="space-y-4 mt-4">
          <RoadmapTimeline data={data} />
        </TabsContent>

        {/* BRIEFINGS TAB — Founder Briefing + Daily/Weekly/Monthly Digests */}
        <TabsContent value="briefings" className="space-y-4 mt-4">
          <Digests data={data} />
          <DevMemoryPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}