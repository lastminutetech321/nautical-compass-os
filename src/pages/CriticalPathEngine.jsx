import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  GitBranch, AlertTriangle, CheckCircle, Clock, Loader2, Zap,
  TrendingUp, Target, BarChart3, Lock, RefreshCw, ChevronRight, DollarSign
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import moment from "moment";

// Dependency graph — which builds unblock which
const DEPENDENCY_MAP = {
  "nc_canon":     { unlocks: ["jurisengine","legal_rail"], revenue_impact: 2000, readiness_gain: 20, hours_est: 8 },
  "jurisengine":  { unlocks: ["legal_rail","investigation_compass","court_compass"], revenue_impact: 5000, readiness_gain: 15, hours_est: 12 },
  "legal_rail":   { unlocks: ["evidence_vault","foia_tracker"], revenue_impact: 3000, readiness_gain: 10, hours_est: 16 },
  "platform":     { unlocks: ["business_platform","workforce_rail"], revenue_impact: 1000, readiness_gain: 8, hours_est: 6 },
  "workforce_rail":{ unlocks: ["resource_compass"], revenue_impact: 1500, readiness_gain: 5, hours_est: 8 },
  "business_platform": { unlocks: ["stripe_revenue"], revenue_impact: 10000, readiness_gain: 5, hours_est: 10 },
};

const PATH_DEFINITIONS = [
  {
    id: "beta",
    label: "Beta Ready",
    icon: Target,
    color: "text-blue-600 bg-blue-50 border-blue-200",
    required: ["Canon: 10+ verified entries", "JurisEngine functional", "Evidence Vault operational", "1 paying subscriber", "Approval gates live"],
    blockers_from: ["nc_canon", "jurisengine"],
  },
  {
    id: "revenue",
    label: "First Revenue",
    icon: DollarSign,
    color: "text-emerald-600 bg-emerald-50 border-emerald-200",
    required: ["Stripe configured", "1 subscription plan created", "1 paying customer", "Invoice generated"],
    blockers_from: ["business_platform"],
  },
  {
    id: "production",
    label: "Production Ready",
    icon: Zap,
    color: "text-violet-600 bg-violet-50 border-violet-200",
    required: ["25+ verified Canon entries", "All Rails ≥50% complete", "Security review passed", "Documentation complete", "Zero critical issues"],
    blockers_from: ["nc_canon", "jurisengine", "legal_rail"],
  },
  {
    id: "enterprise",
    label: "Enterprise Ready",
    icon: BarChart3,
    color: "text-amber-600 bg-amber-50 border-amber-200",
    required: ["Canon 100+ entries", "All 6 Rails ≥80%", "Multi-tenant architecture", "SLA documentation", "Enterprise security audit", "$10K+ MRR"],
    blockers_from: ["nc_canon", "jurisengine", "legal_rail", "workforce_rail", "business_platform"],
  },
];

