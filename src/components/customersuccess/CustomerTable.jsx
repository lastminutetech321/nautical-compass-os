import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ChevronRight } from 'lucide-react';

const healthColors = {
  excellent: 'text-emerald-400',
  good: 'text-blue-400',
  fair: 'text-amber-400',
  at_risk: 'text-orange-400',
  critical: 'text-red-400'
};

const churnBadge = {
  low: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  medium: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  high: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  critical: 'bg-red-500/20 text-red-300 border-red-500/30'
};

export default function CustomerTable({ customers, onCustomerClick }) {
  return (
    <Card className="bg-slate-900/50 border-slate-800 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-xs text-slate-400">
              <th className="text-left p-3 font-medium">Customer</th>
              <th className="text-left p-3 font-medium">Type</th>
              <th className="text-left p-3 font-medium">Health</th>
              <th className="text-left p-3 font-medium">Churn Risk</th>
              <th className="text-left p-3 font-medium">Journey</th>
              <th className="text-left p-3 font-medium">MRR</th>
              <th className="text-left p-3 font-medium">Renewal</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {customers.map(c => (
              <tr
                key={c.id}
                className="border-b border-slate-800/50 hover:bg-slate-800/30 cursor-pointer transition-colors"
                onClick={() => onCustomerClick(c)}
              >
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">{c.customer_name}</span>
                    {c.founder_alert_required && <span className="w-1.5 h-1.5 rounded-full bg-red-400" />}
                  </div>
                  {c.assigned_cs_agent && <span className="text-xs text-slate-500">{c.assigned_cs_agent}</span>}
                </td>
                <td className="p-3 text-slate-400 capitalize text-xs">{c.customer_type}</td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium ${healthColors[c.health_status] || 'text-slate-400'}`}>{c.health_score}</span>
                    <Progress value={c.health_score} className="h-1 w-16" />
                  </div>
                </td>
                <td className="p-3">
                  <Badge variant="outline" className={`text-xs ${churnBadge[c.churn_risk_level] || churnBadge.low}`}>{c.churn_risk_level}</Badge>
                </td>
                <td className="p-3 text-xs text-slate-400 capitalize">{c.journey_stage?.replace('_', ' ')}</td>
                <td className="p-3 text-xs text-emerald-400">${c.mrr || 0}</td>
                <td className="p-3 text-xs">
                  {c.days_to_renewal > 0 ? (
                    <span className={c.days_to_renewal <= 30 ? 'text-amber-400' : 'text-slate-400'}>{c.days_to_renewal}d</span>
                  ) : <span className="text-slate-600">—</span>}
                </td>
                <td className="p-3"><ChevronRight className="w-4 h-4 text-slate-600" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}