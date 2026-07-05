import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Brain, Plus, Search, Filter, Archive, AlertTriangle,
  CheckCircle, Loader2, Clock, Tag, Link2, RefreshCw
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import moment from "moment";

const TYPE_META = {
  founder_decision:       { icon: "👑", color: "text-amber-600 bg-amber-50 border-amber-200", label: "Founder Decision" },
  architecture_decision:  { icon: "🏛️", color: "text-blue-600 bg-blue-50 border-blue-200",   label: "Architecture" },
  completed_work:         { icon: "✅", color: "text-emerald-600 bg-emerald-50 border-emerald-200", label: "Completed Work" },
  rejected_idea:          { icon: "❌", color: "text-red-600 bg-red-50 border-red-200",        label: "Rejected Idea" },
  known_risk:             { icon: "⚠️", color: "text-orange-600 bg-orange-50 border-orange-200", label: "Known Risk" },
  known_workaround:       { icon: "🔧", color: "text-violet-600 bg-violet-50 border-violet-200", label: "Workaround" },
  lesson_learned:         { icon: "📚", color: "text-cyan-600 bg-cyan-50 border-cyan-200",     label: "Lesson Learned" },
  duplicate_warning:      { icon: "🔁", color: "text-rose-600 bg-rose-50 border-rose-200",     label: "Duplicate Warning" },
  canon_gap_note:         { icon: "📖", color: "text-slate-600 bg-slate-50 border-slate-200",  label: "Canon Gap Note" },
  technical_debt:         { icon: "🕸️", color: "text-gray-600 bg-gray-50 border-gray-200",    label: "Technical Debt" },
  integration_note:       { icon: "🔌", color: "text-indigo-600 bg-indigo-50 border-indigo-200", label: "Integration Note" },
};

const BLANK = { title: "", memory_type: "architecture_decision", description: "", context: "", decision_made: "", rationale: "", outcome: "", related_modules: [], tags: [], do_not_repeat: false, recorded_by: "" };

