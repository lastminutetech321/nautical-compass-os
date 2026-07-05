import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const nowISO = () => new Date().toISOString();
const genKey = (p) => p + '-' + Math.random().toString(36).slice(2, 8).toUpperCase();

// Founder-controlled scoring weights (configurable via FounderConfiguration)
const DEFAULT_WEIGHTS = {
  strategic: 0.22,
  customer: 0.20,
  revenue: 0.18,
  founder_time: 0.12,
  effort_inverse: 0.13,
  risk_inverse: 0.10,
  duplication_penalty: 0.05
};

// Credit estimation factors (founder-tunable)
const CREDIT_FACTORS = {
  // message credits per engineering hour of LLM-driven work
  msg_credits_per_hour: 12,
  // integration credits per engineering hour (InvokeLLM, GenerateImage, web search, etc.)
  integration_credits_per_hour: 8,
  // base overhead per build (planning, verification, documentation)
  base_msg_credits: 50,
  base_integration_credits: 20,
  // infra cost multipliers by cost tier
  infra_cost_multipliers: { low: 1, medium: 5, high: 25, critical: 100 }
};

const APPROVAL_THRESHOLDS = {
  // Founder approval required when ANY of these thresholds are exceeded
  engineering_effort_hours: 40,
  infrastructure_cost_monthly: 100,
  integration_credits: 500,
  risk_score: 70,
  revenue_impact_monthly: 5000
};

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

function normalizeRevenue(impact) {
  // Normalize monthly revenue impact to 0-100 scale ($0 -> 0, $10000+ -> 100)
  if (!impact || impact <= 0) return 0;
  return clamp(Math.log10(impact + 1) / Math.log10(10001) * 100, 0, 100);
}

function normalizeEffort(hours) {
  // Inverse: more effort = lower score. 0h -> 100, 200h+ -> 0
  if (!hours || hours <= 0) return 100;
  return clamp(100 - (hours / 200) * 100, 0, 100);
}

function normalizeRisk(risk) {
  // Inverse: higher risk = lower score
  return clamp(100 - (risk || 0), 0, 100);
}

function scoreItem(item, weights = DEFAULT_WEIGHTS) {
  const strategic = item.strategic_value || 0;
  const customer = item.customer_value || 0;
  const revenue = normalizeRevenue(item.revenue_impact || 0);
  const founderTime = clamp((item.founder_time_saved_hours || 0) * 2, 0, 100);
  const effortInv = normalizeEffort(item.engineering_effort || 0);
  const riskInv = normalizeRisk(item.risk || 0);
  const dupPenalty = item.duplication_risk || 0;

  const composite =
    weights.strategic * strategic +
    weights.customer * customer +
    weights.revenue * revenue +
    weights.founder_time * founderTime +
    weights.effort_inverse * effortInv +
    weights.risk_inverse * riskInv -
    weights.duplication_penalty * dupPenalty;

  return clamp(Math.round(composite * 10) / 10, 0, 100);
}

function roiScore(item) {
  const value = (item.composite_score || 0) + normalizeRevenue(item.revenue_impact || 0) / 2 + (item.founder_time_saved_hours || 0);
  const effort = Math.max(item.engineering_effort || 1, 1);
  return Math.round((value / effort) * 100) / 100;
}

function estimateCredits(item) {
  const hours = item.engineering_effort || 0;
  const msgCredits = Math.round(CREDIT_FACTORS.base_msg_credits + hours * CREDIT_FACTORS.msg_credits_per_hour);
  const integrationCredits = Math.round(CREDIT_FACTORS.base_integration_credits + hours * CREDIT_FACTORS.integration_credits_per_hour);
  return { msgCredits, integrationCredits };
}

function costTier(item) {
  const infra = item.estimated_infrastructure_cost || 0;
  const credits = (item.estimated_integration_credits || 0) + (item.estimated_message_credits || 0);
  if (infra >= 1000 || credits >= 5000) return 'critical';
  if (infra >= 250 || credits >= 1500) return 'high';
  if (infra >= 50 || credits >= 500) return 'medium';
  return 'low';
}

function requiresFounderApproval(item) {
  return (
    (item.engineering_effort || 0) >= APPROVAL_THRESHOLDS.engineering_effort_hours ||
    (item.estimated_infrastructure_cost || 0) >= APPROVAL_THRESHOLDS.infrastructure_cost_monthly ||
    (item.estimated_integration_credits || 0) >= APPROVAL_THRESHOLDS.integration_credits ||
    (item.risk || 0) >= APPROVAL_THRESHOLDS.risk_score ||
    (item.revenue_impact || 0) >= APPROVAL_THRESHOLDS.revenue_impact_monthly ||
    (item.required_approvals || []).includes('founder')
  );
}

