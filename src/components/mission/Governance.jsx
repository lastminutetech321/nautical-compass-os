import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Lock, AlertTriangle, TrendingUp, TrendingDown, CheckCircle, XCircle, Clock, Loader2, Wand2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import moment from "moment";

const RISK_COLORS = { low: "bg-emerald-100 text-emerald-700", medium: "bg-amber-100 text-amber-700", high: "bg-orange-100 text-orange-700", critical: "bg-red-100 text-red-700" };

export default function Governance({ data, onRefresh }) {
  const [forecasting, setForecasting] = useState(false);
  const [forecast, setForecast] = useState(null);

  if (!data) return null;
  const { approvals, notifications, issues, improvements, roadmap, releases, milestones, techDebt, survival, subs, invoices } = data;

  const alerts = notifications.filter(n => n.type === "error" || n.type === "warning" || n.type === "approval_needed" || n.severity === "high" || n.severity === "critical");
  const risks = issues.filter(i => i.severity === "critical" || i.severity === "high");
  const upcomingReleases = releases.filter(r => r.status === "planned" || r.status === "in_progress" || r.status === "staged");
  const activeMilestones = milestones.filter(m => m.status === "in_progress" || m.status === "planned");
  const inProgressRoadmap = roadmap.filter(r => r.status === "in_progress");

  const generateForecast = async () => {
    setForecasting(true);
    const mrr = subs.reduce((s, sub) => s + (sub.mrr || 0), 0);
    const outstanding = invoices.reduce((s, inv) => s + (inv.amount_due || 0), 0);
    const costs = survival ? (survival.monthly_platform_cost || 0) + (survival.ai_api_cost || 0) + (survival.hosting_cost || 0) : 0;
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Generate a 90-day mission forecast for NCOS platform.

Current state:
- MRR: $${mrr}/month
- Outstanding invoices: $${outstanding}
- Monthly costs: $${costs}
- Runway: ${survival?.cash_runway_months || "unknown"} months
- Active subscriptions: ${subs.length}
- Open diagnostic issues: ${issues.length} (${issues.filter(i=>i.severity==="critical").length} critical)
- Improvement items queued: ${improvements.length}
- Roadmap items in progress: ${inProgressRoadmap.length}
- Tech debt items: ${techDebt.length}

Provide a 90-day forecast covering: revenue projection, platform readiness trajectory, key risks, milestone delivery, and recommended actions. Be specific.`,
      response_json_schema: {
        type: "object",
        properties: {
          revenue_projection: { type: "string" },
          readiness_trajectory: { type: "string" },
          key_risks: { type: "array", items: { type: "string" } },
          milestones_90_day: { type: "array", items: { type: "string" } },
          recommended_actions: { type: "array", items: { type: "string" } },
          survival_outlook: { type: "string" },
        }
      }
    });
    setForecast(result);
    setForecasting(false);
  };

  return (
    <div className="space-y-4">
      {/* Approvals + Alerts side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Approvals */}
        <Card className="p-4 border border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-amber-700 uppercase flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" />Approvals</p>
            <Link to="/self-governance"><Button size="sm" variant="outline" className="text-[10px] h-7">Review All</Button></Link>
          </div>
          {approvals.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No pending approvals</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {approvals.slice(0, 8).map(a => (
                <div key={a.id} className="p-2 rounded bg-white dark:bg-card border border-amber-200/60">
                  <p className="text-xs font-semibold">{a.action_type || a.title || "Approval required"}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{a.description || a.notes || a.reason || ""}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={`text-[9px] ${RISK_COLORS[a.risk_level] || RISK_COLORS.medium}`}>{a.risk_level || "medium"}</Badge>
                    <span className="text-[9px] text-muted-foreground">{moment(a.created_date).fromNow()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Alerts */}
        <Card className="p-4 border border-red-200 bg-red-50 dark:bg-red-950/20">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-red-700 uppercase flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" />Alerts</p>
            <Link to="/notifications"><Button size="sm" variant="outline" className="text-[10px] h-7">Notification Center</Button></Link>
          </div>
          {alerts.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No active alerts</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {alerts.slice(0, 8).map(n => (
                <div key={n.id} className="p-2 rounded bg-white dark:bg-card border border-red-200/60">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold">{n.title}</p>
                    <Badge className={`text-[9px] ${RISK_COLORS[n.severity] || RISK_COLORS.medium}`}>{n.severity || "medium"}</Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">{n.message}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Risks + Forecasts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Risks */}
        <Card className="p-4 border border-border/60">
          <p className="text-xs font-bold uppercase mb-3 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 text-orange-500" />Risks</p>
          {risks.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No high-severity risks</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {risks.slice(0, 10).map(r => (
                <div key={r.id} className="p-2 rounded border border-border/40">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold truncate">{r.title || r.issue_type || "Issue"}</p>
                    <Badge className={`text-[9px] ${RISK_COLORS[r.severity]}`}>{r.severity}</Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">{r.description || r.resolution || ""}</p>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Forecasts */}
        <Card className="p-4 border border-border/60">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold uppercase flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5 text-blue-500" />Forecasts</p>
            <Button size="sm" variant="outline" className="text-[10px] h-7" onClick={generateForecast} disabled={forecasting}>
              {forecasting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3 mr-1" />}
              {forecasting ? "Generating…" : "AI Forecast"}
            </Button>
          </div>
          {forecast ? (
            <div className="space-y-2 text-xs">
              <div className="p-2 rounded bg-muted/40">
                <p className="font-semibold text-blue-600">Revenue Projection</p>
                <p className="text-muted-foreground">{forecast.revenue_projection}</p>
              </div>
              <div className="p-2 rounded bg-muted/40">
                <p className="font-semibold text-violet-600">Readiness Trajectory</p>
                <p className="text-muted-foreground">{forecast.readiness_trajectory}</p>
              </div>
              <div className="p-2 rounded bg-muted/40">
                <p className="font-semibold text-amber-600">Survival Outlook</p>
                <p className="text-muted-foreground">{forecast.survival_outlook}</p>
              </div>
              {forecast.key_risks?.length > 0 && (
                <div><p className="font-semibold text-red-600 mb-1">Key Risks</p>{forecast.key_risks.map((r,i)=><p key={i} className="text-muted-foreground">• {r}</p>)}</div>
              )}
              {forecast.recommended_actions?.length > 0 && (
                <div><p className="font-semibold text-emerald-600 mb-1">Recommended Actions</p>{forecast.recommended_actions.map((r,i)=><p key={i} className="text-muted-foreground">• {r}</p>)}</div>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-4">{forecasting ? "Generating 90-day forecast…" : "Click AI Forecast to generate 90-day projections"}</p>
          )}
        </Card>
      </div>

      {/* Roadmap */}
      <Card className="p-4 border border-border/60">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold uppercase flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5 text-violet-500" />Roadmap</p>
          <Link to="/roadmap"><Button size="sm" variant="outline" className="text-[10px] h-7">Full Roadmap</Button></Link>
        </div>
        {inProgressRoadmap.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No items in progress</p>
        ) : (
          <div className="space-y-2">
            {inProgressRoadmap.slice(0, 6).map(r => (
              <div key={r.id} className="flex items-center justify-between p-2 rounded border border-border/40">
                <div>
                  <p className="text-xs font-semibold">{r.title}</p>
                  <p className="text-[10px] text-muted-foreground">{r.category} · {r.phase}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`text-[9px] ${RISK_COLORS[r.priority] || RISK_COLORS.medium}`}>{r.priority}</Badge>
                  {r.target_date && <span className="text-[9px] text-muted-foreground">{r.target_date}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}