export default function NCOSMemoryPage() {
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  const load = async () => {
    setLoading(true);
    const m = await base44.entities.NCOSMemory.filter({ archived: false }, "-created_date", 200).catch(() => []);
    setMemories(m);
    if (m.length > 0 && !selected) setSelected(m[0]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    const user = await base44.auth.me();
    const data = { ...form, recorded_by: form.recorded_by || user.full_name || user.email, tags: typeof form.tags === "string" ? form.tags.split(",").map(t=>t.trim()).filter(Boolean) : form.tags, related_modules: typeof form.related_modules === "string" ? form.related_modules.split(",").map(m=>m.trim()).filter(Boolean) : form.related_modules };
    await base44.entities.NCOSMemory.create(data);
    setSaving(false);
    setShowForm(false);
    setForm(BLANK);
    load();
  };

  const archive = async (m) => {
    await base44.entities.NCOSMemory.update(m.id, { archived: true });
    setSelected(null);
    load();
  };

  const generateMemories = async () => {
    setGenerating(true);
    const [builds, improvements, issues] = await Promise.all([
      base44.entities.BuildRegistry.list("-created_date", 50).catch(() => []),
      base44.entities.ImprovementItem.filter({ status: "done" }, "-created_date", 20).catch(() => []),
      base44.entities.DiagnosticIssue.filter({ status: "resolved" }, "-created_date", 20).catch(() => []),
    ]);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are the NCOS Memory System. Review the current platform state and generate organizational memory entries.

BUILDS (${builds.length}):
${builds.slice(0,10).map(b=>`- ${b.name} [${b.rail}]: blocked=${b.is_blocked||false}, tasks=${(b.completed_tasks||[]).length}/${(b.required_tasks||[]).length}`).join("\n")}

COMPLETED IMPROVEMENTS: ${improvements.map(i=>i.title).join(", ") || "none"}
RESOLVED ISSUES: ${issues.map(i=>i.title).join(", ") || "none"}

Generate 5-8 organizational memory entries that NCOS should remember. Include:
- Architecture decisions already made
- Known risks or workarounds
- Lessons learned from the current platform state
- Completed work that should not be duplicated
- Canon gap notes for the legal domain

Return an array of memory items.`,
      response_json_schema: {
        type: "object",
        properties: {
          memories: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                memory_type: { type: "string" },
                description: { type: "string" },
                rationale: { type: "string" },
                do_not_repeat: { type: "boolean" },
                tags: { type: "array", items: { type: "string" } }
              }
            }
          }
        },
        required: ["memories"]
      }
    });
    const existing = new Set(memories.map(m => m.title));
    const toCreate = (res.memories || []).filter(m => !existing.has(m.title));
    await Promise.all(toCreate.map(m => base44.entities.NCOSMemory.create({ ...m, recorded_by: "NCOS Auto-Memory" })));
    setGenerating(false);
    load();
  };

  const filtered = memories.filter(m => {
    if (typeFilter !== "all" && m.memory_type !== typeFilter) return false;
    if (search && !m.title.toLowerCase().includes(search.toLowerCase()) && !(m.description||"").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const doNotRepeat = memories.filter(m => m.do_not_repeat && !m.archived);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">NCOS · Organizational Intelligence</p>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Brain className="w-6 h-6 text-violet-500" />NCOS Memory
          </h1>
          <p className="text-sm text-muted-foreground">Persistent organizational memory — decisions, lessons, risks, completed work</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={generateMemories} disabled={generating}>
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            <span className="ml-1.5">Auto-Generate</span>
          </Button>
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-1.5" />Add Memory
          </Button>
        </div>
      </div>

      {doNotRepeat.length > 0 && (
        <Card className="p-3 border border-amber-200 bg-amber-50 mb-4">
          <p className="text-xs font-bold text-amber-700 uppercase mb-1.5 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" />Do Not Repeat — {doNotRepeat.length} items</p>
          <div className="flex flex-wrap gap-1.5">
            {doNotRepeat.map(m => <Badge key={m.id} variant="outline" className="text-[10px] border-amber-300 text-amber-700">{m.title}</Badge>)}
          </div>
        </Card>
      )}

      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-40">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search memories..." className="pl-8 h-8 text-xs" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-8 text-xs w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.entries(TYPE_META).map(([k,v]) => <SelectItem key={k} value={k} className="text-xs">{v.icon} {v.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <Brain className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
          <p className="text-sm text-muted-foreground mb-3">No memories yet. Click "Auto-Generate" to have NCOS analyze the platform and create initial memory entries.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="space-y-1.5 max-h-[calc(100vh-22rem)] overflow-y-auto pr-1">
            <p className="text-xs text-muted-foreground font-semibold mb-2">{filtered.length} entries</p>
            {filtered.map(m => {
              const meta = TYPE_META[m.memory_type] || { icon: "📝", color: "text-slate-600 bg-slate-50 border-slate-200", label: m.memory_type };
              return (
                <button key={m.id} onClick={() => setSelected(m)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${selected?.id === m.id ? "bg-primary/10 border-primary/30" : "border-border/40 hover:bg-muted"}`}>
                  <div className="flex items-start gap-2">
                    <span className="text-base flex-shrink-0">{meta.icon}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium line-clamp-2">{m.title}</p>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <Badge variant="outline" className={`text-[9px] ${meta.color}`}>{meta.label}</Badge>
                        {m.do_not_repeat && <Badge variant="outline" className="text-[9px] text-red-600 border-red-200">🚫 Don't Repeat</Badge>}
                        <span className="text-[9px] text-muted-foreground">{moment(m.created_date).fromNow()}</span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {selected && (
            <div className="lg:col-span-2">
              <Card className="p-5 border border-border/60">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-lg">{TYPE_META[selected.memory_type]?.icon || "📝"}</span>
                      <Badge variant="outline" className={`text-[10px] ${TYPE_META[selected.memory_type]?.color || ""}`}>{TYPE_META[selected.memory_type]?.label}</Badge>
                      {selected.do_not_repeat && <Badge variant="outline" className="text-[10px] text-red-600 border-red-200">🚫 Do Not Repeat</Badge>}
                    </div>
                    <h2 className="text-sm font-bold">{selected.title}</h2>
                  </div>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => archive(selected)}>
                    <Archive className="w-3 h-3 mr-1" />Archive
                  </Button>
                </div>

                {selected.description && <div className="bg-muted rounded-lg p-3 text-sm mb-3 leading-relaxed">{selected.description}</div>}
                {selected.context && <div className="mb-3"><p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Context</p><p className="text-sm text-muted-foreground">{selected.context}</p></div>}
                {selected.decision_made && <div className="mb-3"><p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Decision Made</p><p className="text-sm bg-blue-50 border border-blue-100 rounded p-2">{selected.decision_made}</p></div>}
                {selected.rationale && <div className="mb-3"><p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Rationale</p><p className="text-sm text-muted-foreground">{selected.rationale}</p></div>}
                {selected.outcome && <div className="mb-3"><p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Outcome</p><p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded p-2">{selected.outcome}</p></div>}

                {(selected.related_modules||[]).length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-1 flex items-center gap-1"><Link2 className="w-3 h-3" />Related Modules</p>
                    <div className="flex flex-wrap gap-1.5">{selected.related_modules.map(m => <Badge key={m} variant="outline" className="text-xs">{m}</Badge>)}</div>
                  </div>
                )}
                {(selected.tags||[]).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {selected.tags.map(t => <Badge key={t} variant="secondary" className="text-[10px]"><Tag className="w-2.5 h-2.5 mr-1 inline" />{t}</Badge>)}
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground mt-4">Recorded {moment(selected.created_date).fromNow()} by {selected.recorded_by || "NCOS"}</p>
              </Card>
            </div>
          )}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Memory Entry</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Type</label>
              <Select value={form.memory_type} onValueChange={v => setForm({...form, memory_type: v})}>
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(TYPE_META).map(([k,v]) => <SelectItem key={k} value={k}>{v.icon} {v.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Title *</label><Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="What should NCOS remember?" className="text-sm" /></div>
            <div><label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Description</label><Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={3} className="text-sm resize-none" /></div>
            <div><label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Decision Made</label><Textarea value={form.decision_made} onChange={e => setForm({...form, decision_made: e.target.value})} rows={2} className="text-sm resize-none" /></div>
            <div><label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Rationale</label><Textarea value={form.rationale} onChange={e => setForm({...form, rationale: e.target.value})} rows={2} className="text-sm resize-none" /></div>
            <div><label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Related Modules (comma-separated)</label><Input value={typeof form.related_modules === "string" ? form.related_modules : form.related_modules.join(", ")} onChange={e => setForm({...form, related_modules: e.target.value})} placeholder="JurisEngine, Canon, Evidence Vault" className="text-sm" /></div>
            <div><label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Tags (comma-separated)</label><Input value={typeof form.tags === "string" ? form.tags : form.tags.join(", ")} onChange={e => setForm({...form, tags: e.target.value})} placeholder="legal, canon, architecture" className="text-sm" /></div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="dnr" checked={form.do_not_repeat} onChange={e => setForm({...form, do_not_repeat: e.target.checked})} />
              <label htmlFor="dnr" className="text-sm cursor-pointer">🚫 Do Not Repeat — warn if similar work is proposed</label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button size="sm" onClick={save} disabled={saving || !form.title}>{saving ? "Saving..." : "Save Memory"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}