import React from 'react';
import { Card } from '@/components/ui/card';
import { Dna, Clock, CheckCircle2, XCircle, AlertTriangle, DollarSign, TrendingUp } from 'lucide-react';

export default function EvolutionMetricsBar({ metrics }) {
  const items = [
    { label: 'Total Proposals', value: metrics.total_proposals || 0, icon: Dna, color: 'text-blue-400' },
    { label: 'Pending Approval', value: metrics.pending_count || 0, icon: Clock, color: (metrics.pending_count || 0) > 0 ? 'text-amber-400' : 'text-slate-400' },
    { label: 'Approved', value: metrics.approved_count || 0, icon: CheckCircle2, color: 'text-emerald-400' },
    { label: 'Rejected', value: metrics.rejected_count || 0, icon: XCircle, color: 'text-red-400' },
    { label: 'Implemented', value: metrics.implemented_count || 0, icon: TrendingUp, color: 'text-emerald-400' },
    { label: 'High Priority', value: metrics.high_priority_count || 0, icon: AlertTriangle, color: (metrics.high_priority_count || 0) > 0 ? 'text-orange-400' : 'text-slate-400' },
    { label: 'Avg Score', value: `${metrics.avg_overall_score || 0}/100`, icon: Dna, color: (metrics.avg_overall_score || 0) >= 65 ? 'text-emerald-400' : 'text-amber-400' },
    { label: 'Revenue Impact', value: `$${(metrics.total_revenue_impact || 0).toLocaleString()}`, icon: DollarSign, color: 'text-emerald-400' }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3 mb-6">
      {items.map((item, i) => {
        const Icon = item.icon;
        return (
          <Card key={i} className="p-4 bg-slate-900/50 border-slate-800">
            <Icon className={`w-4 h-4 ${item.color} mb-1`} />
            <div className={`text-xl font-bold ${item.color}`}>{item.value}</div>
            <div className="text-xs text-slate-400 mt-0.5">{item.label}</div>
          </Card>
        );
      })}
    </div>
  );
}