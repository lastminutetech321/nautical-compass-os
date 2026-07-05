import React from 'react';
import { CheckCircle2, Circle, AlertCircle } from 'lucide-react';

const stages = [
  { key: 'prospecting', label: 'Prospecting', color: 'text-slate-400' },
  { key: 'onboarding', label: 'Onboarding', color: 'text-blue-400' },
  { key: 'activation', label: 'Activation', color: 'text-cyan-400' },
  { key: 'adoption', label: 'Adoption', color: 'text-emerald-400' },
  { key: 'expansion', label: 'Expansion', color: 'text-violet-400' },
  { key: 'renewal', label: 'Renewal', color: 'text-amber-400' }
];

const riskStages = [
  { key: 'churn_risk', label: 'Churn Risk', color: 'text-orange-400' },
  { key: 'churned', label: 'Churned', color: 'text-red-400' },
  { key: 'won_back', label: 'Won Back', color: 'text-emerald-400' }
];

export default function CustomerJourneyView({ customer }) {
  const currentStage = customer.journey_stage || 'prospecting';
  const allStages = [...stages, ...riskStages];
  const currentIndex = allStages.findIndex(s => s.key === currentStage);
  const isRiskStage = riskStages.some(s => s.key === currentStage);

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
      <h4 className="text-sm font-semibold text-white mb-4">Customer Journey</h4>

      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        {stages.map((stage, i) => {
          const stageIndex = i;
          const isPast = !isRiskStage && currentIndex > stageIndex;
          const isCurrent = currentStage === stage.key;
          const Icon = isCurrent ? AlertCircle : isPast ? CheckCircle2 : Circle;

          return (
            <React.Fragment key={stage.key}>
              <div className="flex flex-col items-center min-w-[80px]">
                <Icon className={`w-5 h-5 ${isCurrent ? stage.color : isPast ? 'text-emerald-400' : 'text-slate-600'}`} />
                <span className={`text-[10px] mt-1 ${isCurrent ? stage.color : isPast ? 'text-slate-300' : 'text-slate-500'}`}>{stage.label}</span>
              </div>
              {i < stages.length - 1 && (
                <div className={`h-0.5 flex-1 min-w-[20px] ${!isRiskStage && currentIndex > stageIndex ? 'bg-emerald-500/50' : 'bg-slate-700'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {isRiskStage && (
        <div className="mt-4 p-3 rounded border border-orange-500/30 bg-orange-950/20">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-orange-400" />
            <span className="text-sm font-medium text-orange-300">
              Customer is in {currentStage.replace('_', ' ')} stage
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Immediate intervention required to prevent churn.</p>
        </div>
      )}

      {customer.journey_milestones?.length > 0 && (
        <div className="mt-4 space-y-1">
          <h5 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Milestones</h5>
          {customer.journey_milestones.map((m, i) => (
            <div key={i} className="text-xs flex items-center gap-2 text-slate-300">
              {m.completed ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Circle className="w-3 h-3 text-slate-600" />}
              <span>{m.name || m.title || 'Milestone'}</span>
              {m.date && <span className="text-slate-500 ml-auto">{m.date}</span>}
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <div className="p-2 rounded bg-slate-900/60">
          <div className="text-slate-500">Onboarding</div>
          <div className="text-white capitalize">{customer.onboarding_status?.replace('_', ' ')} ({customer.onboarding_progress_pct}%)</div>
        </div>
        <div className="p-2 rounded bg-slate-900/60">
          <div className="text-slate-500">Feature Adoption</div>
          <div className="text-white">{customer.feature_adoption_pct}%</div>
        </div>
        <div className="p-2 rounded bg-slate-900/60">
          <div className="text-slate-500">Usage</div>
          <div className="text-white capitalize">{customer.usage_frequency} · {customer.usage_trend?.replace('_', ' ')}</div>
        </div>
        <div className="p-2 rounded bg-slate-900/60">
          <div className="text-slate-500">Last Active</div>
          <div className="text-white">{customer.last_active_date ? new Date(customer.last_active_date).toLocaleDateString() : 'Unknown'}</div>
        </div>
      </div>
    </div>
  );
}