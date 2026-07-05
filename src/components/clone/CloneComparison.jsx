import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { GitCompare, CheckCircle2, Wrench, Plus, AlertTriangle, TrendingUp, ArrowRight } from "lucide-react";

export default function CloneComparison({ comparison, clone, parent, onBack }) {
  if (!comparison) return null;

  const { overall_assessment, inheritance_summary, what_was_inherited, what_was_customized, what_is_new, component_comparison, readiness_score, readiness_assessment, gaps, recommendations, estimated_time_to_launch } = comparison;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" size="sm" onClick={onBack} className="mb-2">← Back to Clones</Button>
          <h2 className="text-xl font-bold flex items-center gap-2"><GitCompare className="w-5 h-5 text-primary" />Parent vs Clone Comparison</h2>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge variant="outline" className="text-[10px]">Parent: {parent.name} v{parent.version}</Badge>
            <ArrowRight className="w-3 h-3 text-muted-foreground" />
            <Badge variant="outline" className="text-[10px] bg-primary/10">Clone: {clone.name}</Badge>
          </div>
        </div>
      </div>

      {/* Readiness Score */}
      {typeof readiness_score === "number" && (
        <Card className="p-4 border border-primary/20 bg-primary/5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Clone Readiness Score</p>
            <span className="text-2xl font-bold text-primary">{readiness_score}%</span>
          </div>
          <Progress value={readiness_score} className="mb-2" />
          {readiness_assessment && <p className="text-xs">{readiness_assessment}</p>}
          {estimated_time_to_launch && <p className="text-xs text-muted-foreground mt-1">Estimated time to launch: {estimated_time_to_launch}</p>}
        </Card>
      )}

      {overall_assessment && (
        <Card className="p-4 border border-border/60">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Overall Assessment</p>
          <p className="text-sm">{overall_assessment}</p>
        </Card>
      )}

      {inheritance_summary && (
        <Card className="p-3 border border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/10">
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-1">Inheritance Summary</p>
          <p className="text-xs text-emerald-700">{inheritance_summary}</p>
        </Card>
      )}

      {/* Three-column: Inherited / Customized / New */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {what_was_inherited?.length > 0 && (
          <Card className="p-3 border border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/10">
            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-2 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" />Inherited ({what_was_inherited.length})</p>
            <ul className="space-y-1">{what_was_inherited.map((item, i) => <li key={i} className="text-xs text-emerald-700">✓ {item}</li>)}</ul>
          </Card>
        )}
        {what_was_customized?.length > 0 && (
          <Card className="p-3 border border-blue-200 bg-blue-50/50 dark:bg-blue-950/10">
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2 flex items-center gap-1"><Wrench className="w-3.5 h-3.5" />Customized ({what_was_customized.length})</p>
            <ul className="space-y-1">{what_was_customized.map((item, i) => <li key={i} className="text-xs text-blue-700">⚡ {item}</li>)}</ul>
          </Card>
        )}
        {what_is_new?.length > 0 && (
          <Card className="p-3 border border-violet-200 bg-violet-50/50 dark:bg-violet-950/10">
            <p className="text-xs font-semibold text-violet-600 uppercase tracking-wide mb-2 flex items-center gap-1"><Plus className="w-3.5 h-3.5" />New ({what_is_new.length})</p>
            <ul className="space-y-1">{what_is_new.map((item, i) => <li key={i} className="text-xs text-violet-700">+ {item}</li>)}</ul>
          </Card>
        )}
      </div>

      {/* Component Comparison Table */}
      {component_comparison?.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Component-by-Component Comparison</p>
          {component_comparison.map((cc, i) => (
            <Card key={i} className="p-3 border border-border/60">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-semibold capitalize">{cc.component?.replace(/_/g, " ") || `Component ${i + 1}`}</p>
                {cc.status && <Badge variant="outline" className={`text-[9px] ${cc.status === "inherited" ? "text-emerald-600" : cc.status === "customized" ? "text-blue-600" : "text-violet-600"}`}>{cc.status}</Badge>}
              </div>
              {cc.parent_blueprint && <p className="text-xs mb-1"><strong className="text-muted-foreground">Parent:</strong> {typeof cc.parent_blueprint === "string" ? cc.parent_blueprint : JSON.stringify(cc.parent_blueprint)}</p>}
              {cc.clone && <p className="text-xs mb-1"><strong className="text-muted-foreground">Clone:</strong> {typeof cc.clone === "string" ? cc.clone : JSON.stringify(cc.clone)}</p>}
              {cc.notes && <p className="text-xs text-muted-foreground italic">{cc.notes}</p>}
            </Card>
          ))}
        </div>
      )}

      {/* Gaps */}
      {gaps?.length > 0 && (
        <Card className="p-4 border border-amber-200 bg-amber-50/50 dark:bg-amber-950/10">
          <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-2 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" />Gaps ({gaps.length})</p>
          <ul className="space-y-1">{gaps.map((gap, i) => <li key={i} className="text-xs text-amber-700">⚠ {gap}</li>)}</ul>
        </Card>
      )}

      {/* Recommendations */}
      {recommendations?.length > 0 && (
        <Card className="p-4 border border-primary/20 bg-primary/5">
          <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2 flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5" />Recommendations ({recommendations.length})</p>
          <ul className="space-y-1">{recommendations.map((rec, i) => <li key={i} className="text-xs">→ {rec}</li>)}</ul>
        </Card>
      )}
    </div>
  );
}