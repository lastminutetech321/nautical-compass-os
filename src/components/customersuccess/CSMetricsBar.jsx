import React from 'react';
import { Card } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Users, AlertTriangle, DollarSign, Activity, BookOpen, RefreshCw } from 'lucide-react';

const iconMap = {
  total: Users,
  at_risk: AlertTriangle,
  health: Activity,
  mrr: DollarSign,
  adoption: BookOpen,
  renewals: RefreshCw
};

const colorMap = {
  good: 'text-emerald-400',
  warning: 'text-amber-400',
  critical: 'text-red-400',
  neutral: 'text-blue-400'
};

export default function CSMetricsBar({ metrics, onEvaluate, evaluating }) {
  const items = [
    { key: 'total', label: 'Total Customers', value: metrics.total_customers || 0, icon: 'total', color: 'neutral' },
    { key: 'at_risk', label: 'At-Risk', value: metrics.at_risk_count || 0, icon: 'at_risk', color: metrics.at_risk_count > 0 ? 'critical' : 'good' },
    { key: 'critical', label: 'Critical Churn', value: metrics.critical_count || 0, icon: 'at_risk', color: metrics.critical_count > 0 ? 'critical' : 'good' },
    { key: 'alerts', label: 'Founder Alerts', value: metrics.founder_alerts || 0, icon: 'at_risk', color: metrics.founder_alerts > 0 ? 'critical' : 'good' },
    { key: 'health', label: 'Avg Health', value: `${metrics.avg_health_score || 0}/100`, icon: 'health', color: (metrics.avg_health_score || 0) >= 65 ? 'good' : (metrics.avg_health_score || 0) >= 45 ? 'warning' : 'critical' },
    { key: 'mrr', label: 'Total MRR', value: `$${(metrics.total_mrr || 0).toLocaleString()}`, icon: 'mrr', color: 'good' },
    { key: 'renewals', label: 'Renewals 30d', value: metrics.upcoming_renewals_30d || 0, icon: 'renewals', color: metrics.upcoming_renewals_30d > 0 ? 'warning' : 'neutral' },
    { key: 'onboarding', label: 'Onboarding Avg', value: `${metrics.avg_onboarding_progress || 0}%`, icon: 'adoption', color: 'neutral' }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3 mb-6">
      {items.map(item => {
        const Icon = iconMap[item.icon];
        const color = colorMap[item.color];
        return (
          <Card key={item.key} className="p-4 bg-slate-900/50 border-slate-800">
            <div className="flex items-center justify-between mb-1">
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <div className={`text-2xl font-bold ${color}`}>{item.value}</div>
            <div className="text-xs text-slate-400 mt-0.5">{item.label}</div>
          </Card>
        );
      })}
    </div>
  );
}