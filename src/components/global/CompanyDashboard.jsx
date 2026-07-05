import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, DollarSign, Code, Shield, Scale, Settings, Bot, Server, CreditCard, Users, FolderKanban, Target, Sparkles, TrendingUp, CheckCircle2, AlertTriangle } from "lucide-react";
import moment from "moment";

function HealthGauge({ score }) {
  const color = score >= 80 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="relative w-24 h-24 flex items-center justify-center">
      <svg className="w-24 h-24 -rotate-90" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r="36" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
        <circle cx="40" cy="40" r="36" fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} />
      </svg>
      <div className="absolute text-center">
        <p className="text-xl font-bold" style={{ color }}>{score}</p>
        <p className="text-[8px] text-muted-foreground">Health</p>
      </div>
    </div>
  );
}

function SectionCard({ icon: Icon, title, children, color }) {
  return (
    <Card className="p-3 border border-border/60">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1"><Icon className={`w-3.5 h-3.5 ${color}`} />{title}</p>
      {children}
    </Card>
  );
}

function MiniList({ items, emptyMsg }) {
  if (!items || items.length === 0) return <p className="text-[10px] text-muted-foreground">{emptyMsg || 'No data'}</p>;
  return (
    <div className="space-y-1">
      {items.map((item, i) => (
        <div key={i} className="text-[10px] flex items-center justify-between gap-1">
          <span className="truncate">{item.name || item.title}</span>
          {item.status && <Badge variant="outline" className="text-[8px] flex-shrink-0">{item.status}</Badge>}
        </div>
      ))}
    </div>
  );
}

