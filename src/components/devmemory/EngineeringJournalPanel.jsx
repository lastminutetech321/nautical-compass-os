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
import { Plus, Search, Loader2, Clock, TrendingUp, CheckCircle } from "lucide-react";
import moment from "moment";

const ENTRY_TYPES = ["feature_build", "bug_fix", "refactor", "entity_creation", "page_creation", "component_change", "function_add", "integration", "config_change", "deployment", "research", "other"];
const VALUE_COLORS = { none: "bg-slate-100 text-slate-600", low: "bg-blue-100 text-blue-700", medium: "bg-amber-100 text-amber-700", high: "bg-emerald-100 text-emerald-700", critical: "bg-violet-100 text-violet-700" };

export default function EngineeringJournalPanel({ refreshKey }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", entry_type: "feature_build", sprint: "", reason_for_change: "", expected_outcome: "", actual_outcome: "", readiness_increase: 0, ai_employee_responsible: "", time_required_hours: 0, business_value: "medium", revenue_impact: "", files_modified: "", entities_created: "", functions_added: "", pages_created: "", components_changed: "", dependencies_created: "", dependencies_removed: "", module: "", tags: "" });

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.EngineeringJournal.list('-created_date', 200);
    setEntries(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [refreshKey]);

  const filtered = entries.filter(e => !search || `${e.title} ${e.reason_for_change} ${e.module}`.toLowerCase().includes(search.toLowerCase()));

  const handleCreate = async () => {
    const parseList = (s) => s ? s.split(',').map(x => x.trim()).filter(Boolean) : [];
    await base44.entities.EngineeringJournal.create({
      ...form,
      readiness_increase: Number(form.readiness_increase) || 0,
      time_required_hours: Number(form.time_required_hours) || 0,
      files_modified: parseList(form.files_modified),
      entities_created: parseList(form.entities_created),
      functions_added: parseList(form.functions_added),
      pages_created: parseList(form.pages_created),
      components_changed: parseList(form.components_changed),
      dependencies_created: parseList(form.dependencies_created),
      dependencies_removed: parseList(form.dependencies_removed),
      tags: parseList(form.tags),
      timestamp: new Date().toISOString(),
    });
    setShowCreate(false);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search journal entries..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-1" />Add Entry</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground text-sm">No journal entries yet. Every engineering action should be recorded here.</Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(e => (
            <Card key={e.id} className="p-4 border border-border/60">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className="text-[9px] bg-blue-100 text-blue-700">{e.entry_type?.replace(/_/g, " ")}</Badge>
                  {e.sprint && <Badge variant="outline" className="text-[9px]">{e.sprint}</Badge>}
                  <Badge className={`text-[9px] ${VALUE_COLORS[e.business_value] || VALUE_COLORS.medium}`}>{e.business_value} value</Badge>
                  {e.founder_approval && <Badge className="text-[9px] bg-emerald-100 text-emerald-700"><CheckCircle className="w-2.5 h-2.5 mr-0.5" />Founder Approved</Badge>}
                </div>
                <span className="text-[9px] text-muted-foreground">{moment(e.timestamp || e.created_date).format("MMM D, HH:mm")}</span>
              </div>
              <p className="text-sm font-semibold mb-1">{e.title}</p>
              {e.reason_for_change && <p className="text-xs text-muted-foreground"><span className="font-medium">Reason:</span> {e.reason_for_change}</p>}
              {e.actual_outcome && <p className="text-xs text-muted-foreground"><span className="font-medium">Outcome:</span> {e.actual_outcome}</p>}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-[10px]">
                {e.files_modified?.length > 0 && <div><span className="text-muted-foreground">Files:</span> {e.files_modified.length}</div>}
                {e.entities_created?.length > 0 && <div><span className="text-muted-foreground">Entities:</span> {e.entities_created.length}</div>}
                {e.functions_added?.length > 0 && <div><span className="text-muted-foreground">Functions:</span> {e.functions_added.length}</div>}
                {e.pages_created?.length > 0 && <div><span className="text-muted-foreground">Pages:</span> {e.pages_created.length}</div>}
              </div>
              <div className="flex items-center gap-3 mt-2 pt-2 border-t border-border/40 text-[9px] text-muted-foreground">
                {e.time_required_hours > 0 && <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{e.time_required_hours}h</span>}
                {e.readiness_increase > 0 && <span className="flex items-center gap-0.5 text-emerald-600"><TrendingUp className="w-3 h-3" />+{e.readiness_increase}% readiness</span>}
                {e.ai_employee_responsible && <span>AI: {e.ai_employee_responsible}</span>}
                {e.module && <span>· {e.module}</span>}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Engineering Journal Entry</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Title</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>Entry Type</Label><Select value={form.entry_type} onValueChange={v => setForm({ ...form, entry_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{ENTRY_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Sprint</Label><Input value={form.sprint} onChange={e => setForm({ ...form, sprint: e.target.value })} placeholder="e.g. Sprint 7" /></div>
              <div><Label>Module</Label><Input value={form.module} onChange={e => setForm({ ...form, module: e.target.value })} placeholder="e.g. Evidence Vault" /></div>
            </div>
            <div><Label>Reason for Change</Label><Textarea rows={2} value={form.reason_for_change} onChange={e => setForm({ ...form, reason_for_change: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Expected Outcome</Label><Textarea rows={2} value={form.expected_outcome} onChange={e => setForm({ ...form, expected_outcome: e.target.value })} /></div>
              <div><Label>Actual Outcome</Label><Textarea rows={2} value={form.actual_outcome} onChange={e => setForm({ ...form, actual_outcome: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Readiness Increase (%)</Label><Input type="number" value={form.readiness_increase} onChange={e => setForm({ ...form, readiness_increase: e.target.value })} /></div>
              <div><Label>Time Required (hrs)</Label><Input type="number" value={form.time_required_hours} onChange={e => setForm({ ...form, time_required_hours: e.target.value })} /></div>
              <div><Label>Business Value</Label><Select value={form.business_value} onValueChange={v => setForm({ ...form, business_value: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["none", "low", "medium", "high", "critical"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div><Label>AI Employee Responsible</Label><Input value={form.ai_employee_responsible} onChange={e => setForm({ ...form, ai_employee_responsible: e.target.value })} placeholder="e.g. CTO Agent" /></div>
            <div><Label>Revenue Impact</Label><Input value={form.revenue_impact} onChange={e => setForm({ ...form, revenue_impact: e.target.value })} placeholder="e.g. +$500/mo MRR potential" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Files Modified (comma-sep)</Label><Input value={form.files_modified} onChange={e => setForm({ ...form, files_modified: e.target.value })} /></div>
              <div><Label>Entities Created (comma-sep)</Label><Input value={form.entities_created} onChange={e => setForm({ ...form, entities_created: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Functions Added (comma-sep)</Label><Input value={form.functions_added} onChange={e => setForm({ ...form, functions_added: e.target.value })} /></div>
              <div><Label>Pages Created (comma-sep)</Label><Input value={form.pages_created} onChange={e => setForm({ ...form, pages_created: e.target.value })} /></div>
            </div>
            <div><Label>Tags (comma-sep)</Label><Input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!form.title}><Clock className="w-4 h-4 mr-1" />Record Entry</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}