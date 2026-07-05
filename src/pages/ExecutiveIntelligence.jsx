import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Brain, Loader2, Sparkles, Zap, DollarSign, AlertTriangle,
  TrendingUp, Target, Lock, CheckCircle, RefreshCw, ChevronRight,
  Clock, Activity, BarChart3, Shield
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "react-router-dom";
import moment from "moment";

function pctColor(v) { return v >= 75 ? "text-emerald-600" : v >= 45 ? "text-amber-600" : "text-red-500"; }

export default function ExecutiveIntelligence() {
  const [twin, setTwin] = useState(null);
  const [briefings, setBriefings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const load = async () => {
    setLoading(true);
    const [snapshots, b] = await Promise.all([
      base44.entities.DigitalTwin.list("-created_date", 1).catch(() => []),
      base44.entities.DailyBriefing.list("-created_date", 7).catch(() => []),
    ]);
    if (snapshots.length > 0) setTwin(snapshots[0]);
    setBriefings(b);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const generateTwin = async () => {
    setGenerating(true);
    await base44.functions.invoke("digitalTwin", {});
    await load();
    setGenerating(false);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  const latestBriefing = briefings[0];
  const ext = latestBriefing?.extended_data;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">NCOS · Executive Intelligence</p>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Brain className="w-6 h-6 text-violet-500" />Executive Intelligence
          </h1>
          <p className="text-sm text-muted-foreground">AI-generated answers to the questions that drive the business</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => load()} disabled={loading}>
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
          <Button onClick={generateTwin} disabled={generating} className="gap-2">
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {generating ? "Calculating..." : "Recalculate Digital Twin"}
          </Button>
        </div>
      </div>

      {/* Health summary row */}
      {twin && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Platform", value: twin.platform_health_score },
            { label: "Revenue", value: twin.revenue_health_score },
            { label: "Engineering", value: twin.engineering_health_score },
            { label: "Legal", value: twin.legal_health_score },
            { label: "Operations", value: twin.operational_health_score },
            { label: "Mission Ready", value: twin.mission_readiness_score },
          ].map(m => (
            <Card key={m.label} className="p-3 border border-border/60 text-center">
              <p className={`text-xl font-black ${pctColor(m.value)}`}>{m.value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{m.label}</p>
              <Progress value={m.value} className="h-1 mt-1.5" />
            </Card>
          ))}
        </div>
      )}

      <Tabs defaultValue="daily">
        <TabsList>
          <TabsTrigger value="daily">Daily Briefing</TabsTrigger>
          <TabsTrigger value="scenarios">Scenario Engine</TabsTrigger>
          <TabsTrigger value="actions">Ranked Actions</TabsTrigger>
          <TabsTrigger value="history">Briefing History</TabsTrigger>
        </TabsList>

        {/* Daily Briefing */}
        <TabsContent value="daily">
          {!latestBriefing ? (
            <Card className="p-8 border border-dashed border-border mt-4 text-center">
              <Brain className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm text-muted-foreground mb-4">No daily briefing yet. Go to Mission Control to generate one.</p>
              <Link to="/mission-control"><Button size="sm"><Sparkles className="w-4 h-4 mr-2" />Go to Mission Control</Button></Link>
            </Card>
          ) : (
            <div className="space-y-4 mt-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline">{moment(latestBriefing.date).format("dddd, MMM D")}</Badge>
                <Badge variant="secondary">{latestBriefing.generated_by || "NCOS"}</Badge>
                <span className="text-xs text-muted-foreground">Generated {moment(latestBriefing.created_date).fromNow()}</span>
              </div>

              {/* Key signals */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { label: "Platform Health", value: latestBriefing.platform_health, icon: Activity, color: "blue" },
                  { label: "Revenue Health", value: latestBriefing.revenue_health, icon: DollarSign, color: "emerald" },
                  { label: "Runway Status", value: latestBriefing.runway_status, icon: Clock, color: "amber" },
                ].map(h => h.value && (
                  <Card key={h.label} className="p-3 border border-border/60">
                    <p className={`text-[10px] font-bold text-${h.color}-700 uppercase mb-1 flex items-center gap-1`}>
                      <h.icon className="w-3 h-3" />{h.label}
                    </p>
                    <p className="text-xs">{h.value}</p>
                  </Card>
                ))}
              </div>

              {/* Highest value + biggest threat */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {latestBriefing.highest_value_action && (
                  <Card className="p-4 border border-violet-200 bg-violet-50">
                    <p className="text-xs font-bold text-violet-700 uppercase mb-2 flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" />Highest-Value Action Today</p>
                    <p className="text-sm text-violet-800">{latestBriefing.highest_value_action}</p>
                  </Card>
                )}
                {latestBriefing.highest_risk_issue && (
                  <Card className="p-4 border border-red-200 bg-red-50">
                    <p className="text-xs font-bold text-red-700 uppercase mb-2 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" />Biggest Threat</p>
                    <p className="text-sm text-red-800">{latestBriefing.highest_risk_issue}</p>
                  </Card>
                )}
              </div>

              {/* Extended intelligence */}
              {ext && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { key: "highest_roi", label: "Highest ROI Action", icon: TrendingUp, color: "emerald" },
                    { key: "revenue_fastest", label: "Fastest Revenue Path", icon: DollarSign, color: "emerald" },
                    { key: "readiness_increase", label: "Fastest Readiness Gain", icon: BarChart3, color: "blue" },
                    { key: "prevents_technical_debt", label: "Prevents Technical Debt", icon: Shield, color: "violet" },
                    { key: "founder_decision_needed", label: "Founder Decision Needed", icon: Lock, color: "amber" },
                    { key: "wasting_effort", label: "Wasting Effort (Stop This)", icon: AlertTriangle, color: "red" },
                  ].map(s => (ext[s.key] || (Array.isArray(ext[s.key]) && ext[s.key].length > 0)) && (
                    <div key={s.key} className="flex items-start gap-3 p-3 bg-muted rounded-lg border border-border/40">
                      <s.icon className={`w-4 h-4 text-${s.color}-600 flex-shrink-0 mt-0.5`} />
                      <div>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase">{s.label}</p>
                        <p className="text-xs mt-0.5">{Array.isArray(ext[s.key]) ? ext[s.key].join(" · ") : ext[s.key]}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Sprint */}
              {(latestBriefing.recommended_sprint || []).length > 0 && (
                <Card className="p-4 border border-border/60">
                  <p className="text-xs font-bold text-muted-foreground uppercase mb-3 flex items-center gap-1.5"><Target className="w-3.5 h-3.5" />Recommended Sprint</p>
                  <ul className="space-y-2">
                    {latestBriefing.recommended_sprint.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />{s}
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        {/* Scenario Engine */}
        <TabsContent value="scenarios">
          {!twin ? (
            <Card className="p-8 mt-4 border border-dashed text-center">
              <p className="text-sm text-muted-foreground mb-4">Generate a Digital Twin to see scenario answers.</p>
              <Button size="sm" onClick={generateTwin} disabled={generating}>Generate Twin</Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {twin.scenario_answers && [
                { key: "one_engineering_day", q: "If I had one engineering day...", icon: "⚙️", color: "blue" },
                { key: "one_ai_employee", q: "If I had one AI employee...", icon: "🤖", color: "violet" },
                { key: "five_hundred_dollars", q: "If I had $500...", icon: "💵", color: "emerald" },
                { key: "one_enterprise_client", q: "If I had one enterprise client...", icon: "🏢", color: "amber" },
                { key: "revenue_this_week", q: "If I needed revenue this week...", icon: "⚡", color: "red" },
                { key: "ten_x_growth", q: "If I needed 10× growth...", icon: "🚀", color: "blue" },
                { key: "what_should_ncos_do", q: "What should NCOS do right now?", icon: "🧭", color: "primary" },
              ].map(s => (
                <Card key={s.key} className="p-4 border border-border/60">
                  <p className={`text-xs font-bold text-${s.color}-700 uppercase tracking-wide mb-2 flex items-center gap-2`}>
                    <span className="text-base">{s.icon}</span>{s.q}
                  </p>
                  <p className="text-sm leading-relaxed">{twin.scenario_answers[s.key]}</p>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Ranked Actions */}
        <TabsContent value="actions">
          {!twin?.executive_recommendation?.length ? (
            <Card className="p-8 mt-4 border border-dashed text-center">
              <p className="text-sm text-muted-foreground">No ranked actions yet — generate a Digital Twin.</p>
            </Card>
          ) : (
            <div className="space-y-3 mt-4">
              <p className="text-xs text-muted-foreground">Ranked by composite score: 30% ROI + 30% Urgency + 20% Effort + 20% Strategic Value. Higher = act sooner.</p>
              {twin.executive_recommendation.map(rec => (
                <Card key={rec.rank} className={`p-4 border ${rec.rank <= 2 ? "border-red-200 bg-red-50/30" : rec.rank <= 4 ? "border-amber-200 bg-amber-50/30" : "border-border/60"}`}>
                  <div className="flex items-start gap-4">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-base ${rec.rank <= 2 ? "bg-red-100 text-red-700" : rec.rank <= 4 ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground"}`}>
                      {rec.rank}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{rec.action}</p>
                      <div className="flex items-center gap-3 mt-2 flex-wrap text-[10px] text-muted-foreground">
                        <Badge variant="outline" className="text-[9px] capitalize">{rec.category}</Badge>
                        <span>ROI <strong className="text-foreground">{rec.roi_score}</strong></span>
                        <span>Urgency <strong className="text-foreground">{rec.urgency_score}</strong></span>
                        <span>Effort <strong className="text-foreground">{rec.effort_score}</strong></span>
                        <span>Strategic <strong className="text-foreground">{rec.strategic_value}</strong></span>
                        <span className="ml-auto font-bold text-primary">Score: {rec.combined_score}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* History */}
        <TabsContent value="history">
          <div className="space-y-3 mt-4">
            {briefings.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No briefing history yet.</p>
            ) : briefings.map(b => (
              <Card key={b.id} className="p-4 border border-border/60">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <p className="text-sm font-semibold">{moment(b.date).format("dddd, MMMM D, YYYY")}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{b.summary?.slice(0, 120)}...</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {b.metrics_snapshot?.overall_readiness !== undefined && (
                      <Badge variant="outline" className="text-[10px]">Readiness: {b.metrics_snapshot.overall_readiness}%</Badge>
                    )}
                    {b.metrics_snapshot?.mrr !== undefined && (
                      <Badge variant="outline" className="text-[10px]">MRR: ${b.metrics_snapshot.mrr}</Badge>
                    )}
                    <span className="text-[10px] text-muted-foreground">{moment(b.created_date).fromNow()}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}