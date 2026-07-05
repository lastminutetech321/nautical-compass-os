import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plug, Loader2, RefreshCw, TrendingUp, Database, Activity, Zap, CheckCircle } from "lucide-react";

const ENTITY_TYPES = [
  "DecisionRecord", "ApprovalGate", "EnterpriseOrg", "EnterpriseClone", "CRMLead", "CRMOpportunity",
  "CRMDeal", "Subscription", "BuildRegistry", "Task", "Sprint", "ADR", "CanonEntry", "LegalIssue",
  "FOIARequest", "Evidence", "CaseFile", "RevenueEvent", "Invoice", "Project", "Activity", "DiagnosticIssue",
];

export default function ModuleIntegrationPanel({ refreshKey }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ingesting, setIngesting] = useState(false);
  const [ingestResult, setIngestResult] = useState(null);
  const [selectedEntity, setSelectedEntity] = useState("DecisionRecord");
  const [entityId, setEntityId] = useState("");
  const [action, setAction] = useState("created");

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('ncIntelligence', { operation: 'get_consumption_stats', params: {} });
      setStats(res.data?.stats);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => { fetchStats(); }, [refreshKey]);

  const runAutoIngest = async () => {
    if (!entityId) return;
    setIngesting(true);
    setIngestResult(null);
    try {
      const res = await base44.functions.invoke('ncIntelligence', {
        operation: 'auto_ingest',
        params: { entity_type: selectedEntity, entity_id: entityId, action, source_module: 'manual_test' }
      });
      setIngestResult(res.data);
    } catch (e) {
      setIngestResult({ error: e.message });
    }
    setIngesting(false);
  };

  const byModule = stats?.by_module || {};
  const byConsumer = stats?.by_consumer || {};
  const byMemoryType = stats?.by_memory_type || {};
  const mostConsumed = stats?.most_consumed || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold flex items-center gap-2"><Plug className="w-4 h-4 text-teal-600" />Module Integration</h3>
        <Button size="sm" variant="outline" onClick={fetchStats} disabled={loading}>
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />}Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          {/* Consumption Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Card className="p-2.5 border border-border/60 text-center"><Database className="w-3.5 h-3.5 text-violet-600 mx-auto mb-0.5" /><p className="text-lg font-bold">{stats?.total_memories || 0}</p><p className="text-[9px] text-muted-foreground">Total Memories</p></Card>
            <Card className="p-2.5 border border-border/60 text-center"><Activity className="w-3.5 h-3.5 text-emerald-600 mx-auto mb-0.5" /><p className="text-lg font-bold">{stats?.total_consumed || 0}</p><p className="text-[9px] text-muted-foreground">Total Consumed</p></Card>
            <Card className="p-2.5 border border-border/60 text-center"><TrendingUp className="w-3.5 h-3.5 text-blue-600 mx-auto mb-0.5" /><p className="text-lg font-bold">{stats?.avg_consumption || 0}</p><p className="text-[9px] text-muted-foreground">Avg/Memory</p></Card>
            <Card className="p-2.5 border border-border/60 text-center"><Plug className="w-3.5 h-3.5 text-teal-600 mx-auto mb-0.5" /><p className="text-lg font-bold">{Object.keys(byConsumer).length}</p><p className="text-[9px] text-muted-foreground">Consuming Modules</p></Card>
          </div>

          {/* Auto-Ingest Tool */}
          <Card className="p-4 border border-teal-200 bg-teal-50 dark:bg-teal-950/10">
            <p className="text-xs font-bold text-teal-700 uppercase mb-2 flex items-center gap-1"><Zap className="w-3.5 h-3.5" />Auto-Ingest from Entity</p>
            <p className="text-[10px] text-muted-foreground mb-3">Create a memory record from any entity. Every entity action can generate intelligence.</p>
            <div className="flex flex-wrap gap-2 items-end">
              <div className="flex-1 min-w-[180px]">
                <label className="text-[10px] text-muted-foreground">Entity Type</label>
                <Select value={selectedEntity} onValueChange={setSelectedEntity}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{ENTITY_TYPES.map(t => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="text-[10px] text-muted-foreground">Entity ID</label>
                <Input value={entityId} onChange={e => setEntityId(e.target.value)} placeholder="Entity UUID" className="h-8 text-xs" />
              </div>
              <div className="w-[120px]">
                <label className="text-[10px] text-muted-foreground">Action</label>
                <Select value={action} onValueChange={setAction}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["created", "updated", "completed", "approved", "blocked", "resolved"].map(a => <SelectItem key={a} value={a} className="text-xs">{a}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button size="sm" onClick={runAutoIngest} disabled={ingesting || !entityId} className="bg-teal-600 hover:bg-teal-700 text-white h-8">
                {ingesting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3 mr-1" />}
                {ingesting ? "Ingesting…" : "Ingest"}
              </Button>
            </div>
            {ingestResult && !ingestResult.error && (
              <div className="mt-2 p-2 rounded bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 text-[10px] flex items-center gap-1.5">
                <CheckCircle className="w-3 h-3 text-emerald-600" />
                Created <strong>{ingestResult.memory_type}</strong> memory: {ingestResult.memory?.title}
              </div>
            )}
            {ingestResult?.error && (
              <div className="mt-2 p-2 rounded bg-red-50 dark:bg-red-950/20 border border-red-200 text-[10px] text-red-700">{ingestResult.error}</div>
            )}
          </Card>

          {/* Ingesting Modules */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <Card className="p-4 border border-border/60">
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1"><Database className="w-3 h-3" />Ingesting Modules (Sources)</p>
              {Object.keys(byModule).length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-3">No modules ingesting yet</p>
              ) : (
                <div className="space-y-1">
                  {Object.entries(byModule).sort((a, b) => b[1] - a[1]).map(([mod, count]) => (
                    <div key={mod} className="flex items-center justify-between text-xs">
                      <span className="font-medium truncate">{mod}</span>
                      <Badge variant="outline" className="text-[9px]">{count} memories</Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-4 border border-border/60">
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1"><Activity className="w-3 h-3" />Consuming Modules</p>
              {Object.keys(byConsumer).length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-3">No modules consuming yet</p>
              ) : (
                <div className="space-y-1">
                  {Object.entries(byConsumer).sort((a, b) => b[1] - a[1]).map(([mod, count]) => (
                    <div key={mod} className="flex items-center justify-between text-xs">
                      <span className="font-medium truncate">{mod}</span>
                      <Badge variant="outline" className="text-[9px]">{count} consumes</Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Most Consumed Memories */}
          <Card className="p-4 border border-border/60">
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1"><TrendingUp className="w-3 h-3" />Most Consumed Memories</p>
            {mostConsumed.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-3">No memories consumed yet</p>
            ) : (
              <div className="space-y-1.5">
                {mostConsumed.map((m, i) => (
                  <div key={i} className="p-2 rounded border border-border/40 text-xs">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-medium truncate">{m.title}</span>
                      <Badge variant="outline" className="text-[9px]">{m.count}x consumed</Badge>
                    </div>
                    <p className="text-[9px] text-muted-foreground">Last consumed by: {m.consumed_by || "—"}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Memory Type Distribution */}
          <Card className="p-4 border border-border/60">
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Memory Type Distribution</p>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(byMemoryType).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
                <Badge key={type} variant="outline" className="text-[10px]">{type}: {count}</Badge>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}