import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Sparkles, Loader2, Shield, CheckCircle, AlertTriangle, Clock, DollarSign, TrendingUp, Activity, Zap, Target, X, Play, RefreshCw, Database, AlertCircle, Award, Copy, Layout, Heart, FileText, Gauge, Accessibility, Code, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import moment from "moment";

const DIMENSIONS = [
  { key: "bottlenecks", label: "Bottlenecks", icon: AlertCircle, color: "text-red-600 bg-red-50" },
  { key: "missing_workflows", label: "Missing Workflows", icon: Zap, color: "text-amber-600 bg-amber-50" },
  { key: "duplication", label: "Duplication", icon: Copy, color: "text-orange-600 bg-orange-50" },
  { key: "ui", label: "UI", icon: Layout, color: "text-blue-600 bg-blue-50" },
  { key: "ux", label: "UX", icon: Heart, color: "text-pink-600 bg-pink-50" },
  { key: "documentation", label: "Docs", icon: FileText, color: "text-slate-600 bg-slate-50" },
  { key: "testing", label: "Testing", icon: CheckCircle, color: "text-emerald-600 bg-emerald-50" },
  { key: "performance", label: "Performance", icon: Gauge, color: "text-cyan-600 bg-cyan-50" },
  { key: "accessibility", label: "A11y", icon: Accessibility, color: "text-violet-600 bg-violet-50" },
  { key: "engineering_quality", label: "Eng Quality", icon: Code, color: "text-indigo-600 bg-indigo-50" },
  { key: "security", label: "Security", icon: Shield, color: "text-red-600 bg-red-50" },
  { key: "scalability", label: "Scalability", icon: TrendingUp, color: "text-teal-600 bg-teal-50" },
  { key: "maintainability", label: "Maintainability", icon: Wrench, color: "text-blue-600 bg-blue-50" },
  { key: "revenue", label: "Revenue", icon: DollarSign, color: "text-emerald-600 bg-emerald-50" },
];

const PRIORITY_COLORS = {
  critical: "bg-red-100 text-red-700 border-red-200",
  high: "bg-amber-100 text-amber-700 border-amber-200",
  medium: "bg-blue-100 text-blue-700 border-blue-200",
  low: "bg-slate-100 text-slate-600 border-slate-200",
};
const STATUS_COLORS = {
  queued: "bg-slate-100 text-slate-600",
  approved: "bg-emerald-100 text-emerald-700",
  in_progress: "bg-blue-100 text-blue-700",
  done: "bg-emerald-100 text-emerald-700",
  dismissed: "bg-slate-100 text-slate-400 line-through",
};

