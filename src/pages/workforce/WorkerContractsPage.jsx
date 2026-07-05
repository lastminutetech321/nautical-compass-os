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
import { FileText, Plus, DollarSign, AlertTriangle } from "lucide-react";

const CONTRACT_TYPES = ["service_agreement","employment","gig","retainer","project","nda","subcontract","union","vendor","other"];
const STATUSES = ["draft","sent","negotiating","signed","active","completed","terminated","expired"];
const RATE_TYPES = ["hourly","daily","project","retainer","salary","commission","mixed"];
const STATUS_COLORS = { draft:"bg-gray-100 text-gray-600", sent:"bg-blue-100 text-blue-700", negotiating:"bg-amber-100 text-amber-700", signed:"bg-violet-100 text-violet-700", active:"bg-emerald-100 text-emerald-700", completed:"bg-slate-100 text-slate-600", terminated:"bg-red-100 text-red-700", expired:"bg-orange-100 text-orange-700" };

const BLANK = { title:"", worker_id:"", client_name:"", contract_type:"service_agreement", status:"draft", start_date:"", end_date:"", rate_type:"hourly", rate_amount:0, total_value:0, hours_per_week:0, scope_of_work:"", payment_terms:"Net 30", non_compete:false, nda_included:false, auto_renew:false, notes:"" };

export default function WorkerContractsPage() {
  const [contracts, setContracts] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(BLANK);

  useEffect(() => {
    Promise.all([
      base44.entities.WorkerContract.list("-created_date", 200),
      base44.entities.WorkerProfile.list("-created_date", 100),
    ]).then(([c, w]) => { setContracts(c); setWorkers(w); }).finally(() => setLoading(false));
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    const r = await base44.entities.WorkerContract.create(form);
    setContracts(prev => [r, ...prev]);
    setOpen(false);
    setSaving(false);
    setForm(BLANK);
  };

  const today = new Date().toISOString().slice(0, 10);
  const expiringIn30 = contracts.filter(c => c.end_date && c.end_date > today && c.end_date <= new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10) && ["active","signed"].includes(c.status));
  const workerName = (id) => workers.find(w => w.id === id)?.full_name || "—";

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><FileText className="w-5 h-5 text-orange-600" /><h1 className="text-xl font-bold">Contracts</h1><Badge variant="outline">{contracts.length}</Badge></div>
        <Button onClick={() => { setForm(BLANK); setOpen(true); }} className="bg-orange-600 hover:bg-orange-700 text-white"><Plus className="w-4 h-4 mr-1" />New Contract</Button>
      </div>

      {expiringIn30.length > 0 && <Card className="p-3 bg-amber-50 border-amber-200 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-600" /><span className="text-sm text-amber-700">{expiringIn30.length} contract(s) expiring within 30 days</span></Card>}

      {loading ? <p className="text-muted-foreground text-sm">Loading…</p> : contracts.length === 0 ? <Card className="p-10 text-center border-dashed"><p className="text-muted-foreground">No contracts yet.</p><Button className="mt-3 bg-orange-600 hover:bg-orange-700 text-white" onClick={() => { setForm(BLANK); setOpen(true); }}>Create First Contract</Button></Card> : (
        <div className="space-y-3">
          {contracts.map(c => (
            <Card key={c.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-bold text-sm">{c.title}</p>
                  <p className="text-xs text-muted-foreground">{c.contract_type?.replace(/_/g," ")} · Client: {c.client_name || "—"} · Worker: {workerName(c.worker_id)}</p>
                  <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                    {c.rate_amount > 0 && <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />${c.rate_amount}/{c.rate_type}</span>}
                    {c.start_date && <span>Start: {c.start_date}</span>}
                    {c.end_date && <span className={c.end_date < today ? "text-red-600 font-semibold" : ""}>End: {c.end_date}</span>}
                    {c.total_value > 0 && <span>Value: ${c.total_value.toLocaleString()}</span>}
                  </div>
                  <div className="flex gap-1 mt-1.5">
                    {c.nda_included && <Badge variant="outline" className="text-[9px]">NDA</Badge>}
                    {c.non_compete && <Badge variant="outline" className="text-[9px]">Non-Compete</Badge>}
                    {c.auto_renew && <Badge variant="outline" className="text-[9px]">Auto-Renew</Badge>}
                  </div>
                </div>
                <Badge className={`text-[10px] shrink-0 ${STATUS_COLORS[c.status]||""}`}>{c.status}</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Contract</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="col-span-2"><Label>Contract Title *</Label><Input value={form.title} onChange={e => set("title", e.target.value)} className="mt-1" /></div>
            <div><Label>Worker</Label><Select value={form.worker_id} onValueChange={v => set("worker_id", v)}><SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value={null}>None</SelectItem>{workers.map(w => <SelectItem key={w.id} value={w.id}>{w.full_name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Client Name</Label><Input value={form.client_name} onChange={e => set("client_name", e.target.value)} className="mt-1" /></div>
            <div><Label>Contract Type</Label><Select value={form.contract_type} onValueChange={v => set("contract_type", v)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{CONTRACT_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g," ")}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Status</Label><Select value={form.status} onValueChange={v => set("status", v)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Start Date</Label><Input type="date" value={form.start_date} onChange={e => set("start_date", e.target.value)} className="mt-1" /></div>
            <div><Label>End Date</Label><Input type="date" value={form.end_date} onChange={e => set("end_date", e.target.value)} className="mt-1" /></div>
            <div><Label>Rate Type</Label><Select value={form.rate_type} onValueChange={v => set("rate_type", v)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{RATE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Rate Amount ($)</Label><Input type="number" value={form.rate_amount} onChange={e => set("rate_amount", Number(e.target.value))} className="mt-1" /></div>
            <div><Label>Total Value ($)</Label><Input type="number" value={form.total_value} onChange={e => set("total_value", Number(e.target.value))} className="mt-1" /></div>
            <div><Label>Hrs/Week</Label><Input type="number" value={form.hours_per_week} onChange={e => set("hours_per_week", Number(e.target.value))} className="mt-1" /></div>
            <div><Label>Payment Terms</Label><Input value={form.payment_terms} onChange={e => set("payment_terms", e.target.value)} className="mt-1" /></div>
            <div className="col-span-2"><Label>Scope of Work</Label><Textarea rows={3} value={form.scope_of_work} onChange={e => set("scope_of_work", e.target.value)} className="mt-1" /></div>
            <div className="flex items-center gap-2"><input type="checkbox" checked={form.nda_included} onChange={e => set("nda_included", e.target.checked)} id="nda" /><Label htmlFor="nda">NDA Included</Label></div>
            <div className="flex items-center gap-2"><input type="checkbox" checked={form.non_compete} onChange={e => set("non_compete", e.target.checked)} id="nc" /><Label htmlFor="nc">Non-Compete</Label></div>
            <div className="flex items-center gap-2"><input type="checkbox" checked={form.auto_renew} onChange={e => set("auto_renew", e.target.checked)} id="ar" /><Label htmlFor="ar">Auto-Renew</Label></div>
          </div>
          <div className="flex justify-end gap-2 pt-3"><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={handleSave} disabled={saving || !form.title} className="bg-orange-600 hover:bg-orange-700 text-white">{saving ? "Saving…" : "Save Contract"}</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}