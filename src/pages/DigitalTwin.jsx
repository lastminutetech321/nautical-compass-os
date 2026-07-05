import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Activity, Cpu, DollarSign, Scale, BookOpen, Users, Shield, Zap,
  RefreshCw, Loader2, AlertTriangle, CheckCircle, TrendingUp, Brain,
  Target, Radio, Database, Server, Lock, Sparkles, ChevronRight
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "react-router-dom";
import moment from "moment";

function pctColor(v) { return v >= 75 ? "text-emerald-600" : v >= 45 ? "text-amber-600" : "text-red-500"; }
function pctBg(v) { return v >= 75 ? "bg-emerald-500" : v >= 45 ? "bg-amber-500" : "bg-red-500"; }
function pctBorder(v) { return v >= 75 ? "border-emerald-200" : v >= 45 ? "border-amber-200" : "border-red-200"; }
function statusBadge(s) {
  const map = { critical:"bg-red-100 text-red-700", blocked:"bg-red-100 text-red-700", at_risk:"bg-amber-100 text-amber-700", idle:"bg-slate-100 text-slate-600", healthy:"bg-emerald-100 text-emerald-700", operational:"bg-emerald-100 text-emerald-700", active:"bg-blue-100 text-blue-700", building:"bg-blue-100 text-blue-700", stable:"bg-emerald-100 text-emerald-700", limited:"bg-amber-100 text-amber-700" };
  return map[s] || "bg-slate-100 text-slate-600";
}

const SUBSYSTEM_ICONS = {
  Revenue: DollarSign, Engineering: Cpu, "NC Canon": BookOpen, "AI Workforce": Brain,
  "Legal Rail": Scale, JurisEngine: Zap, "Evidence Vault": Shield, Infrastructure: Server,
  "Mission Control": Activity, "Culture Rail": Radio
};

const SCORE_LABELS = [
  { key: "health_score", label: "Health", color: "emerald" },
  { key: "risk_score", label: "Risk", color: "red" },
  { key: "growth_score", label: "Growth", color: "blue" },
  { key: "confidence_score", label: "Confidence", color: "violet" },
  { key: "forecast_score", label: "Forecast", color: "amber" },
  { key: "self_improvement_score", label: "Self-Improve", color: "cyan" },
  { key: "dependency_score", label: "Dependency", color: "orange" },
];

