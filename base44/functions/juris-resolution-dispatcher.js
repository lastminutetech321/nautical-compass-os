/**
 * JurisEngine Resolution Task Dispatcher
 * Auto-dispatches resolution tasks for legal research and precedent analysis
 * Triggered by: Self-Healing Engine v3, manual invocation, or scheduled workflow
 */

import { createClient } from 'https://esm.sh/@base44/sdk@latest';

const TASK_TYPES = {
  PRECEDENT_ANALYSIS: 'precedent_analysis',
  JURISDICTION_MAPPING: 'jurisdiction_mapping',
  STATUTE_CITATION: 'statute_citation',
  CASE_LAW_REVIEW: 'case_law_review',
  CONFLICT_RESOLUTION: 'conflict_resolution'
};

const PRIORITY_LEVELS = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3
};

export default async function handler(req) {
  const client = createClient({
    appId: Deno.env.get('BASE44_APP_ID'),
    apiKey: Deno.env.get('BASE44_API_KEY')
  });

  try {
    const { module, action, context = {} } = await req.json();

    if (module !== 'JurisEngine') {
      return new Response(
        JSON.stringify({ error: 'Invalid module. Expected: JurisEngine' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const taskType = determineTaskType(action, context);
    const priority = determinePriority(context);

    const task = await client.entities.create('juris_resolution_task', {
      module: 'JurisEngine',
      action,
      task_type: taskType,
      priority,
      status: 'pending',
      context: JSON.stringify(context),
      created_at: new Date().toISOString(),
      assigned_to: null,
      metadata: {
        dispatcher_version: 'v3',
        auto_dispatched: true,
        source: context.source || 'self_healing_engine'
      }
    });

    await dispatchToQueue(client, task, taskType, priority);

    await client.entities.create('juris_event_log', {
      task_id: task.id,
      event_type: 'task_dispatched',
      module: 'JurisEngine',
      timestamp: new Date().toISOString(),
      details: JSON.stringify({ action, task_type: taskType, priority, queue: getQueueName(taskType, priority) })
    });

    return new Response(
      JSON.stringify({
        success: true,
        task_id: task.id,
        task_type: taskType,
        priority,
        queue: getQueueName(taskType, priority),
        estimated_resolution_time: estimateResolutionTime(taskType, priority)
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('JurisEngine dispatcher error:', error);
    return new Response(
      JSON.stringify({ error: 'Dispatch failed', message: error.message, module: 'JurisEngine' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

function determineTaskType(action, context) {
  const actionMap = {
    'analyze_precedent': TASK_TYPES.PRECEDENT_ANALYSIS,
    'map_jurisdiction': TASK_TYPES.JURISDICTION_MAPPING,
    'cite_statute': TASK_TYPES.STATUTE_CITATION,
    'review_case_law': TASK_TYPES.CASE_LAW_REVIEW,
    'resolve_conflict': TASK_TYPES.CONFLICT_RESOLUTION
  };
  return actionMap[action] || TASK_TYPES.CASE_LAW_REVIEW;
}

function determinePriority(context) {
  if (context.urgent || context.deadline_hours < 24) return PRIORITY_LEVELS.CRITICAL;
  if (context.high_value || context.client_tier === 'premium') return PRIORITY_LEVELS.HIGH;
  if (context.complexity === 'simple') return PRIORITY_LEVELS.LOW;
  return PRIORITY_LEVELS.MEDIUM;
}

function getQueueName(taskType, priority) {
  const priorityNames = ['critical', 'high', 'medium', 'low'];
  return `juris_${taskType}_${priorityNames[priority]}`;
}

async function dispatchToQueue(client, task, taskType, priority) {
  const queueName = getQueueName(taskType, priority);
  await client.entities.create('juris_task_queue', {
    task_id: task.id,
    queue_name: queueName,
    task_type: taskType,
    priority,
    status: 'queued',
    queued_at: new Date().toISOString(),
    position: null
  });
}

function estimateResolutionTime(taskType, priority) {
  const baseTimes = {
    [TASK_TYPES.PRECEDENT_ANALYSIS]: 60,
    [TASK_TYPES.JURISDICTION_MAPPING]: 30,
    [TASK_TYPES.STATUTE_CITATION]: 15,
    [TASK_TYPES.CASE_LAW_REVIEW]: 90,
    [TASK_TYPES.CONFLICT_RESOLUTION]: 120
  };
  const baseTime = baseTimes[taskType] || 60;
  const priorityMultiplier = [0.5, 0.75, 1.0, 1.5][priority];
  return Math.round(baseTime * priorityMultiplier);
}
