import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Users, Zap, Target, CheckCircle, AlertTriangle, Loader2,
  RefreshCw, BarChart3, Brain, TrendingUp, Clock, Lock
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import moment from "moment";

const PRIORITY_AREAS = [
  { id: "canon", label: "Canon Population", agents: ["Canon Librarian Agent"], urgency: 100, revenue: 5000, desc: "Zero Canon = zero AI capability" },
  { id: "juris", label: "JurisEngine Validation", agents: ["JurisEngine QA Agent"], urgency: 90, revenue: 3000, desc: "QA needed before client demos" },
  { id: "revenue", label: "Revenue Activation", agents: ["Revenue Survival Agent","Product Manager Agent"], urgency: 95, revenue: 10000, desc: "First subscriber = survival" },
  { id: "evidence", label: "Evidence Vault Quality", agents: ["Evidence Vault Agent"], urgency: 60, revenue: 1000, desc: "Evidence integrity for legal use" },
  { id: "security", label: "Security Review", agents: ["Security Review Agent"], urgency: 70, revenue: 0, desc: "Critical before any production" },
  { id: "docs", label: "Documentation", agents: ["Documentation Agent"], urgency: 40, revenue: 0, desc: "Required for enterprise sales" },
  { id: "product", label: "Product Strategy", agents: ["Product Manager Agent"], urgency: 75, revenue: 2000, desc: "Roadmap clarity drives velocity" },
  { id: "decision", label: "Decision Compass Coverage", agents: ["Decision Compass Agent"], urgency: 65, revenue: 1500, desc: "Key differentiator for users" },
];

