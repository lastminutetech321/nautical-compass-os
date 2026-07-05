import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Sparkles, MessageSquare, Activity, TrendingUp, AlertTriangle } from 'lucide-react';
import CustomerJourneyView from './CustomerJourneyView';
import RecommendationPanel from './RecommendationPanel';

export default function CustomerDetailDrawer({ customer, open, onClose, onGenerateOutreach, generatingOutreach, outreachResult }) {
  const [activeTab, setActiveTab] = useState('overview');
  if (!customer) return null;

  const healthColor = customer.health_score >= 65 ? 'text-emerald-400' : customer.health_score >= 45 ? 'text-amber-400' : 'text-red-400';

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto bg-slate-950 border-slate-800">
        <SheetHeader className="mb-4">
          <div className="flex items-center gap-2">
            <SheetTitle className="text-lg">{customer.customer_name}</SheetTitle>
            {customer.founder_alert_required && (
              <Badge variant="outline" className="bg-red-500/20 text-red-300 border-red-500/30">
                <AlertTriangle className="w-3 h-3 mr-1" />Founder Alert
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-400 capitalize">{customer.customer_type} · {customer.journey_stage?.replace('_', ' ')}</p>
        </SheetHeader>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
            <div className="text-xs text-slate-400 mb-1">Health Score</div>
            <div className={`text-2xl font-bold ${healthColor}`}>{customer.health_score}</div>
            <Progress value={customer.health_score} className="h-1.5 mt-2" />
          </div>
          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
            <div className="text-xs text-slate-400 mb-1">Churn Risk</div>
            <div className={`text-2xl font-bold ${customer.churn_risk_level === 'critical' ? 'text-red-400' : customer.churn_risk_level === 'high' ? 'text-orange-400' : 'text-emerald-400'}`}>{customer.churn_risk_score}</div>
            <Progress value={customer.churn_risk_score} className="h-1.5 mt-2 bg-slate-700" />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 bg-slate-900">
            <TabsTrigger value="overview" className="text-xs"><Activity className="w-3 h-3 mr-1" />Overview</TabsTrigger>
            <TabsTrigger value="journey" className="text-xs"><TrendingUp className="w-3 h-3 mr-1" />Journey</TabsTrigger>
            <TabsTrigger value="recommendations" className="text-xs"><Sparkles className="w-3 h-3 mr-1" />AI Recs</TabsTrigger>
            <TabsTrigger value="outreach" className="text-xs"><MessageSquare className="w-3 h-3 mr-1" />Outreach</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Onboarding', value: `${customer.onboarding_progress_pct}%`, status: customer.onboarding_status },
                { label: 'Feature Adoption', value: `${customer.feature_adoption_pct}%` },
                { label: 'Usage', value: `${customer.usage_frequency} (${customer.usage_trend?.replace('_', ' ')})` },
                { label: 'NPS', value: customer.nps_score },
                { label: 'Support Tickets', value: `${customer.support_tickets_open} open / ${customer.support_tickets_total} total` },
                { label: 'CSAT', value: `${customer.support_satisfaction_score}/100` },
                { label: 'MRR', value: `$${customer.mrr || 0}` },
                { label: 'Renewal', value: customer.renewal_date ? `${customer.days_to_renewal}d` : 'N/A' }
              ].map(item => (
                <div key={item.label} className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                  <div className="text-xs text-slate-400">{item.label}</div>
                  <div className="text-sm font-medium text-white mt-0.5">{item.value}</div>
                  {item.status && <div className="text-xs text-slate-500 capitalize mt-0.5">{item.status.replace('_', ' ')}</div>}
                </div>
              ))}
            </div>

            {customer.churn_risk_factors?.length > 0 && (
              <div className="p-3 rounded-lg bg-red-950/20 border border-red-500/30">
                <h4 className="text-xs font-semibold text-red-300 mb-2">Churn Risk Factors</h4>
                <div className="flex flex-wrap gap-1">
                  {customer.churn_risk_factors.map((f, i) => (
                    <span key={i} className="text-xs px-2 py-1 rounded bg-red-900/30 text-red-300">{f}</span>
                  ))}
                </div>
              </div>
            )}

            {customer.notes && (
              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                <h4 className="text-xs font-semibold text-slate-400 mb-1">Notes</h4>
                <p className="text-xs text-slate-300">{customer.notes}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="journey" className="mt-4">
            <CustomerJourneyView customer={customer} />
          </TabsContent>

          <TabsContent value="recommendations" className="mt-4">
            <RecommendationPanel customer={customer} />
          </TabsContent>

          <TabsContent value="outreach" className="mt-4 space-y-3">
            <Button
              onClick={() => onGenerateOutreach(customer.id)}
              disabled={generatingOutreach}
              className="w-full"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {generatingOutreach ? 'Generating...' : 'Generate AI Outreach'}
            </Button>
            {outreachResult && (
              <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-white">{outreachResult.subject}</h4>
                  <Badge variant="outline" className="text-xs">{outreachResult.channel}</Badge>
                </div>
                <p className="text-xs text-slate-400">Goal: {outreachResult.goal}</p>
                <div className="text-sm text-slate-300 whitespace-pre-wrap p-3 rounded bg-slate-950/60 border border-slate-800">
                  {outreachResult.message}
                </div>
                {outreachResult.talking_points?.length > 0 && (
                  <div>
                    <h5 className="text-xs font-semibold text-slate-400 mb-1">Talking Points</h5>
                    <ul className="text-xs text-slate-300 space-y-1">
                      {outreachResult.talking_points.map((p, i) => <li key={i}>• {p}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}