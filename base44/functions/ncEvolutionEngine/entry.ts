import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { operation, params = {} } = body;
    const now = new Date().toISOString();

    // ─── SCAN: analyze completed work and generate proposals ───
    if (operation === 'scan') {
      const tasks = await base44.asServiceRole.entities.Task.list('-updated_date', 100).catch(() => []);
      const projects = await base44.asServiceRole.entities.Project.list('-updated_date', 50).catch(() => []);
      const sprints = await base44.asServiceRole.entities.Sprint.list('-updated_date', 20).catch(() => []);
      const existingProposals = await base44.asServiceRole.entities.EvolutionProposal.list('-created_date', 200).catch(() => []);
      const processedSourceIds = new Set(existingProposals.filter(p => p.source_id).map(p => p.source_id));

      const completedTasks = tasks.filter(t => (t.status === 'done' || t.status === 'completed') && !processedSourceIds.has(t.id));
      const completedProjects = projects.filter(p => (p.status === 'completed' || p.status === 'done') && !processedSourceIds.has(p.id));
      const completedSprints = sprints.filter(s => s.status === 'completed' && !processedSourceIds.has(s.id));

      const scanItems = [];
      for (const t of completedTasks.slice(0, 5)) {
        scanItems.push({ source_type: 'task', source_id: t.id, source_name: t.title || t.name || 'Task', details: `Task: ${t.title || t.name || ''}. Description: ${t.description || ''}. Status: ${t.status}.` });
      }
      for (const p of completedProjects.slice(0, 3)) {
        scanItems.push({ source_type: 'project', source_id: p.id, source_name: p.name || p.title || 'Project', details: `Project: ${p.name || p.title || ''}. Description: ${p.description || ''}. Status: ${p.status}.` });
      }
      for (const s of completedSprints.slice(0, 2)) {
        scanItems.push({ source_type: 'sprint', source_id: s.id, source_name: s.name || s.title || 'Sprint', details: `Sprint: ${s.name || s.title || ''}. Goal: ${s.goal || s.description || ''}. Status: ${s.status}.` });
      }

      if (scanItems.length === 0) {
        return Response.json({ operation: 'scan', message: 'No new completed work to analyze. All completed tasks/projects already have evolution proposals.', proposals_created: 0 });
      }

      const llmRes = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `You are the NC Evolution Engine AI. Your mission is to continuously improve NCOS by analyzing completed work and generating evolution proposals.

For each completed item below, generate an Evolution Proposal that answers these 7 questions:
1. What was learned?
2. What can be automated?
3. What should never happen again?
4. What documentation should be updated?
5. What new Canon knowledge exists?
6. Which AI employee became smarter?
7. Which workflow became faster?

Then propose a specific improvement action and score it across 7 dimensions (0-100):
- business_value_score: impact on business operations
- engineering_value_score: impact on code quality, architecture, tech debt
- customer_value_score: impact on customer experience
- legal_value_score: legal/compliance benefit
- revenue_impact_score: potential revenue increase or cost savings
- implementation_effort_score: effort required (higher = more effort)
- risk_score: risk of implementation (higher = more risky)

Also calculate an overall_score (0-100) as a weighted composite where value scores add and effort/risk subtract.

COMPLETED WORK TO ANALYZE:
${JSON.stringify(scanItems, null, 2)}

Generate proposals for EACH item. Be specific, actionable, and honest about risks.

Return as JSON.`,
        response_json_schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            proposals: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  title: { type: "string" },
                  source_name: { type: "string" },
                  source_type: { type: "string" },
                  source_id: { type: "string" },
                  what_was_learned: { type: "string" },
                  what_can_be_automated: { type: "string" },
                  what_should_never_happen_again: { type: "string" },
                  what_documentation_should_be_updated: { type: "string" },
                  what_new_canon_knowledge_exists: { type: "string" },
                  which_ai_employee_became_smarter: { type: "string" },
                  which_workflow_became_faster: { type: "string" },
                  proposed_improvement: { type: "string" },
                  proposed_action: { type: "string" },
                  business_value_score: { type: "number" },
                  engineering_value_score: { type: "number" },
                  customer_value_score: { type: "number" },
                  legal_value_score: { type: "number" },
                  revenue_impact_score: { type: "number" },
                  implementation_effort_score: { type: "number" },
                  risk_score: { type: "number" },
                  overall_score: { type: "number" },
                  priority: { type: "string" },
                  estimated_revenue_impact: { type: "number" },
                  estimated_time_savings_hours: { type: "number" },
                  affected_modules: { type: "array", items: { type: "string" } },
                  affected_agents: { type: "array", items: { type: "string" } },
                  founder_alert: { type: "boolean" },
                  alert_reason: { type: "string" }
                },
                required: ["title", "source_name", "source_type", "source_id", "what_was_learned", "what_can_be_automated", "what_should_never_happen_again", "what_documentation_should_be_updated", "what_new_canon_knowledge_exists", "which_ai_employee_became_smarter", "which_workflow_became_faster", "proposed_improvement", "proposed_action", "business_value_score", "engineering_value_score", "customer_value_score", "legal_value_score", "revenue_impact_score", "implementation_effort_score", "risk_score", "overall_score", "priority", "estimated_revenue_impact", "estimated_time_savings_hours", "affected_modules", "affected_agents", "founder_alert", "alert_reason"]
              }
            },
            scan_summary: {
              type: "object",
              additionalProperties: false,
              properties: {
                total_scanned: { type: "number" },
                proposals_generated: { type: "number" },
                high_priority_count: { type: "number" },
                overall_health_assessment: { type: "string" },
                key_learning: { type: "string" }
              },
              required: ["total_scanned", "proposals_generated", "high_priority_count", "overall_health_assessment", "key_learning"]
            }
          },
          required: ["proposals", "scan_summary"]
        }
      });

      const createdProposals = [];
      for (const proposal of llmRes.proposals || []) {
        const created = await base44.asServiceRole.entities.EvolutionProposal.create({
          title: proposal.title,
          source_type: proposal.source_type || 'task',
          source_id: proposal.source_id,
          source_name: proposal.source_name,
          what_was_learned: proposal.what_was_learned,
          what_can_be_automated: proposal.what_can_be_automated,
          what_should_never_happen_again: proposal.what_should_never_happen_again,
          what_documentation_should_be_updated: proposal.what_documentation_should_be_updated,
          what_new_canon_knowledge_exists: proposal.what_new_canon_knowledge_exists,
          which_ai_employee_became_smarter: proposal.which_ai_employee_became_smarter,
          which_workflow_became_faster: proposal.which_workflow_became_faster,
          proposed_improvement: proposal.proposed_improvement,
          proposed_action: proposal.proposed_action,
          business_value_score: proposal.business_value_score || 50,
          engineering_value_score: proposal.engineering_value_score || 50,
          customer_value_score: proposal.customer_value_score || 50,
          legal_value_score: proposal.legal_value_score || 50,
          revenue_impact_score: proposal.revenue_impact_score || 50,
          implementation_effort_score: proposal.implementation_effort_score || 50,
          risk_score: proposal.risk_score || 50,
          overall_score: proposal.overall_score || 50,
          priority: proposal.priority || 'medium',
          estimated_revenue_impact: proposal.estimated_revenue_impact || 0,
          estimated_time_savings_hours: proposal.estimated_time_savings_hours || 0,
          affected_modules: proposal.affected_modules || [],
          affected_agents: proposal.affected_agents || [],
          founder_alert: proposal.founder_alert || false,
          alert_reason: proposal.alert_reason || '',
          status: 'pending',
          approval_required: true,
          generated_by: 'NC Evolution Engine',
          generated_at: now,
          tags: []
        });
        createdProposals.push(created);

        await base44.asServiceRole.entities.ApprovalGate.create({
          title: `Evolution Proposal: ${proposal.title}`,
          description: proposal.proposed_action || proposal.proposed_improvement || '',
          approval_type: 'founder',
          risk_level: proposal.risk_score > 70 ? 'high' : proposal.risk_score > 40 ? 'medium' : 'low',
          status: 'pending',
          requested_by: 'NC Evolution Engine',
          entity_type: 'EvolutionProposal',
          entity_id: created.id,
          context: { overall_score: proposal.overall_score, priority: proposal.priority, source: proposal.source_name }
        }).catch(() => {});
      }

      return Response.json({
        operation: 'scan',
        scan_summary: llmRes.scan_summary,
        proposals_created: createdProposals.length,
        proposals: createdProposals
      });
    }

    // ─── DASHBOARD ───
    if (operation === 'dashboard') {
      const proposals = await base44.asServiceRole.entities.EvolutionProposal.list('-created_date', 200).catch(() => []);
      const pending = proposals.filter(p => p.status === 'pending');
      const approved = proposals.filter(p => p.status === 'approved' || p.status === 'implemented');
      const rejected = proposals.filter(p => p.status === 'rejected');
      const implemented = proposals.filter(p => p.status === 'implemented');
      const highPriority = proposals.filter(p => p.priority === 'high' || p.priority === 'critical');
      const founderAlerts = proposals.filter(p => p.founder_alert && p.status === 'pending');
      const avgOverall = proposals.length ? Math.round(proposals.reduce((s, p) => s + (p.overall_score || 0), 0) / proposals.length) : 0;
      const totalRevenueImpact = approved.reduce((s, p) => s + (p.estimated_revenue_impact || 0), 0);
      const totalTimeSaved = approved.reduce((s, p) => s + (p.estimated_time_savings_hours || 0), 0);

      return Response.json({
        operation: 'dashboard',
        metrics: {
          total_proposals: proposals.length,
          pending_count: pending.length,
          approved_count: approved.length,
          rejected_count: rejected.length,
          implemented_count: implemented.length,
          high_priority_count: highPriority.length,
          founder_alerts: founderAlerts.length,
          avg_overall_score: avgOverall,
          total_revenue_impact: totalRevenueImpact,
          total_time_saved: totalTimeSaved
        },
        pending_proposals: pending.sort((a, b) => (b.overall_score || 0) - (a.overall_score || 0)).slice(0, 20),
        recent_proposals: proposals.slice(0, 10)
      });
    }

    // ─── APPROVE: approve proposal, auto-create roadmap item ───
    if (operation === 'approve') {
      const proposal = await base44.asServiceRole.entities.EvolutionProposal.get(params.proposal_id);
      if (!proposal) return Response.json({ error: 'Proposal not found' }, { status: 404 });

      // Create roadmap item from the approved proposal
      let roadmapItem = null;
      try {
        roadmapItem = await base44.asServiceRole.entities.RoadmapItem.create({
          title: proposal.title,
          description: proposal.proposed_action || proposal.proposed_improvement || proposal.description || '',
          status: 'proposed',
          priority: proposal.priority || 'medium',
          category: 'evolution',
          impact_score: proposal.overall_score || 50,
          estimated_effort_hours: Math.round((proposal.implementation_effort_score || 50) / 10) * 10,
          tags: ['evolution', proposal.source_type],
          source: 'NC Evolution Engine',
          source_id: proposal.id
        });
      } catch (e) { /* RoadmapItem schema may differ */ }

      // Create engineering lesson from what was learned
      let lesson = null;
      try {
        lesson = await base44.asServiceRole.entities.EngineeringLesson.create({
          title: `Lesson: ${proposal.title}`,
          category: 'engineering',
          content: proposal.what_was_learned || '',
          key_takeaways: [proposal.what_was_learned || '', proposal.what_should_never_happen_again || ''].filter(Boolean),
          mistakes_to_avoid: [proposal.what_should_never_happen_again || ''].filter(Boolean),
          best_practices: [proposal.which_workflow_became_faster || ''].filter(Boolean),
          source_type: proposal.source_type || 'manual',
          source_id: proposal.source_id || '',
          source_name: proposal.source_name || '',
          status: 'active',
          auto_generated: true
        });
      } catch (e) { /* schema may differ */ }

      const updated = await base44.asServiceRole.entities.EvolutionProposal.update(params.proposal_id, {
        status: 'approved',
        approved_by: user.full_name || user.email || 'Founder',
        approved_at: now,
        roadmap_item_id: roadmapItem?.id || null,
        roadmap_item_created: !!roadmapItem,
        linked_lesson_ids: lesson ? [lesson.id] : []
      });

      return Response.json({ operation: 'approve', proposal: updated, roadmap_item: roadmapItem, lesson });
    }

    // ─── REJECT ───
    if (operation === 'reject') {
      const updated = await base44.asServiceRole.entities.EvolutionProposal.update(params.proposal_id, {
        status: 'rejected',
        rejected_reason: params.reason || 'Rejected by founder',
        founder_notes: params.notes || ''
      });
      return Response.json({ operation: 'reject', proposal: updated });
    }

    // ─── GET PROPOSAL ───
    if (operation === 'get_proposal') {
      const proposal = await base44.asServiceRole.entities.EvolutionProposal.get(params.proposal_id);
      return Response.json({ operation: 'get_proposal', proposal });
    }

    // ─── LIST PROPOSALS ───
    if (operation === 'list_proposals') {
      const filter = {};
      if (params.status) filter.status = params.status;
      if (params.priority) filter.priority = params.priority;
      const proposals = await base44.asServiceRole.entities.EvolutionProposal.filter(filter, '-overall_score', 100).catch(() => []);
      return Response.json({ operation: 'list_proposals', proposals, count: proposals.length });
    }

    return Response.json({ error: 'Unknown operation: ' + operation }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});