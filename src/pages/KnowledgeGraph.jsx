import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Brain, Plus, Search, Link2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const nodeTypes = ["project","case","evidence","person","company","law","agent","automation","integration","document","conversation","feature","blueprint","concept"];
const typeColors = {
  project: "bg-blue-50 text-blue-700 border-blue-200", case: "bg-red-50 text-red-700 border-red-200",
  evidence: "bg-amber-50 text-amber-700 border-amber-200", person: "bg-emerald-50 text-emerald-700 border-emerald-200",
  company: "bg-violet-50 text-violet-700 border-violet-200", law: "bg-slate-50 text-slate-700 border-slate-200",
  agent: "bg-indigo-50 text-indigo-700 border-indigo-200", automation: "bg-cyan-50 text-cyan-700 border-cyan-200",
  integration: "bg-orange-50 text-orange-700 border-orange-200", document: "bg-pink-50 text-pink-700 border-pink-200",
  feature: "bg-teal-50 text-teal-700 border-teal-200", blueprint: "bg-purple-50 text-purple-700 border-purple-200",
  concept: "bg-slate-50 text-slate-600 border-slate-200"
};

export default function KnowledgeGraph() {
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [autoCapturing, setAutoCapturing] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", node_type: "concept", tags: "", department: "", importance: "medium" });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    base44.entities.KnowledgeNode.list("-created_date", 200).then(setNodes).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const data = { ...form, tags: form.tags.split(",").map(t => t.trim()).filter(Boolean), linked_node_ids: [] };
    const created = await base44.entities.KnowledgeNode.create(data);
    setSaving(false);
    setFormOpen(false);
    setForm({ title: "", content: "", node_type: "concept", tags: "", department: "", importance: "medium" });
    load();
    setSelected(created);
  };

  const autoCapture = async () => {
    setAutoCapturing(true);
    const [projects, agents, features, evidence] = await Promise.all([
      base44.entities.Project.list("-created_date", 10),
      base44.entities.AgentProfile.list("-created_date", 10),
      base44.entities.FeatureRequest.list("-created_date", 10).catch(() => []),
      base44.entities.Evidence.list("-created_date", 10).catch(() => []),
    ]);
    const toCreate = [
      ...projects.map(p => ({ title: p.name, content: p.description || "", node_type: "project", source_entity_id: p.id, source_entity_type: "Project", importance: "high", tags: [], linked_node_ids: [] })),
      ...agents.map(a => ({ title: a.name, content: a.purpose || "", node_type: "agent", source_entity_id: a.id, source_entity_type: "AgentProfile", importance: "high", tags: [], linked_node_ids: [] })),
      ...features.map(f => ({ title: f.title, content: f.plain_description || "", node_type: "feature", source_entity_id: f.id, source_entity_type: "FeatureRequest", importance: "medium", tags: [], linked_node_ids: [] })),
      ...evidence.map(ev => ({ title: ev.title, content: ev.notes || "", node_type: "evidence", source_entity_id: ev.id, source_entity_type: "Evidence", importance: "high", tags: ev.tags || [], linked_node_ids: [] })),
    ];
    await Promise.all(toCreate.map(n => base44.entities.KnowledgeNode.create(n)));
    setAutoCapturing(false);
    load();
  };

  const filtered = nodes.filter(n => {
    if (search && !n.title.toLowerCase().includes(search.toLowerCase()) && !(n.content || "").toLowerCase().includes(search.toLowerCase())) return false;
    if (typeFilter !== "all" && n.node_type !== typeFilter) return false;
    return true;
  });

  // Group by type
  const grouped = filtered.reduce((acc, n) => {
    if (!acc[n.node_type]) acc[n.node_type] = [];
    acc[n.node_type].push(n);
    return acc;
  }, {});

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">NCOS · Knowledge</p>
          <h1 className="text-2xl font-bold tracking-tight">Knowledge Graph</h1>
          <p className="text-sm text-muted-foreground">{nodes.length} nodes · shared memory across all departments</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={autoCapture} disabled={autoCapturing}>
            {autoCapturing ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Brain className="w-4 h-4 mr-1.5" />}
            Auto-Capture
          </Button>
          <Button size="sm" onClick={() => setFormOpen(true)}><Plus className="w-4 h-4 mr-1.5" />Add Node</Button>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 mb-5 text-xs text-blue-700">
        <Brain className="w-3.5 h-3.5 inline mr-1.5" />Everything learned anywhere becomes reusable everywhere. Use Auto-Capture to sync data from all modules.
      </div>

      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search knowledge..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-36 h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {nodeTypes.map(t => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Type summary chips */}
      <div className="flex flex-wrap gap-2 mb-5">
        {Object.entries(grouped).map(([type, items]) => (
          <button key={type} onClick={() => setTypeFilter(typeFilter === type ? "all" : type)} className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${typeColors[type] || "bg-slate-50 text-slate-600 border-slate-200"} ${typeFilter === type ? "ring-2 ring-primary/30" : ""}`}>
            {type} · {items.length}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Brain className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
          <p className="text-muted-foreground text-sm">No knowledge nodes yet. Use Auto-Capture or add manually.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map(node => (
            <Card key={node.id} className="p-4 border border-border/60 hover:shadow-md transition-all cursor-pointer" onClick={() => setSelected(node)}>
              <div className="flex items-start justify-between mb-2 gap-2">
                <p className="text-sm font-semibold line-clamp-2">{node.title}</p>
                <Badge variant="outline" className={`text-[10px] border flex-shrink-0 ${typeColors[node.node_type] || ""}`}>{node.node_type}</Badge>
              </div>
              {node.content && <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{node.content}</p>}
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-1">
                  {(node.tags || []).slice(0, 3).map(t => <Badge key={t} variant="secondary" className="text-[10px] px-1.5">{t}</Badge>)}
                </div>
                {node.department && <span className="text-[10px] text-muted-foreground">{node.department}</span>}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Node detail */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        {selected && (
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle>{selected.title}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline" className={`text-xs border ${typeColors[selected.node_type] || ""}`}>{selected.node_type}</Badge>
                {selected.importance && <Badge variant="outline" className="text-xs">{selected.importance} importance</Badge>}
                {selected.department && <Badge variant="secondary" className="text-xs">{selected.department}</Badge>}
              </div>
              {selected.content && <div className="bg-muted p-3 rounded-lg text-sm whitespace-pre-wrap">{selected.content}</div>}
              {(selected.tags || []).length > 0 && <div className="flex flex-wrap gap-1">{selected.tags.map(t => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}</div>}
              {selected.source_entity_type && <p className="text-xs text-muted-foreground flex items-center gap-1"><Link2 className="w-3 h-3" />Source: {selected.source_entity_type}</p>}
            </div>
          </DialogContent>
        )}
      </Dialog>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Add Knowledge Node</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><Label>Title</Label><Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select value={form.node_type} onValueChange={v => setForm({...form, node_type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{nodeTypes.map(t => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Importance</Label>
                <Select value={form.importance} onValueChange={v => setForm({...form, importance: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["low","medium","high","critical"].map(i => <SelectItem key={i} value={i}>{i.charAt(0).toUpperCase()+i.slice(1)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Content / Notes</Label><Textarea value={form.content} onChange={e => setForm({...form, content: e.target.value})} rows={4} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Department</Label><Input value={form.department} onChange={e => setForm({...form, department: e.target.value})} /></div>
              <div><Label>Tags (comma-separated)</Label><Input value={form.tags} onChange={e => setForm({...form, tags: e.target.value})} /></div>
            </div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? "Saving..." : "Add Node"}</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}