import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, Loader2, Sparkles, CheckCircle, XCircle, Clock } from "lucide-react";
import moment from "moment";

const PATTERN_COLORS = {
  temporal: "bg-blue-100 text-blue-700",
  behavioral: "bg-violet-100 text-violet-700",
  structural: "bg-amber-100 text-amber-700",
  anomaly: "bg-red-100 text-red-700",
  correlation: "bg-teal-100 text-teal-700",
  causal: "bg-orange-100 text-orange-700",
  cyclical: "bg-cyan-100 text-cyan-700",
  trend: "bg-emerald-100 text-emerald-700",
};

const SIG_COLORS = { low: "bg-slate-100 text-slate-700", medium: "bg-amber-100 text-amber-700", high: "bg-orange-100 text-orange-700", critical: "bg-red-100 text-red-700" };

const STATUS_META = {
  detected: { icon: Clock, color: "text-amber-600", label: "Detected" },
  confirmed: { icon: CheckCircle, color: "text-emerald-600", label: "Confirmed" },
  acted_on: { icon: CheckCircle, color: "text-blue-600", label: "Acted On" },
  dismissed: { icon: XCircle, color: "text-slate-400", label: "Dismissed" },
  archived: { icon: XCircle, color: "text-slate-400", label: "Archived" },
};

export default function PatternPanel({ refreshKey }) {
  const [patterns, setPatterns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detecting, setDetecting] = useState(false);

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.PatternRecord.list('-created_date', 100);
    setPatterns(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [refreshKey]);

  const detectPatterns = async () => {
    setDetecting(true);
    try {
      await base44.functions.invoke('ncIntelligence', {
        operation: 'detect_patterns',
        params: {}
      });
      load();
    } catch (e) { console.error(e); }
    setDetecting(false);
  };

  const updateStatus = async (id, status) => {
    await base44.entities.PatternRecord.update(id, { status });
    load();
  };

  return (
    <div className="space-y-4">
      {/* Detection Controls */}
      <Card className="p-4 border border-amber-200 bg-amber-50 dark:bg-amber-950/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-amber-600" />AI Pattern Recognition</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Scans all entity data for temporal, behavioral, structural, anomaly, and correlation patterns</p>
          </div>
          <Button onClick={detectPatterns} disabled={detecting} size="sm">
            {detecting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Sparkles className="w-4 h-4 mr-1" />}
            {detecting ? "Detecting..." : "Detect Patterns"}
          </Button>
        </div>
      </Card>

      {/* Pattern List */}
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : patterns.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground text-sm">No patterns detected yet. Run pattern detection to discover insights across your platform data.</Card>
      ) : (
        <div className="space-y-2">
          {patterns.map(p => {
            const StatusIcon = STATUS_META[p.status]?.icon || Clock;
            return (
              <Card key={p.id} className="p-4 border border-border/60">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <Badge className={`text-[9px] ${PATTERN_COLORS[p.pattern_type] || PATTERN_COLORS.behavioral}`}>{p.pattern_type}</Badge>
                    <Badge className={`text-[9px] ${SIG_COLORS[p.significance] || SIG_COLORS.medium}`}>{p.significance}</Badge>
                    <span className={`flex items-center gap-1 text-[10px] ${STATUS_META[p.status]?.color || "text-amber-600"}`}>
                      <StatusIcon className="w-3 h-3" />{STATUS_META[p.status]?.label || p.status}
                    </span>
                  </div>
                  <span className="text-[9px] text-muted-foreground">{p.confidence}% confidence</span>
                </div>
                <p className="text-sm font-semibold mb-1">{p.title}</p>
                <p className="text-xs text-muted-foreground">{p.description}</p>
                {p.entity_types_involved?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {p.entity_types_involved.map((e, i) => <Badge key={i} variant="outline" className="text-[8px]">{e}</Badge>)}
                  </div>
                )}
                {p.recommended_actions?.length > 0 && (
                  <div className="mt-2 p-2 rounded bg-muted/40">
                    <p className="text-[10px] font-semibold text-blue-600 mb-0.5">Recommended Actions</p>
                    {p.recommended_actions.map((a, i) => <p key={i} className="text-[10px] text-muted-foreground">• {a}</p>)}
                  </div>
                )}
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/40">
                  <span className="text-[9px] text-muted-foreground">Last seen: {p.last_seen ? moment(p.last_seen).format("MMM D") : "—"}</span>
                  <div className="flex gap-1">
                    {p.status === "detected" && (
                      <>
                        <Button size="sm" variant="outline" className="h-6 text-[9px]" onClick={() => updateStatus(p.id, "confirmed")}>Confirm</Button>
                        <Button size="sm" variant="ghost" className="h-6 text-[9px]" onClick={() => updateStatus(p.id, "dismissed")}>Dismiss</Button>
                      </>
                    )}
                    {p.status === "confirmed" && <Button size="sm" variant="outline" className="h-6 text-[9px]" onClick={() => updateStatus(p.id, "acted_on")}>Mark Acted On</Button>}
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