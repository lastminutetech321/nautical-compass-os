import React, { useState } from "react";
import { ChevronDown, ChevronUp, Anchor, AlertCircle, Zap, Briefcase, Users, Scale, DollarSign, Calendar, Compass } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function PrioritiesWidget({ data }) {
  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3"><div className="flex items-center gap-2"><Compass className="h-4 w-4 text-primary" /><CardTitle className="text-sm font-semibold">Today's Priorities</CardTitle></div></CardHeader>
      <CardContent className="space-y-2">
        {data.items.map((item, i) => (<div key={i} className="flex items-start gap-2 text-sm"><Badge variant={item.priority === "high" ? "destructive" : "secondary"} className="mt-0.5 h-5 px-1.5 text-xs">{item.priority}</Badge><span className="text-muted-foreground flex-1">{item.text}</span></div>))}
      </CardContent>
    </Card>
  );
}

function AlertsWidget({ data }) {
  return (<Card className="border-destructive/20"><CardHeader className="pb-3"><div className="flex items-center gap-2"><AlertCircle className="h-4 w-4 text-destructive" /><CardTitle className="text-sm font-semibold">Alerts</CardTitle>{data.count > 0 && <Badge variant="destructive" className="ml-auto h-5 px-2 text-xs">{data.count}</Badge>}</div></CardHeader><CardContent className="space-y-2">{data.items.length === 0 ? <p className="text-xs text-muted-foreground">No active alerts</p> : data.items.map((alert, i) => (<div key={i} className="flex items-start gap-2 text-sm"><div className={cn("h-2 w-2 rounded-full mt-1.5", alert.level === "urgent" ? "bg-destructive" : "bg-warning")} /><span className="text-muted-foreground flex-1">{alert.message}</span></div>))}</CardContent></Card>);
}

function QuickActionsWidget({ data }) {
  return (<Card><CardHeader className="pb-3"><div className="flex items-center gap-2"><Zap className="h-4 w-4 text-warning" /><CardTitle className="text-sm font-semibold">Quick Actions</CardTitle></div></CardHeader><CardContent className="space-y-2">{data.actions.map((action, i) => (<Button key={i} variant="outline" size="sm" className="w-full justify-start text-xs h-8" onClick={() => action.onClick?.()}>{action.icon && <action.icon className="h-3 w-3 mr-2" />}{action.label}</Button>))}</CardContent></Card>);
}

function ProjectsWidget({ data }) {
  return (<Card><CardHeader className="pb-3"><div className="flex items-center gap-2"><Briefcase className="h-4 w-4 text-primary" /><CardTitle className="text-sm font-semibold">Active Projects</CardTitle><Badge variant="secondary" className="ml-auto h-5 px-2 text-xs">{data.active}/{data.total}</Badge></div></CardHeader><CardContent className="space-y-2">{data.projects.map((project, i) => (<div key={i} className="space-y-1"><div className="flex items-center justify-between text-sm"><span className="font-medium">{project.name}</span><span className="text-xs text-muted-foreground">{project.progress}%</span></div><div className="h-1.5 bg-secondary rounded-full overflow-hidden"><div className="h-full bg-primary transition-all" style={{ width: `${project.progress}%` }} /></div></div>))}</CardContent></Card>);
}

function WorkforceWidget({ data }) {
  return (<Card><CardHeader className="pb-3"><div className="flex items-center gap-2"><Users className="h-4 w-4 text-primary" /><CardTitle className="text-sm font-semibold">Workforce</CardTitle></div></CardHeader><CardContent className="space-y-3"><div className="grid grid-cols-2 gap-3"><div><p className="text-xs text-muted-foreground">Active</p><p className="text-lg font-bold">{data.active}</p></div><div><p className="text-xs text-muted-foreground">Available</p><p className="text-lg font-bold">{data.available}</p></div></div><div className="pt-2 border-t space-y-1">{data.skills.map((skill, i) => (<div key={i} className="flex items-center justify-between text-xs"><span className="text-muted-foreground">{skill.name}</span><Badge variant="outline" className="h-5 px-2 text-xs">{skill.count}</Badge></div>))}</div></CardContent></Card>);
}

function LegalWidget({ data }) {
  return (<Card><CardHeader className="pb-3"><div className="flex items-center gap-2"><Scale className="h-4 w-4 text-primary" /><CardTitle className="text-sm font-semibold">Legal & Cases</CardTitle></div></CardHeader><CardContent className="space-y-2"><div className="grid grid-cols-2 gap-3"><div><p className="text-xs text-muted-foreground">Open Cases</p><p className="text-lg font-bold">{data.openCases}</p></div><div><p className="text-xs text-muted-foreground">Pending</p><p className="text-lg font-bold">{data.pending}</p></div></div>{data.upcoming.length > 0 && (<div className="pt-2 border-t space-y-1">{data.upcoming.map((item, i) => (<div key={i} className="text-xs"><span className="text-muted-foreground">{item.type}: </span><span className="font-medium">{item.date}</span></div>))}</div>)}</CardContent></Card>);
}

