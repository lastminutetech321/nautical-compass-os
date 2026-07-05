import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Cpu, BarChart3, AlertTriangle, CheckCircle, Clock, TrendingUp,
  GitBranch, Zap, Shield, Layers, Target, RefreshCw, ArrowRight,
  Activity, DollarSign, Users
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";
import moment from "moment";

function pct(n, d) { return d > 0 ? Math.round((n / d) * 100) : 0; }
function pctColor(v) { return v >= 75 ? "text-emerald-600" : v >= 40 ? "text-amber-600" : "text-red-500"; }

const EOS_MODULES = [
  { label: "Build Health", path: "/build-health", icon: "🏗", desc: "All builds, completion %, blockers, velocity" },
  { label: "Arch. Health", path: "/architecture-health", icon: "🏛", desc: "ADRs, debt score, complexity map" },
  { label: "Release Manager", path: "/release-manager", icon: "🚀", desc: "Versions, changelogs, release notes" },
  { label: "Capacity Planner", path: "/capacity-planner", icon: "📐", desc: "Agent capacity, sprint velocity, allocation" },
  { label: "Sprint Board", path: "/sprint-board", icon: "⚡", desc: "Sprints, epics, issue tracking" },
  { label: "Build Registry", path: "/build-registry", icon: "📋", desc: "Full build inventory with readiness scores" },
  { label: "Roadmap", path: "/roadmap", icon: "🗺", desc: "Features, phases, delivery timeline" },
  { label: "Tech Debt", path: "/technical-debt", icon: "🔧", desc: "Debt items, remediation queue" },
];

