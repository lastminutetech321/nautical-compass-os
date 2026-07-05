import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Layers, Plus, Edit2, CheckCircle, AlertTriangle, Clock,
  FileText, GitBranch, Loader2, Shield, Activity
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
  proposed: "bg-amber-100 text-amber-700",
  accepted: "bg-emerald-100 text-emerald-700",
  deprecated: "bg-slate-100 text-slate-500",
  superseded: "bg-red-100 text-red-600",
};

const emptyADR = { number: "", title: "", status: "proposed", context: "", decision: "", consequences: "", alternatives_considered: "", affected_modules: "", decision_maker: "", requires_founder_approval: false, tags: "" };

export default function ArchitectureHealth() {
  const [adrs, setAdrs] = useState([]);
  const [debt, setDebt] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adrOpen, setAdrOpen] = useState(false);
  const [editingAdr, setEditingAdr] = useState(null);
  const [form, setForm] = useState(emptyADR);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState(null);

  const load = async () => {
    setLoading(true);
    const [a, d] = await Promise.all([
      base44.entities.ADR.list("-created_date", 100).catch(() => []),
      base44.entities.TechnicalDebt.list("-created_date", 100).catch(() => []),
    ]);
    setAdrs(a); setDebt(d);
    if (a.length > 0) setSelected(a[0]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (editingAdr) {
      setForm({ ...emptyADR, ...editingAdr, alternatives_considered: (editingAdr.alternatives_considered || []).join("\n"), affected_modules: (editingAdr.affected_modules || []).join("\n"), tags: (editingAdr.tags || []).join(", ") });
    } else {
      setForm({ ...emptyADR, number: adrs.length + 1 });
    }
  }, [editingAdr, adrOpen]);

  const saveAdr = async (e) => {
    e.preventDefault();
    setSaving(true);
    const data = { ...form, number: Number(form.number), alternatives_considered: form.alternatives_considered.split("\n").map(s => s.trim()).filter(Boolean), affected_modules: form.affected_modules.split("\n").map(s => s.trim()).filter(Boolean), tags: form.tags.split(",").map(s => s.trim()).filter(Boolean) };
    let result;
    if (editingAdr) result = await base44.entities.ADR.update(editingAdr.id, data);
    else result = await base44.entities.ADR.create(data);
    setSaving(false); setAdrOpen(false); setEditingAdr(null); setSelected(result); load();
  };

  const openDebt = debt.filter(d => d.status !== "resolved");
  const critDebt = openDebt.filter(d => d.severity === "critical");
  const debtScore = openDebt.reduce((s, d) => s + ({ critical: 10, high: 5, medium: 2, low: 1 }[d.severity] || 1), 0);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">NCOS · Engineering OS</p>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Layers className="w-6 h-6 text-indigo-500" />Architecture Health
          </h1>
          <p className="text-sm text-muted-foreground">{adrs.length} ADRs · Debt Score: {debtScore} · {critDebt.length} critical debt items</p>
        </div>
        <Button size="sm" onClick={() => { setEditingAdr(null); setAdrOpen(true); }}><Plus className="w-4 h-4 mr-1.5" />New ADR</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { label: "Total ADRs", value: adrs.length, color: "text-indigo-600" },
          { label: "Accepted", value: adrs.filter(a => a.status === "accepted").length, color: "text-emerald-600" },
          { label: "Debt Score", value: debtScore, color: debtScore > 30 ? "text-red-600" : debtScore > 15 ? "text-amber-600" : "text-emerald-600" },
          { label: "Critical Debt", value: critDebt.length, color: critDebt.length > 0 ? "text-red-600" : "text-emerald-600" },
        ].map(k => (
          <Card key={k.label} className="p-4 border border-border/60">
            <p className="text-xs text-muted-foreground">{k.label}</p>
            <p className={`text-2xl font-black mt-1 ${k.color}`}>{k.value}</p>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="adrs">
        <TabsList className="mb-5">
          <TabsTrigger value="adrs">Architecture Decision Records ({adrs.length})</TabsTrigger>
          <TabsTrigger value="debt">Technical Debt ({openDebt.length} open)</TabsTrigger>
        </TabsList>

        <TabsContent value="adrs">
          {adrs.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-border rounded-xl">
              <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
              <p className="text-sm text-muted-foreground mb-3">No ADRs recorded yet.</p>
              <Button size="sm" onClick={() => setAdrOpen(true)}>Record First ADR</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="space-y-2 max-h-[65vh] overflow-y-auto pr-1">
                {adrs.map(adr => (
                  <Card key={adr.id} className={`p-3 cursor-pointer transition-all ${selected?.id === adr.id ? "border-primary shadow-md" : "border-border/60 hover:shadow-sm"}`} onClick={() => setSelected(adr)}>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-xs font-mono text-muted-foreground">ADR-{String(adr.number || 0).padStart(3, "0")}</p>
                      <Badge className={`text-[9px] ${STATUS_COLOR[adr.status] || ""}`}>{adr.status}</Badge>
                    </div>
                    <p className="text-sm font-semibold leading-snug">{adr.title}</p>
                    {adr.decision_maker && <p className="text-[10px] text-muted-foreground mt-1">{adr.decision_maker}</p>}
                    {adr.requires_founder_approval && <Badge className="text-[9px] bg-amber-50 text-amber-700 border border-amber-200 mt-1">Founder Approval</Badge>}
                  </Card>
                ))}
              </div>

              {selected && (
                <div className="lg:col-span-2">
                  <Card className="p-5 border border-border/60">
                    <div className="flex items-start justify-between mb-4 gap-2">
                      <div>
                        <p className="text-xs font-mono text-muted-foreground mb-1">ADR-{String(selected.number || 0).padStart(3, "0")}</p>
                        <h2 className="text-base font-bold">{selected.title}</h2>
                        <p className="text-xs text-muted-foreground">{selected.decision_maker || "Unknown"} · {moment(selected.created_date).format("MMM D, YYYY")}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`text-xs ${STATUS_COLOR[selected.status] || ""}`}>{selected.status}</Badge>
                        <Button size="sm" variant="outline" onClick={() => { setEditingAdr(selected); setAdrOpen(true); }}><Edit2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {selected.context && (
                        <div>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1">Context</p>
                          <p className="text-sm text-muted-foreground">{selected.context}</p>
                        </div>
                      )}
                      {selected.decision && (
                        <div>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1">Decision</p>
                          <p className="text-sm bg-emerald-50 border border-emerald-100 rounded p-3">{selected.decision}</p>
                        </div>
                      )}
                      {selected.consequences && (
                        <div>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1">Consequences</p>
                          <p className="text-sm text-muted-foreground">{selected.consequences}</p>
                        </div>
                      )}
                      {(selected.alternatives_considered || []).length > 0 && (
                        <div>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1">Alternatives Considered</p>
                          <ul className="space-y-1">{selected.alternatives_considered.map((a, i) => <li key={i} className="text-sm text-muted-foreground flex items-start gap-1.5"><span className="flex-shrink-0 text-muted-foreground/50">•</span>{a}</li>)}</ul>
                        </div>
                      )}
                      {(selected.affected_modules || []).length > 0 && (
                        <div>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1">Affected Modules</p>
                          <div className="flex flex-wrap gap-1.5">{selected.affected_modules.map(m => <Badge key={m} variant="outline" className="text-[10px]">{m}</Badge>)}</div>
                        </div>
                      )}
                    </div>
                  </Card>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="debt">
          {openDebt.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">No open technical debt items.</div>
          ) : (
            <div className="space-y-3">
              {openDebt.sort((a, b) => ({ critical: 0, high: 1, medium: 2, low: 3 }[a.severity] - { critical: 0, high: 1, medium: 2, low: 3 }[b.severity])).map(d => (
                <Card key={d.id} className="p-4 border border-border/60">
                  <div className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${d.severity === "critical" ? "bg-red-500" : d.severity === "high" ? "bg-amber-500" : "bg-slate-400"}`} />
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-2 flex-wrap mb-1">
                        <p className="text-sm font-semibold">{d.title}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[9px] capitalize">{d.severity}</Badge>
                          <Badge variant="outline" className="text-[9px] capitalize">{d.category?.replace(/_/g, " ")}</Badge>
                        </div>
                      </div>
                      {d.description && <p className="text-xs text-muted-foreground">{d.description}</p>}
                      {d.recommended_fix && <p className="text-xs text-blue-700 mt-1.5 bg-blue-50 rounded px-2 py-1">Fix: {d.recommended_fix}</p>}
                      {d.affected_files && <p className="text-[10px] text-muted-foreground mt-1 font-mono">{d.affected_files}</p>}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ADR Form */}
      <Dialog open={adrOpen} onOpenChange={v => { setAdrOpen(v); if (!v) setEditingAdr(null); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingAdr ? "Edit ADR" : "New Architecture Decision Record"}</DialogTitle></DialogHeader>
          <form onSubmit={saveAdr} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>ADR Number</Label><Input type="number" value={form.number} onChange={e => setForm({ ...form, number: e.target.value })} /></div>
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["proposed","accepted","deprecated","superseded"].map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Title <span className="text-red-500">*</span></Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required /></div>
            <div><Label>Context — what is the issue being addressed?</Label><Textarea value={form.context} onChange={e => setForm({ ...form, context: e.target.value })} rows={3} /></div>
            <div><Label>Decision — what was decided?</Label><Textarea value={form.decision} onChange={e => setForm({ ...form, decision: e.target.value })} rows={3} /></div>
            <div><Label>Consequences — what are the trade-offs?</Label><Textarea value={form.consequences} onChange={e => setForm({ ...form, consequences: e.target.value })} rows={2} /></div>
            <div><Label>Alternatives Considered (one per line)</Label><Textarea value={form.alternatives_considered} onChange={e => setForm({ ...form, alternatives_considered: e.target.value })} rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Affected Modules (one per line)</Label><Textarea value={form.affected_modules} onChange={e => setForm({ ...form, affected_modules: e.target.value })} rows={2} /></div>
              <div><Label>Decision Maker</Label><Input value={form.decision_maker} onChange={e => setForm({ ...form, decision_maker: e.target.value })} /></div>
            </div>
            <div><Label>Tags (comma-separated)</Label><Input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} /></div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => { setAdrOpen(false); setEditingAdr(null); }}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving..." : editingAdr ? "Update" : "Record ADR"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}