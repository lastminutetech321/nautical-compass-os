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
import { Briefcase, Plus, Search, MapPin, DollarSign, Clock } from "lucide-react";

const OPP_TYPES = ["gig","contract","full_time","part_time","temp","seasonal","apprenticeship","internship","volunteer","other"];
const RATE_TYPES = ["hourly","fixed","daily","salary","tbd"];
const STATUSES = ["open","filled","cancelled","expired","draft"];
const STATUS_COLORS = { open:"bg-emerald-100 text-emerald-700", filled:"bg-blue-100 text-blue-700", cancelled:"bg-red-100 text-red-700", expired:"bg-gray-100 text-gray-500", draft:"bg-amber-100 text-amber-700" };
const BLANK = { title:"", description:"", client_name:"", category:"", trade:"", opportunity_type:"gig", location:"", remote:false, rate_type:"hourly", rate_min:0, rate_max:0, start_date:"", end_date:"", hours_per_week:0, required_skills:[], status:"open", posted_date: new Date().toISOString().slice(0,10), tags:[] };

export default function GigMarketplacePage() {
  const [gigs, setGigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("open");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [skillInput, setSkillInput] = useState("");

  useEffect(() => { base44.entities.GigOpportunity.list("-posted_date", 200).then(setGigs).finally(() => setLoading(false)); }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const addSkill = () => {
    if (!skillInput.trim()) return;
    setForm(f => ({ ...f, required_skills: [...(f.required_skills||[]), skillInput.trim()] }));
    setSkillInput("");
  };

  const handleSave = async () => {
    setSaving(true);
    const r = await base44.entities.GigOpportunity.create(form);
    setGigs(prev => [r, ...prev]);
    setOpen(false);
    setSaving(false);
    setForm(BLANK);
  };

  const filtered = gigs.filter(g => {
    if (statusFilter !== "all" && g.status !== statusFilter) return false;
    if (search && !`${g.title} ${g.client_name} ${g.trade} ${g.category} ${g.location}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><Briefcase className="w-5 h-5 text-orange-600" /><h1 className="text-xl font-bold">Gig Marketplace</h1><Badge variant="outline">{gigs.filter(g=>g.status==="open").length} open</Badge></div>
        <Button onClick={() => { setForm(BLANK); setOpen(true); }} className="bg-orange-600 hover:bg-orange-700 text-white"><Plus className="w-4 h-4 mr-1" />Post Gig</Button>
      </div>
      <div className="flex gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" /><Input className="pl-9" placeholder="Search gigs…" value={search} onChange={e => setSearch(e.target.value)} /></div>
        <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
      </div>
      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : filtered.length === 0 ? <Card className="p-8 text-center border-dashed"><p className="text-muted-foreground">No gigs found.</p></Card> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map(g => (
            <Card key={g.id} className="p-4 hover:border-orange-400 transition-all">
              <div className="flex items-start justify-between mb-2">
                <div><p className="font-bold text-sm">{g.title}</p><p className="text-xs text-muted-foreground">{g.client_name || "—"} {g.trade ? `· ${g.trade}` : ""}</p></div>
                <Badge className={`text-[10px] ${STATUS_COLORS[g.status]||""}`}>{g.status}</Badge>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {g.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{g.location}</span>}
                {g.remote && <span className="text-blue-600">Remote</span>}
                {(g.rate_min > 0 || g.rate_max > 0) && <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />${g.rate_min}–${g.rate_max}/{g.rate_type}</span>}
                {g.start_date && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{g.start_date}</span>}
              </div>
              {g.required_skills?.length > 0 && <div className="flex flex-wrap gap-1 mt-2">{g.required_skills.slice(0,4).map(s => <Badge key={s} variant="outline" className="text-[9px]">{s}</Badge>)}</div>}
              {g.description && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{g.description}</p>}
            </Card>
          ))}
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Post Gig Opportunity</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="col-span-2"><Label>Title *</Label><Input value={form.title} onChange={e => set("title", e.target.value)} className="mt-1" /></div>
            <div><Label>Type</Label><Select value={form.opportunity_type} onValueChange={v => set("opportunity_type", v)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{OPP_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g," ")}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Client Name</Label><Input value={form.client_name} onChange={e => set("client_name", e.target.value)} className="mt-1" /></div>
            <div><Label>Trade / Category</Label><Input value={form.trade} onChange={e => set("trade", e.target.value)} className="mt-1" /></div>
            <div><Label>Location</Label><Input value={form.location} onChange={e => set("location", e.target.value)} className="mt-1" /></div>
            <div><Label>Rate Type</Label><Select value={form.rate_type} onValueChange={v => set("rate_type", v)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{RATE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-1">
              <div><Label>Min ($)</Label><Input type="number" value={form.rate_min} onChange={e => set("rate_min", Number(e.target.value))} className="mt-1" /></div>
              <div><Label>Max ($)</Label><Input type="number" value={form.rate_max} onChange={e => set("rate_max", Number(e.target.value))} className="mt-1" /></div>
            </div>
            <div><Label>Start Date</Label><Input type="date" value={form.start_date} onChange={e => set("start_date", e.target.value)} className="mt-1" /></div>
            <div><Label>Hrs/Week</Label><Input type="number" value={form.hours_per_week} onChange={e => set("hours_per_week", Number(e.target.value))} className="mt-1" /></div>
            <div className="col-span-2">
              <Label>Required Skills</Label>
              <div className="flex gap-2 mt-1"><Input placeholder="Add skill…" value={skillInput} onChange={e => setSkillInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addSkill()} /><Button size="sm" variant="outline" onClick={addSkill}>+</Button></div>
              <div className="flex flex-wrap gap-1 mt-1">{(form.required_skills||[]).map(s => <Badge key={s} variant="outline" className="text-[10px] cursor-pointer" onClick={() => setForm(f => ({ ...f, required_skills: f.required_skills.filter(x=>x!==s) }))}>{s} ✕</Badge>)}</div>
            </div>
            <div className="col-span-2"><Label>Description</Label><Textarea rows={3} value={form.description} onChange={e => set("description", e.target.value)} className="mt-1" /></div>
            <div className="flex items-center gap-2"><input type="checkbox" checked={form.remote} onChange={e => set("remote", e.target.checked)} id="rem" /><Label htmlFor="rem">Remote OK</Label></div>
          </div>
          <div className="flex justify-end gap-2 pt-2"><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={handleSave} disabled={saving || !form.title} className="bg-orange-600 hover:bg-orange-700 text-white">{saving ? "Saving…" : "Post Gig"}</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}