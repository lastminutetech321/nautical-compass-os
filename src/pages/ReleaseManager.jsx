import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  GitBranch, Plus, Loader2, CheckCircle, AlertTriangle,
  Clock, Sparkles, ArrowRight, Shield, FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import moment from "moment";

const STATUS_COLOR = {
  planned: "bg-slate-100 text-slate-600",
  in_progress: "bg-amber-100 text-amber-700",
  staged: "bg-blue-100 text-blue-700",
  released: "bg-emerald-100 text-emerald-700",
  rolled_back: "bg-red-100 text-red-700",
};
const TYPE_COLOR = {
  major: "bg-red-100 text-red-700",
  minor: "bg-blue-100 text-blue-700",
  patch: "bg-slate-100 text-slate-600",
  hotfix: "bg-amber-100 text-amber-700",
};

const emptyForm = { version: "", name: "", type: "minor", status: "planned", planned_date: "", summary: "", features: "", bug_fixes: "", breaking_changes: "", rollback_plan: "", risk_level: "low", requires_founder_approval: true };

export default function ReleaseManager() {
  const [releases, setReleases] = useState([]);
  const [builds, setBuilds] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState(null);
  const [generating, setGenerating] = useState(false);

  const load = async () => {
    setLoading(true);
    const [r, b, m] = await Promise.all([
      base44.entities.Release.list("-created_date", 50).catch(() => []),
      base44.entities.BuildRegistry.list("-created_date", 100).catch(() => []),
      base44.entities.Milestone.list("-created_date", 50).catch(() => []),
    ]);
    setReleases(r); setBuilds(b); setMilestones(m);
    if (r.length > 0 && !selected) setSelected(r[0]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (editing) {
      setForm({ ...emptyForm, ...editing, features: (editing.features || []).join("\n"), bug_fixes: (editing.bug_fixes || []).join("\n"), breaking_changes: (editing.breaking_changes || []).join("\n") });
    } else {
      setForm(emptyForm);
    }
  }, [editing, formOpen]);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    const data = { ...form, features: form.features.split("\n").map(s => s.trim()).filter(Boolean), bug_fixes: form.bug_fixes.split("\n").map(s => s.trim()).filter(Boolean), breaking_changes: form.breaking_changes.split("\n").map(s => s.trim()).filter(Boolean) };
    let result;
    if (editing) result = await base44.entities.Release.update(editing.id, data);
    else result = await base44.entities.Release.create(data);
    setSaving(false); setFormOpen(false); setEditing(null); setSelected(result); load();
  };

  const generateNotes = async (release) => {
    setGenerating(true);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Generate professional release notes and a changelog for this software release:

Version: ${release.version} — ${release.name || ""}
Type: ${release.type}
Summary: ${release.summary || "No summary provided"}

Features:
${(release.features || []).map(f => `- ${f}`).join("\n") || "None specified"}

Bug Fixes:
${(release.bug_fixes || []).map(f => `- ${f}`).join("\n") || "None specified"}

Breaking Changes:
${(release.breaking_changes || []).map(f => `- ${f}`).join("\n") || "None"}

Write:
1. release_notes: Professional, user-facing release notes (2-3 paragraphs). Highlight value delivered.
2. changelog: Technical changelog in standard format (## [version] — features, fixes, breaking)`,
      response_json_schema: {
        type: "object",
        properties: {
          release_notes: { type: "string" },
          changelog: { type: "string" }
        },
        required: ["release_notes", "changelog"]
      }
    });
    await base44.entities.Release.update(release.id, { release_notes: res.release_notes, changelog: res.changelog });
    load();
    setSelected(prev => prev?.id === release.id ? { ...prev, release_notes: res.release_notes, changelog: res.changelog } : prev);
    setGenerating(false);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  const released = releases.filter(r => r.status === "released");
  const pending = releases.filter(r => ["planned","in_progress","staged"].includes(r.status));

  return (
    <div>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">NCOS · Engineering OS</p>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <GitBranch className="w-6 h-6 text-emerald-500" />Release Manager
          </h1>
          <p className="text-sm text-muted-foreground">{releases.length} releases · {released.length} shipped · {pending.length} pending</p>
        </div>
        <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="w-4 h-4 mr-1.5" />New Release</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { label: "Total Releases", value: releases.length, color: "text-slate-700" },
          { label: "Shipped", value: released.length, color: "text-emerald-600" },
          { label: "Pending", value: pending.length, color: pending.length > 0 ? "text-amber-600" : "text-slate-500" },
          { label: "Staged", value: releases.filter(r => r.status === "staged").length, color: "text-blue-600" },
        ].map(k => (
          <Card key={k.label} className="p-4 border border-border/60">
            <p className="text-xs text-muted-foreground">{k.label}</p>
            <p className={`text-2xl font-black mt-1 ${k.color}`}>{k.value}</p>
          </Card>
        ))}
      </div>

      {releases.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <GitBranch className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
          <p className="text-sm text-muted-foreground mb-3">No releases planned yet.</p>
          <Button size="sm" onClick={() => setFormOpen(true)}>Plan First Release</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Release list */}
          <div className="space-y-2 max-h-[65vh] overflow-y-auto pr-1">
            {releases.map(r => (
              <Card key={r.id} className={`p-3 cursor-pointer transition-all ${selected?.id === r.id ? "border-primary shadow-md" : "border-border/60 hover:shadow-sm"}`} onClick={() => setSelected(r)}>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <p className="text-sm font-bold font-mono">{r.version}</p>
                  <div className="flex items-center gap-1">
                    <Badge className={`text-[9px] ${TYPE_COLOR[r.type] || ""}`}>{r.type}</Badge>
                    <Badge className={`text-[9px] ${STATUS_COLOR[r.status] || ""}`}>{r.status}</Badge>
                  </div>
                </div>
                {r.name && <p className="text-xs font-medium mb-1">{r.name}</p>}
                {r.summary && <p className="text-[10px] text-muted-foreground line-clamp-2">{r.summary}</p>}
                <p className="text-[10px] text-muted-foreground mt-1">{r.planned_date ? moment(r.planned_date).format("MMM D, YYYY") : "No date"}</p>
                {r.requires_founder_approval && r.status !== "released" && (
                  <Badge className="text-[9px] bg-amber-50 text-amber-700 border border-amber-200 mt-1.5">Needs Approval</Badge>
                )}
              </Card>
            ))}
          </div>

          {/* Detail */}
          {selected && (
            <div className="lg:col-span-2">
              <Card className="p-5 border border-border/60">
                <div className="flex items-start justify-between mb-4 gap-2 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-lg font-black font-mono">{selected.version}</h2>
                      <Badge className={`text-xs ${TYPE_COLOR[selected.type] || ""}`}>{selected.type}</Badge>
                      <Badge className={`text-xs ${STATUS_COLOR[selected.status] || ""}`}>{selected.status}</Badge>
                    </div>
                    {selected.name && <p className="text-sm text-muted-foreground">{selected.name}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => { setEditing(selected); setFormOpen(true); }}>Edit</Button>
                    <Button size="sm" onClick={() => generateNotes(selected)} disabled={generating}>
                      {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Sparkles className="w-3.5 h-3.5 mr-1.5" />}
                      {generating ? "Generating..." : "AI Notes"}
                    </Button>
                  </div>
                </div>

                <Tabs defaultValue="overview">
                  <TabsList className="mb-4">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="notes">Release Notes</TabsTrigger>
                    <TabsTrigger value="changelog">Changelog</TabsTrigger>
                    <TabsTrigger value="checklist">Deploy Checklist</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview">
                    <div className="space-y-4">
                      {selected.summary && <p className="text-sm text-muted-foreground">{selected.summary}</p>}
                      {(selected.features || []).length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Features</p>
                          <ul className="space-y-1">{selected.features.map((f, i) => <li key={i} className="flex items-start gap-2 text-sm"><CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />{f}</li>)}</ul>
                        </div>
                      )}
                      {(selected.bug_fixes || []).length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Bug Fixes</p>
                          <ul className="space-y-1">{selected.bug_fixes.map((f, i) => <li key={i} className="flex items-start gap-2 text-sm"><Shield className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />{f}</li>)}</ul>
                        </div>
                      )}
                      {(selected.breaking_changes || []).length > 0 && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-xs font-bold text-red-700 uppercase tracking-wide mb-2">Breaking Changes</p>
                          <ul className="space-y-1">{selected.breaking_changes.map((f, i) => <li key={i} className="flex items-start gap-2 text-sm text-red-700"><AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />{f}</li>)}</ul>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="notes">
                    {selected.release_notes ? (
                      <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap bg-muted p-4 rounded-lg">{selected.release_notes}</div>
                    ) : (
                      <div className="text-center py-8">
                        <Sparkles className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-30" />
                        <p className="text-sm text-muted-foreground mb-3">No release notes yet. Use AI to generate them.</p>
                        <Button size="sm" onClick={() => generateNotes(selected)} disabled={generating}>
                          {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Sparkles className="w-3.5 h-3.5 mr-1.5" />}Generate Notes
                        </Button>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="changelog">
                    {selected.changelog ? (
                      <pre className="text-xs font-mono bg-muted p-4 rounded-lg overflow-x-auto whitespace-pre-wrap">{selected.changelog}</pre>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-8">Generate release notes first to produce the changelog.</p>
                    )}
                  </TabsContent>

                  <TabsContent value="checklist">
                    <div className="space-y-2">
                      {[
                        "All tests passing",
                        "Code review completed",
                        "Staging environment validated",
                        selected.requires_founder_approval && "Founder approval obtained",
                        "Rollback plan documented",
                        "Release notes written",
                        "Monitoring configured",
                        "Stakeholders notified",
                      ].filter(Boolean).map((item, i) => (
                        <div key={i} className="flex items-center gap-2 p-2.5 rounded-lg border border-border/40 text-sm">
                          <input type="checkbox" className="w-4 h-4" />
                          <span>{item}</span>
                        </div>
                      ))}
                      {selected.rollback_plan && (
                        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                          <strong>Rollback Plan:</strong> {selected.rollback_plan}
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Form */}
      <Dialog open={formOpen} onOpenChange={v => { setFormOpen(v); if (!v) setEditing(null); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Release" : "Plan New Release"}</DialogTitle></DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Version <span className="text-red-500">*</span></Label><Input value={form.version} onChange={e => setForm({ ...form, version: e.target.value })} placeholder="v1.0.0" required /></div>
              <div><Label>Release Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="The Canon Release" /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Type</Label>
                <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["major","minor","patch","hotfix"].map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["planned","in_progress","staged","released","rolled_back"].map(s => <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g," ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Risk Level</Label>
                <Select value={form.risk_level} onValueChange={v => setForm({ ...form, risk_level: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["low","medium","high","critical"].map(r => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Planned Date</Label><Input type="date" value={form.planned_date} onChange={e => setForm({ ...form, planned_date: e.target.value })} /></div>
            <div><Label>Summary</Label><Textarea value={form.summary} onChange={e => setForm({ ...form, summary: e.target.value })} rows={2} /></div>
            <div><Label>Features (one per line)</Label><Textarea value={form.features} onChange={e => setForm({ ...form, features: e.target.value })} rows={4} className="text-xs font-mono" /></div>
            <div><Label>Bug Fixes (one per line)</Label><Textarea value={form.bug_fixes} onChange={e => setForm({ ...form, bug_fixes: e.target.value })} rows={3} className="text-xs font-mono" /></div>
            <div><Label>Breaking Changes (one per line)</Label><Textarea value={form.breaking_changes} onChange={e => setForm({ ...form, breaking_changes: e.target.value })} rows={2} className="text-xs font-mono" /></div>
            <div><Label>Rollback Plan</Label><Textarea value={form.rollback_plan} onChange={e => setForm({ ...form, rollback_plan: e.target.value })} rows={2} /></div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => { setFormOpen(false); setEditing(null); }}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving..." : editing ? "Update" : "Create Release"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}