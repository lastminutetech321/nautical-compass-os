import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, FileSearch, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import moment from "moment";

const statuses = ["draft","submitted","acknowledged","pending","partial_response","fulfilled","denied","appealed"];

export default function FOIATracker() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [form, setForm] = useState({ title: "", agency_name: "", agency_contact: "", case_name: "", submitted_date: "", deadline_date: "", appeal_deadline: "", status: "draft", response_notes: "" });
  const [genPrompt, setGenPrompt] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    base44.entities.FOIARequest.list("-created_date", 100).then(data => {
      setRequests(data);
      if (data.length > 0 && !selected) setSelected(data[0]);
    }).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleGenerate = async () => {
    if (!genPrompt.trim()) return;
    setGenerating(true);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Generate a professional, complete FOIA (Freedom of Information Act) public records request based on this request:
"${genPrompt}"
Agency: ${form.agency_name || "the relevant agency"}

Generate a formal request letter including:
- Date line
- Agency address block (placeholder)
- Subject line
- Purpose statement
- Specific records requested (be detailed and thorough)
- Format/delivery preferences
- Fee waiver request if appropriate
- Response deadline acknowledgment
- Requester signature block (placeholder)

Make it comprehensive and legally sound. Output only the letter text.`,
    });
    setForm(f => ({ ...f, request_text: result }));
    setGenerating(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const created = await base44.entities.FOIARequest.create({ ...form, received_evidence_ids: [], tags: [] });
    setSaving(false);
    setFormOpen(false);
    setForm({ title: "", agency_name: "", agency_contact: "", case_name: "", submitted_date: "", deadline_date: "", appeal_deadline: "", status: "draft", response_notes: "" });
    setGenPrompt("");
    load();
    setSelected(created);
  };

  const updateStatus = async (status) => {
    if (!selected) return;
    await base44.entities.FOIARequest.update(selected.id, { status });
    setSelected({ ...selected, status });
    load();
  };

  const daysUntil = (dateStr) => {
    if (!dateStr) return null;
    const diff = moment(dateStr).diff(moment(), "days");
    return diff;
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader
        title="FOIA / Records Request Tracker"
        subtitle="Generate, track, and manage public records requests"
        actions={<Button onClick={() => setFormOpen(true)} size="sm"><Plus className="w-4 h-4 mr-1.5" />New Request</Button>}
      />

      {requests.length === 0 ? (
        <EmptyState icon={FileSearch} title="No FOIA requests" description="Create your first public records request" actionLabel="New Request" onAction={() => setFormOpen(true)} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-2">
            {requests.map(r => {
              const days = daysUntil(r.deadline_date);
              return (
                <Card key={r.id} className={`p-3 cursor-pointer transition-all ${selected?.id === r.id ? "border-primary shadow-md" : "border-border/60 hover:shadow-sm"}`} onClick={() => setSelected(r)}>
                  <p className="text-sm font-semibold truncate">{r.title}</p>
                  <p className="text-xs text-muted-foreground">{r.agency_name}</p>
                  <div className="flex items-center justify-between mt-2">
                    <StatusBadge value={r.status} />
                    {days !== null && days >= 0 && days <= 14 && (
                      <span className="text-[10px] text-red-500 flex items-center gap-0.5"><AlertTriangle className="w-3 h-3" />{days}d left</span>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>

          {selected && (
            <div className="lg:col-span-2">
              <Card className="p-5 border border-border/60">
                <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
                  <div>
                    <h2 className="text-base font-semibold">{selected.title}</h2>
                    <p className="text-xs text-muted-foreground">{selected.agency_name}</p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <StatusBadge value={selected.status} />
                    <Select value={selected.status} onValueChange={updateStatus}>
                      <SelectTrigger className="h-7 text-xs w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>{statuses.map(s => <SelectItem key={s} value={s} className="text-xs">{s.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase())}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div><p className="text-xs text-muted-foreground">Submitted</p><p className="text-sm font-medium">{selected.submitted_date ? moment(selected.submitted_date).format("MMM D, YYYY") : "—"}</p></div>
                  <div>
                    <p className="text-xs text-muted-foreground">Deadline</p>
                    <p className={`text-sm font-medium ${daysUntil(selected.deadline_date) !== null && daysUntil(selected.deadline_date) <= 7 ? "text-red-500" : ""}`}>
                      {selected.deadline_date ? moment(selected.deadline_date).format("MMM D, YYYY") : "—"}
                    </p>
                  </div>
                  <div><p className="text-xs text-muted-foreground">Appeal By</p><p className="text-sm font-medium">{selected.appeal_deadline ? moment(selected.appeal_deadline).format("MMM D, YYYY") : "—"}</p></div>
                </div>
                <Tabs defaultValue="request">
                  <TabsList className="mb-4"><TabsTrigger value="request">Request Text</TabsTrigger><TabsTrigger value="notes">Response Notes</TabsTrigger></TabsList>
                  <TabsContent value="request">
                    <div className="bg-muted p-4 rounded-lg text-sm whitespace-pre-wrap font-mono max-h-96 overflow-y-auto">{selected.request_text || "No request text."}</div>
                  </TabsContent>
                  <TabsContent value="notes">
                    <div className="bg-muted p-4 rounded-lg text-sm whitespace-pre-wrap min-h-24">{selected.response_notes || "No response notes."}</div>
                  </TabsContent>
                </Tabs>
              </Card>
            </div>
          )}
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New FOIA / Records Request</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Request Title</Label><Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} required /></div>
              <div><Label>Agency Name</Label><Input value={form.agency_name} onChange={e => setForm({...form, agency_name: e.target.value})} required /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Agency Contact</Label><Input value={form.agency_contact} onChange={e => setForm({...form, agency_contact: e.target.value})} /></div>
              <div><Label>Case / Matter</Label><Input value={form.case_name} onChange={e => setForm({...form, case_name: e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Submitted Date</Label><Input type="date" value={form.submitted_date} onChange={e => setForm({...form, submitted_date: e.target.value})} /></div>
              <div><Label>Response Deadline</Label><Input type="date" value={form.deadline_date} onChange={e => setForm({...form, deadline_date: e.target.value})} /></div>
              <div><Label>Appeal Deadline</Label><Input type="date" value={form.appeal_deadline} onChange={e => setForm({...form, appeal_deadline: e.target.value})} /></div>
            </div>
            <div>
              <Label>AI Request Generator</Label>
              <div className="flex gap-2 mt-1">
                <Input value={genPrompt} onChange={e => setGenPrompt(e.target.value)} placeholder="Describe what records you need..." className="text-sm" />
                <Button type="button" size="sm" onClick={handleGenerate} disabled={generating} className="flex-shrink-0">{generating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Generate"}</Button>
              </div>
            </div>
            <div><Label>Request Text</Label><Textarea value={form.request_text || ""} onChange={e => setForm({...form, request_text: e.target.value})} rows={10} className="font-mono text-xs" /></div>
            <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Request"}</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}