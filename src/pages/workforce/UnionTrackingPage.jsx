import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Shield, Plus, AlertTriangle, CheckCircle } from "lucide-react";

const STATUSES = ["active","inactive","suspended","expelled","retired"];
const STATUS_COLORS = { active:"bg-emerald-100 text-emerald-700", inactive:"bg-gray-100 text-gray-500", suspended:"bg-amber-100 text-amber-700", expelled:"bg-red-100 text-red-700", retired:"bg-slate-100 text-slate-600" };
const BLANK = { worker_id:"", worker_name:"", union_name:"", local_number:"", membership_number:"", trade:"", classification:"", join_date:"", expiry_date:"", dues_current:false, dues_amount:0, dues_frequency:"monthly", status:"active", shop_steward:"", notes:"" };

export default function UnionTrackingPage() {
  const [records, setRecords] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(BLANK);

  useEffect(() => {
    Promise.all([
      base44.entities.UnionRecord.list("-created_date", 200),
      base44.entities.WorkerProfile.list("-created_date", 100),
    ]).then(([r, w]) => { setRecords(r); setWorkers(w); }).finally(() => setLoading(false));
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    const r = await base44.entities.UnionRecord.create(form);
    setRecords(prev => [r, ...prev]);
    setOpen(false);
    setSaving(false);
    setForm(BLANK);
  };

  const duesOverdue = records.filter(r => r.status === "active" && !r.dues_current);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><Shield className="w-5 h-5 text-orange-600" /><h1 className="text-xl font-bold">Union Tracking</h1><Badge variant="outline">{records.length}</Badge></div>
        <Button onClick={() => { setForm(BLANK); setOpen(true); }} className="bg-orange-600 hover:bg-orange-700 text-white"><Plus className="w-4 h-4 mr-1" />Add Record</Button>
      </div>

      {duesOverdue.length > 0 && <Card className="p-3 bg-amber-50 border-amber-200 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-600" /><span className="text-sm text-amber-700">{duesOverdue.length} member(s) with overdue dues</span></Card>}

      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : records.length === 0 ? <Card className="p-8 text-center border-dashed"><p className="text-muted-foreground">No union records yet.</p></Card> : (
        <div className="space-y-3">
          {records.map(r => (
            <Card key={r.id} className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold text-sm">{r.union_name} {r.local_number ? `Local ${r.local_number}` : ""}</p>
                  <p className="text-xs text-muted-foreground">{r.worker_name || workers.find(w => w.id === r.worker_id)?.full_name || "—"} · {r.trade || "—"} {r.classification ? `· ${r.classification}` : ""}</p>
                  <p className="text-xs text-muted-foreground">Member #: {r.membership_number || "—"} · Joined: {r.join_date || "—"}</p>
                  <div className="flex gap-2 mt-1.5">
                    <Badge variant="outline" className="text-[9px]">Dues: {r.dues_frequency}</Badge>
                    {r.dues_current ? <Badge className="bg-emerald-100 text-emerald-700 text-[9px]"><CheckCircle className="w-2.5 h-2.5 mr-0.5" />Dues Current</Badge> : <Badge className="bg-red-100 text-red-700 text-[9px]"><AlertTriangle className="w-2.5 h-2.5 mr-0.5" />Dues Overdue</Badge>}
                    {r.shop_steward && <Badge variant="outline" className="text-[9px]">Steward: {r.shop_steward}</Badge>}
                  </div>
                </div>
                <Badge className={`text-[10px] shrink-0 ${STATUS_COLORS[r.status]||""}`}>{r.status}</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Union Record</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div><Label>Worker</Label><Select value={form.worker_id} onValueChange={v => { const w = workers.find(x => x.id === v); set("worker_id", v); if(w) set("worker_name", w.full_name); }}><SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value={null}>None</SelectItem>{workers.map(w => <SelectItem key={w.id} value={w.id}>{w.full_name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Union Name *</Label><Input value={form.union_name} onChange={e => set("union_name", e.target.value)} className="mt-1" /></div>
            <div><Label>Local #</Label><Input value={form.local_number} onChange={e => set("local_number", e.target.value)} className="mt-1" /></div>
            <div><Label>Membership #</Label><Input value={form.membership_number} onChange={e => set("membership_number", e.target.value)} className="mt-1" /></div>
            <div><Label>Trade</Label><Input value={form.trade} onChange={e => set("trade", e.target.value)} className="mt-1" /></div>
            <div><Label>Classification</Label><Input value={form.classification} onChange={e => set("classification", e.target.value)} className="mt-1" /></div>
            <div><Label>Join Date</Label><Input type="date" value={form.join_date} onChange={e => set("join_date", e.target.value)} className="mt-1" /></div>
            <div><Label>Expiry Date</Label><Input type="date" value={form.expiry_date} onChange={e => set("expiry_date", e.target.value)} className="mt-1" /></div>
            <div><Label>Dues Amount ($)</Label><Input type="number" value={form.dues_amount} onChange={e => set("dues_amount", Number(e.target.value))} className="mt-1" /></div>
            <div><Label>Dues Frequency</Label><Select value={form.dues_frequency} onValueChange={v => set("dues_frequency", v)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="monthly">Monthly</SelectItem><SelectItem value="quarterly">Quarterly</SelectItem><SelectItem value="annual">Annual</SelectItem></SelectContent></Select></div>
            <div><Label>Shop Steward</Label><Input value={form.shop_steward} onChange={e => set("shop_steward", e.target.value)} className="mt-1" /></div>
            <div><Label>Status</Label><Select value={form.status} onValueChange={v => set("status", v)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
            <div className="flex items-center gap-2"><input type="checkbox" checked={form.dues_current} onChange={e => set("dues_current", e.target.checked)} id="dc" /><Label htmlFor="dc">Dues Current</Label></div>
          </div>
          <div className="flex justify-end gap-2 pt-2"><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={handleSave} disabled={saving || !form.union_name} className="bg-orange-600 hover:bg-orange-700 text-white">{saving ? "Saving…" : "Save"}</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}