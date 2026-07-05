import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const nowISO = () => new Date().toISOString();

// ============================================================
// UPGRADE RECOMMENDATION ENGINE
// Doctrine: maximize long-term conversion through obvious value
// progression. Never block core functionality. Explain value.
// Founder controls all thresholds.
// ============================================================

// Default free-tier limits (Founder can override via FounderConfiguration)
const DEFAULT_FREE_LIMITS = {
  living_ledger_entries: 50,
  document_storage_mb: 100,
  ai_assistance_calls_per_month: 20,
  reminders_per_month: 10,
  messages_per_month: 50,
  automations_per_month: 3,
  shares_per_month: 5,
  uploads_per_month: 10
};

// Approach threshold (%) at which we recommend upgrade
const DEFAULT_APPROACH_THRESHOLD = 0.8;

// Map limit keys to the subscription that unlocks them
const LIMIT_TO_PLAN = {
  living_ledger_entries: 'living_ledger_plus',
  document_storage_mb: 'living_ledger_plus',
  ai_assistance_calls_per_month: 'living_ledger_plus',
  reminders_per_month: 'living_ledger_plus',
  messages_per_month: 'living_ledger_plus',
  automations_per_month: 'living_ledger_plus',
  shares_per_month: 'living_ledger_plus',
  uploads_per_month: 'living_ledger_plus'
};

// Premium feature signals that point to NC Legal / Workforce / Culture
const PREMIUM_SIGNALS = [
  { signal: 'jurisengine_usage', plan: 'nc_legal', reason: 'You are using JurisEngine — NC Legal unlocks full legal intelligence + document automation.' },
  { signal: 'authority_compass_usage', plan: 'nc_legal', reason: 'Authority Compass usage — NC Legal includes unlimited Authority Compass + FOIA tracker.' },
  { signal: 'document_automation', plan: 'nc_legal', reason: 'Document automation is a premium NC Legal feature.' },
  { signal: 'workforce_gateway_usage', plan: 'nc_workforce', reason: 'Workforce Gateway usage — NC Workforce unlocks Talent Partnership + Career Passport.' },
  { signal: 'career_passport_usage', plan: 'nc_workforce', reason: 'Career Passport is part of NC Workforce.' },
  { signal: 'culture_rail_usage', plan: 'nc_culture', reason: 'Culture Rail usage — NC Culture unlocks artist tools, distribution, licensing, royalties.' },
  { signal: 'marketplace_listing', plan: 'nc_culture', reason: 'Marketplace listing — NC Culture includes marketplace access + promotion.' }
];

async function getFounderThresholds(base44) {
  try {
    const cfgs = await base44.asServiceRole.entities.FounderConfiguration.filter({
      category: 'compensation', status: 'active'
    });
    const limitsOverride = cfgs.find(c => c.config_key === 'free_tier_limits');
    const thresholdOverride = cfgs.find(c => c.config_key === 'upgrade_approach_threshold');
    return {
      limits: (limitsOverride && limitsOverride.value) || DEFAULT_FREE_LIMITS,
      approach_threshold: (thresholdOverride && thresholdOverride.value && thresholdOverride.value.threshold) || DEFAULT_APPROACH_THRESHOLD
    };
  } catch {
    return { limits: DEFAULT_FREE_LIMITS, approach_threshold: DEFAULT_APPROACH_THRESHOLD };
  }
}

