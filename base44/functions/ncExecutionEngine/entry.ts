import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Unified Execution Engine — converts approved intelligence into tracked work.
// POST { operation, ...params }
// operations: create_item | auto_create_from_insights | dispatch | update_status |
//             request_approval | approve | complete | get_queue | get_metrics | get_executive_view
const PROTECTED_ACTIONS = ['legal', 'governance', 'compensation', 'pricing', 'external_message', 'customer_charge', 'production_deployment', 'data_deletion', 'canon_change'];

function now() { return new Date().toISOString(); }
function today() { return new Date().toISOString().slice(0, 10); }
function isAdmin(u) { return u && (u.role === 'admin' || u.role === 'founder'); }

async function safeFilter(svc, entity, query, sort, limit) {
  try { return await svc.asServiceRole.entities[entity].filter(query, sort || '-created_date', limit || 200); } catch { return []; }
}
async function safeList(svc, entity, sort, limit) {
  try { return await svc.asServiceRole.entities[entity].list(sort || '-created_date', limit || 200); } catch { return []; }
}
function makeKey() { return 'EXEC-' + Date.now().toString(36).toUpperCase(); }

function isProtected(approvalCategory) {
  return PROTECTED_ACTIONS.includes(approvalCategory);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const operation = body.operation;
    const svc = base44;

    // ─── CREATE ITEM ───
    if (operation === 'create_item') {
      const p = body.params || body;
      const approvalRequired = p.approval_required !== undefined ? p.approval_required : isProtected(p.approval_category);
      const rec = {
        execution_key: p.execution_key || makeKey(),
        title: p.title,
        source_type: p.source_type || 'other',
        source_id: p.source_id || '',
        source_title: p.source_title || '',
        source_link: p.source_link || '',
        why_it_matters: p.why_it_matters || '',
        description: p.description || '',
        recommended_action: p.recommended_action || '',
        action_steps: p.action_steps || [],
        owner: p.owner || '',
        owner_id: p.owner_id || '',
        department: p.department || '',
        assigned_ai_agent: p.assigned_ai_agent || '',
        assigned_ai_agent_id: p.assigned_ai_agent_id || '',
        priority: p.priority || 'medium',
        due_date: p.due_date || '',
        dependencies: p.dependencies || [],
        dependency_ids: p.dependency_ids || [],
        blocked_by: [],
        approval_required: approvalRequired,
        approval_category: p.approval_category || 'none',
        approval_status: approvalRequired ? 'pending' : 'not_required',
        status: approvalRequired ? 'awaiting_approval' : 'queued',
        progress_pct: 0,
        expected_impact: p.expected_impact || '',
        expected_readiness_increase: p.expected_readiness_increase || 0,
        expected_revenue_impact: p.expected_revenue_impact || 0,
        actual_impact: '',
        actual_readiness_increase: 0,
        actual_revenue_impact: 0,
        outcome_match: 'pending',
        completion_evidence: [],
        lessons_learned: [],
        memory_records: [],
        knowledge_graph_updates: [],
        training_candidates: [],
        engineering_journal_entries: [],
        completion_verified: false,
        completed_at: '',
        auto_created: p.auto_created || false,
        tags: p.tags || [],
        notes: p.notes || ''
      };
      const created = await svc.asServiceRole.entities.ExecutionItem.create(rec);
      // If approval required, create an ApprovalGate
      if (approvalRequired) {
        try {
          const gate = await svc.asServiceRole.entities.ApprovalGate.create({
            gate_name: `Execution: ${p.title}`,
            approval_category: p.approval_category,
            status: 'pending',
            requested_by: user.full_name || user.email,
            description: p.why_it_matters,
            linked_entity_id: created.id,
            linked_entity_type: 'ExecutionItem'
          });
          await svc.asServiceRole.entities.ExecutionItem.update(created.id, { approval_gate_id: gate.id });
          rec.approval_gate_id = gate.id;
        } catch {}
      }
      return Response.json({ operation: 'create_item', execution_item: rec, id: created.id });
    }

    // ─── AUTO CREATE FROM INSIGHTS ─── (scans approved insights, findings, improvements)
    if (operation === 'auto_create_from_insights') {
      if (!isAdmin(user)) return Response.json({ error: 'Admin required for auto-creation' }, { status: 403 });
      const [insights, findings, improvements, canonGaps, customerRisks] = await Promise.all([
        safeFilter(svc, 'OrchestrationInsight', { status: 'approved', auto_applied: false }, '-priority_score', 30),
        safeFilter(svc, 'DiagnosticFinding', { status: { $in: ['detected', 'investigating'] }, approval_required: false }, '-detected_at', 30),
        safeFilter(svc, 'ImprovementItem', { status: 'approved', founder_approved: true }, '-strategic_priority_score', 30),
        safeFilter(svc, 'CanonVerification', { verification_status: 'gap_flagged', blocks_jurisengine: true }, '-created_date', 20),
        safeFilter(svc, 'CustomerSuccessProfile', { churn_risk_level: { $in: ['high', 'critical'] } }, '-updated_date', 10)
      ]);
      // Avoid duplicates: fetch existing execution items by source_id
      const existing = await safeList(svc, 'ExecutionItem', '-created_date', 200);
      const existingSourceIds = new Set(existing.map(e => e.source_id).filter(Boolean));
      const created = [];
      const tryCreate = async (src) => {
        if (existingSourceIds.has(src.source_id || src.id)) return null;
        try {
          const res = await svc.asServiceRole.integrations.Core.InvokeLLM({
            prompt: `Convert this ${src._type} into an execution item. Respond with ONLY a JSON object (no markdown): {"title": string, "why_it_matters": string, "recommended_action": string, "action_steps": array of strings, "expected_impact": string, "priority": "low"|"medium"|"high"|"critical", "approval_category": "none"|"legal"|"governance"|"compensation"|"pricing"|"external_message"|"customer_charge"|"production_deployment"|"data_deletion"|"canon_change"|"general", "expected_readiness_increase": number, "expected_revenue_impact": number}.\nSource: ${JSON.stringify({ title: src.title, description: src.description || src.recommended_fix || src.recommended_action || src.why_it_matters || src.gap_reason, root_cause: src.root_cause, affected: src.affected_modules || src.affected_entities })}`
          });
          let p = {};
          try { p = typeof res === 'string' ? JSON.parse(res) : res; } catch {}
          const r = await base44.functions.invoke('ncExecutionEngine', {
            operation: 'create_item',
            params: {
              title: p.title || src.title,
              source_type: src._type,
              source_id: src.id,
              source_title: src.title,
              why_it_matters: p.why_it_matters || src.why_it_matters || src.description || '',
              recommended_action: p.recommended_action || src.recommended_action || src.recommended_fix || '',
              action_steps: p.action_steps || [],
              expected_impact: p.expected_impact || src.expected_impact || src.what_it_unlocks || '',
              priority: p.priority || src.priority || 'medium',
              approval_category: p.approval_category || (src._type === 'canon_gap' ? 'legal' : 'none'),
              expected_readiness_increase: p.expected_readiness_increase || src.readiness_increase_pct || 0,
              expected_revenue_impact: p.expected_revenue_impact || src.estimated_revenue_impact || 0,
              auto_created: true,
              tags: ['auto']
            }
          });
          created.push({ source_id: src.id, title: p.title || src.title, execution_id: r?.data?.id || null });
        } catch (e) { /* skip */ }
      };
      for (const i of insights) { i._type = 'orchestration_insight'; i.source_id = i.id; await tryCreate(i); }
      for (const f of findings) { f._type = 'diagnostic_finding'; f.source_id = f.id; await tryCreate(f); }
      for (const im of improvements) { im._type = 'improvement_item'; im.source_id = im.id; await tryCreate(im); }
      for (const cg of canonGaps) { cg._type = 'canon_gap'; cg.source_id = cg.id; cg.title = `Resolve Canon Gap: ${cg.canon_title}`; await tryCreate(cg); }
      for (const cr of customerRisks) { cr._type = 'customer_success_risk'; cr.source_id = cr.id; cr.title = `Retain at-risk customer: ${cr.customer_name}`; cr.description = `Churn risk: ${cr.churn_risk_level}`; await tryCreate(cr); }
      return Response.json({ operation: 'auto_create_from_insights', scanned: { insights: insights.length, findings: findings.length, improvements: improvements.length, canon_gaps: canonGaps.length, customer_risks: customerRisks.length }, created: created.length, items: created });
    }

    // ─── DISPATCH ───
    if (operation === 'dispatch') {
      const { execution_id, owner, owner_id, department, assigned_ai_agent, due_date } = body;
      const e = await svc.asServiceRole.entities.ExecutionItem.get(execution_id);
      if (!e) return Response.json({ error: 'not found' }, { status: 404 });
      if (e.approval_required && e.approval_status !== 'approved') return Response.json({ error: 'Cannot dispatch — approval required first' }, { status: 400 });
      const updates = { owner: owner || e.owner, owner_id: owner_id || e.owner_id, department: department || e.department, assigned_ai_agent: assigned_ai_agent || e.assigned_ai_agent, due_date: due_date || e.due_date, status: 'dispatched' };
      await svc.asServiceRole.entities.ExecutionItem.update(execution_id, updates);
      return Response.json({ operation: 'dispatch', execution_id, updates });
    }

    // ─── UPDATE STATUS ───
    if (operation === 'update_status') {
      const { execution_id, status, progress_pct, note } = body;
      const e = await svc.asServiceRole.entities.ExecutionItem.get(execution_id);
      if (!e) return Response.json({ error: 'not found' }, { status: 404 });
      const updates = { status, progress_pct: progress_pct !== undefined ? progress_pct : e.progress_pct };
      if (status === 'blocked' && note) updates.blocked_by = [...(e.blocked_by || []), note];
      await svc.asServiceRole.entities.ExecutionItem.update(execution_id, updates);
      return Response.json({ operation: 'update_status', execution_id, updates });
    }

    // ─── REQUEST APPROVAL ───
    if (operation === 'request_approval') {
      const { execution_id, approval_category } = body;
      const e = await svc.asServiceRole.entities.ExecutionItem.get(execution_id);
      if (!e) return Response.json({ error: 'not found' }, { status: 404 });
      const cat = approval_category || e.approval_category || 'general';
      const gate = await svc.asServiceRole.entities.ApprovalGate.create({
        gate_name: `Execution: ${e.title}`,
        approval_category: cat,
        status: 'pending',
        requested_by: user.full_name || user.email,
        description: e.why_it_matters,
        linked_entity_id: execution_id,
        linked_entity_type: 'ExecutionItem'
      });
      await svc.asServiceRole.entities.ExecutionItem.update(execution_id, { approval_required: true, approval_category: cat, approval_status: 'pending', approval_gate_id: gate.id, status: 'awaiting_approval' });
      return Response.json({ operation: 'request_approval', gate_id: gate.id });
    }

    // ─── APPROVE (Founder/Admin) ───
    if (operation === 'approve') {
      const { execution_id } = body;
      if (!isAdmin(user)) return Response.json({ error: 'Founder/Admin approval required' }, { status: 403 });
      const e = await svc.asServiceRole.entities.ExecutionItem.get(execution_id);
      if (!e) return Response.json({ error: 'not found' }, { status: 404 });
      await svc.asServiceRole.entities.ExecutionItem.update(execution_id, { approval_status: 'approved', approved_by: user.full_name || user.email, approved_at: now(), status: 'queued' });
      if (e.approval_gate_id) { try { await svc.asServiceRole.entities.ApprovalGate.update(e.approval_gate_id, { status: 'approved', approved_by: user.full_name || user.email, approved_at: now() }); } catch {} }
      return Response.json({ operation: 'approve', execution_id });
    }

    // ─── COMPLETE (with outcome comparison + memory writes) ───
    if (operation === 'complete') {
      const { execution_id, actual_impact, actual_readiness_increase, actual_revenue_impact, outcome_match, completion_evidence, lessons_learned } = body;
      const e = await svc.asServiceRole.entities.ExecutionItem.get(execution_id);
      if (!e) return Response.json({ error: 'not found' }, { status: 404 });
      // Determine outcome match if not provided
      let match = outcome_match;
      if (!match) {
        const expR = e.expected_readiness_increase || 0;
        const actR = actual_readiness_increase || 0;
        if (actR >= expR * 1.1) match = 'exceeded';
        else if (actR >= expR * 0.8) match = 'met';
        else if (actR > 0) match = 'partial';
        else match = 'missed';
      }
      const memoryIds = [];
      // Write to Enterprise Memory (MemoryTimelineEntry)
      try {
        const mem = await svc.asServiceRole.entities.MemoryTimelineEntry.create({
          entry_date: today(),
          entry_type: 'decision',
          title: `Execution completed: ${e.title}`,
          description: `Source: ${e.source_type}. Expected: ${e.expected_impact}. Actual: ${actual_impact || ''}. Outcome: ${match}. Lessons: ${(lessons_learned || []).join('; ')}`,
          linked_department: e.department,
          linked_project: e.source_id,
          memory_target: 'enterprise_memory',
          is_traceable: true,
          confidence_score: match === 'met' || match === 'exceeded' ? 85 : 60,
          ai_generated: true,
          searchable_text: `${e.title} ${e.why_it_matters} ${actual_impact || ''} ${match}`,
          tags: ['execution', e.source_type, match]
        });
        memoryIds.push(mem.id);
      } catch {}
      // Write to Knowledge Graph (KnowledgeNode) if relevant
      let kgNodeId = null;
      try {
        const kn = await svc.asServiceRole.entities.KnowledgeNode.create({
          node_key: 'exec_' + e.id,
          node_type: 'decision',
          node_label: e.title,
          node_description: `${e.why_it_matters} Outcome: ${match}`,
          connections: [],
          is_unresolved: false,
          tags: ['execution', e.source_type]
        });
        kgNodeId = kn.id;
      } catch {}
      // Engineering Journal if engineering-related
      let ejId = null;
      if (e.source_type === 'diagnostic_finding' || e.source_type === 'improvement_item' || e.department === 'engineering') {
        try {
          const ej = await svc.asServiceRole.entities.EngineeringJournal.create({
            title: `Execution: ${e.title}`,
            entry_type: 'execution_outcome',
            summary: `Outcome: ${match}. Expected: ${e.expected_impact}. Actual: ${actual_impact || ''}.`,
            lessons: lessons_learned || [],
            linked_execution_id: e.id,
            tags: ['execution']
          });
          ejId = ej.id;
        } catch {}
      }
      const updates = {
        status: 'completed',
        progress_pct: 100,
        actual_impact: actual_impact || '',
        actual_readiness_increase: actual_readiness_increase || 0,
        actual_revenue_impact: actual_revenue_impact || 0,
        outcome_match: match,
        completion_evidence: completion_evidence || [],
        lessons_learned: lessons_learned || [],
        memory_records: memoryIds,
        knowledge_graph_updates: kgNodeId ? [{ node_id: kgNodeId, type: 'execution_outcome' }] : [],
        engineering_journal_entries: ejId ? [ejId] : [],
        completion_verified: true,
        completion_verified_by: user.full_name || user.email,
        completed_at: now()
      };
      await svc.asServiceRole.entities.ExecutionItem.update(execution_id, updates);
      return Response.json({ operation: 'complete', execution_id, outcome_match: match, memory_ids: memoryIds, knowledge_node_id: kgNodeId, engineering_journal_id: ejId });
    }

    // ─── GET QUEUE ───
    if (operation === 'get_queue') {
      const { status_filter, priority_filter, source_type_filter, limit = 100 } = body;
      const query = {};
      if (status_filter) query.status = status_filter;
      if (priority_filter) query.priority = priority_filter;
      if (source_type_filter) query.source_type = source_type_filter;
      const queue = await safeFilter(svc, 'ExecutionItem', query, '-created_date', limit);
      return Response.json({ operation: 'get_queue', queue });
    }

    // ─── GET METRICS ───
    if (operation === 'get_metrics') {
      const all = await safeList(svc, 'ExecutionItem', '-created_date', 500);
      const now30 = Date.now() - 30 * 86400000;
      const recent = all.filter(e => new Date(e.created_date || 0).getTime() > now30);
      const completed = all.filter(e => e.status === 'completed');
      const metrics = {
        total: all.length,
        queued: all.filter(e => e.status === 'queued').length,
        dispatched: all.filter(e => e.status === 'dispatched').length,
        in_progress: all.filter(e => e.status === 'in_progress').length,
        blocked: all.filter(e => e.status === 'blocked').length,
        awaiting_approval: all.filter(e => e.status === 'awaiting_approval').length,
        completed: completed.length,
        failed: all.filter(e => e.status === 'failed').length,
        founder_approvals_waiting: all.filter(e => e.approval_required && e.approval_status === 'pending').length,
        velocity_30d: recent.filter(e => e.status === 'completed').length,
        completion_rate: all.length ? Math.round((completed.length / all.length) * 100) : 0,
        expected_readiness_total: all.reduce((s, e) => s + (e.expected_readiness_increase || 0), 0),
        actual_readiness_total: completed.reduce((s, e) => s + (e.actual_readiness_increase || 0), 0),
        expected_revenue_total: all.reduce((s, e) => s + (e.expected_revenue_impact || 0), 0),
        actual_revenue_total: completed.reduce((s, e) => s + (e.actual_revenue_impact || 0), 0),
        outcome_breakdown: {
          exceeded: completed.filter(e => e.outcome_match === 'exceeded').length,
          met: completed.filter(e => e.outcome_match === 'met').length,
          partial: completed.filter(e => e.outcome_match === 'partial').length,
          missed: completed.filter(e => e.outcome_match === 'missed').length,
          failed: completed.filter(e => e.outcome_match === 'failed').length
        }
      };
      return Response.json({ operation: 'get_metrics', metrics });
    }

    // ─── GET EXECUTIVE VIEW (for Executive Command) ───
    if (operation === 'get_executive_view') {
      const all = await safeList(svc, 'ExecutionItem', '-created_date', 200);
      const highPriority = all.filter(e => (e.priority === 'high' || e.priority === 'critical') && e.status !== 'completed' && e.status !== 'cancelled').sort((a, b) => (a.priority === 'critical' ? 0 : 1) - (b.priority === 'critical' ? 0 : 1)).slice(0, 8);
      const blocked = all.filter(e => e.status === 'blocked').slice(0, 5);
      const founderApprovals = all.filter(e => e.approval_required && e.approval_status === 'pending').slice(0, 8);
      const completed = all.filter(e => e.status === 'completed');
      const exec = {
        high_priority: highPriority,
        blocked,
        founder_approvals_waiting: founderApprovals,
        velocity_30d: all.filter(e => e.status === 'completed' && new Date(e.completed_at || 0).getTime() > Date.now() - 30 * 86400000).length,
        completion_rate: all.length ? Math.round((completed.length / all.length) * 100) : 0,
        expected_readiness_increase: all.filter(e => e.status !== 'completed').reduce((s, e) => s + (e.expected_readiness_increase || 0), 0),
        expected_revenue_impact: all.filter(e => e.status !== 'completed').reduce((s, e) => s + (e.expected_revenue_impact || 0), 0),
        total_active: all.filter(e => e.status !== 'completed' && e.status !== 'cancelled').length
      };
      return Response.json({ operation: 'get_executive_view', executive_view: exec });
    }

    return Response.json({ error: 'unknown operation: ' + operation }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});