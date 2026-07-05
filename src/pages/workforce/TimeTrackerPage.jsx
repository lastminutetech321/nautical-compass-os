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
import { Clock, Plus, DollarSign, CheckCircle } from "lucide-react";

const STATUSES = ["draft","submitted","approved","rejected","invoiced","paid"];
const STATUS_COLORS = { draft:"bg-gray-100 text-gray-600", submitted:"bg-blue-100 text-blue-700", approved:"bg-emerald-100 text-emerald-700", rejected:"bg-red-100 text-red-700", invoiced:"bg-violet-100 text-violet-700", paid:"bg-slate-100 text-slate-600" };
const BLANK = { worker_id:"", client_name:"", project_name:"", date:"", start_time:"", end_time:"", hours:0, hourly_rate:0, amount:0, description:"", billable:true, status:"draft", notes:"" };

export default function TimeTrackerPage() {
  const [entries, setEntries] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [filterWorker, setFilterWorker] = useState("all");

  useEffect(() => {
    Promise.all([
      base44.entities.WorkerTimeEntry.list("-date", 300),
      base44.entities.WorkerProfile.list("-created_date", 100),
      base44.entities.WorkerContract.filter({ status: "active" }, "-created_date", 100),
    ]).then(([e, w, c]) => { setEntries(e); setWorkers(w); setContracts(c); }).finally(() => setLoading(false));
  }, []);

  const set = (k, v) => {
    setForm(f => {
      const updated = { ...f, [k]: v };
      if ((k === "hours" || k === "hourly_rate")) updated.amount = (updated.hours || 0) * (updated.hourly_rate || 0);
      return updated;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    const r = await base44.entities.WorkerTimeEntry.create(form);
    setEntries(prev => [r, ...prev]);
    setOpen(false);
    setSaving(false);
    setForm(BLANK);
  };

  const filtered = filterWorker === "all" ? entries : entries.filter(e => e.worker_id === filterWorker);
  const totalHours = filtered.reduce((s, e) => s + (e.hours || 0), 0);
  const totalAmount = filtered.filter(e => e.billable).reduce((s, e) => s + (e.amount || 0), 0);
  const unbilled = filtered.filter(e => e.billable && !e.invoiced).reduce((s, e) => s + (e.amount || 0), 0);
  const workerName = (id) => workers.find(w => w.id === id)?.full_name || "—";

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><Clock className="w-5 h-5 text-orange-600" /><h1 className="text-xl font-bold">Time Tracking</h1></div>
        <Button onClick={() => { setForm({ ...BLANK, date: new Date().toISOString().slice(0, 10) }); setOpen(true); }} className="bg-orange-600 hover:bg-orange-700 text-white"><Plus className="w-4 h-4 mr-1" />Log Time</Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Hours", value: `${totalHours.toFixed(1)}h`, icon: Clock, color: "text-blue-600" },
          { label: "Total Billable", value: `$${totalAmount.toLocaleString()}`, icon: DollarSign, color: "text-emerald-600" },
          { label: "Unbilled", value: `$${unbilled.toLocaleString()}`, icon: CheckCircle, color: "text-amber-600" },
        ].map(m => (
          <Card key={m.label} className="p-4 text-center">
            <m.icon className={`w-4 h-4 mx-auto mb-1 ${m.color}`} />
            <p className={`text-xl font-black ${m.color}`}>{loading ? "—" : m.value}</p>
            <p className="text-xs text-muted-foreground">{m.label}</p>
          </Card>
        ))}
      </div>

      <Select value={filterWorker} onValueChange={setFilterWorker}><SelectTrigger className="w-64"><SelectValue placeholder="Filter by worker" /></SelectTrigger><SelectContent><SelectItem value="all">All Workers</SelectItem>{workers.map(w => <SelectItem key={w.id} value={w.id}>{w.full_name}</SelectItem>)}</SelectContent></Select>

      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : filtered.length === 0 ? <Card className="p-8 text-center border-dashed"><p className="text-muted-foreground">No time entries yet.</p></Card> : (
        <div className="space-y-2">
          {filtered.map(e => (
            <Card key={e.id} className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">{e.description || `${e.client_name || "—"} — ${e.project_name || "General"}`}</p>
                  <p className="text-xs text-muted-foreground">{workerName(e.worker_id)} · {e.date} · {e.hours}hr {e.hourly_rate > 0 ? `@ $${e.hourly_rate}/hr` : ""}</p>
                </div>
                <div className="flex items-center gap-2">
                  {e.billable && <span className="text-sm font-bold text-emerald-600">${(e.amount || 0).toLocaleString()}</span>}
                  {!e.billable && <Badge variant="outline" className="text-[10px]">Non-billable</Badge>}
                  <Badge className={`text-[10px] ${STATUS_COLORS[e.status]||""}`}>{e.status}</Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Log Time</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div><Label>Worker</Label><Select value={form.worker_id} onValueChange={v => set("worker_id", v)}><SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value={null}>None</SelectItem>{workers.map(w => <SelectItem key={w.id} value={w.id}>{w.full_name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Date *</Label><Input type="date" value={form.date} onChange={e => set("date", e.target.value)} className="mt-1" /></div>
            <div><Label>Client</Label><Input value={form.client_name} onChange={e => set("client_name", e.target.value)} className="mt-1" /></div>
            <div><Label>Project</Label><Input value={form.project_name} onChange={e => set("project_name", e.target.value)} className="mt-1" /></div>
            <div><Label>Hours *</Label><Input type="number" step="0.25" value={form.hours} onChange={e => set("hours", Number(e.target.value))} className="mt-1" /></div>
            <div><Label>Hourly Rate ($)</Label><Input type="number" value={form.hourly_rate} onChange={e => set("hourly_rate", Number(e.target.value))} className="mt-1" /></div>
            <div><Label>Amount ($)</Label><Input type="number" value={form.amount} readOnly className="mt-1 bg-muted" /></div>
            <div><Label>Status</Label><Select value={form.status} onValueChange={v => set("status", v)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
            <div className="col-span-2"><Label>Description</Label><Textarea rows={2} value={form.description} onChange={e => set("description", e.target.value)} className="mt-1" /></div>
            <div className="flex items-center gap-2"><input type="checkbox" checked={form.billable} onChange={e => set("billable", e.target.checked)} id="bill" /><Label htmlFor="bill">Billable</Label></div>
          </div>
          <div className="flex justify-end gap-2 pt-3"><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={handleSave} disabled={saving || !form.date || !form.hours} className="bg-orange-600 hover:bg-orange-700 text-white">{saving ? "Saving…" : "Save"}</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}