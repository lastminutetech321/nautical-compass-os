import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  BookOpen, Plus, Save, Sparkles, Loader2, History, ChevronDown, ChevronRight,
  CheckCircle, AlertTriangle, Tag, Link2, FileText, RefreshCw, Trash2, Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  { value: "nc_doctrine", label: "NC Doctrine", group: "NC" },
  { value: "court_compass", label: "Court Compass", group: "NC" },
  { value: "investigation_compass", label: "Investigation Compass", group: "NC" },
  { value: "resource_compass", label: "Resource Compass", group: "NC" },
  { value: "foia_guide", label: "FOIA Guide", group: "NC" },
  { value: "evidence_standard", label: "Evidence Standard", group: "AI" },
  { value: "ai_instruction", label: "AI Instruction", group: "AI" },
  { value: "other", label: "Other", group: "Other" },
];

const AUTHORITY_LEVELS = [
  { value: "constitutional", label: "Constitutional" },
  { value: "supreme_court", label: "U.S. Supreme Court" },
  { value: "circuit_court", label: "Circuit Court" },
  { value: "district_court", label: "District Court" },
  { value: "federal_agency", label: "Federal Agency" },
  { value: "state_supreme", label: "State Supreme Court" },
  { value: "state_appellate", label: "State Appellate" },
  { value: "state_statute", label: "State Statute" },
  { value: "nc_doctrine", label: "NC Doctrine" },
  { value: "administrative", label: "Administrative" },
  { value: "policy", label: "Policy" },
];

const RELATED_MODULES = [
  "JurisEngine", "Court Compass", "Investigation Compass", "Resource Compass",
  "FOIA Tracker", "Decision Compass", "Evidence Vault", "Labor Rail", "Authority Compass"
];

const STATUS_COLORS = {
  draft: "bg-slate-100 text-slate-700",
  pending_review: "bg-amber-100 text-amber-700",
  active: "bg-emerald-100 text-emerald-700",
  superseded: "bg-orange-100 text-orange-700",
  archived: "bg-slate-100 text-slate-500",
};

const grouped = CATEGORIES.reduce((acc, c) => {
  if (!acc[c.group]) acc[c.group] = [];
  acc[c.group].push(c);
  return acc;
}, {});

const emptyForm = {
  title: "", citation: "", jurisdiction: "Federal", category: "federal_statute",
  authority_level: "federal_agency", summary: "", content: "", full_text: "",
  keywords: "", tags: "", related_doctrines: "", related_statutes: "",
  related_case_law: "", source_url: "", ai_services: "", status: "draft", version: "1.0"
};

