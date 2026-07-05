import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, DollarSign, Zap, Shield, Layers } from "lucide-react";

const RISK_STYLES = {
  critical: "border-red-400 bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300",
  high: "border-orange-400 bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300",
  medium: "border-amber-400 bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  low: "border-emerald-400 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  unknown: "border-slate-300 bg-slate-100 text-slate-700 dark:bg-slate-800/40 dark:text-slate-300",
};

export default function ImpactView({ impact, centerNode }) {
  if (!impact) return null;

  const nodes = impact.affected_nodes || [];
  const grouped = {};
  nodes.forEach(n => {
    if (!grouped[n.depth]) grouped[n.depth] = [];
    grouped[n.depth].push(n);
  });

  return (
    <div className="space-y-3">
      {/* Impact Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Card className="p-2.5 border border-orange-200 bg-orange-50 dark:bg-orange-950/20 text-center">
          <Layers className="w-3.5 h-3.5 text-orange-600 mx-auto mb-0.5" />
          <p className="text-lg font-bold">{impact.affected_count}</p>
          <p className="text-[9px] text-muted-foreground">Affected Nodes</p>
        </Card>
        <Card className="p-2.5 border border-red-200 bg-red-50 dark:bg-red-950/20 text-center">
          <AlertTriangle className="w-3.5 h-3.5 text-red-600 mx-auto mb-0.5" />
          <p className="text-lg font-bold">{impact.risk_summary?.critical || 0}</p>
          <p className="text-[9px] text-muted-foreground">Critical Risk</p>
        </Card>
        <Card className="p-2.5 border border-amber-200 bg-amber-50 dark:bg-amber-950/20 text-center">
          <Shield className="w-3.5 h-3.5 text-amber-600 mx-auto mb-0.5" />
          <p className="text-lg font-bold">{(impact.risk_summary?.high || 0) + (impact.risk_summary?.medium || 0)}</p>
          <p className="text-[9px] text-muted-foreground">High/Med Risk</p>
        </Card>
        <Card className="p-2.5 border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 text-center">
          <DollarSign className="w-3.5 h-3.5 text-emerald-600 mx-auto mb-0.5" />
          <p className="text-lg font-bold">${(impact.total_financial_impact || 0).toLocaleString()}</p>
          <p className="text-[9px] text-muted-foreground">Financial Impact</p>
        </Card>
      </div>

      {/* Warning Banner */}
      {impact.has_critical && (
        <Card className="p-3 border border-red-400 bg-red-50 dark:bg-red-950/30">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <p className="text-xs font-bold">Critical risk detected — changing this node will impact critical entities. Founder approval recommended.</p>
          </div>
        </Card>
      )}

      {/* Affected Nodes by Depth */}
      {Object.keys(grouped).sort((a, b) => a - b).map(depth => (
        <Card key={depth} className="p-3 border border-border/60">
          <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2 flex items-center gap-1">
            <Zap className="w-3 h-3" />Depth {depth} — {grouped[depth].length} affected
          </p>
          <div className="space-y-1.5">
            {grouped[depth].map((n, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded border border-border/30 text-[10px]">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="font-medium truncate">{n.name || n.id.slice(-8)}</span>
                  <Badge variant="outline" className="text-[8px] flex-shrink-0">{n.type}</Badge>
                  <Badge variant="outline" className="text-[8px] flex-shrink-0">{n.relationship}</Badge>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {n.financial_impact > 0 && <span className="text-emerald-600 font-semibold">${n.financial_impact.toLocaleString()}</span>}
                  <Badge className={`text-[8px] ${RISK_STYLES[n.risk_level] || RISK_STYLES.unknown}`}>{n.risk_level}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}

      {nodes.length === 0 && (
        <Card className="p-6 text-center border border-dashed border-border/40">
          <Shield className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
          <p className="text-xs font-semibold text-emerald-600">No impact detected</p>
          <p className="text-[10px] text-muted-foreground">This node has no recorded dependencies. Safe to change.</p>
        </Card>
      )}
    </div>
  );
}