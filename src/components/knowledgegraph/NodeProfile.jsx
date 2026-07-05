import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { User, AlertTriangle, CheckCircle, DollarSign, Scale, Activity, ArrowUpRight, ArrowDownRight } from "lucide-react";

const RISK_COLORS = {
  low: "border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400",
  medium: "border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400",
  high: "border-orange-300 bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400",
  critical: "border-red-300 bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400",
  unknown: "border-slate-300 bg-slate-50 text-slate-700 dark:bg-slate-800/30 dark:text-slate-400",
};

export default function NodeProfile({ node, outgoing, incoming }) {
  if (!node) return null;

  return (
    <div className="space-y-3">
      {/* Header */}
      <Card className="p-4 border border-border/60">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="text-sm font-bold">{node.entity_name}</h3>
            <p className="text-[10px] text-muted-foreground">{node.entity_type} · {node.entity_category}</p>
          </div>
          <Badge variant="outline" className={`text-[9px] ${RISK_COLORS[node.risk_level] || RISK_COLORS.unknown}`}>
            <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />{node.risk_level} risk
          </Badge>
        </div>
        {node.description && <p className="text-[10px] text-muted-foreground line-clamp-3">{node.description}</p>}
      </Card>

      {/* Metadata grid */}
      <div className="grid grid-cols-2 gap-2">
        <Card className="p-2.5 border border-border/60">
          <User className="w-3 h-3 text-blue-600 mb-1" />
          <p className="text-[9px] text-muted-foreground">Owner</p>
          <p className="text-xs font-semibold truncate">{node.owner || "Unassigned"}</p>
        </Card>
        <Card className="p-2.5 border border-border/60">
          <Activity className="w-3 h-3 text-slate-600 mb-1" />
          <p className="text-[9px] text-muted-foreground">Status</p>
          <p className="text-xs font-semibold truncate">{node.status || "—"}</p>
        </Card>
        <Card className="p-2.5 border border-border/60">
          <DollarSign className="w-3 h-3 text-emerald-600 mb-1" />
          <p className="text-[9px] text-muted-foreground">Financial Impact</p>
          <p className="text-xs font-semibold">${(node.financial_impact || 0).toLocaleString()}</p>
        </Card>
        <Card className="p-2.5 border border-border/60">
          <Scale className="w-3 h-3 text-indigo-600 mb-1" />
          <p className="text-[9px] text-muted-foreground">Legal Impact</p>
          <p className="text-xs font-semibold capitalize">{node.legal_impact || "none"}</p>
        </Card>
      </div>

      {/* Completion */}
      <Card className="p-3 border border-border/60">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase">Completion</span>
          <span className="text-xs font-bold">{node.completion_pct || 0}%</span>
        </div>
        <Progress value={node.completion_pct || 0} className="h-1.5" />
      </Card>

      {/* Dependencies */}
      <div className="grid grid-cols-1 gap-2">
        <Card className="p-3 border border-border/60">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1.5 flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3 text-blue-600" />Depends On ({outgoing?.length || 0})
          </p>
          {outgoing?.length ? (
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {outgoing.map((o, i) => (
                <div key={i} className="flex items-center justify-between text-[10px] p-1 rounded border border-border/30">
                  <span className="truncate font-medium">{o.target_name || o.target_id.slice(-8)}</span>
                  <Badge variant="outline" className="text-[8px]">{o.relationship}</Badge>
                </div>
              ))}
            </div>
          ) : <p className="text-[10px] text-muted-foreground">No outgoing dependencies</p>}
        </Card>

        <Card className="p-3 border border-border/60">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1.5 flex items-center gap-1">
            <ArrowDownRight className="w-3 h-3 text-pink-600" />Depended By ({incoming?.length || 0})
          </p>
          {incoming?.length ? (
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {incoming.map((i, idx) => (
                <div key={idx} className="flex items-center justify-between text-[10px] p-1 rounded border border-border/30">
                  <span className="truncate font-medium">{i.source_name || i.source_id.slice(-8)}</span>
                  <Badge variant="outline" className="text-[8px]">{i.relationship}</Badge>
                </div>
              ))}
            </div>
          ) : <p className="text-[10px] text-muted-foreground">Nothing depends on this</p>}
        </Card>
      </div>

      {node.tags?.length > 0 && (
        <Card className="p-3 border border-border/60">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1.5">Tags</p>
          <div className="flex flex-wrap gap-1">
            {node.tags.slice(0, 10).map((t, i) => <Badge key={i} variant="outline" className="text-[9px]">{t}</Badge>)}
          </div>
        </Card>
      )}
    </div>
  );
}