/**
 * JurisEngine Task Prioritization Function
 * Prioritizes resolution tasks based on failure analysis
 */

import { Context } from "https://deno.land/x/base44@latest/mod.ts";

interface PrioritizeTasksInput {
  failure_type: string;
  affected_components: string[];
  severity: "critical" | "high" | "medium" | "low";
}

interface PriorityQueueItem {
  task_id: string;
  task_name: string;
  priority: number;
  component: string;
  estimated_duration_minutes: number;
}

interface PriorityQueueResult {
  priority_queue: PriorityQueueItem[];
}

export default async function prioritizeTasks(
  input: PrioritizeTasksInput,
  ctx: Context
): Promise<PriorityQueueResult> {
  const { failure_type, affected_components, severity } = input;

  // Base priority score from severity
  const severityScores = {
    critical: 1000,
    high: 750,
    medium: 500,
    low: 250,
  };

  const basePriority = severityScores[severity];
  const tasks: PriorityQueueItem[] = [];

  // Generate tasks for each affected component
  for (const component of affected_components) {
    const componentTasks = generateTasksForComponent(
      component,
      failure_type,
      basePriority
    );
    tasks.push(...componentTasks);
  }

  // Sort by priority (descending)
  const priorityQueue = tasks.sort((a, b) => b.priority - a.priority);

  // Log the prioritization result
  await ctx.entities.create("system_logs", {
    event_type: "jurisengine_tasks_prioritized",
    failure_type,
    severity,
    task_count: priorityQueue.length,
    timestamp: new Date().toISOString(),
  });

  return { priority_queue: priorityQueue };
}

function generateTasksForComponent(
  component: string,
  failureType: string,
  basePriority: number
): PriorityQueueItem[] {
  const tasks: PriorityQueueItem[] = [];

  switch (component) {
    case "schema":
      tasks.push({
        task_id: `schema_validate_${Date.now()}`,
        task_name: "Validate entity schemas",
        priority: basePriority + 100,
        component: "schema",
        estimated_duration_minutes: 5,
      });
      tasks.push({
        task_id: `schema_repair_${Date.now()}`,
        task_name: "Repair schema inconsistencies",
        priority: basePriority + 90,
        component: "schema",
        estimated_duration_minutes: 15,
      });
      break;

    case "logic":
      tasks.push({
        task_id: `logic_analyze_${Date.now()}`,
        task_name: "Analyze function execution logs",
        priority: basePriority + 80,
        component: "logic",
        estimated_duration_minutes: 10,
      });
      tasks.push({
        task_id: `logic_repair_${Date.now()}`,
        task_name: "Repair function logic errors",
        priority: basePriority + 70,
        component: "logic",
        estimated_duration_minutes: 20,
      });
      break;

    case "integration":
      tasks.push({
        task_id: `integration_verify_${Date.now()}`,
        task_name: "Verify external API connectivity",
        priority: basePriority + 60,
        component: "integration",
        estimated_duration_minutes: 5,
      });
      tasks.push({
        task_id: `integration_repair_${Date.now()}`,
        task_name: "Repair integration configuration",
        priority: basePriority + 50,
        component: "integration",
        estimated_duration_minutes: 15,
      });
      break;

    case "data_layer":
      tasks.push({
        task_id: `data_backup_${Date.now()}`,
        task_name: "Backup current data state",
        priority: basePriority + 150,
        component: "data_layer",
        estimated_duration_minutes: 10,
      });
      tasks.push({
        task_id: `data_integrity_check_${Date.now()}`,
        task_name: "Run data integrity check",
        priority: basePriority + 140,
        component: "data_layer",
        estimated_duration_minutes: 15,
      });
      break;
  }

  // Add universal monitoring task
  tasks.push({
    task_id: `monitor_${component}_${Date.now()}`,
    task_name: `Monitor ${component} for recurrence`,
    priority: basePriority - 100,
    component,
    estimated_duration_minutes: 30,
  });

  return tasks;
}
