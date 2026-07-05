import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Map, AlertTriangle, CheckCircle, Clock, XCircle, Minus, Plus, Upload, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "react-router-dom";

const STATUS_CONFIG = {
  imported:     { label: "Imported",     color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle, dot: "bg-emerald-500" },
  partial:      { label: "Partial",      color: "bg-blue-100 text-blue-700 border-blue-200",          icon: Clock,       dot: "bg-blue-400" },
  needed_soon:  { label: "Needed Soon",  color: "bg-amber-100 text-amber-700 border-amber-200",       icon: AlertTriangle, dot: "bg-amber-500" },
  missing:      { label: "Missing",      color: "bg-red-100 text-red-700 border-red-200",             icon: XCircle,     dot: "bg-red-500" },
  not_priority: { label: "Not Priority", color: "bg-slate-100 text-slate-500 border-slate-200",       icon: Minus,       dot: "bg-slate-400" },
};

const CATEGORY_LABELS = {
  us_code_title: "U.S. Code",
  civil_rules: "Civil Rules",
  constitutional: "Constitutional",
  case_law_corpus: "Case Law",
  federal_regulation: "Regulation",
  nc_doctrine: "NC Doctrine",
  other: "Other",
};

const SEED_DATA = [
  // Priority U.S. Code Titles
  { title: "Title 1 — General Provisions",               short_code: "1 U.S.C.",   category: "us_code_title",   coverage_status: "missing",  priority_rank: 1,  notes: "Foundational definitions used across all U.S. Code.", assigned_services: ["JurisEngine"] },
  { title: "Title 5 — Government Organization & Employees", short_code: "5 U.S.C.", category: "us_code_title",  coverage_status: "missing",  priority_rank: 2,  notes: "FOIA (5 U.S.C. § 552) is critical. APA at § 706.", assigned_services: ["JurisEngine", "Authority Compass"] },
  { title: "Title 18 — Crimes and Criminal Procedure",   short_code: "18 U.S.C.",  category: "us_code_title",   coverage_status: "missing",  priority_rank: 3,  notes: "Federal criminal statutes. Investigation Compass.", assigned_services: ["Investigation Compass", "JurisEngine"] },
  { title: "Title 25 — Indians",                         short_code: "25 U.S.C.",  category: "us_code_title",   coverage_status: "missing",  priority_rank: 4,  notes: "Indigenous rights, tribal sovereignty, ICRA.", assigned_services: ["JurisEngine"] },
  { title: "Title 28 — Judiciary and Judicial Procedure", short_code: "28 U.S.C.", category: "us_code_title",   coverage_status: "missing",  priority_rank: 5,  notes: "Federal jurisdiction, 28 U.S.C. § 1331/1343/1983.", assigned_services: ["JurisEngine", "Court Compass"] },
  { title: "Title 42 — Public Health & Civil Rights",    short_code: "42 U.S.C.",  category: "us_code_title",   coverage_status: "partial",  priority_rank: 6,  notes: "§ 1983 (civil rights), § 1985, Fair Housing Act. CRITICAL.", assigned_services: ["JurisEngine", "Legal Rail"] },
  { title: "Title 52 — Voting and Elections",            short_code: "52 U.S.C.",  category: "us_code_title",   coverage_status: "missing",  priority_rank: 7,  notes: "Voting Rights Act. High priority.", assigned_services: ["JurisEngine"] },
  // Consumer Protection
  { title: "FOIA — Freedom of Information Act",          short_code: "5 U.S.C. § 552", category: "federal_regulation", coverage_status: "missing", priority_rank: 8, notes: "Evidence and records access. FOIA Tracker depends on this.", assigned_services: ["Investigation Compass", "JurisEngine"] },
  { title: "FCRA — Fair Credit Reporting Act",           short_code: "15 U.S.C. § 1681", category: "federal_regulation", coverage_status: "partial", priority_rank: 9, notes: "Consumer credit disputes. Resource Compass.", assigned_services: ["Resource Compass", "JurisEngine"] },
  { title: "FDCPA — Fair Debt Collection Practices Act", short_code: "15 U.S.C. § 1692", category: "federal_regulation", coverage_status: "partial", priority_rank: 10, notes: "Debt collection abuse protection.", assigned_services: ["Resource Compass", "JurisEngine"] },
  { title: "TILA — Truth in Lending Act",                short_code: "15 U.S.C. § 1601", category: "federal_regulation", coverage_status: "missing", priority_rank: 11, notes: "Lending disclosures. Consumer protection.", assigned_services: ["Resource Compass"] },
  { title: "EFTA — Electronic Fund Transfer Act",        short_code: "15 U.S.C. § 1693", category: "federal_regulation", coverage_status: "missing", priority_rank: 12, notes: "Digital banking and transfers.", assigned_services: ["Resource Compass"] },
  // Civil Rules
  { title: "Federal Rules of Civil Procedure",           short_code: "FRCP",       category: "civil_rules",     coverage_status: "missing",  priority_rank: 13, notes: "Pleading standards, discovery, summary judgment. Court Compass.", assigned_services: ["Court Compass", "JurisEngine"] },
  { title: "Federal Rules of Evidence",                  short_code: "FRE",        category: "civil_rules",     coverage_status: "missing",  priority_rank: 14, notes: "Admissibility standards. Evidence Vault integration.", assigned_services: ["Court Compass", "Investigation Compass"] },
  // Constitutional
  { title: "U.S. Constitution — Full Text",              short_code: "U.S. Const.", category: "constitutional", coverage_status: "missing",  priority_rank: 15, notes: "Must be imported as base. All amendments.", assigned_services: ["JurisEngine"] },
  { title: "Bill of Rights (Amendments I–X)",            short_code: "Amend. I–X", category: "constitutional",  coverage_status: "missing",  priority_rank: 16, notes: "First principles. Foundational to all civil rights work.", assigned_services: ["JurisEngine"] },
  { title: "Fourteenth Amendment",                       short_code: "U.S. Const. amend. XIV", category: "constitutional", coverage_status: "missing", priority_rank: 17, notes: "Due process, equal protection. Most litigated amendment.", assigned_services: ["JurisEngine", "Legal Rail"] },
  // Case Law Corpora
  { title: "§ 1983 Landmark Cases",                     short_code: "§1983 Cases", category: "case_law_corpus", coverage_status: "missing",  priority_rank: 18, notes: "Monroe v. Pape, Monell, Harlow v. Fitzgerald, etc.", assigned_services: ["JurisEngine"] },
  { title: "Standing Doctrine Cases",                   short_code: "Standing",    category: "case_law_corpus", coverage_status: "missing",  priority_rank: 19, notes: "Lujan v. Defenders, Sprint Comm., TransUnion v. Ramirez.", assigned_services: ["JurisEngine", "Court Compass"] },
  { title: "Capacity Doctrine Cases",                   short_code: "Capacity",    category: "case_law_corpus", coverage_status: "missing",  priority_rank: 20, notes: "Ex parte Young, Will v. Michigan, Eleventh Amendment immunity.", assigned_services: ["JurisEngine"] },
  { title: "Fourth Amendment Case Law",                 short_code: "4th Amend.",  category: "case_law_corpus", coverage_status: "partial",  priority_rank: 21, notes: "Terry, Katz, Riley, Mapp. Partial from gap records.", assigned_services: ["Investigation Compass", "JurisEngine"] },
  // NC Doctrine
  { title: "NC Doctrine — Core Principles",             short_code: "NC Doctrine", category: "nc_doctrine",     coverage_status: "missing",  priority_rank: 22, notes: "Nautical Compass foundational legal doctrine. Must be authored.", assigned_services: ["JurisEngine", "Legal Rail"] },
];