function FinanceWidget({ data }) {
  return (<Card><CardHeader className="pb-3"><div className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-primary" /><CardTitle className="text-sm font-semibold">Financial Summary</CardTitle></div></CardHeader><CardContent className="space-y-3"><div className="grid grid-cols-2 gap-3"><div><p className="text-xs text-muted-foreground">Revenue (MTD)</p><p className="text-lg font-bold">{data.revenueMTD}</p></div><div><p className="text-xs text-muted-foreground">Outstanding</p><p className="text-lg font-bold">{data.outstanding}</p></div></div><div className="pt-2 border-t space-y-1">{data.metrics.map((metric, i) => (<div key={i} className="flex items-center justify-between text-xs"><span className="text-muted-foreground">{metric.label}</span><span className={cn("font-medium", metric.positive ? "text-success" : "text-muted-foreground")}>{metric.value}</span></div>))}</div></CardContent></Card>);
}

function EventsWidget({ data }) {
  return (<Card><CardHeader className="pb-3"><div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-primary" /><CardTitle className="text-sm font-semibold">Upcoming Events</CardTitle></div></CardHeader><CardContent className="space-y-2">{data.events.length === 0 ? <p className="text-xs text-muted-foreground">No upcoming events</p> : data.events.map((event, i) => (<div key={i} className="flex items-start gap-2 text-sm"><div className="text-xs text-muted-foreground min-w-[60px]">{event.date}</div><div className="flex-1"><p className="text-sm font-medium">{event.title}</p>{event.location && <p className="text-xs text-muted-foreground">{event.location}</p>}</div></div>))}</CardContent></Card>);
}

function CompassOverviewWidget({ data }) {
  return (<Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent"><CardHeader className="pb-3"><div className="flex items-center gap-2"><Anchor className="h-4 w-4 text-primary" /><CardTitle className="text-sm font-semibold">Daily Compass</CardTitle></div><CardDescription className="text-xs">Your operational overview for {data.date}</CardDescription></CardHeader><CardContent className="space-y-2"><div className="grid grid-cols-2 gap-3"><div><p className="text-xs text-muted-foreground">Tasks</p><p className="text-lg font-bold">{data.tasks.completed}/{data.tasks.total}</p></div><div><p className="text-xs text-muted-foreground">Focus</p><p className="text-lg font-bold">{data.focus}%</p></div></div>{data.message && <div className="pt-2 border-t"><p className="text-xs text-muted-foreground italic">{data.message}</p></div>}</CardContent></Card>);
}

const DEFAULT_WIDGETS = ['compassOverview', 'priorities', 'alerts', 'quickActions', 'projects', 'workforce', 'legal', 'finance', 'events'];

const PLACEHOLDER_DATA = {
  compassOverview: { date: new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }), tasks: { completed: 12, total: 18 }, focus: 87, message: 'Strong start to the week. Keep momentum.' },
  priorities: { items: [{ priority: 'high', text: 'Review Q1 workforce allocations' }, { priority: 'medium', text: 'Finalize production schedule' }, { priority: 'medium', text: 'Legal review - contract amendments' }] },
  alerts: { count: 2, items: [{ level: 'urgent', message: 'Contract renewal deadline: 3 days' }, { level: 'warning', message: 'Workforce capacity at 92%' }] },
  quickActions: { actions: [{ label: 'New Project', icon: Briefcase }, { label: 'Add Crew Member', icon: Users }, { label: 'Schedule Event', icon: Calendar }] },
  projects: { active: 4, total: 7, projects: [{ name: 'Feature Film Alpha', progress: 68 }, { name: 'Commercial Beta', progress: 45 }, { name: 'Documentary Gamma', progress: 92 }] },
  workforce: { active: 47, available: 12, skills: [{ name: 'Camera Ops', count: 8 }, { name: 'Sound Tech', count: 5 }, { name: 'Grips', count: 12 }] },
  legal: { openCases: 3, pending: 1, upcoming: [{ type: 'Filing', date: 'Mar 15' }, { type: 'Hearing', date: 'Mar 22' }] },
  finance: { revenueMTD: '$284K', outstanding: '$47K', metrics: [{ label: 'Budget adherence', value: '94%', positive: true }, { label: 'Payroll processed', value: '$142K', positive: false }] },
  events: { events: [{ date: 'Mar 12', title: 'Production Kickoff Meeting', location: 'Studio A' }, { date: 'Mar 14', title: 'Client Review Session' }, { date: 'Mar 18', title: 'Safety Training' }] }
};

export default function CaptainsViewHero({ role = 'captain', widgets = DEFAULT_WIDGETS, data = PLACEHOLDER_DATA }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="mb-6 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-4 motion-safe:duration-500">
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b border-primary/20 px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Anchor className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Captain's View</h1>
              <p className="text-sm text-muted-foreground">Executive Command Center</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setCollapsed(!collapsed)} className="gap-2">
            {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            {collapsed ? 'Expand' : 'Collapse'}
          </Button>
        </div>
      </div>
      {!collapsed && (
        <div className="px-4 sm:px-6 py-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 motion-reduce:transition-none transition-all">
          {widgets.map((widgetKey) => {
            const Widget = { priorities: PrioritiesWidget, alerts: AlertsWidget, quickActions: QuickActionsWidget, projects: ProjectsWidget, workforce: WorkforceWidget, legal: LegalWidget, finance: FinanceWidget, events: EventsWidget, compassOverview: CompassOverviewWidget }[widgetKey];
            if (!Widget) return null;
            return <Widget key={widgetKey} data={data[widgetKey] || {}} />;
          })}
        </div>
      )}
    </div>
  );
}
