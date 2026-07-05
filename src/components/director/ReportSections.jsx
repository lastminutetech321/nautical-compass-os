import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Target, Users, Rocket, Calendar, CheckCircle2, AlertTriangle } from "lucide-react";

const IMPACT_BADGE = {
  critical: "border-red-300 bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400",
  high: "border-orange-300 bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400",
  medium: "border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400",
  low: "border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400",
};

function SectionCard({ title, icon: Icon, summary, children }) {
  return (
    <Card className="p-3 border border-border/60">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-amber-600" />
        <h3 className="text-sm font-bold">{title}</h3>
      </div>
      {summary && <p className="text-[10px] text-muted-foreground mb-2 italic">{summary}</p>}
      {children}
    </Card>
  );
}

function ListBlock({ label, items, color = "text-blue-600" }) {
  if (!items?.length) return null;
  return (
    <div className="mb-2">
      <p className="text-[9px] font-bold text-muted-foreground uppercase mb-1">{label}</p>
      <div className="space-y-0.5">
        {items.map((item, i) => (
          <p key={i} className="text-[10px] flex items-start gap-1">
            <span className={color}>→</span><span>{typeof item === 'string' ? item : JSON.stringify(item)}</span>
          </p>
        ))}
      </div>
    </div>
  );
}

export function DailyBriefing({ data }) {
  if (!data) return <p className="text-xs text-muted-foreground">No briefing data.</p>;
  return (
    <SectionCard title="Daily Executive Briefing" icon={Calendar} summary={data.summary}>
      {data.headline && <p className="text-xs font-semibold mb-2 text-amber-700 dark:text-amber-400">{data.headline}</p>}
      <ListBlock label="Key Wins" items={data.key_wins} color="text-emerald-600" />
      <ListBlock label="Key Risks" items={data.key_risks} color="text-red-600" />
      {data.revenue_status && <p className="text-[10px] mb-1"><strong className="text-muted-foreground">Revenue:</strong> {data.revenue_status}</p>}
      {data.platform_health && <p className="text-[10px] mb-1"><strong className="text-muted-foreground">Health:</strong> {data.platform_health}</p>}
      <ListBlock label="Founder Actions Required" items={data.founder_actions_required} color="text-amber-600" />
    </SectionCard>
  );
}

export function WeeklyRoadmap({ data }) {
  if (!data) return <p className="text-xs text-muted-foreground">No roadmap data.</p>;
  return (
    <SectionCard title="Weekly Roadmap" icon={TrendingUp} summary={data.summary}>
      {data.week_theme && <p className="text-xs font-semibold mb-2 text-amber-700 dark:text-amber-400">Theme: {data.week_theme}</p>}
      {data.priority_initiatives?.length > 0 && (
        <div className="mb-2 space-y-1">
          <p className="text-[9px] font-bold text-muted-foreground uppercase">Priority Initiatives</p>
          {data.priority_initiatives.map((init, i) => (
            <div key={i} className="p-1.5 rounded border border-border/30 bg-white dark:bg-slate-800/40 text-[10px]">
              <div className="flex items-center justify-between mb-0.5">
                <span className="font-semibold">{init.name || init.title}</span>
                {init.impact && <Badge variant="outline" className={`text-[8px] ${IMPACT_BADGE[init.impact] || ''}`}>{init.impact}</Badge>}
              </div>
              <p className="text-[9px] text-muted-foreground">Owner: {init.owner || '—'} · Effort: {init.effort || '—'}</p>
            </div>
          ))}
        </div>
      )}
      <ListBlock label="Milestones This Week" items={data.milestones_this_week} />
    </SectionCard>
  );
}

