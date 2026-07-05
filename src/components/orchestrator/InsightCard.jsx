import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Crown, Zap, Wrench, ArrowRight, TrendingUp, DollarSign, Brain, Target } from "lucide-react";
import { cn } from "@/lib/utils";

export default function InsightCard({ insight, onApply }) {
  const dims = insight.dimensions || {};
  const needsApproval = insight.requires_founder_approval;

  return (
    <Card className={cn("overflow-hidden transition-all", needsApproval ? "border-amber-500/40" : "")}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono text-muted-foreground">#{Math.round(insight.priority_score || 0)}</span>
              {needsApproval && (
                <Badge variant="outline" className="text-amber-600 border-amber-500/50 bg-amber-500/10">
                  <Crown className="w-3 h-3 mr-1" />Founder Approval
                </Badge>
              )}
              {insight.auto_apply_eligible && !needsApproval && (
                <Badge variant="outline" className="text-blue-600 border-blue-500/50 bg-blue-500/10">
                  <Zap className="w-3 h-3 mr-1" />Auto-Apply
                </Badge>
              )}
            </div>
            <h3 className="font-semibold text-sm mt-1">{insight.title}</h3>
          </div>
          <div className="text-right shrink-0">
            <div className="text-2xl font-bold" style={{ color: (insight.priority_score || 0) >= 70 ? "#ef4444" : (insight.priority_score || 0) >= 50 ? "#f59e0b" : "#3b82f6" }}>
              {Math.round(insight.priority_score || 0)}
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground line-clamp-2">{insight.description}</p>

        {insight.what_it_unlocks && (
          <div className="flex items-start gap-1.5 text-xs">
            <ArrowRight className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
            <span className="text-emerald-700 dark:text-emerald-400">{insight.what_it_unlocks}</span>
          </div>
        )}

        {/* 5 ranking dimensions */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
          <DimBar icon={TrendingUp} label="Customer" value={dims.customer_impact} color="#3b82f6" />
          <DimBar icon={DollarSign} label="Revenue" value={dims.revenue_impact} color="#22c55e" />
          <DimBar icon={Target} label="Strategic" value={dims.strategic_importance} color="#a855f7" />
          <DimBar icon={Brain} label="Intelligence" value={dims.intelligence_gained} color="#f59e0b" />
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Wrench className="w-3.5 h-3.5" />
          <span>Effort: {dims.dev_effort_hours || 0}h</span>
        </div>

        {/* Affected modules */}
        {(insight.affected_modules || []).length > 0 && (
          <div className="flex flex-wrap gap-1">
            {insight.affected_modules.slice(0, 4).map(m => (
              <Badge key={m} variant="secondary" className="text-[10px]">{m}</Badge>
            ))}
          </div>
        )}

        {/* Action */}
        {insight.status !== 'applied' && (
          <Button
            size="sm"
            className="w-full"
            variant={needsApproval ? "default" : "outline"}
            onClick={() => onApply?.(insight)}
          >
            {needsApproval ? "Submit for Founder Approval" : insight.auto_apply_eligible ? "Auto-Apply Now" : "Mark Resolved"}
          </Button>
        )}
        {insight.status === 'applied' && (
          <Badge className="w-full justify-center bg-emerald-600">Resolved</Badge>
        )}
      </CardContent>
    </Card>
  );
}

function DimBar({ icon: Icon, label, value, color }) {
  const v = value || 0;
  return (
    <div className="flex items-center gap-1.5">
      <Icon className="w-3 h-3 shrink-0" style={{ color }} />
      <span className="text-muted-foreground w-14 shrink-0">{label}</span>
      <div className="flex-1">
        <Progress value={v} className="h-1.5" />
      </div>
      <span className="font-mono w-6 text-right">{v}</span>
    </div>
  );
}