import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Bot, Zap, CheckCircle, Clock, AlertTriangle, Loader2, Brain,
  Target, Play, Users, BarChart3, Wrench, RefreshCw, Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

const AGENT_WORK_PROFILES = [
  {
    name: "Canon Librarian Agent",
    specialty: "Legal Research & Canon Population",
    color: "text-amber-600 bg-amber-50",
    auto_tasks: [
      { title: "Draft Canon entry for 42 U.S.C. § 1983", task_type: "draft", priority: "critical" },
      { title: "Draft Canon entry for 5 U.S.C. § 552 (FOIA)", task_type: "draft", priority: "critical" },
      { title: "Draft Canon entry for Fair Credit Reporting Act", task_type: "draft", priority: "high" },
      { title: "Review and tag all untagged Canon entries with keywords", task_type: "organize", priority: "medium" },
    ]
  },
  {
    name: "Product Manager Agent",
    specialty: "Build Planning & Roadmap Management",
    color: "text-blue-600 bg-blue-50",
    auto_tasks: [
      { title: "Map all BuildRegistry items to RoadmapItem phases", task_type: "organize", priority: "high" },
      { title: "Generate 90-day execution plan from ImprovementItems", task_type: "analyze", priority: "high" },
      { title: "Identify and document all missing feature gaps in platform", task_type: "analyze", priority: "medium" },
      { title: "Research enterprise law firm prospects for demo outreach", task_type: "research", priority: "medium" },
    ]
  },
  {
    name: "QA Agent",
    specialty: "Testing & Quality Verification",
    color: "text-purple-600 bg-purple-50",
    auto_tasks: [
      { title: "Run JurisEngine test suite — all 10 standard queries", task_type: "test", priority: "high" },
      { title: "Audit Evidence Vault chain-of-custody completeness", task_type: "test", priority: "high" },
      { title: "Verify all Canon entries have proper citations and summaries", task_type: "test", priority: "medium" },
      { title: "Test Decision Compass with 5 real-world benefit scenarios", task_type: "test", priority: "medium" },
    ]
  },
  {
    name: "Documentation Agent",
    specialty: "Documentation & Reporting",
    color: "text-cyan-600 bg-cyan-50",
    auto_tasks: [
      { title: "Document all NCOS API endpoints and their purposes", task_type: "draft", priority: "medium" },
      { title: "Create user onboarding guide for Decision Compass", task_type: "draft", priority: "medium" },
      { title: "Generate executive summary of platform capabilities for sales", task_type: "summarize", priority: "high" },
      { title: "Document Canon population process for new contributors", task_type: "draft", priority: "low" },
    ]
  },
  {
    name: "Security Agent",
    specialty: "Security & Compliance Monitoring",
    color: "text-red-600 bg-red-50",
    auto_tasks: [
      { title: "Audit all Evidence Vault entries for access level assignments", task_type: "analyze", priority: "high" },
      { title: "Review all approval gates for security policy compliance", task_type: "analyze", priority: "high" },
      { title: "Check all agent task outputs for sensitive data exposure", task_type: "test", priority: "medium" },
      { title: "Review platform configuration for security misconfigurations", task_type: "analyze", priority: "medium" },
    ]
  },
  {
    name: "Evidence Agent",
    specialty: "Evidence Management & Analysis",
    color: "text-orange-600 bg-orange-50",
    auto_tasks: [
      { title: "Categorize and tag all untagged evidence entries", task_type: "organize", priority: "medium" },
      { title: "Generate evidence summary report for each open case file", task_type: "summarize", priority: "high" },
      { title: "Identify duplicate or conflicting evidence entries", task_type: "analyze", priority: "medium" },
    ]
  },
];

