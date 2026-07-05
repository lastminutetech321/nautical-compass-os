import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const operation = body.operation || 'sync_all';
    const b = base44.asServiceRole.entities;

    if (operation === 'sync_all') {
      const [healthScores, findings, csProfiles, canonGaps, agents, subscriptions] = await Promise.all([
        b.SystemHealthScore.list('-created_date', 10),
        b.DiagnosticFinding.filter({ status: { $in: ['detected', 'investigating'] } }, '-created_date', 10),
        b.CustomerSuccessProfile.filter({ status: 'active' }, '-created_date', 10),
        b.CanonEntry.filter({ is_canon_gap: true }, '-created_date', 10),
        b.AgentProfile.filter({ status: 'active' }, '-created_date', 10),
        b.Subscription.filter({ status: { $in: ['active', 'trialing'] } }, '-created_date', 10)
      ]);

      const created = [];

      for (const hs of healthScores) {
        const node = await upsertNode(b, `health_${hs.entity_type}_${hs.id}`, 'concept', `Health: ${hs.entity_name || hs.entity_type} (${hs.score})`, {
          source_entity_id: hs.id, source_entity_type: 'SystemHealthScore',
          importance: hs.status === 'critical' || hs.status === 'at_risk' ? 'high' : 'medium',
          linked_node_ids: [], tags: ['health_score', hs.entity_type]
        });
        if (node) created.push(node);
      }

      for (const f of findings) {
        const node = await upsertNode(b, `finding_${f.id}`, 'concept', `Finding: ${f.title}`, {
          source_entity_id: f.id, source_entity_type: 'DiagnosticFinding',
          importance: f.severity === 'critical' ? 'critical' : f.severity === 'high' ? 'high' : 'medium',
          linked_node_ids: [], tags: ['diagnostic', f.finding_type]
        });
        if (node) created.push(node);
      }

      for (const cs of csProfiles) {
        const node = await upsertNode(b, `cs_${cs.id}`, 'company', `CS: ${cs.customer_name}`, {
          source_entity_id: cs.id, source_entity_type: 'CustomerSuccessProfile',
          importance: cs.churn_risk_level === 'critical' ? 'critical' : 'medium',
          linked_node_ids: cs.subscription_id ? [`sub_${cs.subscription_id}`] : [],
          tags: ['customer_success', cs.health_status]
        });
        if (node) created.push(node);
      }

      for (const cg of canonGaps) {
        const node = await upsertNode(b, `canongap_${cg.id}`, 'law', `Canon Gap: ${cg.title}`, {
          source_entity_id: cg.id, source_entity_type: 'CanonEntry',
          importance: 'high',
          linked_node_ids: [], tags: ['canon_gap', cg.category || '']
        });
        if (node) created.push(node);
      }

      for (const agent of agents) {
        const node = await upsertNode(b, `agent_${agent.id}`, 'agent', `Agent: ${agent.name}`, {
          source_entity_id: agent.id, source_entity_type: 'AgentProfile',
          importance: 'medium',
          linked_node_ids: [], tags: ['agent', agent.status]
        });
        if (node) created.push(node);
      }

      for (const sub of subscriptions) {
        const node = await upsertNode(b, `sub_${sub.id}`, 'company', `Sub: ${sub.customer_name || sub.plan_name || ''}`, {
          source_entity_id: sub.id, source_entity_type: 'Subscription',
          importance: 'medium',
          linked_node_ids: [], tags: ['subscription', sub.status]
        });
        if (node) created.push(node);
      }

      return Response.json({
        operation, nodes_created_or_updated: created.length,
        by_type: {
          health_scores: healthScores.length, findings: findings.length,
          cs_profiles: csProfiles.length, canon_gaps: canonGaps.length,
          agents: agents.length, subscriptions: subscriptions.length
        }
      });
    }

    if (operation === 'sync_entity') {
      const { entity_type, entity_id } = body.params;
      const data = await b[entity_type].get(entity_id);
      if (!data) return Response.json({ error: 'Entity not found' }, { status: 404 });
      const node = await upsertNode(b, `${entity_type}_${entity_id}`, 'concept', data.name || data.title || data.customer_name || entity_id, {
        source_entity_id: entity_id, source_entity_type: entity_type,
        linked_node_ids: [], tags: [entity_type]
      });
      return Response.json({ operation, node });
    }

    return Response.json({ error: 'Unknown operation' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function upsertNode(b, nodeKey, nodeType, title, props) {
  const existing = await b.KnowledgeNode.filter({ source_entity_id: props.source_entity_id, source_entity_type: props.source_entity_type });
  if (existing.length > 0) {
    return await b.KnowledgeNode.update(existing[0].id, { title, node_type: nodeType, ...props });
  }
  return await b.KnowledgeNode.create({ title, node_type: nodeType, ...props });
}