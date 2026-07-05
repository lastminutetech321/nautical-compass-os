import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Activity, Brain, TrendingUp, AlertTriangle, Target, Zap, Users, Building2,
  DollarSign, Sparkles, RefreshCw, Gauge, Bot, BookOpen, Lightbulb, Crown,
  ArrowRight, TrendingDown, Clock, Server
} from "lucide-react";

const riskColor = (level) => ({
  critical: "bg-red-500", high: "bg-orange-500", medium: "bg-amber-500", low: "bg-emerald-500"
}[level] || "bg-slate-400");

const healthColor = (score) => {
  if (score >= 80) return "text-emerald-600";
  if (score >= 60) return "text-blue-600";
  if (score >= 40) return "text-amber-600";
  return "text-red-600";
};

const healthBg = (score) => {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 60) return "bg-blue-500";
  if (score >= 40) return "bg-amber-500";
  return "bg-red-500";
};

function MetricCard({ icon: Icon, label, value, sub, color = "text-primary", to }) {
  const content = (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className={`p-2 rounded-lg bg-primary/10 ${color}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
  return to ? <Link to={to}>{content}</Link> : content;
}

function HealthBar({ score }) {
  return (
    <div className="flex items-center gap-2">
      <Progress value={score} className="flex-1 h-2" />
      <span className={`text-sm font-semibold ${healthColor(score)}`}>{score}</span>
    </div>
  );
}

function TopList({ items, renderItem, title, icon: Icon, color }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Icon className={`h-4 w-4 ${color}`} /> {title}
          <Badge variant="secondary" className="ml-auto">{items.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        {items.length === 0 && <p className="text-xs text-muted-foreground">No items.</p>}
        {items.slice(0, 10).map((item, i) => renderItem(item, i))}
      </CardContent>
    </Card>
  );
}

export default function NAILDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('ncNAIL', { operation: 'founder_dashboard' });
      setData(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const runLoop = async () => {
    setRunning(true);
    try {
      await base44.functions.invoke('ncNAIL', { operation: 'run_full_loop' });
      await loadData();
    } catch (e) {
      console.error(e);
    } finally {
      setRunning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const brief = data?.latest_brief;
  const iq = data?.latest_iq;
  const reflection = data?.latest_reflection;
  const moduleHealth = data?.module_health || [];
  const deptHealth = data?.department_health || [];
  const aiHealth = data?.ai_health || [];
  const execReviews = data?.executive_reviews || [];
  const iqHistory = data?.iq_history || [];

  const orgHealth = brief?.org_health_score || 0;
  const orgIQ = brief?.org_iq || iq?.org_iq || 0;
  const orgReadiness = brief?.org_readiness || 0;
  const systemConfidence = brief?.system_confidence || 0;

  const topPriorities = brief?.top_priorities || [];
  const topRisks = brief?.top_risks || [];
  const topOpportunities = brief?.top_opportunities || [];
  const topDelegation = brief?.top_delegation_candidates || [];
  const topAutomation = brief?.top_automation_candidates || [];
  const topRevenue = brief?.top_revenue_opportunities || [];
  const topCustomers = brief?.top_customers_needing_attention || [];
  const topWorkers = brief?.top_workers_ready_advancement || [];
  const topDepts = brief?.top_departments_needing_intervention || [];
  const highestROI = brief?.highest_roi_action;

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-violet-500" />
            NC Autonomous Intelligence Loop
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            The unified self-observing, self-measuring, self-improving operating system. {data?.modules_count || 0} modules · {data?.departments_count || 0} departments · {data?.ai_agents_count || 0} AI agents.
          </p>
        </div>
        <Button onClick={runLoop} disabled={running} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${running ? 'animate-spin' : ''}`} />
          {running ? 'Running Full Loop...' : 'Run Full Loop Now'}
        </Button>
      </div>

      {/* Top Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <MetricCard icon={Gauge} label="Org Health" value={`${orgHealth}`} sub="/100" color={healthColor(orgHealth)} to="/noos" />
        <MetricCard icon={Brain} label="Organizational IQ" value={orgIQ} sub={iq?.iq_label || iqLabel(orgIQ)} color="text-violet-600" />
        <MetricCard icon={Activity} label="Org Readiness" value={`${orgReadiness}`} sub="/100" color={healthColor(orgReadiness)} to="/build-nc" />
        <MetricCard icon={Target} label="System Confidence" value={`${systemConfidence}`} sub="/100" color="text-blue-600" />
        <MetricCard icon={Clock} label="Founder Time Saved" value={`${brief?.founder_time_saved_week_hours || 0}h`} sub="/week" color="text-emerald-600" />
        <MetricCard icon={Zap} label="Automation" value={`${brief?.automation_coverage_pct || 0}%`} sub="coverage" color="text-amber-600" to="/automations" />
      </div>

      {/* Domain Health Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <MetricCard icon={Users} label="Customer Health" value={`${brief?.customer_health || 0}`} color={healthColor(brief?.customer_health || 0)} to="/customer-success" />
        <MetricCard icon={Building2} label="Workforce Health" value={`${brief?.workforce_health || 0}`} color={healthColor(brief?.workforce_health || 0)} to="/workforce-gateway" />
        <MetricCard icon={DollarSign} label="Revenue Health" value={`${brief?.revenue_health || 0}`} color={healthColor(brief?.revenue_health || 0)} to="/crm-revenue" />
        <MetricCard icon={BookOpen} label="Legal Readiness" value={`${brief?.legal_readiness || 0}`} color={healthColor(brief?.legal_readiness || 0)} to="/canon" />
        <MetricCard icon={DollarSign} label="Financial Readiness" value={`${brief?.financial_readiness || 0}`} color={healthColor(brief?.financial_readiness || 0)} to="/financial-intelligence" />
      </div>

      {/* Highest ROI Action */}
      {highestROI && (
        <Card className="border-violet-200 bg-violet-50/50 dark:bg-violet-950/20">
          <CardContent className="p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-violet-500 text-white">
                <Crown className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Highest ROI Action Today</p>
                <p className="text-lg font-bold">{highestROI.action}</p>
                <p className="text-sm text-muted-foreground">Est. impact: ${highestROI.roi?.toLocaleString?.() || highestROI.roi}</p>
              </div>
            </div>
            {highestROI.dashboard && (
              <Link to={highestROI.dashboard}>
                <Button variant="outline" className="gap-2">Take Action <ArrowRight className="h-4 w-4" /></Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      {/* Predictions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4 text-emerald-500" />Predicted Revenue (ARR)</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-emerald-600">${(brief?.predicted_revenue || 0).toLocaleString()}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingDown className="h-4 w-4 text-red-500" />Predicted Churn</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-red-600">{brief?.predicted_churn?.length || 0} customers</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Clock className="h-4 w-4 text-blue-500" />Predicted Founder Workload</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-blue-600">{Math.round(brief?.predicted_founder_workload_hours || 0)}h/day</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Bot className="h-4 w-4 text-violet-500" />Predicted AI Workload</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-violet-600">{Math.round(brief?.predicted_ai_workload_hours || 0)}h/day</p></CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="priorities">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 lg:grid-cols-8 h-auto">
          <TabsTrigger value="priorities" className="text-xs">Priorities</TabsTrigger>
          <TabsTrigger value="risks" className="text-xs">Risks</TabsTrigger>
          <TabsTrigger value="opportunities" className="text-xs">Opportunities</TabsTrigger>
          <TabsTrigger value="modules" className="text-xs">Modules</TabsTrigger>
          <TabsTrigger value="departments" className="text-xs">Departments</TabsTrigger>
          <TabsTrigger value="executives" className="text-xs">AI Execs</TabsTrigger>
          <TabsTrigger value="reflection" className="text-xs">Reflection</TabsTrigger>
          <TabsTrigger value="iq" className="text-xs">Org IQ</TabsTrigger>
        </TabsList>

        {/* Priorities Tab — Founder Intelligence Mode */}
        <TabsContent value="priorities" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TopList title="Top 10 Priorities" icon={Target} color="text-red-500" items={topPriorities}
              renderItem={(item, i) => (
                <div key={i} className="flex items-start gap-2 p-2 rounded-lg hover:bg-accent">
                  <Badge className="mt-0.5">{item.priority || 50}</Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.action}</p>
                  </div>
                  {item.dashboard && <Link to={item.dashboard}><ArrowRight className="h-4 w-4 text-muted-foreground" /></Link>}
                </div>
              )} />
            <TopList title="Top 10 Risks" icon={AlertTriangle} color="text-orange-500" items={topRisks}
              renderItem={(item, i) => (
                <div key={i} className="flex items-start gap-2 p-2 rounded-lg hover:bg-accent">
                  <div className={`w-2 h-2 rounded-full mt-2 ${riskColor(item.level)}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{item.risk}</p>
                    <p className="text-xs text-muted-foreground">{item.detail}</p>
                  </div>
                </div>
              )} />
            <TopList title="Top 10 Opportunities" icon={Lightbulb} color="text-amber-500" items={topOpportunities}
              renderItem={(item, i) => (
                <div key={i} className="flex items-start gap-2 p-2 rounded-lg hover:bg-accent">
                  <Badge variant="outline" className="text-xs">{item.impact}</Badge>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.opportunity}</p>
                    <p className="text-xs text-muted-foreground">Effort: {item.effort}</p>
                  </div>
                  {item.dashboard && <Link to={item.dashboard}><ArrowRight className="h-4 w-4 text-muted-foreground" /></Link>}
                </div>
              )} />
            <TopList title="Top 10 Delegation Candidates" icon={Users} color="text-blue-500" items={topDelegation}
              renderItem={(item, i) => (
                <div key={i} className="flex items-start gap-2 p-2 rounded-lg hover:bg-accent">
                  <Bot className="h-4 w-4 text-blue-500 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.task}</p>
                    <p className="text-xs text-muted-foreground">{item.reason}</p>
                  </div>
                </div>
              )} />
            <TopList title="Top 10 Automation Candidates" icon={Zap} color="text-amber-500" items={topAutomation}
              renderItem={(item, i) => (
                <div key={i} className="flex items-start gap-2 p-2 rounded-lg hover:bg-accent">
                  <Zap className="h-4 w-4 text-amber-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.candidate}</p>
                    <p className="text-xs text-muted-foreground">Effort: {item.effort} · Impact: {item.impact}</p>
                  </div>
                </div>
              )} />
            <TopList title="Top 10 Revenue Opportunities" icon={DollarSign} color="text-emerald-500" items={topRevenue}
              renderItem={(item, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent">
                  <div className="flex-1">
                    <p className="text-sm font-medium truncate">{item.customer}</p>
                    <p className="text-xs text-muted-foreground">{item.action}</p>
                  </div>
                  <span className="text-sm font-bold text-emerald-600">${(item.mrr || 0).toLocaleString()}/mo</span>
                  {item.dashboard && <Link to={item.dashboard}><ArrowRight className="h-4 w-4 text-muted-foreground" /></Link>}
                </div>
              )} />
            <TopList title="Top 10 Customers Needing Attention" icon={Users} color="text-red-500" items={topCustomers}
              renderItem={(item, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent">
                  <div className="flex-1">
                    <p className="text-sm font-medium truncate">{item.customer}</p>
                    <p className="text-xs text-muted-foreground">Health: {item.health} · Churn: {item.churn_risk} · MRR: ${item.mrr}</p>
                  </div>
                  {item.dashboard && <Link to={item.dashboard}><ArrowRight className="h-4 w-4 text-muted-foreground" /></Link>}
                </div>
              )} />
            <TopList title="Top 10 Workers Ready for Advancement" icon={TrendingUp} color="text-violet-500" items={topWorkers}
              renderItem={(item, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent">
                  <div className="flex-1">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">Readiness: {item.readiness} · Trust: {item.trust}</p>
                  </div>
                  {item.dashboard && <Link to={item.dashboard}><ArrowRight className="h-4 w-4 text-muted-foreground" /></Link>}
                </div>
              )} />
          </div>
          <TopList title="Top 10 Departments Requiring Intervention" icon={Building2} color="text-orange-500" items={topDepts}
            renderItem={(item, i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">Health: {item.health} · Readiness: {item.readiness} · Risk: {item.risk}</p>
                </div>
                {item.dashboard && <Link to={item.dashboard}><ArrowRight className="h-4 w-4 text-muted-foreground" /></Link>}
              </div>
            )} />
        </TabsContent>

        {/* Risks */}
        <TabsContent value="risks" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-red-500" />Top Risks</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {(brief?.top_risks || []).map((r, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg border">
                    <div className={`w-3 h-3 rounded-full mt-1.5 ${riskColor(r.level)}`} />
                    <div><p className="font-medium text-sm">{r.risk}</p><p className="text-xs text-muted-foreground">{r.detail}</p></div>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Server className="h-4 w-4 text-amber-500" />Predicted Bottlenecks</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {moduleHealth.filter(m => m.predicted_bottleneck).length === 0 && <p className="text-sm text-muted-foreground">No predicted bottlenecks.</p>}
                {moduleHealth.filter(m => m.predicted_bottleneck).map((m, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded-lg border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <div className="flex-1"><p className="text-sm font-medium">{m.module_name}</p><p className="text-xs text-muted-foreground">Health: {m.health_score}</p></div>
                    {m.dashboard && <Link to={m.dashboard}><ArrowRight className="h-4 w-4" /></Link>}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Opportunities */}
        <TabsContent value="opportunities" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <TopList title="Opportunities" icon={Lightbulb} color="text-amber-500" items={topOpportunities}
              renderItem={(item, i) => (
                <div key={i} className="p-2 rounded-lg hover:bg-accent">
                  <p className="text-sm font-medium">{item.opportunity}</p>
                  <p className="text-xs text-muted-foreground">Impact: {item.impact} · Effort: {item.effort}</p>
                </div>
              )} />
            <TopList title="Automation Candidates" icon={Zap} color="text-amber-500" items={topAutomation}
              renderItem={(item, i) => (
                <div key={i} className="p-2 rounded-lg hover:bg-accent">
                  <p className="text-sm font-medium">{item.candidate}</p>
                  <p className="text-xs text-muted-foreground">Effort: {item.effort} · Impact: {item.impact}</p>
                </div>
              )} />
            <TopList title="Delegation Candidates" icon={Users} color="text-blue-500" items={topDelegation}
              renderItem={(item, i) => (
                <div key={i} className="p-2 rounded-lg hover:bg-accent">
                  <p className="text-sm font-medium truncate">{item.task}</p>
                  <p className="text-xs text-muted-foreground">{item.delegate_to} — {item.reason}</p>
                </div>
              )} />
          </div>
        </TabsContent>

        {/* Module Health */}
        <TabsContent value="modules" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Server className="h-4 w-4" />Module Health — {moduleHealth.length} Modules Observed</CardTitle><CardDescription>Every module publishes health, confidence, risk, opportunity, dependencies, and recommended actions.</CardDescription></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {moduleHealth.map((m, i) => (
                  <div key={i} className="p-3 rounded-lg border space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm truncate">{m.module_name}</p>
                      {m.dashboard && <Link to={m.dashboard}><ArrowRight className="h-3 w-3 text-muted-foreground" /></Link>}
                    </div>
                    <HealthBar score={m.health_score} />
                    <div className="flex items-center justify-between text-xs">
                      <Badge variant="outline" className="text-xs">{m.records_count} records</Badge>
                      <Badge variant="outline" className={`text-xs ${riskColor(m.risk_level)} text-white border-0`}>{m.risk_level}</Badge>
                    </div>
                    {m.predicted_bottleneck && <p className="text-xs text-amber-600 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Predicted bottleneck</p>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Department Health */}
        <TabsContent value="departments" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="h-4 w-4" />Department Health — {deptHealth.length} Departments</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {deptHealth.map((d, i) => (
                  <div key={i} className="p-3 rounded-lg border space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm">{d.name}</p>
                      <Badge variant="outline" className={`text-xs ${riskColor(d.risk)} text-white border-0`}>{d.risk}</Badge>
                    </div>
                    <div className="space-y-1">
                      <div><span className="text-xs text-muted-foreground">Health</span><HealthBar score={d.health} /></div>
                      <div><span className="text-xs text-muted-foreground">Readiness</span><HealthBar score={d.readiness} /></div>
                      <div><span className="text-xs text-muted-foreground">Automation</span><HealthBar score={d.automation} /></div>
                    </div>
                    {d.ai_executive && <p className="text-xs text-muted-foreground flex items-center gap-1"><Bot className="h-3 w-3" /> {d.ai_executive}</p>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Executives */}
        <TabsContent value="executives" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Bot className="h-4 w-4 text-violet-500" />AI Executive Daily Reviews — {execReviews.length} Executives</CardTitle><CardDescription>Each AI executive performs a daily review: department health, risks, opportunities, recommendations, 30/90-day forecasts.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              {execReviews.map((r, i) => (
                <div key={i} className="p-3 rounded-lg border space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold flex items-center gap-2"><Bot className="h-4 w-4 text-violet-500" />{r.executive}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{r.dept}</Badge>
                      <span className={`text-sm font-bold ${healthColor(r.health)}`}>{r.health}/100</span>
                      {r.requires_approval && <Badge variant="secondary" className="text-xs">Founder approval</Badge>}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="font-semibold text-muted-foreground mb-1">Risks</p>
                      {(r.risks || []).map((rk, j) => <p key={j} className="text-red-600">• {rk.risk}</p>)}
                      {(r.risks || []).length === 0 && <p className="text-muted-foreground">None</p>}
                    </div>
                    <div>
                      <p className="font-semibold text-muted-foreground mb-1">Opportunities</p>
                      {(r.opportunities || []).map((op, j) => <p key={j} className="text-emerald-600">• {op.opportunity}</p>)}
                      {(r.opportunities || []).length === 0 && <p className="text-muted-foreground">None</p>}
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold text-muted-foreground text-xs mb-1">Recommendations</p>
                    <ul className="text-xs space-y-0.5">{(r.recommendations || []).map((rec, j) => <li key={j}>• {rec}</li>)}</ul>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Bot className="h-4 w-4 text-violet-500" />AI Workforce Health — {aiHealth.length} Agents</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {aiHealth.map((a, i) => (
                  <div key={i} className="p-2 rounded-lg border text-center">
                    <p className="text-xs font-medium truncate">{a.name}</p>
                    <Badge variant="outline" className="text-xs mt-1">{a.status}</Badge>
                    <p className="text-xs text-muted-foreground mt-1">{a.tasks_completed} tasks</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Daily Reflection */}
        <TabsContent value="reflection" className="space-y-4">
          {reflection ? (
            <div className="space-y-4">
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><BookOpen className="h-4 w-4" />Daily Reflection — {reflection.reflection_date}</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div><p className="text-xs font-semibold text-muted-foreground uppercase mb-1">What Happened Today</p><p className="text-sm">{reflection.what_happened_today}</p></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><p className="text-xs font-semibold text-emerald-600 uppercase mb-1">What Improved</p><ul className="text-sm space-y-1">{(reflection.what_improved || []).map((x, i) => <li key={i}>• {x}</li>)}</ul></div>
                    <div><p className="text-xs font-semibold text-red-600 uppercase mb-1">What Failed</p><ul className="text-sm space-y-1">{(reflection.what_failed || []).map((x, i) => <li key={i}>• {x}</li>)}</ul></div>
                    <div><p className="text-xs font-semibold text-amber-600 uppercase mb-1">What Repeated</p><ul className="text-sm space-y-1">{(reflection.what_repeated || []).map((x, i) => <li key={i}>• {x}</li>)}</ul></div>
                    <div><p className="text-xs font-semibold text-violet-600 uppercase mb-1">What Surprised Us</p><ul className="text-sm space-y-1">{(reflection.what_surprised_us || []).map((x, i) => <li key={i}>• {x}</li>)}</ul></div>
                  </div>
                </CardContent>
              </Card>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card><CardHeader><CardTitle className="text-sm">Should Become Automation</CardTitle></CardHeader><CardContent><ul className="text-sm space-y-1">{(reflection.should_become_automation || []).map((x, i) => <li key={i}>• {x.suggestion} <Badge variant="outline" className="ml-1 text-xs">{x.priority}</Badge></li>)}</ul></CardContent></Card>
                <Card><CardHeader><CardTitle className="text-sm">Should Become Policy</CardTitle></CardHeader><CardContent><ul className="text-sm space-y-1">{(reflection.should_become_policy || []).map((x, i) => <li key={i}>• {x.suggestion}</li>)}</ul></CardContent></Card>
                <Card><CardHeader><CardTitle className="text-sm">Should Become Training</CardTitle></CardHeader><CardContent><ul className="text-sm space-y-1">{(reflection.should_become_training || []).map((x, i) => <li key={i}>• {x.suggestion}</li>)}</ul></CardContent></Card>
                <Card><CardHeader><CardTitle className="text-sm">Should Become Memory</CardTitle></CardHeader><CardContent><ul className="text-sm space-y-1">{(reflection.should_become_memory || []).map((x, i) => <li key={i}>• {x}</li>)}</ul></CardContent></Card>
                <Card><CardHeader><CardTitle className="text-sm">Should Become Canon</CardTitle></CardHeader><CardContent><ul className="text-sm space-y-1">{(reflection.should_become_canon || []).map((x, i) => <li key={i}>• {x.suggestion} <Badge variant="outline" className="ml-1 text-xs">{x.priority}</Badge></li>)}</ul></CardContent></Card>
                <Card className="border-violet-200"><CardHeader><CardTitle className="text-sm text-violet-600">Founder Review Tomorrow</CardTitle></CardHeader><CardContent><ul className="text-sm space-y-1">{(reflection.founder_review_tomorrow || []).map((x, i) => <li key={i}>• {x}</li>)}</ul></CardContent></Card>
              </div>
            </div>
          ) : (
            <Card><CardContent className="p-8 text-center text-muted-foreground">No reflection yet. Run the full loop to generate today's reflection.</CardContent></Card>
          )}
        </TabsContent>

        {/* Org IQ */}
        <TabsContent value="iq" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="md:col-span-1">
              <CardHeader><CardTitle className="flex items-center gap-2"><Brain className="h-4 w-4 text-violet-500" />Organizational IQ</CardTitle></CardHeader>
              <CardContent>
                <p className={`text-5xl font-bold ${healthColor(orgIQ)}`}>{orgIQ}</p>
                <p className="text-sm text-muted-foreground">{iq?.iq_label || iqLabel(orgIQ)}</p>
                {iq?.delta !== undefined && <p className={`text-sm mt-2 ${iq.delta > 0 ? 'text-emerald-600' : iq.delta < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>{iq.delta > 0 ? '▲' : iq.delta < 0 ? '▼' : '◆'} {iq.delta > 0 ? '+' : ''}{iq.delta} vs previous</p>}
              </CardContent>
            </Card>
            <Card className="md:col-span-2">
              <CardHeader><CardTitle className="text-sm">IQ History (last 7 scores)</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-end gap-2 h-32">
                  {iqHistory.map((s, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div className={`w-full rounded-t ${healthBg(s.iq)}`} style={{ height: `${s.iq}%` }} />
                      <span className="text-xs text-muted-foreground">{s.iq}</span>
                    </div>
                  ))}
                  {iqHistory.length === 0 && <p className="text-sm text-muted-foreground self-center">No history yet.</p>}
                </div>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader><CardTitle className="text-sm">10 IQ Dimensions</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                {[
                  ['Knowledge Growth', iq?.knowledge_growth], ['Automation Coverage', iq?.automation_coverage],
                  ['Memory Quality', iq?.memory_quality], ['Decision Accuracy', iq?.decision_accuracy],
                  ['Prediction Accuracy', iq?.prediction_accuracy], ['Cross-Dept Collaboration', iq?.cross_dept_collaboration],
                  ['Learning Velocity', iq?.learning_velocity], ['Founder Workload Reduction', iq?.founder_workload_reduction],
                  ['Customer Outcomes', iq?.customer_outcomes], ['Workforce Growth', iq?.workforce_growth]
                ].map(([label, val], i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs w-40 text-muted-foreground">{label}</span>
                    <Progress value={val || 0} className="flex-1 h-2" />
                    <span className="text-xs font-semibold w-8 text-right">{val || 0}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function iqLabel(score) {
  if (score >= 90) return 'Genius';
  if (score >= 75) return 'Advanced';
  if (score >= 60) return 'Proficient';
  if (score >= 45) return 'Developing';
  if (score >= 30) return 'Emerging';
  return 'Foundational';
}