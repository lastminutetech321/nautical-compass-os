import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Calendar, Sparkles, Loader2, Crown, Clock } from "lucide-react";
import { base44 } from "@/api/base44Client";
import moment from "moment";
import { useMissionData, calcReadinessScore } from "@/hooks/useMissionData";

const RISK_COLORS = { low: "bg-emerald-100 text-emerald-700", medium: "bg-amber-100 text-amber-700", high: "bg-orange-100 text-orange-700", critical: "bg-red-100 text-red-700" };

export default function Digests({ data }) {
  const [generating, setGenerating] = useState(null);
  const [digests, setDigests] = useState({ daily: null, weekly: null, monthly: null });

  if (!data) return null;
  const { briefings, survival, subs, invoices, issues, canon, agents, builds, approvals, roadmap } = data;
  const today = moment().format("YYYY-MM-DD");
  const todayBriefing = briefings.find(b => b.date === today);

  const generateDigest = async (type) => {
    setGenerating(type);
    const mrr = subs.reduce((s, sub) => s + (sub.mrr || 0), 0);
    const verifiedCanon = canon.filter(e => e.verified && e.status === "active").length;
    const totalDone = builds.reduce((s, b) => (b.completed_tasks || []).length + s, 0);
    const totalReq = builds.reduce((s, b) => (b.required_tasks || []).length + s, 0);
    const overallPct = totalReq > 0 ? Math.round((totalDone / totalReq) * 100) : 0;
    const costs = survival ? (survival.monthly_platform_cost || 0) + (survival.ai_api_cost || 0) + (survival.hosting_cost || 0) : 0;

    const periodLabel = type === "daily" ? "today" : type === "weekly" ? "this week" : "this month";
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Generate a ${type} digest for NCOS platform covering ${periodLabel}.

Platform state:
- Build completion: ${overallPct}%
- MRR: $${mrr}/mo, Costs: $${costs}/mo, Net: $${mrr - costs}/mo
- Runway: ${survival?.cash_runway_months || "unknown"} months
- Canon: ${verifiedCanon} verified, ${canon.length} total, ${canon.filter(e=>e.is_canon_gap).length} gaps
- AI Workforce: ${agents.length} agents (${agents.filter(a=>a.status==="active").length} active, ${agents.filter(a=>a.agent_type==="c_suite").length} C-suite)
- Open issues: ${issues.length} (${issues.filter(i=>i.severity==="critical").length} critical)
- Pending approvals: ${approvals.length}
- Roadmap in progress: ${roadmap.filter(r=>r.status==="in_progress").length}

Provide a concise ${type} digest with: key achievements, metrics summary, risks, and next period priorities. Keep it executive-level and actionable.`,
      response_json_schema: {
        type: "object",
        properties: {
          summary: { type: "string" },
          key_achievements: { type: "array", items: { type: "string" } },
          metrics: { type: "string" },
          risks: { type: "array", items: { type: "string" } },
          next_priorities: { type: "array", items: { type: "string" } },
        }
      }
    });
    setDigests(prev => ({ ...prev, [type]: result }));
    setGenerating(null);
  };

  const DigestCard = ({ type, icon: Icon, title, color }) => {
    const digest = digests[type];
    const isGenerating = generating === type;
    return (
      <Card className={`p-4 border ${color}`}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold uppercase flex items-center gap-1.5"><Icon className="w-3.5 h-3.5" />{title}</p>
          <Button size="sm" variant="outline" className="text-[10px] h-7" onClick={() => generateDigest(type)} disabled={isGenerating}>
            {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
            {isGenerating ? "Generating…" : "Generate"}
          </Button>
        </div>
        {digest ? (
          <div className="space-y-2 text-xs">
            <p className="text-muted-foreground leading-relaxed">{digest.summary}</p>
            {digest.key_achievements?.length > 0 && (
              <div><p className="font-semibold mb-0.5">Achievements</p>{digest.key_achievements.slice(0,3).map((a,i)=><p key={i} className="text-muted-foreground">• {a}</p>)}</div>
            )}
            {digest.metrics && <div className="p-1.5 rounded bg-muted/40"><p className="font-semibold">Metrics</p><p className="text-muted-foreground">{digest.metrics}</p></div>}
            {digest.risks?.length > 0 && (
              <div><p className="font-semibold text-red-600 mb-0.5">Risks</p>{digest.risks.slice(0,3).map((r,i)=><p key={i} className="text-muted-foreground">• {r}</p>)}</div>
            )}
            {digest.next_priorities?.length > 0 && (
              <div><p className="font-semibold text-emerald-600 mb-0.5">Next Priorities</p>{digest.next_priorities.slice(0,3).map((p,i)=><p key={i} className="text-muted-foreground">• {p}</p>)}</div>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-3">{isGenerating ? `Generating ${title}…` : `Click Generate to create ${title}`}</p>
        )}
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      {/* Founder Briefing */}
      <Card className="p-5 border border-violet-200 bg-violet-50 dark:bg-violet-950/20">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-violet-700 uppercase flex items-center gap-1.5"><Crown className="w-3.5 h-3.5" />Founder Briefing</p>
          <Button size="sm" variant="outline" className="text-[10px] h-7" asChild>
            <a href="/mission-control">Full Mission Control</a>
          </Button>
        </div>
        {todayBriefing ? (
          <div className="space-y-2">
            <p className="text-sm text-violet-800">{todayBriefing.summary || todayBriefing.platform_health}</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded bg-white/60 dark:bg-card/40">
                <p className="font-semibold text-violet-700">Platform Health</p>
                <p className="text-muted-foreground">{todayBriefing.platform_health || "—"}</p>
              </div>
              <div className="p-2 rounded bg-white/60 dark:bg-card/40">
                <p className="font-semibold text-emerald-700">Revenue Health</p>
                <p className="text-muted-foreground">{todayBriefing.revenue_health || "—"}</p>
              </div>
            </div>
            {todayBriefing.highest_value_action && (
              <div className="p-2 rounded bg-amber-50 dark:bg-amber-950/30 border border-amber-200">
                <p className="text-[10px] font-bold text-amber-700 uppercase">Highest-Value Action</p>
                <p className="text-xs text-amber-800">{todayBriefing.highest_value_action}</p>
              </div>
            )}
            {todayBriefing.approvals_needed?.length > 0 && (
              <div className="p-2 rounded bg-red-50 dark:bg-red-950/30 border border-red-200">
                <p className="text-[10px] font-bold text-red-700 uppercase">Founder Decision Needed</p>
                {todayBriefing.approvals_needed.map((a,i)=><p key={i} className="text-xs text-red-800">• {a}</p>)}
              </div>
            )}
            <p className="text-[9px] text-muted-foreground text-right">Generated {moment(todayBriefing.created_date).fromNow()}</p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-3">No founder briefing generated today. Use Mission Control to generate.</p>
        )}
      </Card>

      {/* Digests */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DigestCard type="daily" icon={Clock} title="Daily Digest" color="border-blue-200 bg-blue-50 dark:bg-blue-950/20" />
        <DigestCard type="weekly" icon={Calendar} title="Weekly Digest" color="border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20" />
        <DigestCard type="monthly" icon={FileText} title="Monthly Digest" color="border-violet-200 bg-violet-50 dark:bg-violet-950/20" />
      </div>
    </div>
  );
}