import {
  ClipboardList, Target, Users, CheckSquare, Gauge, KeyRound,
  GraduationCap, CalendarClock, Brain, Lightbulb, HeartHandshake
} from "lucide-react";
import { Link } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import CompassCard from "./CompassCard";

function Stat({ label, value }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

export default function DirectorCompass({ sections, ai_suggestions }) {
  const s = sections;
  return (
    <div className="space-y-4">
      {ai_suggestions?.suggestions?.length > 0 && (
        <CompassCard icon={Brain} title="AI Suggestions" color="text-violet-500">
          <p className="text-xs text-muted-foreground mb-2">{ai_suggestions.focus_area}</p>
          <div className="space-y-2">
            {ai_suggestions.suggestions.map((sug, i) => (
              <div key={i} className="flex gap-2 items-start">
                <Badge variant={sug.priority === 'high' ? 'destructive' : 'secondary'} className="text-xs capitalize flex-shrink-0">{sug.priority}</Badge>
                <div>
                  <p className="font-medium text-xs">{sug.title}</p>
                  <p className="text-muted-foreground text-xs">{sug.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CompassCard>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <CompassCard icon={ClipboardList} title="Today's Assignments" color="text-blue-500"
          action={<Link to="/projects" className="text-xs text-primary hover:underline">All →</Link>}>
          {s.todays_assignments?.length > 0 ? (
            <div className="space-y-1.5">
              {s.todays_assignments.map((t, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs capitalize">{t.priority}</Badge>
                  <span className="text-xs truncate">{t.title}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-xs">No assignments for today.</p>
          )}
        </CompassCard>

        <CompassCard icon={Target} title="Today's Goals" color="text-emerald-500"
          action={<Link to="/" className="text-xs text-primary hover:underline">All →</Link>}>
          {s.todays_goals?.length > 0 ? (
            <div className="space-y-1.5">
              {s.todays_goals.map((g, i) => (
                <p key={i} className="text-xs">{g.title || g.name || g.description}</p>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-xs">No active goals set.</p>
          )}
        </CompassCard>

        <CompassCard icon={Users} title="Member Follow-ups" color="text-cyan-500">
          {s.member_followups?.length > 0 ? (
            <div className="space-y-1.5">
              {s.member_followups.map((t, i) => (
                <p key={i} className="text-xs truncate">{t.title}</p>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-xs">No follow-ups due.</p>
          )}
        </CompassCard>

        <CompassCard icon={KeyRound} title="Pending Approvals" color="text-amber-500"
          action={<Link to="/self-governance" className="text-xs text-primary hover:underline">Review →</Link>}>
          {s.pending_approvals?.length > 0 ? (
            <div className="space-y-1.5">
              {s.pending_approvals.slice(0, 4).map((a, i) => (
                <p key={i} className="text-xs truncate">{a.title || a.description || 'Approval item'}</p>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-xs">No pending approvals.</p>
          )}
        </CompassCard>

        <CompassCard icon={HeartHandshake} title="Customer Success" color="text-rose-500"
          action={<Link to="/customer-success" className="text-xs text-primary hover:underline">CS OS →</Link>}>
          {s.customer_success ? (
            <div className="space-y-1.5">
              <Stat label="Total customers" value={s.customer_success.total} />
              <Stat label="At-risk" value={s.customer_success.at_risk} />
              <Stat label="Avg health" value={`${s.customer_success.avg_health}/100`} />
              <Stat label="Renewals 30d" value={s.customer_success.upcoming_renewals} />
            </div>
          ) : (
            <p className="text-muted-foreground text-xs">No CS data.</p>
          )}
        </CompassCard>

        <CompassCard icon={Gauge} title="Team Performance" color="text-violet-500"
          action={<Link to="/workforce" className="text-xs text-primary hover:underline">Manage →</Link>}>
          <div className="space-y-1.5">
            <Stat label="Active agents" value={s.team_performance.active} />
            <Stat label="Tasks completed" value={s.team_performance.tasks_completed} />
            <Stat label="Avg performance" value={`${s.team_performance.avg_performance}%`} />
          </div>
        </CompassCard>

        <CompassCard icon={CheckSquare} title="Department KPIs" color="text-indigo-500">
          <div className="space-y-1.5">
            <Stat label="Task completion rate" value={`${s.department_kpis.task_completion_rate}%`} />
            <Progress value={s.department_kpis.task_completion_rate} className="h-1.5" />
            <Stat label="Open tasks" value={s.department_kpis.open_tasks} />
          </div>
        </CompassCard>

        <CompassCard icon={Lightbulb} title="Recommended Actions" color="text-amber-500">
          {(ai_suggestions?.suggestions || []).slice(0, 3).map((sug, i) => (
            <p key={i} className="text-xs mb-1">{sug.title}</p>
          ))}
          {(!ai_suggestions?.suggestions || ai_suggestions.suggestions.length === 0) && (
            <p className="text-muted-foreground text-xs">No recommendations yet.</p>
          )}
        </CompassCard>

        <CompassCard icon={GraduationCap} title="Training" color="text-emerald-500"
          action={<Link to="/workforce/training" className="text-xs text-primary hover:underline">Library →</Link>}>
          {s.training?.length > 0 ? (
            <div className="space-y-1.5">
              {s.training.map((c, i) => (
                <p key={i} className="text-xs truncate">{c.title || c.name || c.description}</p>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-xs">No training assigned.</p>
          )}
        </CompassCard>

        <CompassCard icon={CalendarClock} title="Upcoming Meetings" color="text-rose-500"
          action={<Link to="/crm-communications" className="text-xs text-primary hover:underline">All →</Link>}>
          {s.upcoming_meetings?.length > 0 ? (
            <div className="space-y-1.5">
              {s.upcoming_meetings.slice(0, 4).map((m, i) => (
                <p key={i} className="text-xs truncate">{m.title || m.subject || m.description || 'Meeting'}</p>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-xs">No upcoming meetings.</p>
          )}
        </CompassCard>
      </div>
    </div>
  );
}