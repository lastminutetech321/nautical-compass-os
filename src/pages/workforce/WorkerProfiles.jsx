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
import { Users, Plus, Search, Star, MapPin, DollarSign, Clock } from "lucide-react";

const WORKER_TYPES = ["employee","contractor","freelancer","gig","union","vendor","intern","part_time","full_time","seasonal"];
const AVAIL_STATUSES = ["available","busy","open_to_offers","unavailable","on_leave"];
const AVAIL_COLORS = { available:"bg-emerald-100 text-emerald-700", busy:"bg-red-100 text-red-700", open_to_offers:"bg-blue-100 text-blue-700", unavailable:"bg-gray-100 text-gray-500", on_leave:"bg-amber-100 text-amber-700" };

const BLANK = { full_name:"", email:"", phone:"", location:"", city:"", state:"", worker_type:"contractor", headline:"", bio:"", primary_trade:"", years_experience:0, hourly_rate:0, availability_status:"available", remote_ok:true, travel_ok:false };

export default function WorkerProfiles() {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);

  useEffect(() => { base44.entities.WorkerProfile.list("-created_date", 200).then(setWorkers).finally(() => setLoading(false)); }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const openNew = () => { setEditing(null); setForm(BLANK); setOpen(true); };
  const openEdit = (w) => { setEditing(w); setForm(w); setOpen(true); };

  const handleSave = async () => {
    setSaving(true);
    if (editing) {
      const updated = await base44.entities.WorkerProfile.update(editing.id, form);
      setWorkers(prev => prev.map(w => w.id === editing.id ? updated : w));
    } else {
      const created = await base44.entities.WorkerProfile.create(form);
      setWorkers(prev => [created, ...prev]);
    }
    setOpen(false);
    setSaving(false);
  };

  const filtered = workers.filter(w => {
    if (typeFilter !== "all" && w.worker_type !== typeFilter) return false;
    if (search && !`${w.full_name} ${w.headline} ${w.primary_trade} ${w.location}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><Users className="w-5 h-5 text-orange-600" /><h1 className="text-xl font-bold">Worker Profiles</h1><Badge variant="outline">{workers.length}</Badge></div>
        <Button onClick={openNew} className="bg-orange-600 hover:bg-orange-700 text-white"><Plus className="w-4 h-4 mr-1" />Add Worker</Button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" /><Input className="pl-9" placeholder="Search workers…" value={search} onChange={e => setSearch(e.target.value)} /></div>
        <Select value={typeFilter} onValueChange={setTypeFilter}><SelectTrigger className="w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Types</SelectItem>{WORKER_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase())}</SelectItem>)}</SelectContent></Select>
      </div>

      {loading ? <div className="text-muted-foreground text-sm text-center py-8">Loading…</div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.length === 0 && <Card className="col-span-3 p-10 text-center border-dashed"><p className="text-muted-foreground">No workers found.</p><Button className="mt-3 bg-orange-600 hover:bg-orange-700 text-white" onClick={openNew}>Add First Worker</Button></Card>}
          {filtered.map(w => (
            <Card key={w.id} className="p-4 hover:border-orange-400 transition-all cursor-pointer" onClick={() => openEdit(w)}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-bold text-sm">{w.full_name}</p>
                  <p className="text-xs text-muted-foreground">{w.headline || w.primary_trade || "—"}</p>
                </div>
                <Badge className={`text-[10px] ${AVAIL_COLORS[w.availability_status] || ""}`}>{w.availability_status?.replace(/_/g," ")}</Badge>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                {w.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{w.location}</span>}
                {w.hourly_rate > 0 && <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />${w.hourly_rate}/hr</span>}
                {w.years_experience > 0 && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{w.years_experience}yr exp</span>}
                {w.rating_avg > 0 && <span className="flex items-center gap-1"><Star className="w-3 h-3 text-amber-500" />{w.rating_avg.toFixed(1)}</span>}
              </div>
              <div className="flex gap-1 mt-2 flex-wrap">
                <Badge variant="outline" className="text-[10px]">{w.worker_type?.replace(/_/g," ")}</Badge>
                {w.remote_ok && <Badge variant="outline" className="text-[10px] text-blue-600">Remote OK</Badge>}
                {w.union_member && <Badge variant="outline" className="text-[10px] text-violet-600">Union</Badge>}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Worker Profile" : "New Worker Profile"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="col-span-2"><Label>Full Name *</Label><Input value={form.full_name} onChange={e => set("full_name", e.target.value)} className="mt-1" /></div>
            <div><Label>Email</Label><Input value={form.email} onChange={e => set("email", e.target.value)} className="mt-1" /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={e => set("phone", e.target.value)} className="mt-1" /></div>
            <div><Label>Worker Type</Label><Select value={form.worker_type} onValueChange={v => set("worker_type", v)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{WORKER_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase())}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Availability</Label><Select value={form.availability_status} onValueChange={v => set("availability_status", v)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{AVAIL_STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase())}</SelectItem>)}</SelectContent></Select></div>
            <div className="col-span-2"><Label>Headline</Label><Input placeholder="e.g. Senior Electrician · Licensed NC Master Electrician" value={form.headline} onChange={e => set("headline", e.target.value)} className="mt-1" /></div>
            <div><Label>Primary Trade / Role</Label><Input value={form.primary_trade} onChange={e => set("primary_trade", e.target.value)} className="mt-1" /></div>
            <div><Label>Years Experience</Label><Input type="number" value={form.years_experience} onChange={e => set("years_experience", Number(e.target.value))} className="mt-1" /></div>
            <div><Label>Hourly Rate ($)</Label><Input type="number" value={form.hourly_rate} onChange={e => set("hourly_rate", Number(e.target.value))} className="mt-1" /></div>
            <div><Label>Day Rate ($)</Label><Input type="number" value={form.day_rate} onChange={e => set("day_rate", Number(e.target.value))} className="mt-1" /></div>
            <div><Label>Location</Label><Input value={form.location} onChange={e => set("location", e.target.value)} className="mt-1" /></div>
            <div><Label>State</Label><Input value={form.state} onChange={e => set("state", e.target.value)} className="mt-1" /></div>
            <div className="col-span-2"><Label>Bio</Label><Textarea rows={3} value={form.bio} onChange={e => set("bio", e.target.value)} className="mt-1" /></div>
            <div className="flex items-center gap-2"><input type="checkbox" checked={form.remote_ok} onChange={e => set("remote_ok", e.target.checked)} id="remote" /><Label htmlFor="remote">Remote OK</Label></div>
            <div className="flex items-center gap-2"><input type="checkbox" checked={form.travel_ok} onChange={e => set("travel_ok", e.target.checked)} id="travel" /><Label htmlFor="travel">Travel OK</Label></div>
            <div className="flex items-center gap-2"><input type="checkbox" checked={form.union_member} onChange={e => set("union_member", e.target.checked)} id="union" /><Label htmlFor="union">Union Member</Label></div>
          </div>
          <div className="flex justify-end gap-2 pt-3"><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={handleSave} disabled={saving || !form.full_name} className="bg-orange-600 hover:bg-orange-700 text-white">{saving ? "Saving…" : "Save"}</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}