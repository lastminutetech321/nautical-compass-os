import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Crown, Lock, Plus, Edit2, ShieldAlert, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import moment from "moment";

const CATEGORIES = [
  { value: "mission", label: "Mission" },
  { value: "philosophy", label: "Philosophy" },
  { value: "business_doctrine", label: "Business Doctrine" },
  { value: "product_doctrine", label: "Product Doctrine" },
  { value: "ai_behavior", label: "AI Behavior" },
  { value: "ethics", label: "Ethics" },
  { value: "design_principles", label: "Design Principles" },
];

const catColors = {
  mission: "bg-amber-50 text-amber-800 border-amber-200",
  philosophy: "bg-violet-50 text-violet-800 border-violet-200",
  business_doctrine: "bg-blue-50 text-blue-800 border-blue-200",
  product_doctrine: "bg-emerald-50 text-emerald-800 border-emerald-200",
  ai_behavior: "bg-indigo-50 text-indigo-800 border-indigo-200",
  ethics: "bg-red-50 text-red-800 border-red-200",
  design_principles: "bg-slate-50 text-slate-700 border-slate-200",
};

export default function FounderVisionPage() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [approvalOpen, setApprovalOpen] = useState(null);
  const [approvalCode, setApprovalCode] = useState("");
  const [approvalError, setApprovalError] = useState("");
  const [form, setForm] = useState({ title: "", category: "mission", content: "", version: "1.0" });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    base44.entities.FounderVision.list("-created_date", 100).then(data => {
      setEntries(data);
      if (data.length > 0 && !selected) setSelected(data[0]);
    }).finally(() => setLoading(false));
  };

  useEffect(load, []);

  useEffect(() => {
    if (editing) {
      setForm({ title: editing.title, category: editing.category, content: editing.content, version: editing.version || "1.0" });
    } else {
      setForm({ title: "", category: "mission", content: "", version: "1.0" });
    }
  }, [editing, formOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const data = { ...form, locked: true, requires_approval: true };
    let result;
    if (editing) {
      const history = [...(editing.change_history || []), { changed_at: new Date().toISOString(), previous_version: editing.version }];
      result = await base44.entities.FounderVision.update(editing.id, { ...data, change_history: history });
    } else {
      result = await base44.entities.FounderVision.create({ ...data, change_history: [] });
    }
    setSaving(false);
    setFormOpen(false);
    setEditing(null);
    setSelected(result);
    load();
  };

  const attemptApprove = async () => {
    // Simple approval gate — code "FOUNDER" symbolizes manual founder approval
    if (approvalCode !== "FOUNDER") {
      setApprovalError("Incorrect approval code. Only the Founder can approve Vision changes.");
      return;
    }
    await base44.entities.FounderVision.update(approvalOpen.id, {
      last_approved_at: new Date().toISOString(),
      last_approved_by: "Founder"
    });
    setApprovalOpen(null);
    setApprovalCode("");
    setApprovalError("");
    load();
  };

  const grouped = CATEGORIES.map(c => ({
    ...c,
    items: entries.filter(e => e.category === c.value)
  })).filter(g => g.items.length > 0);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">NCOS · Layer 1</p>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Crown className="w-6 h-6 text-amber-500" />Founder Vision</h1>
          <p className="text-sm text-muted-foreground mt-1">Mission, philosophy, doctrines, and AI behavior. Never modified without approval.</p>
        </div>
        <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="w-4 h-4 mr-1.5" />Add Entry</Button>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 mb-5 text-xs text-amber-800 flex items-center gap-2">
        <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0" />
        <strong>Layer 1 — Protected.</strong> This layer contains the foundational doctrine of Nautical Compass and Apex Vision Holdings. Changes require Founder approval.
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Nav */}
        <div className="space-y-4">
          {grouped.map(group => (
            <div key={group.value}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 px-1">{group.label}</p>
              {group.items.map(entry => (
                <button
                  key={entry.id}
                  onClick={() => setSelected(entry)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg transition-all flex items-center justify-between gap-2 ${selected?.id === entry.id ? "bg-primary/10 border border-primary/30" : "hover:bg-muted border border-transparent"}`}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{entry.title}</p>
                    <p className="text-[10px] text-muted-foreground">v{entry.version || "1.0"}</p>
                  </div>
                  <Lock className="w-3 h-3 text-amber-500 flex-shrink-0" />
                </button>
              ))}
            </div>
          ))}
          {entries.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No entries yet.</p>}
        </div>

        {/* Detail */}
        {selected && (
          <div className="lg:col-span-2">
            <Card className="p-5 border border-border/60">
              <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
                <div>
                  <Badge variant="outline" className={`text-[10px] border mb-2 ${catColors[selected.category] || ""}`}>{CATEGORIES.find(c => c.value === selected.category)?.label}</Badge>
                  <h2 className="text-base font-semibold">{selected.title}</h2>
                  <p className="text-xs text-muted-foreground">Version {selected.version || "1.0"}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setApprovalOpen(selected)}>
                    <CheckCircle className="w-3.5 h-3.5 mr-1.5" />Approve
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setEditing(selected); setFormOpen(true); }}>
                    <Edit2 className="w-3.5 h-3.5 mr-1.5" />Edit
                  </Button>
                </div>
              </div>

              {selected.last_approved_at && (
                <div className="flex items-center gap-2 mb-3 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Approved by {selected.last_approved_by} · {moment(selected.last_approved_at).fromNow()}
                </div>
              )}

              <div className="bg-muted rounded-lg p-4 text-sm whitespace-pre-wrap leading-relaxed">{selected.content}</div>

              {(selected.change_history || []).length > 0 && (
                <div className="mt-4">
                  <p className="text-[10px] font-semibold text-muted-foreground mb-2">CHANGE HISTORY</p>
                  <div className="space-y-1">
                    {selected.change_history.slice(-3).reverse().map((h, i) => (
                      <p key={i} className="text-[10px] text-muted-foreground">v{h.previous_version} · {moment(h.changed_at).fromNow()}</p>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </div>
        )}
      </div>

      {/* Form */}
      <Dialog open={formOpen} onOpenChange={v => { setFormOpen(v); if (!v) setEditing(null); }}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Vision Entry" : "New Vision Entry"}</DialogTitle>
            <DialogDescription>This entry will be locked and require Founder approval to activate.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><Label>Title</Label><Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm({...form, category: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Version</Label><Input value={form.version} onChange={e => setForm({...form, version: e.target.value})} placeholder="1.0" /></div>
            </div>
            <div><Label>Content</Label><Textarea value={form.content} onChange={e => setForm({...form, content: e.target.value})} rows={10} required className="text-sm" /></div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => { setFormOpen(false); setEditing(null); }}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save"}</Button></div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Approval Gate */}
      <Dialog open={!!approvalOpen} onOpenChange={() => { setApprovalOpen(null); setApprovalCode(""); setApprovalError(""); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Lock className="w-4 h-4 text-amber-500" />Founder Approval Required</DialogTitle>
            <DialogDescription>Enter the founder approval code to mark this entry as approved.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input value={approvalCode} onChange={e => setApprovalCode(e.target.value)} placeholder="Approval code" type="password" />
            {approvalError && <p className="text-xs text-red-600">{approvalError}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setApprovalOpen(null)}>Cancel</Button>
              <Button onClick={attemptApprove}>Approve</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}