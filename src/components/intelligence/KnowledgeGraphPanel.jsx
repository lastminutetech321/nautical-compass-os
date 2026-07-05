import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Network, Loader2, RefreshCw, Zap, Circle, ArrowRight } from "lucide-react";

const EDGE_COLORS = {
  depends_on: "border-red-300 bg-red-50 dark:bg-red-950/20",
  references: "border-blue-300 bg-blue-50 dark:bg-blue-950/20",
  related_to: "border-slate-300 bg-slate-50 dark:bg-slate-800/30",
  blocks: "border-red-400 bg-red-100 dark:bg-red-900/30",
  enables: "border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20",
  supersedes: "border-amber-300 bg-amber-50 dark:bg-amber-950/20",
  cites: "border-violet-300 bg-violet-50 dark:bg-violet-950/20",
  supports: "border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20",
  consumes: "border-teal-300 bg-teal-50 dark:bg-teal-950/20",
};

export default function KnowledgeGraphPanel({ refreshKey }) {
  const [graph, setGraph] = useState(null);
  const [loading, setLoading] = useState(false);

  const buildGraph = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('ncIntelligence', { operation: 'build_knowledge_graph', params: {} });
      setGraph(res.data?.graph);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useState(() => { buildGraph(); }, [refreshKey]);

  const stats = graph?.stats || {};
  const nodes = graph?.nodes || [];
  const edges = graph?.edges || [];
  const topNodes = stats.top_connected_nodes || [];
  const typeDist = stats.type_distribution || {};

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold flex items-center gap-2"><Network className="w-4 h-4 text-violet-600" />Knowledge Graph</h3>
        <Button size="sm" variant="outline" onClick={buildGraph} disabled={loading}>
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />}
          {loading ? "Building…" : "Rebuild"}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : graph ? (
        <>
          {/* Graph Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <Card className="p-2.5 border border-border/60 text-center"><Circle className="w-3.5 h-3.5 text-violet-600 mx-auto mb-0.5" /><p className="text-lg font-bold">{stats.total_nodes}</p><p className="text-[9px] text-muted-foreground">Nodes</p></Card>
            <Card className="p-2.5 border border-border/60 text-center"><ArrowRight className="w-3.5 h-3.5 text-blue-600 mx-auto mb-0.5" /><p className="text-lg font-bold">{stats.total_edges}</p><p className="text-[9px] text-muted-foreground">Edges</p></Card>
            <Card className="p-2.5 border border-border/60 text-center"><Zap className="w-3.5 h-3.5 text-amber-600 mx-auto mb-0.5" /><p className="text-lg font-bold">{stats.total_memories_indexed}</p><p className="text-[9px] text-muted-foreground">Indexed Memories</p></Card>
            <Card className="p-2.5 border border-border/60 text-center"><Network className="w-3.5 h-3.5 text-emerald-600 mx-auto mb-0.5" /><p className="text-lg font-bold">{stats.avg_connections}</p><p className="text-[9px] text-muted-foreground">Avg Connections</p></Card>
            <Card className="p-2.5 border border-border/60 text-center"><Circle className="w-3.5 h-3.5 text-red-600 mx-auto mb-0.5" /><p className="text-lg font-bold">{Object.keys(typeDist).length}</p><p className="text-[9px] text-muted-foreground">Entity Types</p></Card>
          </div>

          {/* Top Connected Nodes */}
          {topNodes.length > 0 && (
            <Card className="p-4 border border-border/60">
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Most Connected Nodes</p>
              <div className="space-y-1">
                {topNodes.map((n, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="truncate font-medium">{n.name || n.id.slice(-8)}</span>
                    <Badge variant="outline" className="text-[9px]">{n.connections} connections</Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Entity Type Distribution */}
          <Card className="p-4 border border-border/60">
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Entity Type Distribution</p>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(typeDist).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
                <Badge key={type} variant="outline" className="text-[10px]">{type}: {count}</Badge>
              ))}
            </div>
          </Card>

          {/* Edges (Relationships in graph) */}
          <Card className="p-4 border border-border/60">
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Graph Edges ({edges.length})</p>
            {edges.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-3">No edges. Run relationship discovery to build connections.</p>
            ) : (
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {edges.slice(0, 50).map((e, i) => (
                  <div key={i} className={`p-2 rounded border text-[10px] ${EDGE_COLORS[e.type] || EDGE_COLORS.related_to}`}>
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold truncate flex-1">{e.source_name || e.source?.slice(-8)}</span>
                      <ArrowRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      <span className="font-semibold truncate flex-1">{e.target_name || e.target?.slice(-8)}</span>
                      <Badge variant="outline" className="text-[8px] flex-shrink-0">{e.type}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      ) : (
        <Card className="p-8 text-center border border-dashed border-border/40">
          <Network className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-xs text-muted-foreground mb-3">Knowledge graph not built yet.</p>
          <Button size="sm" onClick={buildGraph}><Network className="w-3.5 h-3.5 mr-1" />Build Knowledge Graph</Button>
        </Card>
      )}
    </div>
  );
}