import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, DollarSign, Target, Sparkles } from 'lucide-react';

export function ForecastPanel({ forecast }) {
  if (!forecast) return null;
  const { scenarios } = forecast;

  return (
    <div className="space-y-4">
      <Card className="p-4 bg-violet-950/20 border-violet-500/30">
        <div className="flex items-center gap-2 mb-2">
          <Target className="w-4 h-4 text-violet-400" />
          <h3 className="text-sm font-semibold text-white">Quarterly Forecast</h3>
        </div>
        <p className="text-sm text-slate-300">{forecast.forecast_summary}</p>
      </Card>

      {scenarios && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {['optimistic', 'base', 'pessimistic'].map(key => {
            const s = scenarios[key];
            if (!s) return null;
            const colors = { optimistic: 'emerald', base: 'blue', pessimistic: 'red' };
            const c = colors[key];
            return (
              <Card key={key} className={`p-4 bg-${c}-950/20 border-${c}-500/30`}>
                <div className="flex items-center justify-between mb-3">
                  <h4 className={`text-sm font-semibold text-${c}-300 capitalize`}>{key} Scenario</h4>
                  {key === 'optimistic' && <TrendingUp className="w-4 h-4 text-emerald-400" />}
                  {key === 'pessimistic' && <TrendingDown className="w-4 h-4 text-red-400" />}
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between"><span className="text-slate-400">Projected MRR</span><span className="text-white font-medium">${(s.projected_mrr || 0).toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Projected ARR</span><span className="text-white font-medium">${(s.projected_arr || 0).toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Expenses</span><span className="text-white font-medium">${(s.projected_expenses || 0).toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Profit</span><span className={s.projected_profit > 0 ? 'text-emerald-400 font-medium' : 'text-red-400 font-medium'}>${(s.projected_profit || 0).toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Runway</span><span className="text-blue-400 font-medium">{s.projected_runway_days || 0}d</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Break-even</span><span className="text-amber-400 font-medium">{s.break_even_month || 'N/A'}</span></div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {forecast.assumptions?.length > 0 && (
        <Card className="p-4 bg-slate-900/50 border-slate-800">
          <h4 className="text-xs font-semibold text-slate-400 mb-2">Assumptions</h4>
          <ul className="text-xs text-slate-300 space-y-1">{forecast.assumptions.map((a, i) => <li key={i}>• {a}</li>)}</ul>
        </Card>
      )}

      {forecast.recommended_actions?.length > 0 && (
        <Card className="p-4 bg-blue-950/20 border-blue-500/30">
          <h4 className="text-xs font-semibold text-blue-300 mb-2">Recommended Actions</h4>
          <ul className="text-xs text-slate-300 space-y-1">{forecast.recommended_actions.map((a, i) => <li key={i}>• {a}</li>)}</ul>
        </Card>
      )}
    </div>
  );
}

export function RecommendationsPanel({ recommendations }) {
  if (!recommendations) return null;

  const priorityBadge = { high: 'bg-red-500/20 text-red-300', medium: 'bg-amber-500/20 text-amber-300', low: 'bg-slate-700 text-slate-300' };

  return (
    <div className="space-y-4">
      {recommendations.summary && (
        <Card className="p-4 bg-violet-950/20 border-violet-500/30">
          <div className="flex items-center gap-2 mb-2"><Sparkles className="w-4 h-4 text-violet-400" /><h3 className="text-sm font-semibold text-white">AI Financial Recommendations</h3></div>
          <p className="text-sm text-slate-300">{recommendations.summary}</p>
        </Card>
      )}

      <Card className="p-4 bg-slate-900/50 border-slate-800">
        <h4 className="text-sm font-semibold text-amber-300 mb-3 flex items-center gap-2"><DollarSign className="w-4 h-4" />Pricing Recommendations</h4>
        <div className="space-y-2">
          {recommendations.pricing_recommendations?.map((r, i) => (
            <div key={i} className="p-3 rounded bg-slate-900/60 border border-slate-800/50">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-white">{r.action}: {r.plan}</span>
                <Badge variant="outline" className={`text-xs ${priorityBadge[r.priority] || priorityBadge.low}`}>{r.priority}</Badge>
              </div>
              <div className="text-xs text-slate-400">${r.current_price} → ${r.recommended_price}/mo</div>
              <p className="text-xs text-slate-300 mt-1">{r.rationale}</p>
              <p className="text-xs text-emerald-400 mt-1">Impact: {r.expected_impact}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4 bg-slate-900/50 border-slate-800">
        <h4 className="text-sm font-semibold text-emerald-300 mb-3 flex items-center gap-2"><TrendingDown className="w-4 h-4" />Cost Reductions</h4>
        <div className="space-y-2">
          {recommendations.cost_reductions?.map((r, i) => (
            <div key={i} className="p-3 rounded bg-slate-900/60 border border-slate-800/50">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-white">{r.category}: {r.action}</span>
                <Badge variant="outline" className={`text-xs ${priorityBadge[r.priority] || priorityBadge.low}`}>{r.priority}</Badge>
              </div>
              <div className="text-xs text-emerald-400">Save ~${r.estimated_savings}/mo · Effort: {r.effort}</div>
              <p className="text-xs text-slate-300 mt-1">{r.rationale}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4 bg-slate-900/50 border-slate-800">
        <h4 className="text-sm font-semibold text-blue-300 mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4" />Investments</h4>
        <div className="space-y-2">
          {recommendations.investments?.map((r, i) => (
            <div key={i} className="p-3 rounded bg-slate-900/60 border border-slate-800/50">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-white">{r.area}: {r.action}</span>
                <Badge variant="outline" className={`text-xs ${priorityBadge[r.priority] || priorityBadge.low}`}>{r.priority}</Badge>
              </div>
              <div className="text-xs text-blue-400">Cost: ${r.estimated_cost} · ROI: {r.expected_roi}</div>
              <p className="text-xs text-slate-300 mt-1">{r.rationale}</p>
            </div>
          ))}
        </div>
      </Card>

      {recommendations.founder_alerts?.length > 0 && (
        <Card className="p-4 bg-red-950/30 border-red-500/50">
          <h4 className="text-sm font-semibold text-red-300 mb-2">Founder Alerts</h4>
          <ul className="text-sm text-slate-200 space-y-1">{recommendations.founder_alerts.map((a, i) => <li key={i}>• {a}</li>)}</ul>
        </Card>
      )}
    </div>
  );
}