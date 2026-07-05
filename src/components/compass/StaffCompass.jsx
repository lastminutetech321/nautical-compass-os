import {
  CheckSquare, Calendar, GraduationCap, MessageSquare, Brain,
  BookOpen, FileText, TrendingUp, LifeBuoy, Clock
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

export default function StaffCompass({ sections, ai_suggestions }) {
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
        <CompassCard icon={CheckSquare} title="Today's Tasks" color="text-blue-500"
          action={<Link to="/projects" className="text-xs text-primary hover:underline">All →</Link>}>
          {s.todays_tasks?.length > 0 ? (
            <div className="space-y-1.5">
              {s.todays_tasks.map((t, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs capitalize">{t.priority}</Badge>
                  <span className="text-xs truncate">{t.title}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-xs">No tasks due today. Great work staying ahead!</p>
          )}
        </CompassCard>

        <CompassCard icon={Calendar} title="Schedule" color="text-cyan-500">
          {s.schedule?.length > 0 ? (
            <div className="space-y-1.5">
              {s.schedule.slice(0, 5).map((t, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  <span className="truncate">{t.title}</span>
                  {t.due_date && <span className="text-muted-foreground ml-auto">{t.due_date}</span>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-xs">No upcoming deadlines.</p>
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

        <CompassCard icon={MessageSquare} title="Messages" color="text-rose-500"
          action={<Link to="/notifications" className="text-xs text-primary hover:underline">All →</Link>}>
          {s.messages?.length > 0 ? (
            <div className="space-y-1.5">
              {s.messages.slice(0, 5).map((n, i) => (
                <p key={i} className="text-xs truncate">{n.title || n.message || n.content || 'Notification'}</p>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-xs">No new messages.</p>
          )}
        </CompassCard>

        <CompassCard icon={BookOpen} title="Knowledge Articles" color="text-amber-500"
          action={<Link to="/engineering-academy" className="text-xs text-primary hover:underline">Academy →</Link>}>
          {s.knowledge_articles?.length > 0 ? (
            <div className="space-y-1.5">
              {s.knowledge_articles.map((l, i) => (
                <p key={i} className="text-xs truncate">{l.title}</p>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-xs">No articles available.</p>
          )}
        </CompassCard>

        <CompassCard icon={FileText} title="Documents" color="text-indigo-500"
          action={<Link to="/documents" className="text-xs text-primary hover:underline">All →</Link>}>
          {s.documents?.length > 0 ? (
            <div className="space-y-1.5">
              {s.documents.map((d, i) => (
                <p key={i} className="text-xs truncate">{d.title || d.name || 'Document'}</p>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-xs">No documents available.</p>
          )}
        </CompassCard>

        <CompassCard icon={TrendingUp} title="Progress" color="text-emerald-500">
          <div className="space-y-1.5">
            <Stat label="Total tasks" value={s.progress.total} />
            <Stat label="Completed" value={s.progress.done} />
            <Stat label="Completion rate" value={`${s.progress.completion_rate}%`} />
            <Progress value={s.progress.completion_rate} className="h-1.5" />
          </div>
        </CompassCard>

        <CompassCard icon={LifeBuoy} title="Support Requests" color="text-orange-500">
          {s.support_requests?.length > 0 ? (
            <div className="space-y-1.5">
              {s.support_requests.slice(0, 4).map((t, i) => (
                <p key={i} className="text-xs truncate">{t.title}</p>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-xs">No open support requests.</p>
          )}
        </CompassCard>
      </div>
    </div>
  );
}