export default function CompanyDashboard({ data }) {
  const { company, metrics, sections, ai_summary } = data;
  if (!company) return null;

  return (
    <div className="space-y-4">
      {/* Company Header */}
      <Card className="p-4 border border-primary/30 bg-primary/5">
        <div className="flex items-start gap-3">
          <div className="p-3 rounded-xl bg-primary/10 flex-shrink-0"><Building2 className="w-6 h-6 text-primary" /></div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-xl font-bold">{company.name}</h1>
              <Badge variant="outline" className="text-[10px]">{company.type}</Badge>
              <Badge variant="outline" className={`text-[10px] ${company.status === 'active' ? 'text-emerald-600' : 'text-muted-foreground'}`}>{company.status}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">{company.industry || 'General'} · {company.company_size || 'N/A'} · {company.revenue_model || 'N/A'}</p>
            {company.goals && company.goals.length > 0 && (
              <div className="flex gap-1 flex-wrap mt-1">{company.goals.slice(0, 4).map((g, i) => <Badge key={i} variant="outline" className="text-[8px] text-primary border-primary/30">{g}</Badge>)}</div>
            )}
          </div>
          <HealthGauge score={metrics.health_score} />
        </div>
      </Card>

      {/* AI Executive Summary */}
      {ai_summary && (
        <Card className="p-3 border border-violet-200 bg-violet-50/50 dark:bg-violet-950/10">
          <p className="text-xs font-semibold text-violet-700 uppercase tracking-wider mb-1 flex items-center gap-1"><Sparkles className="w-3.5 h-3.5" />AI Executive Summary</p>
          <p className="text-xs text-foreground">{ai_summary}</p>
        </Card>
      )}

      {/* Key Metrics Bar */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        <Card className="p-2 border border-border/60 text-center"><DollarSign className="w-3.5 h-3.5 text-emerald-600 mx-auto mb-0.5" /><p className="text-sm font-bold">${metrics.revenue_estimate}/mo</p><p className="text-[8px] text-muted-foreground">Revenue Est.</p></Card>
        <Card className="p-2 border border-border/60 text-center"><Bot className="w-3.5 h-3.5 text-violet-600 mx-auto mb-0.5" /><p className="text-sm font-bold">{metrics.agent_count}</p><p className="text-[8px] text-muted-foreground">AI Agents</p></Card>
        <Card className="p-2 border border-border/60 text-center"><FolderKanban className="w-3.5 h-3.5 text-blue-600 mx-auto mb-0.5" /><p className="text-sm font-bold">{metrics.active_projects}/{metrics.project_count}</p><p className="text-[8px] text-muted-foreground">Projects</p></Card>
        <Card className="p-2 border border-border/60 text-center"><Users className="w-3.5 h-3.5 text-cyan-600 mx-auto mb-0.5" /><p className="text-sm font-bold">{metrics.user_count}</p><p className="text-[8px] text-muted-foreground">Users</p></Card>
        <Card className="p-2 border border-border/60 text-center"><CreditCard className="w-3.5 h-3.5 text-amber-600 mx-auto mb-0.5" /><p className="text-sm font-bold">{metrics.subscription_count}</p><p className="text-[8px] text-muted-foreground">Subscriptions</p></Card>
        <Card className="p-2 border border-border/60 text-center"><Target className="w-3.5 h-3.5 text-red-600 mx-auto mb-0.5" /><p className="text-sm font-bold">{metrics.readiness}%</p><p className="text-[8px] text-muted-foreground">Readiness</p></Card>
      </div>

      {/* Dashboard Sections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <SectionCard icon={Building2} title="Organization Health" color="text-primary">
          <div className="space-y-1 text-[10px]">
            <div className="flex justify-between"><span className="text-muted-foreground">Organizations</span><span className="font-semibold">{metrics.org_count}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Users</span><span className="font-semibold">{metrics.user_count}</span></div>
            <MiniList items={sections.organization.items} emptyMsg="No org data" />
          </div>
        </SectionCard>

        <SectionCard icon={DollarSign} title="Revenue" color="text-emerald-600">
          <div className="space-y-1 text-[10px]">
            <div className="flex justify-between"><span className="text-muted-foreground">Monthly Estimate</span><span className="font-semibold">${metrics.revenue_estimate}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Subscriptions</span><span className="font-semibold">{metrics.subscription_count}</span></div>
            <MiniList items={sections.revenue.items} emptyMsg="No subscription data" />
          </div>
        </SectionCard>

        <SectionCard icon={Code} title="Engineering" color="text-blue-600">
          <div className="space-y-1 text-[10px]">
            <div className="flex justify-between"><span className="text-muted-foreground">Roadmap Items</span><span className="font-semibold">{metrics.roadmap_items}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Data Entities</span><span className="font-semibold">{metrics.entity_count}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">APIs</span><span className="font-semibold">{metrics.api_count}</span></div>
            <MiniList items={sections.engineering.items} emptyMsg="No roadmap data" />
          </div>
        </SectionCard>

        <SectionCard icon={Shield} title="Security" color="text-red-600">
          <div className="space-y-1 text-[10px]">
            <Badge variant="outline" className="text-[8px] text-emerald-600 border-emerald-200"><CheckCircle2 className="w-2 h-2 mr-0.5" />Active</Badge>
            <p className="text-muted-foreground mt-1">{sections.security.note}</p>
          </div>
        </SectionCard>

        <SectionCard icon={Scale} title="Legal" color="text-amber-600">
          <div className="space-y-1 text-[10px]">
            <Badge variant="outline" className="text-[8px] text-emerald-600 border-emerald-200"><CheckCircle2 className="w-2 h-2 mr-0.5" />Compliant</Badge>
            <p className="text-muted-foreground mt-1">{sections.legal.note}</p>
          </div>
        </SectionCard>

        <SectionCard icon={Settings} title="Operations" color="text-orange-600">
          <div className="space-y-1 text-[10px]">
            <div className="flex justify-between"><span className="text-muted-foreground">Active Projects</span><span className="font-semibold">{metrics.active_projects}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Completed</span><span className="font-semibold">{metrics.completed_projects}</span></div>
            <MiniList items={sections.operations.items} emptyMsg="No project data" />
          </div>
        </SectionCard>

        <SectionCard icon={Bot} title="AI Workforce" color="text-violet-600">
          <div className="space-y-1 text-[10px]">
            <div className="flex justify-between"><span className="text-muted-foreground">Total Agents</span><span className="font-semibold">{metrics.agent_count}</span></div>
            <MiniList items={sections.ai_workforce.items} emptyMsg="No AI workforce data" />
          </div>
        </SectionCard>

        <SectionCard icon={Server} title="Infrastructure" color="text-slate-600">
          <div className="space-y-1 text-[10px]">
            <div className="flex justify-between"><span className="text-muted-foreground">Entities</span><span className="font-semibold">{metrics.entity_count}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">APIs</span><span className="font-semibold">{metrics.api_count}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Dashboards</span><span className="font-semibold">{metrics.dashboard_count}</span></div>
            <Badge variant="outline" className="text-[8px] text-emerald-600 border-emerald-200 mt-1"><CheckCircle2 className="w-2 h-2 mr-0.5" />NCOS Platform</Badge>
          </div>
        </SectionCard>

        <SectionCard icon={CreditCard} title="Subscriptions" color="text-amber-600">
          <div className="space-y-1 text-[10px]">
            <div className="flex justify-between"><span className="text-muted-foreground">Active Subs</span><span className="font-semibold">{metrics.subscription_count}</span></div>
            <MiniList items={sections.subscriptions.items} emptyMsg="No subscription data" />
          </div>
        </SectionCard>

        <SectionCard icon={Users} title="Customers" color="text-cyan-600">
          <div className="space-y-1 text-[10px]">
            <p className="text-muted-foreground">{sections.customers.note}</p>
            {sections.customers.crm_available && <Badge variant="outline" className="text-[8px] text-cyan-600"><TrendingUp className="w-2 h-2 mr-0.5" />CRM Available</Badge>}
          </div>
        </SectionCard>

        <SectionCard icon={FolderKanban} title="Projects" color="text-blue-600">
          <div className="space-y-1 text-[10px]">
            <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span className="font-semibold">{metrics.project_count}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Active</span><span className="font-semibold text-amber-600">{metrics.active_projects}</span></div>
            <MiniList items={sections.projects.items} emptyMsg="No project data" />
          </div>
        </SectionCard>

        <SectionCard icon={Target} title="Mission Readiness" color="text-red-600">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div className={`h-full ${metrics.readiness >= 80 ? 'bg-emerald-500' : metrics.readiness >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${metrics.readiness}%` }} />
              </div>
              <span className="text-sm font-bold">{metrics.readiness}%</span>
            </div>
            <Badge variant="outline" className={`text-[8px] ${sections.mission_readiness.level === 'high' ? 'text-emerald-600' : sections.mission_readiness.level === 'medium' ? 'text-amber-600' : 'text-red-600'}`}>
              {sections.mission_readiness.level === 'high' ? <CheckCircle2 className="w-2 h-2 mr-0.5" /> : <AlertTriangle className="w-2 h-2 mr-0.5" />}
              {sections.mission_readiness.level.toUpperCase()}
            </Badge>
          </div>
        </SectionCard>
      </div>

      {/* Inherited + Customized Components */}
      {(company.inherited_components?.length > 0 || company.customized_components?.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {company.inherited_components?.length > 0 && (
            <Card className="p-3 border border-border/60">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Inherited Components</p>
              <div className="flex gap-1 flex-wrap">{company.inherited_components.map((c, i) => <Badge key={i} variant="outline" className="text-[8px]">{c}</Badge>)}</div>
            </Card>
          )}
          {company.customized_components?.length > 0 && (
            <Card className="p-3 border border-border/60">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Customized Components</p>
              <div className="flex gap-1 flex-wrap">{company.customized_components.map((c, i) => <Badge key={i} variant="outline" className="text-[8px] text-primary border-primary/30">{c}</Badge>)}</div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}