import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Users, Plus, Search, AlertTriangle, CheckCircle, Clock,
  FileText, Loader2, Home, Briefcase, Heart, Shield, X, ArrowRight
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import moment from "moment";

const CRISIS_COLORS = {
  stable: "text-emerald-600 bg-emerald-50 border-emerald-200",
  moderate: "text-blue-600 bg-blue-50 border-blue-200",
  urgent: "text-amber-600 bg-amber-50 border-amber-200",
  crisis: "text-red-600 bg-red-50 border-red-200",
  emergency: "text-red-800 bg-red-100 border-red-300",
};

const STATUS_COLORS = {
  intake: "text-slate-600 bg-slate-50",
  assessment: "text-blue-600 bg-blue-50",
  active: "text-emerald-600 bg-emerald-50",
  stabilized: "text-teal-600 bg-teal-50",
  closed: "text-gray-500 bg-gray-50",
  referred: "text-violet-600 bg-violet-50",
};

const PRIMARY_NEEDS = ["housing","food","employment","medical","mental_health","legal_aid","transportation","financial","education","childcare","utility","emergency"];

export default function ResourceCases() {
  const [cases, setCases] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "", client_name: "", client_email: "", client_phone: "",
    jurisdiction: "North Carolina", county: "",
    crisis_level: "moderate", status: "intake",
    household_size: 1, monthly_income: 0,
    housing_situation: "housed", employment_status: "unemployed",
    citizenship_status: "citizen",
    has_children: false, is_veteran: false, is_disabled: false,
    primary_needs: [], notes: ""
  });

  useEffect(() => {
    Promise.all([
      base44.entities.ResourceCase.list("-created_date", 100).catch(() => []),
      base44.entities.ResourceApplication.list("-created_date", 200).catch(() => []),
    ]).then(([c, a]) => { setCases(c); setApplications(a); setLoading(false); });
  }, []);

  const reload = () => {
    base44.entities.ResourceCase.list("-created_date", 100).then(c => setCases(c)).catch(() => {});
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    const data = { ...form, household_size: Number(form.household_size), monthly_income: Number(form.monthly_income), intake_date: moment().format("YYYY-MM-DD") };
    if (selected) {
      await base44.entities.ResourceCase.update(selected.id, data);
    } else {
      await base44.entities.ResourceCase.create(data);
    }
    setSaving(false); setFormOpen(false); setSelected(null); reload();
  };

  const openEdit = (c) => {
    setSelected(c);
    setForm({ ...c });
    setFormOpen(true);
  };

  const openNew = () => {
    setSelected(null);
    setForm({ title:"",client_name:"",client_email:"",client_phone:"",jurisdiction:"North Carolina",county:"",crisis_level:"moderate",status:"intake",household_size:1,monthly_income:0,housing_situation:"housed",employment_status:"unemployed",citizenship_status:"citizen",has_children:false,is_veteran:false,is_disabled:false,primary_needs:[],notes:"" });
    setFormOpen(true);
  };

  const toggleNeed = (need) => {
    setForm(f => ({
      ...f,
      primary_needs: f.primary_needs.includes(need)
        ? f.primary_needs.filter(n => n !== need)
        : [...f.primary_needs, need]
    }));
  };

  const filtered = cases.filter(c => {
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return c.client_name?.toLowerCase().includes(s) || c.title?.toLowerCase().includes(s) || c.county?.toLowerCase().includes(s);
    }
    return true;
  });

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">Resource Compass</p>
          <h1 className="text-2xl font-bold">Case Manager</h1>
          <p className="text-sm text-muted-foreground">Guide every person from crisis to stability.</p>
        </div>
        <Button size="sm" onClick={openNew}><Plus className="w-4 h-4 mr-1.5" />New Case</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "All Cases", val: cases.length, color: "text-foreground" },
          { label: "Active", val: cases.filter(c=>c.status==="active").length, color: "text-blue-600" },
          { label: "Crisis", val: cases.filter(c=>["crisis","emergency"].includes(c.crisis_level)).length, color: "text-red-600" },
          { label: "Stabilized", val: cases.filter(c=>c.status==="stabilized").length, color: "text-emerald-600" },
          { label: "Closed", val: cases.filter(c=>c.status==="closed").length, color: "text-muted-foreground" },
        ].map(s => (
          <div key={s.label} className="text-center p-3 bg-muted/30 rounded-lg border border-border/40">
            <p className={`text-xl font-black ${s.color}`}>{s.val}</p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name..." className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 text-xs h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {["intake","assessment","active","stabilized","closed","referred"].map(s => (
              <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Cases list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <Users className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-30" />
          <p className="text-sm text-muted-foreground mb-3">No cases yet. Open a case to begin.</p>
          <Button onClick={openNew}><Plus className="w-4 h-4 mr-1.5" />New Case</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(c => {
            const caseApps = applications.filter(a => a.case_id === c.id);
            const approved = caseApps.filter(a => a.status === "approved").length;
            const pending = caseApps.filter(a => ["submitted","pending_review"].includes(a.status)).length;
            return (
              <Card key={c.id} className="p-4 border border-border/60 hover:border-primary/30 transition-all cursor-pointer" onClick={() => openEdit(c)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="text-sm font-semibold">{c.client_name || c.title}</p>
                      <Badge variant="outline" className={`text-[10px] capitalize ${CRISIS_COLORS[c.crisis_level]}`}>{c.crisis_level}</Badge>
                      <Badge variant="secondary" className={`text-[10px] capitalize ${STATUS_COLORS[c.status]}`}>{c.status}</Badge>
                    </div>
                    {(c.primary_needs || []).length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {c.primary_needs.slice(0,4).map(n => (
                          <span key={n} className="text-[10px] bg-muted px-1.5 py-0.5 rounded capitalize">{n.replace(/_/g," ")}</span>
                        ))}
                        {c.primary_needs.length > 4 && <span className="text-[10px] text-muted-foreground">+{c.primary_needs.length-4} more</span>}
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      {c.county && <span>📍 {c.county}</span>}
                      {c.housing_situation && <span className="capitalize">{c.housing_situation.replace(/_/g," ")}</span>}
                      {c.intake_date && <span>Opened {moment(c.intake_date).fromNow()}</span>}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {caseApps.length > 0 && (
                      <div className="text-xs text-muted-foreground">
                        <p className="text-emerald-600 font-semibold">{approved} approved</p>
                        {pending > 0 && <p className="text-amber-600">{pending} pending</p>}
                        <p>{caseApps.length} total apps</p>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{selected ? "Edit Case" : "Open New Case"}</DialogTitle></DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><label className="text-xs font-semibold block mb-1">Case Title *</label><Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} required placeholder="e.g. Housing + Benefits — Smith Family" /></div>
              <div><label className="text-xs font-semibold block mb-1">Client Name *</label><Input value={form.client_name} onChange={e => setForm({...form, client_name: e.target.value})} required /></div>
              <div><label className="text-xs font-semibold block mb-1">County</label><Input value={form.county} onChange={e => setForm({...form, county: e.target.value})} /></div>
              <div><label className="text-xs font-semibold block mb-1">Phone</label><Input value={form.client_phone} onChange={e => setForm({...form, client_phone: e.target.value})} /></div>
              <div><label className="text-xs font-semibold block mb-1">Email</label><Input value={form.client_email} onChange={e => setForm({...form, client_email: e.target.value})} /></div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-semibold block mb-1">Crisis Level</label>
                <Select value={form.crisis_level} onValueChange={v => setForm({...form, crisis_level: v})}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{["stable","moderate","urgent","crisis","emergency"].map(v => <SelectItem key={v} value={v} className="capitalize">{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><label className="text-xs font-semibold block mb-1">Status</label>
                <Select value={form.status} onValueChange={v => setForm({...form, status: v})}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{["intake","assessment","active","stabilized","closed","referred"].map(v => <SelectItem key={v} value={v} className="capitalize">{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><label className="text-xs font-semibold block mb-1">Housing Situation</label>
                <Select value={form.housing_situation} onValueChange={v => setForm({...form, housing_situation: v})}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{["housed","at_risk","doubled_up","shelter","unsheltered","transitional"].map(v => <SelectItem key={v} value={v} className="capitalize">{v.replace(/_/g," ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><label className="text-xs font-semibold block mb-1">Employment</label>
                <Select value={form.employment_status} onValueChange={v => setForm({...form, employment_status: v})}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{["employed_full","employed_part","unemployed","self_employed","unable_to_work","student","retired"].map(v => <SelectItem key={v} value={v} className="capitalize">{v.replace(/_/g," ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><label className="text-xs font-semibold block mb-1">Household Size</label><Input type="number" min="1" value={form.household_size} onChange={e => setForm({...form, household_size: e.target.value})} /></div>
              <div><label className="text-xs font-semibold block mb-1">Monthly Income ($)</label><Input type="number" min="0" value={form.monthly_income} onChange={e => setForm({...form, monthly_income: e.target.value})} /></div>
            </div>

            <div>
              <label className="text-xs font-semibold block mb-2">Primary Needs (select all that apply)</label>
              <div className="flex flex-wrap gap-2">
                {PRIMARY_NEEDS.map(need => (
                  <button key={need} type="button" onClick={() => toggleNeed(need)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-all capitalize ${(form.primary_needs || []).includes(need) ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}>
                    {need.replace(/_/g," ")}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-4">
              {[["has_children","Has Children"],["is_veteran","Veteran"],["is_disabled","Has Disability"]].map(([key,label]) => (
                <label key={key} className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="checkbox" checked={form[key]} onChange={e => setForm({...form, [key]: e.target.checked})} className="rounded" />
                  {label}
                </label>
              ))}
            </div>

            <div><label className="text-xs font-semibold block mb-1">Notes</label><Textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2} /></div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving..." : selected ? "Update Case" : "Open Case"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}