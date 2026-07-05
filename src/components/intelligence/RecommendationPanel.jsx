import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, CheckCircle, XCircle, TrendingUp, Clock, Zap } from "lucide-react";
import moment from "moment";

const REC_COLORS = {
  action: "bg-blue-100 text-blue-700",
  optimization: "bg-violet-100 text-violet-700",
  risk_mitigation: "bg-red-100 text-red-700",
  opportunity: "bg-emerald-100 text-emerald-700",
  improvement: "bg-amber-100 text-amber-700",
  automation: "bg-cyan-100 text-cyan-700",
  resource_allocation: "bg-teal-100 text-teal-700",
  strategic: "bg-indigo-100 text-indigo-700",
};

const PRIORITY_COLORS = { low: "bg-slate-100 text-slate-700", medium: "bg-amber-100 text-amber-700", high: "bg-orange-100 text-orange-700", critical: "bg-red-100 text-red-700" };
const IMPACT_COLORS = { low: "bg-slate-100 text-slate-700", medium: "bg-blue-100 text-blue-700", high: "bg-emerald-100 text-emerald-700", transformative: "bg-violet-100 text-violet-700" };

const STATUS_META = {
  pending: { icon: Clock, color: "text-amber-600", label: "Pending" },
  accepted: { icon: CheckCircle, color: "text-blue-600", label: "Accepted" },
  rejected: { icon: XCircle, color: "text-slate-400", label: "Rejected" },
  in_progress: { icon: Zap, color: "text-violet-600", label: "In Progress" },
  implemented: { icon: CheckCircle, color: "text-emerald-600", label: "Implemented" },
  expired: { icon: XCircle, color: "text-slate-400", label: "Expired" },
};

export default function RecommendationPanel({ refreshKey }) {
  const [recs, setRecs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.Recommendation.list('-created_date', 100);
    setRecs(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [refreshKey]);

  const generate = async () => {
    setGenerating(true);
    try {
      await base44.functions.invoke('ncIntelligence', {
        operation: 'generate_recommendations',
        params: {}
      });
      load();
    } catch (e) { console.error(e); }
    setGenerating(false);
  };

  const updateStatus = async (id, status) => {
    await base44.entities.Recommendation.update(id, { status, [status === 'accepted' ? 'accepted_at' : status === 'implemented' ? 'implemented_at' : '']: new Date().toISOString() });
    load();
  };

  const pending = recs.filter(r => r.status === "pending");
  const accepted = recs.filter(r => r.status === "accepted" || r.status === "implemented" || r.status === "in_progress");

  return (
    <div className="space-y-4">
      {/* Generation Controls + Stats */}
      <Card className="p-4 border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-emerald-600" />AI Recommendation Engine</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Generates actionable recommendations from patterns, memory, and platform state</p>
          </div>
          <Button onClick={generate} disabled={generating} size="sm">
            {generating ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Sparkles className="w-4 h-4 mr-1" />}
            {generating ? "Generating..." : "Generate Recs"}
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 text-center"><p className="text-2xl font-bold text-amber-600">{pending.length}</p><p className="text-[10px] text-muted-foreground">Pending</p></Card>
        <Card className="p-3 text-center"><p className="text-2xl font-bold text-emerald-600">{accepted.length}</p><p className="text-[10px] text-muted-foreground">Accepted/Implemented</p></Card>
        <Card className="p-3 text-center"><p className="text-2xl font-bold">{recs.length}</p><p className="text-[10px] text-muted-foreground">Total</p></Card>
      </div>

      {/* Recommendation List */}
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : recs.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground text-sm">No recommendations yet. Generate recommendations to get AI-powered actionable insights.</Card>
      ) : (
        <div className="space-y-2">
          {recs.map(r => {
            const StatusIcon = STATUS_META[r.status]?.icon || Clock;
            return (
              <Card key={r.id} className={`p-4 border ${r.status === 'pending' ? 'border-amber-200 bg-amber-50/50 dark:bg-amber-950/10' : 'border-border/60'}`}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={`text-[9px] ${REC_COLORS[r.recommendation_type] || REC_COLORS.action}`}>{r.recommendation_type.replace(/_/g, " ")}</Badge>
                    <Badge className={`text-[9px] ${PRIORITY_COLORS[r.priority] || PRIORITY_COLORS.medium}`}>{r.priority}</Badge>
                    <Badge className={`text-[9px] ${IMPACT_COLORS[r.expected_impact] || IMPACT_COLORS.medium}`}>{r.expected_impact} impact</Badge>
                    <span className={`flex items-center gap-1 text-[10px] ${STATUS_META[r.status]?.color || "text-amber-600"}`}>
                      <StatusIcon className="w-3 h-3" />{STATUS_META[r.status]?.label || r.status}
                    </span>
                  </div>
                  <span className="text-[9px] text-muted-foreground">{r.confidence}% confidence</span>
                </div>
                <p className="text-sm font-semibold mb-1">{r.title}</p>
                <p className="text-xs text-muted-foreground">{r.description}</p>
                {r.rationale && <p className="text-[10px] text-muted-foreground mt-1 italic">Rationale: {r.rationale}</p>}
                {r.action_steps?.length > 0 && (
                  <div className="mt-2 p-2 rounded bg-muted/40">
                    <p className="text-[10px] font-semibold text-blue-600 mb-0.5">Action Steps</p>
                    {r.action_steps.map((s, i) => <p key={i} className="text-[10px] text-muted-foreground">{i + 1}. {s}</p>)}
                  </div>
                )}
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/40">
                  <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
                    <span>{r.target_module || "—"} · {r.effort_estimate} effort</span>
                    <span>· {moment(r.created_date).fromNow()}</span>
                  </div>
                  <div className="flex gap-1">
                    {r.status === "pending" && (
                      <>
                        <Button size="sm" className="h-6 text-[9px]" onClick={() => updateStatus(r.id, "accepted")}>Accept</Button>
                        <Button size="sm" variant="ghost" className="h-6 text-[9px]" onClick={() => updateStatus(r.id, "rejected")}>Reject</Button>
                      </>
                    )}
                    {r.status === "accepted" && <Button size="sm" variant="outline" className="h-6 text-[9px]" onClick={() => updateStatus(r.id, "implemented")}>Mark Implemented</Button>}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}