import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { base44 } from '@/api/base44Client';
import { ShieldCheck, AlertTriangle, FileSearch, Link2, Sparkles, CheckCircle2, XCircle, Flag, Clock, BarChart3 } from 'lucide-react';

const STATUS_COLORS = {
  queued: 'bg-slate-100 text-slate-700',
  ai_validating: 'bg-blue-100 text-blue-700',
  citation_validated: 'bg-blue-100 text-blue-700',
  authority_reviewed: 'bg-indigo-100 text-indigo-700',
  source_validated: 'bg-indigo-100 text-indigo-700',
  jurisdiction_validated: 'bg-indigo-100 text-indigo-700',
  relationships_mapped: 'bg-violet-100 text-violet-700',
  ai_recommended: 'bg-amber-100 text-amber-700',
  founder_review: 'bg-orange-100 text-orange-700',
  verified: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  gap_flagged: 'bg-rose-100 text-rose-700',
  gap_resolved: 'bg-teal-100 text-teal-700'
};

export default function CanonVerificationDashboard() {
  const [queue, setQueue] = useState([]);
  const [recentlyVerified, setRecentlyVerified] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [qRes, sRes] = await Promise.all([
        base44.functions.invoke('ncCanonVerification', { operation: 'get_queue', limit: 100 }),
        base44.functions.invoke('ncCanonVerification', { operation: 'get_stats' })
      ]);
      setQueue(qRes.data?.queue || []);
      setRecentlyVerified(qRes.data?.recently_verified || []);
      setStats(sRes.data?.stats || null);
    } catch (e) { /* */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const runAI = async (verification_id, op, label) => {
    setBusy(true);
    try { await base44.functions.invoke('ncCanonVerification', { operation: op, verification_id }); }
    catch (e) { /* */ }
    setBusy(false);
    load();
  };

  const approve = async (id) => {
    setBusy(true);
    try { await base44.functions.invoke('ncCanonVerification', { operation: 'approve_verification', verification_id: id, reviewer_note: 'Approved via dashboard' }); }
    catch (e) { /* */ }
    setBusy(false); setSelected(null); load();
  };
  const reject = async (id) => {
    setBusy(true);
    try { await base44.functions.invoke('ncCanonVerification', { operation: 'reject_verification', verification_id: id, rejection_reason: 'Rejected via dashboard' }); }
    catch (e) { /* */ }
    setBusy(false); setSelected(null); load();
  };
  const flagGap = async (id) => {
    setBusy(true);
    try { await base44.functions.invoke('ncCanonVerification', { operation: 'flag_gap', verification_id: id, gap_reason: 'Flagged as canon gap' }); }
    catch (e) { /* */ }
    setBusy(false); load();
  };

  if (loading) return <div className="p-8 flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><ShieldCheck className="text-primary" /> Canon Verification Engine</h1>
          <p className="text-muted-foreground text-sm mt-1">No Canon entry is verified without Founder/Admin review. AI recommends; humans approve.</p>
        </div>
        <Button variant="outline" onClick={load}>Refresh</Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <StatCard label="Total Cases" value={stats.total_cases} />
          <StatCard label="Verified Canon" value={stats.verified_canon_entries} tone="emerald" />
          <StatCard label="AI Recommended" value={stats.ai_recommended} tone="amber" />
          <StatCard label="Founder Review" value={stats.founder_review} tone="orange" />
          <StatCard label="Gaps Flagged" value={stats.gaps_flagged} tone="rose" />
          <StatCard label="Blocking JurisEngine" value={stats.blocks_jurisengine} tone="red" />
        </div>
      )}

      <Tabs defaultValue="queue">
        <TabsList>
          <TabsTrigger value="queue">Verification Queue ({queue.length})</TabsTrigger>
          <TabsTrigger value="verified">Verified ({recentlyVerified.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="queue" className="space-y-3">
          {queue.length === 0 && <EmptyState icon={ShieldCheck} text="No pending verification cases. New Canon entries will appear here." />}
          {queue.map(v => (
            <Card key={v.id} className={selected === v.id ? 'border-primary' : ''}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold truncate">{v.canon_title}</h3>
                      <Badge className={STATUS_COLORS[v.verification_status] || 'bg-slate-100'}>{v.verification_status.replace(/_/g, ' ')}</Badge>
                      {v.is_gap_case && <Badge variant="destructive">GAP</Badge>}
                      {v.blocks_jurisengine && <Badge variant="destructive">BLOCKS JURIS</Badge>}
                      <Badge variant="outline">{v.queue_priority}</Badge>
                    </div>
                    {v.canon_citation && <p className="text-xs text-muted-foreground mt-1 font-mono">{v.canon_citation}</p>}
                    {v.ai_summary && <p className="text-sm mt-2">{v.ai_summary}</p>}
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      {v.confidence_score > 0 && <span>Confidence: {v.confidence_score}/100</span>}
                      {v.ai_recommendation !== 'pending' && <span>AI: {v.ai_recommendation.replace(/_/g, ' ')}</span>}
                      {v.related_authority_count > 0 && <span>{v.related_authority_count} related</span>}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => runAI(v.id, 'validate_citation', 'citation')}><FileSearch className="h-3.5 w-3.5" /> Cite</Button>
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => runAI(v.id, 'classify_authority', 'authority')}><Sparkles className="h-3.5 w-3.5" /> Classify</Button>
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => runAI(v.id, 'map_related', 'related')}><Link2 className="h-3.5 w-3.5" /> Map</Button>
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => runAI(v.id, 'recommend_verification', 'recommend')}><BarChart3 className="h-3.5 w-3.5" /> Recommend</Button>
                  </div>
                </div>
                <div className="flex gap-2 mt-3 pt-3 border-t">
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" disabled={busy} onClick={() => approve(v.id)}><CheckCircle2 className="h-3.5 w-3.5" /> Verify</Button>
                  <Button size="sm" variant="destructive" disabled={busy} onClick={() => reject(v.id)}><XCircle className="h-3.5 w-3.5" /> Reject</Button>
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => flagGap(v.id)}><Flag className="h-3.5 w-3.5" /> Flag Gap</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
        <TabsContent value="verified" className="space-y-3">
          {recentlyVerified.length === 0 && <EmptyState icon={CheckCircle2} text="No verified Canon entries yet." />}
          {recentlyVerified.map(v => (
            <Card key={v.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{v.canon_title}</h3>
                    {v.canon_citation && <p className="text-xs text-muted-foreground font-mono">{v.canon_citation}</p>}
                    <p className="text-xs text-muted-foreground mt-1">Verified by {v.approved_by || '—'} on {v.approved_at ? new Date(v.approved_at).toLocaleDateString() : '—'}</p>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-700">Verified</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ label, value, tone }) {
  const tones = { emerald: 'text-emerald-600', amber: 'text-amber-600', orange: 'text-orange-600', rose: 'text-rose-600', red: 'text-red-600' };
  return (
    <Card><CardContent className="p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold ${tones[tone] || ''}`}>{value}</p>
    </CardContent></Card>
  );
}

function EmptyState({ icon: Icon, text }) {
  return (
    <div className="text-center py-12 text-muted-foreground">
      <Icon className="h-10 w-10 mx-auto mb-3 opacity-40" />
      <p className="text-sm">{text}</p>
    </div>
  );
}