export default function EngineeringOS() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.BuildRegistry.list("-created_date", 200).catch(() => []),
      base44.entities.IssueTracker.list("-created_date", 200).catch(() => []),
      base44.entities.Sprint.list("-created_date", 50).catch(() => []),
      base44.entities.TechnicalDebt.list("-created_date", 100).catch(() => []),
      base44.entities.AgentProfile.list("-created_date", 100).catch(() => []),
      base44.entities.Release.list("-created_date", 20).catch(() => []),
      base44.entities.ADR.list("-created_date", 50).catch(() => []),
      base44.entities.Milestone.list("-created_date", 50).catch(() => []),
    ]).then(([builds, issues, sprints, debt, agents, releases, adrs, milestones]) => {
      setData({ builds, issues, sprints, debt, agents, releases, adrs, milestones });
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  const { builds, issues, sprints, debt, agents, releases, adrs, milestones } = data;

  const blocked = builds.filter(b => b.is_blocked || (b.blocked_by || []).length > 0);
  const totalTasks = builds.reduce((s, b) => s + (b.required_tasks || []).length, 0);
  const doneTasks = builds.reduce((s, b) => s + (b.completed_tasks || []).length, 0);
  const overallPct = pct(doneTasks, totalTasks);
  const openBugs = issues.filter(i => i.issue_type === "bug" && i.status !== "resolved" && i.status !== "closed");
  const critBugs = openBugs.filter(i => i.priority === "critical");
  const activeSprints = sprints.filter(s => s.status === "active");
  const openDebt = debt.filter(d => d.status !== "resolved");
  const critDebt = openDebt.filter(d => d.severity === "critical");
  const activeAgents = agents.filter(a => a.status === "active");
  const pendingReleases = releases.filter(r => ["planned","in_progress","staged"].includes(r.status));
  const upcomingMilestones = milestones.filter(m => m.due_date && new Date(m.due_date) > new Date() && m.status !== "achieved")
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

  const kpis = [
    { label: "Overall Build %", value: `${overallPct}%`, sub: `${doneTasks}/${totalTasks} tasks`, color: overallPct >= 50 ? "text-emerald-600 bg-emerald-50" : "text-red-500 bg-red-50", icon: BarChart3 },
    { label: "Blocked Builds", value: blocked.length, sub: blocked.length > 0 ? "needs resolution" : "all clear", color: blocked.length > 0 ? "text-red-600 bg-red-50" : "text-emerald-600 bg-emerald-50", icon: AlertTriangle },
    { label: "Open Bugs", value: openBugs.length, sub: `${critBugs.length} critical`, color: critBugs.length > 0 ? "text-red-600 bg-red-50" : openBugs.length > 5 ? "text-amber-600 bg-amber-50" : "text-emerald-600 bg-emerald-50", icon: Shield },
    { label: "Tech Debt Items", value: openDebt.length, sub: `${critDebt.length} critical`, color: critDebt.length > 0 ? "text-red-600 bg-red-50" : "text-amber-600 bg-amber-50", icon: Activity },
    { label: "Active Sprints", value: activeSprints.length, sub: activeSprints[0]?.name || "none running", color: "text-blue-600 bg-blue-50", icon: Zap },
    { label: "Active Agents", value: activeAgents.length, sub: `${agents.length} total`, color: activeAgents.length > 0 ? "text-violet-600 bg-violet-50" : "text-slate-600 bg-slate-50", icon: Users },
    { label: "Pending Releases", value: pendingReleases.length, sub: pendingReleases[0]?.version || "none staged", color: "text-amber-600 bg-amber-50", icon: GitBranch },
    { label: "ADRs", value: adrs.length, sub: `${adrs.filter(a => a.status === "accepted").length} accepted`, color: "text-slate-600 bg-slate-50", icon: Layers },
  ];

  const railStats = [...new Set(builds.map(b => b.rail))].map(rail => {
    const rb = builds.filter(b => b.rail === rail);
    const rd = rb.reduce((s, b) => s + (b.required_tasks || []).length, 0);
    const cd = rb.reduce((s, b) => s + (b.completed_tasks || []).length, 0);
    const p = pct(cd, rd);
    const bl = rb.filter(b => b.is_blocked || (b.blocked_by || []).length > 0).length;
    return { rail, count: rb.length, pct: p, blocked: bl };
  }).sort((a, b) => a.pct - b.pct);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">NCOS · Engineering</p>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Cpu className="w-6 h-6 text-primary" />Engineering Operating System
        </h1>
        <p className="text-sm text-muted-foreground">Platform-wide engineering health — all builds, blockers, agents, and releases in one view</p>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map(k => (
          <Card key={k.label} className="p-4 border border-border/60">
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${k.color}`}>
                <k.icon className="w-4 h-4" />
              </div>
              <p className="text-xs text-muted-foreground">{k.label}</p>
            </div>
            <p className={`text-xl font-bold pl-10 ${k.color.split(" ")[0]}`}>{k.value}</p>
            <p className="text-[10px] text-muted-foreground pl-10">{k.sub}</p>
          </Card>
        ))}
      </div>

      {/* Rail completion */}
      {railStats.length > 0 && (
        <Card className="p-5 border border-border/60">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-4">Rail Completion Status</p>
          <div className="space-y-3">
            {railStats.map(r => (
              <div key={r.rail} className="flex items-center gap-3">
                <span className="text-xs w-36 text-muted-foreground capitalize">{r.rail.replace(/_/g, " ")}</span>
                <Progress value={r.pct} className="flex-1 h-2" />
                <span className={`text-xs font-bold w-10 text-right ${pctColor(r.pct)}`}>{r.pct}%</span>
                {r.blocked > 0 && <Badge variant="outline" className="text-[9px] text-red-600 border-red-200">{r.blocked} blocked</Badge>}
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Upcoming milestones */}
        <Card className="p-4 border border-border/60">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5"><Target className="w-3.5 h-3.5" />Upcoming Milestones</p>
            <Link to="/sprint-board"><span className="text-[10px] text-primary hover:underline">View All</span></Link>
          </div>
          {upcomingMilestones.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">No upcoming milestones</p>
          ) : (
            <div className="space-y-2">
              {upcomingMilestones.slice(0, 5).map(m => (
                <div key={m.id} className="flex items-center gap-3 text-xs">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${m.status === "at_risk" ? "bg-red-500" : "bg-amber-400"}`} />
                  <span className="flex-1 truncate">{m.title}</span>
                  <span className="text-muted-foreground flex-shrink-0">{moment(m.due_date).format("MMM D")}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Blocked builds */}
        <Card className="p-4 border border-border/60">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 text-red-500" />Blocked Builds</p>
            <Link to="/build-registry"><span className="text-[10px] text-primary hover:underline">View All</span></Link>
          </div>
          {blocked.length === 0 ? (
            <div className="flex items-center gap-2 py-4 justify-center text-xs text-emerald-600">
              <CheckCircle className="w-4 h-4" />All builds unblocked
            </div>
          ) : (
            <div className="space-y-2">
              {blocked.slice(0, 5).map(b => (
                <div key={b.id} className="p-2 bg-red-50 border border-red-100 rounded-lg text-xs">
                  <p className="font-semibold text-red-800">{b.name}</p>
                  <p className="text-red-600 mt-0.5">Blocked by: {(b.blocked_by || []).slice(0, 2).join(", ")}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* EOS module navigation */}
      <div>
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">Engineering Modules</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {EOS_MODULES.map(m => (
            <Link key={m.path} to={m.path}>
              <Card className="p-3 border border-border/60 hover:border-primary/50 hover:shadow-sm transition-all h-full cursor-pointer">
                <p className="text-lg mb-1">{m.icon}</p>
                <p className="text-xs font-semibold">{m.label}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{m.desc}</p>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}