async function getUserUsage(base44, userId) {
  const usage = {
    living_ledger_entries: 0,
    document_storage_mb: 0,
    ai_assistance_calls_per_month: 0,
    reminders_per_month: 0,
    messages_per_month: 0,
    automations_per_month: 0,
    shares_per_month: 0,
    uploads_per_month: 0,
    premium_signals: []
  };
  try {
    const ledger = await base44.entities.LivingLedgerEntry.filter({ worker_id: userId }).catch(() => []);
    usage.living_ledger_entries = ledger ? ledger.length : 0;
  } catch {}
  try {
    const events = await base44.entities.ModuleUsageEvent.filter({ created_by_id: userId }).catch(() => []);
    if (events) {
      for (const e of events) {
        const t = (e.event_type || e.module || '').toLowerCase();
        if (t.includes('ai') || t.includes('llm') || t.includes('invoke')) usage.ai_assistance_calls_per_month++;
        if (t.includes('reminder')) usage.reminders_per_month++;
        if (t.includes('message') || t.includes('comm')) usage.messages_per_month++;
        if (t.includes('automation') || t.includes('workflow')) usage.automations_per_month++;
        if (t.includes('share')) usage.shares_per_month++;
        if (t.includes('upload')) usage.uploads_per_month++;
        // premium signals
        if (t.includes('jurisengine')) usage.premium_signals.push('jurisengine_usage');
        if (t.includes('authority')) usage.premium_signals.push('authority_compass_usage');
        if (t.includes('document_automation') || t.includes('doc_auto')) usage.premium_signals.push('document_automation');
        if (t.includes('workforce_gateway') || t.includes('workforce')) usage.premium_signals.push('workforce_gateway_usage');
        if (t.includes('career_passport')) usage.premium_signals.push('career_passport_usage');
        if (t.includes('culture_rail') || t.includes('culture')) usage.premium_signals.push('culture_rail_usage');
        if (t.includes('marketplace')) usage.premium_signals.push('marketplace_listing');
      }
    }
  } catch {}
  return usage;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const operation = body.operation;

    // ---- analyze (current user) ----
    if (operation === 'analyze') {
      const { limits, approach_threshold } = await getFounderThresholds(base44);
      const usage = await getUserUsage(base44, user.id);

      const approaching = [];
      const exceeded = [];
      for (const [key, limit] of Object.entries(limits)) {
        const used = usage[key] || 0;
        const ratio = limit > 0 ? used / limit : 0;
        if (ratio >= 1) {
          exceeded.push({ limit_key: key, used, limit, ratio, recommended_plan: LIMIT_TO_PLAN[key] || 'living_ledger_plus' });
        } else if (ratio >= approach_threshold) {
          approaching.push({ limit_key: key, used, limit, ratio: Math.round(ratio * 100) / 100, recommended_plan: LIMIT_TO_PLAN[key] || 'living_ledger_plus' });
        }
      }

      // Premium signal recommendations
      const signalRecs = [];
      const seenSignals = new Set();
      for (const sig of usage.premium_signals) {
        if (seenSignals.has(sig)) continue;
        seenSignals.add(sig);
        const match = PREMIUM_SIGNALS.find(p => p.signal === sig);
        if (match) signalRecs.push({ plan: match.plan, reason: match.reason, signal: sig });
      }

      // Consolidate recommended plans
      const planSet = new Set();
      for (const a of approaching) planSet.add(a.recommended_plan);
      for (const e of exceeded) planSet.add(e.recommended_plan);
      for (const s of signalRecs) planSet.add(s.plan);

      // Fetch plan details
      let plans = [];
      try {
        plans = await base44.asServiceRole.entities.SubscriptionPlan.list('-price_monthly', 20);
      } catch {}
      const recommended = [];
      for (const planKey of planSet) {
        const plan = plans.find(p => (p.tags || []).includes(planKey) || p.name.toLowerCase().replace(/[^a-z]/g, '').includes(planKey.replace(/_/g, '')));
        if (plan) {
          recommended.push({
            plan_key: planKey,
            plan_name: plan.name,
            price_monthly: plan.price_monthly,
            founder_configurable: (plan.tags || []).includes('founder_configurable'),
            pricing_pending: (plan.tags || []).includes('pricing_pending'),
            features: plan.features || [],
            reasons: [
              ...approaching.filter(a => a.recommended_plan === planKey).map(a => `Approaching ${a.limit_key} limit (${a.used}/${a.limit})`),
              ...exceeded.filter(e => e.recommended_plan === planKey).map(e => `Exceeded ${e.limit_key} limit (${e.used}/${e.limit})`),
              ...signalRecs.filter(s => s.plan === planKey).map(s => s.reason)
            ]
          });
        }
      }

      // Sort: paid plans first, then by price ascending
      recommended.sort((a, b) => (b.price_monthly > 0 ? 1 : 0) - (a.price_monthly > 0 ? 1 : 0) || a.price_monthly - b.price_monthly);

      return Response.json({
        doctrine: {
          objective: 'Maximize long-term subscriber conversion through obvious value progression — never block core functionality.',
          approach: 'Recommend when usage approaches 80% of free-tier limits (Founder-configurable). Explain value. Never block unexpectedly.'
        },
        user: { id: user.id, name: user.full_name },
        usage,
        limits,
        approach_threshold,
        approaching_limits: approaching,
        exceeded_limits: exceeded,
        premium_signal_recommendations: signalRecs,
        recommended_upgrades: recommended,
        blocked: false,
        message: recommended.length
          ? 'You are getting great value from NCOS. Based on your usage, here are plans that unlock more of what you already use.'
          : 'You are within free-tier limits. Keep enjoying NCOS — we will recommend upgrades as you grow.'
      });
    }

    // ---- thresholds (founder view) ----
    if (operation === 'thresholds') {
      const { limits, approach_threshold } = await getFounderThresholds(base44);
      return Response.json({
        default_limits: DEFAULT_FREE_LIMITS,
        active_limits: limits,
        approach_threshold,
        founder_configurable: true,
        instructions: 'Override limits or threshold via FounderConfiguration (config_key: free_tier_limits / upgrade_approach_threshold, category: compensation, status: active).'
      });
    }

    // ---- set_thresholds (founder only) ----
    if (operation === 'set_thresholds') {
      if (user.role !== 'admin') return Response.json({ error: 'Founder only' }, { status: 403 });
      const { limits, approach_threshold } = body;
      const results = [];
      if (limits) {
        try {
          const r = await base44.asServiceRole.entities.FounderConfiguration.create({
            config_key: 'free_tier_limits', category: 'compensation', value: limits,
            data_type: 'object', description: 'Free-tier usage limits', status: 'active',
            requires_founder_approval: true, last_modified_by: user.id, last_modified_at: nowISO()
          });
          results.push({ set: 'free_tier_limits', record: r.id });
        } catch (e) { results.push({ set: 'free_tier_limits', error: e.message }); }
      }
      if (approach_threshold !== undefined) {
        try {
          const r = await base44.asServiceRole.entities.FounderConfiguration.create({
            config_key: 'upgrade_approach_threshold', category: 'compensation',
            value: { threshold: approach_threshold }, data_type: 'object',
            description: 'Usage ratio at which upgrade is recommended', status: 'active',
            requires_founder_approval: true, last_modified_by: user.id, last_modified_at: nowISO()
          });
          results.push({ set: 'upgrade_approach_threshold', record: r.id });
        } catch (e) { results.push({ set: 'upgrade_approach_threshold', error: e.message }); }
      }
      return Response.json({ results });
    }

    return Response.json({ error: 'Unknown operation: ' + operation }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});