export default function AIWorkforceActivator() {
  const [agents, setAgents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(null);
  const [dispatched, setDispatched] = useState({});

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [ag, tk] = await Promise.all([
      base44.entities.AgentProfile.list("-created_date", 100).catch(() => []),
      base44.entities.AgentTask.filter({ status: { $in: ["queued", "in_progress"] } }, "-created_date", 100).catch(() => []),
    ]);
    setAgents(ag); setTasks(tk);
    setLoading(false);
  };

  const dispatchAgentWork = async (profile) => {
    setActivating(profile.name);
    let dispatched_count = 0;
    // Check if agent tasks already exist for this agent
    const existingTasks = tasks.filter(t => t.agent_name === profile.name);
    const existingTitles = new Set(existingTasks.map(t => t.title));

    for (const task of profile.auto_tasks) {
      if (!existingTitles.has(task.title)) {
        await base44.entities.AgentTask.create({
          ...task,
          agent_name: profile.name,
          status: "queued",
          description: `Autonomous task dispatched by AI Workforce Activator. ${task.title}`,
          estimated_hours: task.priority === "critical" ? 8 : task.priority === "high" ? 4 : 2,
        });
        dispatched_count++;
      }
    }

    // Update agent status to active if it was idle
    const agentRecord = agents.find(a => a.name === profile.name);
    if (agentRecord && agentRecord.status === "idle") {
      await base44.entities.AgentProfile.update(agentRecord.id, {
        status: "active",
        last_active: new Date().toISOString(),
        assigned_work: profile.auto_tasks[0]?.title || "Autonomous queue work",
      });
    } else if (!agentRecord) {
      // Create the agent if it doesn't exist
      await base44.entities.AgentProfile.create({
        name: profile.name,
        purpose: profile.specialty,
        agent_type: "custom",
        status: "active",
        last_active: new Date().toISOString(),
        assigned_work: profile.auto_tasks[0]?.title || "Autonomous queue work",
        tasks_completed: 0,
      });
    }

    setDispatched(d => ({ ...d, [profile.name]: dispatched_count }));
    setActivating(null);
    loadData();
  };

  const activateAllAgents = async () => {
    setActivating("ALL");
    for (const profile of AGENT_WORK_PROFILES) {
      await dispatchAgentWork(profile);
    }
    setActivating(null);
  };

  const agentTaskCount = (agentName) => tasks.filter(t => t.agent_name === agentName).length;
  const agentProfile = (agentName) => agents.find(a => a.name === agentName);
  const totalIdleAgents = AGENT_WORK_PROFILES.filter(p => !agentProfile(p.name) || agentProfile(p.name)?.status === "idle").length;
  const totalQueued = tasks.filter(t => t.status === "queued").length;

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">NCOS · AI Workforce</p>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Bot className="w-6 h-6 text-violet-500" />AI Workforce Activator
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Activate idle agents, dispatch autonomous work queues, maximize platform throughput.</p>
        </div>
        <Button
          onClick={activateAllAgents}
          disabled={!!activating}
          className="gap-2 bg-violet-600 hover:bg-violet-700"
        >
          {activating === "ALL" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          Activate All Agents ({totalIdleAgents} idle)
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Agent Profiles", value: AGENT_WORK_PROFILES.length, color: "text-violet-600 bg-violet-50", icon: Bot },
          { label: "Idle Agents", value: totalIdleAgents, color: totalIdleAgents > 0 ? "text-amber-600 bg-amber-50" : "text-emerald-600 bg-emerald-50", icon: Clock },
          { label: "Queued Tasks", value: totalQueued, color: "text-blue-600 bg-blue-50", icon: Target },
          { label: "Activated Today", value: Object.keys(dispatched).length, color: "text-emerald-600 bg-emerald-50", icon: CheckCircle },
        ].map(k => (
          <Card key={k.label} className="p-4 border border-border/60">
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${k.color}`}><k.icon className="w-3.5 h-3.5" /></div>
              <p className="text-xs text-muted-foreground">{k.label}</p>
            </div>
            <p className="text-2xl font-bold pl-9">{k.value}</p>
          </Card>
        ))}
      </div>

      {/* Agent Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {AGENT_WORK_PROFILES.map(profile => {
          const agent = agentProfile(profile.name);
          const taskCount = agentTaskCount(profile.name);
          const isIdle = !agent || agent.status === "idle";
          const dispatchedCount = dispatched[profile.name];

          return (
            <Card key={profile.name} className={`p-4 border ${isIdle ? "border-amber-200 bg-amber-50/20" : "border-emerald-200 bg-emerald-50/20"}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${profile.color}`}>
                    <Bot className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{profile.name}</p>
                    <p className="text-xs text-muted-foreground">{profile.specialty}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className={`text-[9px] ${isIdle ? "text-amber-600 border-amber-300" : "text-emerald-600 border-emerald-300"}`}>
                        {isIdle ? "IDLE" : (agent?.status || "active").toUpperCase()}
                      </Badge>
                      {taskCount > 0 && <span className="text-[10px] text-muted-foreground">{taskCount} tasks in queue</span>}
                    </div>
                  </div>
                </div>
                {dispatchedCount !== undefined ? (
                  <Badge className="text-[10px] bg-emerald-100 text-emerald-700 border border-emerald-300">
                    <CheckCircle className="w-3 h-3 mr-1" />+{dispatchedCount} tasks
                  </Badge>
                ) : (
                  <Button
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => dispatchAgentWork(profile)}
                    disabled={!!activating}
                  >
                    {activating === profile.name ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Play className="w-3 h-3 mr-1" />}
                    Activate
                  </Button>
                )}
              </div>

              {/* Task list */}
              <div className="space-y-1.5">
                {profile.auto_tasks.map(task => {
                  const existing = tasks.find(t => t.agent_name === profile.name && t.title === task.title);
                  return (
                    <div key={task.title} className={`flex items-center gap-2 text-xs p-1.5 rounded ${existing ? "bg-emerald-50 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                      {existing ? <CheckCircle className="w-3 h-3 flex-shrink-0 text-emerald-500" /> : <Clock className="w-3 h-3 flex-shrink-0" />}
                      <span className="flex-1 truncate">{task.title}</span>
                      <Badge variant="outline" className={`text-[8px] flex-shrink-0 ${task.priority === "critical" ? "text-red-600 border-red-300" : task.priority === "high" ? "text-orange-600 border-orange-300" : "text-slate-500"}`}>{task.priority}</Badge>
                    </div>
                  );
                })}
              </div>

              {agent && (
                <div className="mt-3 pt-3 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Tasks completed: <strong>{agent.tasks_completed || 0}</strong></span>
                  {agent.last_active && <span>Last active: {new Date(agent.last_active).toLocaleDateString()}</span>}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}