import { useState, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Scale, Plus, AlertTriangle } from "lucide-react";

const APPEAL_TYPES = ["administrative","judicial","legislative","media","public","internal","regulatory","other"];
const STATUSES = ["planned","filed","pending","hearing_scheduled","decided","won","lost","withdrawn","escalated"];
const AUTHORITY_TYPES = ["police","court","employer","landlord","government","school","hoa","security","hospital","licensing_board","corporation","other"];
const STATUS_COLORS = { planned:"bg-slate-100 text-slate-600", filed:"bg-blue-100 text-blue-700", pending:"bg-amber-100 text-amber-700", hearing_scheduled:"bg-violet-100 text-violet-700", decided:"bg-gray-100 text-gray-600", won:"bg-emerald-100 text-emerald-700", lost:"bg-red-100 text-red-700", withdrawn:"bg-gray-100 text-gray-500", escalated:"bg-orange-100 text-orange-700" };

export default function AuthorityAppealsPage() {
  const location = useLocation();
  const urlParams = new URLSearchParams(location.search);
  const prefillId = urlParams.get("id");
  const [appeals, setAppeals] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title:"", interaction_id: prefillId||"", complaint_id:"", authority_type:"government", appeal_type:"administrative", status:"planned", filed_with:"", deadline:"", hearing_date:"", grounds_for_appeal:"", relief_sought:"", notes:"" });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    Promise.all([
      base44.entities.AuthorityAppeal.list("-created_date", 100),
      base44.entities.AuthorityComplaint.list("-created_date", 100),
    ]).then(([a, c]) => { setAppeals(a); setComplaints(c); }).finally(() => setLoading(false));
    if (prefillId) setOpen(true);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const record = await base44.entities.AuthorityAppeal.create(form);
    setAppeals(prev => [record, ...prev]);
    setOpen(false);
    setSaving(false);
  };

  const today = new Date().toISOString().slice(0,10);
  const overdue = appeals.filter(a => a.deadline && a.deadline < today && !["decided","won","lost","withdrawn"].includes(a.status));

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><Scale className="w-5 h-5 text-indigo-600" /><h1 className="text-xl font-bold">Appeal Tracker</h1><Badge variant="outline">{appeals.length}</Badge>{overdue.length > 0 && <Badge className="bg-red-100 text-red-700"><AlertTriangle className="w-3 h-3 mr-1" />{overdue.length} Overdue</Badge>}</div>
        <Button onClick={() => setOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white"><Plus className="w-4 h-4 mr-1" />New Appeal</Button>
      </div>

      {loading ? <div className="text-muted-foreground text-sm">Loading…</div> : (
        <div className="space-y-3">
          {appeals.length === 0 && <Card className="p-10 text-center border-dashed"><p className="text-muted-foreground">No appeals tracked yet.</p></Card>}
          {appeals.map(a => {
            const isOverdue = a.deadline && a.deadline < today && !["decided","won","lost","withdrawn"].includes(a.status);
            return (
              <Card key={a.id} className={`p-4 ${isOverdue ? "border-red-300" : ""}`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm">{a.title}</p>
                      {isOverdue && <Badge className="bg-red-100 text-red-600 text-[9px]">DEADLINE PASSED</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">{a.appeal_type?.replace(/_/g," ")} · Filed with: {a.filed_with || "—"}</p>
                    {a.grounds_for_appeal && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.grounds_for_appeal}</p>}
                    <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                      {a.deadline && <span className={isOverdue ? "text-red-600 font-semibold" : ""}>Deadline: {a.deadline}</span>}
                      {a.hearing_date && <span>Hearing: {a.hearing_date}</span>}
                    </div>
                  </div>
                  <Badge className={`text-[10px] shrink-0 ${STATUS_COLORS[a.status]||""}`}>{a.status?.replace(/_/g," ")}</Badge>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Track Appeal</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label>Appeal Title</Label><Input placeholder="e.g. Administrative appeal of denial — EEOC Charge 123" value={form.title} onChange={e => set("title", e.target.value)} className="mt-1" /></div>
              <div><Label>Appeal Type</Label><Select value={form.appeal_type} onValueChange={v => set("appeal_type", v)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{APPEAL_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase())}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Status</Label><Select value={form.status} onValueChange={v => set("status", v)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase())}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Filed With</Label><Input placeholder="e.g. Circuit Court, State AG" value={form.filed_with} onChange={e => set("filed_with", e.target.value)} className="mt-1" /></div>
              <div><Label>Appeal Deadline</Label><Input type="date" value={form.deadline} onChange={e => set("deadline", e.target.value)} className="mt-1" /></div>
              <div><Label>Hearing Date</Label><Input type="date" value={form.hearing_date} onChange={e => set("hearing_date", e.target.value)} className="mt-1" /></div>
              <div>
                <Label>Linked Complaint</Label>
                <Select value={form.complaint_id} onValueChange={v => set("complaint_id", v)}><SelectTrigger className="mt-1"><SelectValue placeholder="Select complaint" /></SelectTrigger><SelectContent><SelectItem value={null}>None</SelectItem>{complaints.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent></Select>
              </div>
              <div className="col-span-2"><Label>Grounds for Appeal</Label><Textarea rows={3} placeholder="Legal and factual basis for the appeal…" value={form.grounds_for_appeal} onChange={e => set("grounds_for_appeal", e.target.value)} className="mt-1" /></div>
              <div className="col-span-2"><Label>Relief Sought</Label><Input placeholder="What outcome are you seeking on appeal?" value={form.relief_sought} onChange={e => set("relief_sought", e.target.value)} className="mt-1" /></div>
              <div className="col-span-2"><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={e => set("notes", e.target.value)} className="mt-1" /></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving || !form.title} className="bg-indigo-600 hover:bg-indigo-700 text-white">{saving ? "Saving…" : "Save Appeal"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}