export default function ResourceAllocation() {
  const [agents, setAgents] = useState([]);
  const [improvements, setImprovements] = useState([]);
  const [issues, setIssues] = useState([]);
  const [canon, setCanon] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rebalancing, setRebalancing] = useState(false);
  const [allocationPlan, setAllocationPlan] = useState(null);

  const load = async () => {
    setLoading(true);
    const [a, imp, iss, c] = await Promise.all([
      base44.entities.AgentProfile.list("-created_date", 100).catch(() => []),
      base44.entities.ImprovementItem.filter({ status: "queued" }, "-created_date", 50).catch(() => []),
      base44.entities.DiagnosticIssue.filter({ status: "open" }, "-created_date", 50).catch(() => []),
      base44.entities.CanonEntry.filter({ status: "active", verified: true }).catch(() => []),
    ]);
    setAgents(a); setImprovements(imp); setIssues(iss); setCanon(c);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const rebalance = async () => {
    setRebalancing(true);
    const idleAgents = agents.filter(a => a.status === "idle" || a.tasks_completed === 0);
    const critIssues = issues.filter(i => i.severity === "critical");

    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are the NCOS Resource Allocation Engine. Optimize AI agent assignments to maximize platform readiness and revenue.

AGENT ROSTER (${agents.length} total):
${agents.map(a => `- ${a.name} [${a.agent_type}]: status=${a.status}, tasks_completed=${a.tasks_completed||0}, connected_modules=${(a.connected_modules||[]).join(",")}`).join("\n")}

IDLE AGENTS (${idleAgents.length}):
${idleAgents.map(a => a.name).join(", ") || "none"}

IMPROVEMENT QUEUE (${improvements.length} items):
${improvements.slice(0,10).map(i=>`- ${i.title} (${i.priority}, $${i.estimated_revenue_impact||0} revenue impact, effort=${i.estimated_effort})`).join("\n") || "none"}

CRITICAL ISSUES (${critIssues.length}):
${critIssues.map(i=>`- ${i.title} [${i.category}]`).join("\n") || "none"}

CANON STATUS: ${canon.length} verified entries

Generate an optimal allocation plan:
1. allocations: Array of {agent_name, assigned_task, priority_area, reason, estimated_hours, revenue_impact}
2. rebalancing_summary: Why agents were moved
3. idle_agents_assigned: Which idle agents got tasks and what
4. highest_priority_areas: Top 3 areas needing immediate agent attention
5. recommended_hiring: What types of agents or skills to add next
6. forecast_completion: If allocations are executed, what completes in the next 7 days`,
      response_json_schema: {
        type: "object",
        properties: {
          allocations: { type: "array", items: { type: "object", properties: { agent_name: { type: "string" }, assigned_task: { type: "string" }, priority_area: { type: "string" }, reason: { type: "string" }, estimated_hours: { type: "number" }, revenue_impact: { type: "number" } } } },
          rebalancing_summary: { type: "string" },
          idle_agents_assigned: { type: "array", items: { type: "string" } },
          highest_priority_areas: { type: "array", items: { type: "string" } },
          recommended_hiring: { type: "array", items: { type: "string" } },
          forecast_completion: { type: "array", items: { type: "string" } },
        },
        required: ["allocations","rebalancing_summary","highest_priority_areas"]
      }
    });
    setAllocationPlan(res);
    setRebalancing(false);
  };

  const activeAgents = agents.filter(a => a.status === "active" || a.tasks_completed > 0);
  const idleAgents = agents.filter(a => a.status === "idle" && (a.tasks_completed || 0) === 0);
  const totalTasks = agents.reduce((s,a)=>s+(a.tasks_completed||0),0);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">NCOS · Executive Intelligence</p>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-500" />Resource Allocation Engine
          </h1>
          <p className="text-sm text-muted-foreground">Optimize AI agent deployment for maximum platform ROI</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={load}><RefreshCw className="w-4 h-4" /></Button>
          <Button size="sm" onClick={rebalance} disabled={rebalancing} className="gap-1.5">
            {rebalancing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            {rebalancing ? "Optimizing..." : "Optimize Allocation"}
          </Button>
        </div>
      </div>

      {/* Workforce KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total Agents", value: agents.length, color: "text-violet-600 bg-violet-50", icon: Users },
          { label: "Active / Utilized", value: activeAgents.length, color: "text-emerald-600 bg-emerald-50", icon: CheckCircle },
          { label: "Idle (Underutilized)", value: idleAgents.length, color: idleAgents.length > 2 ? "text-amber-600 bg-amber-50" : "text-emerald-600 bg-emerald-50", icon: Clock },
          { label: "Total Tasks Done", value: totalTasks, color: "text-blue-600 bg-blue-50", icon: BarChart3 },
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

      {idleAgents.length > 0 && (
        <Card className="p-4 border border-amber-200 bg-amber-50 mb-5">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <p className="text-sm font-semibold text-amber-800">{idleAgents.length} Idle Agents — Not Contributing</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {idleAgents.map(a => (
              <Badge key={a.id} variant="outline" className="text-xs border-amber-300 text-amber-700">{a.name}</Badge>
            ))}
          </div>
          <p className="text-xs text-amber-700 mt-2">Click "Optimize Allocation" to assign tasks to idle agents based on platform priorities.</p>
        </Card>
      )}

      {/* Priority areas matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {PRIORITY_AREAS.map(area => {
          const assignedAgents = agents.filter(a => area.agents.includes(a.name));
          const hasAgents = assignedAgents.length > 0;
          return (
            <Card key={area.id} className={`p-4 border ${area.urgency >= 90 ? "border-red-200" : area.urgency >= 70 ? "border-amber-200" : "border-border/60"}`}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-semibold">{area.label}</p>
                    <Badge variant="outline" className={`text-[9px] ${area.urgency >= 90 ? "text-red-600 border-red-300" : area.urgency >= 70 ? "text-amber-600 border-amber-300" : "text-slate-500"}`}>
                      Priority {area.urgency}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{area.desc}</p>
                </div>
                {area.revenue > 0 && <span className="text-xs font-bold text-emerald-600 flex-shrink-0">+${area.revenue.toLocaleString()}</span>}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <p className="text-[10px] text-muted-foreground">Agents:</p>
                {area.agents.map(name => {
                  const agent = agents.find(a => a.name === name);
                  return (
                    <Badge key={name} variant={agent ? "default" : "outline"} className={`text-[9px] ${agent ? "bg-primary/10 text-primary" : "text-muted-foreground border-dashed"}`}>
                      {name}{agent ? "" : " — not deployed"}
                    </Badge>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Allocation plan */}
      {allocationPlan ? (
        <div className="space-y-4">
          {allocationPlan.rebalancing_summary && (
            <Card className="p-4 border border-border/60">
              <p className="text-xs font-bold text-muted-foreground uppercase mb-2">Rebalancing Summary</p>
              <p className="text-sm">{allocationPlan.rebalancing_summary}</p>
            </Card>
          )}

          {(allocationPlan.highest_priority_areas||[]).length > 0 && (
            <Card className="p-4 border border-red-200 bg-red-50">
              <p className="text-xs font-bold text-red-700 uppercase mb-2">Highest Priority Areas</p>
              <ul className="space-y-1">
                {allocationPlan.highest_priority_areas.map((a,i) => <li key={i} className="text-sm text-red-800 flex items-start gap-1.5"><span className="font-bold flex-shrink-0">{i+1}.</span>{a}</li>)}
              </ul>
            </Card>
          )}

          {(allocationPlan.allocations||[]).length > 0 && (
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase mb-3">Optimized Agent Assignments</p>
              <div className="space-y-2">
                {allocationPlan.allocations.map((alloc,i) => (
                  <div key={i} className="flex items-start gap-3 p-3 border border-border/60 rounded-lg bg-muted">
                    <Brain className="w-4 h-4 text-violet-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="text-sm font-semibold">{alloc.agent_name}</span>
                        <Badge variant="outline" className="text-[9px]">{alloc.priority_area}</Badge>
                        {alloc.estimated_hours > 0 && <span className="text-[10px] text-muted-foreground">{alloc.estimated_hours}h</span>}
                        {alloc.revenue_impact > 0 && <span className="text-[10px] text-emerald-600 font-bold">+${alloc.revenue_impact.toLocaleString()}</span>}
                      </div>
                      <p className="text-xs text-foreground">{alloc.assigned_task}</p>
                      {alloc.reason && <p className="text-[10px] text-muted-foreground mt-0.5">{alloc.reason}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(allocationPlan.recommended_hiring||[]).length > 0 && (
              <Card className="p-4 border border-border/60">
                <p className="text-xs font-bold text-muted-foreground uppercase mb-2">Recommended Hiring / New Agents</p>
                <ul className="space-y-1">{allocationPlan.recommended_hiring.map((h,i) => <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5"><TrendingUp className="w-3 h-3 text-emerald-500 flex-shrink-0 mt-0.5" />{h}</li>)}</ul>
              </Card>
            )}
            {(allocationPlan.forecast_completion||[]).length > 0 && (
              <Card className="p-4 border border-border/60">
                <p className="text-xs font-bold text-muted-foreground uppercase mb-2">7-Day Completion Forecast</p>
                <ul className="space-y-1">{allocationPlan.forecast_completion.map((f,i) => <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5"><CheckCircle className="w-3 h-3 text-emerald-500 flex-shrink-0 mt-0.5" />{f}</li>)}</ul>
              </Card>
            )}
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start gap-2">
            <Lock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            This is a recommendation only. Agents will not be auto-reassigned. Review and manually dispatch tasks via Agent Roster.
          </div>
        </div>
      ) : (
        <div className="text-center py-12 border border-dashed border-border rounded-xl">
          <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
          <p className="text-sm text-muted-foreground mb-3">Click "Optimize Allocation" to generate an AI-powered agent assignment plan based on platform priorities, revenue impact, and agent availability.</p>
        </div>
      )}
    </div>
  );
}