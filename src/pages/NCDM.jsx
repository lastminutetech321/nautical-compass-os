import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { BookMarked, FileText, Bug, Lightbulb, Wand2, ScrollText, Database, Clock, TrendingUp, CheckCircle, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EngineeringJournalPanel from "@/components/devmemory/EngineeringJournalPanel";
import ADRPanel from "@/components/devmemory/ADRPanel";
import PromptLibraryPanel from "@/components/devmemory/PromptLibraryPanel";
import BugKnowledgePanel from "@/components/devmemory/BugKnowledgePanel";
import LessonsPanel from "@/components/devmemory/LessonsPanel";
import BlueprintGenerator from "@/components/devmemory/BlueprintGenerator";

export default function NCDM() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchOverview = async () => {
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
        total_journal_entries: journals.length, total_adrs: adrs.length, accepted_adrs: adrs.filter(a => a.status === 'accepted').length,
        total_prompts: prompts.length, reusable_prompts: prompts.filter(p => p.reusable).length,
        avg_prompt_score: prompts.length > 0 ? Math.round(prompts.reduce((s, p) => s + (p.success_score || 0), 0) / prompts.length) : 0,
        total_bugs: bugs.length, open_bugs: bugs.filter(b => b.status === 'open' || b.status === 'investigating').length,
        critical_bugs: bugs.filter(b => b.severity === 'critical').length,
        total_lessons: lessons.length, applied_lessons: lessons.filter(l => l.applied_to_future).length,
        total_time_invested_hours: journals.reduce((s, j) => s + (j.time_required_hours || 0), 0),
        total_readiness_increase: journals.reduce((s, j) => s + (j.readiness_increase || 0), 0),
        sprints_tracked: [...new Set(journals.map(j => j.sprint).filter(Boolean))].length,
      });
    }
    setLoading(false);
  };

  useEffect(() => { fetchOverview(); }, [refreshKey]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">NCOS · Permanent Engineering Knowledge</p>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Database className="w-6 h-6 text-primary" />NC Development Memory
          </h1>
          <p className="text-muted-foreground text-sm">Every project makes the next project faster, better, and cheaper · NCOS remembers every engineering decision forever</p>
        </div>
        <Button onClick={() => setRefreshKey(k => k + 1)} variant="outline" size="sm"><RefreshCw className="w-4 h-4 mr-1.5" />Refresh</Button>
      </div>

      {/* Overview Stats */}
      {loading ? (
        <div className="flex items-center justify-center h-32"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : overview ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <Card className="p-3 border border-blue-200 bg-blue-50 dark:bg-blue-950/20">
            <BookMarked className="w-4 h-4 text-blue-600 mb-1" />
            <p className="text-2xl font-bold">{overview.total_journal_entries}</p>
            <p className="text-[10px] text-muted-foreground">Journal Entries</p>
          </Card>
          <Card className="p-3 border border-violet-200 bg-violet-50 dark:bg-violet-950/20">
            <ScrollText className="w-4 h-4 text-violet-600 mb-1" />
            <p className="text-2xl font-bold">{overview.total_adrs}</p>
            <p className="text-[10px] text-muted-foreground">Architecture Decisions</p>
          </Card>
          <Card className="p-3 border border-amber-200 bg-amber-50 dark:bg-amber-950/20">
            <FileText className="w-4 h-4 text-amber-600 mb-1" />
            <p className="text-2xl font-bold">{overview.total_prompts}</p>
            <p className="text-[10px] text-muted-foreground">Prompts Library</p>
          </Card>
          <Card className="p-3 border border-red-200 bg-red-50 dark:bg-red-950/20">
            <Bug className="w-4 h-4 text-red-600 mb-1" />
            <p className="text-2xl font-bold">{overview.total_bugs}</p>
            <p className="text-[10px] text-muted-foreground">Bug Knowledge</p>
          </Card>
          <Card className="p-3 border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20">
            <Lightbulb className="w-4 h-4 text-emerald-600 mb-1" />
            <p className="text-2xl font-bold">{overview.total_lessons}</p>
            <p className="text-[10px] text-muted-foreground">Lessons Learned</p>
          </Card>
          <Card className="p-3 border border-cyan-200 bg-cyan-50 dark:bg-cyan-950/20">
            <Clock className="w-4 h-4 text-cyan-600 mb-1" />
            <p className="text-2xl font-bold">{Math.round(overview.total_time_invested_hours || 0)}h</p>
            <p className="text-[10px] text-muted-foreground">Time Invested</p>
          </Card>
        </div>
      ) : null}

      {/* Secondary Stats */}
      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-3"><div className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-600" /><div><p className="text-sm font-bold">+{overview.total_readiness_increase || 0}</p><p className="text-[9px] text-muted-foreground">Readiness Increase</p></div></div></Card>
          <Card className="p-3"><div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-violet-600" /><div><p className="text-sm font-bold">{overview.accepted_adrs || 0}</p><p className="text-[9px] text-muted-foreground">Accepted ADRs</p></div></div></Card>
          <Card className="p-3"><div className="flex items-center gap-2"><FileText className="w-4 h-4 text-amber-600" /><div><p className="text-sm font-bold">{overview.avg_prompt_score || 0}/100</p><p className="text-[9px] text-muted-foreground">Avg Prompt Score</p></div></div></Card>
          <Card className="p-3"><div className="flex items-center gap-2"><Lightbulb className="w-4 h-4 text-emerald-600" /><div><p className="text-sm font-bold">{overview.applied_lessons || 0}/{overview.total_lessons || 0}</p><p className="text-[9px] text-muted-foreground">Lessons Applied</p></div></div></Card>
        </div>
      )}

      {/* Main Tabs */}
      <Tabs defaultValue="journal">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="journal"><BookMarked className="w-3.5 h-3.5 mr-1" />Journal</TabsTrigger>
          <TabsTrigger value="adr"><ScrollText className="w-3.5 h-3.5 mr-1" />ADRs</TabsTrigger>
          <TabsTrigger value="prompts"><FileText className="w-3.5 h-3.5 mr-1" />Prompts</TabsTrigger>
          <TabsTrigger value="bugs"><Bug className="w-3.5 h-3.5 mr-1" />Bugs</TabsTrigger>
          <TabsTrigger value="lessons"><Lightbulb className="w-3.5 h-3.5 mr-1" />Lessons</TabsTrigger>
          <TabsTrigger value="blueprint"><Wand2 className="w-3.5 h-3.5 mr-1" />Blueprint</TabsTrigger>
        </TabsList>
        <TabsContent value="journal" className="mt-4"><EngineeringJournalPanel refreshKey={refreshKey} /></TabsContent>
        <TabsContent value="adr" className="mt-4"><ADRPanel refreshKey={refreshKey} /></TabsContent>
        <TabsContent value="prompts" className="mt-4"><PromptLibraryPanel refreshKey={refreshKey} /></TabsContent>
        <TabsContent value="bugs" className="mt-4"><BugKnowledgePanel refreshKey={refreshKey} /></TabsContent>
        <TabsContent value="lessons" className="mt-4"><LessonsPanel refreshKey={refreshKey} /></TabsContent>
        <TabsContent value="blueprint" className="mt-4"><BlueprintGenerator /></TabsContent>
      </Tabs>
    </div>
  );
}