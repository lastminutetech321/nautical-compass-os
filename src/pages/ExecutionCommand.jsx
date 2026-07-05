import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { base44 } from '@/api/base44Client';
import { Zap, AlertOctagon, ShieldCheck, TrendingUp, DollarSign, Gauge, CheckCircle2, Play, Lock } from 'lucide-react';

const STATUS_COLORS = {
  queued: 'bg-slate-100 text-slate-700',
  dispatched: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-indigo-100 text-indigo-700',
  blocked: 'bg-amber-100 text-amber-700',
  awaiting_approval: 'bg-orange-100 text-orange-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-slate-100 text-slate-500',
  failed: 'bg-red-100 text-red-700'
};
const PRIORITY_COLORS = { low: 'bg-slate-100', medium: 'bg-blue-100 text-blue-700', high: 'bg-amber-100 text-amber-700', critical: 'bg-red-100 text-red-700' };

export default function ExecutionCommand() {
  const [view, setView] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [vRes, mRes] = await Promise.all([
        base44.functions.invoke('ncExecutionEngine', { operation: 'get_executive_view' }),
        base44.functions.invoke('ncExecutionEngine', { operation: 'get_metrics' })
      ]);
      setView(vRes.data?.executive_view || null);
      setMetrics(mRes.data?.metrics || null);
    } catch (e) { /* */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const autoCreate = async () => {
    setBusy(true);
    try { await base44.functions.invoke('ncExecutionEngine', { operation: 'auto_create_from_insights' }); }
    catch (e) { /* */ }
    setBusy(false); load();
  };
  const approve = async (id) => {
    setBusy(true);
    try { await base44.functions.invoke('ncExecutionEngine', { operation: 'approve', execution_id: id }); }
    catch (e) { /* */ }
    setBusy(false); load();
  };

  if (loading) return <div className="p-8 flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Zap className="text-primary" /> Unified Execution Engine</h1>
          <p className="text-muted-foreground text-sm mt-1">Converts approved intelligence into tracked work. Protected actions require Founder approval.</p>
        </div>
        <Button onClick={autoCreate} disabled={busy}><Play className="h-4 w-4" /> Auto-Create from Insights</Button>
      </div>

      {/* Metrics */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <MetricCard icon={Zap} label="Active" value={metrics.total - metrics.completed - metrics.failed} />
          <MetricCard icon={AlertOctagon} label="Blocked" value={metrics.blocked} tone="amber" />
          <MetricCard icon={Lock} label="Founder Approvals" value={metrics.founder_approvals_waiting} tone="orange" />
          <MetricCard icon={Gauge} label="Completion Rate" value={`${metrics.completion_rate}%`} tone="emerald" />
          <MetricCard icon={TrendingUp} label="Expected Readiness" value={`+${metrics.expected_readiness_total}`} tone="blue" />
          <MetricCard icon={DollarSign} label="Expected Revenue" value={`$${metrics.expected_revenue_total.toLocaleString()}`} tone="emerald" />
        </div>
      )}

      {view && (
        <Tabs defaultValue="priority">
          <TabsList>
            <TabsTrigger value="priority">High Priority ({view.high_priority?.length || 0})</TabsTrigger>
            <TabsTrigger value="blocked">Blocked ({view.blocked?.length || 0})</TabsTrigger>
            <TabsTrigger value="approvals">Founder Approvals ({view.founder_approvals_waiting?.length || 0})</TabsTrigger>
          </TabsList>

          <TabsContent value="priority" className="space-y-3">
            {(!view.high_priority || view.high_priority.length === 0) && <Empty text="No high-priority execution items." />}
            {view.high_priority?.map(e => <ExecCard key={e.id} e={e} />)}
          </TabsContent>

          <TabsContent value="blocked" className="space-y-3">
            {(!view.blocked || view.blocked.length === 0) && <Empty text="No blocked items." />}
            {view.blocked?.map(e => <ExecCard key={e.id} e={e} />)}
          </TabsContent>

          <TabsContent value="approvals" className="space-y-3">
            {(!view.founder_approvals_waiting || view.founder_approvals_waiting.length === 0) && <Empty text="No approvals waiting." />}
            {view.founder_approvals_waiting?.map(e => (
              <ExecCard key={e.id} e={e} onApprove={() => approve(e.id)} busy={busy} showApprove />
            ))}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function ExecCard({ e, onApprove, busy, showApprove }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold">{e.title}</h3>
              <Badge className={STATUS_COLORS[e.status] || 'bg-slate-100'}>{e.status.replace(/_/g, ' ')}</Badge>
              <Badge className={PRIORITY_COLORS[e.priority] || 'bg-slate-100'}>{e.priority}</Badge>
              <Badge variant="outline">{e.source_type.replace(/_/g, ' ')}</Badge>
              {e.approval_required && e.approval_status === 'pending' && <Badge variant="destructive"><Lock className="h-3 w-3" /> {e.approval_category}</Badge>}
            </div>
            {e.why_it_matters && <p className="text-sm text-muted-foreground mt-1">{e.why_it_matters}</p>}
            {e.recommended_action && <p className="text-sm mt-1">{e.recommended_action}</p>}
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              {e.owner && <span>Owner: {e.owner}</span>}
              {e.department && <span>Dept: {e.department}</span>}
              {e.assigned_ai_agent && <span>AI: {e.assigned_ai_agent}</span>}
              {e.due_date && <span>Due: {e.due_date}</span>}
              {e.expected_revenue_impact > 0 && <span>Rev: ${e.expected_revenue_impact.toLocaleString()}</span>}
              {e.expected_readiness_increase > 0 && <span>Readiness: +{e.expected_readiness_increase}</span>}
            </div>
            {e.progress_pct > 0 && e.progress_pct < 100 && <Progress value={e.progress_pct} className="mt-2" />}
            {e.outcome_match && e.outcome_match !== 'pending' && (
              <div className="mt-2 text-xs">
                <Badge className={e.outcome_match === 'met' || e.outcome_match === 'exceeded' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>Outcome: {e.outcome_match}</Badge>
                {e.actual_impact && <span className="ml-2 text-muted-foreground">{e.actual_impact}</span>}
              </div>
            )}
          </div>
          {showApprove && onApprove && (
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" disabled={busy} onClick={onApprove}><CheckCircle2 className="h-3.5 w-3.5" /> Approve</Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function MetricCard({ icon: Icon, label, value, tone }) {
  const tones = { amber: 'text-amber-600', orange: 'text-orange-600', emerald: 'text-emerald-600', blue: 'text-blue-600' };
  return (
    <Card><CardContent className="p-3 flex items-center gap-3">
      <Icon className="h-8 w-8 text-muted-foreground/40" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-xl font-bold ${tones[tone] || ''}`}>{value}</p>
      </div>
    </CardContent></Card>
  );
}
function Empty({ text }) { return <div className="text-center py-12 text-muted-foreground text-sm">{text}</div>; }