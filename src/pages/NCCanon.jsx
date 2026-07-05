import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { BookOpen, Plus, Search, Link2, CheckCircle, Edit2, Trash2, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const CATEGORIES = [
  { value: "federal_statute", label: "Federal Statute", group: "Law" },
  { value: "state_statute", label: "State Statute", group: "Law" },
  { value: "case_law", label: "Case Law", group: "Law" },
  { value: "constitutional_law", label: "Constitutional Law", group: "Law" },
  { value: "civil_rights", label: "Civil Rights", group: "Law" },
  { value: "standing_doctrine", label: "Standing Doctrine", group: "Doctrine" },
  { value: "jurisdiction", label: "Jurisdiction", group: "Doctrine" },
  { value: "capacity_doctrine", label: "Capacity Doctrine", group: "Doctrine" },
  { value: "administrative_law", label: "Administrative Law", group: "Law" },
  { value: "consumer_protection", label: "Consumer Protection", group: "Law" },
  { value: "indigenous_rights", label: "Indigenous Rights", group: "Law" },
  { value: "nc_doctrine", label: "NC Doctrine", group: "NC" },
  { value: "labor_rail", label: "Labor Rail", group: "NC" },
  { value: "resource_compass", label: "Resource Compass", group: "NC" },
  { value: "culture_rail", label: "Culture Rail", group: "NC" },
  { value: "authority_compass", label: "Authority Compass", group: "NC" },
  { value: "court_compass", label: "Court Compass", group: "NC" },
  { value: "investigation_compass", label: "Investigation Compass", group: "NC" },
  { value: "ai_instruction", label: "AI Instruction", group: "AI" },
  { value: "decision_tree", label: "Decision Tree", group: "AI" },
  { value: "intake_workflow", label: "Intake Workflow", group: "AI" },
  { value: "evidence_standard", label: "Evidence Standard", group: "AI" },
  { value: "prompt_library", label: "Prompt Library", group: "AI" },
  { value: "other", label: "Other", group: "Other" },
];

const groupColors = { Law: "bg-blue-50 text-blue-800 border-blue-200", Doctrine: "bg-amber-50 text-amber-800 border-amber-200", NC: "bg-violet-50 text-violet-800 border-violet-200", AI: "bg-emerald-50 text-emerald-800 border-emerald-200", Other: "bg-slate-50 text-slate-600 border-slate-200" };

const grouped = CATEGORIES.reduce((acc, c) => {
  if (!acc[c.group]) acc[c.group] = [];
  acc[c.group].push(c);
  return acc;
}, {});

const emptyForm = { title: "", category: "other", subcategory: "", jurisdiction: "", content: "", citation: "", source_url: "", tags: "", ai_services: "", status: "draft", version: "1.0" };

export default function NCCanon() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [aiExpanding, setAiExpanding] = useState(false);

  const load = () => {
    setLoading(true);
    base44.entities.CanonEntry.list("-created_date", 500).then(data => {
      setEntries(data);
      if (data.length > 0 && !selected) setSelected(data[0]);
    }).finally(() => setLoading(false));
  };

  useEffect(load, []);

  useEffect(() => {
    if (editing) {
      setForm({ title: editing.title, category: editing.category, subcategory: editing.subcategory || "", jurisdiction: editing.jurisdiction || "", content: editing.content, citation: editing.citation || "", source_url: editing.source_url || "", tags: (editing.tags || []).join(", "), ai_services: (editing.ai_services || []).join(", "), status: editing.status || "draft", version: editing.version || "1.0" });
    } else {
      setForm(emptyForm);
    }
  }, [editing, formOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const data = { ...form, tags: form.tags.split(",").map(t => t.trim()).filter(Boolean), ai_services: form.ai_services.split(",").map(s => s.trim()).filter(Boolean), linked_entry_ids: editing?.linked_entry_ids || [] };
    let result;
    if (editing) { result = await base44.entities.CanonEntry.update(editing.id, data); }
    else { result = await base44.entities.CanonEntry.create(data); }
    setSaving(false);
    setFormOpen(false);
    setEditing(null);
    setSelected(result);
    load();
  };

  const aiExpand = async () => {
    if (!form.title || !form.category) return;
    setAiExpanding(true);
    const cat = CATEGORIES.find(c => c.value === form.category);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a legal researcher and AI architect for Nautical Compass OS (NCOS). 

Expand this Canon entry:
- Title: ${form.title}
- Category: ${cat?.label || form.category}
- Jurisdiction: ${form.jurisdiction || "Federal/General"}
- Current content: ${form.content || "(none)"}

Write a thorough, accurate Canon entry. Include:
1. Core definition or principle
2. Legal foundation or source (if applicable)
3. How it applies to NC investigations/cases
4. Key limitations or exceptions
5. Connections to other NC doctrines

Keep it authoritative, precise, and modular. This will be referenced by AI services.`,
    });
    setForm(f => ({ ...f, content: result }));
    setAiExpanding(false);
  };

  const markVerified = async (entry) => {
    const updated = await base44.entities.CanonEntry.update(entry.id, { verified: true, status: "active" });
    setSelected(updated);
    load();
  };

  const filtered = entries.filter(e => {
    if (catFilter !== "all" && e.category !== catFilter) return false;
    if (search && !e.title.toLowerCase().includes(search.toLowerCase()) && !(e.content || "").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const catLabel = (val) => CATEGORIES.find(c => c.value === val)?.label || val;
  const catGroup = (val) => CATEGORIES.find(c => c.value === val)?.group || "Other";

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">NCOS · Layer 2</p>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><BookOpen className="w-6 h-6 text-violet-500" />NC Canon</h1>
          <p className="text-sm text-muted-foreground">{entries.length} entries · shared knowledge referenced by all AI services</p>
        </div>
        <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="w-4 h-4 mr-1.5" />Add Entry</Button>
      </div>

      <div className="bg-violet-50 border border-violet-200 rounded-lg px-4 py-2.5 mb-5 text-xs text-violet-800 flex items-center gap-2">
        <BookOpen className="w-3.5 h-3.5 flex-shrink-0" />
        <strong>Layer 2 — NC Canon.</strong> Authoritative knowledge base. Every AI service queries this instead of embedding rules directly. Add new knowledge without redesigning any service.
      </div>

      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search canon..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
        </div>
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="w-44 h-9 text-sm"><SelectValue placeholder="All categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {Object.entries(grouped).map(([grp, cats]) => (
              <React.Fragment key={grp}>
                <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase">{grp}</div>
                {cats.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </React.Fragment>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <BookOpen className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
          <p className="text-muted-foreground text-sm">No canon entries yet. Start building the knowledge base.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Entry list */}
          <div className="space-y-1.5 max-h-[calc(100vh-14rem)] overflow-y-auto pr-1">
            {filtered.map(entry => (
              <button key={entry.id} onClick={() => setSelected(entry)} className={`w-full text-left px-3 py-2.5 rounded-lg transition-all border ${selected?.id === entry.id ? "bg-primary/10 border-primary/30" : "border-transparent hover:bg-muted"}`}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium truncate">{entry.title}</p>
                  {entry.verified && <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />}
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <Badge variant="outline" className={`text-[9px] border px-1.5 ${groupColors[catGroup(entry.category)] || ""}`}>{catLabel(entry.category)}</Badge>
                  {entry.jurisdiction && <span className="text-[9px] text-muted-foreground">{entry.jurisdiction}</span>}
                </div>
              </button>
            ))}
          </div>

          {/* Detail */}
          {selected && (
            <div className="lg:col-span-2">
              <Card className="p-5 border border-border/60">
                <div className="flex items-start justify-between mb-3 flex-wrap gap-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge variant="outline" className={`text-[10px] border ${groupColors[catGroup(selected.category)] || ""}`}>{catLabel(selected.category)}</Badge>
                      {selected.verified && <Badge className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle className="w-2.5 h-2.5 mr-1 inline" />Verified</Badge>}
                      <Badge variant="outline" className="text-[10px] capitalize">{selected.status}</Badge>
                    </div>
                    <h2 className="text-base font-semibold">{selected.title}</h2>
                    {selected.citation && <p className="text-xs text-muted-foreground">{selected.citation}</p>}
                  </div>
                  <div className="flex gap-2">
                    {!selected.verified && <Button size="sm" variant="outline" onClick={() => markVerified(selected)}><CheckCircle className="w-3.5 h-3.5 mr-1.5" />Verify</Button>}
                    <Button size="sm" variant="outline" onClick={() => { setEditing(selected); setFormOpen(true); }}><Edit2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>

                <div className="bg-muted p-4 rounded-lg text-sm whitespace-pre-wrap leading-relaxed mb-3">{selected.content}</div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  {(selected.ai_services || []).length > 0 && (
                    <div><p className="font-semibold text-muted-foreground mb-1">AI SERVICES USING THIS</p><div className="flex flex-wrap gap-1">{selected.ai_services.map(s => <Badge key={s} className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200">{s}</Badge>)}</div></div>
                  )}
                  {(selected.tags || []).length > 0 && (
                    <div><p className="font-semibold text-muted-foreground mb-1">TAGS</p><div className="flex flex-wrap gap-1">{selected.tags.map(t => <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>)}</div></div>
                  )}
                </div>
                {selected.source_url && <a href={selected.source_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary mt-2 flex items-center gap-1 hover:underline"><Link2 className="w-3 h-3" />Source</a>}
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Form */}
      <Dialog open={formOpen} onOpenChange={v => { setFormOpen(v); if (!v) setEditing(null); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Canon Entry" : "New Canon Entry"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Title</Label><Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} required /></div>
              <div><Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm({...form, category: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(grouped).map(([grp, cats]) => (
                      <React.Fragment key={grp}>
                        <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase">{grp}</div>
                        {cats.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                      </React.Fragment>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Jurisdiction (optional)</Label><Input value={form.jurisdiction} onChange={e => setForm({...form, jurisdiction: e.target.value})} placeholder="Federal, California, etc." /></div>
              <div><Label>Citation (optional)</Label><Input value={form.citation} onChange={e => setForm({...form, citation: e.target.value})} placeholder="42 U.S.C. § 1983" /></div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label>Content</Label>
                <Button type="button" size="sm" variant="outline" onClick={aiExpand} disabled={aiExpanding} className="h-7 text-xs gap-1">
                  {aiExpanding ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}AI Expand
                </Button>
              </div>
              <Textarea value={form.content} onChange={e => setForm({...form, content: e.target.value})} rows={10} required className="text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>AI Services using this (comma-separated)</Label><Input value={form.ai_services} onChange={e => setForm({...form, ai_services: e.target.value})} placeholder="JurisEngine, Court Compass" /></div>
              <div><Label>Tags</Label><Input value={form.tags} onChange={e => setForm({...form, tags: e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Source URL</Label><Input value={form.source_url} onChange={e => setForm({...form, source_url: e.target.value})} /></div>
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({...form, status: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["draft","active","superseded","archived"].map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => { setFormOpen(false); setEditing(null); }}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? "Saving..." : editing ? "Update" : "Add to Canon"}</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}