export function MonthlyMilestones({ data }) {
  if (!data) return <p className="text-xs text-muted-foreground">No milestones data.</p>;
  return (
    <SectionCard title="Monthly Milestones" icon={Target} summary={data.summary}>
      {data.month_theme && <p className="text-xs font-semibold mb-2 text-amber-700 dark:text-amber-400">Theme: {data.month_theme}</p>}
      {data.milestones?.length > 0 && (
        <div className="mb-2 space-y-1">
          {data.milestones.map((m, i) => (
            <div key={i} className="p-1.5 rounded border border-border/30 bg-white dark:bg-slate-800/40 text-[10px] flex items-center justify-between">
              <span className="font-medium">{m.title}</span>
              <div className="flex gap-1">
                {m.target_date && <Badge variant="outline" className="text-[8px]">{m.target_date}</Badge>}
                <Badge variant="outline" className="text-[8px]">{m.status || 'planned'}</Badge>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-4 text-[10px]">
        {data.revenue_target > 0 && <span><strong className="text-muted-foreground">Revenue Target:</strong> ${data.revenue_target.toLocaleString()}</span>}
        {data.readiness_target > 0 && <span><strong className="text-muted-foreground">Readiness Target:</strong> {data.readiness_target}%</span>}
      </div>
    </SectionCard>
  );
}

export function RecommendedSprint({ data }) {
  if (!data) return <p className="text-xs text-muted-foreground">No sprint data.</p>;
  return (
    <SectionCard title="Recommended Sprint" icon={Rocket} summary={data.summary}>
      {data.sprint_name && <p className="text-xs font-semibold mb-1 text-amber-700 dark:text-amber-400">{data.sprint_name}</p>}
      {data.sprint_goal && <p className="text-[10px] mb-2"><strong className="text-muted-foreground">Goal:</strong> {data.sprint_goal}</p>}
      <div className="flex gap-3 text-[10px] mb-2">
        <span><strong className="text-muted-foreground">Duration:</strong> {data.duration_weeks || 2} weeks</span>
        {data.assigned_team?.length > 0 && <span><strong className="text-muted-foreground">Team:</strong> {data.assigned_team.join(', ')}</span>}
      </div>
      {data.sprint_backlog?.length > 0 && (
        <div className="mb-2 space-y-0.5">
          <p className="text-[9px] font-bold text-muted-foreground uppercase">Sprint Backlog</p>
          {data.sprint_backlog.map((item, i) => (
            <div key={i} className="text-[10px] flex items-center gap-2 p-1 rounded border border-border/20">
              <span className="font-medium flex-1">{item.task || item.title}</span>
              <Badge variant="outline" className="text-[8px]">{item.points || '?'} pts</Badge>
              <span className="text-[9px] text-muted-foreground">{item.assignee || '—'}</span>
            </div>
          ))}
        </div>
      )}
      <ListBlock label="Success Criteria" items={data.success_criteria} color="text-emerald-600" />
    </SectionCard>
  );
}

export function RecommendedStaffing({ data }) {
  if (!data) return <p className="text-xs text-muted-foreground">No staffing data.</p>;
  return (
    <SectionCard title="Recommended Staffing" icon={Users} summary={data.summary}>
      {data.current_capacity && <p className="text-[10px] mb-2"><strong className="text-muted-foreground">Current Capacity:</strong> {data.current_capacity}</p>}
      <ListBlock label="Gaps Identified" items={data.gaps_identified} color="text-red-600" />
      {data.hire_recommendations?.length > 0 && (
        <div className="mb-2 space-y-1">
          <p className="text-[9px] font-bold text-muted-foreground uppercase">Hire Recommendations</p>
          {data.hire_recommendations.map((h, i) => (
            <div key={i} className="p-1.5 rounded border border-border/30 bg-white dark:bg-slate-800/40 text-[10px]">
              <div className="flex items-center justify-between mb-0.5">
                <span className="font-semibold">{h.role}</span>
                <Badge variant="outline" className={`text-[8px] ${IMPACT_BADGE[h.urgency] || IMPACT_BADGE.medium}`}>{h.urgency || 'medium'}</Badge>
              </div>
              <p className="text-[9px] text-muted-foreground">{h.reason}</p>
            </div>
          ))}
        </div>
      )}
      {data.agent_reallocation?.length > 0 && (
        <div className="mb-2 space-y-0.5">
          <p className="text-[9px] font-bold text-muted-foreground uppercase">Agent Reallocation</p>
          {data.agent_reallocation.map((r, i) => (
            <div key={i} className="text-[10px] p-1 rounded border border-border/20">
              <span className="font-medium">{r.agent}</span>: {r.from} → {r.to}
              <p className="text-[9px] text-muted-foreground">{r.reason}</p>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

export function RecommendedPriorities({ data }) {
  if (!data) return <p className="text-xs text-muted-foreground">No priorities data.</p>;
  return (
    <SectionCard title="Recommended Priorities" icon={TrendingUp} summary={data.summary}>
      {data.top_5_priorities?.length > 0 && (
        <div className="mb-2 space-y-1">
          {data.top_5_priorities.map((p, i) => (
            <div key={i} className="p-1.5 rounded border border-border/30 bg-white dark:bg-slate-800/40 text-[10px]">
              <div className="flex items-center justify-between mb-0.5">
                <span className="font-semibold">#{i + 1} {p.title}</span>
                {p.impact && <Badge variant="outline" className={`text-[8px] ${IMPACT_BADGE[p.impact] || ''}`}>{p.impact}</Badge>}
              </div>
              <p className="text-[9px] text-muted-foreground">{p.rationale}</p>
              <div className="flex gap-2 text-[9px] mt-0.5">
                <span>Effort: {p.effort || '—'}</span>
                <span>Owner: {p.owner || '—'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      {data.deprioritize?.length > 0 && (
        <div className="mb-2">
          <p className="text-[9px] font-bold text-muted-foreground uppercase mb-1 flex items-center gap-1">
            <TrendingDown className="w-2.5 h-2.5" />Deprioritize
          </p>
          <div className="space-y-0.5">
            {data.deprioritize.map((d, i) => (
              <p key={i} className="text-[10px] flex items-start gap-1 text-muted-foreground line-through">
                <AlertTriangle className="w-2.5 h-2.5 mt-0.5 text-amber-500 flex-shrink-0" />{d}
              </p>
            ))}
          </div>
        </div>
      )}
      {data.rationale && <p className="text-[10px] text-muted-foreground italic mt-2 pt-2 border-t border-border/30">{data.rationale}</p>}
    </SectionCard>
  );
}