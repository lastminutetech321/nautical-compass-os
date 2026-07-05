import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, BookOpen, Bot, Zap, Ban, FileText, Scale } from 'lucide-react';
import ScoreRadar from './ScoreRadar';

const questions = [
  { key: 'what_was_learned', icon: BookOpen, label: 'What Was Learned', color: 'text-blue-400' },
  { key: 'what_can_be_automated', icon: Zap, label: 'What Can Be Automated', color: 'text-violet-400' },
  { key: 'what_should_never_happen_again', icon: Ban, label: 'What Should Never Happen Again', color: 'text-red-400' },
  { key: 'what_documentation_should_be_updated', icon: FileText, label: 'Documentation To Update', color: 'text-amber-400' },
  { key: 'what_new_canon_knowledge_exists', icon: Scale, label: 'New Canon Knowledge', color: 'text-cyan-400' },
  { key: 'which_ai_employee_became_smarter', icon: Bot, label: 'Which AI Employee Got Smarter', color: 'text-emerald-400' },
  { key: 'which_workflow_became_faster', icon: Zap, label: 'Which Workflow Got Faster', color: 'text-orange-400' }
];

export default function ProposalDetail({ proposal, open, onClose, onApprove, onReject }) {
  if (!proposal) return null;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto bg-slate-950 border-slate-800">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-lg">{proposal.title}</SheetTitle>
          <div className="flex gap-2">
            <Badge variant="outline" className="text-xs capitalize">{proposal.source_type} · {proposal.source_name}</Badge>
            <Badge variant="outline" className="text-xs bg-violet-500/20 text-violet-300">{proposal.priority}</Badge>
            <Badge variant="outline" className="text-xs">{proposal.status}</Badge>
          </div>
        </SheetHeader>

        {/* Scores */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
            <h4 className="text-xs font-semibold text-slate-400 mb-2">Score Radar</h4>
            <ScoreRadar proposal={proposal} />
          </div>
          <div className="space-y-2">
            {[
              { label: 'Business Value', val: proposal.business_value_score },
              { label: 'Engineering Value', val: proposal.engineering_value_score },
              { label: 'Customer Value', val: proposal.customer_value_score },
              { label: 'Legal Value', val: proposal.legal_value_score },
              { label: 'Revenue Impact', val: proposal.revenue_impact_score },
              { label: 'Implementation Effort', val: proposal.implementation_effort_score },
              { label: 'Risk', val: proposal.risk_score },
              { label: 'Overall Score', val: proposal.overall_score, bold: true }
            ].map(s => (
              <div key={s.label}>
                <div className="flex justify-between text-xs mb-0.5">
                  <span className={s.bold ? 'text-white font-semibold' : 'text-slate-400'}>{s.label}</span>
                  <span className={s.bold ? 'text-violet-400 font-bold' : 'text-slate-300'}>{s.val}/100</span>
                </div>
                <div className={`h-1.5 rounded-full bg-slate-700 overflow-hidden`}>
                  <div className={`h-full ${s.val >= 70 ? 'bg-emerald-500' : s.val >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${s.val}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Proposed Action */}
        {proposal.proposed_improvement && (
          <div className="p-3 rounded-lg bg-violet-950/20 border border-violet-500/30 mb-4">
            <h4 className="text-xs font-semibold text-violet-300 mb-1">Proposed Improvement</h4>
            <p className="text-sm text-slate-300">{proposal.proposed_improvement}</p>
            {proposal.proposed_action && <p className="text-xs text-slate-400 mt-2">Action: {proposal.proposed_action}</p>}
          </div>
        )}

        {/* 7 Questions */}
        <div className="space-y-3 mb-4">
          {questions.map(q => {
            const Icon = q.icon;
            return (
              <div key={q.key} className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                <h4 className={`text-xs font-semibold ${q.color} mb-1 flex items-center gap-1.5`}>
                  <Icon className="w-3.5 h-3.5" />{q.label}
                </h4>
                <p className="text-sm text-slate-300">{proposal[q.key] || 'Not analyzed.'}</p>
              </div>
            );
          })}
        </div>

        {/* Impact Details */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="p-3 rounded bg-slate-900/60">
            <div className="text-xs text-slate-500">Est. Revenue Impact</div>
            <div className="text-sm font-medium text-emerald-400">${(proposal.estimated_revenue_impact || 0).toLocaleString()}</div>
          </div>
          <div className="p-3 rounded bg-slate-900/60">
            <div className="text-xs text-slate-500">Est. Time Saved</div>
            <div className="text-sm font-medium text-blue-400">{proposal.estimated_time_savings_hours || 0}h</div>
          </div>
        </div>

        {(proposal.affected_modules?.length > 0 || proposal.affected_agents?.length > 0) && (
          <div className="p-3 rounded bg-slate-900/60 mb-4">
            {proposal.affected_modules?.length > 0 && (
              <div className="mb-2">
                <span className="text-xs text-slate-500">Affected Modules: </span>
                {proposal.affected_modules.map((m, i) => <span key={i} className="text-xs text-slate-300">{m}{i < proposal.affected_modules.length - 1 ? ', ' : ''}</span>)}
              </div>
            )}
            {proposal.affected_agents?.length > 0 && (
              <div>
                <span className="text-xs text-slate-500">Affected Agents: </span>
                {proposal.affected_agents.map((a, i) => <span key={i} className="text-xs text-slate-300">{a}{i < proposal.affected_agents.length - 1 ? ', ' : ''}</span>)}
              </div>
            )}
          </div>
        )}

        {proposal.roadmap_item_created && (
          <div className="p-3 rounded bg-emerald-950/20 border border-emerald-500/30 mb-4">
            <p className="text-xs text-emerald-300">✓ Roadmap item automatically created from this proposal.</p>
          </div>
        )}

        {/* Actions */}
        {proposal.status === 'pending' && (
          <div className="flex gap-2">
            <Button onClick={() => onApprove(proposal)} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
              <CheckCircle2 className="w-4 h-4 mr-2" />Approve & Create Roadmap Item
            </Button>
            <Button onClick={() => onReject(proposal)} variant="destructive" className="flex-1">
              <XCircle className="w-4 h-4 mr-2" />Reject
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}