import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Upload, Loader2, FileText, CheckCircle2, Clock, AlertCircle, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const STATUS_ICONS = {
  queued: Clock, importing: Loader2, imported: CheckCircle2,
  review_pending: Clock, verified: CheckCircle2, failed: AlertCircle, rejected: AlertCircle
};

const STATUS_COLORS = {
  queued: "bg-gray-100 text-gray-700", importing: "bg-blue-100 text-blue-700",
  imported: "bg-green-100 text-green-700", review_pending: "bg-amber-100 text-amber-700",
  verified: "bg-emerald-100 text-emerald-700", failed: "bg-red-100 text-red-700", rejected: "bg-red-100 text-red-700"
};

export default function CanonImportQueuePage() {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ title: "", category: "civil_rights", priority: "high", citation: "", source_url: "", content_preview: "", full_content: "" });

  useEffect(() => {
    base44.entities.CanonImportQueue.list("-created_date", 200).then(setQueue).finally(() => setLoading(false));
  }, []);

  const handleAdd = async () => {
    await base44.entities.CanonImportQueue.create({ ...form, import_status: "queued", submitted_at: new Date().toISOString() });
    setDialogOpen(false);
    const refreshed = await base44.entities.CanonImportQueue.list("-created_date", 200);
    setQueue(refreshed);
    setForm({ title: "", category: "civil_rights", priority: "high", citation: "", source_url: "", content_preview: "", full_content: "" });
  };

  const handlePromote = async (item) => {
    const entry = await base44.entities.CanonEntry.create({
      title: item.title, category: item.category, citation: item.citation,
      source_url: item.source_url, content: item.full_content || item.content_preview,
      status: "pending_review", verified: false, is_canon_gap: false,
      imported_at: new Date().toISOString(), confidence: 0
    });
    await base44.entities.CanonImportQueue.update(item.id, {
      import_status: "imported", imported_entry_id: entry.id, reviewed_at: new Date().toISOString()
    });
    const refreshed = await base44.entities.CanonImportQueue.list("-created_date", 200);
    setQueue(refreshed);
  };

  if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">Canon Population</p>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Upload className="w-6 h-6 text-blue-500" />Canon Import Queue</h1>
          <p className="text-sm text-muted-foreground mt-1">Queue documents for Canon import. All entries require human review before verification.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1.5" />Add to Queue</Button></DialogTrigger>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Add to Import Queue</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Title</Label><Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="42 U.S.C. § 1983" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Category</Label>
                  <Select value={form.category} onValueChange={v => setForm({...form, category: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["civil_rights", "constitutional_law", "administrative_law", "consumer_protection", "standing_doctrine", "case_law", "federal_statute", "state_statute"].map(c => <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Priority</Label>
                  <Select value={form.priority} onValueChange={v => setForm({...form, priority: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["low", "medium", "high", "critical"].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Citation</Label><Input value={form.citation} onChange={e => setForm({...form, citation: e.target.value})} placeholder="42 U.S.C. § 1983" /></div>
              <div><Label>Source URL</Label><Input value={form.source_url} onChange={e => setForm({...form, source_url: e.target.value})} placeholder="https://uscode.house.gov/..." /></div>
              <div><Label>Content Preview</Label><Textarea value={form.content_preview} onChange={e => setForm({...form, content_preview: e.target.value})} rows={2} /></div>
              <div><Label>Full Content</Label><Textarea value={form.full_content} onChange={e => setForm({...form, full_content: e.target.value})} rows={6} placeholder="Paste the full statute text..." /></div>
              <Button onClick={handleAdd} className="w-full" disabled={!form.title}>Add to Queue</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Queued", value: queue.filter(q => q.import_status === "queued").length, color: "text-gray-600" },
          { label: "Imported", value: queue.filter(q => q.import_status === "imported").length, color: "text-green-600" },
          { label: "Review Pending", value: queue.filter(q => q.import_status === "review_pending").length, color: "text-amber-600" },
          { label: "Verified", value: queue.filter(q => q.import_status === "verified").length, color: "text-emerald-600" },
        ].map(s => (
          <Card key={s.label} className="p-3 border border-border/60">
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </Card>
        ))}
      </div>

      {queue.length === 0 ? (
        <Card className="p-8 text-center border-dashed">
          <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No items in the import queue. Add legal authority documents to populate the Canon.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {queue.map(item => {
            const Icon = STATUS_ICONS[item.import_status] || Clock;
            return (
              <Card key={item.id} className="p-3 border border-border/60">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="p-1.5 rounded bg-muted flex-shrink-0">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      {item.citation && <p className="text-xs text-muted-foreground font-mono">{item.citation}</p>}
                      {item.content_preview && <p className="text-xs text-muted-foreground truncate mt-1">{item.content_preview}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge className={`text-[9px] ${STATUS_COLORS[item.import_status] || ""}`}>
                      <Icon className="w-2.5 h-2.5 mr-1" />{item.import_status.replace(/_/g, " ")}
                    </Badge>
                    {item.import_status === "queued" && (
                      <Button size="sm" variant="outline" onClick={() => handlePromote(item)}>Import to Canon</Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}