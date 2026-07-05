import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  GitBranch, Lock, Unlock, AlertTriangle, CheckCircle, Loader2,
  ArrowRight, Clock, DollarSign, Users, Zap, RefreshCw, Target
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

const statusColor = {
  not_started: "bg-slate-100 text-slate-600",
  in_progress: "bg-blue-100 text-blue-700",
  staging: "bg-amber-100 text-amber-700",
  deployed: "bg-emerald-100 text-emerald-700",
};

const priorityColor = {
  critical: "text-red-600 border-red-300",
  high: "text-orange-600 border-orange-300",
  medium: "text-amber-600 border-amber-300",
  low: "text-slate-600 border-slate-300",
};

export default function DependencyResolutionEngine() {
  const [builds, setBuilds] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);

  useEffect(() => { loadBuilds(); }, []);

  const loadBuilds = async () => {
    setLoading(true);
    const b = await base44.entities.BuildRegistry.list("-created_date", 100).catch(() => []);
    setBuilds(b);
    setLoading(false);
  };

  const calcReadiness = (build) => {
    const fields = ["architecture_pct", "backend_pct", "database_pct", "ai_pct", "testing_pct", "documentation_pct", "deployment_pct"];
    const vals = fields.map(f => build[f] || 0);
    return Math.round(vals.reduce((a, b) => a + b, 0) / fields.length);
  };

  const calcTaskPct = (build) => {
    const req = (build.required_tasks || []).length;
    const done = (build.completed_tasks || []).length;
    return req > 0 ? Math.round((done / req) * 100) : 0;
  };

  const estimatedRevenue = (build) => {
    const revenueMap = {
      jurisengine: 3000, legal_rail: 2000, resource_compass: 1500,
      mission_control: 500, nc_canon: 5000, culture_rail: 500,
      workforce_rail: 1000, platform: 200,
    };
    return revenueMap[build.rail] || 0;
  };

  const resolveBlocker = async (build) => {
    setResolving(true);
    // Create agent tasks for each blocker
    const blockers = build.blocked_by || [];
    for (const blocker of blockers) {
      await base44.entities.AgentTask.create({
        title: `Resolve dependency: ${blocker} → blocks ${build.name}`,
        description: `The build "${build.name}" is blocked by "${blocker}". Analyze the dependency, determine if it can be resolved autonomously, and produce a resolution plan or escalation.`,
        agent_name: "Product Manager Agent",
        task_type: "analyze",
        status: "queued",
        priority: "high",
        linked_entity_type: "BuildRegistry",
        linked_entity_id: build.id,
      });
    }
    await base44.entities.AuditLog.create({
      action: `Dependency resolution initiated for ${build.name}`,
      action_category: "agent_action",
      entity_type: "BuildRegistry",
      entity_id: build.id,
      entity_name: build.name,
      actor_name: "Dependency Resolution Engine",
      actor_role: "system",
      risk_level: "low",
    });
    setResolving(false);
    loadBuilds();
  };

  const blockedBuilds = builds.filter(b => b.is_blocked || (b.blocked_by || []).length > 0);
  const clearBuilds = builds.filter(b => !b.is_blocked && (b.blocked_by || []).length === 0);
  const totalRevenueLocked = blockedBuilds.reduce((sum, b) => sum + estimatedRevenue(b), 0);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">NCOS · Build Studio</p>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <GitBranch className="w-6 h-6 text-blue-500" />Dependency Resolution Engine
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Every build knows what it needs, who owns it, and what unlocks it.</p>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total Builds", value: builds.length, color: "text-blue-600 bg-blue-50", icon: GitBranch },
          { label: "Blocked", value: blockedBuilds.length, color: blockedBuilds.length > 0 ? "text-red-600 bg-red-50" : "text-emerald-600 bg-emerald-50", icon: Lock },
          { label: "Clear to Build", value: clearBuilds.length, color: "text-emerald-600 bg-emerald-50", icon: Unlock },
          { label: "Revenue Locked", value: `$${totalRevenueLocked.toLocaleString()}/mo`, color: "text-amber-600 bg-amber-50", icon: DollarSign },
        ].map(k => (
          <Card key={k.label} className="p-4 border border-border/60">
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${k.color}`}><k.icon className="w-3.5 h-3.5" /></div>
              <p className="text-xs text-muted-foreground">{k.label}</p>
            </div>
            <p className="text-xl font-bold pl-9">{k.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Build List */}
        <div className="lg:col-span-1 space-y-2">
          {blockedBuilds.length > 0 && (
            <>
              <p className="text-xs font-bold uppercase tracking-widest text-red-600 mb-2 flex items-center gap-1"><Lock className="w-3 h-3" />Blocked ({blockedBuilds.length})</p>
              {blockedBuilds.map(b => (
                <Card key={b.id} className={`p-3 border cursor-pointer transition-all ${selected?.id === b.id ? "border-primary ring-1 ring-primary" : "border-red-200 bg-red-50/30 hover:border-red-300"}`} onClick={() => setSelected(b)}>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium truncate">{b.name}</p>
                    <Badge variant="outline" className={`text-[9px] ml-1 flex-shrink-0 ${priorityColor[b.priority]}`}>{b.priority}</Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{b.rail?.replace(/_/g," ")}</p>
                  <div className="mt-2">
                    <Progress value={calcReadiness(b)} className="h-1" />
                    <p className="text-[9px] text-muted-foreground mt-0.5">{calcReadiness(b)}% ready</p>
                  </div>
                </Card>
              ))}
            </>
          )}
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-600 mt-4 mb-2 flex items-center gap-1"><Unlock className="w-3 h-3" />Clear ({clearBuilds.length})</p>
          {clearBuilds.map(b => (
            <Card key={b.id} className={`p-3 border cursor-pointer transition-all ${selected?.id === b.id ? "border-primary ring-1 ring-primary" : "border-border/60 hover:border-primary/50"}`} onClick={() => setSelected(b)}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium truncate">{b.name}</p>
                <Badge variant="outline" className="text-[9px]">{b.deployment_status?.replace(/_/g," ")}</Badge>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">{b.rail?.replace(/_/g," ")}</p>
              <div className="mt-2">
                <Progress value={calcReadiness(b)} className="h-1" />
                <p className="text-[9px] text-muted-foreground mt-0.5">{calcReadiness(b)}% ready</p>
              </div>
            </Card>
          ))}
        </div>

        {/* Detail Panel */}
        <div className="lg:col-span-2">
          {!selected ? (
            <div className="flex items-center justify-center h-64 border border-dashed border-border rounded-xl">
              <div className="text-center">
                <GitBranch className="w-10 h-10 mx-auto mb-2 text-muted-foreground opacity-30" />
                <p className="text-sm text-muted-foreground">Select a build to view its dependency map</p>
              </div>
            </div>
          ) : (
            <Card className="p-5 border border-border/60">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold">{selected.name}</h2>
                  <p className="text-sm text-muted-foreground">{selected.rail?.replace(/_/g," ")} rail</p>
                  {selected.description && <p className="text-xs text-muted-foreground mt-1">{selected.description}</p>}
                </div>
                <Badge className={`text-[10px] ${statusColor[selected.deployment_status] || "bg-slate-100"}`}>
                  {selected.deployment_status?.replace(/_/g," ")}
                </Badge>
              </div>

              {/* Dependency chain */}
              {(selected.blocked_by || []).length > 0 && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-xs font-bold text-red-700 mb-2 flex items-center gap-1"><Lock className="w-3 h-3" />Blocked By</p>
                  <div className="flex flex-wrap gap-2">
                    {selected.blocked_by.map(b => (
                      <Badge key={b} variant="outline" className="text-[10px] text-red-600 border-red-300">{b}</Badge>
                    ))}
                  </div>
                  <Button size="sm" className="mt-3 h-7 text-xs bg-red-600 hover:bg-red-700" onClick={() => resolveBlocker(selected)} disabled={resolving}>
                    {resolving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Zap className="w-3 h-3 mr-1" />}
                    Auto-Dispatch Resolution Tasks
                  </Button>
                </div>
              )}

              {/* Revenue unlocked */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <p className="text-[10px] text-muted-foreground">Est. Revenue Unlocked</p>
                  <p className="text-lg font-bold text-emerald-600">${estimatedRevenue(selected).toLocaleString()}/mo</p>
                </div>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-[10px] text-muted-foreground">Task Completion</p>
                  <p className="text-lg font-bold text-blue-600">{calcTaskPct(selected)}%</p>
                  <p className="text-[10px] text-muted-foreground">{(selected.completed_tasks||[]).length} / {(selected.required_tasks||[]).length} tasks</p>
                </div>
              </div>

              {/* Readiness dimensions */}
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">Build Readiness</p>
              <div className="space-y-2 mb-4">
                {[
                  { label: "Architecture", key: "architecture_pct" },
                  { label: "Backend", key: "backend_pct" },
                  { label: "Database", key: "database_pct" },
                  { label: "AI Integration", key: "ai_pct" },
                  { label: "Testing", key: "testing_pct" },
                  { label: "Documentation", key: "documentation_pct" },
                  { label: "Deployment", key: "deployment_pct" },
                ].map(d => (
                  <div key={d.key} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-28 flex-shrink-0">{d.label}</span>
                    <Progress value={selected[d.key] || 0} className="flex-1 h-1.5" />
                    <span className="text-xs font-medium w-8 text-right">{selected[d.key] || 0}%</span>
                  </div>
                ))}
              </div>

              {/* Required tasks */}
              {(selected.required_tasks || []).length > 0 && (
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Required Tasks</p>
                  <div className="space-y-1">
                    {selected.required_tasks.map(t => {
                      const done = (selected.completed_tasks || []).includes(t);
                      return (
                        <div key={t} className={`flex items-center gap-2 text-xs p-1.5 rounded ${done ? "text-emerald-700" : "text-muted-foreground"}`}>
                          {done ? <CheckCircle className="w-3 h-3 text-emerald-500 flex-shrink-0" /> : <Clock className="w-3 h-3 flex-shrink-0" />}
                          <span className={done ? "line-through" : ""}>{t}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {selected.notes && (
                <div className="mt-4 p-3 bg-muted rounded-lg text-xs text-muted-foreground">{selected.notes}</div>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}