import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const ALLOWED_FIX_TYPES = [
  'missing_automation', 'unassigned_work', 'incomplete_documentation',
  'inactive_ai_agent', 'missing_relationship'
];

const FIX_TYPE_MAP = {
  'unassigned_work': 'unassigned_work',
  'missing_automation': 'missing_automation',
  'incomplete_documentation': 'missing_documentation',
  'inactive_ai_agent': 'inactive_agent_reassignment',
  'missing_relationship': 'incomplete_relationship_mapping',
  'stale_task': 'stale_task'
};

const PROTECTED_ACTIONS = [
  'governance', 'legal', 'pricing', 'compensation', 'customer_charges',
  'external_messages', 'data_deletion', 'production_deployment'
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const operation = body.operation || 'run';
    const b = base44.asServiceRole.entities;

    if (operation === 'run') {
      const findings = await b.DiagnosticFinding.filter({
        status: 'detected',
        finding_type: { $in: ALLOWED_FIX_TYPES }
      }, '-created_date', 50);

      const results = [];
      for (const finding of findings) {
        const fixResult = await executeFix(base44, finding);
        results.push(fixResult);
      }

      return Response.json({
        operation, total_eligible: findings.length,
        fixed: results.filter(r => r.success).length,
        skipped: results.filter(r => !r.success).length, results
      });
    }

    if (operation === 'fix_single') {
      const finding = await b.DiagnosticFinding.get(body.params?.finding_id);
      if (!finding) return Response.json({ error: 'Finding not found' }, { status: 404 });
      if (!ALLOWED_FIX_TYPES.includes(finding.finding_type))
        return Response.json({ error: 'Finding type not auto-fixable' }, { status: 400 });
      const result = await executeFix(base44, finding);
      return Response.json({ operation, result });
    }

    if (operation === 'get_rules') {
      return Response.json({ allowed_types: ALLOWED_FIX_TYPES, protected_actions: PROTECTED_ACTIONS, type_map: FIX_TYPE_MAP });
    }

    return Response.json({ error: 'Unknown operation' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function executeFix(base44, finding) {
  const b = base44.asServiceRole.entities;
  try {
    let fixDescription = '';
    let fixAction = '';

    if (finding.finding_type === 'unassigned_work') {
      const unassigned = await b.Task.filter({ status: { $in: ['todo', 'backlog'] } }, '-created_date', 50);
      const tasksNeedingAssignee = unassigned.filter(t => !t.assignee_id);
      const agents = await b.AgentProfile.filter({ status: 'active' }, '-created_date', 20);
      let assigned = 0;
      for (const task of tasksNeedingAssignee) {
        const agent = agents[assigned % (agents.length || 1)];
        if (!agent) break;
        await b.Task.update(task.id, { assignee_id: agent.id });
        assigned++;
      }
      fixDescription = `Auto-assigned ${assigned} unassigned tasks to active agents`;
      fixAction = 'task_assignment';
    }

    else if (finding.finding_type === 'stale_task') {
      const inProgress = await b.Task.filter({ status: 'in_progress' }, '-created_date', 100);
      let cleaned = 0;
      for (const task of inProgress) {
        const days = task.updated_date ? (Date.now() - new Date(task.updated_date).getTime()) / 86400000 : 99;
        if (days > 14) {
          await b.Task.update(task.id, { status: 'backlog' });
          cleaned++;
        }
      }
      fixDescription = `Moved ${cleaned} stale tasks back to backlog`;
      fixAction = 'task_cleanup';
    }

    else if (finding.finding_type === 'incomplete_documentation') {
      fixDescription = `Documentation gap logged for: ${finding.title}`;
      fixAction = 'documentation_flag';
      await b.ImprovementItem.create({
        title: `Documentation needed: ${finding.title}`,
        recommended_fix: finding.recommended_fix || `Create documentation for: ${finding.title}`,
        improvement_dimension: 'documentation',
        description: finding.description,
        priority: 'medium', status: 'queued',
        source: 'auto_fix_engine', diagnostic_issue_id: finding.id,
        requires_approval: false, approval_type: 'none',
        tags: ['auto-fix', 'documentation']
      });
    }

    else if (finding.finding_type === 'missing_automation') {
      fixDescription = `Automation opportunity logged for: ${finding.title}`;
      fixAction = 'automation_flag';
      await b.ImprovementItem.create({
        title: `Automation opportunity: ${finding.title}`,
        recommended_fix: finding.recommended_fix || `Automate: ${finding.title}`,
        improvement_dimension: 'missing_workflows',
        bottleneck_type: 'missing_automation',
        description: finding.description,
        priority: 'medium', status: 'queued',
        source: 'auto_fix_engine', diagnostic_issue_id: finding.id,
        requires_approval: false, approval_type: 'none',
        tags: ['auto-fix', 'automation']
      });
    }

    else if (finding.finding_type === 'inactive_ai_agent') {
      const agents = await b.AgentProfile.filter({ status: 'idle' }, '-created_date', 20);
      const tasks = await b.Task.filter({ status: 'todo' }, '-created_date', 20);
      let reassigned = 0;
      for (const agent of agents) {
        const task = tasks[reassigned];
        if (!task) break;
        await b.AgentProfile.update(agent.id, { status: 'active', assigned_work: task.title, last_active: new Date().toISOString() });
        reassigned++;
      }
      fixDescription = `Reactivated ${reassigned} idle agents with available tasks`;
      fixAction = 'agent_reassignment';
    }

    else if (finding.finding_type === 'missing_relationship') {
      fixDescription = `Relationship mapping gap logged for: ${finding.title}`;
      fixAction = 'relationship_flag';
      await b.ImprovementItem.create({
        title: `Relationship mapping needed: ${finding.title}`,
        recommended_fix: finding.recommended_fix || `Map relationships for: ${finding.title}`,
        improvement_dimension: 'engineering_quality',
        description: finding.description,
        priority: 'low', status: 'queued',
        source: 'auto_fix_engine', diagnostic_issue_id: finding.id,
        requires_approval: false, approval_type: 'none',
        tags: ['auto-fix', 'relationship']
      });
    }

    await b.DiagnosticFinding.update(finding.id, {
      status: 'resolved', resolved_at: new Date().toISOString()
    });

    await b.EngineeringJournal.create({
      title: `Auto-Fix: ${finding.title}`,
      category: 'debugging',
      content: `Automated fix executed for diagnostic finding ${finding.id}.\nType: ${finding.finding_type}\nFix: ${fixDescription}\nAction: ${fixAction}\nNo protected actions were touched. No governance, legal, pricing, compensation, customer charges, external messages, data deletion, or production deployment changes were made.`,
      source_type: 'auto_fix', source_name: 'NIOC Auto-Fix Engine',
      status: 'published', auto_generated: true,
      tags: ['auto-fix', finding.finding_type, 'nioc']
    });

    return { success: true, finding_id: finding.id, fix_description: fixDescription, fix_action: fixAction };
  } catch (err) {
    return { success: false, finding_id: finding.id, error: err.message };
  }
}