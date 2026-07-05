import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Brain, Loader2, Sparkles, Network, TrendingUp, Search, Database, Zap, RefreshCw, Plug } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MemoryPanel from "@/components/intelligence/MemoryPanel";
import RelationshipGraph from "@/components/intelligence/RelationshipGraph";
import PatternPanel from "@/components/intelligence/PatternPanel";
import RecommendationPanel from "@/components/intelligence/RecommendationPanel";
import SemanticSearchPanel from "@/components/intelligence/SemanticSearchPanel";
import KnowledgeGraphPanel from "@/components/intelligence/KnowledgeGraphPanel";
import ModuleIntegrationPanel from "@/components/intelligence/ModuleIntegrationPanel";

const MEMORY_TYPES = [
  { key: "decision", label: "Decision Memory", icon: Brain, color: "text-violet-600", bg: "bg-violet-100 dark:bg-violet-950/30" },
  { key: "organization", label: "Organization Memory", icon: Network, color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-950/30" },
  { key: "business", label: "Business Memory", icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-100 dark:bg-emerald-950/30" },
  { key: "engineering", label: "Engineering Memory", icon: Zap, color: "text-amber-600", bg: "bg-amber-100 dark:bg-amber-950/30" },
  { key: "legal", label: "Legal Memory", icon: Brain, color: "text-indigo-600", bg: "bg-indigo-100 dark:bg-indigo-950/30" },
  { key: "evidence", label: "Evidence Memory", icon: Database, color: "text-red-600", bg: "bg-red-100 dark:bg-red-950/30" },
  { key: "revenue", label: "Revenue Memory", icon: TrendingUp, color: "text-teal-600", bg: "bg-teal-100 dark:bg-teal-950/30" },
  { key: "operational", label: "Operational Memory", icon: RefreshCw, color: "text-slate-600", bg: "bg-slate-100 dark:bg-slate-800/30" },
];

export default function NCIntelligence() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchOverview = async () => {
    try {
      const res = await base44.functions.invoke('ncIntelligence', { operation: 'overview', params: {} });
      setOverview(res.data?.overview);
    } catch (e) {
      // Fallback: direct entity counts
      const [memories, patterns, recs, rels, idx] = await Promise.all([
        base44.entities.MemoryRecord.list('-created_date', 500).catch(() => []),
        base44.entities.PatternRecord.list('-created_date', 100).catch(() => []),
        base44.entities.Recommendation.list('-created_date', 100).catch(() => []),
        base44.entities.RelationshipLink.list('-created_date', 200).catch(() => []),
        base44.entities.SemanticIndex.list('-created_date', 200).catch(() => []),
      ]);
      const memoryByType = {};
      memories.forEach(m => { memoryByType[m.memory_type] = (memoryByType[m.memory_type] || 0) + 1; });
      setOverview({
        total_memories: memories.length, memory_by_type: memoryByType,
        total_patterns: patterns.length, confirmed_patterns: patterns.filter(p => p.status === 'confirmed').length,
        total_recommendations: recs.length, pending_recommendations: recs.filter(r => r.status === 'pending').length,
        accepted_recommendations: recs.filter(r => r.status === 'accepted' || r.status === 'implemented').length,
        total_relationships: rels.length, verified_relationships: rels.filter(r => r.verified).length,
        indexed_entities: idx.length, stale_index: idx.filter(s => s.status === 'stale').length,
      });
    }
    setLoading(false);
  };

  useEffect(() => { fetchOverview(); }, [refreshKey]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">NCOS · Intelligence Layer</p>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Brain className="w-6 h-6 text-primary" />NC Intelligence
          </h1>
          <p className="text-muted-foreground text-sm">Every action improves platform intelligence · Every module consumes this layer</p>
        </div>
        <Button onClick={() => setRefreshKey(k => k + 1)} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-1.5" />Refresh
        </Button>
      </div>

      {/* Intelligence Overview Stats */}
      {loading ? (
        <div className="flex items-center justify-center h-32"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : overview ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card className="p-3 border border-violet-200 bg-violet-50 dark:bg-violet-950/20">
            <Database className="w-4 h-4 text-violet-600 mb-1" />
            <p className="text-2xl font-bold">{overview.total_memories}</p>
            <p className="text-[10px] text-muted-foreground">Memory Records</p>
          </Card>
          <Card className="p-3 border border-amber-200 bg-amber-50 dark:bg-amber-950/20">
            <TrendingUp className="w-4 h-4 text-amber-600 mb-1" />
            <p className="text-2xl font-bold">{overview.total_patterns}</p>
            <p className="text-[10px] text-muted-foreground">Patterns Detected</p>
          </Card>
          <Card className="p-3 border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20">
            <Sparkles className="w-4 h-4 text-emerald-600 mb-1" />
            <p className="text-2xl font-bold">{overview.pending_recommendations}</p>
            <p className="text-[10px] text-muted-foreground">Pending Recs</p>
          </Card>
          <Card className="p-3 border border-blue-200 bg-blue-50 dark:bg-blue-950/20">
            <Network className="w-4 h-4 text-blue-600 mb-1" />
            <p className="text-2xl font-bold">{overview.total_relationships}</p>
            <p className="text-[10px] text-muted-foreground">Relationships</p>
          </Card>
          <Card className="p-3 border border-cyan-200 bg-cyan-50 dark:bg-cyan-950/20">
            <Search className="w-4 h-4 text-cyan-600 mb-1" />
            <p className="text-2xl font-bold">{overview.indexed_entities}</p>
            <p className="text-[10px] text-muted-foreground">Indexed Entities</p>
          </Card>
        </div>
      ) : null}

      {/* Memory Type Breakdown */}
      {overview?.memory_by_type && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
          {MEMORY_TYPES.map(mt => {
            const count = overview.memory_by_type[mt.key] || 0;
            return (
              <Card key={mt.key} className={`p-2.5 border border-border/60 ${mt.bg}`}>
                <mt.icon className={`w-3.5 h-3.5 ${mt.color} mb-1`} />
                <p className="text-lg font-bold">{count}</p>
                <p className="text-[9px] text-muted-foreground leading-tight">{mt.label}</p>
              </Card>
            );
          })}
        </div>
      )}

      {/* Main Tabs */}
      <Tabs defaultValue="knowledge">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="knowledge"><Network className="w-3.5 h-3.5 mr-1" />Knowledge Graph</TabsTrigger>
          <TabsTrigger value="graph"><Network className="w-3.5 h-3.5 mr-1" />Relationship Graph</TabsTrigger>
          <TabsTrigger value="patterns"><TrendingUp className="w-3.5 h-3.5 mr-1" />Patterns</TabsTrigger>
          <TabsTrigger value="recommendations"><Sparkles className="w-3.5 h-3.5 mr-1" />Recommendations</TabsTrigger>
          <TabsTrigger value="search"><Search className="w-3.5 h-3.5 mr-1" />Search & Similarity</TabsTrigger>
          <TabsTrigger value="memory"><Brain className="w-3.5 h-3.5 mr-1" />Memory</TabsTrigger>
          <TabsTrigger value="integration"><Plug className="w-3.5 h-3.5 mr-1" />Module Integration</TabsTrigger>
        </TabsList>

        <TabsContent value="knowledge" className="mt-4"><KnowledgeGraphPanel refreshKey={refreshKey} /></TabsContent>
        <TabsContent value="graph" className="mt-4"><RelationshipGraph refreshKey={refreshKey} /></TabsContent>
        <TabsContent value="patterns" className="mt-4"><PatternPanel refreshKey={refreshKey} /></TabsContent>
        <TabsContent value="recommendations" className="mt-4"><RecommendationPanel refreshKey={refreshKey} /></TabsContent>
        <TabsContent value="search" className="mt-4"><SemanticSearchPanel refreshKey={refreshKey} /></TabsContent>
        <TabsContent value="memory" className="mt-4"><MemoryPanel refreshKey={refreshKey} /></TabsContent>
        <TabsContent value="integration" className="mt-4"><ModuleIntegrationPanel refreshKey={refreshKey} /></TabsContent>
      </Tabs>
    </div>
  );
}