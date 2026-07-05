import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, GitCommitHorizontal, Link2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import moment from "moment";

const confidenceColors = {
  confirmed: "bg-emerald-100 text-emerald-700 border-emerald-200",
  probable: "bg-blue-100 text-blue-700 border-blue-200",
  disputed: "bg-red-100 text-red-700 border-red-200",
  unknown: "bg-slate-100 text-slate-600 border-slate-200",
};

const eventTypeColors = {
  note: "bg-slate-400", file: "bg-blue-500", video: "bg-violet-500",
  email: "bg-amber-500", event: "bg-emerald-500", statement: "bg-orange-500", action: "bg-red-500"
};

export default function CaseTimelinePage() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [caseFilter, setCaseFilter] = useState("");
  const [cases, setCases] = useState([]);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ case_name: "", title: "", description: "", event_date: "", event_type: "event", confidence: "unknown", source: "" });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    base44.entities.CaseTimeline.list("event_date", 200).then(data => {
      setEntries(data);
      const uniqueCases = [...new Set(data.map(e => e.case_name).filter(Boolean))];
      setCases(uniqueCases);
      if (uniqueCases.length > 0 && !caseFilter) setCaseFilter(uniqueCases[0]);
    }).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await base44.entities.CaseTimeline.create(form);
    setSaving(false);
    setFormOpen(false);
    setForm({ case_name: "", title: "", description: "", event_date: "", event_type: "event", confidence: "unknown", source: "" });
    load();
  };

  const filtered = entries.filter(e => !caseFilter || e.case_name === caseFilter);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader
        title="Case Timeline"
        subtitle="Chronological reconstruction of events"
        actions={<Button onClick={() => setFormOpen(true)} size="sm"><Plus className="w-4 h-4 mr-1.5" />Add Entry</Button>}
      />
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <Input placeholder="Filter by case name..." value={caseFilter} onChange={e => setCaseFilter(e.target.value)} className="max-w-xs h-9 text-sm" />
        <div className="flex gap-2 flex-wrap">
          {cases.map(c => (
            <Button key={c} size="sm" variant={caseFilter === c ? "default" : "outline"} className="h-8 text-xs" onClick={() => setCaseFilter(c)}>{c}</Button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={GitCommitHorizontal} title="No timeline entries" description="Add events, files, statements, and evidence to build your case timeline" actionLabel="Add Entry" onAction={() => setFormOpen(true)} />
      ) : (
        <div className="relative pl-8">
          <div className="absolute left-3.5 top-0 bottom-0 w-0.5 bg-border" />
          <div className="space-y-4">
            {filtered.map((entry) => {
              const dotColor = eventTypeColors[entry.event_type] || "bg-slate-400";
              return (
                <div key={entry.id} className="relative">
                  <div className={`absolute -left-[17px] top-4 w-3 h-3 rounded-full border-2 border-white ${dotColor}`} />
                  <Card className="p-4 border border-border/60 hover:shadow-md transition-shadow ml-2">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <p className="text-xs font-mono text-muted-foreground">{entry.event_date ? moment(entry.event_date).format("MMM D, YYYY · h:mm A") : "No date"}</p>
                          <Badge variant="outline" className="text-[10px]">{entry.event_type}</Badge>
                        </div>
                        <p className="text-sm font-semibold">{entry.title}</p>
                        {entry.description && <p className="text-xs text-muted-foreground mt-1">{entry.description}</p>}
                        {entry.source && <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Link2 className="w-3 h-3" />Source: {entry.source}</p>}
                      </div>
                      <Badge variant="outline" className={`text-[10px] ${confidenceColors[entry.confidence] || ""}`}>{entry.confidence}</Badge>
                    </div>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Add Timeline Entry</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Case Name</Label><Input value={form.case_name} onChange={e => setForm({...form, case_name: e.target.value})} required /></div>
              <div>
                <Label>Event Type</Label>
                <Select value={form.event_type} onValueChange={v => setForm({...form, event_type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["note","file","video","email","event","statement","action"].map(t => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Title</Label><Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} required /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={3} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Event Date & Time</Label><Input type="datetime-local" value={form.event_date} onChange={e => setForm({...form, event_date: e.target.value})} /></div>
              <div>
                <Label>Confidence</Label>
                <Select value={form.confidence} onValueChange={v => setForm({...form, confidence: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["confirmed","probable","disputed","unknown"].map(c => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Source</Label><Input value={form.source} onChange={e => setForm({...form, source: e.target.value})} placeholder="Document, witness, record..." /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Add Entry"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}