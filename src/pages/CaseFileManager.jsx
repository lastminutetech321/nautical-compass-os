import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { FolderOpen, Plus, Search, AlertTriangle, CheckCircle, Clock, Loader2, Tag, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import moment from "moment";

const statusColor = {
  intake:"bg-slate-100 text-slate-700", open:"bg-blue-100 text-blue-700", investigation:"bg-amber-100 text-amber-700",
  discovery:"bg-violet-100 text-violet-700", pre_trial:"bg-orange-100 text-orange-700", trial:"bg-red-100 text-red-700",
  settled:"bg-emerald-100 text-emerald-700", closed:"bg-slate-100 text-slate-500", appealed:"bg-purple-100 text-purple-700",
};
const priorityColor = { low:"text-slate-500", medium:"text-amber-600", high:"text-orange-600", urgent:"text-red-600" };
const caseTypeIcon = { civil_rights:"⚖️", foia:"📋", benefits:"🏥", employment:"💼", housing:"🏠", consumer:"🛒", criminal_defense:"🔒", family:"👨‍👩‍👧", immigration:"✈️", other:"📁" };

const emptyForm = { title:"", description:"", case_type:"civil_rights", status:"intake", priority:"medium", client_name:"", jurisdiction:"", court:"", docket_number:"", filing_deadline:"", relief_sought:"", legal_theories:[], notes:"" };

export default function CaseFileManager() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.CaseFile.list("-created_date", 200).catch(() => []);
    setCases(data);
    if (data.length > 0 && !selected) setSelected(data[0]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    if (editId) await base44.entities.CaseFile.update(editId, form);
    else await base44.entities.CaseFile.create({ ...form, case_number: `NCOS-${Date.now().toString().slice(-6)}` });
    setSaving(false); setShowForm(false); setEditId(null); setForm(emptyForm); load();
  };

  const openEdit = (c) => { setForm({ title:c.title||"", description:c.description||"", case_type:c.case_type||"civil_rights", status:c.status||"intake", priority:c.priority||"medium", client_name:c.client_name||"", jurisdiction:c.jurisdiction||"", court:c.court||"", docket_number:c.docket_number||"", filing_deadline:c.filing_deadline||"", relief_sought:c.relief_sought||"", legal_theories:c.legal_theories||[], notes:c.notes||"" }); setEditId(c.id); setShowForm(true); };

  const filtered = cases.filter(c => {
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (typeFilter !== "all" && c.case_type !== typeFilter) return false;
    if (search && !c.title?.toLowerCase().includes(search.toLowerCase()) && !c.client_name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const openCount = cases.filter(c => !["closed","settled"].includes(c.status)).length;
  const urgentCount = cases.filter(c => c.priority === "urgent").length;
  const deadlineSoon = cases.filter(c => c.filing_deadline && moment(c.filing_deadline).diff(moment(), "days") <= 14 && moment(c.filing_deadline).isAfter()).length;

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">NCOS · Legal Rail</p>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FolderOpen className="w-6 h-6 text-primary" />Case Files
          </h1>
          <p className="text-sm text-muted-foreground">Active cases, legal intake, and matter management</p>
        </div>
        <Button onClick={() => { setForm(emptyForm); setEditId(null); setShowForm(true); }} className="gap-2">
          <Plus className="w-4 h-4" />New Case
        </Button>
      </div>

      {(urgentCount > 0 || deadlineSoon > 0) && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {urgentCount > 0 && <span><strong>{urgentCount} urgent case{urgentCount>1?"s":""}</strong> require immediate attention.</span>}
          {deadlineSoon > 0 && <span><strong>{deadlineSoon} filing deadline{deadlineSoon>1?"s":""}</strong> within 14 days.</span>}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { label: "Open Cases", value: openCount, color: "text-blue-600" },
          { label: "Urgent", value: urgentCount, color: urgentCount > 0 ? "text-red-600" : "text-slate-500" },
          { label: "Deadlines Soon", value: deadlineSoon, color: deadlineSoon > 0 ? "text-amber-600" : "text-slate-500" },
          { label: "Total", value: cases.length, color: "text-slate-700" },
        ].map(k => (
          <Card key={k.label} className="p-3 border border-border/60">
            <p className="text-xs text-muted-foreground mb-1">{k.label}</p>
            <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search cases, clients..." className="w-full pl-8 pr-3 py-1.5 text-xs border rounded-md bg-background" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 text-xs w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {["intake","open","investigation","discovery","pre_trial","trial","settled","closed","appealed"].map(s => <SelectItem key={s} value={s} className="capitalize text-xs">{s.replace(/_/g," ")}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-8 text-xs w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {["civil_rights","foia","benefits","employment","housing","consumer","criminal_defense","family","immigration","other"].map(t => <SelectItem key={t} value={t} className="text-xs capitalize">{t.replace(/_/g," ")}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {cases.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <FolderOpen className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
          <p className="text-sm text-muted-foreground mb-3">No cases filed yet. Open a new case to get started.</p>
          <Button size="sm" onClick={() => setShowForm(true)}>Open First Case</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Case list */}
          <div className="lg:col-span-1 space-y-1.5 max-h-[calc(100vh-22rem)] overflow-y-auto pr-1">
            {filtered.map(c => (
              <button key={c.id} onClick={() => setSelected(c)}
                className={`w-full text-left p-3 rounded-lg border transition-all ${selected?.id === c.id ? "bg-primary/10 border-primary/30" : "border-border/40 hover:bg-muted"}`}>
                <div className="flex items-start gap-2">
                  <span className="text-base flex-shrink-0 mt-0.5">{caseTypeIcon[c.case_type] || "📁"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold line-clamp-1">{c.title}</p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${statusColor[c.status]}`}>{c.status?.replace(/_/g," ")}</span>
                      <span className={`text-[10px] font-medium ${priorityColor[c.priority]}`}>{c.priority}</span>
                    </div>
                    {c.client_name && <p className="text-[10px] text-muted-foreground mt-0.5">{c.client_name}</p>}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Case detail */}
          {selected && (
            <div className="lg:col-span-2">
              <Card className="p-5 border border-border/60">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-lg">{caseTypeIcon[selected.case_type] || "📁"}</span>
                      <Badge className={`text-[9px] ${statusColor[selected.status]}`}>{selected.status?.replace(/_/g," ")}</Badge>
                      <Badge variant="outline" className={`text-[9px] capitalize ${priorityColor[selected.priority]}`}>{selected.priority}</Badge>
                      {selected.case_number && <span className="text-[10px] text-muted-foreground font-mono">{selected.case_number}</span>}
                    </div>
                    <h2 className="text-base font-bold leading-tight">{selected.title}</h2>
                    {selected.client_name && <p className="text-sm text-muted-foreground">Client: {selected.client_name}</p>}
                  </div>
                  <Button size="sm" variant="outline" className="text-xs" onClick={() => openEdit(selected)}>Edit</Button>
                </div>

                {selected.description && (
                  <div className="bg-muted rounded-lg p-3 text-sm mb-4 leading-relaxed">{selected.description}</div>
                )}

                <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm mb-4">
                  {[
                    ["Case Type", selected.case_type?.replace(/_/g," ")],
                    ["Jurisdiction", selected.jurisdiction],
                    ["Court", selected.court],
                    ["Docket Number", selected.docket_number],
                    ["Filing Deadline", selected.filing_deadline ? moment(selected.filing_deadline).format("MMM D, YYYY") : null],
                    ["Opened", moment(selected.created_date).format("MMM D, YYYY")],
                  ].filter(([,v]) => v).map(([k, v]) => (
                    <div key={k} className="flex justify-between border-b border-border/30 pb-1">
                      <dt className="text-muted-foreground capitalize">{k}</dt>
                      <dd className="font-medium text-right">{v}</dd>
                    </div>
                  ))}
                </dl>

                {selected.filing_deadline && moment(selected.filing_deadline).diff(moment(), "days") <= 30 && (
                  <div className={`p-2 rounded-lg text-xs mb-3 flex items-center gap-2 ${moment(selected.filing_deadline).diff(moment(), "days") <= 7 ? "bg-red-50 border border-red-200 text-red-700" : "bg-amber-50 border border-amber-200 text-amber-700"}`}>
                    <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                    Filing deadline {moment(selected.filing_deadline).fromNow()}
                  </div>
                )}

                {(selected.legal_theories||[]).length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-1.5">Legal Theories</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selected.legal_theories.map((t,i) => <Badge key={i} variant="outline" className="text-xs">{t}</Badge>)}
                    </div>
                  </div>
                )}

                {selected.relief_sought && (
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Relief Sought</p>
                    <p className="text-sm">{selected.relief_sought}</p>
                  </div>
                )}

                {selected.notes && (
                  <div className="mt-3 p-3 bg-muted rounded text-xs text-muted-foreground">{selected.notes}</div>
                )}

                <div className="mt-4 pt-3 border-t border-border/40">
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Linked Records</p>
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs gap-1"><Link2 className="w-2.5 h-2.5" />{(selected.linked_evidence_ids||[]).length} Evidence</Badge>
                    <Badge variant="outline" className="text-xs gap-1"><Link2 className="w-2.5 h-2.5" />{(selected.linked_foia_ids||[]).length} FOIA</Badge>
                    <Badge variant="outline" className="text-xs gap-1"><Link2 className="w-2.5 h-2.5" />{(selected.linked_canon_ids||[]).length} Canon</Badge>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Case File" : "Open New Case File"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            <div><label className="text-xs font-semibold text-muted-foreground block mb-1">Case Title *</label><input className="w-full border rounded px-2.5 py-1.5 text-sm" value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Brief descriptive title" /></div>
            <div className="grid grid-cols-2 gap-3">
              {[["Case Type","case_type",["civil_rights","foia","benefits","employment","housing","consumer","criminal_defense","family","immigration","other"]],["Status","status",["intake","open","investigation","discovery","pre_trial","trial","settled","closed","appealed"]],["Priority","priority",["low","medium","high","urgent"]]].map(([label, key, opts]) => (
                <div key={key}>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">{label}</label>
                  <Select value={form[key]} onValueChange={v => setForm({...form,[key]:v})}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>{opts.map(o=><SelectItem key={o} value={o} className="capitalize text-xs">{o.replace(/_/g," ")}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              ))}
              <div><label className="text-xs font-semibold text-muted-foreground block mb-1">Client Name</label><input className="w-full border rounded px-2.5 py-1.5 text-sm" value={form.client_name} onChange={e => setForm({...form, client_name: e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-semibold text-muted-foreground block mb-1">Jurisdiction</label><input className="w-full border rounded px-2.5 py-1.5 text-sm" value={form.jurisdiction} onChange={e => setForm({...form, jurisdiction: e.target.value})} placeholder="e.g. MDNC" /></div>
              <div><label className="text-xs font-semibold text-muted-foreground block mb-1">Filing Deadline</label><input type="date" className="w-full border rounded px-2.5 py-1.5 text-sm" value={form.filing_deadline} onChange={e => setForm({...form, filing_deadline: e.target.value})} /></div>
            </div>
            <div><label className="text-xs font-semibold text-muted-foreground block mb-1">Description</label><textarea className="w-full border rounded px-2.5 py-1.5 text-sm resize-none" rows={3} value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
            <div><label className="text-xs font-semibold text-muted-foreground block mb-1">Relief Sought</label><input className="w-full border rounded px-2.5 py-1.5 text-sm" value={form.relief_sought} onChange={e => setForm({...form, relief_sought: e.target.value})} /></div>
            <div><label className="text-xs font-semibold text-muted-foreground block mb-1">Notes</label><textarea className="w-full border rounded px-2.5 py-1.5 text-sm resize-none" rows={2} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button size="sm" onClick={save} disabled={saving || !form.title}>
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
                {editId ? "Update Case" : "Open Case File"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}