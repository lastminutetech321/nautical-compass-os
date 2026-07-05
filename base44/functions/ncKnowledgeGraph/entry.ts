import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { operation, params } = body;

    // Entity type → category mapping
    const CATEGORY_MAP = {
      'EnterpriseOrg': 'company', 'EnterpriseClone': 'company', 'Organization': 'company',
      'Team': 'department', 'TeamMember': 'person', 'User': 'person', 'Contact': 'person', 'CRMContact': 'customer',
      'AgentProfile': 'ai_employee',
      'Project': 'project', 'BuildProject': 'project', 'Epic': 'project',
      'Task': 'task', 'AgentTask': 'task', 'IssueTracker': 'task',
      'Evidence': 'evidence', 'VideoEvidence': 'evidence', 'Witness': 'evidence',
      'CaseFile': 'case', 'CaseTimeline': 'case',
      'CanonEntry': 'canon', 'LegalIssue': 'law', 'FOIARequest': 'law',
      'PlatformConfig': 'policy', 'AuthorityInteraction': 'policy',
      'Document': 'document',
      'RevenueEvent': 'revenue', 'Invoice': 'invoice', 'Subscription': 'subscription',
      'CRMLead': 'customer', 'CRMOpportunity': 'customer', 'CRMDeal': 'customer',
      'ApprovalGate': 'approval', 'DecisionRecord': 'approval',
      'BuildRegistry': 'build', 'Sprint': 'build', 'ADR': 'build',
      'MarketplaceModule': 'module', 'ModuleInstallation': 'module',
      'AIService': 'api', 'PlatformApplication': 'api',
      'Resource': 'other', 'ImprovementItem': 'other', 'RoadmapItem': 'other', 'Release': 'build',
    };

    const LEGAL_ENTITY_TYPES = ['CanonEntry', 'LegalIssue', 'FOIARequest', 'CaseFile', 'Evidence', 'VideoEvidence', 'AuthorityInteraction'];

    // Helper: fetch sample from entity
    const fetchSample = async (entityName, limit = 50) => {
      try { return await base44.asServiceRole.entities[entityName].list('-created_date', limit); }
      catch { return []; }
    };

    // Helper: find or create graph node
    const upsertNode = async (entityType, entityId, entityName, category, profile) => {
      const existing = await base44.asServiceRole.entities.GraphNode.filter({ entity_type: entityType, entity_id: entityId }, '-created_date', 1);
      if (existing.length > 0) {
        return await base44.asServiceRole.entities.GraphNode.update(existing[0].id, { ...profile, last_profiled: new Date().toISOString() });
      }
      return await base44.asServiceRole.entities.GraphNode.create({
        entity_type: entityType, entity_id: entityId, entity_name: entityName,
        entity_category: category, ...profile, last_profiled: new Date().toISOString(), is_active: true,
      });
    };

    // Helper: derive profile from entity fields
    const deriveProfile = (entityType, entity) => {
      const category = CATEGORY_MAP[entityType] || 'other';
      const name = entity.name || entity.title || entity.full_name || entity.clone_name || entity.subject || `${entityType} ${entity.id?.slice(-6)}`;
      const owner = entity.owner || entity.assigned_to || entity.assigned_agent || entity.responsible_party || entity.created_by_id || entity.requested_by || '';
      const riskLevel = entity.risk_level || entity.severity || entity.priority || (category === 'legal' || category === 'case' ? 'medium' : 'low');
      const completion = entity.completion_pct || entity.progress || entity.readiness_score || (entity.status === 'done' || entity.status === 'completed' || entity.status === 'released' ? 100 : entity.status === 'in_progress' ? 50 : 0);
      const financialImpact = entity.financial_impact || entity.estimated_revenue_impact || entity.price_monthly || entity.amount || entity.budget || 0;
      const legalImpact = LEGAL_ENTITY_TYPES.includes(entityType) ? 'high' : (entity.legal_impact || 'none');
      return { name, category, owner, riskLevel, completion, financialImpact, legalImpact, status: entity.status || '' };
    };

    // --- PROFILE ENTITY (create/update a GraphNode from entity data) ---
    if (operation === 'profile_entity') {
      const { entity_type, entity_id } = params;
      if (!entity_type || !entity_id) return Response.json({ error: 'entity_type and entity_id required' }, { status: 400 });

      let entity = null;
      try { entity = await base44.asServiceRole.entities[entity_type].get(entity_id); }
      catch { return Response.json({ error: 'Entity not found' }, { status: 404 }); }

      const p = deriveProfile(entity_type, entity);
      const node = await upsertNode(entity_type, entity_id, p.name, p.category, {
        owner: p.owner, risk_level: p.riskLevel, completion_pct: p.completion,
        financial_impact: p.financialImpact, legal_impact: p.legalImpact,
        status: p.status, description: (entity.description || entity.content || entity.purpose || '').slice(0, 500),
        tags: entity.tags || [], metadata: { original_status: entity.status, created_date: entity.created_date },
        profile_source: 'derived',
      });

      return Response.json({ node, operation: 'profile_entity' });
    }

    // --- BATCH PROFILE (profile multiple entities across types) ---
    if (operation === 'batch_profile') {
      const { entity_types } = params;
      const typesToProfile = entity_types || Object.keys(CATEGORY_MAP).slice(0, 15);
      const profiled = [];

      for (const et of typesToProfile) {
        const records = await fetchSample(et, 20);
        for (const entity of records) {
          try {
            const p = deriveProfile(et, entity);
            const node = await upsertNode(et, entity.id, p.name, p.category, {
              owner: p.owner, risk_level: p.riskLevel, completion_pct: p.completion,
              financial_impact: p.financialImpact, legal_impact: p.legalImpact,
              status: p.status, description: (entity.description || entity.content || entity.purpose || '').slice(0, 300),
              tags: entity.tags || [], profile_source: 'derived',
            });
            profiled.push({ id: node.id, name: node.entity_name, category: node.entity_category });
          } catch (e) { /* skip */ }
        }
      }

      return Response.json({ profiled_count: profiled.length, profiled, operation: 'batch_profile' });
    }

    // --- EXPLORE (get a node + its direct connections) ---
    if (operation === 'explore') {
      const { entity_type, entity_id } = params;
      if (!entity_type || !entity_id) return Response.json({ error: 'entity_type and entity_id required' }, { status: 400 });

      // Find or create the node profile
      let entity = null;
      try { entity = await base44.asServiceRole.entities[entity_type].get(entity_id); }
      catch { return Response.json({ error: 'Entity not found' }, { status: 404 }); }

      const p = deriveProfile(entity_type, entity);
      const centerNode = await upsertNode(entity_type, entity_id, p.name, p.category, {
        owner: p.owner, risk_level: p.riskLevel, completion_pct: p.completion,
        financial_impact: p.financialImpact, legal_impact: p.legalImpact,
        status: p.status, description: (entity.description || entity.content || entity.purpose || '').slice(0, 500),
        profile_source: 'derived',
      });

      // Get outgoing edges (what this depends on)
      const outgoing = await base44.asServiceRole.entities.RelationshipLink.filter({ source_entity_id: entity_id, status: 'active' }, '-strength', 50);
      // Get incoming edges (what depends on this)
      const incoming = await base44.asServiceRole.entities.RelationshipLink.filter({ target_entity_id: entity_id, status: 'active' }, '-strength', 50);

      // Resolve connected node profiles
      const connectionIds = new Set();
      [...outgoing, ...incoming].forEach(e => { connectionIds.add(e.source_entity_id); connectionIds.add(e.target_entity_id); });
      connectionIds.delete(entity_id);

      const connectedNodes = [];
      for (const cid of connectionIds) {
        const profiles = await base44.asServiceRole.entities.GraphNode.filter({ entity_id: cid }, '-created_date', 1);
        if (profiles.length > 0) connectedNodes.push(profiles[0]);
      }

      return Response.json({
        center_node: centerNode,
        outgoing: outgoing.map(e => ({ id: e.id, target_id: e.target_entity_id, target_name: e.target_entity_name, target_type: e.target_entity_type, relationship: e.relationship_type, strength: e.strength })),
        incoming: incoming.map(e => ({ id: e.id, source_id: e.source_entity_id, source_name: e.source_entity_name, source_type: e.source_entity_type, relationship: e.relationship_type, strength: e.strength })),
        connected_nodes: connectedNodes,
        operation: 'explore',
      });
    }

    // --- IMPACT ANALYSIS (blast radius — everything affected by changing this entity) ---
    if (operation === 'impact_analysis') {
      const { entity_type, entity_id, depth } = params;
      if (!entity_type || !entity_id) return Response.json({ error: 'entity_type and entity_id required' }, { status: 400 });

      const maxDepth = depth || 2;
      const visited = new Set([entity_id]);
      const affectedNodes = [];
      const affectedEdges = [];
      let currentLevel = [entity_id];

      for (let d = 0; d < maxDepth; d++) {
        const nextLevel = [];
        for (const eid of currentLevel) {
          // Find everything that depends on this (incoming edges = things that would break if this changes)
          const dependents = await base44.asServiceRole.entities.RelationshipLink.filter({ target_entity_id: eid, status: 'active' }, '-strength', 50);
          for (const dep of dependents) {
            if (!visited.has(dep.source_entity_id)) {
              visited.add(dep.source_entity_id);
              nextLevel.push(dep.source_entity_id);
              const profiles = await base44.asServiceRole.entities.GraphNode.filter({ entity_id: dep.source_entity_id }, '-created_date', 1);
              const profile = profiles[0] || {};
              affectedNodes.push({
                id: dep.source_entity_id, name: dep.source_entity_name, type: dep.source_entity_type,
                category: CATEGORY_MAP[dep.source_entity_type] || 'other', depth: d + 1,
                relationship: dep.relationship_type, risk_level: profile.risk_level || 'unknown',
                financial_impact: profile.financial_impact || 0, legal_impact: profile.legal_impact || 'none',
              });
              affectedEdges.push({ from: dep.source_entity_id, to: eid, type: dep.relationship_type, strength: dep.strength });
            }
          }
          // Also check what this depends on (outgoing — things it needs)
          const dependencies = await base44.asServiceRole.entities.RelationshipLink.filter({ source_entity_id: eid, status: 'active' }, '-strength', 50);
          for (const dep of dependencies) {
            if (!visited.has(dep.target_entity_id)) {
              visited.add(dep.target_entity_id);
              nextLevel.push(dep.target_entity_id);
              const profiles = await base44.asServiceRole.entities.GraphNode.filter({ entity_id: dep.target_entity_id }, '-created_date', 1);
              const profile = profiles[0] || {};
              affectedNodes.push({
                id: dep.target_entity_id, name: dep.target_entity_name, type: dep.target_entity_type,
                category: CATEGORY_MAP[dep.target_entity_type] || 'other', depth: d + 1,
                relationship: dep.relationship_type, risk_level: profile.risk_level || 'unknown',
                financial_impact: profile.financial_impact || 0, legal_impact: profile.legal_impact || 'none',
                direction: 'depends_on',
              });
              affectedEdges.push({ from: eid, to: dep.target_entity_id, type: dep.relationship_type, strength: dep.strength });
            }
          }
        }
        currentLevel = nextLevel;
        if (currentLevel.length === 0) break;
      }

      // Risk aggregation
      const riskCounts = { critical: 0, high: 0, medium: 0, low: 0, unknown: 0 };
      let totalFinancialImpact = 0;
      for (const n of affectedNodes) {
        riskCounts[n.risk_level] = (riskCounts[n.risk_level] || 0) + 1;
        totalFinancialImpact += n.financial_impact || 0;
      }

      return Response.json({
        impact: {
          affected_count: affectedNodes.length,
          affected_nodes: affectedNodes,
          affected_edges: affectedEdges,
          risk_summary: riskCounts,
          total_financial_impact: totalFinancialImpact,
          max_depth_reached: Math.min(maxDepth, affectedNodes.length > 0 ? maxDepth : 0),
          has_critical: riskCounts.critical > 0,
        },
        operation: 'impact_analysis',
      });
    }

    // --- AUTO CONNECT (AI discovers cross-entity-type relationships) ---
    if (operation === 'auto_connect') {
      const { entity_types, focus_entity_id } = params;

      // Gather samples from multiple entity types
      const typesToScan = entity_types || ['EnterpriseOrg', 'AgentProfile', 'Project', 'Task', 'BuildRegistry', 'CanonEntry', 'Evidence', 'CaseFile', 'CRMLead', 'Subscription', 'Invoice', 'ApprovalGate', 'MarketplaceModule', 'Document', 'Release'];
      const entityData = {};
      for (const et of typesToScan) {
        const records = await fetchSample(et, 15);
        entityData[et] = records.map(r => ({ id: r.id, name: r.name || r.title || r.full_name || r.clone_name || r.subject, desc: (r.description || r.content || r.purpose || '').slice(0, 150), category: r.category, status: r.status, tags: r.tags }));
      }

      const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `You are the NCOS Knowledge Graph Engine. Discover meaningful cross-entity relationships from this platform data.

Entity data by type:
${JSON.stringify(entityData).slice(0, 10000)}

Identify relationships ACROSS entity types (e.g., a Project depends_on a BuildRegistry, an AgentProfile owns a Task, a CaseFile references Evidence, a CanonEntry cites another CanonEntry, a Subscription generates_revenue for an EnterpriseOrg).

For each relationship: source_type, source_id, source_name, target_type, target_id, target_name, relationship_type (one of: depends_on, references, related_to, blocks, enables, supersedes, cites, owns, part_of, derives_from, supports, generated_by, consumes), strength (0-100), description, confidence (0-100).

Return up to 20 high-confidence relationships.`,
        response_json_schema: {
          type: "object",
          properties: {
            relationships: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  source_type: { type: "string" }, source_id: { type: "string" }, source_name: { type: "string" },
                  target_type: { type: "string" }, target_id: { type: "string" }, target_name: { type: "string" },
                  relationship_type: { type: "string" }, strength: { type: "number" },
                  description: { type: "string" }, confidence: { type: "number" },
                }
              }
            },
            summary: { type: "string" },
          }
        }
      });

      // Persist relationships + profile nodes
      const createdLinks = [];
      const createdNodes = [];
      if (result.relationships) {
        for (const rel of result.relationships.slice(0, 20)) {
          try {
            // Avoid duplicate relationships
            const existing = await base44.asServiceRole.entities.RelationshipLink.filter({
              source_entity_id: rel.source_id, target_entity_id: rel.target_id, relationship_type: rel.relationship_type
            }, '-created_date', 1);
            if (existing.length > 0) continue;

            const link = await base44.asServiceRole.entities.RelationshipLink.create({
              source_entity_type: rel.source_type, source_entity_id: rel.source_id, source_entity_name: rel.source_name,
              target_entity_type: rel.target_type, target_entity_id: rel.target_id, target_entity_name: rel.target_name,
              relationship_type: rel.relationship_type, strength: rel.strength || 50,
              description: rel.description, discovered_by: 'ai', confidence: rel.confidence || 50, status: 'active',
            });
            createdLinks.push(link);

            // Profile both nodes
            for (const side of [{ type: rel.source_type, id: rel.source_id, name: rel.source_name }, { type: rel.target_type, id: rel.target_id, name: rel.target_name }]) {
              const existingNode = await base44.asServiceRole.entities.GraphNode.filter({ entity_type: side.type, entity_id: side.id }, '-created_date', 1);
              if (existingNode.length === 0) {
                const node = await base44.asServiceRole.entities.GraphNode.create({
                  entity_type: side.type, entity_id: side.id, entity_name: side.name,
                  entity_category: CATEGORY_MAP[side.type] || 'other', profile_source: 'ai', is_active: true,
                });
                createdNodes.push(node);
              }
            }
          } catch (e) { /* skip */ }
        }
      }

      return Response.json({ result, created_links: createdLinks, created_nodes: createdNodes, operation: 'auto_connect' });
    }

    // --- SEARCH NODES ---
    if (operation === 'search_nodes') {
      const { query, category_filter } = params;
      if (!query) return Response.json({ results: [], operation: 'search_nodes' });

      const allNodes = await base44.asServiceRole.entities.GraphNode.list('-created_date', 500);
      const q = query.toLowerCase();
      let results = allNodes.filter(n =>
        (n.entity_name || '').toLowerCase().includes(q) ||
        (n.entity_type || '').toLowerCase().includes(q) ||
        (n.tags || []).some(t => t.toLowerCase().includes(q))
      );
      if (category_filter) results = results.filter(n => n.entity_category === category_filter);

      return Response.json({ results: results.slice(0, 30), operation: 'search_nodes' });
    }

    // --- GRAPH OVERVIEW ---
    if (operation === 'overview') {
      const [nodes, edges] = await Promise.all([
        base44.asServiceRole.entities.GraphNode.list('-created_date', 500),
        base44.asServiceRole.entities.RelationshipLink.filter({ status: 'active' }, '-created_date', 500),
      ]);

      const byCategory = {};
      const byRisk = { low: 0, medium: 0, high: 0, critical: 0 };
      let totalFinancial = 0;
      for (const n of nodes) {
        byCategory[n.entity_category] = (byCategory[n.entity_category] || 0) + 1;
        if (byRisk[n.risk_level] !== undefined) byRisk[n.risk_level]++;
        totalFinancial += n.financial_impact || 0;
      }

      const byRelType = {};
      for (const e of edges) {
        byRelType[e.relationship_type] = (byRelType[e.relationship_type] || 0) + 1;
      }

      // Connection count per node
      const connCount = {};
      for (const e of edges) {
        connCount[e.source_entity_id] = (connCount[e.source_entity_id] || 0) + 1;
        connCount[e.target_entity_id] = (connCount[e.target_entity_id] || 0) + 1;
      }

      const topConnected = Object.entries(connCount).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([id, count]) => ({
        id, connections: count, name: nodes.find(n => n.entity_id === id)?.entity_name || id.slice(-8),
      }));

      return Response.json({
        overview: {
          total_nodes: nodes.length, total_edges: edges.length,
          by_category: byCategory, by_risk: byRisk, by_relationship_type: byRelType,
          total_financial_impact: totalFinancial,
          high_risk_count: byRisk.high + byRisk.critical,
          top_connected: topConnected,
        },
        operation: 'overview',
      });
    }

    // --- ALL NODES (paginated list) ---
    if (operation === 'all_nodes') {
      const { category, limit } = params;
      const query = category ? { entity_category: category, is_active: true } : { is_active: true };
      const nodes = await base44.asServiceRole.entities.GraphNode.filter(query, '-created_date', limit || 100);
      return Response.json({ nodes, operation: 'all_nodes' });
    }

    return Response.json({ error: 'Unknown operation: ' + operation }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});