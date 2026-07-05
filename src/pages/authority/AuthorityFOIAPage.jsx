import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Plus, Wand2, Loader2, ExternalLink } from "lucide-react";

const STATUSES = ["draft","submitted","acknowledged","partial_response","fulfilled","denied","appealed","overdue"];
const STATUS_COLORS = { draft:"bg-gray-100 text-gray-600",submitted:"bg-blue-100 text-blue-700",acknowledged:"bg-violet-100 text-violet-700",partial_response:"bg-amber-100 text-amber-700",fulfilled:"bg-emerald-100 text-emerald-700",denied:"bg-red-100 text-red-700",appealed:"bg-orange-100 text-orange-700",overdue:"bg-red-200 text-red-700" };

const FOIA_TIPS = [
  { title: "Federal FOIA (5 U.S.C. § 552)", desc: "Federal agencies must respond within 20 business days. You can appeal a denial. The DOJ FOIA portal (foiaonline.gov) tracks federal requests.", law: "5 U.S.C. § 552" },
  { title: "NC Public Records Law", desc: "NC G.S. § 132-1 et seq. NC agencies must respond promptly. No formal request required but written is recommended. Fees may apply.", law: "N.C.G.S. § 132-1" },
  { title: "Fee Waivers", desc: "Request fee waivers as a member of the public, journalist, or nonprofit. Include in your request.", law: "CANON GAP — verify per agency" },
  { title: "Vaughn Index", desc: "If documents are withheld, you can request a Vaughn Index explaining each exemption applied.", law: "Vaughn v. Rosen, 484 F.2d 820" },
];

export default function AuthorityFOIAPage() {
  const [requests, setRequests] = useState([]);
  const [interactions, setInteractions] = useState([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [form, setForm] = useState({ title:"", interaction_id:"", authority_name:"", request_type:"foia", status:"draft", submitted_date:"", deadline:"", reference_number:"", documents_requested:[""], notes:"" });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    Promise.all([
      base44.entities.AuthorityDocRequest.filter({ request_type: "foia" }, "-created_date", 100),
      base44.entities.AuthorityInteraction.list("-created_date", 100),
    ]).then(([r, i]) => { setRequests(r); setInteractions(i); }).finally(() => setLoading(false));
  }, []);

  const aiDraftRequest = async () => {
    setAiLoading(true);
    const inter = interactions.find(i => i.id === form.interaction_id);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Draft a formal FOIA/public records request letter for: Agency: ${form.authority_name}. Context: ${inter ? inter.description : "General records request"}. Documents needed: ${form.documents_requested.filter(Boolean).join(", ") || "all relevant records"}. Include: proper salutation, specific document descriptions, fee waiver request, response deadline reminder, and contact info placeholder. Mark any legal citations you cannot verify as CANON GAP. Return JSON with: letter_text (full letter), documents_list (refined list of specific documents to request), notes.`,
      response_json_schema: { type:"object", properties: { letter_text:{type:"string"}, documents_list:{type:"array",items:{type:"string"}}, notes:{type:"string"} } }
    });
    if (result.letter_text) setForm(f => ({ ...f, notes: result.letter_text, documents_requested: result.documents_list || f.documents_requested }));
    setAiLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const record = await base44.entities.AuthorityDocRequest.create({ ...form, request_type: "foia" });
    setRequests(prev => [record, ...prev]);
    setOpen(false);
    setSaving(false);
  };

  const today = new Date().toISOString().slice(0,10);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><Search className="w-5 h-5 text-indigo-600" /><h1 className="text-xl font-bold">FOIA Requests</h1><Badge variant="outline">{requests.length}</Badge></div>
        <Button onClick={() => setOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white"><Plus className="w-4 h-4 mr-1" />New FOIA Request</Button>
      </div>

      {/* Tips */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {FOIA_TIPS.map(t => (
          <Card key={t.title} className="p-3">
            <p className="text-xs font-bold">{t.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{t.desc}</p>
            <Badge variant="outline" className={`text-[9px] mt-1 ${t.law.includes("CANON") ? "border-amber-400 text-amber-600" : ""}`}>{t.law}</Badge>
          </Card>
        ))}
      </div>

      {loading ? <div className="text-muted-foreground text-sm">Loading…</div> : (
        <div className="space-y-3">
          {requests.length === 0 && <Card className="p-10 text-center border-dashed"><p className="text-muted-foreground">No FOIA requests filed yet.</p></Card>}
          {requests.map(r => (
            <Card key={r.id} className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-sm">{r.title}</p>
                  <p className="text-xs text-muted-foreground">FOIA · {r.authority_name || "—"} {r.submitted_date ? `· Submitted: ${r.submitted_date}` : ""}</p>
                  {r.deadline && <p className={`text-xs mt-1 ${r.deadline < today ? "text-red-600 font-semibold" : "text-muted-foreground"}`}>Deadline: {r.deadline}</p>}
                  {r.reference_number && <p className="text-xs text-emerald-600">Ref: {r.reference_number}</p>}
                </div>
                <Badge className={`text-[10px] shrink-0 ${STATUS_COLORS[r.status]||""}`}>{r.status}</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
      <p className="text-xs text-muted-foreground">Also see <Link to="/foia" className="text-indigo-500 hover:underline">FOIA Tracker ↗</Link> in Evidence Command for full FOIA management.</p>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>FOIA / Public Records Request</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label>Request Title</Label><Input value={form.title} onChange={e => set("title", e.target.value)} className="mt-1" /></div>
              <div><Label>Agency / Authority</Label><Input value={form.authority_name} onChange={e => set("authority_name", e.target.value)} className="mt-1" /></div>
              <div><Label>Linked Interaction</Label><Select value={form.interaction_id} onValueChange={v => set("interaction_id", v)}><SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value={null}>None</SelectItem>{interactions.map(i => <SelectItem key={i.id} value={i.id}>{i.title}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Submitted Date</Label><Input type="date" value={form.submitted_date} onChange={e => set("submitted_date", e.target.value)} className="mt-1" /></div>
              <div><Label>Response Deadline</Label><Input type="date" value={form.deadline} onChange={e => set("deadline", e.target.value)} className="mt-1" /></div>
              <div className="col-span-2">
                <Label>Documents Requested</Label>
                <div className="space-y-1 mt-1">{form.documents_requested.map((d, i) => (<div key={i} className="flex gap-2"><Input placeholder={`Document ${i+1}`} value={d} onChange={e => { const docs = [...form.documents_requested]; docs[i] = e.target.value; set("documents_requested", docs); }} /><Button size="sm" variant="ghost" onClick={() => { const docs = form.documents_requested.filter((_,j)=>j!==i); set("documents_requested", docs.length ? docs : [""]); }}>✕</Button></div>))}</div>
                <Button size="sm" variant="outline" className="mt-1" onClick={() => set("documents_requested", [...form.documents_requested, ""])}>+ Add</Button>
              </div>
              <div className="col-span-2">
                <div className="flex items-center justify-between mb-1"><Label>Request Letter / Notes</Label><Button size="sm" variant="outline" onClick={aiDraftRequest} disabled={aiLoading}>{aiLoading ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Drafting…</> : <><Wand2 className="w-3 h-3 mr-1" />AI Draft Letter</>}</Button></div>
                <Textarea rows={5} placeholder="Paste or generate the FOIA letter text…" value={form.notes} onChange={e => set("notes", e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={handleSave} disabled={saving || !form.title} className="bg-indigo-600 hover:bg-indigo-700 text-white">{saving ? "Saving…" : "Save Request"}</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}