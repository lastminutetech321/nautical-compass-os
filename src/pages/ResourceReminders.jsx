import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Bell, Plus, CheckCircle, AlertTriangle, Clock, Loader2, RefreshCw, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import moment from "moment";

const REMINDER_TYPES = [
  "document_deadline","application_deadline","renewal_deadline",
  "appointment_reminder","appeal_deadline","recertification",
  "follow_up","benefit_expiry","court_deadline","other"
];

const PRIORITY_COLORS = {
  low: "text-slate-500 bg-slate-50 border-slate-200",
  medium: "text-blue-600 bg-blue-50 border-blue-200",
  high: "text-amber-600 bg-amber-50 border-amber-200",
  critical: "text-red-600 bg-red-50 border-red-200",
};

export default function ResourceReminders() {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "", client_name: "", reminder_type: "application_deadline",
    due_date: "", priority: "medium", message: "", days_before_alert: 7
  });

  useEffect(() => { load(); }, []);

  const load = () => {
    setLoading(true);
    base44.entities.ResourceReminder.list("due_date", 200).then(r => {
      setReminders(r); setLoading(false);
    }).catch(() => setLoading(false));
  };

  const complete = async (r) => {
    await base44.entities.ResourceReminder.update(r.id, { status: "completed", completed_at: new Date().toISOString() });
    load();
  };

  const dismiss = async (r) => {
    await base44.entities.ResourceReminder.update(r.id, { status: "dismissed" });
    load();
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    await base44.entities.ResourceReminder.create({ ...form, status: "pending", days_before_alert: Number(form.days_before_alert) });
    setSaving(false); setFormOpen(false);
    setForm({ title:"",client_name:"",reminder_type:"application_deadline",due_date:"",priority:"medium",message:"",days_before_alert:7 });
    load();
  };

  const now = new Date();
  const filtered = reminders.filter(r => {
    if (filter === "all") return true;
    if (filter === "overdue") return r.status === "pending" && r.due_date && new Date(r.due_date) < now;
    if (filter === "today") return r.status === "pending" && r.due_date && moment(r.due_date).isSame(moment(), "day");
    if (filter === "week") return r.status === "pending" && r.due_date && new Date(r.due_date) >= now && new Date(r.due_date) <= new Date(now.getTime() + 7*24*60*60*1000);
    return r.status === filter || r.status === "pending";
  });

  const overdue = reminders.filter(r => r.status === "pending" && r.due_date && new Date(r.due_date) < now);
  const today = reminders.filter(r => r.status === "pending" && r.due_date && moment(r.due_date).isSame(moment(), "day"));
  const thisWeek = reminders.filter(r => r.status === "pending" && r.due_date && new Date(r.due_date) >= now && new Date(r.due_date) <= new Date(now.getTime() + 7*24*60*60*1000));

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">Resource Compass</p>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Bell className="w-6 h-6 text-amber-500" />Deadline Engine</h1>
          <p className="text-sm text-muted-foreground">Track every deadline, renewal, and follow-up reminder.</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={load}><RefreshCw className="w-4 h-4" /></Button>
          <Button size="sm" onClick={() => setFormOpen(true)}><Plus className="w-4 h-4 mr-1.5" />Add Reminder</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Overdue", val: overdue.length, color: overdue.length > 0 ? "text-red-600" : "text-muted-foreground", filter: "overdue" },
          { label: "Due Today", val: today.length, color: today.length > 0 ? "text-amber-600" : "text-muted-foreground", filter: "today" },
          { label: "This Week", val: thisWeek.length, color: "text-blue-600", filter: "week" },
          { label: "Total Active", val: reminders.filter(r=>r.status==="pending").length, color: "text-foreground", filter: "pending" },
        ].map(s => (
          <div key={s.label} className="text-center p-3 bg-muted/30 rounded-lg border border-border/40 cursor-pointer hover:border-primary/40" onClick={() => setFilter(s.filter)}>
            <p className={`text-xl font-black ${s.color}`}>{s.val}</p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {[["overdue","⚠ Overdue"],["today","📅 Today"],["week","📆 This Week"],["pending","All Pending"],["all","All"]].map(([val, label]) => (
          <Button key={val} size="sm" variant={filter === val ? "default" : "outline"} onClick={() => setFilter(val)} className="text-xs">{label}</Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <Bell className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-30" />
          <p className="text-sm text-muted-foreground mb-3">No reminders in this view.</p>
          <Button size="sm" onClick={() => setFormOpen(true)}><Plus className="w-4 h-4 mr-1.5" />Add Reminder</Button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(r => {
            const isOverdue = r.status === "pending" && r.due_date && new Date(r.due_date) < now;
            const daysUntil = r.due_date ? moment(r.due_date).diff(moment(), "days") : null;
            return (
              <Card key={r.id} className={`p-3 border transition-all ${isOverdue ? "border-red-200 bg-red-50/40" : "border-border/60"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <p className="text-sm font-semibold">{r.title}</p>
                      <Badge variant="outline" className={`text-[10px] capitalize ${PRIORITY_COLORS[r.priority]}`}>{r.priority}</Badge>
                      {isOverdue && <Badge variant="outline" className="text-[10px] text-red-600 border-red-300 font-bold">OVERDUE</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">{r.client_name} · {r.reminder_type?.replace(/_/g," ")}</p>
                    {r.message && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{r.message}</p>}
                    <div className="flex items-center gap-3 mt-1 text-[10px] flex-wrap">
                      {r.due_date && (
                        <span className={`flex items-center gap-1 font-semibold ${isOverdue ? "text-red-600" : daysUntil !== null && daysUntil <= 3 ? "text-amber-600" : "text-muted-foreground"}`}>
                          <Clock className="w-3 h-3" />
                          {isOverdue ? `${Math.abs(daysUntil)} days overdue` : daysUntil === 0 ? "Due today" : `${daysUntil} days left — ${moment(r.due_date).format("MMM D, YYYY")}`}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    {r.status === "pending" && (
                      <>
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => dismiss(r)}>Dismiss</Button>
                        <Button size="sm" className="h-7 text-xs" onClick={() => complete(r)}><CheckCircle className="w-3 h-3 mr-1" />Done</Button>
                      </>
                    )}
                    {r.status === "completed" && <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-200">✓ Done</Badge>}
                    {r.status === "dismissed" && <Badge variant="secondary" className="text-[10px]">Dismissed</Badge>}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add Reminder</DialogTitle></DialogHeader>
          <form onSubmit={save} className="space-y-3">
            <div><label className="text-xs font-semibold block mb-1">Title *</label><Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} required /></div>
            <div><label className="text-xs font-semibold block mb-1">Client Name *</label><Input value={form.client_name} onChange={e => setForm({...form, client_name: e.target.value})} required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-semibold block mb-1">Type</label>
                <Select value={form.reminder_type} onValueChange={v => setForm({...form, reminder_type: v})}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{REMINDER_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize text-xs">{t.replace(/_/g," ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><label className="text-xs font-semibold block mb-1">Priority</label>
                <Select value={form.priority} onValueChange={v => setForm({...form, priority: v})}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{["low","medium","high","critical"].map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-semibold block mb-1">Due Date *</label><Input type="date" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} required /></div>
              <div><label className="text-xs font-semibold block mb-1">Alert Before (days)</label><Input type="number" min="1" value={form.days_before_alert} onChange={e => setForm({...form, days_before_alert: e.target.value})} /></div>
            </div>
            <div><label className="text-xs font-semibold block mb-1">Message</label><Input value={form.message} onChange={e => setForm({...form, message: e.target.value})} placeholder="What needs to happen..." /></div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Add Reminder"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}