function recommendedBuildOrder(item, allItems) {
  // Order by composite_score desc, but push blocked/deferred to end
  if (item.status === 'blocked' || item.status === 'deferred' || item.status === 'rejected') return 9999;
  const score = item.composite_score || 0;
  const roi = item.roi_score || 0;
  // Blend composite + ROI; dependencies push later
  const depPenalty = (item.dependencies || []).length * 2;
  return Math.round((score * 0.6 + roi * 4) - depPenalty);
}

async function loadWeights(base44) {
  try {
    const cfg = await base44.asServiceRole.entities.FounderConfiguration.filter({ config_key: 'build_director_weights', status: 'active' });
    if (cfg && cfg[0] && cfg[0].value) return { ...DEFAULT_WEIGHTS, ...cfg[0].value };
  } catch {}
  return DEFAULT_WEIGHTS;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const operation = body.operation;
    const params = body.params || {};

    // ---- score_item ----
    if (operation === 'score_item') {
      const weights = await loadWeights(base44);
      const item = params.item || params;
      const composite = scoreItem(item, weights);
      const credits = estimateCredits(item);
      const enriched = {
        ...item,
        estimated_message_credits: item.estimated_message_credits || credits.msgCredits,
        estimated_integration_credits: item.estimated_integration_credits || credits.integrationCredits,
        composite_score: composite,
        roi_score: roiScore({ ...item, composite_score: composite }),
        cost_tier: costTier({ ...item, estimated_infrastructure_cost: item.estimated_infrastructure_cost || 0, estimated_integration_credits: item.estimated_integration_credits || credits.integrationCredits, estimated_message_credits: item.estimated_message_credits || credits.msgCredits }),
        requires_founder_approval: requiresFounderApproval({ ...item, estimated_integration_credits: item.estimated_integration_credits || credits.integrationCredits })
      };
      return Response.json({ scored: enriched, weights, formula_explanation: explainFormula(weights, enriched) });
    }

    // ---- create_item ----
    if (operation === 'create_item') {
      const weights = await loadWeights(base44);
      const item = { ...params };
      const credits = estimateCredits(item);
      if (!item.estimated_message_credits) item.estimated_message_credits = credits.msgCredits;
      if (!item.estimated_integration_credits) item.estimated_integration_credits = credits.integrationCredits;
      item.composite_score = scoreItem(item, weights);
      item.roi_score = roiScore(item);
      item.cost_tier = costTier(item);
      item.requires_founder_approval = requiresFounderApproval(item);
      if (item.requires_founder_approval && !item.required_approvals) item.required_approvals = ['founder'];
      if (item.requires_founder_approval && item.status === 'proposed') item.status = 'proposed';
      item.audit_trail = [{ action: 'proposed', at: nowISO(), by: user.full_name || 'system', detail: 'Item created and scored' }];
      const created = await base44.asServiceRole.entities.BuildQueueItem.create(item);
      return Response.json({ created });
    }

    // ---- approve_item ----
    if (operation === 'approve_item') {
      const item = await base44.asServiceRole.entities.BuildQueueItem.get(params.item_id);
      const isFounder = (user.role === 'admin' || user.role === 'founder' || (user.email || '').toLowerCase().includes('founder'));
      if (item.requires_founder_approval && !isFounder) {
        return Response.json({ error: 'Founder approval required for this build' }, { status: 403 });
      }
      const updated = await base44.asServiceRole.entities.BuildQueueItem.update(params.item_id, {
        status: 'approved',
        approved_by: user.full_name,
        approved_at: nowISO(),
        audit_trail: [...(item.audit_trail || []), { action: 'approved', at: nowISO(), by: user.full_name, detail: 'Build approved for queue' }]
      });
      return Response.json({ approved: updated });
    }

    // ---- update_status ----
    if (operation === 'update_status') {
      const item = await base44.asServiceRole.entities.BuildQueueItem.get(params.item_id);
      const updated = await base44.asServiceRole.entities.BuildQueueItem.update(params.item_id, {
        status: params.status,
        blocked_reason: params.blocked_reason || item.blocked_reason,
        assigned_to: params.assigned_to || item.assigned_to,
        audit_trail: [...(item.audit_trail || []), { action: 'status_change', at: nowISO(), by: user.full_name, detail: `Status -> ${params.status}` }]
      });
      return Response.json({ updated });
    }

    // ---- get_dashboard ----
    if (operation === 'get_dashboard') {
      const all = await base44.asServiceRole.entities.BuildQueueItem.list('-composite_score', 500);
      const active = all.filter(i => !['complete', 'rejected', 'deferred'].includes(i.status));
      const blocked = all.filter(i => i.status === 'blocked');
      const proposed = all.filter(i => i.status === 'proposed');
      const inProgress = all.filter(i => i.status === 'in_progress' || i.status === 'testing' || i.status === 'queued');

      const sorted = [...active].sort((a, b) => (b.composite_score || 0) - (a.composite_score || 0));
      const nextBest = sorted[0] || null;

      const roiSorted = [...active].sort((a, b) => (b.roi_score || 0) - (a.roi_score || 0));
      const highestROI = roiSorted.slice(0, 5);

      // Cheapest high-value: composite >= 60, low cost tier
      const cheapHighValue = active.filter(i => (i.composite_score || 0) >= 60 && i.cost_tier === 'low').sort((a, b) => (b.composite_score || 0) - (a.composite_score || 0)).slice(0, 5);

      // Credit risk aggregation
      const pendingMsgCredits = active.reduce((s, i) => s + (i.estimated_message_credits || 0), 0);
      const pendingIntegrationCredits = active.reduce((s, i) => s + (i.estimated_integration_credits || 0), 0);
      const pendingInfraCost = active.reduce((s, i) => s + (i.estimated_infrastructure_cost || 0), 0);

      // Architecture risks: high risk + architecture_gap source
      const architectureRisks = all.filter(i => i.source_type === 'architecture_gap' || (i.risk || 0) >= 70);

      // Remaining platform gaps by source_type
      const gapCounts = {};
      for (const i of all) {
        if (i.status !== 'complete') gapCounts[i.source_type] = (gapCounts[i.source_type] || 0) + 1;
      }

      // Recommended next 10 builds: approved + queued, sorted by recommended_build_order
      const buildable = active.filter(i => ['approved', 'queued', 'proposed'].includes(i.status));
      const weights = await loadWeights(base44);
      const withOrder = buildable.map(i => ({ ...i, _order: recommendedBuildOrder(i, all) })).sort((a, b) => b._order - a._order);
      const next10 = withOrder.slice(0, 10);

      return Response.json({
        next_best: nextBest,
        current_queue: inProgress,
        blocked_builds: blocked,
        proposed_builds: proposed,
        highest_roi: highestROI,
        cheapest_high_value: cheapHighValue,
        pending_message_credits: pendingMsgCredits,
        pending_integration_credits: pendingIntegrationCredits,
        pending_infrastructure_cost: pendingInfraCost,
        architecture_risks: architectureRisks,
        platform_gaps: gapCounts,
        recommended_next_10: next10,
        total_items: all.length,
        active_count: active.length,
        weights
      });
    }

    // ---- recommend_next_builds ----
    if (operation === 'recommend_next_builds') {
      const all = await base44.asServiceRole.entities.BuildQueueItem.list('-composite_score', 500);
      const buildable = all.filter(i => ['approved', 'queued', 'proposed'].includes(i.status));
      const withOrder = buildable.map(i => ({ ...i, _order: recommendedBuildOrder(i, all) })).sort((a, b) => b._order - a._order);
      return Response.json({ recommended: withOrder.slice(0, params.limit || 10) });
    }

    // ---- sync_from_sources ----
    // Pull from FeatureRequest, ImprovementItem, TechnicalDebt, RoadmapItem, BugKnowledgeBase, OrchestrationInsight
    if (operation === 'sync_from_sources') {
      const synced = [];
      const sources = [
        { entity: 'FeatureRequest', source_type: 'feature_request', title_field: 'title' },
        { entity: 'ImprovementItem', source_type: 'ai_recommendation', title_field: 'title' },
        { entity: 'TechnicalDebt', source_type: 'technical_debt', title_field: 'title' },
        { entity: 'RoadmapItem', source_type: 'founder_idea', title_field: 'title' }
      ];
      for (const src of sources) {
        try {
          const records = await base44.asServiceRole.entities[src.entity].list('-created_date', 50);
          for (const r of records || []) {
            const existing = await base44.asServiceRole.entities.BuildQueueItem.filter({ source_ref: r.id, source_ref_type: src.entity }).catch(() => []);
            if (existing && existing.length) continue;
            const item = {
              title: r[src.title_field] || r.title || `${src.entity} item`,
              description: r.description || r.summary || '',
              source_type: src.source_type,
              source_ref: r.id,
              source_ref_type: src.entity,
              proposed_by: 'sync_engine',
              status: 'proposed',
              integration_targets: src.entity === 'RoadmapItem' ? ['RoadmapPage'] : []
            };
            const weights = DEFAULT_WEIGHTS;
            item.composite_score = scoreItem(item, weights);
            item.roi_score = roiScore(item);
            const credits = estimateCredits(item);
            item.estimated_message_credits = credits.msgCredits;
            item.estimated_integration_credits = credits.integrationCredits;
            item.cost_tier = costTier(item);
            item.requires_founder_approval = requiresFounderApproval(item);
            try {
              const created = await base44.asServiceRole.entities.BuildQueueItem.create(item);
              synced.push(created);
            } catch {}
          }
        } catch {}
      }
      return Response.json({ synced_count: synced.length, synced });
    }

    // ---- ai_propose ----
    if (operation === 'ai_propose') {
      // Use LLM to propose a build item from a free-text idea
      const prompt = `You are the NC Build Director planning engine. Given this build idea, return ONLY a JSON object with fields: title, description, source_type (one of: feature_request, founder_idea, bug, ai_recommendation, architecture_gap, customer_request, payment_gap, canon_gap, technical_debt, workflow_failure), category, strategic_value (0-100), customer_value (0-100), revenue_impact (monthly $ number), founder_time_saved_hours, engineering_effort (hours), risk (0-100), dependencies (array of strings), duplication_risk (0-100), estimated_infrastructure_cost (monthly $), integration_targets (array), tags (array). Idea: ${params.idea}`;
      const res = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            title: { type: 'string' }, description: { type: 'string' }, source_type: { type: 'string' },
            category: { type: 'string' }, strategic_value: { type: 'number' }, customer_value: { type: 'number' },
            revenue_impact: { type: 'number' }, founder_time_saved_hours: { type: 'number' },
            engineering_effort: { type: 'number' }, risk: { type: 'number' }, dependencies: { type: 'array', items: { type: 'string' } },
            duplication_risk: { type: 'number' }, estimated_infrastructure_cost: { type: 'number' },
            integration_targets: { type: 'array', items: { type: 'string' } }, tags: { type: 'array', items: { type: 'string' } }
          }
        }
      });
      const proposal = res.data || res;
      const weights = await loadWeights(base44);
      proposal.composite_score = scoreItem(proposal, weights);
      proposal.roi_score = roiScore(proposal);
      const credits = estimateCredits(proposal);
      proposal.estimated_message_credits = credits.msgCredits;
      proposal.estimated_integration_credits = credits.integrationCredits;
      proposal.cost_tier = costTier(proposal);
      proposal.requires_founder_approval = requiresFounderApproval(proposal);
      return Response.json({ proposal, formula_explanation: explainFormula(weights, proposal) });
    }

    return Response.json({ error: 'Unknown operation: ' + operation }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function explainFormula(weights, item) {
  const parts = [];
  parts.push(`composite = ${weights.strategic}×strategic + ${weights.customer}×customer + ${weights.revenue}×rev_norm + ${weights.founder_time}×founder_time + ${weights.effort_inverse}×(100-effort) + ${weights.risk_inverse}×(100-risk) - ${weights.duplication_penalty}×dup`);
  parts.push(`strategic=${item.strategic_value||0}, customer=${item.customer_value||0}, rev_norm=${normalizeRevenue(item.revenue_impact||0).toFixed(1)}, founder_time=${clamp((item.founder_time_saved_hours||0)*2,0,100)}, effort_inv=${normalizeEffort(item.engineering_effort||0).toFixed(1)}, risk_inv=${normalizeRisk(item.risk||0)}, dup=${item.duplication_risk||0}`);
  parts.push(`=> composite=${item.composite_score}`);
  parts.push(`roi = (composite + rev_norm/2 + founder_hours) / max(effort,1) = ${item.roi_score}`);
  parts.push(`credits = base_msg(${CREDIT_FACTORS.base_msg_credits}) + hours×${CREDIT_FACTORS.msg_credits_per_hour} = ${item.estimated_message_credits} msg; base_int(${CREDIT_FACTORS.base_integration_credits}) + hours×${CREDIT_FACTORS.integration_credits_per_hour} = ${item.estimated_integration_credits} int`);
  parts.push(`cost_tier=${item.cost_tier}, founder_approval=${item.requires_founder_approval}`);
  return parts.join('\n');
}