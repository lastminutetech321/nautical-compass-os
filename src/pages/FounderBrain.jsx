import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, Loader2, Plus, CheckCircle2, XCircle, History, Bot, Eye, Target, Briefcase, Package, Wrench, Scale, Users, MessageSquare, ShieldCheck, AlertTriangle, Trophy, ListOrdered, GraduationCap, Sparkles } from "lucide-react";
import moment from "moment";
import FounderBrainView from "@/components/founder/FounderBrainView";

const PHILOSOPHY_FIELDS = [
  { key: "vision", label: "Vision", icon: Eye },
  { key: "mission", label: "Mission", icon: Target },
  { key: "business_philosophy", label: "Business Philosophy", icon: Briefcase },
  { key: "product_philosophy", label: "Product Philosophy", icon: Package },
  { key: "engineering_philosophy", label: "Engineering Philosophy", icon: Wrench },
  { key: "legal_philosophy", label: "Legal Philosophy", icon: Scale },
  { key: "leadership_style", label: "Leadership Style", icon: Users },
  { key: "communication_style", label: "Communication Style", icon: MessageSquare },
];

export default function FounderBrain() {
  const [current, setCurrent] = useState(null);
  const [pendingUpdates, setPendingUpdates] = useState([]);
  const [allVersions, setAllVersions] = useState([]);
  const [overview, setOverview] = useState(null);
  const [agentReference, setAgentReference] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [showDecision, setShowDecision] = useState(false);
  const [showLesson, setShowLesson] = useState(false);
  const [showInitialize, setShowInitialize] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [decisionForm, setDecisionForm] = useState({ title: "", context: "", decision: "", rationale: "" });
  const [lessonForm, setLessonForm] = useState({ title: "", description: "", source: "" });

  const load = async () => {
    setLoading(true);
    try {
      const [brainRes, ovRes, refRes] = await Promise.all([
        base44.functions.invoke('founderBrain', { operation: 'get_current', params: {} }),
        base44.functions.invoke('founderBrain', { operation: 'overview', params: {} }).catch(() => ({ data: { overview: null } })),
        base44.functions.invoke('founderBrain', { operation: 'reference_for_agent', params: {} }).catch(() => ({ data: { reference: "" } })),
      ]);
      setCurrent(brainRes.data?.current);
      setPendingUpdates(brainRes.data?.pending_updates || []);
      setAllVersions(brainRes.data?.all_versions || []);
      setOverview(ovRes.data?.overview);
      setAgentReference(refRes.data?.reference || "");
    } catch (e) {
      setCurrent(null);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const startEdit = () => {
    setEditForm({
      vision: current?.vision || "",
      mission: current?.mission || "",
      business_philosophy: current?.business_philosophy || "",
      product_philosophy: current?.product_philosophy || "",
      engineering_philosophy: current?.engineering_philosophy || "",
      legal_philosophy: current?.legal_philosophy || "",
      leadership_style: current?.leadership_style || "",
      communication_style: current?.communication_style || "",
    });
    setShowEditor(true);
  };

  const handleRequestUpdate = async () => {
    setActionLoading(true);
    try {
      await base44.functions.invoke('founderBrain', {
        operation: 'request_update',
        params: { changes: editForm, update_reason: "Philosophy update requested by founder" }
      });
      setShowEditor(false);
      await load();
    } catch (e) { console.error(e); }
    setActionLoading(false);
  };

  const handleRecordDecision = async () => {
    if (!decisionForm.title || !decisionForm.decision) return;
    setActionLoading(true);
    try {
      const newDecision = { ...decisionForm, date: moment().format("YYYY-MM-DD") };
      const decisionHistory = [...(current?.decision_history || []), newDecision];
      await base44.functions.invoke('founderBrain', {
        operation: 'request_update',
        params: { changes: { decision_history: decisionHistory }, update_reason: `Decision recorded: ${decisionForm.title}` }
      });
      setShowDecision(false);
      setDecisionForm({ title: "", context: "", decision: "", rationale: "" });
      await load();
    } catch (e) { console.error(e); }
    setActionLoading(false);
  };

  const handleAddLesson = async () => {
    if (!lessonForm.title) return;
    setActionLoading(true);
    try {
      const newLesson = { ...lessonForm, date: moment().format("YYYY-MM-DD") };
      const lessons = [...(current?.lessons_learned || []), newLesson];
      await base44.functions.invoke('founderBrain', {
        operation: 'request_update',
        params: { changes: { lessons_learned: lessons }, update_reason: `Lesson learned: ${lessonForm.title}` }
      });
      setShowLesson(false);
      setLessonForm({ title: "", description: "", source: "" });
      await load();
    } catch (e) { console.error(e); }
    setActionLoading(false);
  };

  const handleApprove = async (brainId) => {
    setActionLoading(true);
    try {
      await base44.functions.invoke('founderBrain', { operation: 'approve_update', params: { brain_id: brainId } });
      await load();
    } catch (e) { console.error(e); }
    setActionLoading(false);
  };

  const handleReject = async (brainId) => {
    setActionLoading(true);
    try {
      await base44.functions.invoke('founderBrain', { operation: 'reject_update', params: { brain_id: brainId, rejection_reason: "Rejected by founder" } });
      await load();
    } catch (e) { console.error(e); }
    setActionLoading(false);
  };

  const handleInitialize = async () => {
    setActionLoading(true);
    try {
      await base44.functions.invoke('founderBrain', {
        operation: 'initialize',
        params: { initial_data: editForm }
      });
      setShowInitialize(false);
      await load();
    } catch (e) { console.error(e); }
    setActionLoading(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-32"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">NCOS · Founder Brain</p>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Brain className="w-6 h-6 text-primary" />Founder Brain
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Captures founder decision-making philosophy · Referenced by all AI employees · Never auto-overwritten</p>
        </div>
        {current && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowDecision(true)}><History className="w-4 h-4 mr-1" />Record Decision</Button>
            <Button variant="outline" size="sm" onClick={() => setShowLesson(true)}><GraduationCap className="w-4 h-4 mr-1" />Add Lesson</Button>
            <Button size="sm" onClick={startEdit}><Plus className="w-4 h-4 mr-1" />Request Update</Button>
          </div>
        )}
      </div>

      {/* Stats */}
      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <Card className="p-3 border border-border/60"><Brain className="w-4 h-4 text-primary mb-1" /><p className="text-lg font-bold">{overview.current_version}</p><p className="text-[10px] text-muted-foreground">Current Version</p></Card>
          <Card className="p-3 border border-border/60"><History className="w-4 h-4 text-blue-600 mb-1" /><p className="text-lg font-bold">{overview.total_versions}</p><p className="text-[10px] text-muted-foreground">Total Versions</p></Card>
          <Card className="p-3 border border-amber-200 bg-amber-50/50"><AlertTriangle className="w-4 h-4 text-amber-600 mb-1" /><p className="text-lg font-bold text-amber-600">{overview.pending_approvals}</p><p className="text-[10px] text-muted-foreground">Pending Approval</p></Card>
          <Card className="p-3 border border-border/60"><ListOrdered className="w-4 h-4 text-violet-600 mb-1" /><p className="text-lg font-bold">{overview.priorities}</p><p className="text-[10px] text-muted-foreground">Priorities</p></Card>
          <Card className="p-3 border border-border/60"><Trophy className="w-4 h-4 text-emerald-600 mb-1" /><p className="text-lg font-bold">{overview.strategic_goals}</p><p className="text-[10px] text-muted-foreground">Strategic Goals</p></Card>
          <Card className="p-3 border border-border/60"><History className="w-4 h-4 text-cyan-600 mb-1" /><p className="text-lg font-bold">{overview.decisions_recorded}</p><p className="text-[10px] text-muted-foreground">Decisions</p></Card>
          <Card className="p-3 border border-border/60"><GraduationCap className="w-4 h-4 text-orange-600 mb-1" /><p className="text-lg font-bold">{overview.lessons_recorded}</p><p className="text-[10px] text-muted-foreground">Lessons</p></Card>
        </div>
      )}

      {/* Not initialized state */}
      {!current && (
        <Card className="p-8 text-center border border-border/60">
          <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-semibold mb-1">Founder Brain Not Initialized</p>
          <p className="text-xs text-muted-foreground mb-4">Initialize the Founder Brain to capture your decision-making philosophy. All AI employees will reference it before making recommendations.</p>
          <Button size="sm" onClick={() => { setEditForm({ vision: "", mission: "", business_philosophy: "", product_philosophy: "", engineering_philosophy: "", legal_philosophy: "", leadership_style: "", communication_style: "" }); setShowInitialize(true); }}>
            <Sparkles className="w-4 h-4 mr-1" />Initialize Founder Brain
          </Button>
        </Card>
      )}

      {current && (
        <Tabs defaultValue="brain">
          <TabsList>
            <TabsTrigger value="brain" className="text-xs"><Brain className="w-3.5 h-3.5 mr-1" />Founder Brain</TabsTrigger>
            <TabsTrigger value="pending" className="text-xs">
              <AlertTriangle className="w-3.5 h-3.5 mr-1" />Pending Updates
              {pendingUpdates.length > 0 && <Badge className="ml-1 text-[8px] h-4 bg-amber-500">{pendingUpdates.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="reference" className="text-xs"><Bot className="w-3.5 h-3.5 mr-1" />AI Reference</TabsTrigger>
            <TabsTrigger value="history" className="text-xs"><History className="w-3.5 h-3.5 mr-1" />Version History</TabsTrigger>
          </TabsList>

          {/* Brain View */}
          <TabsContent value="brain" className="mt-4">
            <FounderBrainView brain={current} />
          </TabsContent>

          {/* Pending Updates */}
          <TabsContent value="pending" className="mt-4 space-y-3">
            {pendingUpdates.length === 0 ? (
              <Card className="p-6 text-center border border-border/60">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No pending updates. All Founder Brain changes require your approval.</p>
              </Card>
            ) : (
              pendingUpdates.map(pending => (
                <Card key={pending.id} className="p-4 border border-amber-200 bg-amber-50/30 dark:bg-amber-950/10">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge className="text-[9px] bg-amber-500">v{pending.version} · Pending</Badge>
                      <span className="text-[10px] text-muted-foreground">Requested by {pending.requested_by} · {moment(pending.created_date).format("MMM D, YYYY HH:mm")}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleReject(pending.id)} disabled={actionLoading}>
                        <XCircle className="w-4 h-4 mr-1 text-red-500" />Reject
                      </Button>
                      <Button size="sm" onClick={() => handleApprove(pending.id)} disabled={actionLoading}>
                        <CheckCircle2 className="w-4 h-4 mr-1" />Approve & Activate
                      </Button>
                    </div>
                  </div>
                  {pending.update_reason && <p className="text-xs mb-2"><strong>Reason:</strong> {pending.update_reason}</p>}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                    {PHILOSOPHY_FIELDS.map(f => {
                      const oldVal = current?.[f.key];
                      const newVal = pending[f.key];
                      if (oldVal === newVal) return null;
                      return (
                        <div key={f.key} className="p-2 rounded border border-border/40 bg-background">
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">{f.label}</p>
                          <div className="space-y-1">
                            {oldVal && <p className="text-[10px] text-red-600 line-through opacity-60">{oldVal}</p>}
                            <p className="text-[10px] text-emerald-600">{newVal || "(empty)"}</p>
                          </div>
                        </div>
                      );
                    })}
                    {pending.decision_history?.length > (current?.decision_history?.length || 0) && (
                      <div className="p-2 rounded border border-emerald-300 bg-emerald-50/50">
                        <p className="text-[10px] font-semibold text-emerald-700 uppercase mb-1">New Decision Added</p>
                        <p className="text-xs">{pending.decision_history[pending.decision_history.length - 1]?.title}</p>
                      </div>
                    )}
                    {pending.lessons_learned?.length > (current?.lessons_learned?.length || 0) && (
                      <div className="p-2 rounded border border-orange-300 bg-orange-50/50">
                        <p className="text-[10px] font-semibold text-orange-700 uppercase mb-1">New Lesson Added</p>
                        <p className="text-xs">{pending.lessons_learned[pending.lessons_learned.length - 1]?.title}</p>
                      </div>
                    )}
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          {/* AI Reference */}
          <TabsContent value="reference" className="mt-4 space-y-3">
            <Card className="p-3 border border-violet-200 bg-violet-50/50 dark:bg-violet-950/10">
              <div className="flex items-center gap-2 mb-1">
                <Bot className="w-4 h-4 text-violet-600" />
                <p className="text-xs font-semibold text-violet-600">AI Employee Reference Output</p>
              </div>
              <p className="text-xs text-muted-foreground">This is the condensed directive that all AI employees receive before making recommendations. Call <code className="text-[10px] bg-muted px-1 rounded">founderBrain.reference_for_agent</code> to retrieve it.</p>
            </Card>
            <Card className="p-4 border border-border/60">
              <pre className="text-xs whitespace-pre-wrap font-mono text-muted-foreground overflow-x-auto">{agentReference}</pre>
            </Card>
          </TabsContent>

          {/* Version History */}
          <TabsContent value="history" className="mt-4 space-y-2">
            {allVersions.map(v => (
              <Card key={v.id} className={`p-3 border ${v.is_current ? "border-primary/40 bg-primary/5" : v.status === 'pending_approval' ? "border-amber-200" : v.status === 'rejected' ? "border-red-200 bg-red-50/30" : "border-border/60"}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={v.is_current ? "default" : "outline"} className="text-[9px]">v{v.version}</Badge>
                    <Badge variant="outline" className={`text-[9px] capitalize ${v.status === 'active' ? "text-emerald-600" : v.status === 'pending_approval' ? "text-amber-600" : v.status === 'rejected' ? "text-red-600" : "text-muted-foreground"}`}>{v.status.replace(/_/g, " ")}</Badge>
                    {v.update_reason && <span className="text-xs text-muted-foreground">{v.update_reason}</span>}
                  </div>
                  <span className="text-[10px] text-muted-foreground">{moment(v.created_date).format("MMM D, YYYY")}</span>
                </div>
                {v.approved_by && <p className="text-[10px] text-muted-foreground mt-1">Approved by {v.approved_by} · {v.approved_at && moment(v.approved_at).format("MMM D, HH:mm")}</p>}
                {v.rejection_reason && <p className="text-[10px] text-red-600 mt-1">Rejected: {v.rejection_reason}</p>}
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      )}

      {/* Editor Dialog */}
      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Request Founder Brain Update</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground mb-2">Changes will create a pending version requiring your approval before activation.</p>
          <div className="space-y-3">
            {PHILOSOPHY_FIELDS.map(f => (
              <div key={f.key}>
                <Label>{f.label}</Label>
                <Textarea rows={2} value={editForm[f.key] || ""} onChange={e => setEditForm({ ...editForm, [f.key]: e.target.value })} />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditor(false)}>Cancel</Button>
            <Button onClick={handleRequestUpdate} disabled={actionLoading}>
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
              Submit for Approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Initialize Dialog */}
      <Dialog open={showInitialize} onOpenChange={setShowInitialize}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" />Initialize Founder Brain v1.0</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground mb-2">Set the foundational philosophy. This becomes the active Founder Brain immediately. Risk tolerance and approval preferences will use safe defaults.</p>
          <div className="space-y-3">
            {PHILOSOPHY_FIELDS.map(f => (
              <div key={f.key}>
                <Label>{f.label}</Label>
                <Textarea rows={2} value={editForm[f.key] || ""} onChange={e => setEditForm({ ...editForm, [f.key]: e.target.value })} placeholder={`Enter your ${f.label.toLowerCase()}...`} />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInitialize(false)}>Cancel</Button>
            <Button onClick={handleInitialize} disabled={actionLoading}>
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Brain className="w-4 h-4 mr-1" />}
              Initialize Brain
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Decision Dialog */}
      <Dialog open={showDecision} onOpenChange={setShowDecision}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><History className="w-5 h-5 text-primary" />Record Decision</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Decision Title *</Label><Input value={decisionForm.title} onChange={e => setDecisionForm({ ...decisionForm, title: e.target.value })} placeholder="e.g. Chose Stripe over Square for payments" /></div>
            <div><Label>Context</Label><Textarea rows={2} value={decisionForm.context} onChange={e => setDecisionForm({ ...decisionForm, context: e.target.value })} placeholder="What was the situation?" /></div>
            <div><Label>Decision *</Label><Textarea rows={2} value={decisionForm.decision} onChange={e => setDecisionForm({ ...decisionForm, decision: e.target.value })} placeholder="What was decided?" /></div>
            <div><Label>Rationale</Label><Textarea rows={2} value={decisionForm.rationale} onChange={e => setDecisionForm({ ...decisionForm, rationale: e.target.value })} placeholder="Why was this decision made?" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDecision(false)}>Cancel</Button>
            <Button onClick={handleRecordDecision} disabled={!decisionForm.title || !decisionForm.decision || actionLoading}>
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <History className="w-4 h-4 mr-1" />}
              Submit for Approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Lesson Dialog */}
      <Dialog open={showLesson} onOpenChange={setShowLesson}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><GraduationCap className="w-5 h-5 text-primary" />Add Lesson Learned</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Lesson Title *</Label><Input value={lessonForm.title} onChange={e => setLessonForm({ ...lessonForm, title: e.target.value })} placeholder="e.g. Always verify legal citations before publication" /></div>
            <div><Label>Description</Label><Textarea rows={3} value={lessonForm.description} onChange={e => setLessonForm({ ...lessonForm, description: e.target.value })} placeholder="What was learned?" /></div>
            <div><Label>Source</Label><Input value={lessonForm.source} onChange={e => setLessonForm({ ...lessonForm, source: e.target.value })} placeholder="e.g. Q1 2024 incident, customer feedback" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLesson(false)}>Cancel</Button>
            <Button onClick={handleAddLesson} disabled={!lessonForm.title || actionLoading}>
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <GraduationCap className="w-4 h-4 mr-1" />}
              Submit for Approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {actionLoading && !showEditor && !showDecision && !showLesson && !showInitialize && (
        <div className="fixed inset-0 flex items-center justify-center bg-background/80 z-50">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}
    </div>
  );
}