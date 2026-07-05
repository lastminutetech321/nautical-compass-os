import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, TrendingDown, Clock, DollarSign } from 'lucide-react';

const healthColors = {
  excellent: 'text-emerald-400',
  good: 'text-blue-400',
  fair: 'text-amber-400',
  at_risk: 'text-orange-400',
  critical: 'text-red-400'
};

const churnColors = {
  low: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  medium: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  high: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  critical: 'bg-red-500/20 text-red-300 border-red-500/30'
};

export default function CustomerHealthCard({ customer, onClick }) {
  const healthColor = healthColors[customer.health_status] || 'text-slate-400';
  const hasAlert = customer.founder_alert_required;

  return (
    <Card
      className={`p-4 cursor-pointer transition-all hover:border-primary/50 ${hasAlert ? 'border-red-500/40 bg-red-950/10' : 'bg-slate-900/50 border-slate-800'}`}
      onClick={() => onClick(customer)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm text-white truncate">{customer.customer_name}</h3>
            {hasAlert && <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />}
          </div>
          <p className="text-xs text-slate-400 capitalize">{customer.customer_type} · {customer.journey_stage?.replace('_', ' ')}</p>
        </div>
        <Badge variant="outline" className={`text-xs ${churnColors[customer.churn_risk_level] || churnColors.low}`}>
          {customer.churn_risk_level}
        </Badge>
      </div>

      <div className="space-y-2">
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-400">Health Score</span>
            <span className={healthColor}>{customer.health_score}/100</span>
          </div>
          <Progress value={customer.health_score} className="h-1.5" />
        </div>
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-400">Churn Risk</span>
            <span className={customer.churn_risk_level === 'critical' ? 'text-red-400' : customer.churn_risk_level === 'high' ? 'text-orange-400' : customer.churn_risk_level === 'medium' ? 'text-amber-400' : 'text-emerald-400'}>{customer.churn_risk_score}/100</span>
          </div>
          <Progress value={customer.churn_risk_score} className="h-1.5 bg-slate-700" />
        </div>
      </div>

      <div className="flex items-center gap-3 mt-3 text-xs text-slate-400">
        {customer.mrr > 0 && (
          <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />{customer.mrr}/mo</span>
        )}
        {customer.days_to_renewal > 0 && customer.days_to_renewal <= 30 && (
          <span className="flex items-center gap-1 text-amber-400"><Clock className="w-3 h-3" />{customer.days_to_renewal}d to renewal</span>
        )}
        {customer.usage_trend === 'declining' && (
          <span className="flex items-center gap-1 text-orange-400"><TrendingDown className="w-3 h-3" />Usage↓</span>
        )}
      </div>

      {customer.churn_risk_factors?.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {customer.churn_risk_factors.slice(0, 2).map((f, i) => (
            <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">{f}</span>
          ))}
        </div>
      )}
    </Card>
  );
}