import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, DollarSign, Target, TrendingUp, Edit2, ChevronRight, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import moment from "moment";

const STAGES = [
  { key: "discovery", label: "Discovery", color: "border-slate-300 bg-slate-50" },
  { key: "qualification", label: "Qualification", color: "border-blue-300 bg-blue-50" },
  { key: "proposal", label: "Proposal", color: "border-violet-300 bg-violet-50" },
  { key: "negotiation", label: "Negotiation", color: "border-amber-300 bg-amber-50" },
  { key: "contract_review", label: "Contract Review", color: "border-orange-300 bg-orange-50" },
  { key: "closed_won", label: "Closed Won", color: "border-emerald-300 bg-emerald-50" },
  { key: "closed_lost", label: "Closed Lost", color: "border-red-300 bg-red-50" },
];
const HEALTH_COLORS = { cold: "bg-slate-100 text-slate-600", warm: "bg-amber-100 text-amber-700", hot: "bg-red-100 text-red-700", at_risk: "bg-orange-100 text-orange-700", strong: "bg-emerald-100 text-emerald-700" };
const emptyForm = { name: "", organization_id: "", type: "new_business", stage: "discovery", lifecycle_stage: "opportunity", relationship_health: "warm", value: "", mrr: "", probability: "50", close_date: "", assigned_to: "", assigned_agent: "", next_action: "", next_action_date: "", notes: "" };

