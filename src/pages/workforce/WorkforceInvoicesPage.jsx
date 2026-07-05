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
import { Receipt, Plus, DollarSign, AlertTriangle } from "lucide-react";

const STATUSES = ["draft","sent","viewed","partial","paid","overdue","void","disputed"];
const STATUS_COLORS = { draft:"bg-gray-100 text-gray-600", sent:"bg-blue-100 text-blue-700", viewed:"bg-violet-100 text-violet-700", partial:"bg-amber-100 text-amber-700", paid:"bg-emerald-100 text-emerald-700", overdue:"bg-red-100 text-red-700", void:"bg-slate-100 text-slate-500", disputed:"bg-orange-100 text-orange-700" };

const BLANK = { client_name:"", client_email:"", invoice_number:"", status:"draft", issue_date: new Date().toISOString().slice(0,10), due_date:"", line_items:[{description:"Services Rendered", quantity:1, rate:0, amount:0}], subtotal:0, tax_rate:0, tax_amount:0, discount_amount:0, total:0, balance_due:0, currency:"USD", notes:"" };

export default function WorkforceInvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(BLANK);

  useEffect(() => {
    base44.entities.WorkforceInvoice.list("-created_date", 200).then(setInvoices).finally(() => setLoading(false));
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setLine = (i, k, v) => setForm(f => {
    const items = [...f.line_items];
    items[i] = { ...items[i], [k]: v };
    if (k === "quantity" || k === "rate") items[i].amount = (items[i].quantity || 0) * (items[i].rate || 0);
    const subtotal = items.reduce((s, l) => s + (l.amount || 0), 0);
    const tax_amount = subtotal * ((f.tax_rate || 0) / 100);
    const total = subtotal + tax_amount - (f.discount_amount || 0);
    return { ...f, line_items: items, subtotal, tax_amount, total, balance_due: total };
  });

  const addLine = () => setForm(f => ({ ...f, line_items: [...f.line_items, { description:"", quantity:1, rate:0, amount:0 }] }));
  const removeLine = (i) => setForm(f => { const items = f.line_items.filter((_,j)=>j!==i); return { ...f, line_items: items }; });

  const handleSave = async () => {
    setSaving(true);
    const r = await base44.entities.WorkforceInvoice.create(form);
    setInvoices(prev => [r, ...prev]);
    setOpen(false);
    setSaving(false);
    setForm(BLANK);
  };

  const today = new Date().toISOString().slice(0,10);
  const totalPaid = invoices.filter(i => i.status === "paid").reduce((s, i) => s + (i.total || 0), 0);
  const totalOutstanding = invoices.filter(i => ["sent","viewed","partial"].includes(i.status)).reduce((s, i) => s + (i.balance_due || i.total || 0), 0);
  const overdue = invoices.filter(i => i.due_date && i.due_date < today && ["sent","viewed","partial"].includes(i.status));

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><Receipt className="w-5 h-5 text-orange-600" /><h1 className="text-xl font-bold">Invoices</h1><Badge variant="outline">{invoices.length}</Badge></div>
        <Button onClick={() => { setForm(BLANK); setOpen(true); }} className="bg-orange-600 hover:bg-orange-700 text-white"><Plus className="w-4 h-4 mr-1" />New Invoice</Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 text-center bg-emerald-50 dark:bg-emerald-950/20 border-0"><p className="text-xl font-black text-emerald-600">${totalPaid.toLocaleString()}</p><p className="text-xs text-muted-foreground">Total Collected</p></Card>
        <Card className="p-4 text-center bg-amber-50 dark:bg-amber-950/20 border-0"><p className="text-xl font-black text-amber-600">${totalOutstanding.toLocaleString()}</p><p className="text-xs text-muted-foreground">Outstanding</p></Card>
        <Card className="p-4 text-center bg-red-50 dark:bg-red-950/20 border-0"><p className="text-xl font-black text-red-600">{overdue.length}</p><p className="text-xs text-muted-foreground">Overdue</p></Card>
      </div>

      {overdue.length > 0 && <Card className="p-3 bg-red-50 border-red-200 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-red-600" /><span className="text-sm text-red-700">{overdue.length} invoice(s) past due — ${overdue.reduce((s,i) => s+(i.balance_due||i.total||0),0).toLocaleString()} outstanding</span></Card>}

      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : invoices.length === 0 ? <Card className="p-10 text-center border-dashed"><p className="text-muted-foreground">No invoices yet.</p></Card> : (
        <div className="space-y-2">
          {invoices.map(inv => (
            <Card key={inv.id} className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold text-sm">{inv.invoice_number || `INV-${inv.id.slice(-6).toUpperCase()}`} · {inv.client_name}</p>
                  <p className="text-xs text-muted-foreground">Issue: {inv.issue_date} {inv.due_date ? `· Due: ${inv.due_date}` : ""} {inv.client_email ? `· ${inv.client_email}` : ""}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-sm">${(inv.total || 0).toLocaleString()}</span>
                  <Badge className={`text-[10px] ${STATUS_COLORS[inv.status]||""}`}>{inv.status}</Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Invoice</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Client Name *</Label><Input value={form.client_name} onChange={e => set("client_name", e.target.value)} className="mt-1" /></div>
              <div><Label>Client Email</Label><Input value={form.client_email} onChange={e => set("client_email", e.target.value)} className="mt-1" /></div>
              <div><Label>Invoice #</Label><Input placeholder="INV-001" value={form.invoice_number} onChange={e => set("invoice_number", e.target.value)} className="mt-1" /></div>
              <div><Label>Status</Label><Select value={form.status} onValueChange={v => set("status", v)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Issue Date</Label><Input type="date" value={form.issue_date} onChange={e => set("issue_date", e.target.value)} className="mt-1" /></div>
              <div><Label>Due Date</Label><Input type="date" value={form.due_date} onChange={e => set("due_date", e.target.value)} className="mt-1" /></div>
            </div>

            <div>
              <Label className="mb-2 block">Line Items</Label>
              <div className="space-y-2">
                {form.line_items.map((line, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center">
                    <Input className="col-span-5" placeholder="Description" value={line.description} onChange={e => setLine(i, "description", e.target.value)} />
                    <Input className="col-span-2" type="number" placeholder="Qty" value={line.quantity} onChange={e => setLine(i, "quantity", Number(e.target.value))} />
                    <Input className="col-span-2" type="number" placeholder="Rate" value={line.rate} onChange={e => setLine(i, "rate", Number(e.target.value))} />
                    <div className="col-span-2 text-sm font-semibold text-right">${(line.amount || 0).toLocaleString()}</div>
                    <Button size="sm" variant="ghost" className="col-span-1 text-muted-foreground" onClick={() => removeLine(i)}>✕</Button>
                  </div>
                ))}
              </div>
              <Button size="sm" variant="outline" className="mt-2" onClick={addLine}>+ Add Line</Button>
            </div>

            <div className="grid grid-cols-2 gap-3 border-t pt-3">
              <div><Label>Tax Rate (%)</Label><Input type="number" value={form.tax_rate} onChange={e => set("tax_rate", Number(e.target.value))} className="mt-1" /></div>
              <div><Label>Discount ($)</Label><Input type="number" value={form.discount_amount} onChange={e => set("discount_amount", Number(e.target.value))} className="mt-1" /></div>
              <div className="col-span-2 text-right space-y-1 text-sm">
                <p>Subtotal: <strong>${(form.subtotal || 0).toFixed(2)}</strong></p>
                <p>Tax: <strong>${(form.tax_amount || 0).toFixed(2)}</strong></p>
                <p className="text-base font-black">Total: ${(form.total || 0).toFixed(2)}</p>
              </div>
            </div>
            <Textarea rows={2} placeholder="Notes / payment instructions…" value={form.notes} onChange={e => set("notes", e.target.value)} />
            <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={handleSave} disabled={saving || !form.client_name} className="bg-orange-600 hover:bg-orange-700 text-white">{saving ? "Saving…" : "Create Invoice"}</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}