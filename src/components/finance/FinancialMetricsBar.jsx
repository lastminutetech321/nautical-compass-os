import React from 'react';
import { Card } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, Wallet, Activity, BarChart3, Target, Zap } from 'lucide-react';

const colorMap = {
  good: 'text-emerald-400',
  warning: 'text-amber-400',
  critical: 'text-red-400',
  neutral: 'text-blue-400'
};

function getColor(val, thresholds) {
  if (val >= thresholds.good) return 'good';
  if (val >= thresholds.warn) return 'warning';
  return 'critical';
}

export default function FinancialMetricsBar({ snapshot, health }) {
  const items = [
    { label: 'MRR', value: `$${(snapshot.mrr || 0).toLocaleString()}`, icon: DollarSign, color: 'good' },
    { label: 'ARR', value: `$${(snapshot.arr || 0).toLocaleString()}`, icon: TrendingUp, color: 'good' },
    { label: 'Monthly Expenses', value: `$${(snapshot.total_expenses || 0).toLocaleString()}`, icon: TrendingDown, color: 'critical' },
    { label: 'Profit/Month', value: `$${(snapshot.profit || 0).toLocaleString()}`, icon: Wallet, color: (snapshot.profit || 0) > 0 ? 'good' : 'critical' },
    { label: 'Gross Margin', value: `${snapshot.gross_margin_pct || 0}%`, icon: BarChart3, color: getColor(snapshot.gross_margin_pct || 0, { good: 70, warn: 40 }) },
    { label: 'Op. Margin', value: `${snapshot.operating_margin_pct || 0}%`, icon: Activity, color: getColor(snapshot.operating_margin_pct || 0, { good: 10, warn: 0 }) },
    { label: 'Runway', value: `${(snapshot.runway_days || 0) === 9999 ? '∞' : (snapshot.runway_days || 0) + 'd'}`, icon: Target, color: getColor(snapshot.runway_days || 0, { good: 180, warn: 60 }) },
    { label: 'Fin. Health', value: `${health?.score || 0}/100`, icon: Zap, color: getColor(health?.score || 0, { good: 65, warn: 45 }) }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3 mb-6">
      {items.map((item, i) => {
        const Icon = item.icon;
        const color = colorMap[item.color];
        return (
          <Card key={i} className="p-4 bg-slate-900/50 border-slate-800">
            <Icon className={`w-4 h-4 ${color} mb-1`} />
            <div className={`text-xl font-bold ${color}`}>{item.value}</div>
            <div className="text-xs text-slate-400 mt-0.5">{item.label}</div>
          </Card>
        );
      })}
    </div>
  );
}