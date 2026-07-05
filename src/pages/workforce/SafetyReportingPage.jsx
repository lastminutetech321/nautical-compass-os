import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertTriangle, Plus, CheckCircle } from "lucide-react";

const TYPES = ["near_miss","injury","illness","hazard","violation","equipment","environmental","harassment","wage_theft","other"];
const STATUSES = ["open","under_review","resolved","escalated","closed"];
const SEVERITIES = ["low","moderate","high","critical"];
const SEV_COLORS = { low:"bg-emerald-100 text-emerald-700", moderate:"bg-amber-100 text-amber-700", high:"bg-orange-100 text-orange-700", critical:"bg-red-100 text-red-700" };
const STATUS_COLORS = { open:"bg-blue-100 text-blue-700", under_review:"bg-violet-100 text-violet-700", resolved:"bg-emerald-100 text-emerald-700", escalated:"bg-orange-100 text-orange-700", closed:"bg-gray-100 text-gray-600" };
const TYPE_ICONS = { near_miss:"⚡", injury:"🤕", illness:"🤒", hazard:"⚠️", violation:"🚫", equipment:"🔧", environmental:"🌿", harassment:"👁", wage_theft:"💸", other:"📋" };
const BLANK = { title:"", report_type:"hazard", severity:"moderate", date_of_incident:"", location:"", employer_name:"", description:"", immediate_action_taken:"", reported_to_osha:false, reported_to_employer:false, status:"open", anonymous:false, notes:"" };

export default function SafetyReportingPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => { base44.entities.SafetyReport.list("-date_of_incident", 200).then(setReports).finally(() => setLoading(false)); }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    const r = await base44.entities.SafetyReport.create(form);
    setReports(prev => [r, ...prev]);
    setOpen(false);
    setSaving(false);
    setForm(BLANK);
  };

  const updateStatus = async (id, status) => {
    await base44.entities.SafetyReport.update(id, { status });
    setReports(prev => prev.map(r => r.id === id ? { ...r, status } : r));
  };

  const filtered = statusFilter === "all" ? reports : reports.filter(r => r.status === statusFilter);
  const openCount = reports.filter(r => r.status === "open").length;
  const criticalCount = reports.filter(r => r.severity === "critical").length;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-orange-600" /><h1 className="text-xl font-bold">Safety Reporting</h1>{openCount > 0 && <Badge className="bg-red-100 text-red-700">{openCount} Open</Badge>}{criticalCount > 0 && <Badge className="bg-red-200 text-red-800">⚠️ {criticalCount} Critical</Badge>}</div>
        <Button onClick={() => { setForm(BLANK); setOpen(true); }} className="bg-orange-600 hover:bg-orange-700 text-white"><Plus className="w-4 h-4 mr-1" />File Report</Button>
      </div>
      <p className="text-xs text-muted-foreground">All safety concerns can be submitted anonymously. Critical incidents should also be reported directly to OSHA (osha.gov) and your state labor board.</p>

      <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Statuses</SelectItem>{STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g," ")}</SelectItem>)}</SelectContent></Select>

      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : filtered.length === 0 ? <Card className="p-8 text-center border-dashed"><p className="text-muted-foreground">No safety reports found.</p></Card> : (
        <div className="space-y-3">
          {filtered.map(r => (
            <Card key={r.id} className={`p-4 ${r.severity === "critical" ? "border-red-300" : ""}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-2">
                  <span className="text-lg mt-0.5">{TYPE_ICONS[r.report_type]||"📋"}</span>
                  <div>
                    <p className="font-bold text-sm">{r.title}</p>
                    <p className="text-xs text-muted-foreground">{r.report_type?.replace(/_/g," ")} · {r.employer_name || "—"} {r.date_of_incident ? `· ${r.date_of_incident}` : ""} {r.location ? `· ${r.location}` : ""}</p>
                    {r.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.description}</p>}
                    <div className="flex gap-2 mt-1.5">
                      {r.reported_to_osha && <Badge className="bg-blue-100 text-blue-700 text-[9px]">OSHA Reported</Badge>}
                      {r.anonymous && <Badge variant="outline" className="text-[9px]">Anonymous</Badge>}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-1 items-end shrink-0">
                  <Badge className={`text-[10px] ${SEV_COLORS[r.severity]||""}`}>{r.severity}</Badge>
                  <Select value={r.status} onValueChange={v => updateStatus(r.id, v)}><SelectTrigger className="h-7 text-[10px] w-36"><SelectValue /></SelectTrigger><SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g," ")}</SelectItem>)}</SelectContent></Select>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>File Safety Report</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="col-span-2"><Label>Report Title *</Label><Input value={form.title} onChange={e => set("title", e.target.value)} className="mt-1" /></div>
            <div><Label>Type</Label><Select value={form.report_type} onValueChange={v => set("report_type", v)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g," ")}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Severity</Label><Select value={form.severity} onValueChange={v => set("severity", v)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{SEVERITIES.map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Date of Incident</Label><Input type="date" value={form.date_of_incident} onChange={e => set("date_of_incident", e.target.value)} className="mt-1" /></div>
            <div><Label>Employer / Site</Label><Input value={form.employer_name} onChange={e => set("employer_name", e.target.value)} className="mt-1" /></div>
            <div className="col-span-2"><Label>Location</Label><Input value={form.location} onChange={e => set("location", e.target.value)} className="mt-1" /></div>
            <div className="col-span-2"><Label>Description *</Label><Textarea rows={4} value={form.description} onChange={e => set("description", e.target.value)} className="mt-1" /></div>
            <div className="col-span-2"><Label>Immediate Action Taken</Label><Textarea rows={2} value={form.immediate_action_taken} onChange={e => set("immediate_action_taken", e.target.value)} className="mt-1" /></div>
            <div className="flex items-center gap-2"><input type="checkbox" checked={form.reported_to_osha} onChange={e => set("reported_to_osha", e.target.checked)} id="osha" /><Label htmlFor="osha">Reported to OSHA</Label></div>
            <div className="flex items-center gap-2"><input type="checkbox" checked={form.reported_to_employer} onChange={e => set("reported_to_employer", e.target.checked)} id="emp" /><Label htmlFor="emp">Reported to Employer</Label></div>
            <div className="flex items-center gap-2"><input type="checkbox" checked={form.anonymous} onChange={e => set("anonymous", e.target.checked)} id="anon" /><Label htmlFor="anon">Submit Anonymously</Label></div>
          </div>
          <div className="flex justify-end gap-2 pt-2"><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={handleSave} disabled={saving || !form.title} className="bg-orange-600 hover:bg-orange-700 text-white">{saving ? "Saving…" : "File Report"}</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}