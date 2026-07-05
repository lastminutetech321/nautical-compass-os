import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, GraduationCap, Sparkles, BookOpen, TrendingUp, Users, Award, AlertTriangle, CheckCircle2, Zap, Brain, Trash2 } from "lucide-react";
import moment from "moment";
import LessonCard from "@/components/academy/LessonCard";

const CATEGORIES = ["all", "engineering", "architecture", "security", "ux", "database", "performance", "prompt", "testing", "documentation"];

export default function EngineeringAcademy() {
  const [lessons, setLessons] = useState([]);
  const [agents, setAgents] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [report, setReport] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [agentProgress, setAgentProgress] = useState([]);
  const [assignDialog, setAssignDialog] = useState(null);
  const [genResult, setGenResult] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [lessonRes, reportRes, agentRes, sprintRes] = await Promise.all([
        base44.functions.invoke('engineeringAcademy', { operation: 'get_lessons', params: { category: 'all' } }),
        base44.functions.invoke('engineeringAcademy', { operation: 'maturity_report', params: {} }).catch(() => ({ data: { report: null } })),
        base44.entities.AgentProfile.list('-created_date', 100).catch(() => []),
        base44.entities.Sprint.list('-created_date', 50).catch(() => []),
      ]);
      setLessons(lessonRes.data?.lessons || []);
      setReport(reportRes.data?.report);
      setAgents(agentRes || []);
      setSprints(sprintRes || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filteredLessons = categoryFilter === 'all' ? lessons : lessons.filter(l => l.category === categoryFilter);

  const generateFromSprint = async (sprintId) => {
    setGenerating(true);
    setGenResult(null);
    try {
      const res = await base44.functions.invoke('engineeringAcademy', {
        operation: 'generate_lessons',
        params: { sprint_id: sprintId }
      });
      setGenResult(res.data);
      await load();
    } catch (e) { console.error(e); setGenResult({ error: e.message }); }
    setGenerating(false);
  };

  const loadAgentProgress = async (agentId) => {
    setSelectedAgent(agentId);
    try {
      const res = await base44.functions.invoke('engineeringAcademy', { operation: 'get_agent_progress', params: { agent_id: agentId } });
      setAgentProgress(res.data?.learning || []);
    } catch (e) { setAgentProgress([]); }
  };

  const assignLesson = async (agentId, lesson) => {
    const agent = agents.find(a => a.id === agentId);
    try {
      await base44.functions.invoke('engineeringAcademy', {
        operation: 'assign_to_agent',
        params: { agent_id: agentId, agent_name: agent?.name, lesson_id: lesson.id, agent_type: agent?.agent_type }
      });
      setAssignDialog(null);
      if (selectedAgent === agentId) await loadAgentProgress(agentId);
    } catch (e) { console.error(e); }
  };

  const updateProgress = async (learningId, status, extra) => {
    try {
      await base44.functions.invoke('engineeringAcademy', {
        operation: 'mark_learned',
        params: { learning_id: learningId, status, ...extra }
      });
      if (selectedAgent) await loadAgentProgress(selectedAgent);
      await load();
    } catch (e) { console.error(e); }
  };

  const deleteLesson = async (lessonId) => {
    try {
      await base44.functions.invoke('engineeringAcademy', { operation: 'delete_lesson', params: { lesson_id: lessonId } });
      await load();
    } catch (e) { console.error(e); }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-32"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">NCOS · Engineering Academy</p>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <GraduationCap className="w-6 h-6 text-primary" />Engineering Academy
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Every completed sprint becomes a lesson · AI employees continuously improve from previous projects</p>
      </div>

      {/* Maturity Dashboard */}
      {report && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <Card className="p-3 border border-primary/30 bg-primary/5">
              <Award className="w-4 h-4 text-primary mb-1" />
              <p className="text-2xl font-bold text-primary">{report.maturity_score}<span className="text-sm text-muted-foreground">/100</span></p>
              <p className="text-[10px] text-muted-foreground">Engineering Maturity</p>
            </Card>
            <Card className="p-3 border border-border/60"><BookOpen className="w-4 h-4 text-blue-600 mb-1" /><p className="text-lg font-bold">{report.total_lessons}</p><p className="text-[10px] text-muted-foreground">Total Lessons</p></Card>
            <Card className="p-3 border border-border/60"><Users className="w-4 h-4 text-violet-600 mb-1" /><p className="text-lg font-bold">{report.agents_learning}/{report.total_agents}</p><p className="text-[10px] text-muted-foreground">Agents Learning</p></Card>
            <Card className="p-3 border border-border/60"><CheckCircle2 className="w-4 h-4 text-emerald-600 mb-1" /><p className="text-lg font-bold">{report.mastered_count}</p><p className="text-[10px] text-muted-foreground">Lessons Mastered</p></Card>
            <Card className="p-3 border border-border/60"><AlertTriangle className="w-4 h-4 text-orange-600 mb-1" /><p className="text-lg font-bold">{report.total_mistakes_avoided}</p><p className="text-[10px] text-muted-foreground">Mistakes Avoided</p></Card>
            <Card className="p-3 border border-border/60"><TrendingUp className="w-4 h-4 text-cyan-600 mb-1" /><p className="text-lg font-bold">{report.avg_mastery}%</p><p className="text-[10px] text-muted-foreground">Avg Mastery</p></Card>
          </div>

          {/* Category Coverage */}
          <Card className="p-4 border border-border/60">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Lesson Coverage by Category ({report.category_coverage_pct}% covered)</p>
            <div className="grid grid-cols-3 md:grid-cols-9 gap-2">
              {CATEGORIES.slice(1).map(cat => {
                const count = report.by_category?.[cat] || 0;
                return (
                  <div key={cat} className={`p-2 rounded-lg text-center border ${count > 0 ? "border-primary/30 bg-primary/5" : "border-dashed border-border/40"}`}>
                    <p className="text-[9px] text-muted-foreground capitalize mb-0.5">{cat}</p>
                    <p className={`text-sm font-bold ${count > 0 ? "text-primary" : "text-muted-foreground"}`}>{count}</p>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* Generate from Sprint */}
      <Card className="p-4 border border-primary/30 bg-primary/5">
        <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-2 flex items-center gap-1"><Sparkles className="w-3.5 h-3.5" />Generate Lessons from Completed Sprint</p>
        <div className="flex items-center gap-2 flex-wrap">
          <Select onValueChange={(v) => generateFromSprint(v === 'latest' ? null : v)}>
            <SelectTrigger className="w-[300px] h-8 text-xs"><SelectValue placeholder="Select sprint to analyze..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="latest" className="text-xs">Most Recent Sprint</SelectItem>
              {sprints.map(s => <SelectItem key={s.id} value={s.id} className="text-xs">{s.name || s.title}</SelectItem>)}
            </SelectContent>
          </Select>
          {generating && <div className="flex items-center gap-1 text-xs text-primary"><Loader2 className="w-3 h-3 animate-spin" />Generating lessons via AI...</div>}
        </div>
        {genResult && !genResult.error && (
          <div className="mt-2 p-2 rounded bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200">
            <p className="text-xs text-emerald-600"><CheckCircle2 className="w-3 h-3 inline mr-1" />Generated {genResult.lessons?.length || 0} lessons from "{genResult.sprint_name}"</p>
          </div>
        )}
      </Card>

      {/* Tabs: Lessons Library | Agent Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Lessons Library */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" />Lessons Library ({filteredLessons.length})</p>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[140px] h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => <SelectItem key={c} value={c} className="text-xs capitalize">{c === 'all' ? 'All Categories' : c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredLessons.length === 0 ? (
              <Card className="p-6 text-center col-span-2 border border-dashed border-border/40">
                <BookOpen className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No lessons yet. Generate lessons from a completed sprint above.</p>
              </Card>
            ) : (
              filteredLessons.map(lesson => (
                <div key={lesson.id} className="relative group">
                  <LessonCard lesson={lesson} onAssign={(l) => setAssignDialog(l)} />
                  <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => deleteLesson(lesson.id)}>
                    <Trash2 className="w-3 h-3 text-muted-foreground" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Agent Progress */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1"><Brain className="w-3.5 h-3.5" />Agent Learning Progress</p>
          <Select value={selectedAgent || ''} onValueChange={loadAgentProgress}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select an AI employee..." /></SelectTrigger>
            <SelectContent>
              {agents.map(a => <SelectItem key={a.id} value={a.id} className="text-xs">{a.name} ({a.agent_type})</SelectItem>)}
            </SelectContent>
          </Select>

          {!selectedAgent && (
            <Card className="p-4 text-center border border-dashed border-border/40">
              <Users className="w-6 h-6 text-muted-foreground mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">Select an AI employee to track their learning progress</p>
            </Card>
          )}

          {selectedAgent && (
            <div className="space-y-2">
              {agentProgress.length === 0 ? (
                <Card className="p-4 text-center border border-dashed border-border/40">
                  <p className="text-xs text-muted-foreground">No lessons assigned yet</p>
                </Card>
              ) : (
                agentProgress.map(al => (
                  <Card key={al.id} className="p-2 border border-border/60">
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <p className="text-xs font-semibold leading-tight">{al.lesson_title}</p>
                      <Badge variant="outline" className={`text-[8px] capitalize flex-shrink-0 ${al.status === 'mastered' ? 'text-emerald-600' : al.status === 'applied' ? 'text-blue-600' : al.status === 'learning' ? 'text-amber-600' : 'text-muted-foreground'}`}>{al.status}</Badge>
                    </div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full ${al.mastery_level >= 100 ? 'bg-emerald-500' : al.mastery_level >= 50 ? 'bg-blue-500' : 'bg-amber-500'}`} style={{ width: `${al.mastery_level}%` }} />
                      </div>
                      <span className="text-[9px] text-muted-foreground">{al.mastery_level}%</span>
                    </div>
                    <div className="flex items-center gap-2 text-[9px] text-muted-foreground mb-1.5">
                      <span className="flex items-center gap-0.5"><Zap className="w-2.5 h-2.5" />Applied: {al.applied_count || 0}</span>
                      <span className="flex items-center gap-0.5"><AlertTriangle className="w-2.5 h-2.5" />Avoided: {al.mistakes_avoided_count || 0}</span>
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      {al.status === 'assigned' && <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => updateProgress(al.id, 'learning', { mastery_level: 25 })}>Start Learning</Button>}
                      {al.status === 'learning' && <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => updateProgress(al.id, 'applied', { mastery_level: 75 })}>Mark Applied</Button>}
                      {al.status === 'applied' && <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => updateProgress(al.id, 'mastered')}>Master</Button>}
                      <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2 text-orange-600" onClick={() => updateProgress(al.id, al.status, { mistakes_avoided: 1 })}>+ Mistake Avoided</Button>
                      <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2 text-blue-600" onClick={() => updateProgress(al.id, al.status, { applied: 1 })}>+ Applied</Button>
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Agent Breakdown in Maturity */}
      {report?.agent_breakdown && Object.keys(report.agent_breakdown).length > 0 && (
        <Card className="p-4 border border-border/60">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1"><Users className="w-3.5 h-3.5" />Workforce Learning Breakdown</p>
          <div className="space-y-1">
            {Object.entries(report.agent_breakdown).slice(0, 10).map(([name, data]) => (
              <div key={name} className="flex items-center justify-between text-xs p-1.5 rounded bg-muted/30">
                <span className="font-medium">{name}</span>
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                  <span>{data.total} assigned</span>
                  <span className="text-emerald-600">{data.mastered} mastered</span>
                  <span className="text-orange-600">{data.mistakes_avoided} avoided</span>
                  <span className="font-semibold">{data.avg_mastery}%</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Assign Dialog */}
      <Dialog open={!!assignDialog} onOpenChange={() => setAssignDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Users className="w-5 h-5 text-primary" />Assign Lesson to Agent</DialogTitle></DialogHeader>
          {assignDialog && <p className="text-xs text-muted-foreground mb-2">"{assignDialog.title}"</p>}
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {agents.map(a => (
              <Button key={a.id} variant="outline" className="w-full justify-start text-xs h-8" onClick={() => assignLesson(a.id, assignDialog)}>
                {a.name} <Badge variant="outline" className="text-[8px] ml-auto">{a.agent_type}</Badge>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}