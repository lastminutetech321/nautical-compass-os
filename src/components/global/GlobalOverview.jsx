import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, AlertTriangle, Bell, ShieldAlert, CheckCircle2, Activity, TrendingUp, DollarSign, Users, Bot, FolderKanban, Target, Server } from "lucide-react";
import moment from "moment";

const SEVERITY_COLORS = {
  critical: "text-red-600 bg-red-100 dark:bg-red-900/30",
  high: "text-orange-600 bg-orange-100 dark:bg-orange-900/30",
  medium: "text-amber-600 bg-amber-100 dark:bg-amber-900/30",
  low: "text-blue-600 bg-blue-100 dark:bg-blue-900/30",
  info: "text-blue-600 bg-blue-100 dark:bg-blue-900/30",
  success: "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30",
  warning: "text-amber-600 bg-amber-100 dark:bg-amber-900/30",
  error: "text-red-600 bg-red-100 dark:bg-red-900/30",
};

function KPICard({ icon: Icon, label, value, color }) {
  return (
    <Card className="p-3 border border-border/60">
      <Icon className={`w-4 h-4 ${color} mb-1`} />
      <p className="text-lg font-bold leading-tight">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </Card>
  );
}

export default function GlobalOverview({ data, onSelectCompany }) {
  const kpis = data?.global_kpis || {};
  const companies = data?.company_summaries || [];
  const alerts = data?.global_alerts || [];
  const risks = data?.critical_risks || [];
  const approvals = data?.pending_approvals || [];

  return (
    <div className="space-y-4">
      {/* Global KPIs */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1"><Activity className="w-3.5 h-3.5" />Global KPIs — All Companies</p>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <KPICard icon={Building2} label="Companies" value={kpis.total_companies || 0} color="text-primary" />
          <KPICard icon={DollarSign} label="Total Revenue" value={`$${(kpis.total_revenue || 0).toLocaleString()}`} color="text-emerald-600" />
          <KPICard icon={Bot} label="AI Agents" value={`${kpis.active_agents || 0}/${kpis.total_agents || 0}`} color="text-violet-600" />
          <KPICard icon={FolderKanban} label="Projects" value={`${kpis.active_projects || 0}/${kpis.total_projects || 0}`} color="text-blue-600" />
          <KPICard icon={Users} label="Customers" value={kpis.total_customers || 0} color="text-cyan-600" />
          <KPICard icon={Target} label="Avg Readiness" value={`${kpis.avg_readiness || 0}%`} color="text-amber-600" />
          <KPICard icon={Bell} label="Active Alerts" value={kpis.active_alerts || 0} color="text-red-600" />
        </div>
      </div>

      {/* Company Grid */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />Companies ({companies.length})</p>
        {companies.length === 0 ? (
          <Card className="p-6 text-center border border-dashed border-border/40">
            <Building2 className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">No companies yet. Create enterprises via the Clone Engine or Blueprint Factory.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {companies.map(c => (
              <Card key={c.id} className="p-3 border border-border/60 hover:border-primary/40 hover:shadow-md transition-all cursor-pointer" onClick={() => onSelectCompany(c.id)}>
                <div className="flex items-start justify-between mb-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{c.name}</p>
                    <p className="text-[10px] text-muted-foreground">{c.industry || 'General'} · {c.company_size || 'N/A'}</p>
                  </div>
                  <Badge variant="outline" className={`text-[8px] flex-shrink-0 ${c.status === 'active' ? 'text-emerald-600' : 'text-muted-foreground'}`}>{c.status || 'active'}</Badge>
                </div>
                <div className="grid grid-cols-3 gap-1 mb-2 text-center">
                  <div className="p-1 rounded bg-muted/30"><p className="text-xs font-bold">{c.org_count}</p><p className="text-[8px] text-muted-foreground">Orgs</p></div>
                  <div className="p-1 rounded bg-muted/30"><p className="text-xs font-bold">{c.project_count}</p><p className="text-[8px] text-muted-foreground">Projects</p></div>
                  <div className="p-1 rounded bg-muted/30"><p className="text-xs font-bold">{c.agent_count}</p><p className="text-[8px] text-muted-foreground">AI Agents</p></div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex-1 mr-2">
                    <div className="flex items-center gap-1 mb-0.5">
                      <span className="text-[9px] text-muted-foreground">Health</span>
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden"><div className={`h-full ${c.health_score >= 80 ? 'bg-emerald-500' : c.health_score >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${c.health_score}%` }} /></div>
                      <span className="text-[9px] font-semibold">{c.health_score}%</span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-primary">${c.revenue_estimate}/mo</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Alerts + Risks + Approvals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Alerts */}
        <Card className="p-3 border border-border/60">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1"><Bell className="w-3.5 h-3.5" />Global Alerts</p>
          {alerts.length === 0 ? <p className="text-xs text-muted-foreground py-4 text-center">No active alerts</p> : (
            <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
              {alerts.map(a => (
                <div key={a.id} className="p-2 rounded border border-border/40 text-xs">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="font-semibold truncate">{a.title}</p>
                    <Badge variant="outline" className={`text-[8px] border-0 ${SEVERITY_COLORS[a.severity] || SEVERITY_COLORS.info}`}>{a.severity}</Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground line-clamp-2">{a.message}</p>
                  <p className="text-[8px] text-muted-foreground mt-0.5">{moment(a.created_date).fromNow()}</p>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Critical Risks */}
        <Card className="p-3 border border-border/60">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1"><ShieldAlert className="w-3.5 h-3.5" />Critical Risks</p>
          {risks.length === 0 ? <p className="text-xs text-muted-foreground py-4 text-center">No critical risks</p> : (
            <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
              {risks.map(r => (
                <div key={r.id} className="p-2 rounded border border-border/40 text-xs">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="font-semibold truncate">{r.title}</p>
                    <Badge variant="outline" className={`text-[8px] border-0 ${SEVERITY_COLORS[r.severity] || SEVERITY_COLORS.high}`}>{r.severity}</Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground">{r.module || 'System'}</p>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Pending Approvals */}
        <Card className="p-3 border border-border/60">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" />Pending Approvals</p>
          {approvals.length === 0 ? <p className="text-xs text-muted-foreground py-4 text-center">No pending approvals</p> : (
            <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
              {approvals.map(a => (
                <div key={a.id} className="p-2 rounded border border-border/40 text-xs">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="font-semibold truncate">{a.title}</p>
                    <Badge variant="outline" className={`text-[8px] border-0 ${SEVERITY_COLORS[a.risk_level] || SEVERITY_COLORS.medium}`}>{a.risk_level}</Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground">{a.type} · {moment(a.requested_at).fromNow()}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}