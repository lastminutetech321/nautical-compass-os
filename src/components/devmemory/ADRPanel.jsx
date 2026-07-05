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
import { Plus, Search, Loader2, ScrollText } from "lucide-react";
import moment from "moment";

const STATUS_COLORS = { proposed: "bg-amber-100 text-amber-700", accepted: "bg-emerald-100 text-emerald-700", deprecated: "bg-slate-100 text-slate-600", superseded: "bg-red-100 text-red-700" };

export default function ADRPanel({ refreshKey }) {
  const [adrs, setAdrs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", status: "proposed", context: "", decision: "", consequences: "", future_implications: "", related_adr_ids: "", alternatives_considered: "", affected_modules: "", requires_founder_approval: false, tags: "" });

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.ADR.list('-created_date', 100);
    setAdrs(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [refreshKey]);

  const filtered = adrs.filter(a => !search || `${a.title} ${a.decision} ${a.context}`.toLowerCase().includes(search.toLowerCase()));

  const handleCreate = async () => {
    const parseList = (s) => s ? s.split(',').map(x => x.trim()).filter(Boolean) : [];
    await base44.entities.ADR.create({
      ...form,
      number: adrs.length + 1,
      alternatives_considered: parseList(form.alternatives_considered),
      affected_modules: parseList(form.affected_modules),
      related_adr_ids: parseList(form.related_adr_ids),
      tags: parseList(form.tags),
    });
    setShowCreate(false);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search ADRs..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-1" />New ADR</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground text-sm">No Architecture Decision Records yet. Record every architectural decision permanently.</Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(a => (
            <Card key={a.id} className="p-4 border border-border/60">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  {a.number && <Badge variant="outline" className="text-[9px] font-mono">ADR-{String(a.number).padStart(3, '0')}</Badge>}
                  <Badge className={`text-[9px] ${STATUS_COLORS[a.status] || STATUS_COLORS.proposed}`}>{a.status}</Badge>
                  {a.requires_founder_approval && <Badge className="text-[9px] bg-amber-100 text-amber-700">Founder Approval</Badge>}
                </div>
                <span className="text-[9px] text-muted-foreground">{moment(a.created_date).format("MMM D, YYYY")}</span>
              </div>
              <p className="text-sm font-semibold mb-1 flex items-center gap-1.5"><ScrollText className="w-3.5 h-3.5 text-violet-600" />{a.title}</p>
              {a.context && <p className="text-xs text-muted-foreground mb-1"><span className="font-medium">Problem:</span> {a.context}</p>}
              {a.decision && <p className="text-xs text-muted-foreground mb-1"><span className="font-medium">Decision:</span> {a.decision}</p>}
              {a.consequences && <p className="text-xs text-muted-foreground mb-1"><span className="font-medium">Tradeoffs:</span> {a.consequences}</p>}
              {a.future_implications && <p className="text-xs text-muted-foreground mb-1"><span className="font-medium">Future Implications:</span> {a.future_implications}</p>}
              {a.related_adr_ids?.length > 0 && (
                <div className="mt-1"><p className="text-[10px] font-medium text-muted-foreground">Related Decisions:</p><div className="flex flex-wrap gap-1">{a.related_adr_ids.map((r, i) => <Badge key={i} variant="outline" className="text-[8px] font-mono">{r}</Badge>)}</div></div>
              )}
              {a.alternatives_considered?.length > 0 && (
                <div className="mt-1"><p className="text-[10px] font-medium text-muted-foreground">Alternatives:</p><div className="flex flex-wrap gap-1">{a.alternatives_considered.map((alt, i) => <Badge key={i} variant="outline" className="text-[8px]">{alt}</Badge>)}</div></div>
              )}
              {a.affected_modules?.length > 0 && (
                <div className="mt-1"><p className="text-[10px] font-medium text-muted-foreground">Affected Systems:</p><div className="flex flex-wrap gap-1">{a.affected_modules.map((m, i) => <Badge key={i} variant="outline" className="text-[8px]">{m}</Badge>)}</div></div>
              )}
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Architecture Decision Record</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>Problem Solved (Context)</Label><Textarea rows={3} value={form.context} onChange={e => setForm({ ...form, context: e.target.value })} /></div>
            <div><Label>Decision</Label><Textarea rows={3} value={form.decision} onChange={e => setForm({ ...form, decision: e.target.value })} /></div>
            <div><Label>Tradeoffs / Consequences</Label><Textarea rows={3} value={form.consequences} onChange={e => setForm({ ...form, consequences: e.target.value })} /></div>
            <div><Label>Future Implications</Label><Textarea rows={2} value={form.future_implications} onChange={e => setForm({ ...form, future_implications: e.target.value })} placeholder="How this decision affects future development..." /></div>
            <div><Label>Related Decisions (ADR numbers or titles, comma-sep)</Label><Input value={form.related_adr_ids} onChange={e => setForm({ ...form, related_adr_ids: e.target.value })} placeholder="ADR-001, ADR-003" /></div>
            <div><Label>Alternatives Considered (comma-sep)</Label><Input value={form.alternatives_considered} onChange={e => setForm({ ...form, alternatives_considered: e.target.value })} placeholder="alt1, alt2, alt3" /></div>
            <div><Label>Affected Systems (comma-sep)</Label><Input value={form.affected_modules} onChange={e => setForm({ ...form, affected_modules: e.target.value })} placeholder="Evidence Vault, Canon, JurisEngine" /></div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="founder" checked={form.requires_founder_approval} onChange={e => setForm({ ...form, requires_founder_approval: e.target.checked })} />
              <Label htmlFor="founder" className="cursor-pointer">Requires Founder Approval</Label>
            </div>
            <div><Label>Tags (comma-sep)</Label><Input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!form.title}><ScrollText className="w-4 h-4 mr-1" />Record ADR</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}