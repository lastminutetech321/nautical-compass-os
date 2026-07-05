import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Loader2, Copy, GitCompare, Sparkles, FileSearch } from "lucide-react";

const ENTITY_TYPES = ["CanonEntry", "BuildRegistry", "AgentProfile", "Evidence", "Task", "Project", "CRMLead", "CRMOpportunity", "Subscription", "Resource", "AuthorityInteraction", "WorkerProfile", "MemoryRecord"];

export default function SemanticSearchPanel({ refreshKey }) {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setSearchResults] = useState(null);
  const [dupEntityType, setDupEntityType] = useState("CanonEntry");
  const [detectingDups, setDetectingDups] = useState(false);
  const [dupResults, setDupResults] = useState(null);
  const [simEntityType, setSimEntityType] = useState("CanonEntry");
  const [entities, setEntities] = useState([]);
  const [selectedEntity, setSelectedEntity] = useState("");
  const [searchingSimilar, setSearchingSimilar] = useState(false);
  const [simResults, setSimResults] = useState(null);

  useEffect(() => { loadEntities(simEntityType); }, [refreshKey]);

  const loadEntities = async (type) => {
    setSimEntityType(type);
    try {
      const data = await base44.entities[type].list('-created_date', 50);
      setEntities(data);
      setSelectedEntity("");
    } catch { setEntities([]); }
  };

  const semanticSearch = async () => {
    if (!query) return;
    setSearching(true);
    try {
      const res = await base44.functions.invoke('ncIntelligence', {
        operation: 'semantic_search',
        params: { query }
      });
      setSearchResults(res.data?.result);
    } catch (e) { console.error(e); }
    setSearching(false);
  };

  const detectDuplicates = async () => {
    setDetectingDups(true);
    try {
      const res = await base44.functions.invoke('ncIntelligence', {
        operation: 'detect_duplicates',
        params: { entity_type: dupEntityType }
      });
      setDupResults(res.data?.result);
    } catch (e) { console.error(e); }
    setDetectingDups(false);
  };

  const similaritySearch = async () => {
    if (!selectedEntity) return;
    setSearchingSimilar(true);
    try {
      const res = await base44.functions.invoke('ncIntelligence', {
        operation: 'similarity_search',
        params: { entity_type: simEntityType, entity_id: selectedEntity, top_k: 5 }
      });
      setSimResults(res.data?.result);
    } catch (e) { console.error(e); }
    setSearchingSimilar(false);
  };

  return (
    <div className="space-y-4">
      {/* Semantic Search */}
      <Card className="p-4 border border-cyan-200 bg-cyan-50 dark:bg-cyan-950/20">
        <p className="text-xs font-bold uppercase mb-3 flex items-center gap-1.5"><Search className="w-3.5 h-3.5 text-cyan-600" />Semantic Search</p>
        <div className="flex gap-2">
          <Input placeholder="Search across all intelligence, memory, and indexed entities..." value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && semanticSearch()} />
          <Button onClick={semanticSearch} disabled={!query || searching}>
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </Button>
        </div>
        {results && (
          <div className="mt-3 space-y-2">
            <p className="text-[10px] text-muted-foreground">{results.search_summary} · {results.total_matches} matches</p>
            {results.results?.map((r, i) => (
              <div key={i} className="p-2 rounded bg-white dark:bg-card border border-border/40">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold">{r.title || r.entity_id?.slice(0, 8)}</p>
                  <Badge className="text-[9px] bg-cyan-100 text-cyan-700">{r.relevance_score}% match</Badge>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">{r.matched_snippet}</p>
                <p className="text-[9px] text-muted-foreground">{r.entity_type} · {r.source_module}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Duplicate Detection */}
      <Card className="p-4 border border-red-200 bg-red-50 dark:bg-red-950/20">
        <p className="text-xs font-bold uppercase mb-3 flex items-center gap-1.5"><Copy className="w-3.5 h-3.5 text-red-600" />Duplicate Detection</p>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="text-[10px] text-muted-foreground">Entity Type to Scan</label>
            <Select value={dupEntityType} onValueChange={setDupEntityType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ENTITY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Button onClick={detectDuplicates} disabled={detectingDups}>
            {detectingDups ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
            {detectingDups ? "Scanning..." : "Detect Duplicates"}
          </Button>
        </div>
        {dupResults && (
          <div className="mt-3 space-y-2">
            {dupResults.duplicate_groups?.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-2">No duplicates found.</p>
            ) : (
              dupResults.duplicate_groups?.map((g, i) => (
                <div key={i} className="p-2 rounded bg-white dark:bg-card border border-red-200/60">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold">Group {i + 1}: {g.duplicate_ids.length} duplicates</p>
                    <Badge className="text-[9px] bg-red-100 text-red-700">{g.confidence}% confidence</Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Primary: {g.primary_id?.slice(0, 8)}</p>
                  <p className="text-[10px] text-muted-foreground">Duplicates: {g.duplicate_ids.map(id => id.slice(0, 8)).join(", ")}</p>
                  <p className="text-[9px] text-muted-foreground italic">{g.reason}</p>
                </div>
              ))
            )}
          </div>
        )}
      </Card>

      {/* Similarity Search */}
      <Card className="p-4 border border-violet-200 bg-violet-50 dark:bg-violet-950/20">
        <p className="text-xs font-bold uppercase mb-3 flex items-center gap-1.5"><GitCompare className="w-3.5 h-3.5 text-violet-600" />Similarity Search</p>
        <div className="flex items-end gap-2 flex-wrap">
          <div className="flex-1 min-w-[150px]">
            <label className="text-[10px] text-muted-foreground">Entity Type</label>
            <Select value={simEntityType} onValueChange={loadEntities}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ENTITY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="text-[10px] text-muted-foreground">Source Entity</label>
            <Select value={selectedEntity} onValueChange={setSelectedEntity}>
              <SelectTrigger><SelectValue placeholder="Choose entity..." /></SelectTrigger>
              <SelectContent>
                {entities.map(e => <SelectItem key={e.id} value={e.id}>{e.title || e.name || e.id.slice(0, 8)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={similaritySearch} disabled={!selectedEntity || searchingSimilar}>
            {searchingSimilar ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <GitCompare className="w-4 h-4 mr-1" />}
            {searchingSimilar ? "Searching..." : "Find Similar"}
          </Button>
        </div>
        {simResults && (
          <div className="mt-3 space-y-2">
            {simResults.similar_items?.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-2">No similar items found.</p>
            ) : (
              simResults.similar_items?.map((s, i) => (
                <div key={i} className="p-2 rounded bg-white dark:bg-card border border-violet-200/60">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold">{s.entity_name || s.entity_id?.slice(0, 8)}</p>
                    <Badge className="text-[9px] bg-violet-100 text-violet-700">{s.similarity_score}% similar</Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground italic">{s.reason}</p>
                </div>
              ))
            )}
          </div>
        )}
      </Card>
    </div>
  );
}