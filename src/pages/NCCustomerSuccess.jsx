import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { HeartHandshake, RefreshCw, Sparkles, AlertTriangle, Clock, Activity } from 'lucide-react';
import CSMetricsBar from '@/components/customersuccess/CSMetricsBar';
import CustomerHealthCard from '@/components/customersuccess/CustomerHealthCard';
import ChurnAlertPanel from '@/components/customersuccess/ChurnAlertPanel';
import CustomerTable from '@/components/customersuccess/CustomerTable';
import CustomerDetailDrawer from '@/components/customersuccess/CustomerDetailDrawer';
import InteractionLogger from '@/components/customersuccess/InteractionLogger';
import RecommendationPanel from '@/components/customersuccess/RecommendationPanel';

export default function NCCustomerSuccess() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [logging, setLogging] = useState(false);
  const [generatingOutreach, setGeneratingOutreach] = useState(false);
  const [dashboard, setDashboard] = useState(null);
  const [allCustomers, setAllCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [outreachResult, setOutreachResult] = useState(null);
  const [aiPortfolio, setAiPortfolio] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await base44.functions.invoke('ncCustomerSuccess', { operation: 'dashboard', params: {} });
      setDashboard(res.data);
      const listRes = await base44.functions.invoke('ncCustomerSuccess', { operation: 'list_profiles', params: {} });
      setAllCustomers(listRes.data.profiles || []);
    } catch (err) {
      toast({ title: 'Error loading data', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleEvaluate = async () => {
    try {
      setEvaluating(true);
      const res = await base44.functions.invoke('ncCustomerSuccess', { operation: 'evaluate', params: {} });
      setAiPortfolio(res.data);
      toast({ title: 'Evaluation Complete', description: `${res.data.evaluated_count} customers evaluated. ${res.data.at_risk_count} at risk. ${res.data.founder_alerts_triggered} founder alerts.` });
      await loadData();
    } catch (err) {
      toast({ title: 'Evaluation Failed', description: err.message, variant: 'destructive' });
    } finally {
      setEvaluating(false);
    }
  };

  const handleLogInteraction = async (formData) => {
    try {
      setLogging(true);
      await base44.functions.invoke('ncCustomerSuccess', { operation: 'log_interaction', params: formData });
      toast({ title: 'Interaction Logged', description: `Logged for ${formData.customer_name}` });
      await loadData();
    } catch (err) {
      toast({ title: 'Failed to log', description: err.message, variant: 'destructive' });
    } finally {
      setLogging(false);
    }
  };

  const handleGenerateOutreach = async (profileId) => {
    try {
      setGeneratingOutreach(true);
      setOutreachResult(null);
      const res = await base44.functions.invoke('ncCustomerSuccess', { operation: 'generate_outreach', params: { profile_id: profileId } });
      setOutreachResult(res.data.outreach);
      toast({ title: 'Outreach Generated', description: `AI outreach ready for ${res.data.customer_name}` });
    } catch (err) {
      toast({ title: 'Generation Failed', description: err.message, variant: 'destructive' });
    } finally {
      setGeneratingOutreach(false);
    }
  };

  const openCustomer = async (customer) => {
    setSelectedCustomer(customer);
    setOutreachResult(null);
    setDrawerOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-20">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const metrics = dashboard?.metrics || {};
  const atRiskCustomers = dashboard?.at_risk_customers || [];
  const renewalWatchlist = dashboard?.renewal_watchlist || [];
  const recentInteractions = dashboard?.recent_interactions || [];

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-violet-500/20">
            <HeartHandshake className="w-6 h-6 text-violet-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">NC Customer Success OS</h1>
            <p className="text-xs text-slate-400">Ensure every customer succeeds · Track health, prevent churn, drive adoption</p>
          </div>
        </div>
        <Button onClick={handleEvaluate} disabled={evaluating} className="bg-violet-600 hover:bg-violet-700">
          {evaluating ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Evaluating...</> : <><Sparkles className="w-4 h-4 mr-2" />Run AI Evaluation</>}
        </Button>
      </div>

      {/* Metrics */}
      <CSMetricsBar metrics={metrics} onEvaluate={handleEvaluate} evaluating={evaluating} />

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="bg-slate-900 border border-slate-800 mb-4">
          <TabsTrigger value="overview" className="text-xs"><AlertTriangle className="w-3 h-3 mr-1" />Overview</TabsTrigger>
          <TabsTrigger value="at_risk" className="text-xs"><AlertTriangle className="w-3 h-3 mr-1" />At-Risk</TabsTrigger>
          <TabsTrigger value="customers" className="text-xs">All Customers</TabsTrigger>
          <TabsTrigger value="renewals" className="text-xs"><Clock className="w-3 h-3 mr-1" />Renewals</TabsTrigger>
          <TabsTrigger value="interactions" className="text-xs"><Activity className="w-3 h-3 mr-1" />Interactions</TabsTrigger>
          {aiPortfolio && <TabsTrigger value="ai" className="text-xs"><Sparkles className="w-3 h-3 mr-1" />AI Portfolio</TabsTrigger>}
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <ChurnAlertPanel customers={atRiskCustomers} onCustomerClick={openCustomer} />
            </div>
            <div className="space-y-4">
              <Card className="p-4 bg-slate-900/50 border-slate-800">
                <h3 className="text-sm font-semibold text-white mb-3">Renewal Watchlist (30 days)</h3>
                {renewalWatchlist.length === 0 ? (
                  <p className="text-xs text-slate-400">No renewals in the next 30 days.</p>
                ) : (
                  <div className="space-y-2">
                    {renewalWatchlist.map(r => (
                      <div key={r.id} className="flex items-center justify-between p-2 rounded bg-slate-900/60 cursor-pointer hover:bg-slate-800/40" onClick={() => openCustomer(r)}>
                        <div>
                          <div className="text-xs font-medium text-white">{r.customer_name}</div>
                          <div className="text-xs text-slate-500">{r.renewal_date ? new Date(r.renewal_date).toLocaleDateString() : 'TBD'}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-amber-400">{r.days_to_renewal}d</div>
                          <div className="text-xs text-slate-500">H: {r.health_score}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
              <Card className="p-4 bg-slate-900/50 border-slate-800">
                <h3 className="text-sm font-semibold text-white mb-3">Recent Interactions</h3>
                {recentInteractions.length === 0 ? (
                  <p className="text-xs text-slate-400">No recent interactions logged.</p>
                ) : (
                  <div className="space-y-2">
                    {recentInteractions.map(i => (
                      <div key={i.id} className="p-2 rounded bg-slate-900/60">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-white">{i.customer_name}</span>
                          <Badge variant="outline" className={`text-xs ${i.sentiment === 'positive' ? 'bg-emerald-500/20 text-emerald-300' : i.sentiment === 'negative' ? 'bg-red-500/20 text-red-300' : 'bg-slate-700 text-slate-300'}`}>{i.sentiment}</Badge>
                        </div>
                        <div className="text-xs text-slate-400 capitalize">{i.interaction_type?.replace('_', ' ')} · {i.channel}</div>
                        {i.description && <div className="text-xs text-slate-500 mt-0.5 truncate">{i.description}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* At-Risk Tab */}
        <TabsContent value="at_risk">
          {atRiskCustomers.length === 0 ? (
            <Card className="p-12 bg-slate-900/50 border-slate-800 text-center">
              <HeartHandshake className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
              <p className="text-slate-400">All customers are healthy. No at-risk customers detected.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {atRiskCustomers.map(c => <CustomerHealthCard key={c.id} customer={c} onClick={openCustomer} />)}
            </div>
          )}
        </TabsContent>

        {/* All Customers Tab */}
        <TabsContent value="customers">
          {allCustomers.length === 0 ? (
            <Card className="p-12 bg-slate-900/50 border-slate-800 text-center">
              <p className="text-slate-400">No customer profiles yet. Create profiles or run an evaluation.</p>
            </Card>
          ) : (
            <CustomerTable customers={allCustomers} onCustomerClick={openCustomer} />
          )}
        </TabsContent>

        {/* Renewals Tab */}
        <TabsContent value="renewals">
          <Card className="p-4 bg-slate-900/50 border-slate-800">
            <h3 className="text-sm font-semibold text-white mb-4">Upcoming Renewals</h3>
            {renewalWatchlist.length === 0 ? (
              <p className="text-xs text-slate-400">No renewals in the next 30 days.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {renewalWatchlist.map(r => (
                  <Card key={r.id} className="p-3 bg-slate-900/60 border-slate-800 cursor-pointer hover:border-amber-500/40" onClick={() => openCustomer(r)}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-white">{r.customer_name}</span>
                      <Badge variant="outline" className="text-xs bg-amber-500/20 text-amber-300 border-amber-500/30">{r.days_to_renewal}d</Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Health: <span className={r.health_score < 45 ? 'text-red-400' : 'text-slate-300'}>{r.health_score}</span></span>
                      <span className="text-emerald-400">${r.mrr || 0}/mo</span>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Interactions Tab */}
        <TabsContent value="interactions" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <InteractionLogger customers={allCustomers} onLog={handleLogInteraction} logging={logging} />
          <Card className="p-4 bg-slate-900/50 border-slate-800">
            <h3 className="text-sm font-semibold text-white mb-3">Interaction History</h3>
            {recentInteractions.length === 0 ? (
              <p className="text-xs text-slate-400">No interactions logged yet.</p>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {recentInteractions.map(i => (
                  <div key={i.id} className="p-3 rounded bg-slate-900/60 border border-slate-800/50">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-white">{i.customer_name}</span>
                      <div className="flex gap-1">
                        <Badge variant="outline" className="text-xs capitalize">{i.interaction_type?.replace('_', ' ')}</Badge>
                        <Badge variant="outline" className={`text-xs ${i.sentiment === 'positive' ? 'bg-emerald-500/20 text-emerald-300' : i.sentiment === 'negative' ? 'bg-red-500/20 text-red-300' : 'bg-slate-700 text-slate-300'}`}>{i.sentiment}</Badge>
                      </div>
                    </div>
                    {i.description && <p className="text-xs text-slate-300">{i.description}</p>}
                    {i.outcome && <p className="text-xs text-slate-500 mt-1">Outcome: {i.outcome}</p>}
                    <p className="text-xs text-slate-600 mt-1">{i.interaction_date ? new Date(i.interaction_date).toLocaleString() : ''}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* AI Portfolio Tab */}
        {aiPortfolio && (
          <TabsContent value="ai" className="space-y-4">
            {aiPortfolio.ai_recommendations?.portfolio_summary && (
              <Card className="p-4 bg-violet-950/20 border-violet-500/30">
                <h3 className="text-sm font-semibold text-violet-300 mb-3">AI Portfolio Assessment</h3>
                <p className="text-sm text-slate-300 mb-3">{aiPortfolio.ai_recommendations.portfolio_summary.overall_health}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-xs font-semibold text-red-400 mb-2">Key Risks</h4>
                    <ul className="text-xs text-slate-300 space-y-1">
                      {aiPortfolio.ai_recommendations.portfolio_summary.key_risks?.map((r, i) => <li key={i}>• {r}</li>)}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-emerald-400 mb-2">Recommended Actions</h4>
                    <ul className="text-xs text-slate-300 space-y-1">
                      {aiPortfolio.ai_recommendations.portfolio_summary.recommended_actions?.map((r, i) => <li key={i}>• {r}</li>)}
                    </ul>
                  </div>
                </div>
              </Card>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {aiPortfolio.ai_recommendations?.customer_recommendations?.map((rec, i) => (
                <Card key={i} className="p-4 bg-slate-900/50 border-slate-800">
                  <h4 className="text-sm font-semibold text-white mb-1">{rec.customer_name}</h4>
                  <p className="text-xs text-slate-400 mb-3">{rec.health_summary}</p>
                  {rec.founder_alert && (
                    <div className="p-2 rounded bg-red-950/30 border border-red-500/30 mb-3">
                      <div className="flex items-center gap-1 text-xs text-red-300 font-medium"><AlertTriangle className="w-3 h-3" />Founder Alert Required</div>
                      <p className="text-xs text-slate-400 mt-1">{rec.alert_reason}</p>
                    </div>
                  )}
                  <div className="space-y-1">
                    <RecommendationPanel customer={rec} />
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* Customer Detail Drawer */}
      <CustomerDetailDrawer
        customer={selectedCustomer}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onGenerateOutreach={handleGenerateOutreach}
        generatingOutreach={generatingOutreach}
        outreachResult={outreachResult}
      />
    </div>
  );
}