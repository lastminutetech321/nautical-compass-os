/**
 * Workforce Dispatcher
 * Dispatches task queues to 48 agents via Workforce Activator
 * Auto-repair dispatch for AI Workforce module
 */

export default async function workforceDispatcher(context) {
  const { base44 } = context;
  
  try {
    const agents = await base44.entities('agents').list({
      filter: { status: 'active' },
      limit: 48
    });

    if (agents.length === 0) {
      return { success: false, error: 'No active agents found', dispatched: 0 };
    }

    const tasks = await base44.entities('task_queue').list({
      filter: { status: 'pending' },
      sort: [{ field: 'priority', direction: 'desc' }, { field: 'created_at', direction: 'asc' }]
    });

    if (tasks.length === 0) {
      return { success: true, message: 'No pending tasks to dispatch', dispatched: 0, agents_ready: agents.length };
    }

    const dispatched = [];

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      const agent = agents[i % agents.length];

      const assignment = await base44.entities('agent_assignments').create({
        agent_id: agent.id,
        task_id: task.id,
        assigned_at: new Date().toISOString(),
        status: 'assigned',
        priority: task.priority || 'normal'
      });

      await base44.entities('task_queue').update(task.id, {
        status: 'assigned',
        assigned_to: agent.id,
        assigned_at: new Date().toISOString()
      });

      await base44.functions.call('workforce-activator', {
        agent_id: agent.id,
        assignment_id: assignment.id,
        task_id: task.id
      });

      dispatched.push({ task_id: task.id, agent_id: agent.id, assignment_id: assignment.id });
    }

    await base44.entities('system_events').create({
      event_type: 'workforce_dispatch',
      timestamp: new Date().toISOString(),
      metadata: {
        tasks_dispatched: dispatched.length,
        agents_activated: new Set(dispatched.map(d => d.agent_id)).size,
        dispatch_mode: 'round_robin',
        triggered_by: 'self_healing_engine_v3'
      }
    });

    return {
      success: true,
      dispatched: dispatched.length,
      agents_activated: new Set(dispatched.map(d => d.agent_id)).size,
      total_agents: agents.length,
      assignments: dispatched
    };

  } catch (error) {
    await base44.entities('system_events').create({
      event_type: 'workforce_dispatch_error',
      timestamp: new Date().toISOString(),
      metadata: { error: error.message, stack: error.stack }
    });

    return { success: false, error: error.message, dispatched: 0 };
  }
}
