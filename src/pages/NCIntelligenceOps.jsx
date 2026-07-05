import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Brain, Activity, Shield, AlertTriangle, Sparkles, Loader2, Zap, Crown, HeartHandshake, Bot, DollarSign, Server, BookOpen, Target, CheckCircle2, Wrench, Lightbulb, Network, FileWarning, ArrowRight, Building2, Scale, Code, FileText, GraduationCap, Users, Music } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "react-router-dom";
import moment from "moment";

const STATUS_COLORS = {
  excellent: "text-emerald-600 bg-emerald-50 border-emerald-200",
  good: "text-blue-600 bg-blue-50 border-blue-200",
  fair: "text-amber-600 bg-amber-50 border-amber-200",
  at_risk: "text-orange-600 bg-orange-50 border-orange-200",
  critical: "text-red-600 bg-red-50 border-red-200",
};

const SEVERITY_COLORS = {
  critical: "text-red-600 bg-red-50 border-red-200",
  high: "text-orange-600 bg-orange-50 border-orange-200",
  medium: "text-amber-600 bg-amber-50 border-amber-200",
  low: "text-blue-600 bg-blue-50 border-blue-200",
  info: "text-slate-600 bg-slate-50 border-slate-200",
};

const ENTITY_ICONS = {
  platform: Server, revenue: DollarSign, customer: HeartHandshake, member: Bot,
  director: Crown, enterprise: Building2, ai: Bot, governance: Shield,
  canon: BookOpen, legal: Scale, security: Shield, engineering: Wrench,
  development: Code, knowledge: Brain, automation: Zap, workflow: Network,
  deployment: Server, infrastructure: Server, documentation: FileText,
  training: GraduationCap, community: Users, culture: Music,
  founder_workload: Crown, operational_readiness: Target,
};

function ScoreGauge({ label, score, icon: Icon, sub }) {
  const color = score >= 70 ? "text-emerald-600" : score >= 45 ? "text-amber-600" : "text-red-600";
  const bg = score >= 70 ? "from-emerald-500 to-emerald-600" : score >= 45 ? "from-amber-500 to-amber-600" : "from-red-500 to-red-600";
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">{label}</p>
          <p className={`text-4xl font-black mt-1 ${color}`}>{score}<span className="text-xl text-muted-foreground">/100</span></p>
        </div>
        <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${bg} flex items-center justify-center`}>
          <Icon className="w-7 h-7 text-white" />
        </div>
      </div>
      <Progress value={score} className="h-2" />
      {sub && <p className="text-[10px] text-muted-foreground mt-2">{sub}</p>}
    </Card>
  );
}

function HealthCard({ score }) {
  const Icon = ENTITY_ICONS[score.entity_type] || Activity;
  const statusColor = STATUS_COLORS[score.status] || STATUS_COLORS.fair;
  return (
    <Card className={`p-4 border ${statusColor.split(' ').slice(-1)[0]}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-muted-foreground" />
          <p className="text-sm font-semibold">{score.entity_name || score.entity_type}</p>
        </div>
        <Badge variant="outline" className={`text-[10px] capitalize ${statusColor}`}>{score.status?.replace('_', ' ')}</Badge>
      </div>
      <div className="flex items-baseline gap-2 mb-2">
        <p className="text-2xl font-black">{score.score}</p>
        <p className="text-xs text-muted-foreground">/100</p>
        {score.trend === 'improving' && <span className="text-xs text-emerald-600">↑</span>}
        {score.trend === 'declining' && <span className="text-xs text-red-600">↓</span>}
      </div>
      <Progress value={score.score} className="h-1.5 mb-2" />
      {score.root_causes?.length > 0 && (
        <div className="space-y-1">
          {score.root_causes.slice(0, 2).map((rc, i) => (
            <p key={i} className="text-[10px] text-muted-foreground flex items-start gap-1">
              <AlertTriangle className="w-2.5 h-2.5 text-amber-500 flex-shrink-0 mt-0.5" />
              {rc}
            </p>
          ))}
        </div>
      )}
      {score.recommended_actions?.length > 0 && score.score < 65 && (
        <div className="mt-2 pt-2 border-t border-border/40">
          <p className="text-[10px] font-semibold text-muted-foreground mb-1">Recommended:</p>
          {score.recommended_actions.slice(0, 1).map((a, i) => (
            <p key={i} className="text-[10px] text-foreground">{a}</p>
          ))}
        </div>
      )}
    </Card>
  );
}

