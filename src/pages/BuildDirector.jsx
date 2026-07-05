import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Loader2, Sparkles, CheckCircle, AlertTriangle, DollarSign, Zap, Trophy, ArrowRight, Ban, Crown } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const SOURCE_TYPES = [
  'feature_request', 'founder_idea', 'bug', 'ai_recommendation', 'architecture_gap',
  'customer_request', 'payment_gap', 'canon_gap', 'technical_debt', 'workflow_failure'
];
const STATUSES = ['proposed', 'approved', 'blocked', 'queued', 'in_progress', 'testing', 'complete', 'deferred', 'rejected'];
const CONNECTED_SYSTEMS = ['Executive Command', 'Mission Control', 'NOOS', 'NAIL', 'Ecosystem Orchestrator', 'Execution Engine', 'Payment Fabric', 'Canon Verification', 'Development Memory', 'Enterprise Memory', 'Knowledge Graph', 'Engineering Journal'];

const statusColor = (s) => ({
  proposed: 'bg-slate-100 text-slate-700', approved: 'bg-blue-100 text-blue-700', blocked: 'bg-red-100 text-red-700',
  queued: 'bg-cyan-100 text-cyan-700', in_progress: 'bg-amber-100 text-amber-700', testing: 'bg-violet-100 text-violet-700',
  complete: 'bg-emerald-100 text-emerald-700', deferred: 'bg-slate-100 text-slate-500', rejected: 'bg-red-100 text-red-600'
}[s] || 'bg-slate-100 text-slate-700');

const tierColor = (t) => ({ low: 'text-emerald-600', medium: 'text-amber-600', high: 'text-orange-600', critical: 'text-red-600' }[t] || 'text-slate-600');

