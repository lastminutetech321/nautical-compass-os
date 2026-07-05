import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FolderKanban, CheckSquare, AlertTriangle, Link2, DollarSign, Zap, Bot, ShieldAlert, Activity } from "lucide-react";

const STAT_CONFIGS = [
  { key: "active_projects", label: "Active Projects", icon: FolderKanban, color: "text-blue-600", border: "border-blue-200 bg-blue-50 dark:bg-blue-950/20" },
  { key: "overdue_tasks", label: "Overdue Tasks", icon: AlertTriangle, color: "text-red-600", border: "border-red-200 bg-red-50 dark:bg-red-950/20", warnZero: true },
  { key: "blocked_builds", label: "Blocked Builds", icon: Link2, color: "text-orange-600", border: "border-orange-200 bg-orange-50 dark:bg-orange-950/20", warnZero: true },
  { key: "critical_dependencies", label: "Critical Deps", icon: ShieldAlert, color: "text-red-600", border: "border-red-200 bg-red-50 dark:bg-red-950/20", warnZero: true },
  { key: "cash_runway_days", label: "Cash Runway", icon: DollarSign, color: "text-emerald-600", border: "border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20", suffix: " days", warnBelow: 90 },
  { key: "sprint_velocity", label: "Sprint Velocity", icon: Zap, color: "text-amber-600", border: "border-amber-200 bg-amber-50 dark:bg-amber-950/20", suffix: " pts" },
  { key: "active_agents", label: "Active Agents", icon: Bot, color: "text-violet-600", border: "border-violet-200 bg-violet-50 dark:bg-violet-950/20" },
  { key: "engineering_readiness", label: "Eng Readiness", icon: Activity, color: "text-cyan-600", border: "border-cyan-200 bg-cyan-50 dark:bg-cyan-950/20", suffix: "%", warnBelow: 50 },
];

export default function DirectorMetrics({ metrics }) {
  if (!metrics) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      {STAT_CONFIGS.map(({ key, label, icon: Icon, color, border, suffix, warnZero, warnBelow }) => {
        const value = metrics[key] ?? 0;
        const isWarning = (warnZero && value > 0) || (warnBelow !== undefined && value < warnBelow && value > 0);
        return (
          <Card key={key} className={`p-2.5 border ${border} text-center`}>
            <Icon className={`w-3.5 h-3.5 ${color} mx-auto mb-0.5`} />
            <p className={`text-lg font-bold ${isWarning ? 'text-red-600' : ''}`}>{value}{suffix || ""}</p>
            <p className="text-[9px] text-muted-foreground">{label}</p>
            {isWarning && <Badge variant="outline" className="text-[8px] mt-0.5 border-red-300 text-red-600">⚠ Flagged</Badge>}
          </Card>
        );
      })}
    </div>
  );
}