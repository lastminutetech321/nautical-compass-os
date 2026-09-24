import { Context } from "https://deno.land/x/base44@v1/mod.ts";

interface Task {
  id: string;
  title: string;
  priority: "low" | "medium" | "high" | "critical";
  complexity: number;
  required_skills?: string[];
}

interface Agent {
  id: string;
  name: string;
  capacity: number;
  current_workload: number;
  skills: string[];
  performance_score?: number;
}

export default async function workforceActivatorDispatch(
  ctx: Context,
  { tasks, agents }: { tasks: Task[]; agents: Agent[] }
) {
  const assignments: any[] = [];
  const availableAgents = [...agents].filter(a => a.current_workload < a.capacity);
  const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
  const sortedTasks = [...tasks].sort((a, b) => {
    const diff = priorityOrder[b.priority] - priorityOrder[a.priority];
    return diff !== 0 ? diff : (b.complexity || 5) - (a.complexity || 5);
  });

  for (const task of sortedTasks) {
    if (availableAgents.length === 0) break;
    let bestAgent = availableAgents[0];
    let bestScore = 0;

    for (const agent of availableAgents) {
      let score = 100 - agent.current_workload * 10;
      if (task.required_skills && task.required_skills.length > 0) {
        const matched = task.required_skills.filter(s => agent.skills.includes(s));
        score += (matched.length / task.required_skills.length) * 50;
      }
      if (agent.performance_score) score += agent.performance_score * 0.2;
      if (score > bestScore) {
        bestScore = score;
        bestAgent = agent;
      }
    }

    assignments.push({ task_id: task.id, agent_id: bestAgent.id, confidence_score: Math.min(100, bestScore) });
    bestAgent.current_workload += 1;
    if (bestAgent.current_workload >= bestAgent.capacity) {
      availableAgents.splice(availableAgents.indexOf(bestAgent), 1);
    }
  }

  return {
    success: true,
    assignments,
    total_tasks: tasks.length,
    total_agents: agents.length,
    tasks_assigned: assignments.length,
    tasks_unassigned: tasks.length - assignments.length,
    agents_utilized: new Set(assignments.map(a => a.agent_id)).size
  };
}
