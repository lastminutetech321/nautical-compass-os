import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, Plus, AlertTriangle } from "lucide-react";

const REQUEST_TYPES = ["foia","public_records","personnel_file","incident_report","warrant","policy_manual","license_records","court_records","employment_records","medical_records","other"];
const STATUSES = ["draft","submitted","acknowledged","partial_response","fulfilled","denied","appealed","overdue"];
const STATUS_COLORS = { draft:"bg-gray-100 text-gray-600",submitted:"bg-blue-100 text-blue-700",acknowledged:"bg-violet-100 text-violet-700",partial_response:"bg-amber-100 text-amber-700",fulfilled:"bg-emerald-100 text-emerald-700",denied:"bg-red-100 text-red-700",appealed:"bg-orange-100 text-orange-700",overdue:"bg-red-100 text-red-600" };

export default function AuthorityDocRequestsPage() {
  const location = useLocation();
  const urlParams = new URLSearchParams(location.search);
  const prefillId = urlParams.get("id");
  const [requests, setRequests] = useState([]);
  const [interactions, setInteractions] = useState([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title:"", interaction_id: prefillId||"", authority_name:"", request_type:"public_records", status:"draft", submitted_date:"", deadline:"", reference_number:"", documents_requested:[""], notes:"" });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    Promise.all([
      base44.entities.AuthorityDocRequest.list("-created_date", 100),
      base44.entities.AuthorityInteraction.list("-created_date", 100),
    ]).then(([r, i]) => { setRequests(r); setInteractions(i); }).finally(() => setLoading(false));
    if (prefillId) setOpen(true);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const docs = form.documents_requested.filter(Boolean);
    const record = await base44.entities.AuthorityDocRequest.create({ ...form, documents_requested: docs });
    setRequests(prev => [record, ...prev]);
    setOpen(false);
    setSaving(false);
  };

  const today = new Date().toISOString().slice(0,10);
  const overdue = requests.filter(r => r.deadline && r.deadline < today && !["fulfilled","appealed"].includes(r.status));

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><FileText className="w-5 h-5 text-indigo-600" /><h1 className="text-xl font-bold">Document Requests</h1><Badge variant="outline">{requests.length}</Badge>{overdue.length > 0 && <Badge className="bg-red-100 text-red-700"><AlertTriangle className="w-3 h-3 mr-1" />{overdue.length} Overdue</Badge>}</div>
        <Button onClick={() => setOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white"><Plus className="w-4 h-4 mr-1" />New Request</Button>
      </div>
      {loading ? <div className="text-muted-foreground text-sm">Loading…</div> : (
        <div className="space-y-3">
          {requests.length === 0 && <Card className="p-10 text-center border-dashed"><p className="text-muted-foreground">No document requests yet.</p></Card>}
          {requests.map(r => (
            <Card key={r.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-sm">{r.title}</p>
                  <p className="text-xs text-muted-foreground">{r.request_type?.replace(/_/g," ")} · {r.authority_name || "—"} {r.submitted_date ? `· Submitted: ${r.submitted_date}` : ""}</p>
                  {r.deadline && <p className={`text-xs mt-1 ${r.deadline < today ? "text-red-600 font-semibold" : "text-muted-foreground"}`}>Deadline: {r.deadline}</p>}
                  {r.documents_requested?.length > 0 && <p className="text-xs text-muted-foreground mt-1">Docs: {r.documents_requested.join(", ")}</p>}
                  {r.reference_number && <p className="text-xs text-emerald-600 mt-1">Ref: {r.reference_number}</p>}
                </div>
                <Badge className={`text-[10px] shrink-0 ${STATUS_COLORS[r.status]||""}`}>{r.status?.replace(/_/g," ")}</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Document Request</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label>Request Title</Label><Input placeholder="e.g. Incident report for arrest on 06/15" value={form.title} onChange={e => set("title", e.target.value)} className="mt-1" /></div>
              <div><Label>Request Type</Label><Select value={form.request_type} onValueChange={v => set("request_type", v)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{REQUEST_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase())}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Status</Label><Select value={form.status} onValueChange={v => set("status", v)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase())}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Authority / Organization</Label><Input value={form.authority_name} onChange={e => set("authority_name", e.target.value)} className="mt-1" /></div>
              <div><Label>Linked Interaction</Label><Select value={form.interaction_id} onValueChange={v => set("interaction_id", v)}><SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value={null}>None</SelectItem>{interactions.map(i => <SelectItem key={i.id} value={i.id}>{i.title}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Submitted Date</Label><Input type="date" value={form.submitted_date} onChange={e => set("submitted_date", e.target.value)} className="mt-1" /></div>
              <div><Label>Response Deadline</Label><Input type="date" value={form.deadline} onChange={e => set("deadline", e.target.value)} className="mt-1" /></div>
              <div><Label>Reference Number</Label><Input value={form.reference_number} onChange={e => set("reference_number", e.target.value)} className="mt-1" /></div>
              <div className="col-span-2">
                <Label>Documents Requested</Label>
                <div className="space-y-1 mt-1">{form.documents_requested.map((d, i) => (
                  <div key={i} className="flex gap-2"><Input placeholder={`Document ${i+1}`} value={d} onChange={e => { const docs = [...form.documents_requested]; docs[i] = e.target.value; set("documents_requested", docs); }} /><Button size="sm" variant="ghost" onClick={() => { const docs = form.documents_requested.filter((_,j)=>j!==i); set("documents_requested", docs.length ? docs : [""]); }}>✕</Button></div>
                ))}</div>
                <Button size="sm" variant="outline" className="mt-1" onClick={() => set("documents_requested", [...form.documents_requested, ""])}>+ Add Document</Button>
              </div>
              <div className="col-span-2"><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={e => set("notes", e.target.value)} className="mt-1" /></div>
            </div>
            <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={handleSave} disabled={saving || !form.title} className="bg-indigo-600 hover:bg-indigo-700 text-white">{saving ? "Saving…" : "Save Request"}</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}