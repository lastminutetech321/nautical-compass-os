import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Hammer, AlertTriangle, CheckCircle, Clock, TrendingUp, RefreshCw,
  Zap, Filter, ChevronRight, BarChart2
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "react-router-dom";
import moment from "moment";

function pct(req, done) {
  const r = (req || []).length, d = (done || []).length;
  return r > 0 ? Math.round((d / r) * 100) : 0;
}
function pctColor(v) { return v >= 75 ? "text-emerald-600" : v >= 40 ? "text-amber-600" : "text-red-500"; }

const PRIORITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };
const STATUS_COLOR = {
  not_started: "bg-slate-100 text-slate-600",
  in_progress: "bg-blue-100 text-blue-700",
  staging: "bg-amber-100 text-amber-700",
  deployed: "bg-emerald-100 text-emerald-700",
  passing: "bg-emerald-100 text-emerald-700",
  failing: "bg-red-100 text-red-700",
  live: "bg-emerald-100 text-emerald-700",
  complete: "bg-emerald-100 text-emerald-700",
};

export default function BuildHealthDashboard() {
  const [builds, setBuilds] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState("priority");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    Promise.all([
      base44.entities.BuildRegistry.list("-created_date", 200),
      base44.entities.AgentProfile.list("-created_date", 100).catch(() => []),
    ]).then(([b, a]) => { setBuilds(b); setAgents(a); if (b.length > 0) setSelected(b[0]); setLoading(false); });
  }, []);

  const filtered = builds
    .filter(b => {
      if (filter === "blocked") return b.is_blocked || (b.blocked_by || []).length > 0;
      if (filter === "critical") return b.priority === "critical";
      if (filter === "low_pct") return pct(b.required_tasks, b.completed_tasks) < 30;
      if (filter !== "all") return b.rail === filter;
      return true;
    })
    .sort((a, b) => {
      if (sort === "priority") return (PRIORITY_ORDER[a.priority] || 2) - (PRIORITY_ORDER[b.priority] || 2);
      if (sort === "completion") return pct(b.required_tasks, b.completed_tasks) - pct(a.required_tasks, a.completed_tasks);
      if (sort === "blockers") return ((b.blocked_by || []).length) - ((a.blocked_by || []).length);
      return 0;
    });

  const totalPct = builds.length ? Math.round(builds.reduce((s, b) => s + pct(b.required_tasks, b.completed_tasks), 0) / builds.length) : 0;
  const blocked = builds.filter(b => b.is_blocked || (b.blocked_by || []).length > 0);
  const rails = [...new Set(builds.map(b => b.rail))];

  const agentMap = {};
  agents.forEach(a => { (a.connected_modules || []).forEach(m => { if (!agentMap[m]) agentMap[m] = []; agentMap[m].push(a.name); }); });

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">NCOS · Engineering OS</p>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Hammer className="w-6 h-6 text-blue-500" />Build Health Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">{builds.length} builds · {totalPct}% avg · {blocked.length} blocked</p>
        </div>
        <Link to="/build-registry"><Button size="sm" variant="outline"><ChevronRight className="w-4 h-4 mr-1.5" />Manage Builds</Button></Link>
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { label: "Avg Completion", value: `${totalPct}%`, color: pctColor(totalPct) },
          { label: "Blocked", value: blocked.length, color: blocked.length > 0 ? "text-red-600" : "text-emerald-600" },
          { label: "Critical Builds", value: builds.filter(b => b.priority === "critical").length, color: "text-amber-600" },
          { label: "Rails Active", value: rails.length, color: "text-blue-600" },
        ].map(k => (
          <Card key={k.label} className="p-4 border border-border/60">
            <p className="text-xs text-muted-foreground">{k.label}</p>
            <p className={`text-2xl font-black mt-1 ${k.color}`}>{k.value}</p>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Builds</SelectItem>
            <SelectItem value="blocked">🚨 Blocked</SelectItem>
            <SelectItem value="critical">🔴 Critical Priority</SelectItem>
            <SelectItem value="low_pct">⚠️ Under 30%</SelectItem>
            {rails.map(r => <SelectItem key={r} value={r} className="capitalize">{r.replace(/_/g, " ")}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="priority">By Priority</SelectItem>
            <SelectItem value="completion">By Completion</SelectItem>
            <SelectItem value="blockers">By Blockers</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} builds shown</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Build list */}
        <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
          {filtered.map(b => {
            const p = pct(b.required_tasks, b.completed_tasks);
            const isBlocked = b.is_blocked || (b.blocked_by || []).length > 0;
            const assignedAgents = agentMap[b.name] || [];
            return (
              <Card
                key={b.id}
                className={`p-3 cursor-pointer transition-all ${selected?.id === b.id ? "border-primary shadow-md" : "border-border/60 hover:shadow-sm"}`}
                onClick={() => setSelected(b)}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{b.name}</p>
                    <p className="text-[10px] text-muted-foreground capitalize">{b.rail?.replace(/_/g, " ")}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {isBlocked && <AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
                    <Badge variant="outline" className={`text-[9px] ${b.priority === "critical" ? "border-red-200 text-red-700" : b.priority === "high" ? "border-amber-200 text-amber-700" : "border-border text-muted-foreground"}`}>{b.priority}</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <Progress value={p} className="flex-1 h-1.5" />
                  <span className={`text-[9px] font-bold ${pctColor(p)}`}>{p}%</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge className={`text-[9px] ${STATUS_COLOR[b.deployment_status] || "bg-slate-100 text-slate-600"}`}>{b.deployment_status?.replace(/_/g, " ") || "not started"}</Badge>
                  {b.testing_status === "failing" && <Badge className="text-[9px] bg-red-100 text-red-700">tests failing</Badge>}
                  {assignedAgents.length > 0 && <span className="text-[9px] text-violet-600">🤖 {assignedAgents[0]}</span>}
                </div>
              </Card>
            );
          })}
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="lg:col-span-2 space-y-4">
            <Card className="p-5 border border-border/60">
              <div className="flex items-start justify-between mb-3 gap-2 flex-wrap">
                <div>
                  <h2 className="text-base font-bold">{selected.name}</h2>
                  <p className="text-xs text-muted-foreground capitalize">{selected.rail?.replace(/_/g, " ")} · {selected.owner || "Unassigned"}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs capitalize">{selected.priority}</Badge>
                  {selected.estimated_finish_date && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />{moment(selected.estimated_finish_date).format("MMM D")}
                    </span>
                  )}
                </div>
              </div>

              {(selected.is_blocked || (selected.blocked_by || []).length > 0) && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-3">
                  <p className="text-xs font-bold text-red-700 flex items-center gap-1.5 mb-1"><AlertTriangle className="w-3.5 h-3.5" />BLOCKED</p>
                  <p className="text-xs text-red-700">Waiting on: {(selected.blocked_by || []).join(", ")}</p>
                </div>
              )}

              {selected.description && <p className="text-sm text-muted-foreground mb-4">{selected.description}</p>}

              {/* Progress dims */}
              <div className="space-y-2 mb-4">
                {[
                  ["Task Completion", pct(selected.required_tasks, selected.completed_tasks)],
                  ["Architecture", selected.architecture_pct || 0],
                  ["Backend", selected.backend_pct || 0],
                  ["Database", selected.database_pct || 0],
                  ["Testing", selected.testing_pct || 0],
                  ["Deployment", selected.deployment_pct || 0],
                ].map(([label, val]) => (
                  <div key={label} className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground w-28">{label}</span>
                    <Progress value={val} className="flex-1 h-1.5" />
                    <span className={`text-[9px] font-bold w-8 text-right ${pctColor(val)}`}>{val}%</span>
                  </div>
                ))}
              </div>

              {/* Tasks */}
              {(selected.required_tasks || []).length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-2">Tasks ({(selected.completed_tasks || []).length}/{(selected.required_tasks || []).length})</p>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {selected.required_tasks.map(task => {
                      const done = (selected.completed_tasks || []).includes(task);
                      return (
                        <div key={task} className={`flex items-center gap-2 text-xs px-2 py-1 rounded ${done ? "text-emerald-700 bg-emerald-50" : "text-muted-foreground bg-muted/50"}`}>
                          {done ? <CheckCircle className="w-3 h-3 flex-shrink-0" /> : <Clock className="w-3 h-3 flex-shrink-0 opacity-40" />}
                          {task}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Assigned agents */}
              {(agentMap[selected.name] || []).length > 0 && (
                <div className="mt-3 pt-3 border-t border-border/40">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-2">Assigned Agents</p>
                  <div className="flex flex-wrap gap-1.5">
                    {agentMap[selected.name].map(a => (
                      <Badge key={a} className="text-[10px] bg-violet-50 text-violet-700 border border-violet-200">{a}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}