import {
  TrendingUp, Compass as CompassIcon, Upload, FolderOpen, BellRing,
  GraduationCap, MessageSquare, Award, Brain, Scale, Lightbulb
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

export default function MemberCompass({ sections, ai_suggestions }) {
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
        <CompassCard icon={TrendingUp} title="Today's Progress" color="text-emerald-500">
          <div className="space-y-1.5">
            <Stat label="Total tasks" value={s.todays_progress.total} />
            <Stat label="Completed" value={s.todays_progress.done} />
            <Stat label="Completion rate" value={`${s.todays_progress.completion_rate}%`} />
            <Progress value={s.todays_progress.completion_rate} className="h-1.5" />
          </div>
        </CompassCard>

        <CompassCard icon={Scale} title="Decision Compass" color="text-amber-500"
          action={<Link to="/decision-compass" className="text-xs text-primary hover:underline">Open →</Link>}>
          <p className="text-xs text-muted-foreground">Get guidance on forms and applications with risk-aware decision support.</p>
        </CompassCard>

        <CompassCard icon={CompassIcon} title="Resource Compass" color="text-cyan-500"
          action={<Link to="/resource-compass" className="text-xs text-primary hover:underline">Open →</Link>}>
          <p className="text-xs text-muted-foreground">Find housing, employment, food, medical, and legal resources near you.</p>
        </CompassCard>

        <CompassCard icon={Upload} title="Evidence Uploads" color="text-red-500"
          action={<Link to="/evidence" className="text-xs text-primary hover:underline">Vault →</Link>}>
          {s.evidence_uploads?.length > 0 ? (
            <div className="space-y-1.5">
              {s.evidence_uploads.map((e, i) => (
                <p key={i} className="text-xs truncate">{e.title || e.description || 'Evidence item'}</p>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-xs">No evidence uploaded yet.</p>
          )}
        </CompassCard>

        <CompassCard icon={FolderOpen} title="Open Matters" color="text-indigo-500"
          action={<Link to="/cases" className="text-xs text-primary hover:underline">All →</Link>}>
          {s.open_matters?.length > 0 ? (
            <div className="space-y-1.5">
              {s.open_matters.map((c, i) => (
                <p key={i} className="text-xs truncate">{c.title || c.name || c.case_number || 'Case'}</p>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-xs">No open matters.</p>
          )}
        </CompassCard>

        <CompassCard icon={BellRing} title="Reminders" color="text-amber-500"
          action={<Link to="/resource-reminders" className="text-xs text-primary hover:underline">All →</Link>}>
          {s.reminders?.length > 0 ? (
            <div className="space-y-1.5">
              {s.reminders.slice(0, 5).map((r, i) => (
                <p key={i} className="text-xs truncate">{r.title || r.message || r.description || 'Reminder'}</p>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-xs">No reminders due.</p>
          )}
        </CompassCard>

        <CompassCard icon={Lightbulb} title="Recommended Actions" color="text-violet-500">
          {(ai_suggestions?.suggestions || []).slice(0, 3).map((sug, i) => (
            <p key={i} className="text-xs mb-1">{sug.title}</p>
          ))}
          {(!ai_suggestions?.suggestions || ai_suggestions.suggestions.length === 0) && (
            <p className="text-muted-foreground text-xs">No recommendations yet.</p>
          )}
        </CompassCard>

        <CompassCard icon={GraduationCap} title="Learning Center" color="text-emerald-500"
          action={<Link to="/workforce/training" className="text-xs text-primary hover:underline">Browse →</Link>}>
          {s.learning_center?.courses?.length > 0 || s.learning_center?.lessons?.length > 0 ? (
            <div className="space-y-1.5">
              {(s.learning_center.courses || []).slice(0, 3).map((c, i) => (
                <p key={i} className="text-xs truncate">{c.title || c.name}</p>
              ))}
              {(s.learning_center.lessons || []).slice(0, 2).map((l, i) => (
                <p key={`l${i}`} className="text-xs truncate text-muted-foreground">{l.title}</p>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-xs">No learning materials available.</p>
          )}
        </CompassCard>

        <CompassCard icon={MessageSquare} title="Messages" color="text-rose-500"
          action={<Link to="/notifications" className="text-xs text-primary hover:underline">All →</Link>}>
          {s.messages?.length > 0 ? (
            <div className="space-y-1.5">
              {s.messages.slice(0, 4).map((n, i) => (
                <p key={i} className="text-xs truncate">{n.title || n.message || n.content || 'Notification'}</p>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-xs">No new messages.</p>
          )}
        </CompassCard>

        <CompassCard icon={Award} title="Achievements" color="text-amber-500">
          {s.achievements?.length > 0 ? (
            <div className="space-y-1.5">
              {s.achievements.map((t, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <Award className="w-3 h-3 text-amber-500" />
                  <span className="truncate">{t.title}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-xs">Complete tasks to earn achievements!</p>
          )}
        </CompassCard>
      </div>
    </div>
  );
}