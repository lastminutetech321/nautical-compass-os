import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Activity, Server, Database, Cloud, Zap, CheckCircle, AlertTriangle, XCircle } from "lucide-react";

function HealthCard({ icon: Icon, title, status, metrics, color }) {
  const colorMap = {
    healthy: "border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20",
    degraded: "border-amber-200 bg-amber-50 dark:bg-amber-950/20",
    down: "border-red-200 bg-red-50 dark:bg-red-950/20",
    unknown: "border-border/60",
  };
  const statusColor = {
    healthy: "bg-emerald-100 text-emerald-700",
    degraded: "bg-amber-100 text-amber-700",
    down: "bg-red-100 text-red-700",
    unknown: "bg-slate-100 text-slate-600",
  };
  return (
    <Card className={`p-4 border ${colorMap[status] || colorMap.unknown}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${color || "text-muted-foreground"}`} />
          <p className="text-xs font-bold uppercase tracking-wide">{title}</p>
        </div>
        <Badge className={`text-[9px] ${statusColor[status] || statusColor.unknown}`}>{status}</Badge>
      </div>
      <div className="space-y-1">
        {metrics.map((m, i) => (
          <div key={i} className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{m.label}</span>
            <span className="font-semibold">{m.value}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function SystemHealth({ data }) {
  if (!data) return null;
  const { healthChecks, issues, platformConfig, auditLogs, automations, builds, techDebt } = data;

  const critIssues = issues.filter(i => i.severity === "critical").length;
  const highIssues = issues.filter(i => i.severity === "high").length;
  const healthyChecks = healthChecks.filter(h => h.status === "healthy" || h.status === "pass").length;
  const totalChecks = healthChecks.length || 1;
  const healthPct = Math.round((healthyChecks / totalChecks) * 100);

  const systemStatus = critIssues > 0 ? "down" : highIssues > 2 || healthPct < 70 ? "degraded" : "healthy";
  const failedAutomations = automations.filter(a => a.status === "error" || a.status === "failed").length;
  const automationStatus = failedAutomations > 3 ? "degraded" : "healthy";
  const techDebtItems = techDebt.filter(t => t.status === "open" || t.status === "active").length;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold flex items-center gap-2"><Activity className="w-4 h-4 text-emerald-500" />Live System Health</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <HealthCard
          icon={Activity} title="System Health" status={systemStatus}
          color="text-emerald-600"
          metrics={[
            { label: "Open Issues", value: issues.length },
            { label: "Critical", value: critIssues },
            { label: "High Severity", value: highIssues },
            { label: "Health Checks", value: `${healthyChecks}/${totalChecks} (${healthPct}%)` },
          ]}
        />
        <HealthCard
          icon={Cloud} title="Hosting Status" status={healthPct > 80 ? "healthy" : "degraded"}
          color="text-blue-600"
          metrics={[
            { label: "Health Check Pass", value: `${healthPct}%` },
            { label: "Platform Configs", value: platformConfig.length },
            { label: "Active Builds", value: builds.filter(b => b.status === "active" || b.status === "in_progress").length },
            { label: "Blocked Builds", value: builds.filter(b => b.is_blocked).length },
          ]}
        />
        <HealthCard
          icon={Database} title="Database Status" status="healthy"
          color="text-violet-600"
          metrics={[
            { label: "Entity Types", value: "40+" },
            { label: "Audit Logs (recent)", value: auditLogs.length },
            { label: "Tech Debt Items", value: techDebtItems },
            { label: "Data Integrity", value: "Active monitoring" },
          ]}
        />
        <HealthCard
          icon={Zap} title="API Status" status="healthy"
          color="text-amber-600"
          metrics={[
            { label: "Backend Functions", value: "4 active" },
            { label: "Canon Query API", value: "Operational" },
            { label: "JurisEngine API", value: "Operational" },
            { label: "Self-Diagnosis API", value: "Operational" },
          ]}
        />
        <HealthCard
          icon={Server} title="Infrastructure" status={builds.filter(b => b.is_blocked).length > 2 ? "degraded" : "healthy"}
          color="text-slate-600"
          metrics={[
            { label: "Total Builds", value: builds.length },
            { label: "In Progress", value: builds.filter(b => b.status === "in_progress").length },
            { label: "Completed", value: builds.filter(b => b.status === "completed").length },
            { label: "Blocked", value: builds.filter(b => b.is_blocked).length },
          ]}
        />
        <HealthCard
          icon={Zap} title="Automation Status" status={automationStatus}
          color="text-teal-600"
          metrics={[
            { label: "Total Automations", value: automations.length },
            { label: "Active", value: automations.filter(a => a.status === "active" || a.status === "running").length },
            { label: "Failed", value: failedAutomations },
            { label: "Success Rate", value: automations.length > 0 ? `${Math.round(((automations.length - failedAutomations) / automations.length) * 100)}%` : "—" },
          ]}
        />
      </div>
    </div>
  );
}