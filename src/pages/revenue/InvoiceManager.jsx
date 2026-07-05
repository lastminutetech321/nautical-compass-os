import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { FileText, Plus, Edit, Trash2, CheckCircle, Loader2, RefreshCw, Search, DollarSign, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import moment from "moment";

const STATUS_STYLES = {
  draft: "bg-gray-50 text-gray-600 border-gray-200",
  open: "bg-amber-50 text-amber-700 border-amber-200",
  paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  void: "bg-gray-50 text-gray-400 border-gray-200",
  uncollectible: "bg-red-50 text-red-700 border-red-200",
  in_collections: "bg-red-100 text-red-800 border-red-300",
  disputed: "bg-purple-50 text-purple-700 border-purple-200",
};

const BLANK = {
  customer_name: "", customer_email: "", organization_id: "", invoice_number: "",
  status: "draft", payment_provider: "manual_invoice", amount_due: 0, amount_paid: 0,
  currency: "USD", due_date: moment().add(30, "days").format("YYYY-MM-DD"),
  line_items: [], tax_amount: 0, discount_amount: 0, coupon_code: "", notes: ""
};

let invoiceCounter = 1000;

export default function InvoiceManager() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [lineItem, setLineItem] = useState({ description: "", quantity: 1, unit_price: 0 });
  const [saving, setSaving] = useState(false);

  const load = async () => { setLoading(true); const d = await base44.entities.Invoice.list("-created_date", 300).catch(() => []); setInvoices(d); invoiceCounter = 1000 + d.length; setLoading(false); };
  useEffect(() => { load(); }, []);

  const openNew = () => { setForm({ ...BLANK, invoice_number: `INV-${++invoiceCounter}`, line_items: [] }); setEditing(null); setOpen(true); };
  const openEdit = (i) => { setForm({ ...i, line_items: i.line_items || [] }); setEditing(i.id); setOpen(true); };

  const addLineItem = () => {
    if (!lineItem.description) return;
    const li = { ...lineItem, quantity: Number(lineItem.quantity), unit_price: Number(lineItem.unit_price), total: Number(lineItem.quantity) * Number(lineItem.unit_price) };
    const newItems = [...(form.line_items || []), li];
    const subtotal = newItems.reduce((t, i) => t + i.total, 0);
    setForm(f => ({ ...f, line_items: newItems, amount_due: subtotal + Number(f.tax_amount) - Number(f.discount_amount) }));
    setLineItem({ description: "", quantity: 1, unit_price: 0 });
  };

  const removeLineItem = (i) => {
    const newItems = form.line_items.filter((_, idx) => idx !== i);
    const subtotal = newItems.reduce((t, li) => t + li.total, 0);
    setForm(f => ({ ...f, line_items: newItems, amount_due: subtotal + Number(f.tax_amount) - Number(f.discount_amount) }));
  };

  const markPaid = async (inv) => {
    await base44.entities.Invoice.update(inv.id, { status: "paid", amount_paid: inv.amount_due, amount_remaining: 0, paid_at: new Date().toISOString() });
    await base44.entities.RevenueEvent.create({ event_type: "manual_payment", customer_name: inv.customer_name, invoice_id: inv.id, amount: inv.amount_due, payment_provider: inv.payment_provider, event_date: new Date().toISOString() });
    load();
  };

  const save = async () => {
    setSaving(true);
    const payload = { ...form, amount_due: Number(form.amount_due), amount_paid: Number(form.amount_paid), tax_amount: Number(form.tax_amount), discount_amount: Number(form.discount_amount), amount_remaining: Math.max(0, Number(form.amount_due) - Number(form.amount_paid)) };
    if (editing) await base44.entities.Invoice.update(editing, payload);
    else await base44.entities.Invoice.create(payload);
    setSaving(false); setOpen(false); load();
  };

  const filtered = invoices.filter(i => {
    const matchStatus = statusFilter === "all" || i.status === statusFilter;
    const matchSearch = !search || (i.customer_name || "").toLowerCase().includes(search.toLowerCase()) || (i.invoice_number || "").toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const openTotal = invoices.filter(i => i.status === "open").reduce((t, i) => t + (i.amount_due || 0), 0);
  const paidTotal = invoices.filter(i => i.status === "paid").reduce((t, i) => t + (i.amount_paid || 0), 0);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">Revenue OS · Invoices</p>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><FileText className="w-6 h-6 text-indigo-500" />Invoice Manager</h1>
          <p className="text-sm text-muted-foreground">Manual invoices · bank transfer · net terms · multi-provider billing</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={load}><RefreshCw className="w-4 h-4 mr-1.5" />Refresh</Button>
          <Button size="sm" onClick={openNew}><Plus className="w-4 h-4 mr-1.5" />New Invoice</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Open Invoices", value: invoices.filter(i => i.status === "open").length, sub: `$${openTotal.toLocaleString()} outstanding`, color: "text-amber-600" },
          { label: "Paid", value: invoices.filter(i => i.status === "paid").length, sub: `$${paidTotal.toLocaleString()} collected`, color: "text-emerald-600" },
          { label: "In Collections", value: invoices.filter(i => i.status === "in_collections").length, sub: "Escalated", color: "text-red-600" },
          { label: "Total Invoiced", value: invoices.length, sub: "All time", color: "text-blue-600" },
        ].map(k => (
          <Card key={k.label} className="p-3 text-center border border-border/60">
            <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
            <p className="text-xs font-medium">{k.label}</p>
            <p className="text-[10px] text-muted-foreground">{k.sub}</p>
          </Card>
        ))}
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1 min-w-48"><Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" /><Input className="pl-8 h-9" placeholder="Search customer, invoice #..." value={search} onChange={e => setSearch(e.target.value)} /></div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 h-9"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All</SelectItem>{["draft","open","paid","void","uncollectible","in_collections","disputed"].map(s => <SelectItem key={s} value={s} className="capitalize">{s.replace("_"," ")}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <Card className="border border-border/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border/40">
              <tr>{["Invoice #","Customer","Amount","Status","Provider","Due Date","Actions"].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">{h}</th>)}</tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-sm text-muted-foreground">No invoices found</td></tr>
              ) : filtered.map(inv => (
                <tr key={inv.id} className="border-b border-border/30 hover:bg-muted/20">
                  <td className="px-4 py-3 text-xs font-mono font-medium">{inv.invoice_number || "—"}</td>
                  <td className="px-4 py-3"><p className="text-xs font-medium">{inv.customer_name || "—"}</p><p className="text-[10px] text-muted-foreground">{inv.customer_email}</p></td>
                  <td className="px-4 py-3 text-xs font-bold">${(inv.amount_due || 0).toLocaleString()}<p className="text-[10px] text-muted-foreground font-normal">{inv.currency}</p></td>
                  <td className="px-4 py-3"><span className={`inline-block px-2 py-0.5 rounded-full text-[10px] border font-medium ${STATUS_STYLES[inv.status] || ""}`}>{inv.status?.replace("_"," ")}</span></td>
                  <td className="px-4 py-3 text-[10px] text-muted-foreground capitalize">{(inv.payment_provider || "—").replace("_"," ")}</td>
                  <td className="px-4 py-3 text-xs">{inv.due_date ? moment(inv.due_date).format("MMM D, YYYY") : "—"}{inv.due_date && moment(inv.due_date).isBefore(moment()) && inv.status === "open" && <p className="text-[10px] text-red-600 font-medium">{moment(inv.due_date).fromNow()} overdue</p>}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {inv.status === "open" && <Button size="sm" variant="outline" className="h-7 text-[10px] text-emerald-600 border-emerald-300" onClick={() => markPaid(inv)}><CheckCircle className="w-3 h-3 mr-0.5" />Paid</Button>}
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(inv)}><Edit className="w-3 h-3" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Invoice" : "New Invoice"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-semibold block mb-1">Invoice #</label><Input value={form.invoice_number} onChange={e => setForm({ ...form, invoice_number: e.target.value })} /></div>
              <div><label className="text-xs font-semibold block mb-1">Status</label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["draft","open","paid","void","uncollectible","in_collections","disputed"].map(s => <SelectItem key={s} value={s}>{s.replace("_"," ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-semibold block mb-1">Customer Name</label><Input value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })} /></div>
              <div><label className="text-xs font-semibold block mb-1">Customer Email</label><Input value={form.customer_email} onChange={e => setForm({ ...form, customer_email: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-semibold block mb-1">Payment Provider</label>
                <Select value={form.payment_provider} onValueChange={v => setForm({ ...form, payment_provider: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["stripe","square","paypal","authorizenet","manual_invoice","bank_transfer","custom"].map(p => <SelectItem key={p} value={p}>{p.replace(/_/g," ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><label className="text-xs font-semibold block mb-1">Due Date</label><Input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} /></div>
            </div>

            {/* Line items */}
            <div>
              <label className="text-xs font-semibold block mb-2">Line Items</label>
              <div className="flex gap-2 mb-2">
                <Input className="flex-1 h-8 text-xs" placeholder="Description" value={lineItem.description} onChange={e => setLineItem({ ...lineItem, description: e.target.value })} />
                <Input className="w-16 h-8 text-xs" type="number" min="1" placeholder="Qty" value={lineItem.quantity} onChange={e => setLineItem({ ...lineItem, quantity: e.target.value })} />
                <Input className="w-24 h-8 text-xs" type="number" min="0" placeholder="Price" value={lineItem.unit_price} onChange={e => setLineItem({ ...lineItem, unit_price: e.target.value })} />
                <Button size="sm" variant="outline" className="h-8" onClick={addLineItem}><Plus className="w-3.5 h-3.5" /></Button>
              </div>
              {(form.line_items || []).map((li, i) => (
                <div key={i} className="flex items-center gap-2 text-xs p-2 bg-muted rounded mb-1">
                  <span className="flex-1">{li.description}</span>
                  <span className="text-muted-foreground">{li.quantity} × ${li.unit_price}</span>
                  <span className="font-medium">${li.total}</span>
                  <button onClick={() => removeLineItem(i)} className="text-red-400">×</button>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div><label className="text-xs font-semibold block mb-1">Amount Due ($)</label><Input type="number" min="0" value={form.amount_due} onChange={e => setForm({ ...form, amount_due: e.target.value })} /></div>
              <div><label className="text-xs font-semibold block mb-1">Tax ($)</label><Input type="number" min="0" value={form.tax_amount} onChange={e => setForm({ ...form, tax_amount: e.target.value })} /></div>
              <div><label className="text-xs font-semibold block mb-1">Discount ($)</label><Input type="number" min="0" value={form.discount_amount} onChange={e => setForm({ ...form, discount_amount: e.target.value })} /></div>
            </div>
            <div><label className="text-xs font-semibold block mb-1">Notes</label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Invoice"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}