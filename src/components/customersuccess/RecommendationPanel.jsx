import React from 'react';
import { Mail, BookOpen, TrendingUp, Bot, CheckCircle2 } from 'lucide-react';

const sectionConfig = {
  outreach: { icon: Mail, title: 'Recommended Outreach', color: 'text-blue-400', bgColor: 'bg-blue-950/20' },
  education: { icon: BookOpen, title: 'Recommended Education', color: 'text-emerald-400', bgColor: 'bg-emerald-950/20' },
  upgrades: { icon: TrendingUp, title: 'Recommended Upgrades', color: 'text-amber-400', bgColor: 'bg-amber-950/20' },
  ai_assistance: { icon: Bot, title: 'Recommended AI Assistance', color: 'text-violet-400', bgColor: 'bg-violet-950/20' }
};

function RecommendationSection({ type, items }) {
  const config = sectionConfig[type];
  const Icon = config.icon;
  if (!items || items.length === 0) return null;

  return (
    <div className={`rounded-lg border border-slate-800 ${config.bgColor} p-4`}>
      <div className="flex items-center gap-2 mb-3">
        <Icon className={`w-4 h-4 ${config.color}`} />
        <h4 className={`text-sm font-semibold ${config.color}`}>{config.title}</h4>
        <span className="text-xs text-slate-500">({items.length})</span>
      </div>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="text-xs bg-slate-900/40 rounded p-3 border border-slate-800/50">
            {type === 'outreach' && (
              <>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-white">{item.action}</span>
                  <div className="flex gap-1">
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">{item.channel}</span>
                    <span className={`px-1.5 py-0.5 rounded ${item.priority === 'high' ? 'bg-red-500/20 text-red-300' : item.priority === 'medium' ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-700 text-slate-300'}`}>{item.priority}</span>
                  </div>
                </div>
                <p className="text-slate-300">{item.message}</p>
              </>
            )}
            {type === 'education' && (
              <>
                <div className="font-medium text-white mb-0.5">{item.topic}</div>
                <div className="text-slate-400">{item.resource}</div>
                <div className="text-slate-500 mt-1">Why: {item.reason}</div>
              </>
            )}
            {type === 'upgrades' && (
              <>
                <div className="font-medium text-white mb-0.5">{item.plan}</div>
                <div className="text-slate-400">{item.reason}</div>
                <div className="text-emerald-400 mt-1">Value: {item.expected_value}</div>
              </>
            )}
            {type === 'ai_assistance' && (
              <>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-medium text-white">{item.agent}</span>
                </div>
                <div className="text-slate-300">{item.task}</div>
                <div className="text-slate-500 mt-1">Why: {item.reason}</div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RecommendationPanel({ customer }) {
  if (!customer) return null;

  const hasAnyRecs = (customer.recommended_outreach?.length || 0) + (customer.recommended_education?.length || 0) + (customer.recommended_upgrades?.length || 0) + (customer.recommended_ai_assistance?.length || 0) > 0;

  if (!hasAnyRecs) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-6 text-center">
        <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
        <p className="text-sm text-slate-400">No recommendations generated yet. Run an evaluation to generate AI-powered outreach, education, upgrade, and AI assistance recommendations.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <RecommendationSection type="outreach" items={customer.recommended_outreach} />
      <RecommendationSection type="education" items={customer.recommended_education} />
      <RecommendationSection type="upgrades" items={customer.recommended_upgrades} />
      <RecommendationSection type="ai_assistance" items={customer.recommended_ai_assistance} />
    </div>
  );
}