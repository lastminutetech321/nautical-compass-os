import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, Crown, Zap, Network, RefreshCw, AlertTriangle, CheckCircle2, TrendingUp } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import ReadinessGauge from "@/components/orchestrator/ReadinessGauge";
import InsightCard from "@/components/orchestrator/InsightCard";
import ModuleMap from "@/components/orchestrator/ModuleMap";
import HealthDimensions from "@/components/orchestrator/HealthDimensions";

export default function BuildNC() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [data, setData] = useState(null);
  const [modules, setModules] = useState([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [buildRes, depRes] = await Promise.all([
        base44.functions.invoke('ncEcosystemOrchestrator', { operation: 'build_nc', params: {} }),
        base44.functions.invoke('ncEcosystemOrchestrator', { operation: 'dependency_map', params: {} }),
      ]);
      setData(buildRes.data);
      setModules(depRes.data?.modules || []);
    } catch (e) {
      toast({ title: "Error loading orchestrator data", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadData(); }, [loadData]);

  const runScan = async () => {
    setScanning(true);
    try {
      const res = await base44.functions.invoke('ncEcosystemOrchestrator', { operation: 'scan', params: {} });
      toast({
        title: "Ecosystem scan complete",
        description: `${res.data?.insights_generated || 0} insights, ${res.data?.modules_scanned || 0} modules, readiness ${res.data?.executive_readiness?.overall || 0}%`,
      });
      await loadData();
    } catch (e) {
      toast({ title: "Scan failed", description: e.message, variant: "destructive" });
    } finally {
      setScanning(false);
    }
  };

  const applyInsight = async (insight) => {
    if (insight.requires_founder_approval) {
      toast({ title: "Founder approval required", description: `Category: ${insight.approval_category}. This insight affects governance, pricing, legal, financial, or compensation.`, variant: "warning" });
      return;
    }
    try {
      await base44.functions.invoke('ncEcosystemOrchestrator', { operation: 'apply_insight', params: { insight_id: insight.id } });
      toast({ title: "Insight applied", description: insight.title, variant: "success" });
      await loadData();
    } catch (e) {
      toast({ title: "Failed to apply", description: e.message, variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const readiness = data?.executive_readiness || { overall: 0, dimensions: [], gaps: [], label: "Not Scanned" };
  const topWork = data?.top_work || [];
  const founderQueue = data?.founder_queue || [];
  const autoQueue = data?.auto_apply_queue || [];
  const cumulative = data?.cumulative_impact_if_all_resolved || {};

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" />
            Build NC
          </h1>
          <p className="text-sm text-muted-foreground">The Ecosystem Orchestrator — only the highest-value work remaining</p>
        </div>
        <Button onClick={runScan} disabled={scanning} className="shrink-0">
          <RefreshCw className={`w-4 h-4 mr-2 ${scanning ? 'animate-spin' : ''}`} />
          {scanning ? "Scanning..." : "Run Ecosystem Scan"}
        </Button>
      </div>

      {/* Readiness Overview */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="flex flex-col items-center justify-center">
              <ReadinessGauge score={readiness.overall} label={readiness.label} />
              <div className="mt-3 text-center">
                <p className="text-xs text-muted-foreground">Estimated toward autonomous NC operating system</p>
              </div>
            </div>
            <div className="lg:col-span-2">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> Platform Health Dimensions
              </h3>
              <HealthDimensions dimensions={readiness.dimensions} />
            </div>
          </div>
          {/* Gaps */}
          {readiness.gaps && readiness.gaps.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Critical Gaps Blocking Autonomy
              </h4>
              <div className="flex flex-wrap gap-2">
                {readiness.gaps.map(g => (
                  <Badge key={g.dimension} variant="outline" className="text-xs bg-amber-500/5 border-amber-500/30">
                    {g.dimension}: {g.score} → 70+
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="topwork">
        <TabsList className="grid w-full grid-cols-4 max-w-2xl">
          <TabsTrigger value="topwork">Highest-Value Work</TabsTrigger>
          <TabsTrigger value="founder">Founder Queue</TabsTrigger>
          <TabsTrigger value="auto">Auto-Apply</TabsTrigger>
          <TabsTrigger value="map">Dependency Map</TabsTrigger>
        </TabsList>

        {/* TOP WORK */}
        <TabsContent value="topwork" className="space-y-4">
          {topWork.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground text-sm">No insights yet. Run an ecosystem scan.</CardContent></Card>
          ) : (
            <>
              {/* Cumulative impact banner */}
              <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
                <CardContent className="p-4 flex items-center justify-around flex-wrap gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{Math.round(cumulative.customer || 0)}</div>
                    <div className="text-xs text-muted-foreground">Avg Customer Impact</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-emerald-600">{Math.round(cumulative.revenue || 0)}</div>
                    <div className="text-xs text-muted-foreground">Avg Revenue Impact</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-amber-600">{Math.round(cumulative.intelligence || 0)}</div>
                    <div className="text-xs text-muted-foreground">Avg Intelligence Gain</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{data?.total_open_insights || 0}</div>
                    <div className="text-xs text-muted-foreground">Open Insights</div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {topWork.map(insight => (
                  <InsightCard key={insight.id} insight={insight} onApply={applyInsight} />
                ))}
              </div>
            </>
          )}
        </TabsContent>

        {/* FOUNDER QUEUE */}
        <TabsContent value="founder" className="space-y-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-500" /> Requires Founder Approval
              </CardTitle>
            </CardHeader>
            <CardContent>
              {founderQueue.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No items requiring founder approval.</p>
              ) : (
                <div className="space-y-2">
                  {founderQueue.map(f => (
                    <div key={f.id} className="flex items-center justify-between p-3 rounded-lg border bg-amber-500/5">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{f.title}</p>
                        <Badge variant="outline" className="text-[10px] mt-1">{f.category}</Badge>
                      </div>
                      <span className="text-lg font-bold font-mono text-amber-600 ml-2">{Math.round(f.priority || 0)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* AUTO APPLY */}
        <TabsContent value="auto" className="space-y-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="w-4 h-4 text-blue-500" /> Auto-Apply Eligible (Low-Risk)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {autoQueue.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No auto-apply eligible items.</p>
              ) : (
                <div className="space-y-2">
                  {autoQueue.map(a => (
                    <div key={a.id} className="flex items-center justify-between p-3 rounded-lg border bg-blue-500/5">
                      <p className="text-sm font-medium flex-1 min-w-0 truncate">{a.title}</p>
                      <span className="text-sm font-mono text-blue-600 ml-2">{Math.round(a.priority || 0)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* DEPENDENCY MAP */}
        <TabsContent value="map">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ModuleMap modules={modules} />
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Network className="w-4 h-4" /> Ecosystem Coverage
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {modules.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No modules registered. Run a scan.</p>
                ) : (
                  <>
                    <StatRow label="Modules Scanned" value={modules.length} icon={CheckCircle2} color="#22c55e" />
                    <StatRow label="Healthy (good+)" value={modules.filter(m => m.health_status === 'good' || m.health_status === 'excellent').length} icon={CheckCircle2} color="#3b82f6" />
                    <StatRow label="At Risk" value={modules.filter(m => m.health_status === 'at_risk').length} icon={AlertTriangle} color="#f97316" />
                    <StatRow label="Critical" value={modules.filter(m => m.health_status === 'critical').length} icon={AlertTriangle} color="#ef4444" />
                    <StatRow label="Unregistered" value={modules.filter(m => m.health_status === 'unregistered').length} icon={AlertTriangle} color="#94a3b8" />
                    <div className="pt-3 border-t">
                      <h4 className="text-xs font-semibold text-muted-foreground mb-2">Categories</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {Array.from(new Set(modules.map(m => m.category))).map(cat => (
                          <Badge key={cat} variant="secondary" className="text-[10px]">{cat}</Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatRow({ label, value, icon: Icon, color }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4" style={{ color }} />
        <span className="text-sm">{label}</span>
      </div>
      <span className="text-lg font-bold font-mono">{value}</span>
    </div>
  );
}