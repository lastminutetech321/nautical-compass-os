import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, User, Clock, DollarSign, TrendingUp, ChevronRight } from "lucide-react";

const IMPACT_COLORS = {
  low: "border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400",
  medium: "border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400",
  high: "border-orange-300 bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400",
  critical: "border-red-300 bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400",
};

export default function BlockedBuildCard({ build, onViewChain }) {
  const avgCompletion = build.completion
    ? Math.round((build.completion.architecture + build.completion.backend + build.completion.testing + build.completion.documentation + build.completion.deployment) / 5)
    : 0;

  return (
    <Card className="p-4 border border-red-200 bg-red-50/30 dark:bg-red-950/10">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <h4 className="text-sm font-bold">{build.name}</h4>
            <Badge variant="outline" className="text-[9px]">{build.rail}</Badge>
          </div>
          <p className="text-[10px] text-muted-foreground">{build.missing_count} missing dependencies blocking this build</p>
        </div>
        <Badge className={`text-[9px] ${IMPACT_COLORS[build.business_impact] || IMPACT_COLORS.medium}`}>
          {build.business_impact} impact
        </Badge>
      </div>

      {/* WHY */}
      <div className="mb-2 p-2 rounded bg-white dark:bg-slate-800/50 border border-border/40">
        <p className="text-[9px] font-bold text-red-600 uppercase mb-0.5">Why Blocked</p>
        <p className="text-[11px]">{build.why}</p>
      </div>

      {/* WHAT is missing */}
      {build.what_is_missing?.length > 0 && (
        <div className="mb-2 p-2 rounded bg-white dark:bg-slate-800/50 border border-border/40">
          <p className="text-[9px] font-bold text-amber-600 uppercase mb-1">What's Missing</p>
          <div className="space-y-0.5">
            {build.what_is_missing.slice(0, 5).map((m, i) => (
              <p key={i} className="text-[10px] flex items-start gap-1">
                <ChevronRight className="w-2.5 h-2.5 mt-0.5 text-muted-foreground flex-shrink-0" />
                {m}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* WHO + ETA + Impact grid */}
      <div className="grid grid-cols-3 gap-2 mb-2">
        <div className="p-1.5 rounded border border-border/40 bg-white dark:bg-slate-800/50">
          <User className="w-2.5 h-2.5 text-blue-600 mb-0.5" />
          <p className="text-[8px] text-muted-foreground uppercase">Owner</p>
          <p className="text-[10px] font-semibold truncate">{build.owner}</p>
        </div>
        <div className="p-1.5 rounded border border-border/40 bg-white dark:bg-slate-800/50">
          <Clock className="w-2.5 h-2.5 text-amber-600 mb-0.5" />
          <p className="text-[8px] text-muted-foreground uppercase">ETA</p>
          <p className="text-[10px] font-semibold truncate">{build.estimated_completion || `${build.estimated_hours_remaining || 0}h`}</p>
        </div>
        <div className="p-1.5 rounded border border-border/40 bg-white dark:bg-slate-800/50">
          <DollarSign className="w-2.5 h-2.5 text-emerald-600 mb-0.5" />
          <p className="text-[8px] text-muted-foreground uppercase">Fin. Impact</p>
          <p className="text-[10px] font-semibold">${build.financial_impact.toLocaleString()}</p>
        </div>
      </div>

      {/* Completion */}
      {build.completion && (
        <div className="mb-2">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[9px] text-muted-foreground uppercase">Build Completion</span>
            <span className="text-[10px] font-bold">{avgCompletion}%</span>
          </div>
          <Progress value={avgCompletion} className="h-1" />
        </div>
      )}

      {/* Dependencies list */}
      {build.dependencies?.length > 0 && (
        <div className="space-y-1">
          {build.dependencies.slice(0, 4).map((dep, i) => (
            <div key={i} className="p-1.5 rounded border border-border/30 bg-white dark:bg-slate-800/40 text-[10px]">
              <div className="flex items-center justify-between mb-0.5">
                <span className="font-semibold truncate">{dep.title}</span>
                <div className="flex gap-1 flex-shrink-0">
                  <Badge variant="outline" className="text-[8px]">{dep.type}</Badge>
                  <Badge variant="outline" className="text-[8px]">{dep.status}</Badge>
                </div>
              </div>
              <p className="text-[9px] text-muted-foreground truncate">{dep.what_is_missing}</p>
              {dep.resolution_steps?.length > 0 && (
                <div className="mt-0.5 space-y-0">
                  {dep.resolution_steps.slice(0, 2).map((s, idx) => (
                    <p key={idx} className="text-[8px] text-muted-foreground flex items-start gap-0.5">
                      <span className="text-blue-500">→</span>{s}
                    </p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {onViewChain && (
        <button onClick={() => onViewChain(build)} className="mt-2 text-[10px] text-blue-600 hover:underline font-medium">
          View dependency chain →
        </button>
      )}
    </Card>
  );
}