export default function CanonEntryBuilder() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aiExpanding, setAiExpanding] = useState(false);
  const [aiField, setAiField] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedModules, setSelectedModules] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.CanonEntry.list("-created_date", 500).catch(() => []);
    setEntries(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const selectEntry = (entry) => {
    setSelected(entry);
    setEditing(false);
    setShowHistory(false);
    setForm({
      title: entry.title || "",
      citation: entry.citation || "",
      jurisdiction: entry.jurisdiction || "Federal",
      category: entry.category || "federal_statute",
      authority_level: entry.authority_level || "federal_agency",
      summary: entry.summary || "",
      content: entry.content || "",
      full_text: entry.full_text || "",
      keywords: (entry.keywords || []).join(", "),
      tags: (entry.tags || []).join(", "),
      related_doctrines: (entry.related_doctrines || []).join(", "),
      related_statutes: (entry.related_statutes || []).join(", "),
      related_case_law: (entry.related_case_law || []).join(", "),
      source_url: entry.source_url || "",
      ai_services: (entry.ai_services || []).join(", "),
      status: entry.status || "draft",
      version: entry.version || "1.0",
    });
    setSelectedModules(entry.ai_services || []);
  };

  const newEntry = () => {
    setSelected(null);
    setEditing(true);
    setForm(emptyForm);
    setSelectedModules([]);
    setShowHistory(false);
  };

  const save = async () => {
    if (!form.title.trim() || !form.content.trim()) return;
    setSaving(true);

    const payload = {
      ...form,
      keywords: form.keywords.split(",").map(s => s.trim()).filter(Boolean),
      tags: form.tags.split(",").map(s => s.trim()).filter(Boolean),
      related_doctrines: form.related_doctrines.split(",").map(s => s.trim()).filter(Boolean),
      related_statutes: form.related_statutes.split(",").map(s => s.trim()).filter(Boolean),
      related_case_law: form.related_case_law.split(",").map(s => s.trim()).filter(Boolean),
      ai_services: selectedModules,
      imported_at: selected ? selected.imported_at : new Date().toISOString(),
      indexed_at: new Date().toISOString(),
      search_index: [form.title, form.citation, form.summary, form.keywords, form.tags].join(" ").toLowerCase(),
    };

    // Append to revision history if editing
    if (selected) {
      const prevHistory = selected.revision_history || [];
      payload.revision_history = [
        ...prevHistory,
        {
          version: selected.version || "1.0",
          modified_at: new Date().toISOString(),
          snapshot: { title: selected.title, content: selected.content?.slice(0, 200), status: selected.status }
        }
      ];
      // Bump version
      const parts = (form.version || "1.0").split(".");
      payload.version = `${parts[0]}.${parseInt(parts[1] || "0") + 1}`;
    }

    let result;
    if (selected) {
      result = await base44.entities.CanonEntry.update(selected.id, payload);
    } else {
      result = await base44.entities.CanonEntry.create(payload);
    }

    setSaving(false);
    await load();
    selectEntry(result);
    setEditing(false);
  };

  const verify = async () => {
    if (!selected) return;
    const result = await base44.entities.CanonEntry.update(selected.id, {
      verified: true, status: "active", reviewed_at: new Date().toISOString(),
    });
    await load();
    selectEntry(result);
  };

  const deleteEntry = async () => {
    if (!selected) return;
    if (!confirm(`Delete "${selected.title}"? This cannot be undone.`)) return;
    await base44.entities.CanonEntry.delete(selected.id);
    setSelected(null);
    setEditing(false);
    load();
  };

  const aiExpand = async (field) => {
    if (!form.title) return;
    setAiExpanding(true); setAiField(field);
    const cat = CATEGORIES.find(c => c.value === form.category)?.label || form.category;

    const prompts = {
      summary: `Write a concise 2-3 sentence summary of "${form.title}" (${cat}, ${form.jurisdiction}). Include: what it is, its legal basis, and key application. ${form.citation ? `Citation: ${form.citation}.` : ""} Be factual and precise. Do not invent specific case citations.`,
      content: `Write a structured Canon entry for "${form.title}" (${form.citation || "no citation yet"}) in the ${cat} category under ${form.jurisdiction} law.

Include:
1. Core principle or statutory text summary
2. Legal basis and source
3. Application to civil rights / investigation / NCOS use cases  
4. Key limitations and exceptions
5. Related doctrines and cross-references

Be accurate and modular. Mark any uncertain areas as [NEEDS VERIFICATION]. Do not fabricate specific holdings or citations.`,
      keywords: `List 10-15 relevant search keywords for a Canon entry titled "${form.title}" (${cat}). Return as comma-separated terms only. Focus on legal terms, doctrine names, and related concepts.`,
    };

    const result = await base44.integrations.Core.InvokeLLM({ prompt: prompts[field] || prompts.content });
    setForm(f => ({ ...f, [field]: result }));
    setAiExpanding(false); setAiField(null);
  };

  const toggleModule = (mod) => {
    setSelectedModules(prev => prev.includes(mod) ? prev.filter(m => m !== mod) : [...prev, mod]);
  };

  const filtered = entries.filter(e => {
    if (statusFilter !== "all" && e.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (e.title || "").toLowerCase().includes(q) || (e.citation || "").toLowerCase().includes(q);
    }
    return true;
  });

  const stats = {
    total: entries.length,
    verified: entries.filter(e => e.verified).length,
    pending: entries.filter(e => e.status === "pending_review").length,
    draft: entries.filter(e => e.status === "draft").length,
    active: entries.filter(e => e.status === "active").length,
  };

  return (
    <div className="h-full">
      <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">NCOS · Canon Population</p>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-violet-500" />Canon Entry Builder
          </h1>
          <p className="text-sm text-muted-foreground">Create, version, and verify structured Canon entries with full metadata</p>
        </div>
        <Button size="sm" onClick={newEntry}><Plus className="w-4 h-4 mr-1.5" />New Entry</Button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-5 gap-2 mb-5">
        {[
          { label: "Total", value: stats.total, color: "text-foreground" },
          { label: "Active", value: stats.active, color: "text-emerald-600" },
          { label: "Verified", value: stats.verified, color: "text-emerald-700" },
          { label: "Pending", value: stats.pending, color: "text-amber-600" },
          { label: "Draft", value: stats.draft, color: "text-muted-foreground" },
        ].map(s => (
          <Card key={s.label} className="p-2.5 border border-border/60 text-center">
            <p className={`text-lg font-black ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Entry list */}
        <div>
          <div className="flex gap-2 mb-3">
            <Input placeholder="Search entries..." value={search} onChange={e => setSearch(e.target.value)} className="h-8 text-xs flex-1" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="pending_review">Pending</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="superseded">Superseded</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 max-h-[calc(100vh-22rem)] overflow-y-auto pr-1">
            {loading ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">No entries yet</div>
            ) : filtered.map(e => (
              <button key={e.id} onClick={() => selectEntry(e)}
                className={`w-full text-left px-3 py-2.5 rounded-lg transition-all border ${selected?.id === e.id ? "bg-primary/10 border-primary/30" : "border-transparent hover:bg-muted"}`}>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium truncate">{e.title}</p>
                  {e.verified && <CheckCircle className="w-3 h-3 text-emerald-500 flex-shrink-0 mt-1" />}
                </div>
                {e.citation && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{e.citation}</p>}
                <div className="flex items-center gap-1.5 mt-1">
                  <Badge className={`text-[9px] py-0 ${STATUS_COLORS[e.status] || ""}`}>{e.status?.replace(/_/g, " ")}</Badge>
                  {e.version && <span className="text-[9px] text-muted-foreground">v{e.version}</span>}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Detail / Editor */}
        <div className="lg:col-span-2">
          {!selected && !editing ? (
            <Card className="p-8 border border-dashed border-border text-center">
              <BookOpen className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-30" />
              <p className="text-sm text-muted-foreground mb-3">Select an entry to view or edit, or create a new one</p>
              <Button size="sm" onClick={newEntry}><Plus className="w-4 h-4 mr-1.5" />New Entry</Button>
            </Card>
          ) : (
            <Card className="p-5 border border-border/60">
              {/* Header */}
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  {selected && !editing && (
                    <>
                      <Badge className={`text-[10px] ${STATUS_COLORS[selected.status] || ""}`}>{selected.status?.replace(/_/g, " ")}</Badge>
                      {selected.verified && <Badge className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle className="w-2.5 h-2.5 mr-1 inline" />Verified</Badge>}
                      <span className="text-[10px] text-muted-foreground">v{selected.version || "1.0"}</span>
                    </>
                  )}
                  {editing && <span className="text-sm font-medium text-muted-foreground">{selected ? "Editing" : "New Entry"}</span>}
                </div>
                <div className="flex gap-2">
                  {!editing && selected && (
                    <>
                      {!selected.verified && (
                        <Button size="sm" variant="outline" onClick={verify} className="text-emerald-600 border-emerald-300">
                          <CheckCircle className="w-3.5 h-3.5 mr-1.5" />Verify & Activate
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Edit</Button>
                      <Button size="sm" variant="ghost" onClick={() => setShowHistory(!showHistory)}>
                        <History className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-red-500" onClick={deleteEntry}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </>
                  )}
                  {editing && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => { setEditing(false); if (!selected) { setForm(emptyForm); } }}>Cancel</Button>
                      <Button size="sm" onClick={save} disabled={saving || !form.title.trim() || !form.content.trim()}>
                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
                        {saving ? "Saving..." : "Save Entry"}
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Version history panel */}
              {showHistory && selected && (
                <div className="mb-4 p-3 bg-muted rounded-lg border border-border/40">
                  <p className="text-xs font-semibold mb-2 flex items-center gap-1.5"><History className="w-3.5 h-3.5" />Version History</p>
                  {(selected.revision_history || []).length === 0 ? (
                    <p className="text-xs text-muted-foreground">No prior versions recorded.</p>
                  ) : (
                    <div className="space-y-2">
                      {[...selected.revision_history].reverse().map((r, i) => (
                        <div key={i} className="text-xs border border-border/40 rounded p-2">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">v{r.version}</span>
                            <span className="text-muted-foreground">{new Date(r.modified_at).toLocaleString()}</span>
                          </div>
                          {r.snapshot?.title && <p className="text-muted-foreground">Title: {r.snapshot.title}</p>}
                          {r.snapshot?.status && <p className="text-muted-foreground">Status: {r.snapshot.status}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* View mode */}
              {!editing && selected && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold">{selected.title}</h2>
                    {selected.citation && <p className="text-sm text-muted-foreground">{selected.citation}</p>}
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {selected.jurisdiction && <Badge variant="outline" className="text-[10px]">{selected.jurisdiction}</Badge>}
                      {selected.authority_level && <Badge variant="outline" className="text-[10px]">{selected.authority_level?.replace(/_/g, " ")}</Badge>}
                    </div>
                  </div>
                  {selected.summary && (
                    <div className="bg-violet-50 border border-violet-100 rounded-lg p-3 text-sm text-violet-900">{selected.summary}</div>
                  )}
                  <Tabs defaultValue="content">
                    <TabsList>
                      <TabsTrigger value="content">Content</TabsTrigger>
                      <TabsTrigger value="meta">Metadata</TabsTrigger>
                      <TabsTrigger value="links">Links & Modules</TabsTrigger>
                    </TabsList>
                    <TabsContent value="content">
                      <div className="bg-muted p-4 rounded-lg text-sm whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
                        {selected.content || "No content."}
                      </div>
                    </TabsContent>
                    <TabsContent value="meta">
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        {[
                          ["Category", selected.category?.replace(/_/g, " ")],
                          ["Authority Level", selected.authority_level?.replace(/_/g, " ")],
                          ["Jurisdiction", selected.jurisdiction],
                          ["Version", selected.version],
                          ["Effective Date", selected.effective_date],
                          ["Source URL", selected.source_url],
                        ].map(([k, v]) => v ? (
                          <div key={k}><p className="text-muted-foreground">{k}</p><p className="font-medium">{v}</p></div>
                        ) : null)}
                      </div>
                      {(selected.keywords || []).length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs text-muted-foreground mb-1.5">Keywords</p>
                          <div className="flex flex-wrap gap-1">
                            {selected.keywords.map(k => <Badge key={k} variant="secondary" className="text-[10px]">{k}</Badge>)}
                          </div>
                        </div>
                      )}
                    </TabsContent>
                    <TabsContent value="links">
                      <div className="space-y-3 text-xs">
                        {[
                          ["Related Doctrines", selected.related_doctrines],
                          ["Related Statutes", selected.related_statutes],
                          ["Related Case Law", selected.related_case_law],
                          ["AI Services / Modules", selected.ai_services],
                        ].map(([label, items]) => (items || []).length > 0 ? (
                          <div key={label}>
                            <p className="text-muted-foreground font-semibold uppercase mb-1">{label}</p>
                            <div className="flex flex-wrap gap-1">
                              {items.map(i => <Badge key={i} variant="outline" className="text-[10px]">{i}</Badge>)}
                            </div>
                          </div>
                        ) : null)}
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              )}

              {/* Edit mode */}
              {editing && (
                <div className="space-y-4 max-h-[calc(100vh-18rem)] overflow-y-auto pr-1">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <Label className="text-xs">Title *</Label>
                      <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. 42 U.S.C. § 1983 — Civil Action for Deprivation of Rights" className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs">Citation</Label>
                      <Input value={form.citation} onChange={e => setForm({ ...form, citation: e.target.value })} placeholder="42 U.S.C. § 1983" className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs">Jurisdiction</Label>
                      <Input value={form.jurisdiction} onChange={e => setForm({ ...form, jurisdiction: e.target.value })} placeholder="Federal" className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs">Category</Label>
                      <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
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
                    <div>
                      <Label className="text-xs">Authority Level</Label>
                      <Select value={form.authority_level} onValueChange={v => setForm({ ...form, authority_level: v })}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>{AUTHORITY_LEVELS.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Summary */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-xs">Summary</Label>
                      <Button type="button" size="sm" variant="ghost" className="h-6 text-xs" onClick={() => aiExpand("summary")} disabled={aiExpanding}>
                        {aiExpanding && aiField === "summary" ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Sparkles className="w-3 h-3 mr-1" />}AI Draft
                      </Button>
                    </div>
                    <Textarea value={form.summary} onChange={e => setForm({ ...form, summary: e.target.value })} rows={2} className="text-sm" placeholder="2-3 sentence summary of the authority and its application" />
                  </div>

                  {/* Content */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-xs">Content / Analysis *</Label>
                      <Button type="button" size="sm" variant="ghost" className="h-6 text-xs" onClick={() => aiExpand("content")} disabled={aiExpanding}>
                        {aiExpanding && aiField === "content" ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Sparkles className="w-3 h-3 mr-1" />}AI Expand
                      </Button>
                    </div>
                    <Textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} rows={8} className="text-sm font-mono" placeholder="Full structured content — doctrine explanation, application, exceptions, NCOS use cases..." />
                  </div>

                  {/* Keywords */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-xs">Keywords (comma-separated)</Label>
                      <Button type="button" size="sm" variant="ghost" className="h-6 text-xs" onClick={() => aiExpand("keywords")} disabled={aiExpanding}>
                        {aiExpanding && aiField === "keywords" ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Sparkles className="w-3 h-3 mr-1" />}AI Generate
                      </Button>
                    </div>
                    <Input value={form.keywords} onChange={e => setForm({ ...form, keywords: e.target.value })} placeholder="civil rights, § 1983, color of law, deprivation, rights..." className="mt-1" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Related Doctrines (comma-sep)</Label>
                      <Input value={form.related_doctrines} onChange={e => setForm({ ...form, related_doctrines: e.target.value })} placeholder="qualified immunity, Monell doctrine..." className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs">Related Statutes (comma-sep)</Label>
                      <Input value={form.related_statutes} onChange={e => setForm({ ...form, related_statutes: e.target.value })} placeholder="28 U.S.C. § 1331, 42 U.S.C. § 1985..." className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs">Related Case Law (comma-sep)</Label>
                      <Input value={form.related_case_law} onChange={e => setForm({ ...form, related_case_law: e.target.value })} placeholder="Monroe v. Pape, Monell v. NYC..." className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs">Tags (comma-sep)</Label>
                      <Input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="civil-rights, federal, priority..." className="mt-1" />
                    </div>
                  </div>

                  {/* Module connections */}
                  <div>
                    <Label className="text-xs mb-2 block">Connected Modules / AI Services</Label>
                    <div className="flex flex-wrap gap-2">
                      {RELATED_MODULES.map(mod => (
                        <button key={mod} type="button"
                          onClick={() => toggleModule(mod)}
                          className={`text-xs px-2.5 py-1 rounded-full border transition-all ${selectedModules.includes(mod) ? "bg-violet-100 text-violet-800 border-violet-300" : "border-border text-muted-foreground hover:border-primary"}`}>
                          {mod}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Source URL</Label>
                      <Input value={form.source_url} onChange={e => setForm({ ...form, source_url: e.target.value })} placeholder="https://uscode.house.gov/..." className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs">Status</Label>
                      <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="pending_review">Pending Review</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="superseded">Superseded</SelectItem>
                          <SelectItem value="archived">Archived</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                    <AlertTriangle className="w-3.5 h-3.5 inline mr-1.5" />
                    <strong>Verification required before JurisEngine use.</strong> Entries remain in draft until a human reviewer verifies accuracy and marks them Active. Do not verify without checking the source.
                  </div>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}