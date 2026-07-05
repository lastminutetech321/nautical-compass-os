import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { CSUITE_AGENTS } from "@/data/csuiteAgents";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Bot, Search, Users, Activity, Target, Shield, AlertTriangle, Loader2, CheckCircle, ArrowUpRight } from "lucide-react";

const PRIORITY_COLORS = { high: "bg-red-100 text-red-700", medium: "bg-amber-100 text-amber-700", low: "bg-slate-100 text-slate-600" };

export default function ExecutiveAIWorkforce() {
  const [deployed, setDeployed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [deploying, setDeploying] = useState(false);
  const [taskInput, setTaskInput] = useState("");
  const [dispatching, setDispatching] = useState(false);
  const [taskResult, setTaskResult] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    base44.entities.AgentProfile.filter({ agent_type: "c_suite" }, "-created_date", 50)
      .then(data => {
        setDeployed(data);
        // Merge deployed data with static definitions
        const merged = CSUITE_AGENTS.map(staticAgent => {
          const dbAgent = data.find(d => d.c_suite_title === staticAgent.c_suite_title);
          return dbAgent ? { ...staticAgent, ...dbAgent, dbId: dbAgent.id, status: dbAgent.status, performance_score: dbAgent.performance_score || 0, tasks_completed: dbAgent.tasks_completed || 0 } : staticAgent;
        });
        setDeployed(merged);
      })
      .finally(() => setLoading(false));
  }, []);

  const deployAll = async () => {
    setDeploying(true);
    const existing = await base44.entities.AgentProfile.filter({ agent_type: "c_suite" }, "-created_date", 50);
    const existingTitles = new Set(existing.map(a => a.c_suite_title));
    const toCreate = CSUITE_AGENTS.filter(a => !existingTitles.has(a.c_suite_title));
    if (toCreate.length > 0) {
      await base44.entities.AgentProfile.bulkCreate(toCreate.map(a => ({
        name: a.name,
        purpose: a.purpose,
        department: a.department,
        agent_type: "c_suite",
        c_suite_title: a.c_suite_title,
        avatar_color: a.avatar_color,
        status: "active",
        responsibilities: a.responsibilities,
        authority_limits: a.authority_limits,
        kpis: a.kpis,
        performance_score: 0,
        task_queue: a.task_queue,
        knowledge_domain: a.knowledge_domain,
        dependencies: a.dependencies,
        reports_to: a.reports_to,
        escalation_path: a.escalation_path,
        executive_reporting: a.executive_reporting,
        skills: a.dependencies,
        connected_modules: a.dependencies,
        tasks_completed: 0,
        tasks_failed: 0,
      })));
      const updated = await base44.entities.AgentProfile.filter({ agent_type: "c_suite" }, "-created_date", 50);
      const merged = CSUITE_AGENTS.map(staticAgent => {
        const dbAgent = updated.find(d => d.c_suite_title === staticAgent.c_suite_title);
        return dbAgent ? { ...staticAgent, ...dbAgent, dbId: dbAgent.id, status: dbAgent.status, performance_score: dbAgent.performance_score || 0, tasks_completed: dbAgent.tasks_completed || 0 } : staticAgent;
      });
      setDeployed(merged);
    }
    setDeploying(false);
  };

  const openDetail = (agent) => {
    setSelected(agent);
    setDetailOpen(true);
    setTaskResult(null);
  };

  const dispatchTask = async () => {
    if (!taskInput.trim() || !selected?.dbId) return;
    setDispatching(true);
    setTaskResult(null);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are ${selected.name}, the ${selected.c_suite_title} of Nautical Compass OS (NCOS).

Your role: ${selected.purpose}
Your department: ${selected.department}
Your knowledge domain: ${selected.knowledge_domain}
Your authority limits: ${selected.authority_limits}
Your responsibilities: ${(selected.responsibilities || []).join("; ")}

TASK ASSIGNED: ${taskInput}

Respond as this C-suite AI employee would — executive-level, strategic, thorough, and in-character. If this involves legal matters, note that output is informational only and not legal advice. Never fabricate legal citations.`
    });
    const logEntry = { task: taskInput, response_preview: result.slice(0, 150), at: new Date().toISOString() };
    const updatedLog = [...(selected.activity_log || []), logEntry];
    const tasksCompleted = (selected.tasks_completed || 0) + 1;
    await base44.entities.AgentProfile.update(selected.dbId, {
      activity_log: updatedLog, status: "active",
      tasks_completed: tasksCompleted, last_active: new Date().toISOString()
    });
    setSelected({ ...selected, activity_log: updatedLog, status: "active", tasks_completed: tasksCompleted });
    setDeployed(prev => prev.map(a => a.c_suite_title === selected.c_suite_title ? { ...a, status: "active", tasks_completed: tasksCompleted } : a));
    setTaskResult(result);
    setTaskInput("");
    setDispatching(false);
  };

  const filtered = deployed.filter(a => {
    if (search && !`${a.name} ${a.c_suite_title} ${a.department} ${a.purpose}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalDeployed = deployed.filter(a => a.dbId).length;
  const avgPerf = deployed.filter(a => a.dbId).reduce((s, a) => s + (a.performance_score || 0), 0) / (totalDeployed || 1);
  const activeCount = deployed.filter(a => a.status === "active").length;
  const totalTasks = deployed.reduce((s, a) => s + (a.tasks_completed || 0), 0);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">NCOS · AI Workforce</p>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Bot className="w-6 h-6 text-violet-500" />Executive AI Workforce</h1>
          <p className="text-sm text-muted-foreground mt-1">{CSUITE_AGENTS.length} C-suite AI employees · {totalDeployed} deployed · {activeCount} active</p>
        </div>
        {totalDeployed < CSUITE_AGENTS.length && (
          <Button onClick={deployAll} disabled={deploying} className="bg-violet-600 hover:bg-violet-700 text-white">
            {deploying ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Deploying…</> : <><Users className="w-4 h-4 mr-1.5" />Deploy All {CSUITE_AGENTS.length} Executives</>}
          </Button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "C-Suite Roles", value: CSUITE_AGENTS.length, icon: Users, color: "text-violet-500" },
          { label: "Deployed", value: totalDeployed, icon: CheckCircle, color: "text-emerald-500" },
          { label: "Active", value: activeCount, icon: Activity, color: "text-blue-500" },
          { label: "Avg Performance", value: `${avgPerf.toFixed(0)}%`, icon: Target, color: "text-amber-500" },
        ].map(k => (
          <Card key={k.label} className="p-3 border border-border/60 flex items-center gap-3">
            <k.icon className={`w-5 h-5 ${k.color}`} />
            <div><p className="text-xl font-bold">{loading ? "—" : k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search executives by name, title, or department…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Executive Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map(agent => (
          <Card key={agent.c_suite_title} className="p-4 hover:border-violet-400 transition-all cursor-pointer" onClick={() => openDetail(agent)}>
            <div className="flex items-start gap-3 mb-2">
              <div className="w-11 h-11 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{ background: agent.avatar_color }}>
                {agent.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm">{agent.name}</p>
                <p className="text-xs text-muted-foreground">{agent.c_suite_title}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <Badge variant="outline" className="text-[9px]">{agent.department}</Badge>
                  {agent.dbId ? (
                    <Badge className={`text-[9px] ${agent.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{agent.status || "active"}</Badge>
                  ) : (
                    <Badge className="text-[9px] bg-amber-100 text-amber-700">Not Deployed</Badge>
                  )}
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{agent.purpose}</p>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><Target className="w-3 h-3" />{agent.kpis?.length || 0} KPIs</span>
              <span className="flex items-center gap-1"><Shield className="w-3 h-3" />{agent.dependencies?.length || 0} deps</span>
              {agent.dbId && <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-emerald-500" />{agent.tasks_completed || 0} tasks</span>}
            </div>
            {(agent.performance_score || 0) > 0 && (
              <div className="mt-2"><Progress value={agent.performance_score} className="h-1" /><p className="text-[9px] text-muted-foreground mt-0.5">Performance: {agent.performance_score}%</p></div>
            )}
          </Card>
        ))}
      </div>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <div className="flex items-start gap-3">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold flex-shrink-0" style={{ background: selected.avatar_color }}>
                    {selected.name.charAt(0)}
                  </div>
                  <div>
                    <DialogTitle className="text-lg">{selected.name} — {selected.c_suite_title}</DialogTitle>
                    <p className="text-sm text-muted-foreground mt-0.5">{selected.purpose}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge variant="outline" className="text-[10px]">{selected.department}</Badge>
                      <Badge variant="outline" className="text-[10px]">Reports to: {selected.reports_to}</Badge>
                      {selected.dbId && <Badge className="text-[10px] bg-emerald-100 text-emerald-700">{selected.tasks_completed || 0} tasks completed</Badge>}
                    </div>
                  </div>
                </div>
              </DialogHeader>

              <Tabs defaultValue="overview">
                <TabsList className="flex-wrap h-auto">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="kpis">KPIs</TabsTrigger>
                  <TabsTrigger value="tasks">Task Queue</TabsTrigger>
                  <TabsTrigger value="dispatch">Dispatch</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4 mt-4">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2">RESPONSIBILITIES</p>
                    <ul className="space-y-1">{(selected.responsibilities || []).map((r, i) => <li key={i} className="text-xs flex items-start gap-2"><CheckCircle className="w-3 h-3 mt-0.5 text-emerald-500 flex-shrink-0" />{r}</li>)}</ul>
                  </div>
                  <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200">
                    <p className="text-xs font-bold text-red-700 mb-1">AUTHORITY LIMITS</p>
                    <p className="text-xs text-red-800">{selected.authority_limits}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><p className="text-xs font-semibold text-muted-foreground mb-1">KNOWLEDGE DOMAIN</p><p className="text-xs bg-muted p-2 rounded">{selected.knowledge_domain}</p></div>
                    <div><p className="text-xs font-semibold text-muted-foreground mb-1">REPORTS TO</p><p className="text-xs bg-muted p-2 rounded">{selected.reports_to}</p></div>
                  </div>
                  <div><p className="text-xs font-semibold text-muted-foreground mb-1">DEPENDENCIES</p><div className="flex flex-wrap gap-1">{(selected.dependencies || []).map(d => <Badge key={d} variant="outline" className="text-[10px]">{d}</Badge>)}</div></div>
                  <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200">
                    <p className="text-xs font-bold text-amber-700 mb-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />ESCALATION PATH</p>
                    <p className="text-xs text-amber-800">{selected.escalation_path}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200">
                    <p className="text-xs font-bold text-blue-700 mb-1 flex items-center gap-1"><ArrowUpRight className="w-3 h-3" />EXECUTIVE REPORTING</p>
                    <p className="text-xs text-blue-800">{selected.executive_reporting}</p>
                  </div>
                </TabsContent>

                <TabsContent value="kpis" className="mt-4">
                  <div className="space-y-2">
                    {(selected.kpis || []).map((kpi, i) => (
                      <Card key={i} className="p-3 flex items-center justify-between">
                        <div><p className="text-sm font-medium">{kpi.name}</p><p className="text-xs text-muted-foreground">{kpi.target}</p></div>
                        <Target className="w-4 h-4 text-amber-500" />
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="tasks" className="mt-4">
                  <div className="space-y-2">
                    {(selected.task_queue || []).map((t, i) => (
                      <Card key={i} className="p-3 flex items-center justify-between">
                        <p className="text-sm font-medium">{t.title}</p>
                        <Badge className={`text-[10px] ${PRIORITY_COLORS[t.priority] || ""}`}>{t.priority}</Badge>
                      </Card>
                    ))}
                    {selected.dbId && (selected.activity_log || []).length > 0 && (
                      <div className="mt-4">
                        <p className="text-xs font-semibold text-muted-foreground mb-2">RECENT ACTIVITY</p>
                        <div className="space-y-1 max-h-40 overflow-y-auto">
                          {[...(selected.activity_log || [])].reverse().slice(0, 5).map((entry, i) => (
                            <div key={i} className="p-2 bg-muted rounded text-xs"><p className="font-medium truncate">{entry.task}</p><p className="text-muted-foreground truncate">{entry.response_preview}…</p></div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="dispatch" className="space-y-3 mt-4">
                  {selected.dbId ? (
                    <>
                      <Input value={taskInput} onChange={e => setTaskInput(e.target.value)} placeholder={`Assign a task to ${selected.name}…`} />
                      <div className="flex justify-end">
                        <Button onClick={dispatchTask} disabled={dispatching || !taskInput.trim()} className="bg-violet-600 hover:bg-violet-700 text-white">
                          {dispatching ? <><Loader2 className="w-4 h-4 animate-spin mr-1.5" />Running…</> : <>Dispatch Task</>}
                        </Button>
                      </div>
                      {taskResult && (
                        <div className="bg-muted p-4 rounded-lg text-sm whitespace-pre-wrap border border-border/40 max-h-60 overflow-y-auto leading-relaxed">
                          <p className="text-xs font-semibold text-muted-foreground mb-2">RESPONSE FROM {selected.name.toUpperCase()}</p>
                          {taskResult}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-sm text-muted-foreground mb-3">This executive has not been deployed yet.</p>
                      <Button onClick={deployAll} disabled={deploying} className="bg-violet-600 hover:bg-violet-700 text-white">
                        {deploying ? <><Loader2 className="w-4 h-4 animate-spin mr-1.5" />Deploying…</> : "Deploy Now"}
                      </Button>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}