import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, ScanLine, Zap, AlertTriangle, DollarSign, Clock, Layers, CheckCircle, TrendingUp, Link2 } from "lucide-react";
import BlockedBuildCard from "@/components/dependency/BlockedBuildCard";

const TYPE_LABELS = {
  requirement: "Requirements", entity: "Entities", api: "APIs", documentation: "Documentation",
  test: "Tests", canon: "Canon", permission: "Permissions", approval: "Approvals",
  infrastructure: "Infrastructure", integration: "Integrations", workflow: "Workflows",
};

const TYPE_COLORS = {
  requirement: "text-blue-600 bg-blue-50 dark:bg-blue-950/20 border-blue-200",
  entity: "text-violet-600 bg-violet-50 dark:bg-violet-950/20 border-violet-200",
  api: "text-cyan-600 bg-cyan-50 dark:bg-cyan-950/20 border-cyan-200",
  documentation: "text-slate-600 bg-slate-50 dark:bg-slate-800/30 border-slate-200",
  test: "text-amber-600 bg-amber-50 dark:bg-amber-950/20 border-amber-200",
  canon: "text-indigo-600 bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200",
  permission: "text-pink-600 bg-pink-50 dark:bg-pink-950/20 border-pink-200",
  approval: "text-red-600 bg-red-50 dark:bg-red-950/20 border-red-200",
  infrastructure: "text-stone-600 bg-stone-50 dark:bg-stone-800/30 border-stone-200",
  integration: "text-teal-600 bg-teal-50 dark:bg-teal-950/20 border-teal-200",
  workflow: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200",
};

