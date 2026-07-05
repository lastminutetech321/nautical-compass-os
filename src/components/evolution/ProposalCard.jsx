import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, XCircle, AlertTriangle, Lightbulb, Clock } from 'lucide-react';

const priorityBadge = {
  critical: 'bg-red-500/20 text-red-300 border-red-500/30',
  high: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  medium: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  low: 'bg-slate-700 text-slate-300'
};

const statusBadge = {
  pending: 'bg-amber-500/20 text-amber-300',
  approved: 'bg-emerald-500/20 text-emerald-300',
  rejected: 'bg-red-500/20 text-red-300',
  implemented: 'bg-blue-500/20 text-blue-300',
  deferred: 'bg-slate-700 text-slate-300'
};

export default function ProposalCard({ proposal, onApprove, onReject, onView }) {
  const scoreColor = proposal.overall_score >= 70 ? 'text-emerald-400' : proposal.overall_score >= 50 ? 'text-amber-400' : 'text-red-400';

  return (
    <Card className={`p-4 bg-slate-900/50 border-slate-800 ${proposal.founder_alert ? 'border-red-500/40' : ''}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm text-white">{proposal.title}</h3>
            {proposal.founder_alert && proposal.status === 'pending' && <AlertTriangle className="w-3.5 h-3.5 text-red-400" />}
          </div>
          <p className="text-xs text-slate-400 mt-0.5 capitalize">{proposal.source_type} · {proposal.source_name}</p>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <Badge variant="outline" className={`text-xs ${priorityBadge[proposal.priority] || priorityBadge.medium}`}>{proposal.priority}</Badge>
          <Badge variant="outline" className={`text-xs ${statusBadge[proposal.status] || statusBadge.pending}`}>{proposal.status}</Badge>
        </div>
      </div>

      {proposal.proposed_improvement && (
        <p className="text-xs text-slate-300 mb-3 line-clamp-2">{proposal.proposed_improvement}</p>
      )}

      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-slate-400">Overall Score</span>
          <span className={scoreColor}>{proposal.overall_score}/100</span>
        </div>
        <Progress value={proposal.overall_score} className="h-1.5" />
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs mb-3">
        {[
          { label: 'Biz', val: proposal.business_value_score },
          { label: 'Eng', val: proposal.engineering_value_score },
          { label: 'Cust', val: proposal.customer_value_score },
          { label: 'Legal', val: proposal.legal_value_score },
          { label: 'Rev', val: proposal.revenue_impact_score },
          { label: 'Effort', val: proposal.implementation_effort_score },
          { label: 'Risk', val: proposal.risk_score },
          { label: 'Rev$', val: proposal.estimated_revenue_impact, prefix: '$' },
          { label: 'Time', val: proposal.estimated_time_savings_hours, suffix: 'h' }
        ].map((s, i) => (
          <div key={i} className="p-1.5 rounded bg-slate-900/60 text-center">
            <div className="text-slate-500 text-[10px]">{s.label}</div>
            <div className="text-white font-medium">{s.prefix || ''}{s.val || 0}{s.suffix || ''}</div>
          </div>
        ))}
      </div>

      {proposal.status === 'pending' && (
        <div className="flex gap-2">
          <button
            onClick={() => onApprove(proposal)}
            className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition-colors"
          >
            <CheckCircle2 className="w-3 h-3" />Approve
          </button>
          <button
            onClick={() => onReject(proposal)}
            className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded-md bg-red-600/80 hover:bg-red-700 text-white text-xs font-medium transition-colors"
          >
            <XCircle className="w-3 h-3" />Reject
          </button>
          <button
            onClick={() => onView(proposal)}
            className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
          >
            <Lightbulb className="w-3 h-3" />
          </button>
        </div>
      )}
      {proposal.status !== 'pending' && (
        <button
          onClick={() => onView(proposal)}
          className="w-full flex items-center justify-center gap-1 px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
        >
          <Clock className="w-3 h-3" />View Details
        </button>
      )}
    </Card>
  );
}