import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Bell, ArrowRight } from 'lucide-react';

const severityColors = {
  critical: 'border-red-500/50 bg-red-950/20',
  urgent: 'border-orange-500/50 bg-orange-950/20',
  warning: 'border-amber-500/50 bg-amber-950/20',
  info: 'border-blue-500/50 bg-blue-950/20'
};

const severityBadge = {
  critical: 'bg-red-500/20 text-red-300 border-red-500/30',
  urgent: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  warning: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  info: 'bg-blue-500/20 text-blue-300 border-blue-500/30'
};

export default function ChurnAlertPanel({ customers, onCustomerClick }) {
  if (!customers || customers.length === 0) {
    return (
      <Card className="p-8 bg-slate-900/50 border-slate-800 text-center">
        <Bell className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
        <p className="text-sm text-slate-400">No churn alerts. All customers are healthy.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-5 h-5 text-red-400" />
        <h2 className="text-lg font-semibold text-white">Churn Risk Alerts</h2>
        <Badge variant="outline" className="bg-red-500/20 text-red-300 border-red-500/30">{customers.length} at risk</Badge>
      </div>

      {customers.map(customer => (
        <Card
          key={customer.id}
          className={`p-4 cursor-pointer transition-all hover:border-primary/50 ${severityColors[customer.alert_severity] || severityColors.info}`}
          onClick={() => onCustomerClick(customer)}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-sm text-white">{customer.customer_name}</h3>
                <Badge variant="outline" className={`text-xs ${severityBadge[customer.alert_severity] || severityBadge.info}`}>
                  {customer.alert_severity}
                </Badge>
              </div>
              {customer.alert_reason && (
                <p className="text-xs text-slate-300 mb-2">{customer.alert_reason}</p>
              )}
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span>Health: <span className={customer.health_score < 45 ? 'text-red-400' : 'text-amber-400'}>{customer.health_score}/100</span></span>
                <span>Churn: <span className="text-red-400">{customer.churn_risk_score}/100</span></span>
                {customer.mrr > 0 && <span>MRR: <span className="text-emerald-400">${customer.mrr}/mo</span></span>}
                {customer.assigned_cs_agent && <span>CSM: {customer.assigned_cs_agent}</span>}
              </div>
              {customer.churn_risk_factors?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {customer.churn_risk_factors.map((f, i) => (
                    <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-400">{f}</span>
                  ))}
                </div>
              )}
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 flex-shrink-0 mt-1" />
          </div>
        </Card>
      ))}
    </div>
  );
}