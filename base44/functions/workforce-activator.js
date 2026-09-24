/**
 * Workforce Activator Function
 * Dispatches task queues to 55 active agents in the AI Workforce
 * Auto-repair triggered by Self-Healing Engine v3
 */

export default async function handler(context) {
  const { base44, params } = context;
  
  try {
    // Fetch active AI agents (limit 55)
    const agents = await base44.entities('ai_agents').find({
      where: { status: 'active' },
      limit: 55,
      orderBy: { priority: 'desc', last_task_at: 'asc' }
    });

    if (!agents || agents.length === 0) {
      return {
        success: false,
        error: 'No active agents found',
        dispatched: 0
      };
    }

    // Fetch pending task queues
    const taskQueues = await base44.entities('task_queues').find({
      where: { status: 'pending' },
      orderBy: { priority: 'desc', created_at: 'asc' }
    });

    if (!taskQueues || taskQueues.length === 0) {
      return {
        success: true,
        message: 'No pending tasks to dispatch',
        agents_ready: agents.length,
        dispatched: 0
      };
    }

    const dispatched = [];
    const errors = [];

    // Round-robin task distribution
    for (let i = 0; i < taskQueues.length; i++) {
      const task = taskQueues[i];
      const agent = agents[i % agents.length];

      try {
        // Create agent task assignment
        await base44.entities('agent_tasks').create({
          agent_id: agent.id,
          task_queue_id: task.id,
          task_type: task.task_type,
          priority: task.priority,
          status: 'assigned',
          assigned_at: new Date().toISOString(),
          metadata: {
            ...task.metadata,
            dispatcher: 'workforce-activator',
            auto_repair: true,
            self_healing_v3: true
          }
        });

        // Update task queue status
        await base44.entities('task_queues').update(task.id, {
          status: 'dispatched',
          assigned_agent_id: agent.id,
          dispatched_at: new Date().toISOString()
        });

        // Update agent last task timestamp
        await base44.entities('ai_agents').update(agent.id, {
          last_task_at: new Date().toISOString(),
          active_tasks: (agent.active_tasks || 0) + 1
        });

        dispatched.push({
          task_id: task.id,
          agent_id: agent.id,
          agent_name: agent.name,
          task_type: task.task_type
        });

      } catch (err) {
        errors.push({
          task_id: task.id,
          agent_id: agent.id,
          error: err.message
        });
      }
    }

    // Log dispatch event
    await base44.entities('system_events').create({
      event_type: 'workforce_dispatch',
      module: 'AI Workforce',
      action: 'Dispatch task queues to agents',
      status: errors.length === 0 ? 'success' : 'partial_success',
      metadata: {
        total_agents: agents.length,
        total_tasks: taskQueues.length,
        dispatched_count: dispatched.length,
        error_count: errors.length,
        auto_repair: true,
        self_healing_v3: true
      },
      created_at: new Date().toISOString()
    });

    return {
      success: true,
      agents_activated: agents.length,
      tasks_pending: taskQueues.length,
      dispatched: dispatched.length,
      errors: errors.length,
      details: {
        dispatched,
        errors: errors.length > 0 ? errors : undefined
      },
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    // Log critical error
    await base44.entities('system_events').create({
      event_type: 'workforce_dispatch_error',
      module: 'AI Workforce',
      action: 'Dispatch task queues to agents',
      status: 'error',
      error_message: error.message,
      error_stack: error.stack,
      metadata: {
        auto_repair: true,
        self_healing_v3: true
      },
      created_at: new Date().toISOString()
    });

    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}
