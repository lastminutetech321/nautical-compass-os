/**
 * Workforce Activator
 * Activates an individual agent with assigned task
 */

export default async function workforceActivator(context) {
  const { base44, input } = context;
  const { agent_id, assignment_id, task_id } = input;

  try {
    const agent = await base44.entities('agents').get(agent_id);
    if (!agent) throw new Error(`Agent ${agent_id} not found`);

    const task = await base44.entities('task_queue').get(task_id);
    if (!task) throw new Error(`Task ${task_id} not found`);

    await base44.entities('agents').update(agent_id, {
      status: 'active',
      current_task_id: task_id,
      last_activated: new Date().toISOString()
    });

    await base44.entities('agent_assignments').update(assignment_id, {
      status: 'active',
      started_at: new Date().toISOString()
    });

    const workflowMap = {
      'content_generator': 'content-generation-workflow',
      'data_analyst': 'data-analysis-workflow',
      'code_reviewer': 'code-review-workflow',
      'qa_tester': 'qa-testing-workflow',
      'deployment_manager': 'deployment-workflow',
      'monitoring_agent': 'monitoring-workflow'
    };

    const agentWorkflow = workflowMap[agent.type];
    if (agentWorkflow) {
      await base44.workflows.trigger(agentWorkflow, {
        agent_id,
        task_id,
        assignment_id,
        task_data: task
      });
    }

    await base44.entities('agent_activity_log').create({
      agent_id,
      task_id,
      assignment_id,
      action: 'activated',
      timestamp: new Date().toISOString(),
      metadata: { agent_type: agent.type, task_type: task.type, priority: task.priority }
    });

    return { success: true, agent_id, task_id, assignment_id, status: 'activated', workflow_triggered: agentWorkflow || 'none' };

  } catch (error) {
    if (assignment_id) {
      await base44.entities('agent_assignments').update(assignment_id, {
        status: 'failed',
        error_message: error.message,
        failed_at: new Date().toISOString()
      });
    }

    return { success: false, error: error.message, agent_id, task_id, assignment_id };
  }
}
