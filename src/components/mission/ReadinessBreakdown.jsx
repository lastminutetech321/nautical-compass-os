import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Hammer, BookOpen, Activity, DollarSign, Bot, Lock } from "lucide-react";

export default function ReadinessBreakdown({ data, score }) {
  if (!data || !data.builds) return null;
  const { builds, canon, issues, subs, agents, approvals } = data;

  const totalDone = builds.reduce((s, b) => (b.completed_tasks || []).length + s, 0);
  const totalReq = builds.reduce((s, b) => (b.required_tasks || []).length + s, 0);
  const buildPct = totalReq > 0 ? Math.round((totalDone / totalReq) * 100) : 0;

  const verifiedCanon = canon.filter(e => e.verified && e.status === "active").length;
  const canonPct = Math.min(Math.round((verifiedCanon / 25) * 100), 100);

  const critIssues = issues.filter(i => i.severity === "critical").length;
  const healthPct = Math.max(0, 100 - (issues.length * 2) - (critIssues * 10));

  const mrr = subs.reduce((s, sub) => s + (sub.mrr || 0), 0);
  const revenuePct = Math.min(Math.round((mrr / 10000) * 100), 100);

  const activeAgents = agents.filter(a => a.tasks_completed > 0 || a.status === "active").length;
  const workforcePct = agents.length > 0 ? Math.round((activeAgents / agents.length) * 100) : 0;

  const approvalPct = Math.max(0, 100 - (approvals.length * 5));

  const factors = [
    { name: "Build Completion", pct: buildPct, weight: 30, icon: Hammer, color: "text-blue-600", detail: `${totalDone}/${totalReq} tasks · ${builds.length} builds` },
    { name: "Canon Coverage", pct: canonPct, weight: 20, icon: BookOpen, color: "text-amber-600", detail: `${verifiedCanon} verified · target 25+` },
    { name: "System Health", pct: healthPct, weight: 20, icon: Activity, color: "text-emerald-600", detail: `${issues.length} issues · ${critIssues} critical` },
    { name: "Revenue", pct: revenuePct, weight: 15, icon: DollarSign, color: "text-emerald-600", detail: `$${mrr.toLocaleString()}/mo MRR · target $10K` },
    { name: "AI Workforce", pct: workforcePct, weight: 10, icon: Bot, color: "text-violet-600", detail: `${activeAgents}/${agents.length} active` },
    { name: "Approvals", pct: approvalPct, weight: 5, icon: Lock, color: "text-amber-600", detail: `${approvals.length} pending` },
  ];

  return (
    <Card className="p-4 border border-border/60">
      <h3 className="text-sm font-bold mb-3">Mission Readiness Score Breakdown</h3>
      <div className="space-y-2.5">
        {factors.map(f => (
          <div key={f.name}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <f.icon className={`w-3.5 h-3.5 ${f.color}`} />
                <span className="text-xs font-medium">{f.name}</span>
                <span className="text-[9px] text-muted-foreground">({f.weight}% weight)</span>
              </div>
              <span className="text-xs font-bold">{f.pct}%</span>
            </div>
            <Progress value={f.pct} className="h-1.5" />
            <p className="text-[9px] text-muted-foreground mt-0.5">{f.detail}</p>
          </div>
        ))}
        <div className="pt-2 border-t border-border/40 flex items-center justify-between">
          <span className="text-xs font-bold">Overall Mission Readiness</span>
          <span className={`text-lg font-black ${score >= 70 ? "text-emerald-600" : score >= 40 ? "text-amber-600" : "text-red-600"}`}>{score}/100</span>
        </div>
      </div>
    </Card>
  );
}