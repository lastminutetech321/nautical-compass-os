import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Database, BookMarked, ScrollText, FileText, Bug, Lightbulb, Clock, TrendingUp, ArrowRight } from "lucide-react";
import moment from "moment";

// Compact Development Memory panel for embedding in Executive Command / Mission Control
export default function DevMemoryPanel({ compact = false }) {
  const [overview, setOverview] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await base44.functions.invoke('generateBlueprint', { operation: 'overview', params: {} });
        setOverview(res.data?.overview);
      } catch (e) {
        const [journals, adrs, prompts, bugs, lessons] = await Promise.all([
          base44.entities.EngineeringJournal.list('-created_date', 500).catch(() => []),
          base44.entities.ADR.list('-created_date', 100).catch(() => []),
          base44.entities.PromptLibrary.list('-created_date', 200).catch(() => []),
          base44.entities.BugKnowledgeBase.list('-created_date', 200).catch(() => []),
          base44.entities.LessonLearned.list('-created_date', 200).catch(() => []),
        ]);
        setOverview({
          total_journal_entries: journals.length, total_adrs: adrs.length,
          total_prompts: prompts.length, total_bugs: bugs.length, total_lessons: lessons.length,
          total_time_invested_hours: journals.reduce((s, j) => s + (j.time_required_hours || 0), 0),
          total_readiness_increase: journals.reduce((s, j) => s + (j.readiness_increase || 0), 0),
          applied_lessons: lessons.filter(l => l.applied_to_future).length,
          open_bugs: bugs.filter(b => b.status === 'open').length,
        });
      }
    };
    load();
  }, []);

  if (!overview) return null;

  return (
    <Card className="p-4 border border-blue-200 bg-blue-50/50 dark:bg-blue-950/10">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold uppercase flex items-center gap-1.5"><Database className="w-3.5 h-3.5 text-blue-600" />Development Memory</p>
        <Button asChild size="sm" variant="outline" className="h-7 text-[10px]">
          <Link to="/nc-dev-memory">Open NCDM <ArrowRight className="w-3 h-3 ml-1" /></Link>
        </Button>
      </div>
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        <div className="text-center p-1.5 rounded bg-white/60 dark:bg-card/40">
          <BookMarked className="w-3 h-3 mx-auto text-blue-600" />
          <p className="text-base font-bold">{overview.total_journal_entries}</p>
          <p className="text-[8px] text-muted-foreground">Journal</p>
        </div>
        <div className="text-center p-1.5 rounded bg-white/60 dark:bg-card/40">
          <ScrollText className="w-3 h-3 mx-auto text-violet-600" />
          <p className="text-base font-bold">{overview.total_adrs}</p>
          <p className="text-[8px] text-muted-foreground">ADRs</p>
        </div>
        <div className="text-center p-1.5 rounded bg-white/60 dark:bg-card/40">
          <FileText className="w-3 h-3 mx-auto text-amber-600" />
          <p className="text-base font-bold">{overview.total_prompts}</p>
          <p className="text-[8px] text-muted-foreground">Prompts</p>
        </div>
        <div className="text-center p-1.5 rounded bg-white/60 dark:bg-card/40">
          <Bug className="w-3 h-3 mx-auto text-red-600" />
          <p className="text-base font-bold">{overview.total_bugs}</p>
          <p className="text-[8px] text-muted-foreground">Bugs</p>
        </div>
        <div className="text-center p-1.5 rounded bg-white/60 dark:bg-card/40">
          <Lightbulb className="w-3 h-3 mx-auto text-emerald-600" />
          <p className="text-base font-bold">{overview.total_lessons}</p>
          <p className="text-[8px] text-muted-foreground">Lessons</p>
        </div>
        <div className="text-center p-1.5 rounded bg-white/60 dark:bg-card/40">
          <Clock className="w-3 h-3 mx-auto text-cyan-600" />
          <p className="text-base font-bold">{Math.round(overview.total_time_invested_hours || 0)}h</p>
          <p className="text-[8px] text-muted-foreground">Invested</p>
        </div>
      </div>
      {!compact && (
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/40 text-[10px]">
          <span className="flex items-center gap-1 text-emerald-600"><TrendingUp className="w-3 h-3" />+{overview.total_readiness_increase || 0}% readiness gained</span>
          <span className="text-muted-foreground">{overview.applied_lessons || 0} lessons applied to future</span>
        </div>
      )}
    </Card>
  );
}