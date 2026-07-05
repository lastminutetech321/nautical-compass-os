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
import { Plus, Search, Loader2, FileText, Copy, CheckCircle, XCircle } from "lucide-react";
import moment from "moment";

const CATEGORIES = ["code_generation", "analysis", "research", "legal", "business", "architecture", "debugging", "documentation", "decision_support", "data_extraction", "other"];
const STATUS_COLORS = { active: "bg-emerald-100 text-emerald-700", deprecated: "bg-slate-100 text-slate-600", experimental: "bg-amber-100 text-amber-700", archived: "bg-slate-100 text-slate-600" };

export default function PromptLibraryPanel({ refreshKey }) {
  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [form, setForm] = useState({ prompt_title: "", prompt: "", purpose: "", output: "", category: "code_generation", success_score: 50, reusable: true, project: "", sprint: "", module: "", model_used: "", tags: "", failures: "", lessons_learned: "" });

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.PromptLibrary.list('-created_date', 200);
    setPrompts(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [refreshKey]);

  const filtered = prompts.filter(p => !search || `${p.prompt_title} ${p.prompt} ${p.purpose}`.toLowerCase().includes(search.toLowerCase()));

  const handleCreate = async () => {
    const parseList = (s) => s ? s.split(',').map(x => x.trim()).filter(Boolean) : [];
    await base44.entities.PromptLibrary.create({
      ...form,
      success_score: Number(form.success_score) || 50,
      failures: parseList(form.failures),
      lessons_learned: parseList(form.lessons_learned),
      tags: parseList(form.tags),
    });
    setShowCreate(false);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search prompts..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-1" />Add Prompt</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground text-sm">No prompts recorded yet. Record every prompt used for future reuse.</Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(p => (
            <Card key={p.id} className="p-4 border border-border/60">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className="text-[9px] bg-amber-100 text-amber-700">{p.category?.replace(/_/g, " ")}</Badge>
                  <Badge className={`text-[9px] ${STATUS_COLORS[p.status] || STATUS_COLORS.active}`}>{p.status}</Badge>
                  {p.reusable && <Badge className="text-[9px] bg-emerald-100 text-emerald-700"><CheckCircle className="w-2.5 h-2.5 mr-0.5" />Reusable</Badge>}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold ${p.success_score >= 70 ? "text-emerald-600" : p.success_score >= 40 ? "text-amber-600" : "text-red-600"}`}>{p.success_score}/100</span>
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => navigator.clipboard.writeText(p.prompt)}><Copy className="w-3 h-3" /></Button>
                </div>
              </div>
              <p className="text-sm font-semibold mb-1">{p.prompt_title || "Untitled Prompt"}</p>
              <p className="text-xs text-muted-foreground mb-1"><span className="font-medium">Purpose:</span> {p.purpose}</p>
              <p className={`text-xs text-muted-foreground font-mono bg-muted/40 p-2 rounded mt-1 ${expanded === p.id ? "" : "line-clamp-2"}`}>{p.prompt}</p>
              {p.failures?.length > 0 && (
                <div className="mt-2"><p className="text-[10px] font-medium text-red-600 flex items-center gap-1"><XCircle className="w-3 h-3" />Failures</p>{p.failures.map((f, i) => <p key={i} className="text-[10px] text-muted-foreground">• {f}</p>)}</div>
              )}
              {p.lessons_learned?.length > 0 && (
                <div className="mt-1"><p className="text-[10px] font-medium text-blue-600">Lessons</p>{p.lessons_learned.map((l, i) => <p key={i} className="text-[10px] text-muted-foreground">• {l}</p>)}</div>
              )}
              <div className="flex items-center gap-3 mt-2 pt-2 border-t border-border/40 text-[9px] text-muted-foreground">
                {p.project && <span>{p.project}</span>}
                {p.sprint && <span>· {p.sprint}</span>}
                {p.model_used && <span>· {p.model_used}</span>}
                <span>· Used {p.usage_count || 0}x</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Record Prompt</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Prompt Title</Label><Input value={form.prompt_title} onChange={e => setForm({ ...form, prompt_title: e.target.value })} /></div>
            <div><Label>Prompt</Label><Textarea rows={5} value={form.prompt} onChange={e => setForm({ ...form, prompt: e.target.value })} /></div>
            <div><Label>Purpose</Label><Input value={form.purpose} onChange={e => setForm({ ...form, purpose: e.target.value })} /></div>
            <div><Label>Output / Result Summary</Label><Textarea rows={3} value={form.output} onChange={e => setForm({ ...form, output: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Category</Label><Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Success Score (0-100)</Label><Input type="number" min={0} max={100} value={form.success_score} onChange={e => setForm({ ...form, success_score: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Project</Label><Input value={form.project} onChange={e => setForm({ ...form, project: e.target.value })} /></div>
              <div><Label>Sprint</Label><Input value={form.sprint} onChange={e => setForm({ ...form, sprint: e.target.value })} /></div>
              <div><Label>Model Used</Label><Input value={form.model_used} onChange={e => setForm({ ...form, model_used: e.target.value })} /></div>
            </div>
            <div><Label>Failures (comma-sep)</Label><Input value={form.failures} onChange={e => setForm({ ...form, failures: e.target.value })} /></div>
            <div><Label>Lessons Learned (comma-sep)</Label><Input value={form.lessons_learned} onChange={e => setForm({ ...form, lessons_learned: e.target.value })} /></div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="reusable" checked={form.reusable} onChange={e => setForm({ ...form, reusable: e.target.checked })} />
              <Label htmlFor="reusable" className="cursor-pointer">Reusable</Label>
            </div>
            <div><Label>Tags (comma-sep)</Label><Input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!form.prompt || !form.purpose}><FileText className="w-4 h-4 mr-1" />Record Prompt</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}