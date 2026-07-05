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
import { Eye, Plus } from "lucide-react";

const RECORD_TYPES = ["pattern_of_conduct","policy_violation","public_complaint","disciplinary_action","lawsuit","settlement","media_coverage","legislative_action","regulatory_finding","other"];
const AUTHORITY_TYPES = ["police","court","employer","landlord","government","school","hoa","security","hospital","licensing_board","corporation","other"];
const VISIBILITY = ["private","internal","public"];

export default function AuthorityAccountabilityPage() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ title:"", authority_type:"government", authority_name:"", actor_name:"", actor_title:"", record_type:"public_complaint", description:"", date_of_record:"", source_url:"", source_name:"", verified:false, public_visibility:"internal", notes:"" });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    base44.entities.PublicAccountabilityRecord.list("-created_date", 200).then(setRecords).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const record = await base44.entities.PublicAccountabilityRecord.create(form);
    setRecords(prev => [record, ...prev]);
    setOpen(false);
    setSaving(false);
  };

  const filtered = records.filter(r => !search || `${r.title} ${r.authority_name} ${r.actor_name} ${r.description}`.toLowerCase().includes(search.toLowerCase()));

  const RECORD_ICONS = { pattern_of_conduct:"🔄", policy_violation:"📵", public_complaint:"📢", disciplinary_action:"⚠️", lawsuit:"⚖️", settlement:"💰", media_coverage:"📡", legislative_action:"🏛", regulatory_finding:"🔍", other:"📝" };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><Eye className="w-5 h-5 text-indigo-600" /><h1 className="text-xl font-bold">Public Accountability Tracker</h1><Badge variant="outline">{records.length}</Badge></div>
        <Button onClick={() => setOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white"><Plus className="w-4 h-4 mr-1" />Add Record</Button>
      </div>
      <p className="text-sm text-muted-foreground">Track patterns of authority conduct, public complaints, disciplinary actions, lawsuits, and media coverage to build accountability evidence.</p>

      <Input placeholder="Search accountability records…" value={search} onChange={e => setSearch(e.target.value)} />

      {loading ? <div className="text-muted-foreground text-sm">Loading…</div> : (
        <div className="space-y-3">
          {filtered.length === 0 && <Card className="p-10 text-center border-dashed"><p className="text-muted-foreground">No accountability records yet.</p></Card>}
          {filtered.map(r => (
            <Card key={r.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="text-xl">{RECORD_ICONS[r.record_type] || "📝"}</span>
                  <div>
                    <p className="font-semibold text-sm">{r.title}</p>
                    <p className="text-xs text-muted-foreground">{r.authority_type?.replace(/_/g," ")} · {r.authority_name || "—"} {r.actor_name ? `· ${r.actor_name}` : ""} {r.date_of_record ? `· ${r.date_of_record}` : ""}</p>
                    {r.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.description}</p>}
                    {r.source_url && <a href={r.source_url} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline mt-1 block">🔗 {r.source_name || "Source"}</a>}
                  </div>
                </div>
                <div className="flex flex-col gap-1 items-end shrink-0">
                  <Badge variant="outline" className="text-[10px]">{r.record_type?.replace(/_/g," ")}</Badge>
                  {r.verified && <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">Verified</Badge>}
                  <Badge variant="outline" className="text-[9px]">{r.public_visibility}</Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Accountability Record</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label>Record Title</Label><Input placeholder="e.g. Officer Smith — 3rd complaint for excessive force" value={form.title} onChange={e => set("title", e.target.value)} className="mt-1" /></div>
              <div><Label>Authority Type</Label><Select value={form.authority_type} onValueChange={v => set("authority_type", v)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{AUTHORITY_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase())}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Record Type</Label><Select value={form.record_type} onValueChange={v => set("record_type", v)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{RECORD_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase())}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Authority / Organization</Label><Input value={form.authority_name} onChange={e => set("authority_name", e.target.value)} className="mt-1" /></div>
              <div><Label>Actor Name</Label><Input value={form.actor_name} onChange={e => set("actor_name", e.target.value)} className="mt-1" /></div>
              <div><Label>Date of Record</Label><Input type="date" value={form.date_of_record} onChange={e => set("date_of_record", e.target.value)} className="mt-1" /></div>
              <div><Label>Visibility</Label><Select value={form.public_visibility} onValueChange={v => set("public_visibility", v)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{VISIBILITY.map(v => <SelectItem key={v} value={v}>{v.charAt(0).toUpperCase()+v.slice(1)}</SelectItem>)}</SelectContent></Select></div>
              <div className="col-span-2"><Label>Description</Label><Textarea rows={3} value={form.description} onChange={e => set("description", e.target.value)} className="mt-1" /></div>
              <div><Label>Source URL</Label><Input placeholder="https://…" value={form.source_url} onChange={e => set("source_url", e.target.value)} className="mt-1" /></div>
              <div><Label>Source Name</Label><Input placeholder="e.g. News & Observer" value={form.source_name} onChange={e => set("source_name", e.target.value)} className="mt-1" /></div>
            </div>
            <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={handleSave} disabled={saving || !form.title} className="bg-indigo-600 hover:bg-indigo-700 text-white">{saving ? "Saving…" : "Save Record"}</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}