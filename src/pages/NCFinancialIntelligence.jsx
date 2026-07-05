import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { Wallet, RefreshCw, Sparkles, FileText, Target, TrendingUp, Activity, AlertTriangle } from 'lucide-react';
import FinancialMetricsBar from '@/components/finance/FinancialMetricsBar';
import { RevenueExpenseTrend, ExpenseBreakdown } from '@/components/finance/FinancialCharts';
import RunwayGauge from '@/components/finance/RunwayGauge';
import { CFOReport, WeeklyBriefing } from '@/components/finance/CFOReport';
import { ForecastPanel, RecommendationsPanel } from '@/components/finance/FinancialRecommendations';
import TransactionLogger from '@/components/finance/TransactionLogger';

export default function NCFinancialIntelligence() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [snapshotting, setSnapshotting] = useState(false);
  const [generating, setGenerating] = useState({ cfo: false, briefing: false, forecast: false, recommend: false });
  const [logging, setLogging] = useState(false);
  const [data, setData] = useState(null);
  const [cfoReport, setCfoReport] = useState(null);
  const [briefing, setBriefing] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [recommendations, setRecommendations] = useState(null);

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const res = await base44.functions.invoke('ncFinancialIntelligence', { operation: 'dashboard', params: {} });
      setData(res.data);
    } catch (err) {
      toast({ title: 'Error loading financial data', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  const handleSnapshot = async () => {
    try {
      setSnapshotting(true);
      await base44.functions.invoke('ncFinancialIntelligence', { operation: 'snapshot', params: {} });
      toast({ title: 'Snapshot captured', description: 'Financial state recorded.' });
      await loadDashboard();
    } catch (err) {
      toast({ title: 'Snapshot failed', description: err.message, variant: 'destructive' });
    } finally {
      setSnapshotting(false);
    }
  };

  const handleGenerate = async (type) => {
    const ops = {
      cfo: 'generate_cfo_report',
      briefing: 'generate_briefing',
      forecast: 'generate_forecast',
      recommend: 'recommend'
    };
    const setters = { cfo: setCfoReport, briefing: setBriefing, forecast: setForecast, recommend: setRecommendations };
    try {
      setGenerating(prev => ({ ...prev, [type]: true }));
      const res = await base44.functions.invoke('ncFinancialIntelligence', { operation: ops[type], params: {} });
      const key = type === 'cfo' ? 'report' : type === 'briefing' ? 'briefing' : type === 'forecast' ? 'forecast' : 'recommendations';
      setters[type](res.data[key]);
      toast({ title: `${type.toUpperCase()} generated`, description: 'AI financial analysis ready.' });
    } catch (err) {
      toast({ title: 'Generation failed', description: err.message, variant: 'destructive' });
    } finally {
      setGenerating(prev => ({ ...prev, [type]: false }));
    }
  };

  const handleLogTransaction = async (formData) => {
    try {
      setLogging(true);
      await base44.functions.invoke('ncFinancialIntelligence', { operation: 'log_transaction', params: formData });
      toast({ title: 'Transaction logged', description: `$${formData.amount} ${formData.transaction_type}` });
      await loadDashboard();
    } catch (err) {
      toast({ title: 'Failed to log', description: err.message, variant: 'destructive' });
    } finally {
      setLogging(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-20">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const snapshot = data?.latest_snapshot || {};
  const health = data?.financial_health || {};
  const snapshots = data?.snapshots || [];
  const transactions = data?.recent_transactions || [];
  const ops = data?.operational_link || {};

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/20">
            <Wallet className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">NC Financial Intelligence</h1>
            <p className="text-xs text-slate-400">CFO-grade financial management · Revenue, expenses, runway, forecasts, AI recommendations</p>
          </div>
        </div>
        <Button onClick={handleSnapshot} disabled={snapshotting} variant="outline" className="border-slate-700">
          {snapshotting ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Capturing...</> : <><RefreshCw className="w-4 h-4 mr-2" />Capture Snapshot</>}
        </Button>
      </div>

      {/* Metrics Bar */}
      <FinancialMetricsBar snapshot={snapshot} health={health} />

      {/* Quick Generate Buttons */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Button onClick={() => handleGenerate('cfo')} disabled={generating.cfo} size="sm" className="bg-amber-600 hover:bg-amber-700">
          {generating.cfo ? <><RefreshCw className="w-3 h-3 mr-1 animate-spin" />Generating...</> : <><FileText className="w-3 h-3 mr-1" />Daily CFO Report</>}
        </Button>
        <Button onClick={() => handleGenerate('briefing')} disabled={generating.briefing} size="sm" variant="outline" className="border-slate-700">
          {generating.briefing ? <><RefreshCw className="w-3 h-3 mr-1 animate-spin" />Generating...</> : <><Activity className="w-3 h-3 mr-1" />Weekly Briefing</>}
        </Button>
        <Button onClick={() => handleGenerate('forecast')} disabled={generating.forecast} size="sm" variant="outline" className="border-slate-700">
          {generating.forecast ? <><RefreshCw className="w-3 h-3 mr-1 animate-spin" />Generating...</> : <><Target className="w-3 h-3 mr-1" />Quarterly Forecast</>}
        </Button>
        <Button onClick={() => handleGenerate('recommend')} disabled={generating.recommend} size="sm" variant="outline" className="border-slate-700">
          {generating.recommend ? <><RefreshCw className="w-3 h-3 mr-1 animate-spin" />Generating...</> : <><Sparkles className="w-3 h-3 mr-1" />AI Recommendations</>}
        </Button>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="bg-slate-900 border border-slate-800 mb-4">
          <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
          <TabsTrigger value="cfo" className="text-xs"><FileText className="w-3 h-3 mr-1" />CFO Report</TabsTrigger>
          <TabsTrigger value="forecast" className="text-xs"><Target className="w-3 h-3 mr-1" />Forecast</TabsTrigger>
          <TabsTrigger value="recommendations" className="text-xs"><Sparkles className="w-3 h-3 mr-1" />Recommendations</TabsTrigger>
          <TabsTrigger value="transactions" className="text-xs">Transactions</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <RevenueExpenseTrend snapshots={snapshots} />
            </div>
            <RunwayGauge snapshot={snapshot} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ExpenseBreakdown snapshot={snapshot} />
            <Card className="p-4 bg-slate-900/50 border-slate-800">
              <h3 className="text-sm font-semibold text-white mb-3">Financial Health vs Operational Health</h3>
              <div className="space-y-3">
                <div className="p-3 rounded bg-slate-900/60">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">Financial Health</span>
                    <span className={health.score >= 65 ? 'text-emerald-400' : health.score >= 45 ? 'text-amber-400' : 'text-red-400'}>{health.score}/100 · {health.status}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
                    <div className={`h-full ${health.score >= 65 ? 'bg-emerald-500' : health.score >= 45 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${health.score}%` }} />
                  </div>
                </div>
                <div className="p-3 rounded bg-slate-900/60">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">Active Customers</span>
                    <span className="text-blue-400">{ops.active_customers || 0}</span>
                  </div>
                  <div className="text-xs text-slate-500">Churn rate: {ops.churn_rate || 0}%</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 rounded bg-slate-900/60">
                    <div className="text-xs text-slate-500">Gross Margin</div>
                    <div className={`text-sm font-medium ${snapshot.gross_margin_pct >= 70 ? 'text-emerald-400' : 'text-amber-400'}`}>{snapshot.gross_margin_pct || 0}%</div>
                  </div>
                  <div className="p-2 rounded bg-slate-900/60">
                    <div className="text-xs text-slate-500">Op. Margin</div>
                    <div className={`text-sm font-medium ${snapshot.operating_margin_pct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{snapshot.operating_margin_pct || 0}%</div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* CFO Report Tab */}
        <TabsContent value="cfo" className="space-y-4">
          {cfoReport ? <CFOReport report={cfoReport} /> : (
            <Card className="p-12 bg-slate-900/50 border-slate-800 text-center">
              <FileText className="w-10 h-10 text-amber-400 mx-auto mb-3" />
              <p className="text-slate-400 mb-3">No CFO report generated yet.</p>
              <Button onClick={() => handleGenerate('cfo')} disabled={generating.cfo} className="bg-amber-600 hover:bg-amber-700">
                {generating.cfo ? 'Generating...' : 'Generate Daily CFO Report'}
              </Button>
            </Card>
          )}
          {briefing && <div className="mt-4"><WeeklyBriefing briefing={briefing} /></div>}
        </TabsContent>

        {/* Forecast Tab */}
        <TabsContent value="forecast">
          {forecast ? <ForecastPanel forecast={forecast} /> : (
            <Card className="p-12 bg-slate-900/50 border-slate-800 text-center">
              <Target className="w-10 h-10 text-violet-400 mx-auto mb-3" />
              <p className="text-slate-400 mb-3">No forecast generated yet.</p>
              <Button onClick={() => handleGenerate('forecast')} disabled={generating.forecast} variant="outline" className="border-slate-700">
                {generating.forecast ? 'Generating...' : 'Generate Quarterly Forecast'}
              </Button>
            </Card>
          )}
        </TabsContent>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations">
          {recommendations ? <RecommendationsPanel recommendations={recommendations} /> : (
            <Card className="p-12 bg-slate-900/50 border-slate-800 text-center">
              <Sparkles className="w-10 h-10 text-violet-400 mx-auto mb-3" />
              <p className="text-slate-400 mb-3">No recommendations generated yet.</p>
              <Button onClick={() => handleGenerate('recommend')} disabled={generating.recommend} variant="outline" className="border-slate-700">
                {generating.recommend ? 'Generating...' : 'Generate AI Recommendations'}
              </Button>
            </Card>
          )}
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1">
            <TransactionLogger onLog={handleLogTransaction} logging={logging} />
          </div>
          <div className="lg:col-span-2">
            <Card className="p-4 bg-slate-900/50 border-slate-800">
              <h3 className="text-sm font-semibold text-white mb-3">Recent Transactions</h3>
              {transactions.length === 0 ? (
                <p className="text-xs text-slate-400 py-8 text-center">No transactions logged yet.</p>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {transactions.map(t => (
                    <div key={t.id} className="p-3 rounded bg-slate-900/60 border border-slate-800/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`text-xs ${t.transaction_type === 'revenue' ? 'bg-emerald-500/20 text-emerald-300' : t.transaction_type === 'expense' ? 'bg-red-500/20 text-red-300' : 'bg-slate-700 text-slate-300'}`}>{t.transaction_type}</Badge>
                          <span className="text-xs text-slate-400 capitalize">{t.category?.replace('_', ' ')}</span>
                        </div>
                        <span className={`text-sm font-bold ${t.transaction_type === 'revenue' ? 'text-emerald-400' : 'text-red-400'}`}>
                          {t.transaction_type === 'revenue' ? '+' : '-'}${(t.amount || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-xs text-white mt-1">{t.description}</div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-slate-500">{t.vendor || '—'}</span>
                        <span className="text-xs text-slate-600">{t.transaction_date ? new Date(t.transaction_date).toLocaleDateString() : ''}</span>
                      </div>
                      {t.recurring && <Badge variant="outline" className="text-xs mt-1 bg-blue-500/20 text-blue-300">↻ {t.recurring_frequency}</Badge>}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}