export default function DigitalTwin() {
  const [twin, setTwin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selected, setSelected] = useState(null);

  const load = async () => {
    setLoading(true);
    const snapshots = await base44.entities.DigitalTwin.list("-created_date", 1).catch(() => []);
    if (snapshots.length > 0) setTwin(snapshots[0]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const generate = async () => {
    setGenerating(true);
    await base44.functions.invoke("digitalTwin", {});
    await load();
    setGenerating(false);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  const subsystems = twin?.subsystems || [];
  const selectedSub = selected ? subsystems.find(s => s.name === selected) : subsystems[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">NCOS · Executive Intelligence</p>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" />NCOS Digital Twin
          </h1>
          <p className="text-sm text-muted-foreground">
            {twin ? `Last snapshot: ${moment(twin.snapshot_time).fromNow()}` : "No snapshot yet — generate your first Digital Twin"}
          </p>
        </div>
        <Button onClick={generate} disabled={generating} className="gap-2">
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {generating ? "Calculating Digital Twin..." : "Refresh Digital Twin"}
        </Button>
      </div>

      {!twin ? (
        <Card className="p-12 border border-dashed border-border text-center">
          <Activity className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
          <p className="text-sm text-muted-foreground mb-2">No Digital Twin snapshot exists yet.</p>
          <p className="text-xs text-muted-foreground mb-5">The Digital Twin models every NCOS subsystem in real time — health, risk, growth, confidence, and ROI.</p>
          <Button onClick={generate} disabled={generating}>
            {generating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
            Generate Digital Twin
          </Button>
        </Card>
      ) : (
        <>
          {/* Top-level health scores */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: "Platform Health", value: twin.platform_health_score, icon: Activity },
              { label: "Revenue Health", value: twin.revenue_health_score, icon: DollarSign },
              { label: "Engineering", value: twin.engineering_health_score, icon: Cpu },
              { label: "Legal Health", value: twin.legal_health_score, icon: Scale },
              { label: "Operations", value: twin.operational_health_score, icon: Server },
              { label: "Mission Ready", value: twin.mission_readiness_score, icon: Target },
            ].map(m => (
              <Card key={m.label} className={`p-3 border ${pctBorder(m.value)}`}>
                <div className="flex items-center gap-1.5 mb-2">
                  <m.icon className={`w-3.5 h-3.5 ${pctColor(m.value)}`} />
                  <p className="text-[10px] text-muted-foreground">{m.label}</p>
                </div>
                <p className={`text-2xl font-black ${pctColor(m.value)}`}>{m.value}</p>
                <div className="mt-2 h-1 rounded-full bg-muted overflow-hidden">
                  <div className={`h-full rounded-full ${pctBg(m.value)}`} style={{ width: `${m.value}%` }} />
                </div>
              </Card>
            ))}
          </div>

          <Tabs defaultValue="subsystems">
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="subsystems">Subsystem Monitor</TabsTrigger>
              <TabsTrigger value="intelligence">Executive Intelligence</TabsTrigger>
              <TabsTrigger value="scenarios">Scenario Engine</TabsTrigger>
              <TabsTrigger value="recommendations">Ranked Actions</TabsTrigger>
            </TabsList>

            {/* Subsystem grid + detail */}
            <TabsContent value="subsystems">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-4">
                <div className="space-y-2">
                  {subsystems.map(sub => {
                    const Icon = SUBSYSTEM_ICONS[sub.name] || Activity;
                    return (
                      <Card
                        key={sub.name}
                        className={`p-3 cursor-pointer transition-all border ${selectedSub?.name === sub.name ? "border-primary shadow-md" : "border-border/60 hover:shadow-sm"}`}
                        onClick={() => setSelected(sub.name)}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${sub.health_score >= 75 ? "bg-emerald-50" : sub.health_score >= 45 ? "bg-amber-50" : "bg-red-50"}`}>
                            <Icon className={`w-4 h-4 ${pctColor(sub.health_score)}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-semibold truncate">{sub.name}</p>
                              <span className={`text-[10px] font-bold ${pctColor(sub.health_score)}`}>{sub.health_score}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Progress value={sub.health_score} className="flex-1 h-1" />
                              <Badge className={`text-[9px] ${statusBadge(sub.status)}`}>{sub.status}</Badge>
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>

                {selectedSub && (
                  <div className="lg:col-span-2">
                    <Card className="p-5 border border-border/60 h-full">
                      <div className="flex items-center gap-3 mb-4">
                        {(() => { const Icon = SUBSYSTEM_ICONS[selectedSub.name] || Activity; return <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${pctColor(selectedSub.health_score).replace("text-","bg-").replace("600","50")}`}><Icon className={`w-5 h-5 ${pctColor(selectedSub.health_score)}`} /></div>; })()}
                        <div>
                          <h2 className="text-base font-bold">{selectedSub.name}</h2>
                          <p className="text-xs text-muted-foreground capitalize">{selectedSub.category} · {selectedSub.status}</p>
                        </div>
                        <Badge className={`ml-auto text-xs ${statusBadge(selectedSub.status)}`}>{selectedSub.status}</Badge>
                      </div>

                      {selectedSub.notes && (
                        <p className="text-xs text-muted-foreground bg-muted p-2.5 rounded-lg mb-4">{selectedSub.notes}</p>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        {SCORE_LABELS.map(sl => (
                          <div key={sl.key} className="p-3 rounded-lg border border-border/40">
                            <div className="flex items-center justify-between mb-1.5">
                              <p className="text-[10px] text-muted-foreground">{sl.label}</p>
                              <span className={`text-sm font-bold ${pctColor(selectedSub[sl.key] || 0)}`}>{selectedSub[sl.key] || 0}</span>
                            </div>
                            <Progress value={selectedSub[sl.key] || 0} className="h-1.5" />
                          </div>
                        ))}
                      </div>
                    </Card>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Executive Intelligence */}
            <TabsContent value="intelligence">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
                {[
                  { key: "top_opportunities", label: "Top Opportunities", icon: TrendingUp, color: "emerald" },
                  { key: "top_risks", label: "Top Risks", icon: AlertTriangle, color: "red" },
                  { key: "highest_roi_projects", label: "Highest ROI Projects", icon: Target, color: "blue" },
                  { key: "critical_bottlenecks", label: "Critical Bottlenecks", icon: Zap, color: "amber" },
                  { key: "revenue_opportunities", label: "Revenue Opportunities", icon: DollarSign, color: "emerald" },
                  { key: "founder_attention", label: "Founder Attention Required", icon: Lock, color: "violet" },
                  { key: "infrastructure_weaknesses", label: "Infrastructure Weaknesses", icon: Server, color: "orange" },
                  { key: "autonomous_improvements", label: "Autonomous Improvements", icon: RefreshCw, color: "cyan" },
                ].map(section => (
                  <Card key={section.key} className="p-4 border border-border/60">
                    <p className={`text-xs font-bold uppercase tracking-wide mb-3 flex items-center gap-1.5 text-${section.color}-700`}>
                      <section.icon className="w-3.5 h-3.5" />{section.label}
                    </p>
                    <ul className="space-y-2">
                      {(twin[section.key] || []).map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <ChevronRight className={`w-3 h-3 text-${section.color}-500 flex-shrink-0 mt-0.5`} />
                          <span>{item}</span>
                        </li>
                      ))}
                      {(twin[section.key] || []).length === 0 && <li className="text-xs text-muted-foreground italic">None detected</li>}
                    </ul>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Scenario Engine */}
            <TabsContent value="scenarios">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                {twin.scenario_answers && [
                  { key: "one_engineering_day", q: "If I had one engineering day...", icon: "⚙️" },
                  { key: "one_ai_employee", q: "If I had one AI employee...", icon: "🤖" },
                  { key: "five_hundred_dollars", q: "If I had $500...", icon: "💵" },
                  { key: "one_enterprise_client", q: "If I had one enterprise client...", icon: "🏢" },
                  { key: "revenue_this_week", q: "If I needed revenue this week...", icon: "⚡" },
                  { key: "ten_x_growth", q: "If I needed 10× growth...", icon: "🚀" },
                  { key: "what_should_ncos_do", q: "What should NCOS do right now?", icon: "🧭" },
                ].map(s => (
                  <Card key={s.key} className="p-4 border border-border/60">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-2">
                      <span>{s.icon}</span>{s.q}
                    </p>
                    <p className="text-sm leading-relaxed">{twin.scenario_answers[s.key] || "Insufficient data — generate Digital Twin with more platform data."}</p>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Ranked Actions */}
            <TabsContent value="recommendations">
              <div className="space-y-3 mt-4">
                <p className="text-xs text-muted-foreground">Ranked by composite score: 30% ROI + 30% Urgency + 20% Effort + 20% Strategic Value</p>
                {(twin.executive_recommendation || []).map(rec => (
                  <Card key={rec.rank} className="p-4 border border-border/60">
                    <div className="flex items-start gap-4">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 font-black text-sm ${rec.rank <= 2 ? "bg-red-100 text-red-700" : rec.rank <= 4 ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground"}`}>
                        {rec.rank}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold">{rec.action}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <Badge variant="outline" className="text-[10px] capitalize">{rec.category}</Badge>
                          <span className="text-[10px] text-muted-foreground">Score: <strong>{rec.combined_score}</strong></span>
                          <span className="text-[10px] text-muted-foreground">ROI: {rec.roi_score} · Urgency: {rec.urgency_score} · Effort: {rec.effort_score} · Strategic: {rec.strategic_value}</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>

          <p className="text-[10px] text-muted-foreground text-right">
            Digital Twin v1 · Snapshot {moment(twin.snapshot_time).format("MMM D, YYYY h:mm A")} · {twin.generated_by}
          </p>
        </>
      )}
    </div>
  );
}