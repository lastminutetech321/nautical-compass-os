import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Map, Plus, Filter, TrendingUp, Zap, Loader2, CheckCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import moment from "moment";

const phaseColor = { alpha:"bg-red-100 text-red-700", beta:"bg-amber-100 text-amber-700", v1:"bg-blue-100 text-blue-700", v2:"bg-violet-100 text-violet-700", future:"bg-slate-100 text-slate-600", icebox:"bg-slate-100 text-slate-400" };
const statusColor = { idea:"bg-slate-100 text-slate-600", planned:"bg-blue-100 text-blue-700", in_progress:"bg-amber-100 text-amber-700", shipped:"bg-emerald-100 text-emerald-700", cancelled:"bg-red-100 text-red-700" };
const priorityBorder = { critical:"border-red-200", high:"border-orange-200", medium:"border-border", low:"border-border/40" };

const PHASES = ["alpha","beta","v1","v2","future","icebox"];
const emptyForm = { title:"", description:"", phase:"beta", category:"platform", status:"planned", priority:"medium", effort_estimate:"md", revenue_impact:0, readiness_impact:0, owner:"", target_date:"" };

export default function RoadmapPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState(null);
  const [phaseFilter, setPhaseFilter] = useState("all");
  const [catFilter, setCatFilter] = useState("all");
  const [view, setView] = useState("board"); // board | list

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.RoadmapItem.list("-created_date", 500).catch(() => []);
    setItems(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    const data = { ...form, revenue_impact: Number(form.revenue_impact), readiness_impact: Number(form.readiness_impact) };
    if (editId) await base44.entities.RoadmapItem.update(editId, data);
    else await base44.entities.RoadmapItem.create(data);
    setSaving(false); setShowForm(false); setEditId(null); setForm(emptyForm); load();
  };

  const openEdit = (item) => { setForm({ title:item.title||"", description:item.description||"", phase:item.phase||"beta", category:item.category||"platform", status:item.status||"planned", priority:item.priority||"medium", effort_estimate:item.effort_estimate||"md", revenue_impact:item.revenue_impact||0, readiness_impact:item.readiness_impact||0, owner:item.owner||"", target_date:item.target_date||"" }); setEditId(item.id); setShowForm(true); };

  const filtered = items.filter(i => {
    if (phaseFilter !== "all" && i.phase !== phaseFilter) return false;
    if (catFilter !== "all" && i.category !== catFilter) return false;
    return true;
  });

  const shipped = items.filter(i => i.status === "shipped").length;
  const inProg = items.filter(i => i.status === "in_progress").length;
  const totalRev = items.reduce((s, i) => s + (i.revenue_impact || 0), 0);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">NCOS · Build Studio</p>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Map className="w-6 h-6 text-primary" />Product Roadmap
          </h1>
          <p className="text-sm text-muted-foreground">Features, phases, and delivery timeline</p>
        </div>
        <Button onClick={() => { setForm(emptyForm); setEditId(null); setShowForm(true); }} className="gap-2">
          <Plus className="w-4 h-4" />Add Item
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { label: "Total Items", value: items.length },
          { label: "In Progress", value: inProg, color: inProg > 0 ? "text-amber-600" : "" },
          { label: "Shipped", value: shipped, color: shipped > 0 ? "text-emerald-600" : "" },
          { label: "Revenue Potential", value: totalRev > 0 ? `$${totalRev.toLocaleString()}` : "$0" },
        ].map(k => (
          <Card key={k.label} className="p-3 border border-border/60">
            <p className="text-xs text-muted-foreground mb-1">{k.label}</p>
            <p className={`text-2xl font-bold ${k.color||""}`}>{k.value}</p>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-5 flex-wrap">
        <Select value={phaseFilter} onValueChange={setPhaseFilter}>
          <SelectTrigger className="h-8 text-xs w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Phases</SelectItem>
            {PHASES.map(p=><SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="h-8 text-xs w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {["platform","canon","jurisengine","evidence","workforce","business","enterprise","culture","ui_ux","infrastructure","security","revenue"].map(c=><SelectItem key={c} value={c} className="capitalize">{c.replace(/_/g," ")}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex gap-1 ml-auto">
          {["board","list"].map(v => (
            <button key={v} onClick={() => setView(v)} className={`px-3 py-1 text-xs rounded border transition-all ${view===v?"bg-primary text-white border-primary":"border-border hover:bg-muted"}`}>{v}</button>
          ))}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <Map className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
          <p className="text-sm text-muted-foreground mb-3">No roadmap items yet.</p>
          <Button size="sm" onClick={() => setShowForm(true)}>Add First Item</Button>
        </div>
      ) : view === "board" ? (
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4">
          {PHASES.filter(p => phaseFilter === "all" || p === phaseFilter).map(phase => {
            const phaseItems = filtered.filter(i => i.phase === phase);
            return (
              <div key={phase}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${phaseColor[phase]}`}>{phase}</span>
                  <span className="text-xs text-muted-foreground">{phaseItems.length}</span>
                </div>
                <div className="space-y-2">
                  {phaseItems.map(item => (
                    <Card key={item.id} className={`p-3 border cursor-pointer hover:shadow-md transition-all ${priorityBorder[item.priority]}`} onClick={() => openEdit(item)}>
                      <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${statusColor[item.status]}`}>{item.status?.replace(/_/g," ")}</span>
                        {item.revenue_impact > 0 && <span className="text-[9px] text-emerald-600 font-bold">+${item.revenue_impact.toLocaleString()}</span>}
                      </div>
                      <p className="text-xs font-semibold leading-tight">{item.title}</p>
                      {item.category && <p className="text-[10px] text-muted-foreground mt-1 capitalize">{item.category.replace(/_/g," ")}</p>}
                      {item.target_date && <p className="text-[10px] text-muted-foreground">{moment(item.target_date).format("MMM D")}</p>}
                    </Card>
                  ))}
                  {phaseItems.length === 0 && <div className="text-center py-4 border border-dashed border-border/30 rounded-lg"><p className="text-[10px] text-muted-foreground">Empty</p></div>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(item => (
            <Card key={item.id} className={`p-3 border cursor-pointer hover:shadow-sm transition-all ${priorityBorder[item.priority]}`} onClick={() => openEdit(item)}>
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${phaseColor[item.phase]}`}>{item.phase}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${statusColor[item.status]}`}>{item.status?.replace(/_/g," ")}</span>
                    <Badge variant="outline" className="text-[9px] capitalize">{item.priority}</Badge>
                    <span className="text-[10px] text-muted-foreground capitalize">{item.category?.replace(/_/g," ")}</span>
                  </div>
                  <p className="text-sm font-semibold">{item.title}</p>
                  {item.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{item.description}</p>}
                </div>
                <div className="text-right flex-shrink-0">
                  {item.revenue_impact > 0 && <p className="text-xs text-emerald-600 font-bold">+${item.revenue_impact.toLocaleString()}</p>}
                  {item.target_date && <p className="text-[10px] text-muted-foreground">{moment(item.target_date).format("MMM D, YYYY")}</p>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Roadmap Item" : "Add Roadmap Item"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Title</label>
              <input className="w-full border rounded px-2.5 py-1.5 text-sm" value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Feature or improvement title" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Description</label>
              <textarea className="w-full border rounded px-2.5 py-1.5 text-sm resize-none" rows={2} value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[["Phase","phase",PHASES],["Category","category",["platform","canon","jurisengine","evidence","workforce","business","enterprise","culture","ui_ux","infrastructure","security","revenue"]],["Status","status",["idea","planned","in_progress","shipped","cancelled"]],["Priority","priority",["low","medium","high","critical"]]].map(([label, key, opts]) => (
                <div key={key}>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">{label}</label>
                  <Select value={form[key]} onValueChange={v => setForm({...form,[key]:v})}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>{opts.map(o=><SelectItem key={o} value={o} className="capitalize">{o.replace(/_/g," ")}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="text-xs font-semibold text-muted-foreground block mb-1">Revenue Impact ($)</label><input type="number" className="w-full border rounded px-2.5 py-1.5 text-sm" value={form.revenue_impact} onChange={e => setForm({...form, revenue_impact: e.target.value})} /></div>
              <div><label className="text-xs font-semibold text-muted-foreground block mb-1">Readiness Impact (%)</label><input type="number" className="w-full border rounded px-2.5 py-1.5 text-sm" value={form.readiness_impact} onChange={e => setForm({...form, readiness_impact: e.target.value})} /></div>
              <div><label className="text-xs font-semibold text-muted-foreground block mb-1">Target Date</label><input type="date" className="w-full border rounded px-2.5 py-1.5 text-sm" value={form.target_date} onChange={e => setForm({...form, target_date: e.target.value})} /></div>
            </div>
            <div><label className="text-xs font-semibold text-muted-foreground block mb-1">Owner</label><input className="w-full border rounded px-2.5 py-1.5 text-sm" value={form.owner} onChange={e => setForm({...form, owner: e.target.value})} placeholder="Founder, Agent, or Team" /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button size="sm" onClick={save} disabled={saving || !form.title}>
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
                {editId ? "Update" : "Add to Roadmap"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}