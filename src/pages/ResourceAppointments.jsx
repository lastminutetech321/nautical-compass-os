import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Calendar, Plus, CheckCircle, AlertTriangle, Clock, Loader2, MapPin, Phone, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import moment from "moment";

const STATUS_COLORS = {
  scheduled: "text-blue-600 bg-blue-50 border-blue-200",
  confirmed: "text-emerald-600 bg-emerald-50 border-emerald-200",
  completed: "text-teal-600 bg-teal-50 border-teal-200",
  missed: "text-red-600 bg-red-50 border-red-200",
  rescheduled: "text-amber-600 bg-amber-50 border-amber-200",
  cancelled: "text-gray-500 bg-gray-50 border-gray-200",
};

const APPT_TYPES = [
  "intake_interview","document_submission","eligibility_review","benefits_enrollment",
  "court_hearing","medical_appointment","employment_interview","housing_inspection","follow_up","other"
];

export default function ResourceAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("upcoming");
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "", client_name: "", resource_name: "", appointment_type: "intake_interview",
    date: "", time: "", location: "", address: "", phone: "", virtual_link: "",
    documents_to_bring: "", preparation_notes: "", status: "scheduled"
  });

  useEffect(() => { load(); }, []);
  const load = () => {
    setLoading(true);
    base44.entities.ResourceAppointment.list("date", 200).then(a => {
      setAppointments(a); setLoading(false);
    }).catch(() => setLoading(false));
  };

  const updateStatus = async (appt, status) => {
    await base44.entities.ResourceAppointment.update(appt.id, { status });
    load();
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    await base44.entities.ResourceAppointment.create({
      ...form,
      documents_to_bring: form.documents_to_bring ? form.documents_to_bring.split("\n").filter(Boolean) : [],
    });
    setSaving(false); setFormOpen(false);
    setForm({ title:"",client_name:"",resource_name:"",appointment_type:"intake_interview",date:"",time:"",location:"",address:"",phone:"",virtual_link:"",documents_to_bring:"",preparation_notes:"",status:"scheduled" });
    load();
  };

  const now = new Date();
  const filtered = appointments.filter(a => {
    if (filter === "upcoming") return ["scheduled","confirmed"].includes(a.status) && a.date && new Date(a.date) >= now;
    if (filter === "past") return a.date && new Date(a.date) < now;
    if (filter === "missed") return a.status === "missed";
    return true;
  });

  const upcoming = appointments.filter(a => ["scheduled","confirmed"].includes(a.status) && a.date && new Date(a.date) >= now);
  const todayAppts = upcoming.filter(a => moment(a.date).isSame(moment(), "day"));

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">Resource Compass</p>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Calendar className="w-6 h-6 text-violet-500" />Appointment Manager</h1>
          <p className="text-sm text-muted-foreground">Schedule and track every client appointment.</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={load}><RefreshCw className="w-4 h-4" /></Button>
          <Button size="sm" onClick={() => setFormOpen(true)}><Plus className="w-4 h-4 mr-1.5" />Schedule</Button>
        </div>
      </div>

      {todayAppts.length > 0 && (
        <div className="p-3 bg-violet-50 border border-violet-200 rounded-lg flex items-center gap-2">
          <Calendar className="w-4 h-4 text-violet-600" />
          <p className="text-sm text-violet-800 font-semibold">{todayAppts.length} appointment{todayAppts.length > 1 ? "s" : ""} today</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Upcoming", val: upcoming.length, color: "text-blue-600" },
          { label: "Today", val: todayAppts.length, color: "text-violet-600" },
          { label: "Missed", val: appointments.filter(a=>a.status==="missed").length, color: "text-red-600" },
          { label: "Completed", val: appointments.filter(a=>a.status==="completed").length, color: "text-emerald-600" },
        ].map(s => (
          <div key={s.label} className="text-center p-3 bg-muted/30 rounded-lg border border-border/40">
            <p className={`text-xl font-black ${s.color}`}>{s.val}</p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        {[["upcoming","Upcoming"],["past","Past"],["missed","Missed"],["all","All"]].map(([val,label]) => (
          <Button key={val} size="sm" variant={filter===val?"default":"outline"} onClick={() => setFilter(val)} className="text-xs">{label}</Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <Calendar className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-30" />
          <p className="text-sm text-muted-foreground mb-3">No appointments in this view.</p>
          <Button size="sm" onClick={() => setFormOpen(true)}><Plus className="w-4 h-4 mr-1.5" />Schedule Appointment</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(appt => {
            const isPast = appt.date && new Date(appt.date) < now;
            const isToday = moment(appt.date).isSame(moment(), "day");
            return (
              <Card key={appt.id} className="p-4 border border-border/60">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="text-sm font-semibold">{appt.title}</p>
                      <Badge variant="outline" className={`text-[10px] capitalize ${STATUS_COLORS[appt.status]}`}>{appt.status}</Badge>
                      {isToday && <Badge className="text-[10px] bg-violet-600">Today</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">{appt.client_name} · {appt.resource_name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{appt.appointment_type?.replace(/_/g," ")}</p>
                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                      {appt.date && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{moment(appt.date).format("MMM D, YYYY")}{appt.time ? ` · ${appt.time}` : ""}</span>}
                      {appt.address && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{appt.address}</span>}
                      {appt.phone && <a href={`tel:${appt.phone}`} className="flex items-center gap-1 text-blue-600 hover:underline"><Phone className="w-3 h-3" />{appt.phone}</a>}
                    </div>
                    {(appt.documents_to_bring || []).length > 0 && (
                      <div className="mt-2">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Bring These Documents</p>
                        <div className="flex flex-wrap gap-1">
                          {appt.documents_to_bring.map((d,i) => <span key={i} className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{d}</span>)}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    <Select value={appt.status} onValueChange={v => updateStatus(appt, v)}>
                      <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{["scheduled","confirmed","completed","missed","rescheduled","cancelled"].map(s => <SelectItem key={s} value={s} className="capitalize text-xs">{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Schedule Appointment</DialogTitle></DialogHeader>
          <form onSubmit={save} className="space-y-3">
            <div><label className="text-xs font-semibold block mb-1">Title *</label><Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-semibold block mb-1">Client Name *</label><Input value={form.client_name} onChange={e => setForm({...form, client_name: e.target.value})} required /></div>
              <div><label className="text-xs font-semibold block mb-1">Resource/Agency</label><Input value={form.resource_name} onChange={e => setForm({...form, resource_name: e.target.value})} /></div>
            </div>
            <div><label className="text-xs font-semibold block mb-1">Type</label>
              <Select value={form.appointment_type} onValueChange={v => setForm({...form, appointment_type: v})}>
                <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{APPT_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize text-xs">{t.replace(/_/g," ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-semibold block mb-1">Date *</label><Input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} required /></div>
              <div><label className="text-xs font-semibold block mb-1">Time</label><Input type="time" value={form.time} onChange={e => setForm({...form, time: e.target.value})} /></div>
            </div>
            <div><label className="text-xs font-semibold block mb-1">Location / Address</label><Input value={form.address} onChange={e => setForm({...form, address: e.target.value})} /></div>
            <div><label className="text-xs font-semibold block mb-1">Phone</label><Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
            <div><label className="text-xs font-semibold block mb-1">Documents to Bring (one per line)</label><Textarea value={form.documents_to_bring} onChange={e => setForm({...form, documents_to_bring: e.target.value})} rows={3} placeholder="Photo ID&#10;Proof of income&#10;Social Security card..." /></div>
            <div><label className="text-xs font-semibold block mb-1">Preparation Notes</label><Textarea value={form.preparation_notes} onChange={e => setForm({...form, preparation_notes: e.target.value})} rows={2} /></div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Schedule"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}