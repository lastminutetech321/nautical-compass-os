import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Compass, MessageSquare, ClipboardList, Map, Brain, Shield, Sparkles, CheckCircle2, TrendingUp, Heart, AlertTriangle, BookOpen } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function NCDirectorAssistant() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("dashboard");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('ncDirectorAssistant', { operation: 'dashboard' });
      setData(res.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Compass className="w-8 h-8 text-primary animate-pulse" /></div>;
  if (!data) return <div className="p-8 text-center text-muted-foreground">Failed to load.</div>;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Compass className="w-6 h-6" /> NC Director Navigation System</h1>
        <p className="text-muted-foreground text-sm mt-1">Build trust before revenue. Educate, guide, support — never pressure.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="pt-4 pb-4 flex items-center gap-3"><MessageSquare className="w-5 h-5 text-blue-500" /><div><p className="text-2xl font-bold">{data.active_conversations}</p><p className="text-xs text-muted-foreground">Active Conversations</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 pb-4 flex items-center gap-3"><ClipboardList className="w-5 h-5 text-amber-500" /><div><p className="text-2xl font-bold">{data.pending_intakes}</p><p className="text-xs text-muted-foreground">Pending Intakes</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 pb-4 flex items-center gap-3"><Map className="w-5 h-5 text-emerald-500" /><div><p className="text-2xl font-bold">{data.active_journeys}</p><p className="text-xs text-muted-foreground">Active Journeys</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 pb-4 flex items-center gap-3"><Heart className="w-5 h-5 text-rose-500" /><div><p className="text-2xl font-bold">{data.member_trust_scores}</p><p className="text-xs text-muted-foreground">Trust Scores Tracked</p></div></CardContent></Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="dashboard"><Sparkles className="w-3.5 h-3.5 mr-1.5" /> Dashboard</TabsTrigger>
          <TabsTrigger value="prepare"><Brain className="w-3.5 h-3.5 mr-1.5" /> Prepare Conversation</TabsTrigger>
          <TabsTrigger value="intake"><ClipboardList className="w-3.5 h-3.5 mr-1.5" /> Member Intake</TabsTrigger>
          <TabsTrigger value="journeys"><Map className="w-3.5 h-3.5 mr-1.5" /> Member Journeys</TabsTrigger>
          <TabsTrigger value="conversations"><MessageSquare className="w-3.5 h-3.5 mr-1.5" /> Conversations</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-4">
          <DashboardTab data={data} />
        </TabsContent>
        <TabsContent value="prepare" className="mt-4">
          <PrepareTab onRefresh={load} />
        </TabsContent>
        <TabsContent value="intake" className="mt-4">
          <IntakeTab onRefresh={load} />
        </TabsContent>
        <TabsContent value="journeys" className="mt-4">
          <JourneyTab journeys={data.journeys} onRefresh={load} />
        </TabsContent>
        <TabsContent value="conversations" className="mt-4">
          <ConversationTab conversations={data.conversations} onRefresh={load} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DashboardTab({ data }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-4">
          <h3 className="font-semibold flex items-center gap-2 mb-2"><Shield className="w-4 h-4 text-amber-500" /> Compliance Guardrails</h3>
          <div className="space-y-2 text-sm">
            <p className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" /> Never invent facts or promise legal outcomes</p>
            <p className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" /> Never pressure someone to subscribe</p>
            <p className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" /> Never exaggerate capabilities</p>
            <p className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" /> Acknowledge uncertainty and recommend professional assistance when needed</p>
            <p className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" /> Value is demonstrated before revenue is requested</p>
          </div>
        </CardContent>
      </Card>

      {data.trust_scores.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <h3 className="font-semibold mb-2 flex items-center gap-2"><Heart className="w-4 h-4 text-rose-500" /> Member Trust Scores</h3>
            <div className="space-y-2">
              {data.trust_scores.map(t => (
                <div key={t.id} className="flex justify-between items-center">
                  <span className="text-sm">{t.entity_name}</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${t.score >= 75 ? 'text-emerald-500' : t.score >= 50 ? 'text-amber-500' : 'text-red-500'}`}>{t.score}</span>
                    <Badge variant="outline" className="text-xs capitalize">{t.trend}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {data.conversations.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <h3 className="font-semibold mb-2">Active Conversations</h3>
            <div className="space-y-2">
              {data.conversations.slice(0, 5).map(c => (
                <div key={c.id} className="flex justify-between items-center text-sm">
                  <span>{c.member_name}</span>
                  <Badge variant="secondary" className="text-xs capitalize">{c.stage}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function PrepareTab({ onRefresh }) {
  const [form, setForm] = useState({ member_name: '', member_id: '', purpose: 'General check-in' });
  const [guidance, setGuidance] = useState(null);
  const [busy, setBusy] = useState(false);

  const prepare = async () => {
    if (!form.member_name) return;
    setBusy(true);
    try {
      const res = await base44.functions.invoke('ncDirectorAssistant', { operation: 'prepareConversation', params: form });
      setGuidance(res.data);
      onRefresh();
    } catch (e) { console.error(e); }
    setBusy(false);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-4 space-y-3">
          <h3 className="font-semibold flex items-center gap-2"><Brain className="w-4 h-4 text-violet-500" /> Prepare for Conversation</h3>
          <p className="text-xs text-muted-foreground">The AI assistant prepares questions, resources, and compliance reminders for your conversation.</p>
          <div><Label className="text-xs">Member Name</Label><Input value={form.member_name} onChange={e => setForm({ ...form, member_name: e.target.value })} placeholder="Member name" /></div>
          <div><Label className="text-xs">Member ID (optional)</Label><Input value={form.member_id} onChange={e => setForm({ ...form, member_id: e.target.value })} placeholder="If known" /></div>
          <div><Label className="text-xs">Purpose</Label><Input value={form.purpose} onChange={e => setForm({ ...form, purpose: e.target.value })} /></div>
          <Button onClick={prepare} disabled={busy || !form.member_name}>{busy ? 'Preparing...' : 'Prepare Conversation'}</Button>
        </CardContent>
      </Card>

      {guidance?.guidance && (
        <Card>
          <CardContent className="pt-4 space-y-4">
            <h3 className="font-semibold flex items-center gap-2"><Sparkles className="w-4 h-4 text-violet-500" /> AI Preparation Guide</h3>
            {guidance.guidance.opening_questions?.length > 0 && (
              <div><p className="text-xs font-medium mb-1">Suggested Opening Questions</p><ul className="space-y-1">{guidance.guidance.opening_questions.map((q, i) => <li key={i} className="text-sm flex items-start gap-2"><MessageSquare className="w-3 h-3 text-muted-foreground mt-1 flex-shrink-0" /> {q}</li>)}</ul></div>
            )}
            {guidance.guidance.needs_to_discover?.length > 0 && (
              <div><p className="text-xs font-medium mb-1">Needs to Discover</p><ul className="space-y-1">{guidance.guidance.needs_to_discover.map((q, i) => <li key={i} className="text-sm flex items-start gap-2"><Brain className="w-3 h-3 text-muted-foreground mt-1 flex-shrink-0" /> {q}</li>)}</ul></div>
            )}
            {guidance.guidance.concepts_to_explain?.length > 0 && (
              <div><p className="text-xs font-medium mb-1">Concepts to Be Ready to Explain</p><ul className="space-y-1">{guidance.guidance.concepts_to_explain.map((q, i) => <li key={i} className="text-sm flex items-start gap-2"><BookOpen className="w-3 h-3 text-muted-foreground mt-1 flex-shrink-0" /> {q}</li>)}</ul></div>
            )}
            {guidance.guidance.misunderstandings?.length > 0 && (
              <div><p className="text-xs font-medium mb-1">Potential Misunderstandings</p><ul className="space-y-1">{guidance.guidance.misunderstandings.map((q, i) => <li key={i} className="text-sm flex items-start gap-2"><AlertTriangle className="w-3 h-3 text-amber-500 mt-1 flex-shrink-0" /> {q}</li>)}</ul></div>
            )}
            {guidance.guidance.compliance_reminders?.length > 0 && (
              <div className="bg-amber-50 dark:bg-amber-950/20 p-3 rounded"><p className="text-xs font-medium mb-1 text-amber-600">Compliance Reminders</p><ul className="space-y-1">{guidance.guidance.compliance_reminders.map((q, i) => <li key={i} className="text-sm flex items-start gap-2"><Shield className="w-3 h-3 text-amber-500 mt-1 flex-shrink-0" /> {q}</li>)}</ul></div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function IntakeTab({ onRefresh }) {
  const [form, setForm] = useState({
    member_name: '', member_id: '', why_came_to_nc: '', current_challenges: [], goals: [], urgent_issues: [],
    long_term_goals: [], occupation: '', education: '', business_interests: [], legal_interests: [],
    community_interests: [], financial_goals: [], preferred_communication: 'concise', preferred_learning: 'reading', current_nc_knowledge: 'none'
  });
  const [inputValues, setInputValues] = useState({});
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  const arrUpdate = (field, value) => setForm({ ...form, [field]: value ? value.split(',').map(s => s.trim()).filter(Boolean) : [] });

  const submit = async () => {
    if (!form.member_name) return;
    setBusy(true);
    try {
      const res = await base44.functions.invoke('ncDirectorAssistant', { operation: 'saveIntake', params: form });
      setResult(res.data);
      onRefresh();
    } catch (e) { console.error(e); }
    setBusy(false);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-4 space-y-4">
          <h3 className="font-semibold flex items-center gap-2"><ClipboardList className="w-4 h-4 text-amber-500" /> Guided Member Intake</h3>
          <p className="text-xs text-muted-foreground">Discover why they came, their challenges, goals, and the best starting point within NC.</p>

          <div><Label className="text-xs">Member Name *</Label><Input value={form.member_name} onChange={e => setForm({ ...form, member_name: e.target.value })} /></div>
          <div><Label className="text-xs">Why did they come to NC?</Label><Textarea value={form.why_came_to_nc} onChange={e => setForm({ ...form, why_came_to_nc: e.target.value })} rows={2} /></div>

          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Current Challenges (comma-separated)</Label><Input value={inputValues.current_challenges || ''} onChange={e => { setInputValues({ ...inputValues, current_challenges: e.target.value }); arrUpdate('current_challenges', e.target.value); }} /></div>
            <div><Label className="text-xs">Goals (comma-separated)</Label><Input value={inputValues.goals || ''} onChange={e => { setInputValues({ ...inputValues, goals: e.target.value }); arrUpdate('goals', e.target.value); }} /></div>
            <div><Label className="text-xs">Urgent Issues</Label><Input value={inputValues.urgent_issues || ''} onChange={e => { setInputValues({ ...inputValues, urgent_issues: e.target.value }); arrUpdate('urgent_issues', e.target.value); }} /></div>
            <div><Label className="text-xs">Long-term Goals</Label><Input value={inputValues.long_term_goals || ''} onChange={e => { setInputValues({ ...inputValues, long_term_goals: e.target.value }); arrUpdate('long_term_goals', e.target.value); }} /></div>
            <div><Label className="text-xs">Occupation</Label><Input value={form.occupation} onChange={e => setForm({ ...form, occupation: e.target.value })} /></div>
            <div><Label className="text-xs">Education</Label><Input value={form.education} onChange={e => setForm({ ...form, education: e.target.value })} /></div>
            <div><Label className="text-xs">Business Interests</Label><Input value={inputValues.business_interests || ''} onChange={e => { setInputValues({ ...inputValues, business_interests: e.target.value }); arrUpdate('business_interests', e.target.value); }} /></div>
            <div><Label className="text-xs">Legal Interests</Label><Input value={inputValues.legal_interests || ''} onChange={e => { setInputValues({ ...inputValues, legal_interests: e.target.value }); arrUpdate('legal_interests', e.target.value); }} /></div>
            <div><Label className="text-xs">Community Interests</Label><Input value={inputValues.community_interests || ''} onChange={e => { setInputValues({ ...inputValues, community_interests: e.target.value }); arrUpdate('community_interests', e.target.value); }} /></div>
            <div><Label className="text-xs">Financial Goals</Label><Input value={inputValues.financial_goals || ''} onChange={e => { setInputValues({ ...inputValues, financial_goals: e.target.value }); arrUpdate('financial_goals', e.target.value); }} /></div>
            <div><Label className="text-xs">Preferred Communication</Label>
              <select className="w-full border rounded px-2 py-1.5 text-sm" value={form.preferred_communication} onChange={e => setForm({ ...form, preferred_communication: e.target.value })}>
                {['concise', 'detailed', 'visual', 'data_driven', 'narrative'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div><Label className="text-xs">Preferred Learning</Label>
              <select className="w-full border rounded px-2 py-1.5 text-sm" value={form.preferred_learning} onChange={e => setForm({ ...form, preferred_learning: e.target.value })}>
                {['reading', 'video', 'hands_on', 'mentor', 'self_directed'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div><Label className="text-xs">Current NC Knowledge</Label>
              <select className="w-full border rounded px-2 py-1.5 text-sm" value={form.current_nc_knowledge} onChange={e => setForm({ ...form, current_nc_knowledge: e.target.value })}>
                {['none', 'basic', 'intermediate', 'advanced'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <Button onClick={submit} disabled={busy || !form.member_name}>{busy ? 'Processing intake...' : 'Complete Intake & Generate Journey'}</Button>
        </CardContent>
      </Card>

      {result?.recommendations && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <h3 className="font-semibold flex items-center gap-2"><Map className="w-4 h-4 text-emerald-500" /> Recommended Journey</h3>
            <div className="bg-emerald-50 dark:bg-emerald-950/20 p-3 rounded">
              <p className="text-xs font-medium text-emerald-600">Recommended Starting Point</p>
              <p className="text-sm">{result.recommendations.recommended_starting_point}</p>
            </div>
            {result.recommendations.today_next_step && (
              <div><p className="text-xs font-medium">Today's Next Step</p><p className="text-sm">{result.recommendations.today_next_step}</p></div>
            )}
            {result.recommendations.this_week_priorities?.length > 0 && (
              <div><p className="text-xs font-medium mb-1">This Week's Priorities</p><ul className="space-y-1">{result.recommendations.this_week_priorities.map((p, i) => <li key={i} className="text-sm">• {p}</li>)}</ul></div>
            )}
            {result.recommendations.recommended_rails?.length > 0 && (
              <div><p className="text-xs font-medium mb-1">Recommended Rails</p><div className="flex gap-2 flex-wrap">{result.recommendations.recommended_rails.map((r, i) => <Badge key={i} variant="secondary" className="text-xs">{r}</Badge>)}</div></div>
            )}
            {result.recommendations.recommended_compasses?.length > 0 && (
              <div><p className="text-xs font-medium mb-1">Recommended Compasses</p><div className="flex gap-2 flex-wrap">{result.recommendations.recommended_compasses.map((r, i) => <Badge key={i} variant="secondary" className="text-xs">{r}</Badge>)}</div></div>
            )}
            {result.recommendations.milestones?.length > 0 && (
              <div><p className="text-xs font-medium mb-1">Milestones</p><ul className="space-y-1">{result.recommendations.milestones.map((m, i) => <li key={i} className="text-sm flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-muted-foreground" /> {m.title || m.name || m.description || JSON.stringify(m).slice(0, 60)}</li>)}</ul></div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function JourneyTab({ journeys, onRefresh }) {
  const [selected, setSelected] = useState(null);
  const completeMilestone = async (journeyId, milestoneId) => {
    try {
      await base44.functions.invoke('ncDirectorAssistant', { operation: 'completeMilestone', params: { journey_id: journeyId, milestone_id: milestoneId } });
      onRefresh();
      setSelected(null);
    } catch (e) { console.error(e); }
  };

  return (
    <div className="space-y-3">
      <div>
        <h3 className="font-semibold flex items-center gap-2"><Map className="w-4 h-4 text-emerald-500" /> Member Journeys</h3>
        <p className="text-xs text-muted-foreground">Personalized journeys. Next steps, learning modules, recommended compasses. Progress celebrated as milestones complete.</p>
      </div>
      {journeys.length === 0 ? (
        <Card><CardContent className="pt-6 pb-6 text-center text-muted-foreground text-sm">No active journeys yet. Complete an intake to generate one.</CardContent></Card>
      ) : journeys.map(j => (
        <Card key={j.id}>
          <CardContent className="pt-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h4 className="font-medium text-sm">{j.member_name}</h4>
                <Badge variant="secondary" className="text-xs capitalize">{j.current_stage}</Badge>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold">{j.progress_pct}%</p>
                <p className="text-xs text-muted-foreground">{j.completed_milestones}/{j.total_milestones} milestones</p>
              </div>
            </div>
            {j.today_next_step && <p className="text-xs mb-2"><span className="font-medium">Today:</span> {j.today_next_step}</p>}
            <div className="flex gap-1 flex-wrap">
              {(j.recommended_rails || []).map((r, i) => <Badge key={`r${i}`} variant="outline" className="text-xs">{r}</Badge>)}
              {(j.recommended_compasses || []).map((r, i) => <Badge key={`c${i}`} variant="outline" className="text-xs">{r}</Badge>)}
            </div>
            {j.milestones?.length > 0 && (
              <Button size="sm" variant="ghost" className="mt-2 text-xs" onClick={() => setSelected(selected === j.id ? null : j.id)}>View milestones</Button>
            )}
            {selected === j.id && (
              <div className="mt-2 space-y-1 border-t pt-2">
                {j.milestones.map((m, i) => (
                  <div key={m.id || i} className="flex items-center gap-2 text-sm">
                    <button onClick={() => !m.completed && completeMilestone(j.id, m.id || `m${i}`)}>
                      <CheckCircle2 className={`w-4 h-4 ${m.completed ? 'text-emerald-500' : 'text-muted-foreground'}`} />
                    </button>
                    <span className={m.completed ? 'line-through text-muted-foreground' : ''}>{m.title || m.name || m.description || `Milestone ${i + 1}`}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ConversationTab({ conversations, onRefresh }) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="font-semibold flex items-center gap-2"><MessageSquare className="w-4 h-4 text-blue-500" /> Active Conversations</h3>
        <p className="text-xs text-muted-foreground">Director-subscriber conversations with AI guidance tracking.</p>
      </div>
      {conversations.length === 0 ? (
        <Card><CardContent className="pt-6 pb-6 text-center text-muted-foreground text-sm">No active conversations. Prepare one to get started.</CardContent></Card>
      ) : conversations.map(c => (
        <Card key={c.id}>
          <CardContent className="pt-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h4 className="font-medium text-sm">{c.member_name}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs capitalize">{c.stage}</Badge>
                  <Badge variant="outline" className="text-xs capitalize">{c.outcome}</Badge>
                  {c.pressure_detected && <Badge variant="destructive" className="text-xs">Pressure risk</Badge>}
                </div>
                {c.summary && <p className="text-xs text-muted-foreground mt-2">{c.summary}</p>}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}