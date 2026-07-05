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
import { BookOpen, Plus, Search, ExternalLink, Star } from "lucide-react";

const CATEGORIES = ["safety","technical","compliance","leadership","soft_skills","certification_prep","trade","digital","legal","financial","other"];
const METHODS = ["online","in_person","hybrid","self_paced","workshop","apprenticeship"];
const CAT_COLORS = { safety:"bg-red-100 text-red-700", technical:"bg-blue-100 text-blue-700", compliance:"bg-amber-100 text-amber-700", leadership:"bg-violet-100 text-violet-700", trade:"bg-orange-100 text-orange-700", digital:"bg-cyan-100 text-cyan-700", certification_prep:"bg-emerald-100 text-emerald-700" };
const BLANK = { title:"", description:"", category:"technical", provider:"", delivery_method:"online", duration_hours:0, cost:0, free:false, certification_awarded:"", url:"", skills_gained:[], status:"available", notes:"" };

export default function TrainingLibraryPage() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [skillInput, setSkillInput] = useState("");

  useEffect(() => { base44.entities.TrainingCourse.list("-created_date", 200).then(setCourses).finally(() => setLoading(false)); }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const addSkill = () => { if (!skillInput.trim()) return; setForm(f => ({ ...f, skills_gained: [...(f.skills_gained||[]), skillInput.trim()] })); setSkillInput(""); };

  const handleSave = async () => {
    setSaving(true);
    const r = await base44.entities.TrainingCourse.create(form);
    setCourses(prev => [r, ...prev]);
    setOpen(false);
    setSaving(false);
    setForm(BLANK);
  };

  const filtered = courses.filter(c => {
    if (catFilter !== "all" && c.category !== catFilter) return false;
    if (search && !`${c.title} ${c.provider} ${c.category}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-orange-600" /><h1 className="text-xl font-bold">Training Library</h1><Badge variant="outline">{courses.length} courses</Badge></div>
        <Button onClick={() => { setForm(BLANK); setOpen(true); }} className="bg-orange-600 hover:bg-orange-700 text-white"><Plus className="w-4 h-4 mr-1" />Add Course</Button>
      </div>
      <div className="flex gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" /><Input className="pl-9" placeholder="Search courses…" value={search} onChange={e => setSearch(e.target.value)} /></div>
        <Select value={catFilter} onValueChange={setCatFilter}><SelectTrigger className="w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Categories</SelectItem>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.replace(/_/g," ").replace(/\b\w/g,x=>x.toUpperCase())}</SelectItem>)}</SelectContent></Select>
      </div>
      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : filtered.length === 0 ? <Card className="p-8 text-center border-dashed"><p className="text-muted-foreground">No courses found.</p></Card> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map(c => (
            <Card key={c.id} className="p-4">
              <div className="flex items-start justify-between mb-1">
                <p className="font-bold text-sm">{c.title}</p>
                <Badge className={`text-[9px] ${CAT_COLORS[c.category]||"bg-gray-100 text-gray-600"}`}>{c.category}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{c.provider || "—"} · {c.delivery_method} {c.duration_hours > 0 ? `· ${c.duration_hours}hr` : ""}</p>
              <p className="text-xs text-muted-foreground">{c.free ? "Free" : c.cost > 0 ? `$${c.cost}` : "—"} {c.certification_awarded ? `· Cert: ${c.certification_awarded}` : ""}</p>
              {c.skills_gained?.length > 0 && <div className="flex flex-wrap gap-1 mt-2">{c.skills_gained.slice(0,4).map(s => <Badge key={s} variant="outline" className="text-[9px]">{s}</Badge>)}</div>}
              {c.url && <a href={c.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-blue-500 hover:underline mt-2"><ExternalLink className="w-3 h-3" />Open Course</a>}
            </Card>
          ))}
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Training Course</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="col-span-2"><Label>Title *</Label><Input value={form.title} onChange={e => set("title", e.target.value)} className="mt-1" /></div>
            <div><Label>Category</Label><Select value={form.category} onValueChange={v => set("category", v)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.replace(/_/g," ")}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Delivery Method</Label><Select value={form.delivery_method} onValueChange={v => set("delivery_method", v)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{METHODS.map(m => <SelectItem key={m} value={m}>{m.replace(/_/g," ")}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Provider</Label><Input value={form.provider} onChange={e => set("provider", e.target.value)} className="mt-1" /></div>
            <div><Label>Duration (hrs)</Label><Input type="number" value={form.duration_hours} onChange={e => set("duration_hours", Number(e.target.value))} className="mt-1" /></div>
            <div><Label>Cost ($)</Label><Input type="number" value={form.cost} onChange={e => set("cost", Number(e.target.value))} className="mt-1" /></div>
            <div><Label>Cert Awarded</Label><Input value={form.certification_awarded} onChange={e => set("certification_awarded", e.target.value)} className="mt-1" /></div>
            <div className="col-span-2"><Label>URL</Label><Input placeholder="https://…" value={form.url} onChange={e => set("url", e.target.value)} className="mt-1" /></div>
            <div className="col-span-2">
              <Label>Skills Gained</Label>
              <div className="flex gap-2 mt-1"><Input placeholder="Add skill…" value={skillInput} onChange={e => setSkillInput(e.target.value)} onKeyDown={e => e.key==="Enter" && addSkill()} /><Button size="sm" variant="outline" onClick={addSkill}>+</Button></div>
              <div className="flex flex-wrap gap-1 mt-1">{(form.skills_gained||[]).map(s => <Badge key={s} variant="outline" className="text-[10px] cursor-pointer" onClick={() => setForm(f => ({ ...f, skills_gained: f.skills_gained.filter(x=>x!==s) }))}>{s} ✕</Badge>)}</div>
            </div>
            <div className="col-span-2"><Label>Description</Label><Textarea rows={2} value={form.description} onChange={e => set("description", e.target.value)} className="mt-1" /></div>
            <div className="flex items-center gap-2"><input type="checkbox" checked={form.free} onChange={e => set("free", e.target.checked)} id="fr" /><Label htmlFor="fr">Free Course</Label></div>
          </div>
          <div className="flex justify-end gap-2 pt-2"><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={handleSave} disabled={saving || !form.title} className="bg-orange-600 hover:bg-orange-700 text-white">{saving ? "Saving…" : "Save"}</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}