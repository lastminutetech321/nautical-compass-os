import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Loader2, CreditCard, Github, Users, Music, Repeat, Layers, Store, Rocket, AlertTriangle, CheckCircle2, Clock, Zap } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const STATUS_BADGE = (s) => {
  if (s === 'ready' || s === 'code_ready') return <Badge className="bg-emerald-100 text-emerald-700" variant="secondary">{s === 'code_ready' ? 'code ready' : 'ready'}</Badge>;
  if (s === 'founder_action') return <Badge className="bg-amber-100 text-amber-700" variant="secondary">founder action</Badge>;
  if (s === 'duplicate_detected' || s === 'fail') return <Badge variant="destructive">{s.replace(/_/g, ' ')}</Badge>;
  return <Badge variant="outline">{s}</Badge>;
};

export default function ActivationCenter() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stripe, setStripe] = useState(null);
  const [github, setGithub] = useState(null);
  const [workforce, setWorkforce] = useState(null);
  const [artistVenue, setArtistVenue] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [marketplace, setMarketplace] = useState(null);
  const [founderActions, setFounderActions] = useState([]);
  const [nextTasks, setNextTasks] = useState([]);
  const [onboarding, setOnboarding] = useState({ full_name: '', email: '', phone: '', pathway: 'apprentice', experience_level: 'beginner', emergency_contact: '', transportation: '', insurance_status: 'none', career_level: 'Explorer' });
  const [onboardingResult, setOnboardingResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [creatingPlans, setCreatingPlans] = useState(false);
  const [consolidationRunning, setConsolidationRunning] = useState(false);
  const [consolidation, setConsolidation] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [s, g, w, av, sub, mk, fa, nt] = await Promise.all([
        base44.functions.invoke('ncActivation', { operation: 'stripe_readiness' }),
        base44.functions.invoke('ncActivation', { operation: 'github_canon_requirements' }),
        base44.functions.invoke('ncActivation', { operation: 'workforce_onboarding_readiness' }),
        base44.functions.invoke('ncActivation', { operation: 'artist_venue_readiness' }),
        base44.functions.invoke('ncActivation', { operation: 'subscription_readiness' }),
        base44.functions.invoke('ncActivation', { operation: 'marketplace_readiness' }),
        base44.functions.invoke('ncActivation', { operation: 'founder_actions_required' }),
        base44.functions.invoke('ncActivation', { operation: 'next_activation_tasks' })
      ]);
      setStripe(s.data); setGithub(g.data); setWorkforce(w.data); setArtistVenue(av.data);
      setSubscription(sub.data); setMarketplace(mk.data); setFounderActions(fa.data?.actions || []); setNextTasks(nt.data?.tasks || []);
    } catch (e) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const onboardWorker = async () => {
    if (!onboarding.full_name) return;
    setSubmitting(true);
    try {
      const res = await base44.functions.invoke('ncActivation', { operation: 'onboard_first_worker', params: onboarding });
      setOnboardingResult(res.data);
      toast({ title: 'First worker onboarded', description: `${onboarding.full_name} — ${onboarding.pathway}` });
    } catch (e) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
    setSubmitting(false);
  };

  const createPlans = async () => {
    setCreatingPlans(true);
    try {
      const res = await base44.functions.invoke('ncActivation', { operation: 'create_subscription_plans' });
      toast({ title: 'Subscription plans created', description: `${res.data.created} plans created` });
      load();
    } catch (e) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
    setCreatingPlans(false);
  };

  const runConsolidation = async () => {
    setConsolidationRunning(true);
    try {
      const res = await base44.functions.invoke('ncActivation', { operation: 'consolidation_scan' });
      setConsolidation(res.data);
      toast({ title: 'Consolidation scan complete', description: `${res.data.build_queue_items_created} Build Queue items created` });
    } catch (e) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
    setConsolidationRunning(false);
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Rocket className="w-6 h-6 text-primary" />NC Activation Center</h1>
        <p className="text-sm text-muted-foreground">Moving from Build Mode to Activation Mode — Stripe, GitHub Canon, Workforce, Culture, Subscriptions, Consolidation, Marketplace.</p>
      </div>

      {/* Readiness strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { label: 'Stripe', value: stripe?.readiness_score, icon: CreditCard, sub: stripe?.production_active ? 'production' : 'sandbox' },
          { label: 'GitHub Canon', value: github ? 0 : 0, icon: Github, sub: 'connector pending' },
          { label: 'Workforce', value: workforce?.readiness_score, icon: Users, sub: 'first worker' },
          { label: 'Artist/Venue', value: artistVenue?.readiness_score, icon: Music, sub: 'first onboard' },
          { label: 'Subscription', value: subscription?.readiness_score, icon: Repeat, sub: `${subscription?.existing_plans || 0} plans` },
          { label: 'Consolidation', value: consolidation ? 100 : 0, icon: Layers, sub: consolidation ? `${consolidation.build_queue_items_created} items` : 'not run' },
          { label: 'Marketplace', value: marketplace?.readiness_score, icon: Store, sub: 'prep mode' }
        ].map((m) => (
          <Card key={m.label}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-1"><m.icon className="w-4 h-4 text-primary" /><span className="text-xs font-semibold">{m.label}</span></div>
              <p className="text-2xl font-bold">{m.value ?? 0}%</p>
              <p className="text-xs text-muted-foreground">{m.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Next 10 tasks */}
      <Card>
        <CardHeader><CardTitle className="text-base">Next 10 Activation Tasks</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {nextTasks.map((t) => (
              <div key={t.rank} className="flex items-center gap-3 border-b pb-1.5">
                <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold flex-shrink-0">{t.rank}</div>
                <div className="flex-1 min-w-0"><p className="text-sm font-medium">{t.task}</p><p className="text-xs text-muted-foreground">{t.part} · ETA {t.effort}</p></div>
                <Badge variant={t.priority === 'critical' ? 'destructive' : t.priority === 'high' ? 'default' : 'secondary'} className="text-xs">{t.priority}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="stripe">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="stripe">Stripe</TabsTrigger>
          <TabsTrigger value="github">GitHub Canon</TabsTrigger>
          <TabsTrigger value="workforce">Workforce</TabsTrigger>
          <TabsTrigger value="artist">Artist/Venue</TabsTrigger>
          <TabsTrigger value="subscription">Subscriptions</TabsTrigger>
          <TabsTrigger value="consolidation">Consolidation</TabsTrigger>
          <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
          <TabsTrigger value="founder">Founder Actions</TabsTrigger>
        </TabsList>

        <TabsContent value="stripe" className="space-y-2">
          {stripe?.checks?.map((c) => (
            <Card key={c.id}><CardContent className="pt-4 flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">{STATUS_BADGE(c.status)}{c.founder_required && <Badge variant="outline" className="text-xs">founder required</Badge>}</div>
                <p className="font-medium">{c.label}</p>
                {c.risk && <p className="text-sm text-muted-foreground">Risk: {c.risk}</p>}
                {c.solution && <p className="text-sm text-emerald-700">→ {c.solution}</p>}
              </div>
              <Badge variant="outline" className="text-xs">{c.priority}</Badge>
            </CardContent></Card>
          ))}
          <Card><CardContent className="pt-4 text-xs space-y-1">
            <p><b>Secrets status:</b> STRIPE_SECRET_KEY: {stripe?.secrets_set?.STRIPE_SECRET_KEY ? '✅' : '❌'} · PUBLISHABLE: {stripe?.secrets_set?.STRIPE_PUBLISHABLE_KEY ? '✅' : '❌'} · WEBHOOK_SECRET: {stripe?.secrets_set?.STRIPE_WEBHOOK_SECRET ? '✅' : '❌'}</p>
            <p><b>Production active:</b> {stripe?.production_active ? 'yes' : 'no'} · <b>Readiness:</b> {stripe?.readiness_score}%</p>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="github" className="space-y-3">
          <Card><CardHeader><CardTitle>GitHub Canon Sync — Connection Instructions</CardTitle><CardDescription>GitHub is the source of truth for Canon. NCOS never overwrites existing Canon without Founder review.</CardDescription></CardHeader>
            <CardContent className="space-y-2">
              {github?.instructions?.map((inst, i) => <p key={i} className="text-sm border-l-2 pl-3 py-0.5">{inst}</p>)}
            </CardContent>
          </Card>
          <Card><CardHeader><CardTitle>Canon Mapping Fields</CardTitle></CardHeader><CardContent><div className="flex flex-wrap gap-2">{github?.canon_fields?.map((f) => <Badge key={f} variant="secondary" className="text-xs">{f}</Badge>)}</div></CardContent></Card>
          <Card><CardHeader><CardTitle>Sync Rules</CardTitle></CardHeader><CardContent><ul className="text-sm list-disc pl-5 space-y-1">{github?.rules?.map((r, i) => <li key={i}>{r}</li>)}</ul></CardContent></Card>
          <Card><CardContent className="pt-4"><Badge variant="destructive" className="mb-2">connector not authorized</Badge><p className="text-sm">Authorize the GitHub API connector (integration_type: <code>github</code>) via OAuth, or register a workspace-owned GitHub OAuth app for BYO shared mode. Grant <code>repo:read</code> scope on the Canon repository.</p></CardContent></Card>
        </TabsContent>

        <TabsContent value="workforce" className="space-y-3">
          <Card><CardHeader><CardTitle>First Worker Onboarding — Founder's Niece (AV Work)</CardTitle><CardDescription>Pathways: contractor, trainee, apprentice, future employee. Do not assume employee status.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid md:grid-cols-2 gap-2">
                <div><Label>Full Name</Label><Input value={onboarding.full_name} onChange={(e) => setOnboarding({ ...onboarding, full_name: e.target.value })} placeholder="e.g. Niece's name" /></div>
                <div><Label>Email</Label><Input value={onboarding.email} onChange={(e) => setOnboarding({ ...onboarding, email: e.target.value })} /></div>
                <div><Label>Phone</Label><Input value={onboarding.phone} onChange={(e) => setOnboarding({ ...onboarding, phone: e.target.value })} /></div>
                <div><Label>Pathway</Label><select className="w-full h-9 rounded-md border border-input px-3 text-sm" value={onboarding.pathway} onChange={(e) => setOnboarding({ ...onboarding, pathway: e.target.value })}>{['contractor','trainee','apprentice','future_employee'].map(p => <option key={p} value={p}>{p}</option>)}</select></div>
                <div><Label>Experience Level</Label><select className="w-full h-9 rounded-md border border-input px-3 text-sm" value={onboarding.experience_level} onChange={(e) => setOnboarding({ ...onboarding, experience_level: e.target.value })}>{['beginner','some_experience','intermediate','advanced'].map(p => <option key={p} value={p}>{p}</option>)}</select></div>
                <div><Label>Emergency Contact</Label><Input value={onboarding.emergency_contact} onChange={(e) => setOnboarding({ ...onboarding, emergency_contact: e.target.value })} /></div>
                <div><Label>Transportation</Label><Input value={onboarding.transportation} onChange={(e) => setOnboarding({ ...onboarding, transportation: e.target.value })} placeholder="e.g. has car, 30mi radius" /></div>
                <div><Label>Insurance Status</Label><select className="w-full h-9 rounded-md border border-input px-3 text-sm" value={onboarding.insurance_status} onChange={(e) => setOnboarding({ ...onboarding, insurance_status: e.target.value })}>{['none','basic','full_coverage','verified'].map(p => <option key={p} value={p}>{p}</option>)}</select></div>
              </div>
              <Button onClick={onboardWorker} disabled={submitting || !onboarding.full_name}><Users className="w-4 h-4 mr-1" />{submitting ? 'Onboarding...' : 'Onboard First Worker'}</Button>
              {onboardingResult && (
                <div className="border rounded-lg p-3 bg-emerald-50 space-y-1 text-sm">
                  <p className="font-semibold">✅ Onboarded</p>
                  <p>Profile ID: {onboardingResult.profile?.id || '—'}</p>
                  <p>Consent: {onboardingResult.consent ? 'granted' : '—'} · Passport: {onboardingResult.passport ? 'created' : '—'} · Ledger: {onboardingResult.ledger ? 'initialized' : '—'} · Trust baseline: {onboardingResult.trust ? 'set' : '—'}</p>
                  <p className="text-xs">Next: {onboardingResult.next_steps?.join(' · ')}</p>
                </div>
              )}
            </CardContent>
          </Card>
          <Card><CardHeader><CardTitle>Onboarding Readiness ({workforce?.readiness_score}%)</CardTitle></CardHeader><CardContent><div className="space-y-1">{workforce?.steps?.map((s) => <div key={s.id} className="flex items-center justify-between text-sm"><span>{s.label}</span>{STATUS_BADGE(s.status)}</div>)}</div></CardContent></Card>
        </TabsContent>

        <TabsContent value="artist" className="space-y-2">
          {artistVenue?.steps?.map((s) => (
            <Card key={s.id}><CardContent className="pt-4 flex items-center justify-between"><div><p className="font-medium">{s.label}</p><p className="text-xs text-muted-foreground">{s.entity}</p></div>{STATUS_BADGE(s.status)}</CardContent></Card>
          ))}
        </TabsContent>

        <TabsContent value="subscription" className="space-y-3">
          <Card><CardHeader><CardTitle>Subscription Tiers</CardTitle><CardDescription>First real paid subscription path. Production payments not activated until Founder provides Stripe secrets + approves.</CardDescription></CardHeader>
            <CardContent><div className="grid md:grid-cols-2 gap-2">
              {subscription?.tiers?.map((t) => (
                <div key={t.id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between"><h3 className="font-semibold">{t.label}</h3><Badge variant={t.tier === 'free' ? 'secondary' : 'default'}>${t.price}/mo</Badge></div>
                  <p className="text-sm text-muted-foreground mt-1">{t.description}</p>
                </div>
              ))}
            </div></CardContent>
          </Card>
          <Button onClick={createPlans} disabled={creatingPlans}><Repeat className="w-4 h-4 mr-1" />{creatingPlans ? 'Creating...' : 'Create 5 Subscription Plans'}</Button>
          <Card><CardHeader><CardTitle>Subscription Readiness ({subscription?.readiness_score}%)</CardTitle></CardHeader><CardContent><div className="space-y-1">{subscription?.checks?.map((c) => <div key={c.id} className="flex items-center justify-between text-sm"><div><span className="font-medium">{c.label}</span>{c.detail && <span className="text-xs text-muted-foreground ml-2">({c.detail})</span>}</div>{STATUS_BADGE(c.status)}</div>)}</div></CardContent></Card>
        </TabsContent>

        <TabsContent value="consolidation" className="space-y-3">
          <Button onClick={runConsolidation} disabled={consolidationRunning}><Layers className="w-4 h-4 mr-1" />{consolidationRunning ? 'Scanning...' : 'Run Consolidation Scan'}</Button>
          {consolidation && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{consolidation.build_queue_items_created} Build Queue items created (duplicates skipped). Nothing deleted automatically.</p>
              {consolidation.findings?.map((f, i) => (
                <Card key={i}><CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-1"><h3 className="font-semibold">{f.title}</h3><div className="flex gap-1"><Badge variant={f.severity === 'medium' ? 'default' : 'secondary'} className="text-xs">{f.severity}</Badge>{f.build_queue_item_created ? <Badge className="bg-emerald-100 text-emerald-700" variant="secondary">queued</Badge> : <Badge variant="outline" className="text-xs">exists</Badge>}</div></div>
                  <p className="text-sm">{f.recommendation}</p>
                  <p className="text-xs text-muted-foreground mt-1">Entities: {f.entities.join(', ')}</p>
                </CardContent></Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="marketplace" className="space-y-2">
          {marketplace?.steps?.map((s) => (
            <Card key={s.id}><CardContent className="pt-4 flex items-center justify-between"><div><p className="font-medium">{s.label}</p><p className="text-xs text-muted-foreground">{s.entity}</p></div>{STATUS_BADGE(s.status)}</CardContent></Card>
          ))}
          <Card><CardContent className="pt-4 text-sm text-muted-foreground">Marketplace expansion is in prep mode — activate venue/workforce/artist/service provider marketplaces based on real usage data.</CardContent></Card>
        </TabsContent>

        <TabsContent value="founder" className="space-y-2">
          {founderActions.map((a, i) => (
            <Card key={i}><CardContent className="pt-4 flex items-start justify-between gap-3"><div><Badge variant="outline" className="text-xs mb-1">{a.part}</Badge><p className="font-medium">{a.action}</p></div><Badge variant={a.priority === 'critical' ? 'destructive' : a.priority === 'high' ? 'default' : 'secondary'} className="text-xs">{a.priority}</Badge></CardContent></Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}