export default function NCDependencyEngine() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [reprioritizing, setReprioritizing] = useState(false);
  const [blockedBuilds, setBlockedBuilds] = useState([]);
  const [reprioritized, setReprioritized] = useState([]);
  const [unblockableBuilds, setUnblockableBuilds] = useState([]);
  const [allDeps, setAllDeps] = useState([]);
  const [scanResult, setScanResult] = useState(null);
  const [activeView, setActiveView] = useState("dashboard");

  const fetchOverview = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('ncDependencyEngine', { operation: 'overview', params: {} });
      setOverview(res.data?.overview);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const fetchAllData = async () => {
    const [ov, bb, deps] = await Promise.all([
      base44.functions.invoke('ncDependencyEngine', { operation: 'overview', params: {} }).catch(() => ({ data: {} })),
      base44.functions.invoke('ncDependencyEngine', { operation: 'blocked_builds', params: {} }).catch(() => ({ data: { blocked_builds: [] } })),
      base44.entities.Dependency.list('-created_date', 200).catch(() => []),
    ]);
    setOverview(ov.data?.overview);
    setBlockedBuilds(bb.data?.blocked_builds || []);
    setAllDeps(deps);
    setLoading(false);
  };

  useEffect(() => { fetchAllData(); }, []);

  const handleScan = async () => {
    setScanning(true);
    setScanResult(null);
    try {
      const res = await base44.functions.invoke('ncDependencyEngine', { operation: 'scan', params: {} });
      setScanResult(res.data);
      fetchAllData();
    } catch (e) { setScanResult({ error: e.message }); }
    setScanning(false);
  };

  const handleReprioritize = async () => {
    setReprioritizing(true);
    try {
      const res = await base44.functions.invoke('ncDependencyEngine', { operation: 'reprioritize', params: {} });
      setReprioritized(res.data?.reprioritized || []);
      setUnblockableBuilds(res.data?.unblockable_builds || []);
      setActiveView('reprioritize');
    } catch (e) { console.error(e); }
    setReprioritizing(false);
  };

  const handleResolve = async (depId) => {
    try {
      await base44.functions.invoke('ncDependencyEngine', { operation: 'resolve', params: { dependency_id: depId } });
      fetchAllData();
    } catch (e) { console.error(e); }
  };

  const byType = overview?.by_type || {};
  const byImpact = overview?.by_impact || {};

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">NCOS · Dependency Intelligence</p>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Link2 className="w-6 h-6 text-amber-600" />NC Dependency Engine
          </h1>
          <p className="text-muted-foreground text-sm">Understand every dependency · Auto-reprioritize work based on dependency chains</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleScan} variant="outline" size="sm" disabled={scanning}>
            {scanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ScanLine className="w-3.5 h-3.5 mr-1" />}
            {scanning ? "Scanning…" : "Scan Dependencies"}
          </Button>
          <Button onClick={handleReprioritize} size="sm" disabled={reprioritizing} className="bg-amber-600 hover:bg-amber-700 text-white">
            {reprioritizing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 mr-1" />}
            {reprioritizing ? "Reprioritizing…" : "Reprioritize"}
          </Button>
        </div>
      </div>

      {/* Scan Result Banner */}
      {scanResult && !scanResult.error && (
        <Card className="p-3 border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
            <CheckCircle className="w-4 h-4" />
            <p className="text-xs font-bold">Scan complete — {scanResult.detected_count} dependencies detected, {scanResult.created_count} new records created.</p>
          </div>
          {scanResult.scan_summary && <p className="text-[10px] text-muted-foreground mt-1">{scanResult.scan_summary}</p>}
        </Card>
      )}

      {/* Overview Stats */}
      {loading ? (
        <div className="flex items-center justify-center h-24"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : overview ? (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          <Card className="p-2.5 border border-amber-200 bg-amber-50 dark:bg-amber-950/20 text-center">
            <Layers className="w-3.5 h-3.5 text-amber-600 mx-auto mb-0.5" />
            <p className="text-lg font-bold">{overview.total_dependencies}</p>
            <p className="text-[9px] text-muted-foreground">Total Deps</p>
          </Card>
          <Card className="p-2.5 border border-red-200 bg-red-50 dark:bg-red-950/20 text-center">
            <AlertTriangle className="w-3.5 h-3.5 text-red-600 mx-auto mb-0.5" />
            <p className="text-lg font-bold">{overview.blocked_builds}</p>
            <p className="text-[9px] text-muted-foreground">Blocked Builds</p>
          </Card>
          <Card className="p-2.5 border border-orange-200 bg-orange-50 dark:bg-orange-950/20 text-center">
            <AlertTriangle className="w-3.5 h-3.5 text-orange-600 mx-auto mb-0.5" />
            <p className="text-lg font-bold">{overview.critical_count}</p>
            <p className="text-[9px] text-muted-foreground">Critical</p>
          </Card>
          <Card className="p-2.5 border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 text-center">
            <DollarSign className="w-3.5 h-3.5 text-emerald-600 mx-auto mb-0.5" />
            <p className="text-lg font-bold">${(overview.total_financial_impact || 0).toLocaleString()}</p>
            <p className="text-[9px] text-muted-foreground">Fin. Impact</p>
          </Card>
          <Card className="p-2.5 border border-blue-200 bg-blue-50 dark:bg-blue-950/20 text-center">
            <Clock className="w-3.5 h-3.5 text-blue-600 mx-auto mb-0.5" />
            <p className="text-lg font-bold">{overview.total_estimated_hours || 0}h</p>
            <p className="text-[9px] text-muted-foreground">Est. Hours</p>
          </Card>
          <Card className="p-2.5 border border-violet-200 bg-violet-50 dark:bg-violet-950/20 text-center">
            <CheckCircle className="w-3.5 h-3.5 text-violet-600 mx-auto mb-0.5" />
            <p className="text-lg font-bold">{overview.resolved_count}</p>
            <p className="text-[9px] text-muted-foreground">Resolved</p>
          </Card>
        </div>
      ) : null}

      {/* Missing dependency types breakdown */}
      {Object.keys(byType).length > 0 && (
        <Card className="p-3 border border-border/60">
          <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2">Missing Dependencies by Type (11 categories)</p>
          <div className="grid grid-cols-2 md:grid-cols-6 lg:grid-cols-11 gap-1.5">
            {Object.entries(TYPE_LABELS).map(([key, label]) => {
              const count = byType[key] || 0;
              return (
                <div key={key} className={`p-2 rounded border text-center ${TYPE_COLORS[key]} ${count === 0 ? 'opacity-40' : ''}`}>
                  <p className="text-lg font-bold">{count}</p>
                  <p className="text-[8px] leading-tight">{label}</p>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* View Toggle */}
      <div className="flex gap-2">
        <button onClick={() => setActiveView('dashboard')} className={`px-3 py-1.5 text-xs font-medium rounded-md ${activeView === 'dashboard' ? 'bg-amber-600 text-white' : 'border border-border hover:bg-accent'}`}>
          <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />Blocked Builds ({blockedBuilds.length})
        </button>
        <button onClick={() => setActiveView('all_deps')} className={`px-3 py-1.5 text-xs font-medium rounded-md ${activeView === 'all_deps' ? 'bg-amber-600 text-white' : 'border border-border hover:bg-accent'}`}>
          <Layers className="w-3.5 h-3.5 inline mr-1" />All Dependencies ({allDeps.length})
        </button>
        <button onClick={() => setActiveView('reprioritize')} className={`px-3 py-1.5 text-xs font-medium rounded-md ${activeView === 'reprioritize' ? 'bg-amber-600 text-white' : 'border border-border hover:bg-accent'}`}>
          <TrendingUp className="w-3.5 h-3.5 inline mr-1" />Reprioritization ({reprioritized.length})
        </button>
      </div>

      {/* Dashboard: Blocked Builds */}
      {activeView === 'dashboard' && (
        <div>
          {blockedBuilds.length === 0 ? (
            <Card className="p-8 text-center border border-dashed border-border/40">
              <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-semibold">No blocked builds</p>
              <p className="text-xs text-muted-foreground">Run a dependency scan to detect blockers.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {blockedBuilds.map(build => (
                <BlockedBuildCard key={build.id} build={build} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* All Dependencies */}
      {activeView === 'all_deps' && (
        <div className="space-y-2">
          {allDeps.length === 0 ? (
            <Card className="p-8 text-center border border-dashed border-border/40">
              <Layers className="w-8 h-8 text-amber-400 mx-auto mb-2" />
              <p className="text-sm font-semibold">No dependencies detected yet</p>
              <Button size="sm" onClick={handleScan} className="mt-2"><ScanLine className="w-3.5 h-3.5 mr-1" />Run Scan</Button>
            </Card>
          ) : (
            allDeps.map(dep => (
              <Card key={dep.id} className="p-3 border border-border/60">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h4 className="text-xs font-bold truncate">{dep.title}</h4>
                      <Badge variant="outline" className={`text-[8px] ${TYPE_COLORS[dep.dependency_type] || ''}`}>{TYPE_LABELS[dep.dependency_type]}</Badge>
                      <Badge variant="outline" className="text-[8px]">{dep.status}</Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground line-clamp-2">{dep.what_is_missing}</p>
                    <div className="flex items-center gap-3 mt-1 text-[9px] text-muted-foreground">
                      <span>Owner: {dep.owner || 'Unassigned'}</span>
                      <span>ETA: {dep.estimated_hours || 0}h</span>
                      {dep.financial_impact > 0 && <span className="text-emerald-600">${dep.financial_impact.toLocaleString()}</span>}
                      {dep.blocks_build_names?.length > 0 && <span>Blocks: {dep.blocks_build_names.join(', ')}</span>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <Badge variant="outline" className="text-[8px]">{dep.business_impact} impact</Badge>
                    <Badge variant="outline" className="text-[8px]">Priority: {dep.priority_score}</Badge>
                    {dep.status !== 'resolved' && (
                      <Button size="sm" variant="ghost" className="text-[9px] h-5 px-1.5" onClick={() => handleResolve(dep.id)}>
                        <CheckCircle className="w-2.5 h-2.5 mr-0.5" />Resolve
                      </Button>
                    )}
                  </div>
                </div>
                {dep.resolution_steps?.length > 0 && (
                  <div className="mt-1.5 pt-1.5 border-t border-border/30">
                    {dep.resolution_steps.map((s, i) => (
                      <p key={i} className="text-[9px] text-muted-foreground flex items-start gap-1">
                        <span className="text-blue-500">→</span>{s}
                      </p>
                    ))}
                  </div>
                )}
              </Card>
            ))
          )}
        </div>
      )}

      {/* Reprioritization View */}
      {activeView === 'reprioritize' && (
        <div className="space-y-3">
          {reprioritized.length === 0 ? (
            <Card className="p-8 text-center border border-dashed border-border/40">
              <TrendingUp className="w-8 h-8 text-amber-400 mx-auto mb-2" />
              <p className="text-sm font-semibold">No reprioritization data yet</p>
              <Button size="sm" onClick={handleReprioritize} className="mt-2"><Zap className="w-3.5 h-3.5 mr-1" />Run Reprioritization</Button>
            </Card>
          ) : (
            <>
              {/* Recommended first action */}
              {reprioritized[0] && (
                <Card className="p-4 border border-amber-300 bg-amber-50 dark:bg-amber-950/20">
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="w-4 h-4 text-amber-600" />
                    <p className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase">Recommended First Action — Highest Unblock Potential</p>
                  </div>
                  <h4 className="text-sm font-bold mb-0.5">{reprioritized[0].title}</h4>
                  <p className="text-[10px] text-muted-foreground mb-1">{reprioritized[0].what_is_missing}</p>
                  <div className="flex gap-3 text-[10px]">
                    <span>Unblocks: <strong>{reprioritized[0].unblock_count}</strong> builds</span>
                    <span>Priority: <strong>{reprioritized[0].reprioritized_score}</strong>/100</span>
                    <span>Effort: <strong>{reprioritized[0].estimated_hours}h</strong></span>
                  </div>
                </Card>
              )}

              {/* Unblockable builds */}
              {unblockableBuilds.length > 0 && (
                <Card className="p-3 border border-border/60">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2">Blocked Builds — Unblock Potential</p>
                  <div className="space-y-1">
                    {unblockableBuilds.map((b, i) => (
                      <div key={i} className="flex items-center justify-between text-[10px] p-1.5 rounded border border-border/30">
                        <span className="font-medium truncate flex-1">{b.name}</span>
                        <Badge variant="outline" className="text-[8px] mr-2">{b.blocking_deps} blockers</Badge>
                        <span className="text-[9px] text-muted-foreground truncate">Top blocker: {b.top_blocker}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Full prioritized list */}
              <div className="space-y-1.5">
                {reprioritized.map((dep, i) => (
                  <Card key={dep.id} className={`p-2.5 border ${i === 0 ? 'border-amber-300 bg-amber-50/50 dark:bg-amber-950/10' : 'border-border/60'}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-muted-foreground w-6 text-center">#{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold truncate">{dep.title}</span>
                          <Badge variant="outline" className={`text-[8px] ${TYPE_COLORS[dep.dependency_type] || ''}`}>{TYPE_LABELS[dep.dependency_type]}</Badge>
                        </div>
                        <p className="text-[9px] text-muted-foreground truncate">{dep.what_is_missing}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 text-[9px]">
                        <span className="text-emerald-600 font-semibold">{dep.unblock_count} unblock</span>
                        <Badge variant="outline" className="text-[8px]">{dep.reprioritized_score}</Badge>
                        <span className="text-muted-foreground">{dep.estimated_hours}h</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}