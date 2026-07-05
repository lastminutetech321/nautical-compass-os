import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { AlertTriangle, Plus, Edit, CheckCircle, RefreshCw, Loader2, Phone, Mail, DollarSign, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import moment from "moment";

const STATUS_STYLES = {
  new: "bg-red-50 text-red-700 border-red-200",
  contacted: "bg-amber-50 text-amber-700 border-amber-200",
  negotiating: "bg-blue-50 text-blue-700 border-blue-200",
  payment_plan: "bg-purple-50 text-purple-700 border-purple-200",
  escalated: "bg-red-100 text-red-800 border-red-300",
  resolved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  written_off: "bg-gray-50 text-gray-500 border-gray-200",
};

const BLANK = { customer_name: "", customer_email: "", amount_owed: 0, original_due_date: "", days_overdue: 0, priority: "medium", status: "new", payment_provider: "", retry_count: 0, contact_attempts: 0, assigned_to: "", notes: "" };

export default function CollectionsQueuePage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [selected, setSelected] = useState(null);

  const load = async () => { setLoading(true); const d = await base44.entities.CollectionsQueue.list("-created_date").catch(() => []); setItems(d); setLoading(false); };
  useEffect(() => { load(); }, []);

  const openNew = () => { setForm(BLANK); setEditing(null); setOpen(true); };
  const openEdit = (i) => { setForm({ ...i }); setEditing(i.id); setOpen(true); };

  const save = async () => {
    setSaving(true);
    if (editing) await base44.entities.CollectionsQueue.update(editing, form);
    else await base44.entities.CollectionsQueue.create(form);
    setSaving(false); setOpen(false); load();
  };

  const addNote = async (item) => {
    if (!noteText.trim()) return;
    const notes = [...(item.contact_notes || []), { text: noteText, timestamp: new Date().toISOString(), contact_attempts: (item.contact_attempts || 0) + 1 }];
    await base44.entities.CollectionsQueue.update(item.id, { contact_notes: notes, contact_attempts: (item.contact_attempts || 0) + 1, last_contacted_at: new Date().toISOString() });
    setNoteText(""); load();
  };

  const resolve = async (item) => {
    await base44.entities.CollectionsQueue.update(item.id, { status: "resolved", resolved_at: new Date().toISOString(), resolved_amount: item.amount_owed });
    await base44.entities.RevenueEvent.create({ event_type: "recovery", customer_name: item.customer_name, amount: item.amount_owed, mrr_impact: 0, event_date: new Date().toISOString(), recovery_source: "collections_queue" });
    load();
  };

  const totalOwed = items.filter(i => !["resolved","written_off"].includes(i.status)).reduce((s, i) => s + (i.amount_owed || 0), 0);
  const critical = items.filter(i => i.priority === "critical" && !["resolved","written_off"].includes(i.status));

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">Revenue OS · Collections</p>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><AlertTriangle className="w-6 h-6 text-red-500" />Collections Queue</h1>
          <p className="text-sm text-muted-foreground">Failed payment recovery · overdue accounts · retry engine · payment plans</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={load}><RefreshCw className="w-4 h-4 mr-1.5" />Refresh</Button>
          <Button size="sm" onClick={openNew}><Plus className="w-4 h-4 mr-1.5" />Add to Queue</Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Owed", value: `$${totalOwed.toLocaleString()}`, color: "text-red-600" },
          { label: "In Queue", value: items.filter(i => !["resolved","written_off"].includes(i.status)).length, color: "text-amber-600" },
          { label: "Critical", value: critical.length, color: critical.length > 0 ? "text-red-700 font-bold" : "text-gray-400" },
          { label: "Resolved", value: items.filter(i => i.status === "resolved").length, color: "text-emerald-600" },
        ].map(k => (
          <Card key={k.label} className="p-3 text-center border border-border/60">
            <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
            <p className="text-xs text-muted-foreground">{k.label}</p>
          </Card>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <CheckCircle className="w-12 h-12 mx-auto mb-3 text-emerald-400 opacity-60" />
          <p className="text-sm text-muted-foreground">Collections queue is empty — no outstanding recovery needed.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <Card key={item.id} className={`border p-4 ${item.priority === "critical" ? "border-red-300 bg-red-50/30" : "border-border/60"}`}>
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-sm">{item.customer_name}</p>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] border font-medium ${STATUS_STYLES[item.status] || ""}`}>{item.status?.replace("_"," ")}</span>
                    <Badge variant={item.priority === "critical" ? "destructive" : item.priority === "high" ? "default" : "secondary"} className="text-[9px]">{item.priority}</Badge>
                  </div>
                  {item.customer_email && <p className="text-xs text-muted-foreground mb-1">{item.customer_email}</p>}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="font-bold text-red-600 text-sm">${(item.amount_owed || 0).toLocaleString()} owed</span>
                    {item.days_overdue > 0 && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{item.days_overdue} days overdue</span>}
                    {item.contact_attempts > 0 && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{item.contact_attempts} contact attempts</span>}
                    {item.retry_count > 0 && <span>{item.retry_count} payment retries</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {item.status !== "resolved" && item.status !== "written_off" && (
                    <Button size="sm" variant="outline" className="text-xs h-7 text-emerald-600 border-emerald-300" onClick={() => resolve(item)}><CheckCircle className="w-3 h-3 mr-1" />Resolve</Button>
                  )}
                  <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setSelected(selected?.id === item.id ? null : item)}><Phone className="w-3 h-3 mr-1" />Log Contact</Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(item)}><Edit className="w-3 h-3" /></Button>
                </div>
              </div>

              {/* Inline contact note */}
              {selected?.id === item.id && (
                <div className="mt-3 border-t border-border/40 pt-3">
                  <div className="flex gap-2">
                    <Input className="text-xs h-8" placeholder="Log contact attempt, note, payment plan details..." value={noteText} onChange={e => setNoteText(e.target.value)} onKeyDown={e => e.key === "Enter" && addNote(item)} />
                    <Button size="sm" className="h-8 text-xs" onClick={() => addNote(item)}>Log</Button>
                  </div>
                  {(item.contact_notes || []).length > 0 && (
                    <div className="mt-2 space-y-1">
                      {item.contact_notes.slice(-3).map((n, i) => (
                        <div key={i} className="text-[10px] text-muted-foreground flex gap-2">
                          <span className="text-gray-400">{moment(n.timestamp).format("MMM D HH:mm")}</span>
                          <span>{n.text}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit Collections Item" : "Add to Collections Queue"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-semibold block mb-1">Customer Name</label><Input value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })} /></div>
              <div><label className="text-xs font-semibold block mb-1">Email</label><Input value={form.customer_email} onChange={e => setForm({ ...form, customer_email: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-semibold block mb-1">Amount Owed ($)</label><Input type="number" min="0" value={form.amount_owed} onChange={e => setForm({ ...form, amount_owed: e.target.value })} /></div>
              <div><label className="text-xs font-semibold block mb-1">Days Overdue</label><Input type="number" min="0" value={form.days_overdue} onChange={e => setForm({ ...form, days_overdue: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-semibold block mb-1">Priority</label>
                <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["low","medium","high","critical"].map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><label className="text-xs font-semibold block mb-1">Status</label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["new","contacted","negotiating","payment_plan","escalated","resolved","written_off"].map(s => <SelectItem key={s} value={s}>{s.replace(/_/g," ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><label className="text-xs font-semibold block mb-1">Notes</label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}