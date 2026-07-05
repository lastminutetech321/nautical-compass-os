import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, GitCompare, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";

export default function BlueprintComparison({ comparison, bp1, bp2, onBack }) {
  if (!comparison) return null;

  const { overall_assessment, component_comparisons, key_differences, improvements, regressions, recommendation } = comparison;

  const riskColor = (risk) => {
    if (!risk) return "text-muted-foreground";
    const r = risk.toLowerCase();
    if (r.includes("critical") || r.includes("high")) return "text-red-600";
    if (r.includes("medium")) return "text-amber-600";
    return "text-emerald-600";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" size="sm" onClick={onBack} className="mb-2">← Back to Blueprints</Button>
          <h2 className="text-xl font-bold flex items-center gap-2"><GitCompare className="w-5 h-5 text-primary" />Blueprint Comparison</h2>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-[10px]">{bp1.name} v{bp1.version}</Badge>
            <span className="text-muted-foreground text-xs">vs</span>
            <Badge variant="outline" className="text-[10px]">{bp2.name} v{bp2.version}</Badge>
          </div>
        </div>
      </div>

      {overall_assessment && (
        <Card className="p-4 border border-primary/20 bg-primary/5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Overall Assessment</p>
          <p className="text-sm">{overall_assessment}</p>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {improvements?.length > 0 && (
          <Card className="p-4 border border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/10">
            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-2 flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5" />Improvements ({improvements.length})</p>
            <ul className="space-y-1">{improvements.map((imp, i) => <li key={i} className="text-xs text-emerald-700">• {imp}</li>)}</ul>
          </Card>
        )}
        {regressions?.length > 0 && (
          <Card className="p-4 border border-red-200 bg-red-50/50 dark:bg-red-950/10">
            <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2 flex items-center gap-1"><TrendingDown className="w-3.5 h-3.5" />Regressions ({regressions.length})</p>
            <ul className="space-y-1">{regressions.map((reg, i) => <li key={i} className="text-xs text-red-700">• {reg}</li>)}</ul>
          </Card>
        )}
      </div>

      {key_differences?.length > 0 && (
        <Card className="p-4 border border-border/60">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Key Differences ({key_differences.length})</p>
          <ul className="space-y-1">{key_differences.map((diff, i) => <li key={i} className="text-xs">• {diff}</li>)}</ul>
        </Card>
      )}

      {component_comparisons?.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Component-by-Component Comparison</p>
          {component_comparisons.map((cc, i) => (
            <Card key={i} className="p-3 border border-border/60">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold capitalize">{cc.component?.replace(/_/g, " ") || `Component ${i + 1}`}</p>
                {cc.risk_level && <Badge variant="outline" className={`text-[9px] ${riskColor(cc.risk_level)}`}>{cc.risk_level}</Badge>}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                <div className="p-2 rounded bg-muted/20"><p className="text-[9px] font-semibold text-muted-foreground mb-1">Blueprint 1</p><p className="text-xs">{cc.blueprint_1_summary || "—"}</p></div>
                <div className="p-2 rounded bg-muted/20"><p className="text-[9px] font-semibold text-muted-foreground mb-1">Blueprint 2</p><p className="text-xs">{cc.blueprint_2_summary || "—"}</p></div>
              </div>
              {cc.what_changed && <p className="text-xs mb-1"><strong className="text-muted-foreground">Changed:</strong> {cc.what_changed}</p>}
              {cc.impact && <p className="text-xs mb-1"><strong className="text-muted-foreground">Impact:</strong> {cc.impact}</p>}
              {cc.recommendation && <p className="text-xs text-primary"><strong>Recommendation:</strong> {cc.recommendation}</p>}
            </Card>
          ))}
        </div>
      )}

      {recommendation && (
        <Card className="p-4 border border-violet-200 bg-violet-50/50 dark:bg-violet-950/10">
          <p className="text-xs font-semibold text-violet-600 uppercase tracking-wide mb-1">Recommendation</p>
          <p className="text-sm">{recommendation}</p>
        </Card>
      )}
    </div>
  );
}