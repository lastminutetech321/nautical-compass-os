import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const svc = base44.asServiceRole;

    const body = await req.json().catch(() => ({}));
    const operation = body.operation || 'dashboard';
    const params = body.params || {};

    const safeList = async (entity, sort = '-created_date', limit = 50) => {
      try { return await svc.entities[entity].list(sort, limit); } catch { return []; }
    };
    const safeFilter = async (entity, query, sort = '-created_date', limit = 50) => {
      try { return await svc.entities[entity].filter(query, sort, limit); } catch { return []; }
    };
    const safeGet = async (entity, id) => {
      try { return await svc.entities[entity].get(id); } catch { return null; }
    };

    // === CONSTITUTION ===
    if (operation === 'getConstitution') {
      const principles = await safeFilter('NCConstitution', { status: 'active' }, 'sort_order', 100);
      return Response.json({ principles });
    }

    if (operation === 'createPrinciple') {
      const p = await svc.entities.NCConstitution.create({
        ...params,
        status: params.requires_founder_approval && user.role !== 'admin' ? 'proposed' : 'active',
        approved_by: user.role === 'admin' ? user.full_name : undefined,
        approved_at: user.role === 'admin' ? new Date().toISOString() : undefined
      });
      return Response.json({ principle: p });
    }

    if (operation === 'amendPrinciple') {
      const existing = await safeGet('NCConstitution', params.id);
      if (!existing) return Response.json({ error: 'Not found' }, { status: 404 });
      if (existing.requires_founder_approval && user.role !== 'admin')
        return Response.json({ error: 'Founder approval required to amend this principle' }, { status: 403 });
      const history = existing.amendment_history || [];
      history.push({ version: existing.version, principle_text: existing.principle_text, modified_at: new Date().toISOString(), modified_by: user.full_name });
      const updated = await svc.entities.NCConstitution.update(params.id, {
        ...params.updates,
        version: (existing.version || 1) + 1,
        amendment_history: history,
        approved_by: user.full_name,
        approved_at: new Date().toISOString()
      });
      return Response.json({ principle: updated });
    }

    // === POLICIES ===
    if (operation === 'getPolicies') {
      const policies = await safeFilter('GovernancePolicy', { status: 'active' }, '-updated_date', 100);
      return Response.json({ policies });
    }

    if (operation === 'createPolicy') {
      const p = await svc.entities.GovernancePolicy.create({
        ...params,
        status: user.role === 'admin' ? (params.status || 'active') : 'pending_approval',
        version: 1,
        approved_by: user.role === 'admin' ? user.full_name : undefined,
        approved_at: user.role === 'admin' ? new Date().toISOString() : undefined
      });
      return Response.json({ policy: p });
    }

    if (operation === 'updatePolicy') {
      const existing = await safeGet('GovernancePolicy', params.id);
      if (!existing) return Response.json({ error: 'Not found' }, { status: 404 });
      const history = existing.history || [];
      history.push({ version: existing.version, rules: existing.rules, modified_at: new Date().toISOString(), modified_by: user.full_name });
      const updated = await svc.entities.GovernancePolicy.update(params.id, {
        ...params.updates,
        version: (existing.version || 1) + 1,
        history
      });
      return Response.json({ policy: updated });
    }

    // === FOUNDER CONFIGURATION ===
    if (operation === 'getConfigurations') {
      const configs = await safeFilter('FounderConfiguration', { status: 'active' }, 'category', 200);
      return Response.json({ configs });
    }

    if (operation === 'updateConfiguration') {
      const existing = await safeFilter('FounderConfiguration', { config_key: params.config_key, status: 'active' });
      if (existing.length > 0) {
        const cfg = existing[0];
        const history = cfg.history || [];
        history.push({ version: cfg.version, value: cfg.value, modified_at: new Date().toISOString(), modified_by: user.full_name });
        const updated = await svc.entities.FounderConfiguration.update(cfg.id, {
          value: params.value,
          version: (cfg.version || 1) + 1,
          last_modified_by: user.full_name,
          last_modified_at: new Date().toISOString(),
          history,
          status: user.role === 'admin' ? 'active' : 'draft'
        });
        return Response.json({ config: updated });
      }
      const created = await svc.entities.FounderConfiguration.create({
        config_key: params.config_key,
        category: params.category || 'compensation',
        value: params.value,
        default_value: params.default_value || params.value,
        description: params.description || '',
        data_type: params.data_type || 'object',
        version: 1,
        status: user.role === 'admin' ? 'active' : 'draft',
        last_modified_by: user.full_name,
        last_modified_at: new Date().toISOString(),
        requires_founder_approval: params.requires_founder_approval !== false
      });
      return Response.json({ config: created });
    }

    // === COMPENSATION ===
    if (operation === 'getCompensationRules') {
      const rules = await safeFilter('CompensationRule', { status: 'active' }, 'role', 50);
      return Response.json({ rules });
    }

    if (operation === 'calculateCompensation') {
      const rules = await safeFilter('CompensationRule', { role: params.role, status: 'active' });
      if (rules.length === 0) return Response.json({ error: 'No active compensation rule for this role' }, { status: 404 });
      const rule = rules[0];
      const base = params.base_amount || 0;
      const perf = base * (rule.performance_adjustment_pct / 100) * (params.performance_multiplier || 1);
      const contrib = base * (rule.contribution_adjustment_pct / 100) * (params.contribution_multiplier || 1);
      const leader = base * (rule.leadership_adjustment_pct / 100) * (params.leadership_multiplier || 1);
      const innov = base * (rule.innovation_adjustment_pct / 100) * (params.innovation_multiplier || 1);
      const retain = base * (rule.retention_adjustment_pct / 100) * (params.retention_multiplier || 1);
      const ent = base * (rule.enterprise_adjustment_pct / 100) * (params.enterprise_multiplier || 1);
      const special = base * (rule.special_assignment_adjustment_pct / 100) * (params.special_assignment_multiplier || 1);
      let total = base + perf + contrib + leader + innov + retain + ent + special;
      if (rule.temporary_incentive_pct > 0) {
        const now = new Date();
        const start = rule.incentive_start_date ? new Date(rule.incentive_start_date) : null;
        const end = rule.incentive_end_date ? new Date(rule.incentive_end_date) : null;
        if ((!start || now >= start) && (!end || now <= end)) total += base * (rule.temporary_incentive_pct / 100);
      }
      if (rule.max_compensation_cap > 0 && total > rule.max_compensation_cap) total = rule.max_compensation_cap;
      return Response.json({
        base_residual: base,
        adjustments: { performance: perf, contribution: contrib, leadership: leader, innovation: innov, retention: retain, enterprise: ent, special_assignment: special },
        total,
        capped: rule.max_compensation_cap > 0 && total >= rule.max_compensation_cap,
        rule_name: rule.rule_name,
        explanation: `Base $${base} + performance $${perf.toFixed(2)} + contribution $${contrib.toFixed(2)} + leadership $${leader.toFixed(2)} + innovation $${innov.toFixed(2)} + retention $${retain.toFixed(2)} + enterprise $${ent.toFixed(2)} + special $${special.toFixed(2)} = $${total.toFixed(2)}${rule.max_compensation_cap > 0 ? ` (cap: $${rule.max_compensation_cap})` : ''}`
      });
    }

    // === CONTRIBUTION SCORING ===
    if (operation === 'calculateContribution') {
      const configs = await safeFilter('FounderConfiguration', { category: 'contribution', status: 'active' });
      const weights = {};
      configs.forEach(c => { weights[c.config_key] = c.value?.weight || 1; });
      const categories = (params.categories || []).map(cat => {
        const weight = weights[cat.category] || cat.weight || 1;
        const weighted = (cat.raw_score || 0) * weight;
        return { ...cat, weight, weighted_score: weighted };
      });
      const total = categories.reduce((sum, c) => sum + c.weighted_score, 0);
      const record = await svc.entities.ContributionScore.create({
        participant_name: params.participant_name,
        participant_id: params.participant_id,
        participant_type: params.participant_type || 'member',
        evaluation_period: params.evaluation_period || new Date().toISOString().slice(0, 7),
        categories,
        total_score: total,
        max_possible_score: params.max_possible_score || 100,
        score_explanation: `Scored across ${categories.length} categories using configurable weights. Total weighted score: ${total}`,
        evaluated_by: user.full_name,
        evaluated_at: new Date().toISOString()
      });
      return Response.json({ score: record });
    }

    // === TRUST ENGINE ===
    if (operation === 'getTrustScores') {
      const scores = await safeFilter('TrustScore', params.query || {}, '-updated_date', 50);
      return Response.json({ scores });
    }

    if (operation === 'updateTrustScore') {
      const existing = await safeFilter('TrustScore', { entity_type: params.entity_type, entity_id: params.entity_id });
      if (existing.length > 0) {
        const ts = existing[0];
        const history = ts.score_history || [];
        history.push({ score: ts.score, date: ts.last_evaluated, evaluated_by: ts.evaluated_by });
        const trend = params.score > ts.score ? 'improving' : params.score < ts.score ? 'declining' : 'stable';
        const updated = await svc.entities.TrustScore.update(ts.id, {
          score: params.score,
          criteria: params.criteria || ts.criteria,
          breakdown: params.breakdown || ts.breakdown,
          trend,
          score_history: history,
          last_evaluated: new Date().toISOString(),
          evaluated_by: user.full_name,
          notes: params.notes || ts.notes
        });
        return Response.json({ trust: updated });
      }
      const created = await svc.entities.TrustScore.create({
        entity_type: params.entity_type,
        entity_id: params.entity_id,
        entity_name: params.entity_name,
        trust_type: params.trust_type || 'general',
        score: params.score,
        criteria: params.criteria || [],
        breakdown: params.breakdown || {},
        trend: 'new',
        score_history: [],
        last_evaluated: new Date().toISOString(),
        evaluated_by: user.full_name,
        notes: params.notes || ''
      });
      return Response.json({ trust: created });
    }

    // === REPUTATION ===
    if (operation === 'getReputation') {
      const records = await safeFilter('ReputationRecord', params.query || {}, '-updated_date', 50);
      return Response.json({ records });
    }

    // === PROMOTION ===
    if (operation === 'getPromotionPathways') {
      const pathways = await safeFilter('PromotionPathway', { status: 'active' }, 'name', 50);
      return Response.json({ pathways });
    }

    if (operation === 'checkPromotionEligibility') {
      const pathways = await safeFilter('PromotionPathway', { from_role: params.current_role, status: 'active' });
      const trustScores = await safeFilter('TrustScore', { entity_id: params.entity_id, entity_type: params.entity_type || 'member' });
      const trustScore = trustScores[0]?.score || 0;
      const results = pathways.map(p => ({
        pathway: p,
        eligible: (!p.trust_score_required || trustScore >= p.trust_score_required),
        trust_score: trustScore,
        requirements_met: p.trust_score_required ? trustScore >= p.trust_score_required : true,
        requirements_remaining: p.trust_score_required ? Math.max(0, p.trust_score_required - trustScore) : 0,
        founder_override_available: p.founder_override_allowed
      }));
      return Response.json({ eligibility: results });
    }

    // === ETHICS ===
    if (operation === 'getEthicsIncidents') {
      const incidents = await safeFilter('EthicsIncident', params.query || { status: { $ne: 'archived' } }, '-created_date', 50);
      return Response.json({ incidents });
    }

    if (operation === 'reportEthicsIncident') {
      const incident = await svc.entities.EthicsIncident.create({
        ...params,
        detected_by: params.detected_by || user.full_name,
        detected_at: new Date().toISOString(),
        status: 'detected',
        founder_alert_required: params.severity === 'critical'
      });
      return Response.json({ incident });
    }

    // === SPECIAL ASSIGNMENTS ===
    if (operation === 'getSpecialAssignments') {
      const assignments = await safeFilter('SpecialAssignment', params.query || { status: { $ne: 'completed' } }, '-created_date', 50);
      return Response.json({ assignments });
    }

    if (operation === 'createSpecialAssignment') {
      const assignment = await svc.entities.SpecialAssignment.create({
        ...params,
        created_by: user.full_name,
        status: params.is_template ? 'template' : 'proposed'
      });
      return Response.json({ assignment });
    }

    // === GOVERNANCE DASHBOARD ===
    const constitution = await safeFilter('NCConstitution', { status: 'active' }, 'sort_order', 100);
    const policies = await safeFilter('GovernancePolicy', { status: 'active' }, '-updated_date', 50);
    const configurations = await safeFilter('FounderConfiguration', { status: 'active' }, 'category', 100);
    const compensationRules = await safeFilter('CompensationRule', { status: 'active' }, 'role', 50);
    const trustScores = await safeList('TrustScore', '-updated_date', 20);
    const ethicsIncidents = await safeFilter('EthicsIncident', { status: { $ne: 'archived' } }, '-created_date', 20);
    const specialAssignments = await safeFilter('SpecialAssignment', { status: { $ne: 'completed' } }, '-created_date', 20);
    const promotionPathways = await safeFilter('PromotionPathway', { status: 'active' }, 'name', 20);
    const reputationRecords = await safeList('ReputationRecord', '-updated_date', 20);

    return Response.json({
      constitution_count: constitution.length,
      policy_count: policies.length,
      configuration_count: configurations.length,
      compensation_rule_count: compensationRules.length,
      trust_score_count: trustScores.length,
      ethics_incident_count: ethicsIncidents.length,
      open_ethics_incidents: ethicsIncidents.filter(i => i.status === 'detected' || i.status === 'investigating').length,
      critical_ethics_incidents: ethicsIncidents.filter(i => i.severity === 'critical' && i.status !== 'resolved').length,
      special_assignment_count: specialAssignments.length,
      promotion_pathway_count: promotionPathways.length,
      reputation_record_count: reputationRecords.length,
      constitution,
      policies,
      configurations,
      compensation_rules: compensationRules,
      trust_scores: trustScores,
      ethics_incidents: ethicsIncidents,
      special_assignments: specialAssignments,
      promotion_pathways: promotionPathways,
      reputation_records: reputationRecords
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});