import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Cpu, AlertTriangle, CheckCircle, Clock, TrendingUp, Zap,
  RefreshCw, Loader2, BarChart3, Target, GitBranch, Database,
  Activity, Plus, Filter
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { calcCompletion, calcOverallReadiness } from "@/components/readiness/ReadinessEngine";
import { Link } from "react-router-dom";
import moment from "moment";

function pctColor(v) { return v >= 75 ? "text-emerald-600" : v >= 45 ? "text-amber-600" : "text-red-500"; }
function pctBg(v) { return v >= 75 ? "bg-emerald-500" : v >= 45 ? "bg-amber-500" : "bg-red-500"; }

const RAIL_ORDER = ["platform","legal_rail","jurisengine","nc_canon","workforce_rail","culture_rail","resource_compass","mission_control","custom"];

export default function Engineering() {
  const [builds, setBuilds] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [issues, setIssues] = useState([]);
  const [debt, setDebt] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [epics, setEpics] = useState([]);
  const [roadmap, setRoadmap] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    const [b, t, i, d, sp, ep, rm] = await Promise.all([
      base44.entities.BuildRegistry.list("-created_date", 300).catch(() => []),
      base44.entities.Task.list("-created_date", 300).catch(() => []),
      base44.entities.DiagnosticIssue.filter({ status: "open" }, "-created_date", 100).catch(() => []),
      base44.entities.TechnicalDebt.list("-created_date", 100).catch(() => []),
      base44.entities.Sprint.list("-created_date", 50).catch(() => []),
      base44.entities.Epic.list("-created_date", 100).catch(() => []),
      base44.entities.RoadmapItem.list("-created_date", 100).catch(() => []),
    ]);
    setBuilds(b); setTasks(t); setIssues(i); setDebt(d); setSprints(sp); setEpics(ep); setRoadmap(rm);
    if (isRefresh) setRefreshing(false); else setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  // Aggregate metrics
  const totalReq = builds.reduce((s, b) => s + (b.required_tasks||[]).length, 0);
  const totalDone = builds.reduce((s, b) => s + (b.completed_tasks||[]).length, 0);
  const buildPct = totalReq > 0 ? Math.round((totalDone / totalReq) * 100) : 0;
  const blockedBuilds = builds.filter(b => b.is_blocked || (b.blocked_by||[]).length > 0);
  const critIssues = issues.filter(i => i.severity === "critical");
  const highDebt = debt.filter(d => d.severity === "critical" || d.severity === "high");
  const tasksDone = tasks.filter(t => t.status === "done").length;
  const taskPct = tasks.length > 0 ? Math.round((tasksDone / tasks.length) * 100) : 0;
  const overdueTasks = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== "done");
  const activeSprint = sprints.find(s => s.status === "active");

  // Per-rail breakdown
  const railBreakdown = RAIL_ORDER.map(rail => {
    const railBuilds = builds.filter(b => b.rail === rail);
    if (railBuilds.length === 0) return null;
    const req = railBuilds.reduce((s, b) => s + (b.required_tasks||[]).length, 0);
    const done = railBuilds.reduce((s, b) => s + (b.completed_tasks||[]).length, 0);
    const pct = req > 0 ? Math.round((done / req) * 100) : 0;
    const blocked = railBuilds.filter(b => b.is_blocked || (b.blocked_by||[]).length > 0).length;
    return { rail, builds: railBuilds.length, req, done, pct, blocked };
  }).filter(Boolean);

  // Velocity (tasks completed recently)
  const weekAgo = moment().subtract(7, "days");
  const recentlyDone = tasks.filter(t => t.status === "done" && moment(t.updated_date).isAfter(weekAgo)).length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">NCOS · Engineering OS</p>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Cpu className="w-6 h-6 text-blue-500" />Engineering Health
          </h1>
          <p className="text-sm text-muted-foreground">Complete build health, velocity, debt, and dependency tracking</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => load(true)} disabled={refreshing}>
            {refreshing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          </Button>
          <Link to="/build-registry"><Button size="sm"><Plus className="w-3.5 h-3.5 mr-1.5" />Build Registry</Button></Link>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          { label: "Build %", value: `${buildPct}%`, color: pctColor(buildPct), sub: `${totalDone}/${totalReq} tasks` },
          { label: "Velocity", value: recentlyDone, color: recentlyDone > 5 ? "text-emerald-600" : "text-amber-600", sub: "tasks/7 days" },
          { label: "Blocked", value: blockedBuilds.length, color: blockedBuilds.length > 0 ? "text-red-600" : "text-emerald-600", sub: "builds" },
          { label: "Critical", value: critIssues.length, color: critIssues.length > 0 ? "text-red-600" : "text-emerald-600", sub: "issues" },
          { label: "Tech Debt", value: highDebt.length, color: highDebt.length > 2 ? "text-amber-600" : "text-emerald-600", sub: "high+ severity" },
          { label: "Overdue", value: overdueTasks.length, color: overdueTasks.length > 0 ? "text-amber-600" : "text-emerald-600", sub: "tasks" },
          { label: "Sprints", value: sprints.length, color: "text-blue-600", sub: `${activeSprint ? "1 active" : "none active"}` },
          { label: "Epics", value: epics.length, color: "text-violet-600", sub: `${epics.filter(e => e.status === "in_progress").length} active` },
        ].map(k => (
          <Card key={k.label} className="p-3 border border-border/60 text-center">
            <p className={`text-xl font-black ${k.color}`}>{k.value}</p>
            <p className="text-[10px] font-semibold">{k.label}</p>
            <p className="text-[9px] text-muted-foreground">{k.sub}</p>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="health">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="health">Build Health</TabsTrigger>
          <TabsTrigger value="rails">Rail Breakdown</TabsTrigger>
          <TabsTrigger value="velocity">Velocity</TabsTrigger>
          <TabsTrigger value="debt">Tech Debt ({highDebt.length})</TabsTrigger>
          <TabsTrigger value="blockers">Blockers ({blockedBuilds.length})</TabsTrigger>
        </TabsList>

        {/* Build Health */}
        <TabsContent value="health">
          <div className="space-y-3 mt-4">
            {builds.slice(0, 20).map(b => {
              const pct = calcCompletion(b.required_tasks, b.completed_tasks);
              const overall = calcOverallReadiness(b);
              const blocked = b.is_blocked || (b.blocked_by||[]).length > 0;
              return (
                <Card key={b.id} className={`p-4 border ${blocked ? "border-red-200 bg-red-50/20" : "border-border/60"}`}>
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {blocked && <AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
                        <p className="text-sm font-semibold">{b.name}</p>
                        <Badge variant="outline" className="text-[9px] capitalize">{b.rail?.replace(/_/g, " ")}</Badge>
                        <Badge variant="outline" className={`text-[9px] ${b.priority === "critical" ? "text-red-600 border-red-200" : b.priority === "high" ? "text-amber-600 border-amber-200" : ""}`}>{b.priority}</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <div>
                          <div className="flex items-center justify-between text-[10px] mb-0.5">
                            <span className="text-muted-foreground">Task completion</span>
                            <span className={`font-bold ${pctColor(pct)}`}>{pct}%</span>
                          </div>
                          <Progress value={pct} className="h-1.5" />
                        </div>
                        <div>
                          <div className="flex items-center justify-between text-[10px] mb-0.5">
                            <span className="text-muted-foreground">Readiness</span>
                            <span className={`font-bold ${pctColor(overall)}`}>{overall}%</span>
                          </div>
                          <Progress value={overall} className="h-1.5" />
                        </div>
                      </div>
                      {blocked && (b.blocked_by||[]).length > 0 && (
                        <p className="text-xs text-red-600 mt-1.5">⚠ Blocked by: {b.blocked_by.join(", ")}</p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-muted-foreground">{b.deployment_status?.replace(/_/g," ")}</p>
                      {b.estimated_finish_date && (
                        <p className="text-[10px] text-muted-foreground">{moment(b.estimated_finish_date).fromNow()}</p>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
            {builds.length === 0 && (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">No builds registered yet.</p>
                <Link to="/build-registry"><Button size="sm" className="mt-3">Open Build Registry</Button></Link>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Rail Breakdown */}
        <TabsContent value="rails">
          <div className="space-y-3 mt-4">
            {railBreakdown.map(r => (
              <Card key={r.rail} className="p-4 border border-border/60">
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-sm font-semibold capitalize">{r.rail.replace(/_/g," ")}</p>
                      <div className="flex items-center gap-2">
                        {r.blocked > 0 && <Badge variant="outline" className="text-[9px] text-red-600 border-red-200">{r.blocked} blocked</Badge>}
                        <span className={`text-sm font-bold ${pctColor(r.pct)}`}>{r.pct}%</span>
                      </div>
                    </div>
                    <Progress value={r.pct} className="h-2" />
                    <p className="text-[10px] text-muted-foreground mt-1">{r.done}/{r.req} tasks · {r.builds} builds</p>
                  </div>
                </div>
              </Card>
            ))}
            {railBreakdown.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No build data by rail yet.</p>}
          </div>
        </TabsContent>

        {/* Velocity */}
        <TabsContent value="velocity">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <Card className="p-4 border border-border/60">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5" />7-Day Velocity</p>
              <p className="text-3xl font-black text-primary">{recentlyDone}</p>
              <p className="text-xs text-muted-foreground">tasks completed this week</p>
            </Card>
            <Card className="p-4 border border-border/60">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1.5"><Target className="w-3.5 h-3.5" />Active Sprint</p>
              {activeSprint ? (
                <div>
                  <p className="text-sm font-semibold">{activeSprint.name}</p>
                  <p className="text-xs text-muted-foreground">{activeSprint.start_date} → {activeSprint.end_date}</p>
                  {activeSprint.goal && <p className="text-xs mt-1 bg-muted p-1.5 rounded">{activeSprint.goal}</p>}
                </div>
              ) : <p className="text-sm text-muted-foreground">No active sprint</p>}
            </Card>
            <Card className="p-4 border border-border/60">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1.5"><BarChart3 className="w-3.5 h-3.5" />Task Pipeline</p>
              {[
                { label: "Backlog", count: tasks.filter(t=>t.status==="backlog").length, color: "bg-slate-400" },
                { label: "Todo", count: tasks.filter(t=>t.status==="todo").length, color: "bg-blue-400" },
                { label: "In Progress", count: tasks.filter(t=>t.status==="in_progress").length, color: "bg-amber-400" },
                { label: "Review", count: tasks.filter(t=>t.status==="review").length, color: "bg-violet-400" },
                { label: "Done", count: tasks.filter(t=>t.status==="done").length, color: "bg-emerald-400" },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-2 mb-1">
                  <div className={`w-2 h-2 rounded-full ${s.color}`} />
                  <span className="text-xs text-muted-foreground w-20">{s.label}</span>
                  <span className="text-xs font-semibold">{s.count}</span>
                </div>
              ))}
            </Card>
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-4 border border-border/60">
              <p className="text-xs font-bold uppercase text-muted-foreground mb-3 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 text-amber-500" />Overdue Tasks ({overdueTasks.length})</p>
              {overdueTasks.slice(0, 5).map(t => (
                <div key={t.id} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
                  <p className="text-xs truncate">{t.title}</p>
                  <span className="text-[10px] text-red-500 flex-shrink-0 ml-2">{moment(t.due_date).fromNow()}</span>
                </div>
              ))}
              {overdueTasks.length === 0 && <p className="text-xs text-muted-foreground">No overdue tasks ✓</p>}
            </Card>
            <Card className="p-4 border border-border/60">
              <p className="text-xs font-bold uppercase text-muted-foreground mb-3 flex items-center gap-1.5"><GitBranch className="w-3.5 h-3.5 text-violet-500" />Active Epics ({epics.filter(e=>e.status==="in_progress").length})</p>
              {epics.filter(e => e.status === "in_progress").map(ep => (
                <div key={ep.id} className="mb-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium truncate">{ep.title}</p>
                    <span className="text-[10px] text-muted-foreground ml-2">{ep.completion_pct||0}%</span>
                  </div>
                  <Progress value={ep.completion_pct||0} className="h-1 mt-1" />
                </div>
              ))}
              {epics.filter(e => e.status === "in_progress").length === 0 && <p className="text-xs text-muted-foreground">No active epics</p>}
            </Card>
          </div>
        </TabsContent>

        {/* Tech Debt */}
        <TabsContent value="debt">
          <div className="space-y-3 mt-4">
            {debt.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-8 h-8 mx-auto mb-2 text-emerald-500 opacity-50" />
                <p className="text-sm text-muted-foreground">No technical debt tracked yet.</p>
                <Link to="/technical-debt"><Button size="sm" className="mt-3">Open Tech Debt Tracker</Button></Link>
              </div>
            ) : debt.map(d => (
              <Card key={d.id} className={`p-3 border ${d.severity === "critical" ? "border-red-200 bg-red-50/20" : d.severity === "high" ? "border-amber-200" : "border-border/60"}`}>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium">{d.title}</p>
                  <div className="flex gap-1 flex-shrink-0">
                    <Badge variant="outline" className="text-[9px] capitalize">{d.severity}</Badge>
                    <Badge variant="outline" className="text-[9px] capitalize">{d.status}</Badge>
                  </div>
                </div>
                {d.description && <p className="text-xs text-muted-foreground mt-1">{d.description}</p>}
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Blockers */}
        <TabsContent value="blockers">
          <div className="space-y-3 mt-4">
            {blockedBuilds.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-8 h-8 mx-auto mb-2 text-emerald-500 opacity-50" />
                <p className="text-sm text-emerald-600 font-medium">No blocked builds ✓</p>
              </div>
            ) : blockedBuilds.map(b => (
              <Card key={b.id} className="p-4 border border-red-200 bg-red-50/20">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    <p className="text-sm font-semibold text-red-800">{b.name}</p>
                  </div>
                  <Badge variant="outline" className="text-[9px] capitalize text-red-600 border-red-200">{b.priority}</Badge>
                </div>
                {(b.blocked_by||[]).length > 0 && (
                  <div className="mt-2">
                    <p className="text-[10px] font-semibold text-muted-foreground mb-1">BLOCKED BY:</p>
                    {b.blocked_by.map(dep => (
                      <div key={dep} className="flex items-center gap-1.5 text-xs text-red-700 mb-1">
                        <ChevronRight className="w-3 h-3" />{dep}
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>Rail: {b.rail?.replace(/_/g," ")}</span>
                  <Link to="/build-registry">
                    <span className="text-primary hover:underline cursor-pointer">Edit in Registry →</span>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ChevronRight({ className }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" /></svg>;
}