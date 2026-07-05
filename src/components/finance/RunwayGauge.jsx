import React from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Target, TrendingUp } from 'lucide-react';

export default function RunwayGauge({ snapshot }) {
  const runway = snapshot.runway_days || 0;
  const displayRunway = runway === 9999 ? '∞' : `${runway}d`;
  const runwayPct = runway === 9999 ? 100 : Math.min(100, (runway / 365) * 100);
  const color = runway >= 180 ? 'text-emerald-400' : runway >= 60 ? 'text-amber-400' : 'text-red-400';
  const barColor = runway >= 180 ? 'bg-emerald-500' : runway >= 60 ? 'bg-amber-500' : 'bg-red-500';

  const breakEvenPct = snapshot.break_even_mrr > 0 ? Math.min(100, ((snapshot.mrr || 0) / snapshot.break_even_mrr) * 100) : 0;
  const breakEvenColor = breakEvenPct >= 100 ? 'text-emerald-400' : breakEvenPct >= 70 ? 'text-amber-400' : 'text-red-400';

  return (
    <Card className="p-4 bg-slate-900/50 border-slate-800">
      <div className="flex items-center gap-2 mb-4">
        <Target className="w-4 h-4 text-blue-400" />
        <h3 className="text-sm font-semibold text-white">Runway & Break-Even</h3>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-400">Cash Runway</span>
            <span className={color}>{displayRunway}</span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-700 overflow-hidden">
            <div className={`h-full ${barColor} transition-all`} style={{ width: `${runwayPct}%` }} />
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Cash: ${((snapshot.cash_balance || 0)).toLocaleString()} · Burn: ${((snapshot.monthly_burn || 0)).toLocaleString()}/mo
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-400">Break-Even Progress</span>
            <span className={breakEvenColor}>{Math.round(breakEvenPct)}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-700 overflow-hidden">
            <div className={`h-full ${breakEvenPct >= 100 ? 'bg-emerald-500' : 'bg-blue-500'} transition-all`} style={{ width: `${breakEvenPct}%` }} />
          </div>
          <div className="text-xs text-slate-500 mt-1">
            MRR: ${((snapshot.mrr || 0)).toLocaleString()} / Break-even: ${((snapshot.break_even_mrr || 0)).toLocaleString()}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2">
          <div className="p-2 rounded bg-slate-900/60">
            <div className="text-xs text-slate-500">Active Subs</div>
            <div className="text-sm font-medium text-white">{snapshot.active_subscriptions || 0}</div>
          </div>
          <div className="p-2 rounded bg-slate-900/60">
            <div className="text-xs text-slate-500">New (30d)</div>
            <div className="text-sm font-medium text-emerald-400">+{snapshot.new_subscriptions || 0}</div>
          </div>
        </div>
      </div>
    </Card>
  );
}