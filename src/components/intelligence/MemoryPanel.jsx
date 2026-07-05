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
import { Brain, Plus, Search, Loader2, Trash2, Link2 } from "lucide-react";
import moment from "moment";

const MEMORY_TYPES = [
  { value: "decision", label: "Decision Memory" },
  { value: "organization", label: "Organization Memory" },
  { value: "business", label: "Business Memory" },
  { value: "engineering", label: "Engineering Memory" },
  { value: "legal", label: "Legal Memory" },
  { value: "evidence", label: "Evidence Memory" },
  { value: "revenue", label: "Revenue Memory" },
  { value: "operational", label: "Operational Memory" },
];

const TYPE_COLORS = {
  decision: "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
  organization: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  business: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  engineering: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  legal: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300",
  evidence: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300",
  revenue: "bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300",
  operational: "bg-slate-100 text-slate-700 dark:bg-slate-800/40 dark:text-slate-300",
};

export default function MemoryPanel({ refreshKey }) {
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("all");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newMemory, setNewMemory] = useState({ memory_type: "operational", title: "", content: "", source_module: "", importance_score: 50, tags: "" });

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.MemoryRecord.list('-created_date', 200);
    setMemories(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [refreshKey]);

  const filtered = memories.filter(m => {
    if (filterType !== "all" && m.memory_type !== filterType) return false;
    if (search && !`${m.title} ${m.content} ${m.summary}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleCreate = async () => {
    await base44.functions.invoke('ncIntelligence', {
      operation: 'ingest_memory',
      params: {
        memory_type: newMemory.memory_type,
        title: newMemory.title,
        content: newMemory.content,
        source_module: newMemory.source_module,
        importance_score: Number(newMemory.importance_score),
        tags: newMemory.tags ? newMemory.tags.split(',').map(t => t.trim()) : [],
      }
    });
    setShowCreate(false);
    setNewMemory({ memory_type: "operational", title: "", content: "", source_module: "", importance_score: 50, tags: "" });
    load();
  };

  const handleDelete = async (id) => {
    await base44.entities.MemoryRecord.delete(id);
    load();
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search memories..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filter by type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {MEMORY_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-1" />Add Memory</Button>
      </div>

      {/* Memory List */}
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground text-sm">No memory records found. Add one to start building intelligence.</Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map(m => (
            <Card key={m.id} className="p-4 border border-border/60">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <Badge className={`text-[9px] ${TYPE_COLORS[m.memory_type] || TYPE_COLORS.operational}`}>{m.memory_type}</Badge>
                  {m.importance_score >= 70 && <Badge className="text-[9px] bg-amber-100 text-amber-700">High Priority</Badge>}
                </div>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleDelete(m.id)}><Trash2 className="w-3 h-3" /></Button>
              </div>
              <p className="text-sm font-semibold mb-1">{m.title}</p>
              <p className="text-xs text-muted-foreground line-clamp-3">{m.content}</p>
              {m.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {m.tags.slice(0, 4).map((t, i) => <Badge key={i} variant="outline" className="text-[8px]">{t}</Badge>)}
                </div>
              )}
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/40 text-[9px] text-muted-foreground">
                <span>{m.source_module || "—"} · {moment(m.created_date).fromNow()}</span>
                <span className="flex items-center gap-1"><Link2 className="w-3 h-3" />{m.consumption_count || 0} uses</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Ingest New Memory</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Memory Type</Label>
              <Select value={newMemory.memory_type} onValueChange={v => setNewMemory({ ...newMemory, memory_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{MEMORY_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Title</Label>
              <Input value={newMemory.title} onChange={e => setNewMemory({ ...newMemory, title: e.target.value })} />
            </div>
            <div>
              <Label>Content</Label>
              <Textarea rows={4} value={newMemory.content} onChange={e => setNewMemory({ ...newMemory, content: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Source Module</Label>
                <Input value={newMemory.source_module} onChange={e => setNewMemory({ ...newMemory, source_module: e.target.value })} placeholder="e.g. Evidence Vault" />
              </div>
              <div>
                <Label>Importance (0-100)</Label>
                <Input type="number" min={0} max={100} value={newMemory.importance_score} onChange={e => setNewMemory({ ...newMemory, importance_score: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Tags (comma-separated)</Label>
              <Input value={newMemory.tags} onChange={e => setNewMemory({ ...newMemory, tags: e.target.value })} placeholder="legal, housing, nc" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!newMemory.title || !newMemory.content}><Brain className="w-4 h-4 mr-1" />Ingest</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}