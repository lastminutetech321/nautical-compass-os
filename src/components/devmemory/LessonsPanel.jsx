import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Search, Loader2, Lightbulb, Sparkles, CheckCircle } from "lucide-react";
import moment from "moment";

const LESSON_TYPES = [
  { value: "what_worked", label: "What Worked", color: "bg-emerald-100 text-emerald-700" },
  { value: "what_failed", label: "What Failed", color: "bg-red-100 text-red-700" },
  { value: "what_should_change", label: "What Should Change", color: "bg-amber-100 text-amber-700" },
  { value: "what_should_repeat", label: "What Should Repeat", color: "bg-blue-100 text-blue-700" },
  { value: "recommendation", label: "Recommendation", color: "bg-violet-100 text-violet-700" },
];
const IMPACT_COLORS = { positive: "bg-emerald-100 text-emerald-700", negative: "bg-red-100 text-red-700", neutral: "bg-slate-100 text-slate-600" };

export default function LessonsPanel({ refreshKey }) {
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genSprint, setGenSprint] = useState("");
  const [form, setForm] = useState({ title: "", lesson_type: "what_worked", sprint: "", project: "", description: "", context: "", impact: "neutral", recommendations: "", module: "", priority: "medium" });

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.LessonLearned.list('-created_date', 200);
    setLessons(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [refreshKey]);

  const filtered = lessons.filter(l => !search || `${l.title} ${l.description} ${l.sprint}`.toLowerCase().includes(search.toLowerCase()));

  const handleCreate = async () => {
    const parseList = (s) => s ? s.split('\n').map(x => x.trim()).filter(Boolean) : [];
    await base44.entities.LessonLearned.create({
      ...form,
      recommendations_for_future: parseList(form.recommendations),
    });
    setShowCreate(false);
    load();
  };

  const generateSprintLessons = async () => {
    if (!genSprint) return;
    setGenerating(true);
    try {
      await base44.functions.invoke('generateBlueprint', { operation: 'generate_sprint_lessons', params: { sprint: genSprint } });
      load();
    } catch (e) { console.error(e); }
    setGenerating(false);
  };

  const markApplied = async (id) => {
    await base44.entities.LessonLearned.update(id, { applied_to_future: true });
    load();
  };

  const typeMeta = (type) => LESSON_TYPES.find(t => t.value === type) || LESSON_TYPES[0];

  return (
    <div className="space-y-4">
      {/* AI Sprint Lesson Generator */}
      <Card className="p-4 border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <p className="text-xs font-bold uppercase flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-emerald-600" />AI Sprint Lesson Generator</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Automatically generates lessons from sprint journal entries and bugs</p>
          </div>
          <div className="flex items-center gap-2">
            <Input placeholder="Sprint name..." value={genSprint} onChange={e => setGenSprint(e.target.value)} className="w-32 h-8" />
            <Button onClick={generateSprintLessons} disabled={!genSprint || generating} size="sm">
              {generating ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Sparkles className="w-4 h-4 mr-1" />}
              {generating ? "Generating..." : "Generate"}
            </Button>
          </div>
        </div>
      </Card>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search lessons..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-1" />Add Lesson</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground text-sm">No lessons recorded yet. Generate from a sprint or add manually.</Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(l => {
            const meta = typeMeta(l.lesson_type);
            return (
              <Card key={l.id} className="p-4 border border-border/60">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={`text-[9px] ${meta.color}`}>{meta.label}</Badge>
                    <Badge className={`text-[9px] ${IMPACT_COLORS[l.impact] || IMPACT_COLORS.neutral}`}>{l.impact}</Badge>
                    <Badge variant="outline" className="text-[9px]">{l.priority}</Badge>
                    {l.applied_to_future && <Badge className="text-[9px] bg-emerald-100 text-emerald-700"><CheckCircle className="w-2.5 h-2.5 mr-0.5" />Applied</Badge>}
                  </div>
                  <span className="text-[9px] text-muted-foreground">{l.sprint || "—"} · {moment(l.created_date).format("MMM D")}</span>
                </div>
                <p className="text-sm font-semibold mb-1 flex items-center gap-1.5"><Lightbulb className="w-3.5 h-3.5 text-amber-600" />{l.title}</p>
                <p className="text-xs text-muted-foreground">{l.description}</p>
                {l.context && <p className="text-[10px] text-muted-foreground mt-1 italic">Context: {l.context}</p>}
                {l.recommendations_for_future?.length > 0 && (
                  <div className="mt-2 p-2 rounded bg-muted/40">
                    <p className="text-[10px] font-semibold text-blue-600 mb-0.5">Recommendations for Future Projects</p>
                    {l.recommendations_for_future.map((r, i) => <p key={i} className="text-[10px] text-muted-foreground">• {r}</p>)}
                  </div>
                )}
                {!l.applied_to_future && (
                  <div className="mt-2 pt-2 border-t border-border/40">
                    <Button size="sm" variant="outline" className="h-6 text-[9px]" onClick={() => markApplied(l.id)}>Mark Applied to Future</Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Record Lesson Learned</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Lesson Type</Label><Select value={form.lesson_type} onValueChange={v => setForm({ ...form, lesson_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{LESSON_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Impact</Label><Select value={form.impact} onValueChange={v => setForm({ ...form, impact: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["positive", "negative", "neutral"].map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Priority</Label><Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["low", "medium", "high", "critical"].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Sprint</Label><Input value={form.sprint} onChange={e => setForm({ ...form, sprint: e.target.value })} /></div>
              <div><Label>Project</Label><Input value={form.project} onChange={e => setForm({ ...form, project: e.target.value })} /></div>
            </div>
            <div><Label>Description</Label><Textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            <div><Label>Context</Label><Textarea rows={2} value={form.context} onChange={e => setForm({ ...form, context: e.target.value })} /></div>
            <div><Label>Recommendations for Future (one per line)</Label><Textarea rows={3} value={form.recommendations} onChange={e => setForm({ ...form, recommendations: e.target.value })} placeholder="Always test X before...\nNever deploy without..." /></div>
            <div><Label>Module</Label><Input value={form.module} onChange={e => setForm({ ...form, module: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!form.title || !form.description}><Lightbulb className="w-4 h-4 mr-1" />Record Lesson</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}