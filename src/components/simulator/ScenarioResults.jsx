import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, Server, Users, HardDrive, Cpu, Bot, CreditCard, Building2, Wallet, TrendingDown, Shield, Code, Lightbulb, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import moment from "moment";

const DIMENSIONS = [
  { key: "revenue", label: "Revenue", icon: DollarSign },
  { key: "growth", label: "Growth", icon: TrendingUp },
  { key: "infrastructure_costs", label: "Infrastructure Costs", icon: Server },
  { key: "hiring", label: "Hiring", icon: Users },
  { key: "customer_load", label: "Customer Load", icon: HardDrive },
  { key: "server_load", label: "Server Load", icon: Cpu },
  { key: "ai_costs", label: "AI Costs", icon: Bot },
  { key: "subscription_growth", label: "Subscription Growth", icon: CreditCard },
  { key: "enterprise_growth", label: "Enterprise Growth", icon: Building2 },
  { key: "cash_runway", label: "Cash Runway", icon: Wallet },
  { key: "churn", label: "Churn", icon: TrendingDown },
  { key: "risk", label: "Risk", icon: Shield },
  { key: "technical_debt", label: "Technical Debt", icon: Code },
];

const RISK_COLORS = {
  low: { bg: "bg-emerald-50 dark:bg-emerald-950/20", border: "border-emerald-200 dark:border-emerald-800", text: "text-emerald-600", badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300" },
  medium: { bg: "bg-amber-50 dark:bg-amber-950/20", border: "border-amber-200 dark:border-amber-800", text: "text-amber-600", badge: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" },
  high: { bg: "bg-orange-50 dark:bg-orange-950/20", border: "border-orange-200 dark:border-orange-800", text: "text-orange-600", badge: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300" },
  critical: { bg: "bg-red-50 dark:bg-red-950/20", border: "border-red-200 dark:border-red-800", text: "text-red-600", badge: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" },
};

const PRIORITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

export default function ScenarioResults({ scenario }) {
  if (!scenario || scenario.status !== 'completed') return null;

  const results = scenario.results || {};
  const recommendations = scenario.recommendations || [];
  const riskAssessment = scenario.risk_assessment || {};
  const overallRisk = riskAssessment.overall_risk || 'medium';
  const riskColor = RISK_COLORS[overallRisk] || RISK_COLORS.medium;

  const sortedRecs = [...recommendations].sort((a, b) => (PRIORITY_ORDER[a.priority] || 3) - (PRIORITY_ORDER[b.priority] || 3));

  return (
    <div className="space-y-4">
      {/* Summary */}
      <Card className={`p-4 border-2 ${riskColor.border} ${riskColor.bg}`}>
        <div className="flex items-start gap-3">
          <AlertTriangle className={`w-6 h-6 ${riskColor.text} mt-0.5 flex-shrink-0`} />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-bold">Scenario Summary</p>
              <Badge className={`text-[9px] ${riskColor.badge}`}>Overall Risk: {overallRisk}</Badge>
              {riskAssessment.failure_probability_pct != null && (
                <Badge variant="outline" className="text-[9px]">Failure Probability: {riskAssessment.failure_probability_pct}%</Badge>
              )}
            </div>
            <p className="text-sm">{scenario.summary}</p>
            {riskAssessment.worst_case && (
              <p className="text-xs mt-2 text-muted-foreground"><strong>Worst case:</strong> {riskAssessment.worst_case}</p>
            )}
          </div>
        </div>
      </Card>

      {/* 13 Prediction Dimensions */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">13-Dimension Projections (12-Month)</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {DIMENSIONS.map(dim => {
            const data = results[dim.key];
            if (!data) return (
              <Card key={dim.key} className="p-3 border border-dashed border-border/40">
                <div className="flex items-center gap-2 mb-1"><dim.icon className="w-4 h-4 text-muted-foreground" /><p className="text-xs font-semibold">{dim.label}</p></div>
                <p className="text-[10px] text-muted-foreground italic">No data</p>
              </Card>
            );
            const risk = data.risk_level || 'low';
            const rc = RISK_COLORS[risk] || RISK_COLORS.low;
            const change = data.change_pct;
            return (
              <Card key={dim.key} className={`p-3 border ${rc.border} ${rc.bg}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2"><dim.icon className={`w-4 h-4 ${rc.text}`} /><p className="text-xs font-semibold">{dim.label}</p></div>
                  <Badge className={`text-[8px] ${rc.badge}`}>{risk}</Badge>
                </div>
                <div className="space-y-1">
                  {data.current_value && <p className="text-[10px]"><span className="text-muted-foreground">Now:</span> {data.current_value}</p>}
                  {data.projected_value_12mo && <p className="text-[10px]"><span className="text-muted-foreground">12mo:</span> {data.projected_value_12mo}</p>}
                  {change != null && change !== 0 && (
                    <p className={`text-[10px] font-semibold ${change > 0 ? 'text-orange-600' : 'text-emerald-600'}`}>
                      {change > 0 ? '↑' : '↓'} {Math.abs(change)}% change
                    </p>
                  )}
                  {data.notes && <p className="text-[10px] text-muted-foreground mt-1">{data.notes}</p>}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Top Risks */}
      {riskAssessment.top_risks && riskAssessment.top_risks.length > 0 && (
        <Card className="p-4 border border-red-200 bg-red-50/30 dark:bg-red-950/10">
          <p className="text-xs font-semibold text-red-600 uppercase mb-2 flex items-center gap-1"><Shield className="w-3.5 h-3.5" />Top Risks Identified</p>
          <ul className="space-y-1">
            {riskAssessment.top_risks.map((risk, i) => <li key={i} className="text-xs flex gap-2"><span className="text-red-500">•</span>{risk}</li>)}
          </ul>
        </Card>
      )}

      {/* Proactive Recommendations */}
      <Card className="p-4 border border-primary/30 bg-primary/5">
        <p className="text-xs font-semibold text-primary uppercase mb-3 flex items-center gap-1"><Lightbulb className="w-3.5 h-3.5" />Proactive Recommendations — Act Before Problems Occur</p>
        <div className="space-y-2">
          {sortedRecs.map((rec, i) => {
            const priority = rec.priority || 'medium';
            const prc = RISK_COLORS[priority] || RISK_COLORS.medium;
            return (
              <div key={i} className="flex items-start gap-3 p-2 rounded-lg bg-background border border-border/40">
                <div className="flex-shrink-0 mt-0.5">
                  {priority === 'critical' || priority === 'high' ? <AlertTriangle className="w-4 h-4 text-orange-600" /> : <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Badge className={`text-[8px] ${prc.badge}`}>{priority}</Badge>
                    {rec.timeline && <span className="text-[9px] text-muted-foreground flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{rec.timeline}</span>}
                  </div>
                  <p className="text-xs font-semibold">{rec.action}</p>
                  {rec.reason && <p className="text-[10px] text-muted-foreground mt-0.5">{rec.reason}</p>}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <p className="text-[10px] text-muted-foreground text-center">Simulated {moment(scenario.created_date).format("MMM D, YYYY HH:mm")} · NCOS Enterprise Simulator</p>
    </div>
  );
}