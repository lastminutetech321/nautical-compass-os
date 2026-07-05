import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Search, Loader2, Bug, Clock, CheckCircle, AlertCircle } from "lucide-react";
import moment from "moment";

const SEVERITY_COLORS = { low: "bg-slate-100 text-slate-700", medium: "bg-amber-100 text-amber-700", high: "bg-orange-100 text-orange-700", critical: "bg-red-100 text-red-700" };
const STATUS_COLORS = { open: "bg-red-100 text-red-700", investigating: "bg-amber-100 text-amber-700", fixed: "bg-emerald-100 text-emerald-700", verified: "bg-emerald-100 text-emerald-700", regression: "bg-red-100 text-red-700", wont_fix: "bg-slate-100 text-slate-600" };
const CATEGORIES = ["ui", "logic", "data", "integration", "auth", "performance", "security", "build", "deployment", "other"];

export default function BugKnowledgePanel({ refreshKey }) {
  const [bugs, setBugs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", severity: "medium", status: "open", category: "logic", symptoms: "", root_cause: "", fix: "", files_changed: "", regression_tests: "", time_to_resolve_hours: 0, can_happen_again: true, prevention: "", module: "" });

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.BugKnowledgeBase.list('-created_date', 200);
    setBugs(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [refreshKey]);

  const filtered = bugs.filter(b => !search || `${b.title} ${b.symptoms} ${b.root_cause}`.toLowerCase().includes(search.toLowerCase()));

  const handleCreate = async () => {
    const parseList = (s) => s ? s.split(',').map(x => x.trim()).filter(Boolean) : [];
    await base44.entities.BugKnowledgeBase.create({
      ...form,
      time_to_resolve_hours: Number(form.time_to_resolve_hours) || 0,
      files_changed: parseList(form.files_changed),
      regression_tests: parseList(form.regression_tests),
      first_seen: new Date().toISOString().slice(0, 10),
    });
    setShowCreate(false);
    load();
  };

  const updateStatus = async (id, status) => {
    await base44.entities.BugKnowledgeBase.update(id, { status, resolved_at: status === 'fixed' || status === 'verified' ? new Date().toISOString() : undefined });
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search bugs..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-1" />Add Bug</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground text-sm">No bugs recorded yet. Every bug should be documented with root cause and fix.</Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(b => (
            <Card key={b.id} className="p-4 border border-border/60">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={`text-[9px] ${SEVERITY_COLORS[b.severity] || SEVERITY_COLORS.medium}`}>{b.severity}</Badge>
                  <Badge className={`text-[9px] ${STATUS_COLORS[b.status] || STATUS_COLORS.open}`}>{b.status?.replace(/_/g, " ")}</Badge>
                  <Badge variant="outline" className="text-[9px]">{b.category}</Badge>
                  {b.can_happen_again && <Badge className="text-[9px] bg-amber-100 text-amber-700"><AlertCircle className="w-2.5 h-2.5 mr-0.5" />Can Recur</Badge>}
                </div>
                {b.time_to_resolve_hours > 0 && <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground"><Clock className="w-3 h-3" />{b.time_to_resolve_hours}h to resolve</span>}
              </div>
              <p className="text-sm font-semibold mb-1 flex items-center gap-1.5"><Bug className="w-3.5 h-3.5 text-red-600" />{b.title}</p>
              <p className="text-xs text-muted-foreground"><span className="font-medium">Symptoms:</span> {b.symptoms}</p>
              {b.root_cause && <p className="text-xs text-muted-foreground mt-1"><span className="font-medium">Root Cause:</span> {b.root_cause}</p>}
              {b.fix && <p className="text-xs text-muted-foreground mt-1"><span className="font-medium">Fix:</span> {b.fix}</p>}
              {b.prevention && <p className="text-xs text-emerald-600 mt-1"><span className="font-medium">Prevention:</span> {b.prevention}</p>}
              {b.files_changed?.length > 0 && <div className="flex flex-wrap gap-1 mt-2">{b.files_changed.map((f, i) => <Badge key={i} variant="outline" className="text-[8px] font-mono">{f}</Badge>)}</div>}
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/40">
                <span className="text-[9px] text-muted-foreground">{b.module || "—"} · {moment(b.first_seen || b.created_date).format("MMM D")}</span>
                {b.status === "open" && <Button size="sm" variant="outline" className="h-6 text-[9px]" onClick={() => updateStatus(b.id, "fixed")}>Mark Fixed</Button>}
                {b.status === "fixed" && <Button size="sm" variant="outline" className="h-6 text-[9px]" onClick={() => updateStatus(b.id, "verified")}><CheckCircle className="w-3 h-3 mr-0.5" />Verify</Button>}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Record Bug</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Severity</Label><Select value={form.severity} onValueChange={v => setForm({ ...form, severity: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["low", "medium", "high", "critical"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Status</Label><Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["open", "investigating", "fixed", "verified", "regression", "wont_fix"].map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Category</Label><Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div><Label>Symptoms</Label><Textarea rows={3} value={form.symptoms} onChange={e => setForm({ ...form, symptoms: e.target.value })} /></div>
            <div><Label>Root Cause</Label><Textarea rows={3} value={form.root_cause} onChange={e => setForm({ ...form, root_cause: e.target.value })} /></div>
            <div><Label>Fix</Label><Textarea rows={3} value={form.fix} onChange={e => setForm({ ...form, fix: e.target.value })} /></div>
            <div><Label>Prevention</Label><Input value={form.prevention} onChange={e => setForm({ ...form, prevention: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Files Changed (comma-sep)</Label><Input value={form.files_changed} onChange={e => setForm({ ...form, files_changed: e.target.value })} /></div>
              <div><Label>Regression Tests (comma-sep)</Label><Input value={form.regression_tests} onChange={e => setForm({ ...form, regression_tests: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Time to Resolve (hrs)</Label><Input type="number" value={form.time_to_resolve_hours} onChange={e => setForm({ ...form, time_to_resolve_hours: e.target.value })} /></div>
              <div><Label>Module</Label><Input value={form.module} onChange={e => setForm({ ...form, module: e.target.value })} /></div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="recur" checked={form.can_happen_again} onChange={e => setForm({ ...form, can_happen_again: e.target.checked })} />
              <Label htmlFor="recur" className="cursor-pointer">Can happen again</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!form.title || !form.symptoms}><Bug className="w-4 h-4 mr-1" />Record Bug</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}