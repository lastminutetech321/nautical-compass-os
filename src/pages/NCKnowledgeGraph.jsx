import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Network, Search, Loader2, RefreshCw, Zap, Shield, DollarSign, AlertTriangle, Layers, GitBranch } from "lucide-react";
import GraphCanvas from "@/components/knowledgegraph/GraphCanvas";
import NodeProfile from "@/components/knowledgegraph/NodeProfile";
import ImpactView from "@/components/knowledgegraph/ImpactView";

const ENTITY_TYPES = [
  "EnterpriseOrg", "EnterpriseClone", "Organization", "AgentProfile", "Project", "BuildProject",
  "Task", "AgentTask", "Evidence", "VideoEvidence", "CaseFile", "CanonEntry", "LegalIssue",
  "FOIARequest", "PlatformConfig", "Document", "RevenueEvent", "Invoice", "Subscription",
  "CRMLead", "CRMOpportunity", "CRMDeal", "ApprovalGate", "DecisionRecord", "BuildRegistry",
  "Sprint", "ADR", "MarketplaceModule", "ModuleInstallation", "AIService", "Release",
];

export default function NCKnowledgeGraph() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const [explorer, setExplorer] = useState(null); // { center_node, outgoing, incoming, connected_nodes }
  const [exploring, setExploring] = useState(false);

  const [impact, setImpact] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  const [autoConnecting, setAutoConnecting] = useState(false);
  const [batchProfiling, setBatchProfiling] = useState(false);
  const [mode, setMode] = useState("explore"); // 'explore' | 'impact'
  const [selectedEntity, setSelectedEntity] = useState({ type: "", id: "" });
  const [showEntityInput, setShowEntityInput] = useState(false);

  const fetchOverview = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('ncKnowledgeGraph', { operation: 'overview', params: {} });
      setOverview(res.data?.overview);
    } catch (e) {
      const [nodes, edges] = await Promise.all([
        base44.entities.GraphNode.list('-created_date', 500).catch(() => []),
        base44.entities.RelationshipLink.filter({ status: 'active' }, '-created_date', 500).catch(() => []),
      ]);
      setOverview({ total_nodes: nodes.length, total_edges: edges.length, by_category: {}, by_risk: {}, high_risk_count: 0, total_financial_impact: 0, top_connected: [] });
    }
    setLoading(false);
  };

  useEffect(() => { fetchOverview(); }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await base44.functions.invoke('ncKnowledgeGraph', { operation: 'search_nodes', params: { query: searchQuery } });
      setSearchResults(res.data?.results || []);
    } catch (e) { setSearchResults([]); }
    setSearching(false);
  };

  const handleNavigate = async (entityType, entityId) => {
    setExploring(true);
    setSelectedEntity({ type: entityType, id: entityId });
    try {
      const res = await base44.functions.invoke('ncKnowledgeGraph', { operation: 'explore', params: { entity_type: entityType, entity_id: entityId } });
      setExplorer(res.data);
    } catch (e) { console.error(e); }
    setExploring(false);
  };

  const handleImpactAnalysis = async () => {
    if (!selectedEntity.type || !selectedEntity.id) return;
    setAnalyzing(true);
    setMode('impact');
    try {
      const res = await base44.functions.invoke('ncKnowledgeGraph', {
        operation: 'impact_analysis', params: { entity_type: selectedEntity.type, entity_id: selectedEntity.id, depth: 2 }
      });
      setImpact(res.data?.impact);
    } catch (e) { console.error(e); }
    setAnalyzing(false);
  };

  const handleAutoConnect = async () => {
    setAutoConnecting(true);
    try {
      await base44.functions.invoke('ncKnowledgeGraph', { operation: 'auto_connect', params: {} });
      fetchOverview();
      if (selectedEntity.id) handleNavigate(selectedEntity.type, selectedEntity.id);
    } catch (e) { console.error(e); }
    setAutoConnecting(false);
  };

  const handleBatchProfile = async () => {
    setBatchProfiling(true);
    try {
      await base44.functions.invoke('ncKnowledgeGraph', { operation: 'batch_profile', params: { entity_types: ENTITY_TYPES.slice(0, 15) } });
      fetchOverview();
    } catch (e) { console.error(e); }
    setBatchProfiling(false);
  };

  const centerNode = explorer?.center_node;

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">NCOS · Central Relationship Engine</p>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Network className="w-6 h-6 text-violet-600" />NC Knowledge Graph
          </h1>
          <p className="text-muted-foreground text-sm">Everything connects · Impact analysis before any change</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleBatchProfile} variant="outline" size="sm" disabled={batchProfiling}>
            {batchProfiling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Layers className="w-3.5 h-3.5 mr-1" />}
            {batchProfiling ? "Profiling…" : "Profile All"}
          </Button>
          <Button onClick={handleAutoConnect} size="sm" disabled={autoConnecting} className="bg-violet-600 hover:bg-violet-700 text-white">
            {autoConnecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 mr-1" />}
            {autoConnecting ? "Connecting…" : "Auto-Connect"}
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      {loading ? (
        <div className="flex items-center justify-center h-24"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : overview ? (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          <Card className="p-2.5 border border-violet-200 bg-violet-50 dark:bg-violet-950/20 text-center">
            <Network className="w-3.5 h-3.5 text-violet-600 mx-auto mb-0.5" />
            <p className="text-lg font-bold">{overview.total_nodes}</p>
            <p className="text-[9px] text-muted-foreground">Nodes</p>
          </Card>
          <Card className="p-2.5 border border-blue-200 bg-blue-50 dark:bg-blue-950/20 text-center">
            <GitBranch className="w-3.5 h-3.5 text-blue-600 mx-auto mb-0.5" />
            <p className="text-lg font-bold">{overview.total_edges}</p>
            <p className="text-[9px] text-muted-foreground">Edges</p>
          </Card>
          <Card className="p-2.5 border border-red-200 bg-red-50 dark:bg-red-950/20 text-center">
            <AlertTriangle className="w-3.5 h-3.5 text-red-600 mx-auto mb-0.5" />
            <p className="text-lg font-bold">{overview.high_risk_count}</p>
            <p className="text-[9px] text-muted-foreground">High Risk</p>
          </Card>
          <Card className="p-2.5 border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 text-center">
            <DollarSign className="w-3.5 h-3.5 text-emerald-600 mx-auto mb-0.5" />
            <p className="text-lg font-bold">${(overview.total_financial_impact || 0).toLocaleString()}</p>
            <p className="text-[9px] text-muted-foreground">Financial Impact</p>
          </Card>
          <Card className="p-2.5 border border-amber-200 bg-amber-50 dark:bg-amber-950/20 text-center">
            <Layers className="w-3.5 h-3.5 text-amber-600 mx-auto mb-0.5" />
            <p className="text-lg font-bold">{Object.keys(overview.by_category || {}).length}</p>
            <p className="text-[9px] text-muted-foreground">Categories</p>
          </Card>
          <Card className="p-2.5 border border-slate-200 bg-slate-50 dark:bg-slate-800/30 text-center">
            <Shield className="w-3.5 h-3.5 text-slate-600 mx-auto mb-0.5" />
            <p className="text-lg font-bold">{overview.top_connected?.length || 0}</p>
            <p className="text-[9px] text-muted-foreground">Hub Nodes</p>
          </Card>
        </div>
      ) : null}

      {/* Category distribution */}
      {overview?.by_category && Object.keys(overview.by_category).length > 0 && (
        <Card className="p-3 border border-border/60">
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(overview.by_category).sort((a, b) => b[1] - a[1]).map(([cat, count]) => (
              <Badge key={cat} variant="outline" className="text-[10px] capitalize">{cat}: {count}</Badge>
            ))}
          </div>
        </Card>
      )}

      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Search nodes by name, type, or tag…"
            className="pl-9"
          />
          {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin" />}
        </div>
        <Button onClick={handleSearch} size="sm" variant="outline"><Search className="w-3.5 h-3.5 mr-1" />Search</Button>
        <Button onClick={() => setShowEntityInput(!showEntityInput)} size="sm" variant="ghost">Direct Jump</Button>
      </div>

      {/* Direct entity input */}
      {showEntityInput && (
        <Card className="p-3 border border-border/60 flex gap-2 items-end">
          <div className="flex-1">
            <label className="text-[10px] text-muted-foreground">Entity Type</label>
            <select className="w-full h-8 text-xs rounded-md border border-input px-2 bg-transparent" value={selectedEntity.type} onChange={e => setSelectedEntity({ ...selectedEntity, type: e.target.value })}>
              <option value="">Select type…</option>
              {ENTITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="text-[10px] text-muted-foreground">Entity ID</label>
            <Input value={selectedEntity.id} onChange={e => setSelectedEntity({ ...selectedEntity, id: e.target.value })} placeholder="Entity UUID" className="h-8 text-xs" />
          </div>
          <Button size="sm" onClick={() => selectedEntity.type && selectedEntity.id && handleNavigate(selectedEntity.type, selectedEntity.id)} disabled={!selectedEntity.type || !selectedEntity.id}>
            <Network className="w-3.5 h-3.5 mr-1" />Explore
          </Button>
        </Card>
      )}

      {/* Search Results */}
      {searchResults.length > 0 && (
        <Card className="p-3 border border-border/60">
          <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2">Search Results ({searchResults.length})</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-1.5">
            {searchResults.map(r => (
              <button key={r.id} onClick={() => handleNavigate(r.entity_type, r.entity_id)} className="text-left p-2 rounded border border-border/40 hover:border-violet-300 hover:bg-violet-50 dark:hover:bg-violet-950/20 transition-colors">
                <p className="text-xs font-semibold truncate">{r.entity_name}</p>
                <p className="text-[9px] text-muted-foreground">{r.entity_type} · {r.entity_category} · {r.risk_level} risk</p>
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Mode toggle */}
      {centerNode && (
        <div className="flex gap-2 items-center">
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button onClick={() => setMode('explore')} className={`px-3 py-1.5 text-xs font-medium ${mode === 'explore' ? 'bg-violet-600 text-white' : 'bg-transparent hover:bg-accent'}`}>
              <Network className="w-3.5 h-3.5 inline mr-1" />Graph Explorer
            </button>
            <button onClick={() => handleImpactAnalysis()} className={`px-3 py-1.5 text-xs font-medium ${mode === 'impact' ? 'bg-red-600 text-white' : 'bg-transparent hover:bg-accent'}`}>
              <Shield className="w-3.5 h-3.5 inline mr-1" />Impact Analysis
            </button>
          </div>
          {mode === 'impact' && (
            <Button size="sm" variant="outline" onClick={handleImpactAnalysis} disabled={analyzing}>
              {analyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />}Re-run
            </Button>
          )}
        </div>
      )}

      {/* Main Content: Graph + Sidebar */}
      {exploring ? (
        <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin text-violet-600" /></div>
      ) : centerNode ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            {mode === 'explore' ? (
              <Card className="p-3 border border-border/60">
                <GraphCanvas
                  centerNode={centerNode}
                  outgoing={explorer.outgoing}
                  incoming={explorer.incoming}
                  connectedNodes={explorer.connected_nodes}
                  onNavigate={handleNavigate}
                  mode={mode}
                />
              </Card>
            ) : (
              <Card className="p-4 border border-red-200 bg-red-50/30 dark:bg-red-950/10">
                <div className="mb-3">
                  <h3 className="text-sm font-bold flex items-center gap-2"><Shield className="w-4 h-4 text-red-600" />Impact Analysis</h3>
                  <p className="text-[10px] text-muted-foreground">Blast radius if <strong>{centerNode.entity_name}</strong> is changed — 2 levels deep</p>
                </div>
                {analyzing ? (
                  <div className="flex items-center justify-center h-32"><Loader2 className="w-6 h-6 animate-spin text-red-600" /></div>
                ) : (
                  <ImpactView impact={impact} centerNode={centerNode} />
                )}
              </Card>
            )}
          </div>
          <div className="lg:col-span-1">
            <NodeProfile node={centerNode} outgoing={explorer.outgoing} incoming={explorer.incoming} />
          </div>
        </div>
      ) : (
        <Card className="p-12 text-center border border-dashed border-border/40">
          <Network className="w-12 h-12 text-violet-400 mx-auto mb-3" />
          <h3 className="text-sm font-bold mb-1">Interactive Graph Explorer</h3>
          <p className="text-xs text-muted-foreground mb-4">Search for a node or profile entities to begin exploring relationships.</p>
          <div className="flex gap-2 justify-center">
            <Button size="sm" onClick={handleBatchProfile} disabled={batchProfiling}>
              {batchProfiling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Layers className="w-3.5 h-3.5 mr-1" />}
              Profile All Entities
            </Button>
            <Button size="sm" variant="outline" onClick={handleAutoConnect} disabled={autoConnecting}>
              {autoConnecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 mr-1" />}
              Auto-Connect
            </Button>
          </div>
        </Card>
      )}

      {/* Top connected nodes */}
      {overview?.top_connected?.length > 0 && (
        <Card className="p-4 border border-border/60">
          <p className="text-xs font-bold text-muted-foreground uppercase mb-2 flex items-center gap-1"><Network className="w-3 h-3" />Most Connected Nodes (Hubs)</p>
          <div className="space-y-1">
            {overview.top_connected.map((n, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="font-medium truncate">{n.name}</span>
                <Badge variant="outline" className="text-[9px]">{n.connections} connections</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}