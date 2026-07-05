import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, FileText, Clock, Sparkles, Loader2, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import moment from "moment";

export default function RoadmapTimeline({ data }) {
  if (!data) return null;
  const { releases, milestones, roadmap } = data;

  const timelineItems = [
    ...releases.map(r => ({ ...r, type: "release", date: r.planned_date || r.released_date, title: `v${r.version} — ${r.name || r.type}`, status: r.status })),
    ...milestones.map(m => ({ ...m, type: "milestone", date: m.target_date || m.planned_date, title: m.title, status: m.status })),
  ].sort((a, b) => {
    const da = a.date || "9999";
    const db = b.date || "9999";
    return da.localeCompare(db);
  }).slice(0, 12);

  const STATUS_COLORS = {
    planned: "bg-slate-100 text-slate-600", in_progress: "bg-blue-100 text-blue-700",
    staged: "bg-amber-100 text-amber-700", released: "bg-emerald-100 text-emerald-700",
    completed: "bg-emerald-100 text-emerald-700", shipped: "bg-emerald-100 text-emerald-700",
    active: "bg-blue-100 text-blue-700", on_hold: "bg-amber-100 text-amber-700",
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold flex items-center gap-2"><Calendar className="w-4 h-4 text-amber-500" />Executive Timeline</h3>
      <Card className="p-5 border border-border/60">
        {timelineItems.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">No timeline items</p>
        ) : (
          <div className="relative">
            <div className="absolute left-2 top-0 bottom-0 w-px bg-border" />
            <div className="space-y-3">
              {timelineItems.map((item, i) => (
                <div key={i} className="relative pl-8">
                  <div className={`absolute left-1.5 top-1 w-3 h-3 rounded-full border-2 border-background ${item.status === "released" || item.status === "completed" || item.status === "shipped" ? "bg-emerald-500" : item.status === "in_progress" || item.status === "active" ? "bg-blue-500" : item.status === "staged" ? "bg-amber-500" : "bg-slate-400"}`} />
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold">{item.title}</p>
                      <p className="text-[10px] text-muted-foreground">{item.type === "release" ? "Release" : "Milestone"} {item.date ? `· ${item.date}` : ""}</p>
                    </div>
                    <Badge className={`text-[9px] ${STATUS_COLORS[item.status] || STATUS_COLORS.planned}`}>{item.status?.replace(/_/g, " ")}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}