import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Clock, ShieldCheck } from "lucide-react";

export default function ApprovalPanel({ report, onApprove, onReject, isProcessing }) {
  if (!report) return null;

  const pendingCount = report.approval_gates?.length || 0;
  const isPending = report.status === 'pending_approval';

  return (
    <Card className={`p-4 border-2 ${isPending ? 'border-amber-300 bg-amber-50 dark:bg-amber-950/20' : 'border-border/60'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-4 h-4 text-amber-600" />
            <h3 className="text-sm font-bold">Founder Approval Required</h3>
            <Badge variant="outline" className={`text-[9px] ${isPending ? 'border-amber-400 text-amber-700' : ''}`}>
              {report.status.replace('_', ' ')}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mb-2">
            {pendingCount > 0
              ? `${pendingCount} recommended action${pendingCount > 1 ? 's' : ''} require your approval before execution. The Project Director never modifies production automatically.`
              : 'No actions pending approval for this evaluation.'}
          </p>
          {report.daily_briefing?.founder_actions_required?.length > 0 && (
            <div className="mb-2 p-2 rounded bg-white dark:bg-slate-800/50 border border-border/40">
              <p className="text-[9px] font-bold text-amber-600 uppercase mb-1">Founder Actions Required</p>
              <div className="space-y-0.5">
                {report.daily_briefing.founder_actions_required.slice(0, 5).map((action, i) => (
                  <p key={i} className="text-[10px] flex items-start gap-1">
                    <span className="text-amber-600">→</span>{action}
                  </p>
                ))}
              </div>
            </div>
          )}
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />Generated: {new Date(report.generated_at).toLocaleString()}</span>
            {report.next_evaluation && <span>Next: {new Date(report.next_evaluation).toLocaleTimeString()}</span>}
          </div>
        </div>
        {isPending && (
          <div className="flex flex-col gap-1.5 flex-shrink-0">
            <Button size="sm" onClick={onApprove} disabled={isProcessing} className="bg-emerald-600 hover:bg-emerald-700 h-7 text-xs">
              <CheckCircle className="w-3 h-3 mr-1" />Approve All
            </Button>
            <Button size="sm" variant="outline" onClick={onReject} disabled={isProcessing} className="h-7 text-xs border-red-300 text-red-600 hover:bg-red-50">
              <XCircle className="w-3 h-3 mr-1" />Reject
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}