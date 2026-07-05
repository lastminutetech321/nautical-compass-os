import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sparkles, RefreshCw, Brain, MessageSquare, Users, AlertTriangle, Target,
  Zap, BookOpen, Clock, Crown, TrendingUp, Search, Network, GitBranch,
  FileText, Send, CheckCircle2, Circle, AlertCircle, ArrowRight, Gauge
} from "lucide-react";

const healthColor = (s) => s >= 80 ? "text-emerald-600" : s >= 60 ? "text-blue-600" : s >= 40 ? "text-amber-600" : "text-red-600";
const healthBg = (s) => s >= 80 ? "bg-emerald-500" : s >= 60 ? "bg-blue-500" : s >= 40 ? "bg-amber-500" : "bg-red-500";
const priorityColor = { critical: "bg-red-500", high: "bg-orange-500", medium: "bg-amber-400", low: "bg-emerald-400" };

function MetricCard({ icon: Icon, label, value, sub, color = "text-primary" }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className={`p-2 rounded-lg bg-primary/10 ${color}`}><Icon className="h-6 w-6" /></div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function NCICECommand() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(null);
  const [selectedRole, setSelectedRole] = useState("founder");
  const [timelineQuery, setTimelineQuery] = useState("");
  const [timelineResults, setTimelineResults] = useState([]);
  const [graphQuery, setGraphQuery] = useState("");
  const [graphData, setGraphData] = useState(null);
  const [captureForm, setCaptureForm] = useState({ source_type: "meeting", source_title: "", department: "", raw_content: "" });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('ncIntelligenceEngine', { operation: 'dashboard' });
      setData(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const runOp = async (operation, label, params = {}) => {
    setRunning(label);
    try { await base44.functions.invoke('ncIntelligenceEngine', { operation, params }); await loadData(); }
    catch (e) { console.error(e); }
    finally { setRunning(null); }
  };

  const searchTimeline = async () => {
    try {
      const res = await base44.functions.invoke('ncIntelligenceEngine', { operation: 'memory_timeline_search', params: { q: timelineQuery } });
      setTimelineResults(res.data?.entries || []);
    } catch (e) { console.error(e); }
  };

  const searchGraph = async () => {
    try {
      const res = await base44.functions.invoke('ncIntelligenceEngine', { operation: 'conversation_graph', params: { q: graphQuery } });
      setGraphData(res.data);
    } catch (e) { console.error(e); }
  };

  const submitCapture = async () => {
    if (!captureForm.raw_content || !captureForm.source_title) return;
    setRunning("Capturing event...");
    try {
      await base44.functions.invoke('ncIntelligenceEngine', { operation: 'capture_event', params: captureForm });
      setCaptureForm({ source_type: "meeting", source_title: "", department: "", raw_content: "" });
      await loadData();
    } catch (e) { console.error(e); }
    finally { setRunning(null); }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-[60vh]"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;
  }

  const m = data?.metrics || {};
  const digest = data?.latest_digest;
  const briefings = data?.latest_briefings || [];
  const meetings = data?.recent_meetings || [];
  const feedback = data?.recent_feedback || [];
  const commitments = data?.open_commitments || [];
  const graph = data?.conversation_graph || [];
  const comms = data?.recent_communications || [];
  const timeline = data?.recent_timeline || [];
  const selectedBriefing = briefings.find(b => b.target_role === selectedRole) || briefings[0];

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Sparkles className="h-6 w-6 text-violet-500" />NC Continuous Intelligence & Communication Engine</h1>
          <p className="text-sm text-muted-foreground mt-1">Every conversation, meeting, and action becomes organizational intelligence. Nothing is forgotten.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => runOp('process_followups', 'Follow-ups')} disabled={!!running} variant="outline" className="gap-2"><AlertCircle className="h-4 w-4" />Process Follow-ups</Button>
          <Button onClick={() => runOp('run_daily_cycle', 'Daily Cycle')} disabled={!!running} className="gap-2"><RefreshCw className={`h-4 w-4 ${running === 'Daily Cycle' ? 'animate-spin' : ''}`} />{running === 'Daily Cycle' ? 'Running...' : 'Run Daily Cycle'}</Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricCard icon={MessageSquare} label="Communication Intelligence" value={`${m.communication_intelligence_score || 0}`} sub="/100" color={healthColor(m.communication_intelligence_score || 0)} />
        <MetricCard icon={BookOpen} label="Memory Coverage" value={`${m.memory_coverage_score || 0}`} sub="/100" color={healthColor(m.memory_coverage_score || 0)} />
        <MetricCard icon={TrendingUp} label="Self-Improvement Index" value={`${m.self_improvement_index || 0}`} sub="/100" color="text-violet-600" />
        <MetricCard icon={Brain} label="Organizational IQ" value={m.organizational_iq || 0} sub="/100" color="text-violet-600" />
        <MetricCard icon={Clock} label="Founder Hours Saved" value={`${m.founder_hours_saved || 0}h`} sub="est. total" color="text-emerald-600" />
        <MetricCard icon={AlertTriangle} label="Open Commitments" value={m.open_commitments || 0} sub={`${m.overdue_commitments || 0} overdue`} color="text-amber-600" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard icon={GitBranch} label="Feedback Loops" value={m.feedback_loops_captured || 0} sub="captured" color="text-blue-600" />
        <MetricCard icon={Network} label="Conversation Nodes" value={m.conversation_nodes || 0} sub="topics tracked" color="text-blue-600" />
        <MetricCard icon={FileText} label="Memory Timeline" value={m.memory_timeline_entries || 0} sub="entries" color="text-blue-600" />
        <MetricCard icon={Crown} label="Founder Escalations" value={m.founder_escalations || 0} sub="commitments" color="text-amber-600" />
      </div>

      <Tabs defaultValue="briefings">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-8 h-auto">
          <TabsTrigger value="briefings" className="text-xs">Briefings</TabsTrigger>
          <TabsTrigger value="capture" className="text-xs">Capture</TabsTrigger>
          <TabsTrigger value="meetings" className="text-xs">Meetings</TabsTrigger>
          <TabsTrigger value="feedback" className="text-xs">Feedback Loops</TabsTrigger>
          <TabsTrigger value="followups" className="text-xs">Follow-ups</TabsTrigger>
          <TabsTrigger value="graph" className="text-xs">Conversation Graph</TabsTrigger>
          <TabsTrigger value="timeline" className="text-xs">Memory Timeline</TabsTrigger>
          <TabsTrigger value="digest" className="text-xs">Digest</TabsTrigger>
        </TabsList>

        {/* BRIEFINGS */}
        <TabsContent value="briefings" className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {["founder","executive_ai","director","employee","worker","mentor","customer"].map(role => (
              <Button key={role} size="sm" variant={selectedRole === role ? "default" : "outline"} onClick={() => setSelectedRole(role)} className="capitalize">{role.replace('_', ' ')}</Button>
            ))}
            <Button size="sm" variant="ghost" onClick={() => runOp('generate_briefing', 'Briefing', { target_role: selectedRole })} disabled={!!running} className="gap-2 ml-auto"><RefreshCw className={`h-3 w-3 ${running === 'Briefing' ? 'animate-spin' : ''}`} />Generate {selectedRole.replace('_',' ')} Briefing</Button>
          </div>
          {selectedBriefing ? (
            <BriefingView briefing={selectedBriefing} />
          ) : (
            <Card><CardContent className="p-8 text-center text-muted-foreground">No briefing yet for this role. Click "Generate" to create one.</CardContent></Card>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {briefings.slice(0, 6).map(b => (
              <Card key={b.id} className="cursor-pointer hover:shadow-md" onClick={() => setSelectedRole(b.target_role)}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="capitalize">{b.target_role.replace('_',' ')}</Badge>
                    <span className="text-xs text-muted-foreground">{b.briefing_date?.slice(0,10)}</span>
                  </div>
                  <p className="text-sm mt-2 line-clamp-2">{b.executive_summary || `${(b.todays_priorities||[]).length} priorities`}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* CAPTURE */}
        <TabsContent value="capture" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Send className="h-4 w-4" />Capture Event into Intelligence</CardTitle><CardDescription>Paste any meeting, interaction, review, or workflow outcome. The engine extracts feedback loop answers, action items, memory updates, and conversation intelligence.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div><Label>Event Type</Label>
                  <select className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm" value={captureForm.source_type} onChange={e => setCaptureForm({...captureForm, source_type: e.target.value})}>
                    {["meeting","customer_interaction","executive_review","workflow","coaching_session","reflection","project","other"].map(t => <option key={t} value={t}>{t.replace('_',' ')}</option>)}
                  </select>
                </div>
                <div><Label>Title</Label><Input value={captureForm.source_title} onChange={e => setCaptureForm({...captureForm, source_title: e.target.value})} placeholder="e.g. Weekly Strategy Sync" /></div>
                <div><Label>Department</Label><Input value={captureForm.department} onChange={e => setCaptureForm({...captureForm, department: e.target.value})} placeholder="e.g. executive" /></div>
              </div>
              <div><Label>Raw Content / Notes</Label><Textarea rows={6} value={captureForm.raw_content} onChange={e => setCaptureForm({...captureForm, raw_content: e.target.value})} placeholder="Paste meeting notes, interaction summary, or event details..." /></div>
              <Button onClick={submitCapture} disabled={!!running || !captureForm.raw_content || !captureForm.source_title} className="gap-2"><Sparkles className="h-4 w-4" />{running?.startsWith('Capturing') ? 'Extracting Intelligence...' : 'Capture Intelligence'}</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* MEETINGS */}
        <TabsContent value="meetings" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-4 w-4" />Meeting Intelligence — {meetings.length} Recent</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {meetings.length === 0 && <p className="text-sm text-muted-foreground">No meetings captured yet. Use the Capture tab to ingest a meeting.</p>}
              {meetings.map(mt => (
                <div key={mt.id} className="p-3 rounded-lg border space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">{mt.meeting_title}</p>
                    <div className="flex items-center gap-2"><Badge variant="outline" className="capitalize">{mt.meeting_type}</Badge>{mt.requires_founder_approval && <Badge className="bg-amber-500">Founder approval</Badge>}{mt.outcomes_achieved && <Badge className="bg-emerald-500">Achieved</Badge>}</div>
                  </div>
                  <p className="text-sm text-muted-foreground">{mt.executive_summary || 'No summary yet'}</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <div><span className="text-muted-foreground">Action items:</span> <span className="font-semibold">{(mt.action_items||[]).length}</span></div>
                    <div><span className="text-muted-foreground">Decisions:</span> <span className="font-semibold">{(mt.decisions_made||[]).length}</span></div>
                    <div><span className="text-muted-foreground">Risks:</span> <span className="font-semibold">{(mt.risks||[]).length}</span></div>
                    <div><span className="text-muted-foreground">Follow-ups:</span> <span className="font-semibold">{(mt.follow_ups||[]).length}</span></div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* FEEDBACK LOOPS */}
        <TabsContent value="feedback" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><GitBranch className="h-4 w-4" />Continuous Feedback Loops — {feedback.length} Recent</CardTitle><CardDescription>Every captured event answers the 12 feedback questions. Confidence and evidence stored.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              {feedback.length === 0 && <p className="text-sm text-muted-foreground">No feedback loops yet.</p>}
              {feedback.map(f => (
                <div key={f.id} className="p-3 rounded-lg border space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">{f.source_title || f.source_type}</p>
                    <div className="flex items-center gap-2"><Badge variant="outline" className="capitalize">{f.source_type.replace('_',' ')}</Badge>{f.objective_accomplished ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Circle className="h-4 w-4 text-muted-foreground" />}</div>
                  </div>
                  <p className="text-xs text-muted-foreground">{f.what_happened}</p>
                  <div className="flex flex-wrap gap-1">
                    {(f.should_automate||[]).length > 0 && <Badge variant="secondary" className="text-xs">Automate: {f.should_automate.length}</Badge>}
                    {(f.should_become_training||[]).length > 0 && <Badge variant="secondary" className="text-xs">Training: {f.should_become_training.length}</Badge>}
                    {(f.should_become_policy||[]).length > 0 && <Badge variant="secondary" className="text-xs">Policy: {f.should_become_policy.length}</Badge>}
                    {(f.should_become_canon||[]).length > 0 && <Badge variant="secondary" className="text-xs">Canon: {f.should_become_canon.length}</Badge>}
                    {(f.should_become_engineering_work||[]).length > 0 && <Badge variant="secondary" className="text-xs">Eng: {f.should_become_engineering_work.length}</Badge>}
                    {(f.founder_review_items||[]).length > 0 && <Badge className="bg-amber-500 text-xs">Founder: {f.founder_review_items.length}</Badge>}
                  </div>
                  <div className="flex items-center gap-2"><span className="text-xs text-muted-foreground">Confidence:</span><Progress value={f.confidence_score} className="flex-1 h-1.5" /><span className="text-xs font-semibold">{f.confidence_score}%</span></div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* FOLLOW-UPS */}
        <TabsContent value="followups" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><AlertCircle className="h-4 w-4 text-amber-500" />Executive Follow-up Engine — {commitments.length} Open Commitments</CardTitle><CardDescription>Never lose a commitment. Overdue items are flagged and critical ones escalated to the Founder.</CardDescription></CardHeader>
            <CardContent className="space-y-2">
              {commitments.length === 0 && <p className="text-sm text-muted-foreground">No open commitments.</p>}
              {commitments.map(c => {
                const overdue = c.due_date && c.due_date < new Date().toISOString().slice(0,10) && c.status !== 'completed';
                return (
                  <div key={c.id} className={`p-3 rounded-lg border ${overdue ? 'border-red-300 bg-red-50/50 dark:bg-red-950/20' : ''}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{c.commitment_text}</p>
                        <p className="text-xs text-muted-foreground">{c.owner || 'Unassigned'} · {c.source_title || c.source_type}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {overdue && <Badge className="bg-red-500">Overdue</Badge>}
                        {c.founder_escalation && <Badge className="bg-amber-500">Escalated</Badge>}
                        <Badge variant="outline" className={`text-xs text-white border-0 ${priorityColor[c.priority] || 'bg-slate-400'}`}>{c.priority}</Badge>
                      </div>
                    </div>
                    {c.due_date && <p className="text-xs text-muted-foreground mt-1">Due: {c.due_date}</p>}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* CONVERSATION GRAPH */}
        <TabsContent value="graph" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Network className="h-4 w-4" />Organizational Conversation Graph</CardTitle><CardDescription>Maps people, departments, projects, meetings, ideas, problems, and lessons. Detects recurring topics, unresolved conversations, and experts.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input value={graphQuery} onChange={e => setGraphQuery(e.target.value)} placeholder="Search topics, people, problems..." onKeyDown={e => e.key === 'Enter' && searchGraph()} />
                <Button onClick={searchGraph} className="gap-2"><Search className="h-4 w-4" />Search</Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Recurring Topics</p>
                  {(graphData?.recurring_topics || graph.filter(n => n.is_recurring_topic)).slice(0, 10).map((n, i) => (
                    <div key={i} className="p-2 rounded-lg border mb-1 text-sm flex items-center justify-between">
                      <span className="truncate">{n.node_label}</span><Badge variant="outline" className="text-xs">{n.recurrence_count || n.discussion_count}×</Badge>
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Unresolved</p>
                  {(graphData?.unresolved || graph.filter(n => n.is_unresolved)).slice(0, 10).map((n, i) => (
                    <div key={i} className="p-2 rounded-lg border mb-1 text-sm border-amber-200"><Circle className="inline h-3 w-3 text-amber-500 mr-1" />{n.node_label}</div>
                  ))}
                  {(graphData?.unresolved || graph.filter(n => n.is_unresolved)).length === 0 && <p className="text-xs text-muted-foreground">None</p>}
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">All Nodes</p>
                  {(graphData?.all || graph).slice(0, 10).map((n, i) => (
                    <div key={i} className="p-2 rounded-lg border mb-1 text-sm flex items-center justify-between">
                      <span className="truncate">{n.node_label}</span><Badge variant="outline" className="text-xs capitalize">{n.node_type}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* MEMORY TIMELINE */}
        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><BookOpen className="h-4 w-4" />Organizational Memory Timeline</CardTitle><CardDescription>Replay organizational history. Search by person, department, customer, project, meeting, problem, solution, idea, decision, policy, or date. Every decision remains traceable.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input value={timelineQuery} onChange={e => setTimelineQuery(e.target.value)} placeholder="Search memory..." onKeyDown={e => e.key === 'Enter' && searchTimeline()} />
                <Button onClick={searchTimeline} className="gap-2"><Search className="h-4 w-4" />Search</Button>
              </div>
              <div className="space-y-2">
                {(timelineResults.length > 0 ? timelineResults : timeline).map((e, i) => (
                  <div key={i} className="p-3 rounded-lg border flex items-start gap-3">
                    <Badge variant="outline" className="text-xs capitalize mt-0.5">{e.entry_type}</Badge>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{e.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{e.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">{e.entry_date?.slice(0,10)}</span>
                        {e.linked_department && <Badge variant="secondary" className="text-xs">{e.linked_department}</Badge>}
                        {e.linked_customer && <Badge variant="secondary" className="text-xs">{e.linked_customer}</Badge>}
                      </div>
                    </div>
                  </div>
                ))}
                {timeline.length === 0 && timelineResults.length === 0 && <p className="text-sm text-muted-foreground">No timeline entries yet.</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* DIGEST */}
        <TabsContent value="digest" className="space-y-4">
          <div className="flex justify-end"><Button onClick={() => runOp('generate_digest', 'Digest')} disabled={!!running} className="gap-2"><RefreshCw className={`h-4 w-4 ${running === 'Digest' ? 'animate-spin' : ''}`} />Generate Digest</Button></div>
          {digest ? (
            <div className="space-y-4">
              <Card className="border-violet-200 bg-violet-50/30 dark:bg-violet-950/10">
                <CardHeader><CardTitle className="flex items-center gap-2"><Gauge className="h-4 w-4 text-violet-500" />Organization Summary — {digest.digest_date?.slice(0,10)}</CardTitle></CardHeader>
                <CardContent><p className="text-sm">{digest.organization_summary}</p></CardContent>
              </Card>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <MetricCard icon={Brain} label="Org IQ" value={digest.organizational_iq || 0} color="text-violet-600" />
                <MetricCard icon={TrendingUp} label="Self-Improvement" value={digest.self_improvement_index || 0} color="text-violet-600" />
                <MetricCard icon={Clock} label="Founder Time Saved" value={`${digest.founder_time_saved_hours || 0}h`} color="text-emerald-600" />
                <MetricCard icon={MessageSquare} label="Comms Intelligence" value={digest.communication_intelligence_score || 0} color={healthColor(digest.communication_intelligence_score || 0)} />
              </div>
              <Card className="border-amber-200 bg-amber-50/30 dark:bg-amber-950/10">
                <CardHeader><CardTitle className="flex items-center gap-2"><Crown className="h-4 w-4 text-amber-500" />Top Recommended Decision Today</CardTitle></CardHeader>
                <CardContent>
                  <p className="font-semibold">{digest.top_recommended_decision?.decision || 'N/A'}</p>
                  <p className="text-sm text-muted-foreground mt-1">{digest.top_recommended_decision?.rationale || ''}</p>
                  {digest.top_recommended_decision?.requires_founder_approval && <Badge className="bg-amber-500 mt-2">Requires Founder Approval</Badge>}
                </CardContent>
              </Card>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {digest.department_summaries?.map((d, i) => (
                  <Card key={i}><CardContent className="p-3"><p className="text-xs font-semibold">{d.dept}</p><p className="text-xs text-muted-foreground mt-1">{d.summary}</p><div className="flex gap-2 mt-2"><Badge variant="outline" className="text-xs">Health: {d.health}</Badge>{d.risk && <Badge variant="outline" className="text-xs">{d.risk}</Badge>}</div></CardContent></Card>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <SummaryCard title="Revenue" data={digest.revenue_summary} />
                <SummaryCard title="Customer" data={digest.customer_summary} />
                <SummaryCard title="Workforce" data={digest.workforce_summary} />
                <SummaryCard title="Legal" data={digest.legal_summary} />
                <SummaryCard title="Engineering" data={digest.engineering_summary} />
                <SummaryCard title="Risk" data={digest.risk_summary} />
              </div>
            </div>
          ) : <Card><CardContent className="p-8 text-center text-muted-foreground">No digest yet. Click "Generate Digest".</CardContent></Card>}
        </TabsContent>
      </Tabs>

      {/* Remaining opportunities */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Remaining Opportunities</CardTitle></CardHeader>
        <CardContent><ul className="text-sm space-y-1">{(m.remaining_opportunities || []).map((o, i) => <li key={i} className="flex items-center gap-2"><ArrowRight className="h-3 w-3 text-muted-foreground" />{o}</li>)}</ul></CardContent>
      </Card>
    </div>
  );
}

function BriefingView({ briefing }) {
  const sections = [
    { label: "Today's Priorities", key: "todays_priorities", icon: Target },
    { label: "Upcoming Deadlines", key: "upcoming_deadlines", icon: Clock },
    { label: "Pending Approvals", key: "pending_approvals", icon: AlertCircle },
    { label: "New Opportunities", key: "new_opportunities", icon: TrendingUp },
    { label: "Risks", key: "risks", icon: AlertTriangle },
    { label: "Assigned Work", key: "assigned_work", icon: CheckCircle2 },
    { label: "Knowledge Learned Overnight", key: "knowledge_learned_overnight", icon: BookOpen },
    { label: "Predictions", key: "predictions", icon: TrendingUp },
    { label: "Recommended Conversations", key: "recommended_conversations", icon: MessageSquare },
    { label: "Suggested Automations", key: "suggested_automations", icon: Zap },
    { label: "Training Reminders", key: "training_reminders", icon: BookOpen },
    { label: "Compliance Reminders", key: "compliance_reminders", icon: AlertCircle },
  ];
  return (
    <div className="space-y-4">
      <Card className="border-violet-200 bg-violet-50/30 dark:bg-violet-950/10">
        <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-violet-500" />{briefing.target_name || briefing.target_role} Briefing — {briefing.briefing_date?.slice(0,10)}</CardTitle></CardHeader>
        <CardContent><p className="text-sm">{briefing.executive_summary}</p></CardContent>
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {sections.map(s => {
          const items = briefing[s.key] || [];
          if (!items.length) return null;
          const Icon = s.icon;
          return (
            <Card key={s.key}>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Icon className="h-4 w-4 text-muted-foreground" />{s.label} <Badge variant="secondary" className="ml-auto">{items.length}</Badge></CardTitle></CardHeader>
              <CardContent className="pt-0 space-y-1">
                {items.slice(0, 6).map((it, i) => (
                  <p key={i} className="text-xs">{typeof it === 'string' ? it : it.title || it.item || it.decision || it.name || it.risk || it.customer || JSON.stringify(it).slice(0, 80)}</p>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function SummaryCard({ title, data }) {
  if (!data || typeof data !== 'object') return null;
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">{title} Summary</CardTitle></CardHeader>
      <CardContent className="pt-0">
        {Object.entries(data).slice(0, 6).map(([k, v]) => (
          <p key={k} className="text-xs"><span className="text-muted-foreground capitalize">{k.replace(/_/g,' ')}:</span> <span className="font-medium">{typeof v === 'object' ? JSON.stringify(v).slice(0, 60) : String(v)}</span></p>
        ))}
      </CardContent>
    </Card>
  );
}