export default function CRMPipeline() {
  const [opps, setOpps] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState(null);
  const [stageFilter, setStageFilter] = useState("all");

  const load = async () => {
    setLoading(true);
    const [o, or_] = await Promise.all([
      base44.entities.CRMOpportunity.list("-created_date", 300).catch(() => []),
      base44.entities.Organization.list("-created_date", 200).catch(() => []),
    ]);
    setOpps(o); setOrgs(or_);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openEdit = (opp) => {
    setEditing(opp);
    setForm({ name: opp.name||"", organization_id: opp.organization_id||"", type: opp.type||"new_business", stage: opp.stage||"discovery", lifecycle_stage: opp.lifecycle_stage||"opportunity", relationship_health: opp.relationship_health||"warm", value: opp.value||"", mrr: opp.mrr||"", probability: opp.probability||50, close_date: opp.close_date||"", assigned_to: opp.assigned_to||"", assigned_agent: opp.assigned_agent||"", next_action: opp.next_action||"", next_action_date: opp.next_action_date||"", notes: opp.notes||"" });
    setFormOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    const data = { ...form, value: form.value ? Number(form.value) : 0, mrr: form.mrr ? Number(form.mrr) : 0, probability: Number(form.probability), weighted_value: (Number(form.value || 0) * Number(form.probability || 0)) / 100 };
    if (editing) await base44.entities.CRMOpportunity.update(editing.id, data);
    else await base44.entities.CRMOpportunity.create(data);
    setSaving(false); setFormOpen(false); setEditing(null); setForm(emptyForm); load();
  };

  const moveStage = async (opp, stage) => {
    await base44.entities.CRMOpportunity.update(opp.id, { stage });
    load();
  };

  const pipelineTotal = opps.filter(o => !["closed_won","closed_lost"].includes(o.stage)).reduce((s, o) => s + (o.value || 0), 0);
  const weightedTotal = opps.filter(o => !["closed_won","closed_lost"].includes(o.stage)).reduce((s, o) => s + ((o.value || 0) * (o.probability || 0) / 100), 0);
  const wonTotal = opps.filter(o => o.stage === "closed_won").reduce((s, o) => s + (o.value || 0), 0);

  const filtered = stageFilter === "all" ? opps : opps.filter(o => o.stage === stageFilter);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">NCOS · Enterprise CRM</p>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Target className="w-6 h-6 text-violet-500" />Sales Pipeline</h1>
          <p className="text-sm text-muted-foreground">{opps.length} opportunities · ${pipelineTotal.toLocaleString()} pipeline</p>
        </div>
        <Button size="sm" onClick={() => { setEditing(null); setForm(emptyForm); setFormOpen(true); }}><Plus className="w-4 h-4 mr-1.5" />New Opportunity</Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: "Total Pipeline", value: `$${pipelineTotal.toLocaleString()}`, color: "text-blue-600" },
          { label: "Weighted Value", value: `$${Math.round(weightedTotal).toLocaleString()}`, color: "text-violet-600" },
          { label: "Closed Won (All Time)", value: `$${wonTotal.toLocaleString()}`, color: "text-emerald-600" },
        ].map(k => (
          <Card key={k.label} className="p-4 border border-border/60">
            <p className="text-xs text-muted-foreground">{k.label}</p>
            <p className={`text-xl font-black mt-1 ${k.color}`}>{k.value}</p>
          </Card>
        ))}
      </div>

      {/* Stage filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button onClick={() => setStageFilter("all")} className={`px-3 py-1 text-xs rounded-full border transition-all ${stageFilter==="all"?"bg-primary text-white border-primary":"border-border text-muted-foreground hover:border-primary"}`}>All</button>
        {STAGES.map(s => (
          <button key={s.key} onClick={() => setStageFilter(s.key)} className={`px-3 py-1 text-xs rounded-full border transition-all ${stageFilter===s.key?"bg-primary text-white border-primary":"border-border text-muted-foreground hover:border-primary"}`}>
            {s.label} ({opps.filter(o=>o.stage===s.key).length})
          </button>
        ))}
      </div>

      {/* Pipeline Kanban */}
      <div className="overflow-x-auto">
        <div className="flex gap-4 min-w-max pb-4">
          {STAGES.filter(s => stageFilter === "all" || s.key === stageFilter).map(stage => {
            const stageOpps = filtered.filter(o => o.stage === stage.key);
            const stageValue = stageOpps.reduce((s, o) => s + (o.value || 0), 0);
            return (
              <div key={stage.key} className="w-72">
                <div className={`flex items-center justify-between px-3 py-2 rounded-t-lg border-t-2 ${stage.color} mb-2`}>
                  <p className="text-xs font-bold uppercase tracking-wide">{stage.label}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px]">{stageOpps.length}</Badge>
                    <span className="text-[9px] text-muted-foreground">${stageValue.toLocaleString()}</span>
                  </div>
                </div>
                <div className="space-y-2 min-h-24">
                  {stageOpps.map(opp => {
                    const org = orgs.find(o => o.id === opp.organization_id);
                    const overdue = opp.next_action_date && moment(opp.next_action_date).isBefore(moment());
                    return (
                      <Card key={opp.id} className="p-3 border border-border/60 cursor-pointer hover:shadow-md transition-all" onClick={() => { setSelected(opp); openEdit(opp); }}>
                        <div className="flex items-start justify-between gap-1 mb-1">
                          <p className="text-xs font-semibold line-clamp-2">{opp.name}</p>
                          {overdue && <AlertTriangle className="w-3 h-3 text-red-500 flex-shrink-0" />}
                        </div>
                        {org && <p className="text-[10px] text-muted-foreground mb-1.5">{org.name}</p>}
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-sm font-bold text-emerald-600">${(opp.value||0).toLocaleString()}</p>
                          <span className="text-[10px] text-muted-foreground">{opp.probability||0}%</span>
                        </div>
                        <Progress value={opp.probability||0} className="h-1 mb-2" />
                        <div className="flex flex-wrap gap-1">
                          <Badge className={`text-[9px] ${HEALTH_COLORS[opp.relationship_health] || ""}`}>{opp.relationship_health}</Badge>
                          {opp.close_date && <span className="text-[9px] text-muted-foreground">{moment(opp.close_date).format("MMM D")}</span>}
                        </div>
                        {opp.next_action && (
                          <p className={`text-[9px] mt-1.5 ${overdue?"text-red-600 font-medium":"text-muted-foreground"}`}>
                            → {opp.next_action}
                          </p>
                        )}
                      </Card>
                    );
                  })}
                  {stageOpps.length === 0 && <div className="text-center py-6 border border-dashed border-border/30 rounded-lg"><p className="text-[10px] text-muted-foreground">Empty</p></div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Form Dialog */}
      <Dialog open={formOpen} onOpenChange={v => { setFormOpen(v); if (!v) setEditing(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Opportunity" : "New Opportunity"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div><Label>Opportunity Name *</Label><Input value={form.name} onChange={e => setForm({...form,name:e.target.value})} required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Organization</Label>
                <Select value={form.organization_id} onValueChange={v => setForm({...form,organization_id:v})}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select org" /></SelectTrigger>
                  <SelectContent>{orgs.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Type</Label>
                <Select value={form.type} onValueChange={v => setForm({...form,type:v})}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{["new_business","upsell","cross_sell","renewal","expansion","partnership","enterprise"].map(t => <SelectItem key={t} value={t}>{t.replace(/_/g," ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Stage</Label>
                <Select value={form.stage} onValueChange={v => setForm({...form,stage:v})}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{STAGES.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Relationship Health</Label>
                <Select value={form.relationship_health} onValueChange={v => setForm({...form,relationship_health:v})}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{["cold","warm","hot","at_risk","strong"].map(h => <SelectItem key={h} value={h}>{h.replace(/_/g," ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Value ($)</Label><Input type="number" value={form.value} onChange={e => setForm({...form,value:e.target.value})} /></div>
              <div><Label>MRR ($)</Label><Input type="number" value={form.mrr} onChange={e => setForm({...form,mrr:e.target.value})} /></div>
              <div><Label>Probability (%)</Label><Input type="number" min="0" max="100" value={form.probability} onChange={e => setForm({...form,probability:e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Close Date</Label><Input type="date" value={form.close_date} onChange={e => setForm({...form,close_date:e.target.value})} /></div>
              <div><Label>Assigned To</Label><Input value={form.assigned_to} onChange={e => setForm({...form,assigned_to:e.target.value})} /></div>
            </div>
            <div><Label>Next Action</Label><Input value={form.next_action} onChange={e => setForm({...form,next_action:e.target.value})} /></div>
            <div><Label>Next Action Date</Label><Input type="date" value={form.next_action_date} onChange={e => setForm({...form,next_action_date:e.target.value})} /></div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm({...form,notes:e.target.value})} rows={2} /></div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button><Button type="submit" disabled={saving}>{saving?"Saving...":editing?"Update":"Create"}</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}