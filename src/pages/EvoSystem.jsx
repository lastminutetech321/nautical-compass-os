import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Loader2, Radar, Plug, ShieldCheck, Rocket, Brain, AlertTriangle, TrendingUp, Sparkles, Gauge, Zap, Eye } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const SCORE_COLOR = (s) => s >= 80 ? 'bg-emerald-100 text-emerald-700' : s >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700';
const SEVERITY_COLOR = { critical: 'bg-red-100 text-red-700', urgent: 'bg-orange-100 text-orange-700', warning: 'bg-amber-100 text-amber-700', info: 'bg-blue-100 text-blue-700' };

function ScoreCard({ icon: Icon, label, value, sub }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Icon className="w-5 h-5 text-primary" /></div>
            <div><p className="text-xs text-muted-foreground">{label}</p><p className="text-xl font-bold">{value}</p>{sub && <p className="text-xs text-muted-foreground">{sub}</p>}</div>
          </div>
          <div className={`px-2 py-1 rounded-full text-xs font-bold ${SCORE_COLOR(typeof value === 'number' ? value : 0)}`}>{typeof value === 'number' ? value + '%' : value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function EvoSystem() {
  const { toast } = useToast();
  const [score, setScore] = useState(null);
  const [blindSpots, setBlindSpots] = useState([]);
  const [integrations, setIntegrations] = useState(null);
  const [consents, setConsents] = useState([]);
  const [readiness, setReadiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [aiScanning, setAiScanning] = useState(false);
  const [newIntegration, setNewIntegration] = useState({ name: '', integration_type: 'crm', connection_mode: 'rest' });
  const [consentForm, setConsentForm] = useState({ integration_id: '', integration_name: '', purpose: '', benefits: '', data_requested: 'assignments,schedules,hours' });

  const load = async () => {
    setLoading(true);
    try {
      const [s, bs, ig, co, rd] = await Promise.all([
        base44.functions.invoke('ncEvoSystem', { operation: 'get_evolution_score' }),
        base44.functions.invoke('ncEvoSystem', { operation: 'get_blind_spots' }),
        base44.functions.invoke('ncEvoSystem', { operation: 'get_integrations' }),
        base44.functions.invoke('ncEvoSystem', { operation: 'get_consent' }),
        base44.functions.invoke('ncEvoSystem', { operation: 'get_launch_readiness' })
      ]);
      setScore(s.data); setBlindSpots(bs.data?.discoveries || []); setIntegrations(ig.data); setConsents(co.data?.consents || []); setReadiness(rd.data);
    } catch (e) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const scan = async () => {
    setScanning(true);
    try {
      await base44.functions.invoke('ncEvoSystem', { operation: 'scan_blind_spots' });
      await base44.functions.invoke('ncEvoSystem', { operation: 'evaluate_launch_readiness' });
      toast({ title: 'Scan complete', description: 'Blind spots + launch readiness evaluated' });
      load();
    } catch (e) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
    setScanning(false);
  };

  const aiScan = async () => {
    setAiScanning(true);
    try {
      await base44.functions.invoke('ncEvoSystem', { operation: 'ai_blind_spot_scan' });
      toast({ title: 'AI scan complete', description: 'New blind spots discovered' });
      load();
    } catch (e) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
    setAiScanning(false);
  };

  const seedIntegrations = async () => {
    try {
      await base44.functions.invoke('ncEvoSystem', { operation: 'seed_suggested_integrations' });
      toast({ title: 'Suggested integrations seeded' });
      load();
    } catch (e) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  };

  const registerIntegration = async () => {
    if (!newIntegration.name) return;
    try {
      await base44.functions.invoke('ncEvoSystem', { operation: 'register_integration', params: newIntegration });
      toast({ title: 'Integration registered' });
      setNewIntegration({ name: '', integration_type: 'crm', connection_mode: 'rest' });
      load();
    } catch (e) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  };

  const grantConsent = async () => {
    if (!consentForm.integration_id) return;
    try {
      await base44.functions.invoke('ncEvoSystem', {
        operation: 'grant_consent',
        params: { ...consentForm, data_requested: consentForm.data_requested.split(',').map(s => s.trim()), permissions: {} }
      });
      toast({ title: 'Consent granted' });
      setConsentForm({ integration_id: '', integration_name: '', purpose: '', benefits: '', data_requested: 'assignments,schedules,hours' });
      load();
    } catch (e) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  };

  const revokeConsent = async (id) => {
    try {
      await base44.functions.invoke('ncEvoSystem', { operation: 'revoke_consent', params: { consent_id: id } });
      toast({ title: 'Consent revoked' });
      load();
    } catch (e) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  const s = score || {};
  const readinessScores = readiness?.scores || {};
  const sortedDomains = Object.entries(readinessScores).sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Radar className="w-6 h-6 text-primary" />NC EvoSystem</h1>
          <p className="text-sm text-muted-foreground">Evolutionary intelligence layer — continuously discovers blind spots, opportunities, and launch readiness across every NC rail.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={scan} disabled={scanning}><Radar className="w-4 h-4 mr-1" />{scanning ? 'Scanning...' : 'Run Full Scan'}</Button>
          <Button onClick={aiScan} disabled={aiScanning}>{aiScanning ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}AI Blind Spot Scan</Button>
        </div>
      </div>

      {/* Evolution Score Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <ScoreCard icon={Gauge} label="Evolution Score" value={s.evolution_score} />
        <ScoreCard icon={TrendingUp} label="Innovation Score" value={s.innovation_score} />
        <ScoreCard icon={Plug} label="Integration Score" value={s.integration_score} sub={`${s.integrations_connected || 0} connected`} />
        <ScoreCard icon={Rocket} label="Launch Readiness" value={s.launch_readiness_score} />
        <ScoreCard icon={Eye} label="Founder Dependency" value={s.founder_dependency_score} sub="lower is better" />
        <ScoreCard icon={Brain} label="Knowledge Growth" value={s.knowledge_growth} />
        <ScoreCard icon={Brain} label="Memory Coverage" value={s.memory_coverage} />
        <ScoreCard icon={AlertTriangle} label="Documentation" value={s.documentation_coverage} />
        <ScoreCard icon={Zap} label="Automation" value={s.automation_coverage} />
        <ScoreCard icon={Sparkles} label="AI Coverage" value={s.ai_coverage} />
        <ScoreCard icon={AlertTriangle} label="Technical Debt" value={s.technical_debt_items} sub="open items" />
        <ScoreCard icon={Gauge} label="Platform Maturity" value={s.platform_maturity} />
      </div>

      <Tabs defaultValue="blindspots">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="blindspots">Blind Spots ({s.blind_spots_open || 0})</TabsTrigger>
          <TabsTrigger value="risks">Top Risks</TabsTrigger>
          <TabsTrigger value="opportunities">Top Opportunities</TabsTrigger>
          <TabsTrigger value="readiness">Launch Readiness</TabsTrigger>
          <TabsTrigger value="integrations">Integration Fabric</TabsTrigger>
          <TabsTrigger value="consent">Consent Center</TabsTrigger>
        </TabsList>

        <TabsContent value="blindspots" className="space-y-3">
          {blindSpots.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No blind spots discovered yet. Run a scan.</p>}
          {blindSpots.sort((a, b) => (b.rank || 0) - (a.rank || 0)).map((b) => (
            <Card key={b.id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={SEVERITY_COLOR[b.severity] || ''} variant="secondary">{b.severity}</Badge>
                      <Badge variant="outline" className="text-xs">{b.category.replace(/_/g, ' ')}</Badge>
                      {b.discovered_by === 'ai' && <Badge className="bg-violet-100 text-violet-700" variant="secondary">AI-discovered</Badge>}
                    </div>
                    <h3 className="font-semibold">{b.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{b.description || b.recommended_action}</p>
                    {(b.affected_systems || []).length > 0 && <p className="text-xs text-muted-foreground mt-1">Affects: {b.affected_systems.join(', ')}</p>}
                    {b.recommended_action && <p className="text-xs mt-2"><b>Recommendation:</b> {b.recommended_action}</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className={`px-2 py-1 rounded-full text-xs font-bold ${SCORE_COLOR(b.rank)}`}>Rank {b.rank}</div>
                    <p className="text-xs text-muted-foreground mt-1">Founder dep: {b.founder_dependency_score}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="risks" className="space-y-2">
          {(s.top_risks || []).length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No risks ranked. Run a scan.</p>}
          {(s.top_risks || []).map((r, i) => (
            <div key={i} className="flex items-start gap-3 border-b pb-2">
              <div className="w-7 h-7 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-bold text-xs flex-shrink-0">{i + 1}</div>
              <div className="flex-1 min-w-0">
                <p className="font-medium">{r.title}</p>
                <p className="text-xs text-muted-foreground">{r.risk}</p>
              </div>
              <Badge className={SEVERITY_COLOR[r.severity] || ''} variant="secondary">{r.severity}</Badge>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="opportunities" className="space-y-2">
          {(s.top_opportunities || []).length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No opportunities ranked. Run a scan.</p>}
          {(s.top_opportunities || []).map((o, i) => (
            <div key={i} className="flex items-start gap-3 border-b pb-2">
              <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs flex-shrink-0">{i + 1}</div>
              <div className="flex-1 min-w-0">
                <p className="font-medium">{o.title}</p>
                <p className="text-xs text-muted-foreground">{o.opportunity}</p>
              </div>
              <Badge variant="outline" className="text-xs">{o.category.replace(/_/g, ' ')}</Badge>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="readiness" className="space-y-3">
          <Card>
            <CardHeader><CardTitle>Launch Readiness by Domain</CardTitle><CardDescription>Overall: {readinessScores.overall || 0}% — blockers shown with risk, solution, ETA, and priority.</CardDescription></CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                {sortedDomains.filter(([d]) => d !== 'overall').map(([domain, score]) => (
                  <Card key={domain}>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold capitalize">{domain.replace(/_/g, ' ')}</h3>
                        <div className={`px-2 py-1 rounded-full text-xs font-bold ${SCORE_COLOR(score)}`}>{score}%</div>
                      </div>
                      <div className="space-y-1">
                        {(readiness.by_domain[domain] || []).filter(c => c.status !== 'pass').map((c) => (
                          <div key={c.id} className="text-xs border-l-2 pl-2 py-0.5" style={{ borderColor: c.status === 'fail' ? '#ef4444' : '#f59e0b' }}>
                            <p className="font-medium">{c.check_name}</p>
                            <p className="text-muted-foreground">{c.risk || c.blocker_reason}</p>
                            {c.solution && <p className="text-emerald-700">→ {c.solution}</p>}
                            {c.estimated_time && <p className="text-muted-foreground">ETA: {c.estimated_time}</p>}
                            <Badge variant="outline" className="text-xs mt-1">{c.recommended_priority}</Badge>
                          </div>
                        ))}
                        {(readiness.by_domain[domain] || []).filter(c => c.status === 'pass').length > 0 && (
                          <p className="text-xs text-emerald-700">✓ {(readiness.by_domain[domain] || []).filter(c => c.status === 'pass').length} checks passing</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{integrations?.total || 0} integrations · {integrations?.connected || 0} connected · {integrations?.unused || 0} unused/suggested</p>
            <Button variant="outline" onClick={seedIntegrations}><Plug className="w-4 h-4 mr-1" />Seed Suggested</Button>
          </div>
          <Card>
            <CardHeader><CardTitle>Register New Integration</CardTitle></CardHeader>
            <CardContent className="grid md:grid-cols-3 gap-2 items-end">
              <div><Label>Name</Label><Input value={newIntegration.name} onChange={(e) => setNewIntegration({ ...newIntegration, name: e.target.value })} placeholder="e.g. Custom Payroll API" /></div>
              <div><Label>Type</Label>
                <select className="w-full h-9 rounded-md border border-input px-3 text-sm" value={newIntegration.integration_type} onChange={(e) => setNewIntegration({ ...newIntegration, integration_type: e.target.value })}>
                  {['scheduling','payroll','crm','accounting','erp','hr','event_platform','inventory','dispatch','learning','communication','production','ticketing','venue','rental','security','financial','marketing','analytics','custom'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div><Label>Mode</Label>
                <select className="w-full h-9 rounded-md border border-input px-3 text-sm" value={newIntegration.connection_mode} onChange={(e) => setNewIntegration({ ...newIntegration, connection_mode: e.target.value })}>
                  {['oauth','api_key','webhook','rest','graphql','csv_import','csv_export','sdk','manual','future_api'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <Button onClick={registerIntegration} disabled={!newIntegration.name} className="md:col-span-3">Register Integration</Button>
            </CardContent>
          </Card>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {(integrations?.integrations || []).map((i) => (
              <Card key={i.id}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">{i.name}</h3>
                    <Badge variant={i.status === 'connected' ? 'default' : i.suggested ? 'secondary' : 'outline'} className="text-xs">{i.status}</Badge>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between"><span className="text-muted-foreground">Type</span><b>{i.integration_type}</b></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Mode</span><b>{i.connection_mode}</b></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Health</span><b>{i.health_score || 0}%</b></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Usage</span><b>{i.usage_count}</b></div>
                    {i.suggested && <Badge variant="secondary" className="text-xs mt-1">suggested</Badge>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="consent" className="space-y-3">
          <Card>
            <CardHeader><CardTitle>Grant Consent</CardTitle><CardDescription>Every integration explains data requested, purpose, benefits, retention, privacy, and revocation.</CardDescription></CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-2 items-end">
              <div><Label>Integration ID</Label><Input value={consentForm.integration_id} onChange={(e) => setConsentForm({ ...consentForm, integration_id: e.target.value, integration_name: (integrations?.integrations || []).find(i => i.id === e.target.value)?.name || '' })} placeholder="Integration ID" /></div>
              <div><Label>Data Requested (comma-separated)</Label><Input value={consentForm.data_requested} onChange={(e) => setConsentForm({ ...consentForm, data_requested: e.target.value })} /></div>
              <div><Label>Purpose</Label><Input value={consentForm.purpose} onChange={(e) => setConsentForm({ ...consentForm, purpose: e.target.value })} /></div>
              <div><Label>Benefits</Label><Input value={consentForm.benefits} onChange={(e) => setConsentForm({ ...consentForm, benefits: e.target.value })} /></div>
              <Button onClick={grantConsent} disabled={!consentForm.integration_id} className="md:col-span-2"><ShieldCheck className="w-4 h-4 mr-1" />Grant Consent</Button>
            </CardContent>
          </Card>
          <div className="space-y-2">
            {consents.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No consents granted yet.</p>}
            {consents.map((c) => (
              <Card key={c.id}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">{c.integration_name || 'Integration'}</h3>
                    {c.revoked ? <Badge variant="destructive" className="text-xs">revoked</Badge> : <Badge className="bg-emerald-100 text-emerald-700" variant="secondary">active</Badge>}
                  </div>
                  <div className="text-xs space-y-1">
                    <p><b>Scope:</b> {c.scope} · <b>Grantor:</b> {c.grantor_name}</p>
                    <p><b>Purpose:</b> {c.purpose}</p>
                    <p><b>Data:</b> {(c.data_requested || []).join(', ')}</p>
                    <p><b>Retention:</b> {c.retention_policy}</p>
                    {!c.revoked && <Button variant="ghost" size="sm" onClick={() => revokeConsent(c.id)} className="text-destructive mt-2">Revoke</Button>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}