export default function AutonomousImprovement() {
  const [backlog, setBacklog] = useState([]);
  const [byDimension, setByDimension] = useState({});
  const [stats, setStats] = useState(null);
  const [briefing, setBriefing] = useState(null);
  const [dimensionScores, setDimensionScores] = useState({});
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [filterDimension, setFilterDimension] = useState("all");
  const [expandedItem, setExpandedItem] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('autonomousImprovement', { operation: 'get_backlog', params: {} });
      setBacklog(res.data?.backlog || []);
      setByDimension(res.data?.by_dimension || {});
      setStats(res.data?.stats);
      setBriefing(res.data?.latest_briefing);
      setDimensionScores(res.data?.latest_briefing?.dimension_scores || {});
    } catch (e) {
      const items = await base44.entities.ImprovementItem.list('-created_date', 200).catch(() => []);
      setBacklog(items);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const runScan = async () => {
    setScanning(true);
    setScanResult(null);
    try {
      const res = await base44.functions.invoke('autonomousImprovement', { operation: 'run_daily_scan', params: {} });
      setScanResult(res.data);
      load();
    } catch (e) { console.error(e); }
    setScanning(false);
  };

  const approve = async (id) => {
    await base44.functions.invoke('autonomousImprovement', { operation: 'approve_item', params: { item_id: id } });
    load();
  };

  const dismiss = async (id) => {
    await base44.functions.invoke('autonomousImprovement', { operation: 'dismiss_item', params: { item_id: id } });
    load();
  };

  const startExec = async (id) => {
    await base44.functions.invoke('autonomousImprovement', { operation: 'start_execution', params: { item_id: id } });
    load();
  };

  const filtered = filterDimension === "all" ? backlog : backlog.filter(i => i.improvement_dimension === filterDimension);
  const queued = filtered.filter(i => i.status === 'queued');
  const approved = filtered.filter(i => i.status === 'approved');
  const inProgress = filtered.filter(i => i.status === 'in_progress');
  const done = filtered.filter(i => i.status === 'done');

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">NCOS · Daily Autonomous Scan</p>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" />Autonomous Improvement Engine
          </h1>
          <p className="text-muted-foreground text-sm">Daily AI scan across 13 dimensions · Auto-prioritized · Founder approval mandatory · No auto-deploy</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={load} variant="outline" size="sm"><RefreshCw className="w-4 h-4 mr-1.5" />Refresh</Button>
          <Button onClick={runScan} disabled={scanning}>
            {scanning ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Sparkles className="w-4 h-4 mr-1.5" />}
            {scanning ? "Scanning..." : "Run Daily Scan"}
          </Button>
        </div>
      </div>

      {/* Scan Result Banner */}
      {scanResult && (
        <Card className="p-4 border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20">
          <p className="text-xs font-bold uppercase flex items-center gap-1.5 mb-2"><CheckCircle className="w-4 h-4 text-emerald-600" />Scan Complete — {scanResult.scan_date}</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
            <div><p className="font-bold text-lg">{scanResult.items_created}</p><p className="text-[10px] text-muted-foreground">Items Generated</p></div>
            <div><p className="font-bold text-lg">{scanResult.stats?.critical}</p><p className="text-[10px] text-muted-foreground">Critical</p></div>
            <div><p className="font-bold text-lg">{scanResult.stats?.bottlenecks}</p><p className="text-[10px] text-muted-foreground">Bottlenecks</p></div>
            <div><p className="font-bold text-lg text-emerald-600">${scanResult.stats?.total_revenue_impact}/mo</p><p className="text-[10px] text-muted-foreground">Revenue Impact</p></div>
            <div><p className="font-bold text-lg">{scanResult.platform_health_score}/100</p><p className="text-[10px] text-muted-foreground">Health Score</p></div>
          </div>
        </Card>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <Card className="p-3"><Database className="w-4 h-4 text-blue-600 mb-1" /><p className="text-2xl font-bold">{stats.total}</p><p className="text-[10px] text-muted-foreground">Total Items</p></Card>
          <Card className="p-3"><Clock className="w-4 h-4 text-slate-600 mb-1" /><p className="text-2xl font-bold">{stats.queued}</p><p className="text-[10px] text-muted-foreground">Queued</p></Card>
          <Card className="p-3"><CheckCircle className="w-4 h-4 text-emerald-600 mb-1" /><p className="text-2xl font-bold">{stats.approved}</p><p className="text-[10px] text-muted-foreground">Approved</p></Card>
          <Card className="p-3"><AlertTriangle className="w-4 h-4 text-red-600 mb-1" /><p className="text-2xl font-bold">{stats.critical}</p><p className="text-[10px] text-muted-foreground">Critical</p></Card>
          <Card className="p-3"><DollarSign className="w-4 h-4 text-emerald-600 mb-1" /><p className="text-2xl font-bold">${stats.total_revenue_impact}</p><p className="text-[10px] text-muted-foreground">Revenue Impact/mo</p></Card>
          <Card className="p-3"><Award className="w-4 h-4 text-violet-600 mb-1" /><p className="text-2xl font-bold">{stats.avg_roi_score}</p><p className="text-[10px] text-muted-foreground">Avg ROI Score</p></Card>
        </div>
      )}

      {/* Founder Approval Gate Notice */}
      <Card className="p-3 border border-amber-200 bg-amber-50 dark:bg-amber-950/20 flex items-center gap-2">
        <Shield className="w-4 h-4 text-amber-600 flex-shrink-0" />
        <p className="text-xs text-muted-foreground"><span className="font-semibold text-amber-700">Founder Approval Mandatory:</span> No improvements are deployed automatically. Every item requires explicit founder approval before execution.</p>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="briefing">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="briefing">Executive Briefing</TabsTrigger>
          <TabsTrigger value="backlog">Backlog ({queued.length})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({approved.length})</TabsTrigger>
          <TabsTrigger value="in_progress">In Progress ({inProgress.length})</TabsTrigger>
          <TabsTrigger value="dimensions">13 Dimensions</TabsTrigger>
          <TabsTrigger value="done">Completed ({done.length})</TabsTrigger>
        </TabsList>

        {/* Executive Briefing Tab */}
        <TabsContent value="briefing" className="space-y-4 mt-4">
          {scanning ? (
            <Card className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary mb-2" /><p className="text-sm text-muted-foreground">Scanning platform and generating executive briefing...</p></Card>
          ) : briefing ? (
            <>
              <Card className="p-5 border border-primary/30 bg-gradient-to-br from-primary/5 to-blue-50 dark:from-primary/10 dark:to-blue-950/20">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold uppercase flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-primary" />Executive Briefing — {moment(briefing.briefing_date).format("MMMM D, YYYY")}</p>
                  <Badge className="bg-primary text-primary-foreground">{briefing.platform_health_score}/100 Health</Badge>
                </div>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{briefing.executive_summary}</p>
              </Card>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card className="p-3"><p className="text-xl font-bold">{briefing.total_items_generated}</p><p className="text-[10px] text-muted-foreground">Items Generated</p></Card>
                <Card className="p-3"><p className="text-xl font-bold text-red-600">{briefing.critical_items}</p><p className="text-[10px] text-muted-foreground">Critical Items</p></Card>
                <Card className="p-3"><p className="text-xl font-bold text-emerald-600">${briefing.total_estimated_revenue_impact}/mo</p><p className="text-[10px] text-muted-foreground">Revenue Impact</p></Card>
                <Card className="p-3"><p className="text-xl font-bold">{briefing.total_estimated_effort_hours}h</p><p className="text-[10px] text-muted-foreground">Total Effort</p></Card>
              </div>

              {briefing.top_priorities?.length > 0 && (
                <Card className="p-4">
                  <p className="text-xs font-bold uppercase mb-2 flex items-center gap-1.5"><Target className="w-3.5 h-3.5 text-amber-600" />Top Priorities</p>
                  <div className="space-y-2">
                    {briefing.top_priorities.map((p, i) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded bg-muted/40">
                        <div><p className="text-xs font-semibold">{p.title}</p><p className="text-[9px] text-muted-foreground">{p.dimension} · ROI {p.roi_score}/100</p></div>
                        {p.revenue_impact > 0 && <Badge className="text-[9px] bg-emerald-100 text-emerald-700">+${p.revenue_impact}/mo</Badge>}
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {briefing.recommended_actions?.length > 0 && (
                <Card className="p-4">
                  <p className="text-xs font-bold uppercase mb-2 flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-emerald-600" />Recommended Actions for Founder</p>
                  <div className="space-y-1">{briefing.recommended_actions.map((a, i) => <p key={i} className="text-xs text-muted-foreground">• {a}</p>)}</div>
                </Card>
              )}

              {briefing.revenue_opportunities?.length > 0 && (
                <Card className="p-4 border border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/10">
                  <p className="text-xs font-bold uppercase mb-2 flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5 text-emerald-600" />Revenue Opportunities</p>
                  <div className="space-y-1">{briefing.revenue_opportunities.map((r, i) => <p key={i} className="text-xs text-muted-foreground">• {typeof r === 'string' ? r : JSON.stringify(r)}</p>)}</div>
                </Card>
              )}

              {briefing.risk_warnings?.length > 0 && (
                <Card className="p-4 border border-red-200 bg-red-50/50 dark:bg-red-950/10">
                  <p className="text-xs font-bold uppercase mb-2 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 text-red-600" />Risk Warnings</p>
                  <div className="space-y-1">{briefing.risk_warnings.map((r, i) => <p key={i} className="text-xs text-red-600">• {r}</p>)}</div>
                </Card>
              )}
            </>
          ) : (
            <Card className="p-8 text-center">
              <Activity className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground mb-3">No executive briefing yet. Run the daily scan to generate one.</p>
              <Button onClick={runScan} disabled={scanning}><Sparkles className="w-4 h-4 mr-1.5" />Run First Scan</Button>
            </Card>
          )}
        </TabsContent>

        {/* Backlog Tab */}
        <TabsContent value="backlog" className="space-y-4 mt-4">
          <BacklogList items={queued} expandedItem={expandedItem} setExpandedItem={setExpandedItem} onApprove={approve} onDismiss={dismiss} filterDimension={filterDimension} setFilterDimension={setFilterDimension} loading={loading} />
        </TabsContent>

        <TabsContent value="approved" className="space-y-4 mt-4">
          <BacklogList items={approved} expandedItem={expandedItem} setExpandedItem={setExpandedItem} onStart={startExec} showStart loading={loading} />
        </TabsContent>

        <TabsContent value="in_progress" className="space-y-4 mt-4">
          <BacklogList items={inProgress} expandedItem={expandedItem} setExpandedItem={setExpandedItem} loading={loading} />
        </TabsContent>

        <TabsContent value="done" className="space-y-4 mt-4">
          <BacklogList items={done} expandedItem={expandedItem} setExpandedItem={setExpandedItem} loading={loading} />
        </TabsContent>

        {/* 13 Dimensions Tab */}
        <TabsContent value="dimensions" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {DIMENSIONS.map(d => {
              const items = byDimension[d.key] || [];
              const score = dimensionScores[d.key];
              return (
                <Card key={d.key} className="p-4 border border-border/60">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded ${d.color}`}><d.icon className="w-3.5 h-3.5" /></div>
                      <p className="text-xs font-semibold">{d.label}</p>
                    </div>
                    <Badge variant="outline" className="text-[9px]">{items.length} items</Badge>
                  </div>
                  {score !== undefined && (
                    <div className="mb-2">
                      <div className="flex items-center justify-between text-[9px] mb-0.5"><span className="text-muted-foreground">Score</span><span className="font-bold">{score}/100</span></div>
                      <Progress value={score} className="h-1.5" />
                    </div>
                  )}
                  {items.length > 0 ? (
                    <div className="space-y-1">
                      {items.slice(0, 3).map(i => (
                        <div key={i.id} className="text-[10px] p-1.5 rounded bg-muted/30">
                          <p className="font-medium truncate">{i.title}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Badge className={`text-[7px] ${PRIORITY_COLORS[i.priority] || PRIORITY_COLORS.medium}`}>{i.priority}</Badge>
                            {i.estimated_revenue_impact > 0 && <span className="text-emerald-600 text-[8px]">+${i.estimated_revenue_impact}/mo</span>}
                          </div>
                        </div>
                      ))}
                      {items.length > 3 && <p className="text-[9px] text-muted-foreground text-center">+{items.length - 3} more</p>}
                    </div>
                  ) : <p className="text-[10px] text-muted-foreground text-center py-2">No issues found</p>}
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Backlog List Component
function BacklogList({ items, expandedItem, setExpandedItem, onApprove, onDismiss, onStart, showStart, loading }) {
  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  if (items.length === 0) return <Card className="p-8 text-center text-muted-foreground text-sm">No items in this stage.</Card>;

  return (
    <div className="space-y-2">
      {items.map(item => {
        const dim = DIMENSIONS.find(d => d.key === item.improvement_dimension) || DIMENSIONS[9];
        const expanded = expandedItem === item.id;
        return (
          <Card key={item.id} className="p-4 border border-border/60">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <div className={`p-1 rounded ${dim.color}`}><dim.icon className="w-3 h-3" /></div>
                <Badge className={`text-[9px] ${PRIORITY_COLORS[item.priority] || PRIORITY_COLORS.medium}`}>{item.priority}</Badge>
                <Badge variant="outline" className="text-[9px]">{dim.label}</Badge>
                {item.bottleneck_type !== 'none' && <Badge className="text-[9px] bg-orange-100 text-orange-700">{item.bottleneck_type?.replace(/_/g, " ")}</Badge>}
                <Badge className={`text-[9px] ${STATUS_COLORS[item.status] || STATUS_COLORS.queued}`}>{item.status?.replace(/_/g, " ")}</Badge>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="text-right">
                  <p className="text-xs font-bold text-violet-600">ROI {item.estimated_roi_score}/100</p>
                  {item.estimated_revenue_impact > 0 && <p className="text-[10px] text-emerald-600">+${item.estimated_revenue_impact}/mo</p>}
                </div>
              </div>
            </div>

            <p className="text-sm font-semibold mb-1">{item.title}</p>
            <p className="text-xs text-muted-foreground">{item.description}</p>

            {expanded && (
              <div className="mt-3 pt-3 border-t border-border/40 space-y-2">
                {item.recommended_fix && <p className="text-xs"><span className="font-semibold">Recommended Fix:</span> <span className="text-muted-foreground">{item.recommended_fix}</span></p>}
                {item.what_it_unlocks && <p className="text-xs"><span className="font-semibold">Unlocks:</span> <span className="text-muted-foreground">{item.what_it_unlocks}</span></p>}
                {item.risk_if_delayed && <p className="text-xs text-red-600"><span className="font-semibold">Risk if delayed:</span> {item.risk_if_delayed}</p>}
                {item.action_steps?.length > 0 && (
                  <div><p className="text-[10px] font-semibold mb-0.5">Action Steps:</p>{item.action_steps.map((s, i) => <p key={i} className="text-[10px] text-muted-foreground ml-3">• {s}</p>)}</div>
                )}
                {item.success_metrics?.length > 0 && (
                  <div><p className="text-[10px] font-semibold mb-0.5">Success Metrics:</p>{item.success_metrics.map((s, i) => <p key={i} className="text-[10px] text-emerald-600 ml-3">• {s}</p>)}</div>
                )}
                <div className="grid grid-cols-3 gap-2 text-[10px] mt-2">
                  <div className="p-1.5 rounded bg-muted/30"><p className="font-bold">{item.estimated_effort}</p><p className="text-muted-foreground">Effort</p></div>
                  <div className="p-1.5 rounded bg-muted/30"><p className="font-bold">{item.estimated_hours}h</p><p className="text-muted-foreground">Hours</p></div>
                  <div className="p-1.5 rounded bg-muted/30"><p className="font-bold">{item.business_impact}</p><p className="text-muted-foreground">Biz Impact</p></div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/40">
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                {item.assigned_agent && <span className="flex items-center gap-0.5"><Zap className="w-3 h-3" />{item.assigned_agent}</span>}
                {item.readiness_increase_pct > 0 && <span className="text-emerald-600">+{item.readiness_increase_pct}% readiness</span>}
                {item.scan_date && <span>· {moment(item.scan_date).format("MMM D")}</span>}
              </div>
              <div className="flex items-center gap-1.5">
                <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => setExpandedItem(expanded ? null : item.id)}>{expanded ? "Hide" : "Details"}</Button>
                {onApprove && item.status === 'queued' && <Button size="sm" className="h-7 text-[10px] bg-emerald-600 hover:bg-emerald-700" onClick={() => onApprove(item.id)}><CheckCircle className="w-3 h-3 mr-0.5" />Approve</Button>}
                {onDismiss && item.status === 'queued' && <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => onDismiss(item.id)}><X className="w-3 h-3 mr-0.5" />Dismiss</Button>}
                {showStart && onStart && <Button size="sm" className="h-7 text-[10px]" onClick={() => onStart(item.id)}><Play className="w-3 h-3 mr-0.5" />Start</Button>}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}