export default function CanonCoverageMap() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: "", short_code: "", category: "us_code_title", coverage_status: "missing", priority_rank: 50, notes: "", assigned_services: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.CanonCoverage.list("priority_rank", 200);
    setItems(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const seedInitialData = async () => {
    setSeeding(true);
    await base44.entities.CanonCoverage.bulkCreate(SEED_DATA);
    await load();
    setSeeding(false);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      title: item.title, short_code: item.short_code, category: item.category,
      coverage_status: item.coverage_status, priority_rank: item.priority_rank,
      notes: item.notes || "", assigned_services: (item.assigned_services || []).join(", "),
    });
    setFormOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    const data = { ...form, priority_rank: Number(form.priority_rank), assigned_services: form.assigned_services.split(",").map(s => s.trim()).filter(Boolean) };
    if (editing) {
      await base44.entities.CanonCoverage.update(editing.id, data);
    } else {
      await base44.entities.CanonCoverage.create(data);
    }
    setSaving(false);
    setFormOpen(false);
    setEditing(null);
    load();
  };

  const filtered = statusFilter === "all" ? items : items.filter(i => i.coverage_status === statusFilter);

  const counts = Object.fromEntries(
    Object.keys(STATUS_CONFIG).map(k => [k, items.filter(i => i.coverage_status === k).length])
  );
  const totalImported = counts.imported || 0;
  const coveragePct = items.length ? Math.round((totalImported / items.length) * 100) : 0;

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">NCOS · NC Canon</p>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Map className="w-6 h-6 text-violet-500" />Canon Coverage Map</h1>
          <p className="text-sm text-muted-foreground">Track which legal authorities are imported, partial, missing, or not needed.</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={load}><RefreshCw className="w-4 h-4" /></Button>
          <Button size="sm" variant="outline" onClick={() => { setEditing(null); setForm({ title: "", short_code: "", category: "us_code_title", coverage_status: "missing", priority_rank: 50, notes: "", assigned_services: "" }); setFormOpen(true); }}>
            <Plus className="w-4 h-4 mr-1.5" />Add Entry
          </Button>
          {items.length === 0 && (
            <Button size="sm" onClick={seedInitialData} disabled={seeding}>
              {seeding ? "Seeding..." : "Seed Priority List"}
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mb-6">
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
          const Icon = cfg.icon;
          return (
            <Card key={key} className={`p-3 border cursor-pointer transition-all ${statusFilter === key ? "ring-2 ring-primary" : "border-border/60"}`} onClick={() => setStatusFilter(statusFilter === key ? "all" : key)}>
              <div className="flex items-center gap-1.5 mb-1">
                <Icon className="w-3.5 h-3.5" />
                <span className="text-[10px] text-muted-foreground">{cfg.label}</span>
              </div>
              <p className="text-xl font-black">{counts[key] || 0}</p>
            </Card>
          );
        })}
      </div>

      {/* Coverage progress */}
      <Card className="p-4 border border-border/60 mb-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Overall Canon Coverage</p>
          <span className="text-sm font-black text-emerald-600">{coveragePct}%</span>
        </div>
        <div className="w-full h-3 rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${coveragePct}%` }} />
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">{totalImported} of {items.length} authorities fully imported</p>

        {/* Breakdown bar */}
        {items.length > 0 && (
          <div className="flex h-2 rounded-full overflow-hidden mt-3 gap-px">
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
              const pct = (counts[key] || 0) / items.length * 100;
              if (pct === 0) return null;
              return <div key={key} className={`${cfg.dot} transition-all`} style={{ width: `${pct}%` }} title={`${cfg.label}: ${counts[key]}`} />;
            })}
          </div>
        )}
      </Card>

      {/* Fabrication warning */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-5 flex items-start gap-2 text-xs text-red-800">
        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
        <span>
          <strong>Fabrication Prevention Active.</strong> AI services will return "Canon Gap" for any authority marked Missing or Needed Soon.
          Upload source documents via the <Link to="/canon-ingestion" className="underline">Canon Ingestion Pipeline</Link> to enable those areas.
        </span>
      </div>

      {/* Items list */}
      {items.length === 0 ? (
        <div className="text-center py-16">
          <Map className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
          <p className="text-muted-foreground text-sm mb-4">No coverage entries yet.</p>
          <Button onClick={seedInitialData} disabled={seeding}>{seeding ? "Seeding..." : "Seed Priority Coverage List"}</Button>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Status filter chips */}
          <div className="flex gap-2 flex-wrap mb-4">
            <button onClick={() => setStatusFilter("all")} className={`px-3 py-1 text-xs rounded-full border transition-all ${statusFilter === "all" ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:border-primary"}`}>All ({items.length})</button>
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <button key={key} onClick={() => setStatusFilter(statusFilter === key ? "all" : key)} className={`px-3 py-1 text-xs rounded-full border transition-all ${statusFilter === key ? "bg-primary text-white border-primary" : `border ${cfg.color}`}`}>
                {cfg.label} ({counts[key] || 0})
              </button>
            ))}
          </div>

          {filtered.map(item => {
            const cfg = STATUS_CONFIG[item.coverage_status] || STATUS_CONFIG.missing;
            const Icon = cfg.icon;
            return (
              <div key={item.id} className="flex items-start gap-3 p-3 rounded-lg border border-border/40 hover:shadow-sm transition-all cursor-pointer" onClick={() => openEdit(item)}>
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-2 ${cfg.dot}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <p className="text-sm font-semibold">{item.title}</p>
                    <Badge variant="outline" className={`text-[9px] border ${cfg.color}`}>{cfg.label}</Badge>
                    <Badge variant="outline" className="text-[9px]">{CATEGORY_LABELS[item.category] || item.category}</Badge>
                    {item.priority_rank <= 10 && <Badge className="text-[9px] bg-red-100 text-red-700 border border-red-200">Priority {item.priority_rank}</Badge>}
                  </div>
                  <p className="text-[10px] text-muted-foreground font-mono">{item.short_code}</p>
                  {item.notes && <p className="text-[10px] text-muted-foreground mt-1">{item.notes}</p>}
                  {(item.assigned_services || []).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {item.assigned_services.map(s => <Badge key={s} variant="outline" className="text-[8px] text-blue-600 border-blue-200">{s}</Badge>)}
                    </div>
                  )}
                </div>
                {item.coverage_status === "missing" || item.coverage_status === "needed_soon" ? (
                  <Link to="/canon-ingestion" onClick={e => e.stopPropagation()}>
                    <Button size="sm" variant="outline" className="h-7 text-xs flex-shrink-0 gap-1">
                      <Upload className="w-3 h-3" />Import
                    </Button>
                  </Link>
                ) : item.coverage_status === "partial" ? (
                  <Link to="/canon-ingestion" onClick={e => e.stopPropagation()}>
                    <Button size="sm" variant="outline" className="h-7 text-xs flex-shrink-0 gap-1 text-amber-600 border-amber-200">
                      <Upload className="w-3 h-3" />Expand
                    </Button>
                  </Link>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {/* Edit/Add Dialog */}
      <Dialog open={formOpen} onOpenChange={v => { setFormOpen(v); if (!v) setEditing(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edit Coverage Entry" : "Add Coverage Entry"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Authority Title</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required /></div>
              <div><Label>Short Code / Citation</Label><Input value={form.short_code} onChange={e => setForm({ ...form, short_code: e.target.value })} required /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(CATEGORY_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Coverage Status</Label>
                <Select value={form.coverage_status} onValueChange={v => setForm({ ...form, coverage_status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(STATUS_CONFIG).map(([v, c]) => <SelectItem key={v} value={v}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Priority Rank</Label><Input type="number" min={1} value={form.priority_rank} onChange={e => setForm({ ...form, priority_rank: e.target.value })} /></div>
              <div><Label>Assigned Services (comma sep)</Label><Input value={form.assigned_services} onChange={e => setForm({ ...form, assigned_services: e.target.value })} placeholder="JurisEngine, Court Compass" /></div>
            </div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving..." : editing ? "Update" : "Add"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}