export default function CriticalPathEngine() {
  const [builds, setBuilds] = useState([]);
  const [canon, setCanon] = useState([]);
  const [agents, setAgents] = useState([]);
  const [subs, setSubs] = useState([]);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);

  const load = async () => {
    setLoading(true);
    const [b, c, a, s, i] = await Promise.all([
      base44.entities.BuildRegistry.list("-created_date", 200).catch(() => []),
      base44.entities.CanonEntry.filter({ status: "active", verified: true }).catch(() => []),
      base44.entities.AgentProfile.list("-created_date", 100).catch(() => []),
      base44.entities.Subscription.filter({ status: "active" }).catch(() => []),
      base44.entities.DiagnosticIssue.filter({ status: "open" }, "-created_date", 50).catch(() => []),
    ]);
    setBuilds(b); setCanon(c); setAgents(a); setSubs(s); setIssues(i);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const generateCriticalPath = async () => {
    setGenerating(true);
    const blockedBuilds = builds.filter(b => b.is_blocked || (b.blocked_by||[]).length > 0);
    const critIssues = issues.filter(i => i.severity === "critical");
    const totalDone = builds.reduce((s,b)=>(b.completed_tasks||[]).length+s, 0);
    const totalReq = builds.reduce((s,b)=>(b.required_tasks||[]).length+s, 0);

    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are the NCOS Critical Path Engine. Analyze the platform state and produce a precise critical path analysis.

PLATFORM STATE:
- Verified Canon entries: ${canon.length} (target: 25+)
- Total builds: ${builds.length}, Blocked: ${blockedBuilds.length}
- Build task completion: ${totalDone}/${totalReq} (${totalReq > 0 ? Math.round((totalDone/totalReq)*100) : 0}%)
- Active agents: ${agents.filter(a=>a.tasks_completed>0).length}/${agents.length}
- Active subscriptions: ${subs.length}
- Critical issues: ${critIssues.length}

BLOCKED BUILDS:
${blockedBuilds.map(b => `- ${b.name} [${b.rail}]: blocked by ${(b.blocked_by||[]).join(", ")}`).join("\n") || "none"}

CRITICAL ISSUES:
${critIssues.map(i => `- [${i.category}] ${i.title}`).join("\n") || "none"}

Produce a critical path analysis with:
1. current_bottleneck: The single biggest thing blocking platform progress right now
2. fastest_to_beta: Ordered list of 5 specific tasks to reach beta (with hour estimates)
3. fastest_to_revenue: Ordered list of 5 specific tasks to generate first revenue (with hour estimates)
4. fastest_to_production: Ordered list of 7 specific tasks to reach production (with hour estimates)  
5. fastest_to_enterprise: Ordered list of 10 specific tasks to reach enterprise readiness
6. wasted_effort: Array of areas that are absorbing effort without clear ROI right now
7. highest_roi_action: The single highest-ROI action available today
8. technical_debt_risks: Array of risks that will create debt if not addressed
9. agent_allocation: Which agents should be assigned to which path right now`,
      response_json_schema: {
        type: "object",
        properties: {
          current_bottleneck: { type: "string" },
          fastest_to_beta: { type: "array", items: { type: "object", properties: { task: { type: "string" }, hours: { type: "number" }, reason: { type: "string" } } } },
          fastest_to_revenue: { type: "array", items: { type: "object", properties: { task: { type: "string" }, hours: { type: "number" }, reason: { type: "string" } } } },
          fastest_to_production: { type: "array", items: { type: "object", properties: { task: { type: "string" }, hours: { type: "number" }, reason: { type: "string" } } } },
          fastest_to_enterprise: { type: "array", items: { type: "object", properties: { task: { type: "string" }, hours: { type: "number" }, reason: { type: "string" } } } },
          wasted_effort: { type: "array", items: { type: "string" } },
          highest_roi_action: { type: "string" },
          technical_debt_risks: { type: "array", items: { type: "string" } },
          agent_allocation: { type: "array", items: { type: "object", properties: { agent: { type: "string" }, task: { type: "string" }, path: { type: "string" } } } },
        },
        required: ["current_bottleneck","fastest_to_beta","fastest_to_revenue","fastest_to_production","fastest_to_enterprise","wasted_effort","highest_roi_action","technical_debt_risks"]
      }
    });
    setAiAnalysis(res);
    setGenerating(false);
  };

  const blockedBuilds = builds.filter(b => b.is_blocked || (b.blocked_by||[]).length > 0);
  const totalDone = builds.reduce((s,b)=>(b.completed_tasks||[]).length+s, 0);
  const totalReq = builds.reduce((s,b)=>(b.required_tasks||[]).length+s, 0);
  const overallPct = totalReq > 0 ? Math.round((totalDone/totalReq)*100) : 0;

  // Estimate path completion based on live data
  const pathProgress = {
    beta: Math.round(Math.min(100, (canon.length/10)*40 + (subs.length>0?30:0) + (builds.length>0?30:0))),
    revenue: Math.round(Math.min(100, (subs.length>0?100:0))),
    production: Math.round(Math.min(100, (canon.length/25)*30 + overallPct*0.4 + (issues.filter(i=>i.severity==="critical").length===0?30:0))),
    enterprise: Math.round(Math.min(100, (canon.length/100)*25 + overallPct*0.3 + (subs.length>0?20:0))),
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">NCOS · Executive Intelligence</p>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <GitBranch className="w-6 h-6 text-violet-500" />Critical Path Engine
          </h1>
          <p className="text-sm text-muted-foreground">Fastest routes to beta, revenue, production, and enterprise</p>
        </div>
        <Button onClick={generateCriticalPath} disabled={generating} className="gap-2">
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          {generating ? "Calculating..." : "Calculate Critical Path"}
        </Button>
      </div>

      {/* Path progress cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {PATH_DEFINITIONS.map(path => {
          const progress = pathProgress[path.id] || 0;
          return (
            <Card key={path.id} className={`p-4 border ${path.color}`}>
              <div className="flex items-center gap-2 mb-2">
                <path.icon className="w-4 h-4" />
                <p className="text-xs font-semibold">{path.label}</p>
              </div>
              <p className="text-2xl font-black mb-2">{progress}%</p>
              <Progress value={progress} className="h-1.5 mb-1" />
              <p className="text-[10px] opacity-70">{path.required.length} requirements</p>
            </Card>
          );
        })}
      </div>

      {/* Current bottleneck */}
      {blockedBuilds.length > 0 && (
        <Card className="p-4 border border-red-200 bg-red-50 mb-5">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <p className="text-sm font-semibold text-red-800">Current Bottlenecks ({blockedBuilds.length})</p>
          </div>
          <div className="space-y-2">
            {blockedBuilds.map(b => (
              <div key={b.id} className="flex items-start justify-between gap-3 p-2.5 bg-white border border-red-200 rounded text-xs">
                <div>
                  <p className="font-semibold text-red-800">{b.name}</p>
                  {(b.blocked_by||[]).length > 0 && <p className="text-red-600 mt-0.5">Blocked by: {b.blocked_by.join(", ")}</p>}
                  {DEPENDENCY_MAP[b.rail] && <p className="text-muted-foreground mt-0.5">Unlocks: {DEPENDENCY_MAP[b.rail].unlocks.join(", ")}</p>}
                </div>
                <div className="text-right flex-shrink-0">
                  {DEPENDENCY_MAP[b.rail]?.revenue_impact > 0 && (
                    <p className="text-emerald-600 font-bold">+${DEPENDENCY_MAP[b.rail].revenue_impact.toLocaleString()}</p>
                  )}
                  <Badge variant="outline" className="text-[9px] mt-1">{b.priority}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Tabs defaultValue="beta">
        <TabsList className="mb-5 flex-wrap h-auto">
          <TabsTrigger value="beta">→ Beta</TabsTrigger>
          <TabsTrigger value="revenue">→ Revenue</TabsTrigger>
          <TabsTrigger value="production">→ Production</TabsTrigger>
          <TabsTrigger value="enterprise">→ Enterprise</TabsTrigger>
          <TabsTrigger value="analysis">AI Analysis</TabsTrigger>
        </TabsList>

        {PATH_DEFINITIONS.map(path => (
          <TabsContent key={path.id} value={path.id}>
            <div className="space-y-3">
              <div className={`p-3 rounded-lg border ${path.color} text-sm`}>
                <p className="font-semibold mb-1">{path.label} — Requirements</p>
                <ul className="space-y-1">
                  {path.required.map((r, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs">
                      {i === 0 && canon.length === 0 ? <AlertTriangle className="w-3 h-3 flex-shrink-0" /> : <ChevronRight className="w-3 h-3 flex-shrink-0 opacity-50" />}
                      {r}
                    </li>
                  ))}
                </ul>
              </div>

              {aiAnalysis && aiAnalysis[`fastest_to_${path.id}`] && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">AI-Generated Path — {aiAnalysis[`fastest_to_${path.id}`].reduce((s,t)=>s+(t.hours||0),0)}h total</p>
                  {aiAnalysis[`fastest_to_${path.id}`].map((t, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-muted rounded-lg border border-border/40">
                      <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] flex items-center justify-center flex-shrink-0 font-bold mt-0.5">{i+1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{t.task}</p>
                        {t.reason && <p className="text-xs text-muted-foreground mt-0.5">{t.reason}</p>}
                      </div>
                      <Badge variant="outline" className="text-[10px] flex-shrink-0">{t.hours}h</Badge>
                    </div>
                  ))}
                </div>
              )}

              {!aiAnalysis && (
                <div className="text-center py-8 border border-dashed border-border rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">Click "Calculate Critical Path" to generate the AI-computed fastest route to {path.label}.</p>
                </div>
              )}
            </div>
          </TabsContent>
        ))}

        <TabsContent value="analysis">
          {!aiAnalysis ? (
            <div className="text-center py-12 border border-dashed border-border rounded-lg">
              <GitBranch className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
              <p className="text-sm text-muted-foreground mb-3">Run the Critical Path calculation to get AI analysis.</p>
              <Button onClick={generateCriticalPath} disabled={generating}>
                {generating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
                Calculate Critical Path
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {aiAnalysis.current_bottleneck && (
                <Card className="p-4 border border-red-200 bg-red-50">
                  <p className="text-xs font-bold text-red-700 uppercase mb-2">Current Bottleneck</p>
                  <p className="text-sm text-red-800">{aiAnalysis.current_bottleneck}</p>
                </Card>
              )}
              {aiAnalysis.highest_roi_action && (
                <Card className="p-4 border border-emerald-200 bg-emerald-50">
                  <p className="text-xs font-bold text-emerald-700 uppercase mb-2">Highest ROI Action Today</p>
                  <p className="text-sm text-emerald-800">{aiAnalysis.highest_roi_action}</p>
                </Card>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(aiAnalysis.wasted_effort||[]).length > 0 && (
                  <Card className="p-4 border border-amber-200 bg-amber-50">
                    <p className="text-xs font-bold text-amber-700 uppercase mb-2">⚠ Wasted Effort</p>
                    <ul className="space-y-1">{aiAnalysis.wasted_effort.map((w,i) => <li key={i} className="text-xs text-amber-800">• {w}</li>)}</ul>
                  </Card>
                )}
                {(aiAnalysis.technical_debt_risks||[]).length > 0 && (
                  <Card className="p-4 border border-red-200 bg-red-50">
                    <p className="text-xs font-bold text-red-700 uppercase mb-2">Technical Debt Risks</p>
                    <ul className="space-y-1">{aiAnalysis.technical_debt_risks.map((r,i) => <li key={i} className="text-xs text-red-800">• {r}</li>)}</ul>
                  </Card>
                )}
              </div>
              {(aiAnalysis.agent_allocation||[]).length > 0 && (
                <Card className="p-4 border border-border/60">
                  <p className="text-xs font-bold text-muted-foreground uppercase mb-3">Recommended Agent Allocation</p>
                  <div className="space-y-2">
                    {aiAnalysis.agent_allocation.map((a,i) => (
                      <div key={i} className="flex items-center gap-3 p-2 bg-muted rounded text-xs">
                        <Badge variant="outline" className="text-[9px] flex-shrink-0">{a.path}</Badge>
                        <span className="font-medium flex-shrink-0">{a.agent}</span>
                        <span className="text-muted-foreground">→ {a.task}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}