import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const operation = body.operation || 'reactivate_all';
    const b = base44.asServiceRole.entities;

    if (operation === 'reactivate_all') {
      const agents = await b.AgentProfile.list('-created_date', 200);
      const inactiveAgents = agents.filter(a => a.status === 'idle' || a.status === 'error' || !a.last_active);
      const findings = await b.DiagnosticFinding.filter({ status: 'detected' }, '-created_date', 50);
      const canonGaps = await b.CanonEntry.filter({ is_canon_gap: true, verified: false }, '-created_date', 50);
      const csGaps = await b.CustomerSuccessProfile.filter({ health_status: { $in: ['at_risk', 'critical'] } }, '-created_date', 50);
      const unassignedTasks = await b.Task.filter({ status: 'todo', assignee_id: { $exists: false } }, '-created_date', 50);

      const results = [];
      for (const agent of inactiveAgents) {
        const reason = identifyInactiveReason(agent);
        const assignments = findAssignments(agent, findings, canonGaps, csGaps, unassignedTasks);
        const updated = await b.AgentProfile.update(agent.id, {
          status: 'active',
          assigned_work: assignments.primary_assignment?.title || 'Monitoring platform health',
          task_queue: assignments.task_queue,
          last_active: new Date().toISOString()
        });

        await b.SystemHealthScore.create({
          entity_type: 'ai',
          entity_id: agent.id,
          entity_name: agent.name,
          score: 65,
          status: 'good',
          trend: 'improving',
          factors: [{ name: 'Reactivated', value: 1, weight: 1 }],
          recommended_actions: assignments.recommendations,
          confidence_level: 80,
          last_evaluated: new Date().toISOString(),
          notes: `Reactivated from ${reason}`
        });

        results.push({
          agent_id: agent.id, agent_name: agent.name,
          inactive_reason: reason,
          assignments_count: assignments.task_queue.length,
          primary_assignment: assignments.primary_assignment?.title,
          recommendations: assignments.recommendations
        });
      }

      return Response.json({
        operation, total_agents: agents.length,
        inactive_found: inactiveAgents.length, reactivated: results.length, results
      });
    }

    if (operation === 'reactivate_agent') {
      const agentId = body.params?.agent_id;
      if (!agentId) return Response.json({ error: 'agent_id required' }, { status: 400 });
      const agent = await b.AgentProfile.get(agentId);
      if (!agent) return Response.json({ error: 'Agent not found' }, { status: 404 });

      const reason = identifyInactiveReason(agent);
      const findings = await b.DiagnosticFinding.filter({ status: 'detected' }, '-created_date', 20);
      const canonGaps = await b.CanonEntry.filter({ is_canon_gap: true, verified: false }, '-created_date', 20);
      const csGaps = await b.CustomerSuccessProfile.filter({ health_status: { $in: ['at_risk', 'critical'] } }, '-created_date', 20);
      const assignments = findAssignments(agent, findings, canonGaps, csGaps, []);

      await b.AgentProfile.update(agent.id, {
        status: 'active',
        assigned_work: assignments.primary_assignment?.title || 'Monitoring platform health',
        task_queue: assignments.task_queue,
        last_active: new Date().toISOString()
      });

      return Response.json({ operation, agent_id: agentId, inactive_reason: reason, assignments });
    }

    if (operation === 'inactive_report') {
      const agents = await b.AgentProfile.list('-created_date', 200);
      const inactive = agents.filter(a => a.status === 'idle' || a.status === 'error' || !a.last_active);
      return Response.json({
        operation, total_agents: agents.length,
        inactive_count: inactive.length,
        inactive_pct: Math.round(inactive.length / agents.length * 100),
        agents: inactive.map(a => ({ id: a.id, name: a.name, status: a.status, reason: identifyInactiveReason(a) }))
      });
    }

    return Response.json({ error: 'Unknown operation' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function identifyInactiveReason(agent) {
  if (agent.status === 'error') return 'error_state';
  if (!agent.assigned_work || agent.assigned_work === '') return 'no_assigned_work';
  if (!agent.last_active) return 'never_active';
  const daysSince = (Date.now() - new Date(agent.last_active).getTime()) / 86400000;
  if (daysSince > 7) return 'prolonged_inactivity';
  return 'idle';
}

function findAssignments(agent, findings, canonGaps, csGaps, unassignedTasks) {
  const taskQueue = [];
  let primary = null;

  if (findings.length > 0 && (agent.agent_type === 'qa' || agent.agent_type === 'automation')) {
    primary = { title: `Resolve diagnostic: ${findings[0].title}`, type: 'diagnostic_finding', id: findings[0].id };
    taskQueue.push(primary);
  }

  if (canonGaps.length > 0 && (agent.agent_type === 'legal_research' || agent.agent_type === 'documentation')) {
    if (!primary) primary = { title: `Import Canon: ${canonGaps[0].title}`, type: 'canon_gap', id: canonGaps[0].id };
    taskQueue.push({ title: `Import Canon: ${canonGaps[0].title}`, type: 'canon_gap', id: canonGaps[0].id });
  }

  if (csGaps.length > 0 && agent.agent_type === 'customer_support') {
    if (!primary) primary = { title: `CS outreach: ${csGaps[0].customer_name}`, type: 'cs_gap', id: csGaps[0].id };
    taskQueue.push({ title: `CS outreach: ${csGaps[0].customer_name}`, type: 'cs_gap', id: csGaps[0].id });
  }

  if (unassignedTasks.length > 0) {
    for (const task of unassignedTasks.slice(0, 3)) {
      taskQueue.push({ title: task.title, type: 'task', id: task.id });
      if (!primary) primary = { title: task.title, type: 'task', id: task.id };
    }
  }

  const recommendations = [];
  if (findings.length > 0) recommendations.push(`Review ${findings.length} open diagnostic findings`);
  if (canonGaps.length > 0) recommendations.push(`Assist with ${canonGaps.length} Canon gaps`);
  if (csGaps.length > 0) recommendations.push(`Support ${csGaps.length} at-risk customers`);
  if (recommendations.length === 0) recommendations.push('Monitor platform health and await assignment');

  return { primary_assignment: primary, task_queue: taskQueue.slice(0, 5), recommendations };
}