function Stat({ icon: Icon, label, value, sub, color }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color || 'bg-primary/10'}`}>
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-xl font-bold">{value}</p>
            {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BuildCard({ item, onApprove, onStatus }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={statusColor(item.status)} variant="secondary">{item.status}</Badge>
              <Badge variant="outline" className="text-xs">{(item.source_type || '').replace(/_/g, ' ')}</Badge>
              {item.requires_founder_approval && <Badge className="bg-amber-100 text-amber-700" variant="secondary"><Crown className="w-3 h-3 mr-1" />Founder</Badge>}
            </div>
            <h3 className="font-semibold mt-2">{item.title}</h3>
            {item.description && <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{item.description}</p>}
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-2xl font-bold text-primary">{item.composite_score?.toFixed(0)}</div>
            <p className="text-xs text-muted-foreground">composite</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs mt-3">
          <div>Strategic: <b>{item.strategic_value}</b></div>
          <div>Customer: <b>{item.customer_value}</b></div>
          <div>Effort: <b>{item.engineering_effort}h</b></div>
          <div>Risk: <b>{item.risk}/100</b></div>
          <div>ROI: <b className="text-emerald-600">{item.roi_score?.toFixed(2)}</b></div>
          <div>Cost: <b className={tierColor(item.cost_tier)}>{item.cost_tier}</b></div>
          <div>Msg credits: <b>{item.estimated_message_credits}</b></div>
          <div>Int credits: <b>{item.estimated_integration_credits}</b></div>
          <div>Infra: <b>${item.estimated_infrastructure_cost}/mo</b></div>
          <div>Revenue: <b>${item.revenue_impact}/mo</b></div>
        </div>
        {item.duplication_risk > 50 && (
          <div className="mt-2 text-xs text-amber-600 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Duplication risk: {item.duplication_risk}/100{item.duplicate_of ? ` (of ${item.duplicate_of})` : ''}</div>
        )}
        {item.dependencies?.length > 0 && (
          <div className="mt-2 text-xs text-muted-foreground">Depends on: {item.dependencies.join(', ')}</div>
        )}
        <div className="flex gap-2 mt-3">
          {item.status === 'proposed' && <Button size="sm" onClick={() => onApprove(item)}><CheckCircle className="w-3.5 h-3.5 mr-1" />Approve</Button>}
          {item.status === 'approved' && <Button size="sm" variant="outline" onClick={() => onStatus(item, 'queued')}>Queue</Button>}
          {item.status === 'queued' && <Button size="sm" variant="outline" onClick={() => onStatus(item, 'in_progress')}>Start</Button>}
          {(item.status === 'proposed' || item.status === 'approved') && <Button size="sm" variant="ghost" onClick={() => onStatus(item, 'blocked')}>Block</Button>}
        </div>
      </CardContent>
    </Card>
  );
}

export default function BuildDirector() {
  const { toast } = useToast();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [idea, setIdea] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiProposal, setAiProposal] = useState(null);
  const [newItem, setNewItem] = useState({ title: '', description: '', source_type: 'founder_idea', engineering_effort: 20, strategic_value: 60, customer_value: 50, risk: 30, revenue_impact: 0, founder_time_saved_hours: 0, estimated_infrastructure_cost: 0, duplication_risk: 0 });
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('ncBuildDirector', { operation: 'get_dashboard' });
      setDashboard(res.data);
    } catch (e) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const approve = async (item) => {
    try {
      await base44.functions.invoke('ncBuildDirector', { operation: 'approve_item', params: { item_id: item.id } });
      toast({ title: 'Approved', description: item.title });
      load();
    } catch (e) { toast({ title: 'Approval failed', description: (e.response?.data?.error) || e.message, variant: 'destructive' }); }
  };

  const changeStatus = async (item, status) => {
    try {
      await base44.functions.invoke('ncBuildDirector', { operation: 'update_status', params: { item_id: item.id, status } });
      toast({ title: `Status → ${status}` });
      load();
    } catch (e) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  };

  const syncSources = async () => {
    try {
      const res = await base44.functions.invoke('ncBuildDirector', { operation: 'sync_from_sources' });
      toast({ title: 'Synced', description: `${res.data.synced_count} new build items imported` });
      load();
    } catch (e) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  };

  const aiPropose = async () => {
    if (!idea.trim()) return;
    setAiLoading(true);
    try {
      const res = await base44.functions.invoke('ncBuildDirector', { operation: 'ai_propose', params: { idea } });
      setAiProposal(res.data);
    } catch (e) { toast({ title: 'AI error', description: e.message, variant: 'destructive' }); }
    setAiLoading(false);
  };

  const createFromForm = async () => {
    if (!newItem.title.trim()) return;
    setCreating(true);
    try {
      await base44.functions.invoke('ncBuildDirector', { operation: 'create_item', params: newItem });
      toast({ title: 'Created', description: newItem.title });
      setNewItem({ ...newItem, title: '', description: '' });
      load();
    } catch (e) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
    setCreating(false);
  };

  const createFromAI = async () => {
    if (!aiProposal?.proposal) return;
    setCreating(true);
    try {
      await base44.functions.invoke('ncBuildDirector', { operation: 'create_item', params: aiProposal.proposal });
      toast({ title: 'Created from AI proposal', description: aiProposal.proposal.title });
      setAiProposal(null); setIdea('');
      load();
    } catch (e) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
    setCreating(false);
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  const d = dashboard || {};

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Sparkles className="w-6 h-6 text-primary" />NC Build Director</h1>
          <p className="text-sm text-muted-foreground">Planning layer for all NCOS development — every build scored, costed, and ordered before execution.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={syncSources}><Zap className="w-4 h-4 mr-1" />Sync Sources</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <Stat icon={Trophy} label="Next Best Build" value={d.next_best?.composite_score?.toFixed(0) || '—'} sub={d.next_best?.title?.slice(0, 24) || 'none'} color="bg-primary/10" />
        <Stat icon={ArrowRight} label="Active Queue" value={d.active_count} sub={`${d.total_items} total`} color="bg-blue-100" />
        <Stat icon={Ban} label="Blocked" value={d.blocked_builds?.length || 0} color="bg-red-100" />
        <Stat icon={Zap} label="Msg Credit Risk" value={(d.pending_message_credits || 0).toLocaleString()} sub="pending" color="bg-violet-100" />
        <Stat icon={Sparkles} label="Int Credit Risk" value={(d.pending_integration_credits || 0).toLocaleString()} sub="pending" color="bg-amber-100" />
        <Stat icon={DollarSign} label="Infra Cost/mo" value={`$${d.pending_infrastructure_cost || 0}`} sub="pending" color="bg-emerald-100" />
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-muted-foreground">CONNECTED SYSTEMS:</span>
            {CONNECTED_SYSTEMS.map((s) => (
              <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="queue">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="queue">Current Queue</TabsTrigger>
          <TabsTrigger value="next10">Recommended Next 10</TabsTrigger>
          <TabsTrigger value="blocked">Blocked</TabsTrigger>
          <TabsTrigger value="roi">Highest ROI</TabsTrigger>
          <TabsTrigger value="cheap">Cheapest High-Value</TabsTrigger>
          <TabsTrigger value="gaps">Gaps & Risks</TabsTrigger>
          <TabsTrigger value="propose">Propose</TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="space-y-3">
          {d.current_queue?.length === 0 && <p className="text-sm text-muted-foreground py-8 text-center">No builds in progress.</p>}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {d.current_queue?.map((i) => <BuildCard key={i.id} item={i} onApprove={approve} onStatus={changeStatus} />)}
          </div>
        </TabsContent>

        <TabsContent value="next10" className="space-y-3">
          {d.recommended_next_10?.length === 0 && <p className="text-sm text-muted-foreground py-8 text-center">No buildable items. Approve proposed builds first.</p>}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {d.recommended_next_10?.map((i, idx) => (
              <Card key={i.id} className="border-l-4 border-l-primary">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">{idx + 1}</div>
                    <Badge className={statusColor(i.status)} variant="secondary">{i.status}</Badge>
                  </div>
                  <h3 className="font-semibold">{i.title}</h3>
                  <div className="grid grid-cols-2 gap-1 text-xs mt-2">
                    <div>Composite: <b>{i.composite_score?.toFixed(0)}</b></div>
                    <div>ROI: <b className="text-emerald-600">{i.roi_score?.toFixed(2)}</b></div>
                    <div>Effort: <b>{i.engineering_effort}h</b></div>
                    <div>Cost: <b className={tierColor(i.cost_tier)}>{i.cost_tier}</b></div>
                  </div>
                  {i.requires_founder_approval && <div className="mt-2"><Badge className="bg-amber-100 text-amber-700" variant="secondary"><Crown className="w-3 h-3 mr-1" />Founder approval required</Badge></div>}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="blocked" className="space-y-3">
          {d.blocked_builds?.length === 0 && <p className="text-sm text-muted-foreground py-8 text-center">No blocked builds.</p>}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {d.blocked_builds?.map((i) => (
              <Card key={i.id} className="border-l-4 border-l-red-500">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2"><Badge className={statusColor('blocked')} variant="secondary">blocked</Badge><Badge variant="outline" className="text-xs">{(i.source_type || '').replace(/_/g, ' ')}</Badge></div>
                  <h3 className="font-semibold">{i.title}</h3>
                  {i.blocked_reason && <p className="text-sm text-red-600 mt-1">{i.blocked_reason}</p>}
                  {i.dependencies?.length > 0 && <p className="text-xs text-muted-foreground mt-1">Blocked on: {i.dependencies.join(', ')}</p>}
                  <div className="flex gap-2 mt-3"><Button size="sm" variant="outline" onClick={() => changeStatus(i, 'proposed')}>Unblock</Button></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="roi" className="space-y-3">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {d.highest_roi?.map((i) => <BuildCard key={i.id} item={i} onApprove={approve} onStatus={changeStatus} />)}
          </div>
        </TabsContent>

        <TabsContent value="cheap" className="space-y-3">
          <p className="text-xs text-muted-foreground">High composite (≥60) + low cost tier — quick wins.</p>
          {d.cheapest_high_value?.length === 0 && <p className="text-sm text-muted-foreground py-8 text-center">No quick wins available.</p>}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {d.cheapest_high_value?.map((i) => <BuildCard key={i.id} item={i} onApprove={approve} onStatus={changeStatus} />)}
          </div>
        </TabsContent>

        <TabsContent value="gaps" className="space-y-3">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Architecture Risks</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {d.architecture_risks?.length === 0 && <p className="text-sm text-muted-foreground">No architecture risks.</p>}
                {d.architecture_risks?.map((i) => (
                  <div key={i.id} className="flex items-center justify-between text-sm border-b pb-2">
                    <span>{i.title}</span>
                    <Badge variant="destructive">{i.risk}/100</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Remaining Platform Gaps</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {Object.keys(d.platform_gaps || {}).length === 0 && <p className="text-sm text-muted-foreground">No gaps tracked.</p>}
                {Object.entries(d.platform_gaps || {}).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between text-sm border-b pb-2">
                    <span className="capitalize">{type.replace(/_/g, ' ')}</span>
                    <Badge variant="secondary">{count} open</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="propose" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>AI Build Proposal</CardTitle><CardDescription>Describe a build idea; AI estimates value, effort, cost, and credits.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              <Textarea value={idea} onChange={(e) => setIdea(e.target.value)} placeholder="e.g. Add automated refund reconciliation between Stripe and Payout Center" rows={3} />
              <Button onClick={aiPropose} disabled={aiLoading || !idea.trim()}>{aiLoading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}Generate Proposal</Button>
              {aiProposal && (
                <div className="mt-4 border rounded-lg p-4 bg-muted/30 space-y-2">
                  <h3 className="font-semibold">{aiProposal.proposal.title}</h3>
                  <p className="text-sm text-muted-foreground">{aiProposal.proposal.description}</p>
                  <pre className="text-xs bg-slate-900 text-slate-100 p-2 rounded overflow-x-auto whitespace-pre-wrap">{aiProposal.formula_explanation}</pre>
                  <Button onClick={createFromAI} disabled={creating}><CheckCircle className="w-4 h-4 mr-1" />Create Build Item</Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Manual Build Item</CardTitle><CardDescription>Propose a build directly with your own estimates.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid md:grid-cols-2 gap-3">
                <div><Label>Title</Label><Input value={newItem.title} onChange={(e) => setNewItem({ ...newItem, title: e.target.value })} /></div>
                <div><Label>Source Type</Label>
                  <Select value={newItem.source_type} onValueChange={(v) => setNewItem({ ...newItem, source_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{SOURCE_TYPES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Description</Label><Textarea value={newItem.description} onChange={(e) => setNewItem({ ...newItem, description: e.target.value })} rows={2} /></div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div><Label>Strategic (0-100)</Label><Input type="number" value={newItem.strategic_value} onChange={(e) => setNewItem({ ...newItem, strategic_value: +e.target.value })} /></div>
                <div><Label>Customer (0-100)</Label><Input type="number" value={newItem.customer_value} onChange={(e) => setNewItem({ ...newItem, customer_value: +e.target.value })} /></div>
                <div><Label>Effort (hours)</Label><Input type="number" value={newItem.engineering_effort} onChange={(e) => setNewItem({ ...newItem, engineering_effort: +e.target.value })} /></div>
                <div><Label>Risk (0-100)</Label><Input type="number" value={newItem.risk} onChange={(e) => setNewItem({ ...newItem, risk: +e.target.value })} /></div>
                <div><Label>Revenue/mo $</Label><Input type="number" value={newItem.revenue_impact} onChange={(e) => setNewItem({ ...newItem, revenue_impact: +e.target.value })} /></div>
                <div><Label>Founder time saved (h)</Label><Input type="number" value={newItem.founder_time_saved_hours} onChange={(e) => setNewItem({ ...newItem, founder_time_saved_hours: +e.target.value })} /></div>
                <div><Label>Infra cost/mo $</Label><Input type="number" value={newItem.estimated_infrastructure_cost} onChange={(e) => setNewItem({ ...newItem, estimated_infrastructure_cost: +e.target.value })} /></div>
                <div><Label>Duplication risk (0-100)</Label><Input type="number" value={newItem.duplication_risk} onChange={(e) => setNewItem({ ...newItem, duplication_risk: +e.target.value })} /></div>
              </div>
              <Button onClick={createFromForm} disabled={creating || !newItem.title.trim()}><CheckCircle className="w-4 h-4 mr-1" />{creating ? 'Creating...' : 'Propose Build'}</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}