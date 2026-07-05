import {
  Crown, AlertTriangle, DollarSign, Server, Code, Scale, BookOpen,
  Bot, CheckCircle2, TrendingUp, Target, Briefcase, Brain, Zap, HeartHandshake
} from "lucide-react";
import { Link } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import CompassCard from "./CompassCard";

function Stat({ label, value, sub }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-muted-foreground">{label}</span>
      <div className="text-right">
        <span className="font-semibold">{value}</span>
        {sub && <span className="text-xs text-muted-foreground ml-1">{sub}</span>}
      </div>
    </div>
  );
}

export default function FounderCompass({ sections, ai_suggestions }) {
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
        <CompassCard icon={Crown} title="Executive Briefing" color="text-amber-500" className="md:col-span-2 lg:col-span-2"
          action={<Link to="/mission-control" className="text-xs text-primary hover:underline">Full briefing →</Link>}>
          {s.executive_briefing ? (
            <div className="space-y-2">
              <p className="font-medium">{s.executive_briefing.headline || s.executive_briefing.title || 'Latest briefing'}</p>
              <p className="text-muted-foreground text-xs">{s.executive_briefing.summary || s.executive_briefing.content || ''}</p>
            </div>
          ) : (
            <p className="text-muted-foreground">No briefing generated yet. Visit Mission Control to generate one.</p>
          )}
        </CompassCard>

        <CompassCard icon={AlertTriangle} title="Critical Alerts" color="text-red-500"
          action={<Link to="/self-governance" className="text-xs text-primary hover:underline">Review →</Link>}>
          <div className="space-y-2">
            <Stat label="Pending approvals" value={s.critical_alerts.pending_approvals} />
            <Stat label="Customer alerts" value={s.critical_alerts.customer_alerts} />
            <Stat label="Overdue tasks" value={s.critical_alerts.overdue_tasks} />
          </div>
        </CompassCard>

        <CompassCard icon={HeartHandshake} title="Customer Success" color="text-violet-500"
          action={<Link to="/customer-success" className="text-xs text-primary hover:underline">CS OS →</Link>}>
          {s.customer_success ? (
            <div className="space-y-1.5">
              <Stat label="Total customers" value={s.customer_success.total} />
              <Stat label="At-risk" value={s.customer_success.at_risk} />
              <Stat label="Avg health" value={`${s.customer_success.avg_health}/100`} />
              <Stat label="Renewals 30d" value={s.customer_success.upcoming_renewals} />
              {s.customer_success.founder_alerts > 0 && <Badge variant="destructive" className="text-xs">{s.customer_success.founder_alerts} founder alert(s)</Badge>}
            </div>
          ) : (
            <p className="text-muted-foreground text-xs">No CS data loaded.</p>
          )}
        </CompassCard>

        <CompassCard icon={DollarSign} title="Revenue Health" color="text-emerald-500"
          action={<Link to="/financial-intelligence" className="text-xs text-primary hover:underline">Details →</Link>}>
          <div className="space-y-1.5">
            <Stat label="MRR" value={`$${s.revenue_health.mrr.toLocaleString()}`} />
            <Stat label="ARR" value={`$${s.revenue_health.arr.toLocaleString()}`} />
            <Stat label="Runway" value={`${s.revenue_health.runway_days} days`} />
            <Stat label="Monthly burn" value={`$${s.revenue_health.monthly_burn.toLocaleString()}`} />
          </div>
        </CompassCard>

        <CompassCard icon={Server} title="Platform Health" color="text-blue-500"
          action={<Link to="/health" className="text-xs text-primary hover:underline">Monitor →</Link>}>
          <p className="font-medium capitalize">{s.platform_health?.status || 'unknown'}</p>
          {s.platform_health?.summary && <p className="text-xs text-muted-foreground mt-1">{s.platform_health.summary}</p>}
        </CompassCard>

        <CompassCard icon={Code} title="Engineering Health" color="text-cyan-500"
          action={<Link to="/projects" className="text-xs text-primary hover:underline">Projects →</Link>}>
          <div className="space-y-1.5">
            <Stat label="Total tasks" value={s.engineering_health.total} />
            <Stat label="In progress" value={s.engineering_health.in_progress} />
            <Stat label="Overdue" value={s.engineering_health.overdue} />
            <Progress value={s.engineering_health.total > 0 ? (s.engineering_health.done / s.engineering_health.total) * 100 : 0} className="mt-2 h-1.5" />
          </div>
        </CompassCard>

        <CompassCard icon={Scale} title="Legal Readiness" color="text-indigo-500"
          action={<Link to="/canon" className="text-xs text-primary hover:underline">Canon →</Link>}>
          <div className="space-y-1.5">
            <Stat label="Canon entries" value={s.legal_readiness.total} />
            <Stat label="Verified" value={s.legal_readiness.verified} />
            <Stat label="Active" value={s.legal_readiness.active} />
          </div>
        </CompassCard>

        <CompassCard icon={BookOpen} title="Canon Progress" color="text-amber-500"
          action={<Link to="/canon-dashboard" className="text-xs text-primary hover:underline">Dashboard →</Link>}>
          <div className="space-y-1.5">
            <Stat label="Total entries" value={s.canon_progress.total} />
            <Stat label="Verified" value={s.canon_progress.verified} />
            <Progress value={s.canon_progress.total > 0 ? (s.canon_progress.verified / s.canon_progress.total) * 100 : 0} className="mt-2 h-1.5" />
          </div>
        </CompassCard>

        <CompassCard icon={CheckCircle2} title="Evidence Progress" color="text-red-500"
          action={<Link to="/evidence" className="text-xs text-primary hover:underline">Vault →</Link>}>
          <div className="space-y-1.5">
            <Stat label="Total items" value={s.evidence_progress.total} />
            {s.evidence_progress.recent?.slice(0, 3).map((e, i) => (
              <p key={i} className="text-xs text-muted-foreground truncate">{e.title || e.description || 'Evidence item'}</p>
            ))}
          </div>
        </CompassCard>

        <CompassCard icon={Bot} title="AI Workforce Status" color="text-violet-500"
          action={<Link to="/workforce" className="text-xs text-primary hover:underline">Manage →</Link>}>
          <div className="space-y-1.5">
            <Stat label="Total agents" value={s.ai_workforce.total} />
            <Stat label="Active" value={s.ai_workforce.active} />
            <Stat label="Avg performance" value={`${s.ai_workforce.avg_performance}%`} />
          </div>
        </CompassCard>

        <CompassCard icon={Zap} title="Pending Founder Approvals" color="text-amber-500"
          action={<Link to="/self-governance" className="text-xs text-primary hover:underline">Review →</Link>}>
          {s.pending_approvals?.length > 0 ? (
            <div className="space-y-1.5">
              {s.pending_approvals.slice(0, 4).map((a, i) => (
                <p key={i} className="text-xs truncate">{a.title || a.description || `Approval #${a.id?.slice(-4)}`}</p>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-xs">No pending approvals.</p>
          )}
        </CompassCard>

        <CompassCard icon={Target} title="Highest ROI Action" color="text-emerald-500">
          {s.highest_roi_action ? (
            <div className="space-y-1">
              <p className="font-medium text-xs">{s.highest_roi_action.title}</p>
              <p className="text-xs text-muted-foreground">{s.highest_roi_action.recommended_fix}</p>
              <Badge variant="secondary" className="text-xs">ROI: {s.highest_roi_action.estimated_roi_score}/100</Badge>
            </div>
          ) : (
            <p className="text-muted-foreground text-xs">No queued improvements.</p>
          )}
        </CompassCard>

        <CompassCard icon={AlertTriangle} title="Highest Risk" color="text-red-500">
          {s.highest_risk?.items?.length > 0 ? (
            <div className="space-y-1.5">
              {s.highest_risk.items.map((r, i) => (
                <p key={i} className="text-xs flex items-center gap-1.5"><AlertTriangle className="w-3 h-3 text-red-400 flex-shrink-0" /> {r}</p>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-xs">No critical risks detected.</p>
          )}
        </CompassCard>

        <CompassCard icon={TrendingUp} title="Recommended Sprint" color="text-blue-500"
          action={<Link to="/sprint-board" className="text-xs text-primary hover:underline">Board →</Link>}>
          {s.recommended_sprint ? (
            <div className="space-y-1">
              <p className="font-medium text-xs">{s.recommended_sprint.name || s.recommended_sprint.title || 'Active sprint'}</p>
              <p className="text-xs text-muted-foreground">{s.recommended_sprint.goal || s.recommended_sprint.description || ''}</p>
            </div>
          ) : (
            <p className="text-muted-foreground text-xs">No active sprint.</p>
          )}
        </CompassCard>

        <CompassCard icon={Briefcase} title="Business Opportunities" color="text-rose-500"
          action={<Link to="/crm-pipeline" className="text-xs text-primary hover:underline">Pipeline →</Link>}>
          {s.business_opportunities?.length > 0 ? (
            <div className="space-y-1.5">
              {s.business_opportunities.slice(0, 4).map((o, i) => (
                <p key={i} className="text-xs truncate">{o.name || o.title || o.description || 'Opportunity'}</p>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-xs">No open opportunities.</p>
          )}
        </CompassCard>
      </div>
    </div>
  );
}