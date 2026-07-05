import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Loader2, Users, Briefcase, GraduationCap, Trophy, HeartHandshake, Sparkles, TrendingUp, Award, UserCheck, DollarSign } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const SERVICE_MODELS = [
  { value: 'temporary_assignment', label: 'Temporary Assignment' },
  { value: 'project_assignment', label: 'Project Assignment' },
  { value: 'retainer', label: 'Retainer' },
  { value: 'dedicated_team', label: 'Dedicated Team' },
  { value: 'managed_workforce', label: 'Managed Workforce' },
  { value: 'direct_hire_conversion', label: 'Direct Hire Conversion' },
  { value: 'long_term_partnership', label: 'Long-Term Partnership' },
  { value: 'enterprise_staffing', label: 'Enterprise Staffing' }
];

function Metric({ icon: Icon, label, value, sub, color }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color || 'bg-primary/10'}`}>
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground truncate">{label}</p>
            <p className="text-xl font-bold">{value}</p>
            {sub && <p className="text-xs text-muted-foreground truncate">{sub}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function TalentPartnership() {
  const { toast } = useToast();
  const [metrics, setMetrics] = useState(null);
  const [levels, setLevels] = useState([]);
  const [alumni, setAlumni] = useState(null);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [coachLoading, setCoachLoading] = useState(false);
  const [coachPlan, setCoachPlan] = useState(null);
  const [coachWorkerId, setCoachWorkerId] = useState('');
  const [placement, setPlacement] = useState({ worker_id: '', worker_name: '', client_name: '', service_model: 'temporary_assignment', role_title: '', start_date: '', end_date: '', rate: 0, rate_type: 'hourly', total_revenue: 0, director_name: '', career_level: '', client_satisfaction: 80, worker_satisfaction: 80, contribution_generated: 10, trust_impact: 5 });
  const [recording, setRecording] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [m, lv, al, cl] = await Promise.all([
        base44.functions.invoke('ncTalentPartnership', { operation: 'get_executive_metrics' }),
        base44.functions.invoke('ncTalentPartnership', { operation: 'get_career_levels' }),
        base44.functions.invoke('ncTalentPartnership', { operation: 'get_alumni_dashboard' }),
        base44.functions.invoke('ncTalentPartnership', { operation: 'get_client_relationship' })
      ]);
      setMetrics(m.data); setLevels(lv.data?.levels || []); setAlumni(al.data); setClients(cl.data?.relationships || []);
    } catch (e) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const recordPlacement = async () => {
    if (!placement.worker_name || !placement.client_name) return;
    setRecording(true);
    try {
      await base44.functions.invoke('ncTalentPartnership', { operation: 'record_placement', params: placement });
      toast({ title: 'Placement recorded', description: `${placement.worker_name} → ${placement.client_name}` });
      load();
    } catch (e) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
    setRecording(false);
  };

  const runCoach = async () => {
    if (!coachWorkerId.trim()) return;
    setCoachLoading(true);
    try {
      const res = await base44.functions.invoke('ncTalentPartnership', { operation: 'ai_career_coach', params: { worker_id: coachWorkerId, worker_name: coachWorkerId } });
      setCoachPlan(res.data);
    } catch (e) { toast({ title: 'Coach error', description: e.message, variant: 'destructive' }); }
    setCoachLoading(false);
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  const m = metrics || {};

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><HeartHandshake className="w-6 h-6 text-primary" />NC Talent Partnership</h1>
        <p className="text-sm text-muted-foreground">Career Operating System — partnership, attribution, placement, alumni, and lifetime value for every workforce member.</p>
      </div>

      {/* Executive Workforce Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <Metric icon={Users} label="Active Workers" value={m.active_workers || 0} sub={`${m.workers_ready || 0} ready`} color="bg-blue-100" />
        <Metric icon={Briefcase} label="Active Placements" value={m.active_placements || 0} sub={`${m.completed_placements || 0} completed`} color="bg-emerald-100" />
        <Metric icon={Trophy} label="Repeat Clients" value={m.repeat_clients || 0} sub={`${m.enterprise_partnerships || 0} enterprise`} color="bg-violet-100" />
        <Metric icon={DollarSign} label="Revenue (Workforce)" value={`$${(m.revenue_by_workforce || 0).toLocaleString()}`} sub={`LTV $${(m.lifetime_value_by_client || 0).toLocaleString()}`} color="bg-amber-100" />
        <Metric icon={HeartHandshake} label="Alumni Network" value={m.alumni_network || 0} sub={`${m.alumni_returned || 0} returned`} color="bg-pink-100" />
        <Metric icon={UserCheck} label="Avg Satisfaction" value={`${m.avg_client_satisfaction || 0}/100`} sub={`${m.direct_hire_conversions || 0} conversions`} color="bg-cyan-100" />
      </div>

      <Tabs defaultValue="career">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="career">Career Levels</TabsTrigger>
          <TabsTrigger value="placement">Record Placement</TabsTrigger>
          <TabsTrigger value="coach">AI Career Coach</TabsTrigger>
          <TabsTrigger value="clients">Client Relationships</TabsTrigger>
          <TabsTrigger value="alumni">Alumni Network</TabsTrigger>
          <TabsTrigger value="director">Director Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="career" className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Founder-configurable career growth path. Default template seeded: Explorer → Enterprise Builder.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {levels.map((lvl, idx) => (
              <Card key={lvl.id} className="border-l-4" style={{ borderLeftColor: `hsl(${(idx * 30) % 360} 70% 50%)` }}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">{lvl.level_order}</div>
                      <h3 className="font-semibold">{lvl.name}</h3>
                    </div>
                    {lvl.is_default_template && <Badge variant="outline" className="text-xs">default</Badge>}
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between"><span className="text-muted-foreground">Readiness</span><b>{lvl.min_readiness}</b></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Trust</span><b>{lvl.min_trust}</b></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Contribution</span><b>{lvl.min_contribution}</b></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Experience (h)</span><b>{lvl.min_experience_hours}</b></div>
                    {lvl.leadership_required && <div className="flex justify-between"><span className="text-muted-foreground">Leadership</span><Badge variant="secondary" className="text-xs">required</Badge></div>}
                  </div>
                  {lvl.pay_recommendations && (
                    <div className="mt-3 pt-2 border-t text-xs">
                      <p className="font-semibold mb-1">Pay Recommendations</p>
                      {lvl.pay_recommendations.min_hourly_rate ? <div>Hourly: ${lvl.pay_recommendations.min_hourly_rate}–${lvl.pay_recommendations.max_hourly_rate}</div> : null}
                      {lvl.pay_recommendations.salary_range_low ? <div>Salary: ${lvl.pay_recommendations.salary_range_low?.toLocaleString()}–${lvl.pay_recommendations.salary_range_high?.toLocaleString()}</div> : null}
                      {lvl.pay_recommendations.bonus_pct ? <div>Bonus: {lvl.pay_recommendations.bonus_pct}%</div> : null}
                      {lvl.pay_recommendations.residual_pct ? <div>Residual: {lvl.pay_recommendations.residual_pct}%</div> : null}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="placement" className="space-y-3">
          <Card>
            <CardHeader><CardTitle>Record Placement</CardTitle><CardDescription>Creates placement, permanent attribution, client relationship, living ledger, and passport entries; auto-updates contribution + trust.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid md:grid-cols-2 gap-3">
                <div><Label>Worker Name</Label><Input value={placement.worker_name} onChange={(e) => setPlacement({ ...placement, worker_name: e.target.value })} /></div>
                <div><Label>Worker ID</Label><Input value={placement.worker_id} onChange={(e) => setPlacement({ ...placement, worker_id: e.target.value })} /></div>
                <div><Label>Client Name</Label><Input value={placement.client_name} onChange={(e) => setPlacement({ ...placement, client_name: e.target.value })} /></div>
                <div><Label>Role Title</Label><Input value={placement.role_title} onChange={(e) => setPlacement({ ...placement, role_title: e.target.value })} /></div>
                <div><Label>Service Model</Label>
                  <select className="w-full h-9 rounded-md border border-input px-3 text-sm" value={placement.service_model} onChange={(e) => setPlacement({ ...placement, service_model: e.target.value })}>
                    {SERVICE_MODELS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div><Label>Career Level</Label><Input value={placement.career_level} onChange={(e) => setPlacement({ ...placement, career_level: e.target.value })} placeholder="e.g. Stagehand" /></div>
                <div><Label>Start Date</Label><Input type="date" value={placement.start_date} onChange={(e) => setPlacement({ ...placement, start_date: e.target.value })} /></div>
                <div><Label>End Date</Label><Input type="date" value={placement.end_date} onChange={(e) => setPlacement({ ...placement, end_date: e.target.value })} /></div>
                <div><Label>Rate</Label><Input type="number" value={placement.rate} onChange={(e) => setPlacement({ ...placement, rate: +e.target.value })} /></div>
                <div><Label>Total Revenue</Label><Input type="number" value={placement.total_revenue} onChange={(e) => setPlacement({ ...placement, total_revenue: +e.target.value })} /></div>
                <div><Label>Director Name</Label><Input value={placement.director_name} onChange={(e) => setPlacement({ ...placement, director_name: e.target.value })} /></div>
                <div><Label>Client Satisfaction (0-100)</Label><Input type="number" value={placement.client_satisfaction} onChange={(e) => setPlacement({ ...placement, client_satisfaction: +e.target.value })} /></div>
              </div>
              <Button onClick={recordPlacement} disabled={recording || !placement.worker_name || !placement.client_name}><Briefcase className="w-4 h-4 mr-1" />{recording ? 'Recording...' : 'Record Placement + Attribution'}</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="coach" className="space-y-3">
          <Card>
            <CardHeader><CardTitle>AI Career Coach</CardTitle><CardDescription>Generates a personalized development plan and saves it to the worker's living ledger.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input placeholder="Worker ID" value={coachWorkerId} onChange={(e) => setCoachWorkerId(e.target.value)} />
                <Button onClick={runCoach} disabled={coachLoading || !coachWorkerId.trim()}>{coachLoading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}Generate Plan</Button>
              </div>
              {coachPlan?.plan && (
                <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="secondary">Current: {coachPlan.plan.current_level_estimate}</Badge>
                    <Badge className="bg-primary text-white">Next: {coachPlan.plan.next_level}</Badge>
                  </div>
                  {coachPlan.plan.gap_analysis?.length > 0 && (
                    <div><p className="text-sm font-semibold mb-1">Gap Analysis</p><ul className="text-sm list-disc pl-5 space-y-0.5">{coachPlan.plan.gap_analysis.map((g, i) => <li key={i}>{g}</li>)}</ul></div>
                  )}
                  {coachPlan.plan.recommended_actions?.length > 0 && (
                    <div><p className="text-sm font-semibold mb-1">Recommended Actions</p><ul className="text-sm list-disc pl-5 space-y-0.5">{coachPlan.plan.recommended_actions.map((a, i) => <li key={i}>{a}</li>)}</ul></div>
                  )}
                  {coachPlan.plan.thirty_day_goals?.length > 0 && (
                    <div><p className="text-sm font-semibold mb-1">30-Day Goals</p><ul className="text-sm list-disc pl-5 space-y-0.5">{coachPlan.plan.thirty_day_goals.map((g, i) => <li key={i}>{g}</li>)}</ul></div>
                  )}
                  {coachPlan.plan.motivation_note && <p className="text-sm italic text-muted-foreground">"{coachPlan.plan.motivation_note}"</p>}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clients" className="space-y-3">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {clients.length === 0 && <p className="text-sm text-muted-foreground col-span-full text-center py-8">No client relationships yet. Record a placement to create one.</p>}
            {clients.map((c) => (
              <Card key={c.id}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">{c.client_name}</h3>
                    <Badge variant="outline" className="text-xs">{c.relationship_status}</Badge>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between"><span className="text-muted-foreground">Total Assignments</span><b>{c.total_assignments}</b></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Lifetime Value</span><b>${(c.lifetime_value || 0).toLocaleString()}</b></div>
                    <div className="flex gap-1 flex-wrap mt-2">
                      {c.repeat_client && <Badge variant="secondary" className="text-xs">repeat</Badge>}
                      {c.enterprise_partner && <Badge className="bg-violet-100 text-violet-700" variant="secondary">enterprise</Badge>}
                      {c.introduced_by_nc && <Badge variant="outline" className="text-xs">NC-introduced</Badge>}
                      {c.certified_through_nc && <Badge variant="outline" className="text-xs">NC-certified</Badge>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="alumni" className="space-y-3">
          {alumni && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              <Metric icon={HeartHandshake} label="Total Alumni" value={alumni.total_alumni || 0} color="bg-pink-100" />
              <Metric icon={GraduationCap} label="Mentors" value={alumni.mentors || 0} color="bg-blue-100" />
              <Metric icon={UserCheck} label="Returned to NC" value={alumni.returned || 0} color="bg-emerald-100" />
              <Metric icon={TrendingUp} label="Referrals" value={alumni.total_referrals || 0} color="bg-amber-100" />
            </div>
          )}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {(alumni?.alumni || []).length === 0 && <p className="text-sm text-muted-foreground col-span-full text-center py-8">No alumni profiles yet.</p>}
            {(alumni?.alumni || []).map((a) => (
              <Card key={a.id}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">{a.worker_name}</h3>
                    <Badge className="bg-pink-100 text-pink-700" variant="secondary">{a.alumni_role.replace(/_/g, ' ')}</Badge>
                  </div>
                  <div className="space-y-1 text-xs">
                    {a.current_role && <div>Now: {a.current_role}{a.current_company ? ` @ ${a.current_company}` : ''}</div>}
                    <div>Mentorships: {a.mentorship_count} · Referrals: {a.referral_count}</div>
                    {a.return_to_nc && <Badge className="bg-emerald-100 text-emerald-700" variant="secondary">returned to NC</Badge>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="director" className="space-y-3">
          <Card>
            <CardHeader><CardTitle>Director Performance</CardTitle><CardDescription>Placements, revenue, and satisfaction by director — drives director compensation and recognition.</CardDescription></CardHeader>
            <CardContent>
              {Object.keys(m.director_performance || {}).length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No director activity yet.</p>}
              <div className="space-y-2">
                {Object.entries(m.director_performance || {}).map(([dir, perf]) => (
                  <div key={dir} className="flex items-center justify-between border-b pb-2">
                    <div>
                      <p className="font-medium">{dir}</p>
                      <p className="text-xs text-muted-foreground">{perf.placements} placements · ${perf.revenue.toLocaleString()} revenue</p>
                    </div>
                    <Badge variant="secondary">{perf.placements ? Math.round(perf.satisfaction / perf.placements) : 0}/100</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}