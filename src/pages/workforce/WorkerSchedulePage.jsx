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
import { Calendar, Plus, Clock } from "lucide-react";

const TYPES = ["shift","appointment","job","block","vacation","training","meeting","unavailable"];
const STATUSES = ["scheduled","confirmed","in_progress","completed","cancelled","no_show"];
const STATUS_COLORS = { scheduled:"bg-blue-100 text-blue-700", confirmed:"bg-emerald-100 text-emerald-700", in_progress:"bg-violet-100 text-violet-700", completed:"bg-slate-100 text-slate-600", cancelled:"bg-red-100 text-red-700", no_show:"bg-orange-100 text-orange-700" };
const TYPE_ICONS = { shift:"🔄", appointment:"📅", job:"🔨", block:"🚫", vacation:"🏖", training:"📚", meeting:"🤝", unavailable:"❌" };

const BLANK = { title:"", worker_id:"", schedule_type:"shift", client_name:"", start_datetime:"", end_datetime:"", location:"", remote:false, hourly_rate:0, estimated_hours:0, status:"scheduled", notes:"" };

export default function WorkerSchedulePage() {
  const [entries, setEntries] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [filterWorker, setFilterWorker] = useState("all");

  useEffect(() => {
    Promise.all([
      base44.entities.WorkerSchedule.list("-start_datetime", 200),
      base44.entities.WorkerProfile.list("-created_date", 100),
    ]).then(([s, w]) => { setEntries(s); setWorkers(w); }).finally(() => setLoading(false));
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    const r = await base44.entities.WorkerSchedule.create(form);
    setEntries(prev => [r, ...prev]);
    setOpen(false);
    setSaving(false);
    setForm(BLANK);
  };

  const updateStatus = async (id, status) => {
    await base44.entities.WorkerSchedule.update(id, { status });
    setEntries(prev => prev.map(e => e.id === id ? { ...e, status } : e));
  };

  const filtered = filterWorker === "all" ? entries : entries.filter(e => e.worker_id === filterWorker);
  const workerName = (id) => workers.find(w => w.id === id)?.full_name || "—";

  const today = new Date().toISOString().slice(0, 10);
  const todayEntries = filtered.filter(e => e.start_datetime?.slice(0, 10) === today);
  const upcoming = filtered.filter(e => e.start_datetime?.slice(0, 10) > today).slice(0, 10);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><Calendar className="w-5 h-5 text-orange-600" /><h1 className="text-xl font-bold">Scheduling</h1><Badge variant="outline">{entries.length} entries</Badge></div>
        <Button onClick={() => { setForm(BLANK); setOpen(true); }} className="bg-orange-600 hover:bg-orange-700 text-white"><Plus className="w-4 h-4 mr-1" />Add Entry</Button>
      </div>

      <Select value={filterWorker} onValueChange={setFilterWorker}><SelectTrigger className="w-64"><SelectValue placeholder="Filter by worker" /></SelectTrigger><SelectContent><SelectItem value="all">All Workers</SelectItem>{workers.map(w => <SelectItem key={w.id} value={w.id}>{w.full_name}</SelectItem>)}</SelectContent></Select>

      {todayEntries.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-orange-600 mb-2">Today</h2>
          <div className="space-y-2">{todayEntries.map(e => (
            <Card key={e.id} className="p-3 border-orange-200 bg-orange-50 dark:bg-orange-950/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2"><span>{TYPE_ICONS[e.schedule_type]||"📅"}</span><div><p className="font-semibold text-sm">{e.title}</p><p className="text-xs text-muted-foreground">{workerName(e.worker_id)} · {e.start_datetime?.slice(11,16)} {e.end_datetime ? `→ ${e.end_datetime.slice(11,16)}` : ""} {e.location ? `· ${e.location}` : ""}</p></div></div>
                <div className="flex items-center gap-2"><Badge className={`text-[10px] ${STATUS_COLORS[e.status]||""}`}>{e.status}</Badge><Select value={e.status} onValueChange={v => updateStatus(e.id, v)}><SelectTrigger className="h-7 text-xs w-32"><SelectValue /></SelectTrigger><SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g," ")}</SelectItem>)}</SelectContent></Select></div>
              </div>
            </Card>
          ))}</div>
        </div>
      )}

      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-2">All Schedule Entries</h2>
        {loading ? <p className="text-muted-foreground text-sm">Loading…</p> : filtered.length === 0 ? <Card className="p-8 text-center border-dashed"><p className="text-muted-foreground">No entries yet.</p></Card> : (
          <div className="space-y-2">
            {filtered.map(e => (
              <Card key={e.id} className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2"><span>{TYPE_ICONS[e.schedule_type]||"📅"}</span><div><p className="font-semibold text-sm">{e.title}</p><p className="text-xs text-muted-foreground">{workerName(e.worker_id)} · {e.start_datetime?.slice(0,16)} {e.client_name ? `· ${e.client_name}` : ""} {e.estimated_hours > 0 ? `· ${e.estimated_hours}hr` : ""}</p></div></div>
                  <Badge className={`text-[10px] ${STATUS_COLORS[e.status]||""}`}>{e.status}</Badge>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Schedule Entry</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div><Label>Title *</Label><Input value={form.title} onChange={e => set("title", e.target.value)} className="mt-1" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Worker</Label><Select value={form.worker_id} onValueChange={v => set("worker_id", v)}><SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value={null}>None</SelectItem>{workers.map(w => <SelectItem key={w.id} value={w.id}>{w.full_name}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Type</Label><Select value={form.schedule_type} onValueChange={v => set("schedule_type", v)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Start</Label><Input type="datetime-local" value={form.start_datetime} onChange={e => set("start_datetime", e.target.value)} className="mt-1" /></div>
              <div><Label>End</Label><Input type="datetime-local" value={form.end_datetime} onChange={e => set("end_datetime", e.target.value)} className="mt-1" /></div>
              <div><Label>Client</Label><Input value={form.client_name} onChange={e => set("client_name", e.target.value)} className="mt-1" /></div>
              <div><Label>Hourly Rate</Label><Input type="number" value={form.hourly_rate} onChange={e => set("hourly_rate", Number(e.target.value))} className="mt-1" /></div>
              <div><Label>Est. Hours</Label><Input type="number" value={form.estimated_hours} onChange={e => set("estimated_hours", Number(e.target.value))} className="mt-1" /></div>
              <div><Label>Location</Label><Input value={form.location} onChange={e => set("location", e.target.value)} className="mt-1" /></div>
            </div>
            <Textarea rows={2} placeholder="Notes…" value={form.notes} onChange={e => set("notes", e.target.value)} />
            <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={handleSave} disabled={saving || !form.title} className="bg-orange-600 hover:bg-orange-700 text-white">{saving ? "Saving…" : "Save"}</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}