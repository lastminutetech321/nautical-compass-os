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
import { FileText, Plus, Loader2, Wand2 } from "lucide-react";

const COMPLAINT_TYPES = ["excessive_force","unlawful_search","due_process","discrimination","retaliation","fraud","misconduct","unauthorized_action","privacy_violation","first_amendment","other"];
const STATUSES = ["draft","filed","pending","acknowledged","under_investigation","resolved","dismissed","appealed","closed"];
const AUTHORITY_TYPES = ["police","court","employer","landlord","government","school","hoa","security","hospital","licensing_board","corporation","other"];
const STATUS_COLORS = { draft:"bg-gray-100 text-gray-600", filed:"bg-blue-100 text-blue-700", pending:"bg-amber-100 text-amber-700", acknowledged:"bg-violet-100 text-violet-700", under_investigation:"bg-orange-100 text-orange-700", resolved:"bg-emerald-100 text-emerald-700", dismissed:"bg-red-100 text-red-700", appealed:"bg-pink-100 text-pink-700", closed:"bg-slate-100 text-slate-600" };

export default function AuthorityComplaintsPage() {
  const location = useLocation();
  const urlParams = new URLSearchParams(location.search);
  const prefillId = urlParams.get("id");
  const [complaints, setComplaints] = useState([]);
  const [interactions, setInteractions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aiDrafting, setAiDrafting] = useState(false);
  const [form, setForm] = useState({ title:"", interaction_id: prefillId||"", authority_type:"government", authority_name:"", complaint_type:"misconduct", status:"draft", filed_with:"", narrative:"", relief_requested:"", notes:"" });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    Promise.all([
      base44.entities.AuthorityComplaint.list("-created_date", 100),
      base44.entities.AuthorityInteraction.list("-created_date", 100),
    ]).then(([c, i]) => { setComplaints(c); setInteractions(i); }).finally(() => setLoading(false));
    if (prefillId) setOpen(true);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const record = await base44.entities.AuthorityComplaint.create(form);
    setComplaints(prev => [record, ...prev]);
    setOpen(false);
    setSaving(false);
    setForm({ title:"", interaction_id:"", authority_type:"government", authority_name:"", complaint_type:"misconduct", status:"draft", filed_with:"", narrative:"", relief_requested:"", notes:"" });
  };

  const aiDraft = async () => {
    setAiDrafting(true);
    const interaction = interactions.find(i => i.id === form.interaction_id);
    const context = interaction ? `Interaction: ${interaction.title}. Claimed authority: ${interaction.claimed_authority}. Description: ${interaction.description}.` : `Complaint about: ${form.authority_name}, Type: ${form.complaint_type}`;
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Draft a formal complaint narrative for this authority interaction. Be factual, professional, and legally precise. Do NOT fabricate legal citations — mark unknown laws as CANON GAP. Context: ${context}. Complaint type: ${form.complaint_type}. Relief requested context: ${form.relief_requested || "not specified"}. Output JSON with: narrative (formal complaint paragraph), relief_requested (specific relief), title (short complaint title).`,
      response_json_schema: { type:"object", properties: { narrative:{type:"string"}, relief_requested:{type:"string"}, title:{type:"string"} } }
    });
    if (result.narrative) setForm(f => ({ ...f, narrative: result.narrative, relief_requested: result.relief_requested || f.relief_requested, title: result.title || f.title }));
    setAiDrafting(false);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><FileText className="w-5 h-5 text-indigo-600" /><h1 className="text-xl font-bold">Complaint Builder</h1><Badge variant="outline">{complaints.length}</Badge></div>
        <Button onClick={() => setOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white"><Plus className="w-4 h-4 mr-1" />New Complaint</Button>
      </div>

      {loading ? <div className="text-muted-foreground text-sm">Loading…</div> : (
        <div className="space-y-3">
          {complaints.length === 0 && <Card className="p-10 text-center border-dashed"><p className="text-muted-foreground">No complaints filed yet.</p></Card>}
          {complaints.map(c => (
            <Card key={c.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-sm">{c.title}</p>
                  <p className="text-xs text-muted-foreground">{c.authority_type?.replace(/_/g," ")} · {c.complaint_type?.replace(/_/g," ")} {c.filed_with ? `· Filed with: ${c.filed_with}` : ""} {c.filed_date ? `· ${c.filed_date}` : ""}</p>
                  {c.narrative && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{c.narrative}</p>}
                </div>
                <Badge className={`text-[10px] shrink-0 ${STATUS_COLORS[c.status]||""}`}>{c.status?.replace(/_/g," ")}</Badge>
              </div>
              {c.reference_number && <p className="text-xs text-emerald-600 mt-1">Ref: {c.reference_number}</p>}
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Build Complaint</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Complaint Title</Label>
                <Input placeholder="Brief complaint title" value={form.title} onChange={e => set("title", e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Authority Type</Label>
                <Select value={form.authority_type} onValueChange={v => set("authority_type", v)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{AUTHORITY_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase())}</SelectItem>)}</SelectContent></Select>
              </div>
              <div>
                <Label>Complaint Type</Label>
                <Select value={form.complaint_type} onValueChange={v => set("complaint_type", v)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{COMPLAINT_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase())}</SelectItem>)}</SelectContent></Select>
              </div>
              <div>
                <Label>Linked Interaction</Label>
                <Select value={form.interaction_id} onValueChange={v => set("interaction_id", v)}><SelectTrigger className="mt-1"><SelectValue placeholder="Select interaction" /></SelectTrigger><SelectContent><SelectItem value={null}>None</SelectItem>{interactions.map(i => <SelectItem key={i.id} value={i.id}>{i.title}</SelectItem>)}</SelectContent></Select>
              </div>
              <div>
                <Label>Authority Name</Label>
                <Input placeholder="e.g. NYPD 78th Precinct" value={form.authority_name} onChange={e => set("authority_name", e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Filed With</Label>
                <Input placeholder="e.g. NC CCBI, EEOC, HUD, State Bar" value={form.filed_with} onChange={e => set("filed_with", e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => set("status", v)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase())}</SelectItem>)}</SelectContent></Select>
              </div>
              <div className="col-span-2">
                <div className="flex items-center justify-between mb-1"><Label>Complaint Narrative</Label><Button size="sm" variant="outline" onClick={aiDraft} disabled={aiDrafting}>{aiDrafting ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Drafting…</> : <><Wand2 className="w-3 h-3 mr-1" />AI Draft</>}</Button></div>
                <Textarea rows={5} placeholder="Detailed factual narrative of what happened and why it constitutes misconduct…" value={form.narrative} onChange={e => set("narrative", e.target.value)} />
              </div>
              <div className="col-span-2">
                <Label>Relief Requested</Label>
                <Textarea rows={2} placeholder="What outcome are you seeking? (e.g. investigation, termination, monetary damages, policy change)" value={form.relief_requested} onChange={e => set("relief_requested", e.target.value)} className="mt-1" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving || !form.title} className="bg-indigo-600 hover:bg-indigo-700 text-white">{saving ? "Saving…" : "Save Complaint"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}