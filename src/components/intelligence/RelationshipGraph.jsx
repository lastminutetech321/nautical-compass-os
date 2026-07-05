import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Network, Loader2, Sparkles, ArrowRight, GitBranch } from "lucide-react";

const REL_COLORS = {
  depends_on: "bg-amber-100 text-amber-700",
  references: "bg-blue-100 text-blue-700",
  related_to: "bg-slate-100 text-slate-700",
  blocks: "bg-red-100 text-red-700",
  enables: "bg-emerald-100 text-emerald-700",
  supersedes: "bg-violet-100 text-violet-700",
  cites: "bg-indigo-100 text-indigo-700",
  owns: "bg-teal-100 text-teal-700",
  part_of: "bg-cyan-100 text-cyan-700",
  derives_from: "bg-orange-100 text-orange-700",
  contradicts: "bg-red-100 text-red-700",
  supports: "bg-emerald-100 text-emerald-700",
  generated_by: "bg-violet-100 text-violet-700",
  consumes: "bg-blue-100 text-blue-700",
};

const ENTITY_TYPES = ["CanonEntry", "BuildRegistry", "AgentProfile", "Evidence", "Task", "Project", "CRMLead", "CRMOpportunity", "Subscription", "Resource", "AuthorityInteraction", "WorkerProfile", "MemoryRecord", "DecisionRecord"];

export default function RelationshipGraph({ refreshKey }) {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [discovering, setDiscovering] = useState(false);
  const [selectedType, setSelectedType] = useState("CanonEntry");
  const [entities, setEntities] = useState([]);
  const [selectedEntity, setSelectedEntity] = useState("");

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.RelationshipLink.list('-created_date', 200);
    setLinks(data);
    setLoading(false);
  };

  const loadEntities = async (type) => {
    setSelectedType(type);
    try {
      const data = await base44.entities[type].list('-created_date', 50);
      setEntities(data);
      setSelectedEntity("");
    } catch { setEntities([]); }
  };

  useEffect(() => { load(); }, [refreshKey]);

  const discoverRelationships = async () => {
    if (!selectedEntity) return;
    setDiscovering(true);
    try {
      await base44.functions.invoke('ncIntelligence', {
        operation: 'discover_relationships',
        params: { entity_type: selectedType, entity_id: selectedEntity }
      });
      load();
    } catch (e) { console.error(e); }
    setDiscovering(false);
  };

  // Group links by source entity for graph visualization
  const graphNodes = [...new Set(links.flatMap(l => [`${l.source_entity_type}:${l.source_entity_name}`, `${l.target_entity_type}:${l.target_entity_name}`]))];

  return (
    <div className="space-y-4">
      {/* Discovery Controls */}
      <Card className="p-4 border border-blue-200 bg-blue-50 dark:bg-blue-950/20">
        <p className="text-xs font-bold uppercase mb-3 flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-blue-600" />AI Relationship Discovery</p>
        <div className="flex items-end gap-2 flex-wrap">
          <div className="flex-1 min-w-[150px]">
            <label className="text-[10px] text-muted-foreground">Entity Type</label>
            <Select value={selectedType} onValueChange={loadEntities}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ENTITY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="text-[10px] text-muted-foreground">Select Entity</label>
            <Select value={selectedEntity} onValueChange={setSelectedEntity}>
              <SelectTrigger><SelectValue placeholder="Choose entity..." /></SelectTrigger>
              <SelectContent>
                {entities.map(e => <SelectItem key={e.id} value={e.id}>{e.title || e.name || e.id.slice(0, 8)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={discoverRelationships} disabled={!selectedEntity || discovering}>
            {discovering ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Network className="w-4 h-4 mr-1" />}
            {discovering ? "Discovering..." : "Discover Relationships"}
          </Button>
        </div>
      </Card>

      {/* Graph Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 text-center"><p className="text-2xl font-bold">{graphNodes.length}</p><p className="text-[10px] text-muted-foreground">Graph Nodes</p></Card>
        <Card className="p-3 text-center"><p className="text-2xl font-bold">{links.length}</p><p className="text-[10px] text-muted-foreground">Relationship Edges</p></Card>
        <Card className="p-3 text-center"><p className="text-2xl font-bold">{links.filter(l => l.verified).length}</p><p className="text-[10px] text-muted-foreground">Verified</p></Card>
      </div>

      {/* Relationship List */}
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : links.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground text-sm">No relationships discovered yet. Use the discovery tool above to find relationships between entities.</Card>
      ) : (
        <div className="space-y-2">
          {links.map(link => (
            <Card key={link.id} className="p-3 border border-border/60">
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <div className="flex-1 min-w-0">
                  <span className="font-semibold truncate">{link.source_entity_name || link.source_entity_id.slice(0, 8)}</span>
                  <span className="text-[9px] text-muted-foreground ml-1">({link.source_entity_type})</span>
                </div>
                <div className="flex items-center gap-1">
                  <ArrowRight className="w-3 h-3 text-muted-foreground" />
                  <Badge className={`text-[9px] ${REL_COLORS[link.relationship_type] || REL_COLORS.related_to}`}>{link.relationship_type.replace(/_/g, " ")}</Badge>
                  <ArrowRight className="w-3 h-3 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0 text-right">
                  <span className="font-semibold truncate">{link.target_entity_name || link.target_entity_id.slice(0, 8)}</span>
                  <span className="text-[9px] text-muted-foreground ml-1">({link.target_entity_type})</span>
                </div>
                <Badge variant="outline" className="text-[9px]">{link.strength}%</Badge>
                {link.verified && <Badge className="text-[9px] bg-emerald-100 text-emerald-700">✓</Badge>}
              </div>
              {link.description && <p className="text-[10px] text-muted-foreground mt-1">{link.description}</p>}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}