function FindingCard({ finding }) {
  const sevColor = SEVERITY_COLORS[finding.severity] || SEVERITY_COLORS.medium;
  return (
    <Card className="p-4 border border-border/60">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <FileWarning className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <p className="text-sm font-semibold">{finding.title}</p>
        </div>
        <Badge variant="outline" className={`text-[10px] capitalize flex-shrink-0 ${sevColor}`}>{finding.severity}</Badge>
      </div>
      <p className="text-xs text-muted-foreground mb-2">{finding.description}</p>
      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
        <span className="capitalize">Type: {finding.finding_type?.replace(/_/g, ' ')}</span>
        <span>Effort: {finding.estimated_effort}</span>
        {finding.auto_fix_eligible && <Badge variant="secondary" className="text-[9px]">Auto-fix eligible</Badge>}
      </div>
      {finding.recommended_fix && (
        <p className="text-xs mt-2 pt-2 border-t border-border/40"><span className="font-semibold">Fix:</span> {finding.recommended_fix}</p>
      )}
    </Card>
  );
}

function FounderAttentionItem({ item }) {
  const sevColor = SEVERITY_COLORS[item.severity] || SEVERITY_COLORS.medium;
  return (
    <Link to={item.url || '#'} className="block">
      <Card className={`p-3 border ${sevColor.split(' ').slice(-1)[0]} hover:shadow-md transition-shadow`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Badge variant="outline" className={`text-[9px] flex-shrink-0 ${sevColor}`}>{item.source}</Badge>
            <p className="text-xs font-medium truncate">{item.title}</p>
          </div>
          <ArrowRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
        </div>
      </Card>
    </Link>
  );
}

export default function NCIntelligenceOps() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [runningAudit, setRunningAudit] = useState(false);
  const [runningDiag, setRunningDiag] = useState(false);
  const [runningAgg, setRunningAgg] = useState(false);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('ncIntelligenceOps', { operation: 'dashboard' });
      setData(res.data);
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Failed to load NIOC dashboard');
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  const runHealthAudit = async () => {
    setRunningAudit(true);
    try {
      await base44.functions.invoke('ncIntelligenceOps', { operation: 'health_audit' });
      await loadDashboard();
    } catch (e) { setError(e.message); }
    setRunningAudit(false);
  };

  const runDiagnostics = async () => {
    setRunningDiag(true);
    try {
      await base44.functions.invoke('ncIntelligenceOps', { operation: 'diagnose' });
      await loadDashboard();
    } catch (e) { setError(e.message); }
    setRunningDiag(false);
  };

  const runAggregation = async () => {
    setRunningAgg(true);
    try {
      await base44.functions.invoke('ncIntelligenceOps', { operation: 'aggregate_intelligence' });
      await loadDashboard();
    } catch (e) { setError(e.message); }
    setRunningAgg(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-3">
          <Brain className="w-10 h-10 text-primary mx-auto animate-pulse" />
          <p className="text-muted-foreground text-sm">Initializing Intelligence Operations Center...</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-destructive mx-auto" />
          <p className="text-destructive text-sm">{error}</p>
          <Button onClick={loadDashboard} variant="outline" size="sm">Retry</Button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const d = data;
  const healthScores = d.health_scores || [];
  const findings = d.diagnostic_findings?.items || [];
  const founderAttention = d.founder_attention_required || [];
  const intelFeed = d.org_intelligence_feed || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">NCOS · Intelligence Operations Center</p>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Brain className="w-6 h-6 text-primary" />NIOC — Central Nervous System
          </h1>
          <p className="text-muted-foreground text-sm">{moment().format("dddd, MMMM D, YYYY")} · Unified Health · Self-Diagnosis · Organizational Intelligence</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={runHealthAudit} disabled={runningAudit} variant="outline" size="sm">
            {runningAudit ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Activity className="w-4 h-4 mr-1.5" />}
            {runningAudit ? "Auditing..." : "Health Audit"}
          </Button>
          <Button onClick={runDiagnostics} disabled={runningDiag} variant="outline" size="sm">
            {runningDiag ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Shield className="w-4 h-4 mr-1.5" />}
            {runningDiag ? "Diagnosing..." : "Run Diagnostics"}
          </Button>
          <Button onClick={runAggregation} disabled={runningAgg} size="sm">
            {runningAgg ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Sparkles className="w-4 h-4 mr-1.5" />}
            {runningAgg ? "Aggregating..." : "Aggregate Intel"}
          </Button>
        </div>
      </div>

      {/* Top Scores Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ScoreGauge label="Platform Readiness" score={d.platform_readiness_score || 0} icon={Target} sub="Composite of all health domains" />
        <ScoreGauge label="Founder Workload Reduction" score={d.founder_workload_reduction_score || 0} icon={Crown} sub="Higher = less founder burden" />
        <ScoreGauge label="Intelligence Growth" score={d.intelligence_growth_score || 0} icon={Brain} sub="Accumulated organizational intelligence" />
        <ScoreGauge label="Autonomy Readiness" score={d.autonomy_readiness_score || 0} icon={Zap} sub="Self-improving capability" />
      </div>

      {/* Founder Attention Required */}
      {founderAttention.length > 0 && (
        <Card className="p-4 border-red-200 bg-red-50/50">
          <div className="flex items-center gap-2 mb-3">
            <Crown className="w-4 h-4 text-red-500" />
            <h2 className="text-sm font-semibold text-red-700">Founder Attention Required ({founderAttention.length})</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {founderAttention.slice(0, 8).map((item, i) => <FounderAttentionItem key={i} item={item} />)}
          </div>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="health">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="health"><Activity className="w-3.5 h-3.5 mr-1" />Health Scores</TabsTrigger>
          <TabsTrigger value="diagnostics"><Shield className="w-3.5 h-3.5 mr-1" />Diagnostics ({d.diagnostic_findings?.total || 0})</TabsTrigger>
          <TabsTrigger value="intelligence"><Brain className="w-3.5 h-3.5 mr-1" />Intelligence Feed</TabsTrigger>
          <TabsTrigger value="modules"><Network className="w-3.5 h-3.5 mr-1" />Module Status</TabsTrigger>
        </TabsList>

        {/* Health Scores Tab */}
        <TabsContent value="health" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {healthScores.length > 0 ? (
              healthScores.map((hs, i) => <HealthCard key={i} score={hs} />)
            ) : (
              <div className="col-span-full text-center py-12">
                <Activity className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">No health scores yet. Run a Health Audit to calculate scores for all 24 domains.</p>
                <Button onClick={runHealthAudit} disabled={runningAudit} size="sm" className="mt-3">
                  {runningAudit ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Activity className="w-4 h-4 mr-1.5" />}
                  Run Health Audit
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Diagnostics Tab */}
        <TabsContent value="diagnostics" className="space-y-4 mt-4">
          {findings.length > 0 ? (
            <div className="space-y-3">
              <div className="flex gap-2 flex-wrap mb-2">
                {d.diagnostic_findings.critical > 0 && <Badge variant="destructive" className="text-xs">{d.diagnostic_findings.critical} critical</Badge>}
                {d.diagnostic_findings.high > 0 && <Badge className="text-xs bg-orange-100 text-orange-700 border-orange-200">{d.diagnostic_findings.high} high</Badge>}
                {d.diagnostic_findings.medium > 0 && <Badge className="text-xs bg-amber-100 text-amber-700 border-amber-200">{d.diagnostic_findings.medium} medium</Badge>}
                {d.diagnostic_findings.auto_fix_eligible > 0 && <Badge variant="secondary" className="text-xs">{d.diagnostic_findings.auto_fix_eligible} auto-fixable</Badge>}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {findings.map((f, i) => <FindingCard key={i} finding={f} />)}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">No active diagnostic findings. Run diagnostics to detect issues.</p>
              <Button onClick={runDiagnostics} disabled={runningDiag} size="sm" className="mt-3">
                {runningDiag ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Shield className="w-4 h-4 mr-1.5" />}
                Run Diagnostics
              </Button>
            </div>
          )}
        </TabsContent>

        {/* Intelligence Feed Tab */}
        <TabsContent value="intelligence" className="space-y-4 mt-4">
          {intelFeed.length > 0 ? (
            <div className="space-y-2">
              {intelFeed.map((intel, i) => (
                <Card key={i} className="p-3 border border-border/60">
                  <div className="flex items-start gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-[9px] capitalize">{intel.insight_type?.replace(/_/g, ' ')}</Badge>
                        {intel.priority && <Badge variant="secondary" className="text-[9px] capitalize">{intel.priority}</Badge>}
                        <span className="text-[10px] text-muted-foreground">{intel.source?.replace(/_/g, ' ')}</span>
                      </div>
                      <p className="text-sm font-medium">{intel.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{intel.description}</p>
                      {intel.recommended_action && (
                        <p className="text-xs mt-1 pt-1 border-t border-border/40"><span className="font-semibold text-[10px]">Action:</span> {intel.recommended_action}</p>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Brain className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">No organizational intelligence yet. Run aggregation to collect insights from all modules.</p>
              <Button onClick={runAggregation} disabled={runningAgg} size="sm" className="mt-3">
                {runningAgg ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Sparkles className="w-4 h-4 mr-1.5" />}
                Aggregate Intelligence
              </Button>
            </div>
          )}
        </TabsContent>

        {/* Module Status Tab */}
        <TabsContent value="modules" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {Object.entries(d.module_summary || {}).map(([key, value]) => (
              <Card key={key} className="p-3 text-center">
                <p className="text-2xl font-black text-primary">{value}</p>
                <p className="text-[10px] text-muted-foreground mt-1 capitalize">{key.replace(/_/g, ' ')}</p>
              </Card>
            ))}
          </div>
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Network className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold">Module Integration Status</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {[
                { name: "Executive Command", path: "/executive-command", integrated: true },
                { name: "Mission Control", path: "/mission-control", integrated: true },
                { name: "Daily Compass", path: "/", integrated: true },
                { name: "Customer Success", path: "/customer-success", integrated: true },
                { name: "CRM Command", path: "/crm", integrated: true },
                { name: "AI Workforce", path: "/workforce", integrated: true },
                { name: "NC Canon", path: "/canon", integrated: true },
                { name: "Knowledge Graph", path: "/knowledge", integrated: true },
                { name: "Dev Memory", path: "/nc-dev-memory", integrated: true },
                { name: "Self Governance", path: "/self-governance", integrated: true },
                { name: "Financial Intelligence", path: "/financial-intelligence", integrated: true },
                { name: "Evolution Engine", path: "/evolution-engine", integrated: true },
                { name: "Dependency Engine", path: "/dependency-engine", integrated: true },
                { name: "Project Director", path: "/project-director", integrated: true },
                { name: "Director Assistant", path: "/director-assistant", integrated: true },
                { name: "Governance OS", path: "/self-governance", integrated: true },
                { name: "Notification Center", path: "/notifications", integrated: true },
                { name: "Survival Engine", path: "/survival", integrated: true },
              ].map(m => (
                <Link key={m.name} to={m.path} className="flex items-center justify-between p-2 rounded-lg border border-border/40 hover:bg-muted/30 transition-colors">
                  <span className="text-xs font-medium">{m.name}</span>
                  {m.integrated ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
                </Link>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {error && (
        <Card className="p-3 border-red-200 bg-red-50">
          <p className="text-xs text-red-600">{error}</p>
        </Card>
      )}
    </div>
  );
}