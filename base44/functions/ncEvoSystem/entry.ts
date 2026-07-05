import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const nowISO = () => new Date().toISOString();
const genKey = (p) => p + '-' + Math.random().toString(36).slice(2, 8).toUpperCase();

// ---------- Static knowledge of the NC platform rails ----------
const PLATFORM_RAILS = [
  'NOOS', 'NAIL', 'NIOC', 'NCICE', 'Executive Command', 'Mission Control', 'Build Director',
  'Execution Engine', 'Payment Fabric', 'Payment Sandbox', 'Workforce Gateway', 'Experience Network',
  'Culture Rail', 'Canon', 'JurisEngine', 'Knowledge Graph', 'Enterprise Memory', 'Development Memory',
  'Contribution Economy', 'Trust System', 'Reputation System', 'Career Passport', 'Living Ledger',
  'CRM', 'Resource Compass', 'Talent Partnership', 'EvoSystem', 'Integration Fabric', 'Consent Center'
];

const LAUNCH_DOMAINS = [
  'overall', 'payment', 'canon', 'workforce', 'director', 'customer_success', 'marketplace',
  'experience_network', 'culture_rail', 'resource_compass', 'legal', 'infrastructure', 'security',
  'ai', 'automation', 'knowledge', 'documentation', 'testing', 'production', 'talent_partnership'
];

// Founder checklist template (Business / Legal / Technical / Customer / AI)
const CHECKLIST_QUESTIONS = {
  business: ['How does this create value?', 'How does it save money?', 'How does it create revenue?', 'How does it improve retention?'],
  legal: ['Consent?', 'Terms?', 'Policies?', 'Audit?', 'Compliance?'],
  technical: ['Scalable?', 'Monitored?', 'Backed up?', 'Tested?', 'Documented?'],
  customer: ['Easy?', 'Useful?', 'Educational?', 'Clear?'],
  ai: ['Connected to Memory?', 'Connected to Knowledge Graph?', 'Connected to Executive Command?', 'Connected to NOOS?', 'Connected to NAIL?', 'Connected to NIOC?', 'Connected to Execution Engine?', 'Configurable?']
};

// Suggested integration categories for the Integration Fabric
const SUGGESTED_INTEGRATIONS = [
  { name: 'ADP / Payroll', integration_type: 'payroll', connection_mode: 'rest' },
  { name: 'QuickBooks / Accounting', integration_type: 'accounting', connection_mode: 'rest' },
  { name: 'Salesforce CRM', integration_type: 'crm', connection_mode: 'oauth' },
  { name: 'HubSpot CRM', integration_type: 'crm', connection_mode: 'oauth' },
  { name: 'Workday HR', integration_type: 'hr', connection_mode: 'rest' },
  { name: 'BambooHR', integration_type: 'hr', connection_mode: 'rest' },
  { name: 'Asana / Scheduling', integration_type: 'scheduling', connection_mode: 'oauth' },
  { name: 'Eventbrite / Ticketing', integration_type: 'ticketing', connection_mode: 'rest' },
  { name: 'Mindbody / Venue', integration_type: 'venue', connection_mode: 'rest' },
  { name: 'Slack / Communication', integration_type: 'communication', connection_mode: 'oauth' },
  { name: 'Microsoft Teams', integration_type: 'communication', connection_mode: 'oauth' },
  { name: 'Zoom / Event Platform', integration_type: 'event_platform', connection_mode: 'oauth' },
  { name: 'Shopify / Marketplace', integration_type: 'inventory', connection_mode: 'rest' },
  { name: 'ServiceNow / Dispatch', integration_type: 'dispatch', connection_mode: 'rest' },
  { name: 'Cornerstone / Learning', integration_type: 'learning', connection_mode: 'rest' },
  { name: 'NetSuite ERP', integration_type: 'erp', connection_mode: 'rest' },
  { name: 'Stripe / Financial', integration_type: 'financial', connection_mode: 'oauth' },
  { name: 'Plaid / Financial', integration_type: 'financial', connection_mode: 'rest' }
];

// Known platform blind spots / risks (seed knowledge) — drives scan
const KNOWN_BLIND_SPOTS = [
  { category: 'founder_dependency', title: 'Stripe secrets unset — production activation blocked', affected_systems: ['Payment Fabric', 'Payment Sandbox'], founder_dependency_score: 95, legal_exposure: 30, engineering_risk: 70, recommended_action: 'Set STRIPE_SECRET_KEY, PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET', recommended_action_type: 'improvement_item' },
  { category: 'legal_gap', title: 'Canon verification queue: 15 entries, 0 verified', affected_systems: ['Canon', 'JurisEngine'], founder_dependency_score: 80, legal_exposure: 70, engineering_risk: 40, recommended_action: 'Process canon verification queue with manual founder review', recommended_action_type: 'improvement_item' },
  { category: 'automation_gap', title: 'Daily cycle workflows self-invoke with 403 errors', affected_systems: ['NAIL', 'NCICE'], founder_dependency_score: 75, engineering_risk: 60, recommended_action: 'Refactor self-invoking workflows to use service-role scheduled triggers', recommended_action_type: 'architecture_recommendation' },
  { category: 'founder_dependency', title: 'Founder config panels are entity-only — no UI', affected_systems: ['FounderConfiguration', 'CareerLevel', 'PayoutPolicy'], founder_dependency_score: 85, engineering_risk: 30, recommended_action: 'Build founder configuration UI panels', recommended_action_type: 'build_queue_item' },
  { category: 'monitoring_gap', title: 'Integration Fabric does not yet exist — no external system monitoring', affected_systems: ['Integration Fabric'], founder_dependency_score: 70, engineering_risk: 50, recommended_action: 'Deploy Integration Fabric + Consent Center', recommended_action_type: 'build_queue_item' },
  { category: 'documentation_gap', title: 'Many rails lack founder-facing documentation', affected_systems: ['NOOS', 'NAIL', 'NIOC', 'NCICE'], founder_dependency_score: 65, engineering_risk: 20, recommended_action: 'Generate founder-facing docs for each rail', recommended_action_type: 'documentation_task' },
  { category: 'testing_gap', title: 'Payment sandbox chargeback test returns empty responses', affected_systems: ['Payment Sandbox', 'ncChargebackHandler'], founder_dependency_score: 80, engineering_risk: 65, recommended_action: 'Fix base44.functions.invoke bridge for chargeback handler', recommended_action_type: 'improvement_item' },
  { category: 'integration_opportunity', title: 'No payroll integration — workforce payouts manual', affected_systems: ['Payment Fabric', 'Workforce Gateway'], founder_dependency_score: 60, customer_friction: 50, recommended_action: 'Connect ADP/QuickBooks payroll via Integration Fabric', recommended_action_type: 'build_queue_item' },
  { category: 'integration_opportunity', title: 'No scheduling integration — workforce assignments manual', affected_systems: ['Workforce Gateway'], founder_dependency_score: 55, customer_friction: 60, recommended_action: 'Connect scheduling integration (Asana/Calendly)', recommended_action_type: 'build_queue_item' },
  { category: 'duplication', title: 'Two Culture Rail sidebar groups duplicate', affected_systems: ['Culture Rail'], engineering_risk: 10, unnecessary_cost: 5, recommended_action: 'Consolidate sidebar Culture Rail groups', recommended_action_type: 'improvement_item' },
  { category: 'backup_gap', title: 'No documented backup strategy for entity data', affected_systems: ['Enterprise Memory', 'Development Memory'], founder_dependency_score: 50, engineering_risk: 55, recommended_action: 'Define and document entity backup/export policy', recommended_action_type: 'documentation_task' },
  { category: 'approval_gap', title: 'Canon verification requires founder approval but queue automation incomplete', affected_systems: ['Canon Verification'], founder_dependency_score: 70, legal_exposure: 40, recommended_action: 'Complete canon verification workflow automation', recommended_action_type: 'improvement_item' },
  { category: 'ai_opportunity', title: 'Most rails not yet connected to Knowledge Graph', affected_systems: ['Knowledge Graph'], founder_dependency_score: 45, recommended_action: 'Wire all rails to auto-emit Knowledge Graph nodes', recommended_action_type: 'architecture_recommendation' },
  { category: 'business_opportunity', title: 'Talent Partnership LTV tracking can drive premium subscription tier', affected_systems: ['Talent Partnership', 'Living Ledger'], recommended_action: 'Package Living Ledger subscriber tier as paid product', recommended_action_type: 'build_queue_item' },
  { category: 'customer_opportunity', title: 'No client-facing portal for Talent Partnership', affected_systems: ['Talent Partnership'], customer_friction: 70, recommended_action: 'Build client experience view (verified workers, request teams)', recommended_action_type: 'build_queue_item' },
  { category: 'security', title: 'Webhook signature validation pending Stripe secret', affected_systems: ['Payment Fabric'], legal_exposure: 60, engineering_risk: 65, recommended_action: 'Complete Stripe webhook signature validation after secrets set', recommended_action_type: 'improvement_item' },
  { category: 'knowledge_gap', title: 'Evolution signals not yet auto-captured from most rails', affected_systems: ['EvoSystem'], founder_dependency_score: 50, recommended_action: 'Wire rails to emit EvolutionSignal on key events', recommended_action_type: 'architecture_recommendation' },
  { category: 'marketplace_opportunity', title: 'No marketplace intelligence from competitor scan', affected_systems: ['Marketplace'], recommended_action: 'Periodic competitive intelligence scan → EvolutionSignal', recommended_action_type: 'build_queue_item' },
  { category: 'training_gap', title: 'No onboarding training for new directors', affected_systems: ['Workforce Gateway', 'Director'], recommended_action: 'Build director onboarding training path', recommended_action_type: 'training_recommendation' },
  { category: 'cost_leak', title: 'AI coverage uneven — many calls default to gpt-4o-mini when better models needed', affected_systems: ['NAIL', 'NIOC'], unnecessary_cost: 0, founder_dependency_score: 40, recommended_action: 'Audit InvokeLLM model usage per function', recommended_action_type: 'improvement_item' }
];

function rankDiscovery(d) {
  const s = (d.severity === 'critical' ? 100 : d.severity === 'urgent' ? 75 : d.severity === 'warning' ? 50 : 25);
  return Math.round(
    (d.founder_dependency_score || 0) * 0.25 +
    s * 0.20 +
    (d.legal_exposure || 0) * 0.15 +
    (d.engineering_risk || 0) * 0.15 +
    (d.customer_friction || 0) * 0.10 +
    (d.duplication_risk || 0) * 0.05 +
    (d.unnecessary_cost || 0) * 0.10
  );
}

async function createImprovementFromDiscovery(base44, user, d) {
  try {
    return await base44.asServiceRole.entities.ImprovementItem.create({
      title: d.title,
      description: d.description || d.recommended_action || '',
      source: 'evosystem_blind_spot',
      category: d.category,
      severity: d.severity || 'warning',
      status: 'proposed',
      proposed_by: user.full_name,
      tags: ['evosystem', d.category]
    });
  } catch { return null; }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const operation = body.operation;
    const params = body.params || {};

    // ---- scan_blind_spots ----
    if (operation === 'scan_blind_spots') {
      let created = 0, updated = 0;
      for (const spot of KNOWN_BLIND_SPOTS) {
        const existing = await base44.asServiceRole.entities.BlindSpotDiscovery.filter({ title: spot.title }).catch(() => []);
        if (existing && existing.length) {
          const r = rankDiscovery(spot);
          await base44.asServiceRole.entities.BlindSpotDiscovery.update(existing[0].id, { rank: r, ...spot }).catch(() => {});
          updated++;
        } else {
          const r = rankDiscovery(spot);
          const d = await base44.asServiceRole.entities.BlindSpotDiscovery.create({
            discovery_key: genKey('BS'),
            ...spot,
            severity: spot.severity || 'warning',
            rank: r,
            status: 'open',
            discovered_by: 'system',
            discovered_at: nowISO(),
            description: spot.recommended_action || spot.title
          });
          const imp = await createImprovementFromDiscovery(base44, user, spot);
          if (imp) {
            await base44.asServiceRole.entities.BlindSpotDiscovery.update(d.id, { linked_improvement_item: imp.id, became_improvement_item: true }).catch(() => {});
          }
          created++;
        }
      }
      const all = await base44.asServiceRole.entities.BlindSpotDiscovery.filter({ status: 'open' }, '-rank', 100).catch(() => []);
      return Response.json({ created, updated, open: all.length, discoveries: all });
    }

    // ---- get_blind_spots ----
    if (operation === 'get_blind_spots') {
      const status = params.status || 'open';
      const list = await base44.asServiceRole.entities.BlindSpotDiscovery.filter({ status }, '-rank', 100).catch(() => []);
      return Response.json({ discoveries: list });
    }

    // ---- seed_suggested_integrations ----
    if (operation === 'seed_suggested_integrations') {
      let created = 0;
      for (const s of SUGGESTED_INTEGRATIONS) {
        const existing = await base44.asServiceRole.entities.IntegrationConnector.filter({ name: s.name }).catch(() => []);
        if (!existing || !existing.length) {
          await base44.asServiceRole.entities.IntegrationConnector.create({
            name: s.name, integration_type: s.integration_type, connection_mode: s.connection_mode,
            status: 'pending', suggested: true, health_score: 0, adoption_score: 0
          });
          created++;
        }
      }
      return Response.json({ seeded: created, total_suggested: SUGGESTED_INTEGRATIONS.length });
    }

    // ---- register_integration ----
    if (operation === 'register_integration') {
      const created = await base44.asServiceRole.entities.IntegrationConnector.create({
        name: params.name, integration_type: params.integration_type || 'custom',
        provider_name: params.provider_name || params.name,
        connection_mode: params.connection_mode || 'rest',
        status: params.status || 'connected',
        connected_by: user.full_name, connected_at: nowISO(),
        authorized_fields: params.authorized_fields || [],
        organization_id: params.organization_id || '',
        organization_name: params.organization_name || '',
        is_system_default: !!params.is_system_default
      });
      return Response.json({ created });
    }

    // ---- get_integrations ----
    if (operation === 'get_integrations') {
      const list = await base44.asServiceRole.entities.IntegrationConnector.list('-health_score', 200).catch(() => []);
      const connected = list.filter(i => i.status === 'connected').length;
      const broken = list.filter(i => i.status === 'broken').length;
      const unused = list.filter(i => i.status === 'unused' || (i.suggested && i.status === 'pending')).length;
      const avgHealth = list.length ? Math.round(list.reduce((s, i) => s + (i.health_score || 0), 0) / list.length) : 0;
      return Response.json({ integrations: list, connected, broken, unused, avg_health: avgHealth, total: list.length });
    }

    // ---- grant_consent ----
    if (operation === 'grant_consent') {
      const created = await base44.asServiceRole.entities.ConsentGrant.create({
        consent_key: genKey('CON'),
        integration_id: params.integration_id,
        integration_name: params.integration_name || '',
        scope: params.scope || 'organization',
        grantor_id: user.id, grantor_name: user.full_name,
        data_requested: params.data_requested || [],
        purpose: params.purpose || '', benefits: params.benefits || '',
        retention_policy: params.retention_policy || 'per organization policy',
        privacy_note: params.privacy_note || '',
        permissions: params.permissions || {}, revocable: true, revoked: false,
        granted_at: nowISO(), expires_at: params.expires_at || ''
      });
      // link consent to integration
      try {
        await base44.asServiceRole.entities.IntegrationConnector.update(params.integration_id, { consent_grant_id: created.id });
      } catch {}
      return Response.json({ created });
    }

    // ---- revoke_consent ----
    if (operation === 'revoke_consent') {
      await base44.asServiceRole.entities.ConsentGrant.update(params.consent_id, { revoked: true, revoked_at: nowISO() });
      return Response.json({ revoked: true });
    }

    // ---- get_consent ----
    if (operation === 'get_consent') {
      const list = await base44.asServiceRole.entities.ConsentGrant.list('-granted_at', 100).catch(() => []);
      return Response.json({ consents: list });
    }

    // ---- record_evolution_signal ----
    if (operation === 'record_evolution_signal') {
      const created = await base44.asServiceRole.entities.EvolutionSignal.create({
        signal_key: genKey('EV'),
        source_system: params.source_system || 'other',
        event_type: params.event_type || 'what_happened',
        title: params.title, description: params.description || '',
        severity: params.severity || 'info', impact: params.impact || 'medium',
        linked_entity_id: params.linked_entity_id || '',
        linked_entity_type: params.linked_entity_type || '',
        discovered_at: nowISO(),
        tags: params.tags || []
      });
      return Response.json({ created });
    }

    // ---- get_evolution_signals ----
    if (operation === 'get_evolution_signals') {
      const list = await base44.asServiceRole.entities.EvolutionSignal.list('-discovered_at', 100).catch(() => []);
      return Response.json({ signals: list });
    }

    // ---- evaluate_launch_readiness ----
    if (operation === 'evaluate_launch_readiness') {
      let created = 0, updated = 0;
      // Build domain checks from blind spots + platform knowledge
      const domainChecks = {
        payment: [
          { check_name: 'Stripe secrets configured', status: 'fail', risk: 'No production payments possible', solution: 'Set STRIPE_SECRET_KEY, PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET', estimated_time: '10 min', recommended_priority: 'critical' },
          { check_name: 'Webhook signature validation', status: 'fail', risk: 'Unverified webhooks', solution: 'Complete signature validation after secrets', estimated_time: '30 min', recommended_priority: 'critical' },
          { check_name: 'Sandbox chargeback test passing', status: 'warn', risk: 'Chargeback flow unverified', solution: 'Fix function bridge', estimated_time: '2 hours', recommended_priority: 'high' }
        ],
        canon: [
          { check_name: 'Canon verification queue cleared', status: 'fail', risk: '15 entries unverified', solution: 'Process verification queue with founder review', estimated_time: '4 hours', recommended_priority: 'high' },
          { check_name: 'Canon coverage map populated', status: 'warn', risk: 'Partial coverage', solution: 'Complete canon ingestion', estimated_time: '8 hours', recommended_priority: 'medium' }
        ],
        workforce: [
          { check_name: 'Career Passport live', status: 'pass', risk: '', solution: '', estimated_time: '', recommended_priority: 'low' },
          { check_name: 'Living Ledger active', status: 'pass', risk: '', solution: '', estimated_time: '', recommended_priority: 'low' },
          { check_name: 'Founder config UI', status: 'fail', risk: 'Career levels only editable via API', solution: 'Build founder config panels', estimated_time: '8 hours', recommended_priority: 'high' }
        ],
        director: [
          { check_name: 'Director Workspace upgraded', status: 'warn', risk: 'Recruit/mentor/coach UI pending', solution: 'Upgrade WorkforceDirector', estimated_time: '12 hours', recommended_priority: 'medium' }
        ],
        customer_success: [
          { check_name: 'Customer health scoring', status: 'pass', risk: '', solution: '', estimated_time: '', recommended_priority: 'low' },
          { check_name: 'Churn prediction active', status: 'pass', risk: '', solution: '', estimated_time: '', recommended_priority: 'low' }
        ],
        marketplace: [
          { check_name: 'Enterprise marketplace populated', status: 'warn', risk: 'Limited modules', solution: 'Populate marketplace catalog', estimated_time: '20 hours', recommended_priority: 'medium' }
        ],
        legal: [
          { check_name: 'Terms of service', status: 'warn', risk: 'Pending review', solution: 'Founder legal review', estimated_time: '4 hours', recommended_priority: 'high' },
          { check_name: 'Privacy policy', status: 'warn', risk: 'Pending review', solution: 'Founder legal review', estimated_time: '4 hours', recommended_priority: 'high' },
          { check_name: 'Consent Center live', status: 'fail', risk: 'No consent tracking', solution: 'Deploy Consent Center (this build)', estimated_time: 'complete', recommended_priority: 'critical' }
        ],
        infrastructure: [
          { check_name: 'Backup strategy documented', status: 'fail', risk: 'No documented backups', solution: 'Define backup/export policy', estimated_time: '4 hours', recommended_priority: 'high' },
          { check_name: 'Monitoring coverage', status: 'warn', risk: 'Partial monitoring', solution: 'Expand Platform Health Monitor', estimated_time: '8 hours', recommended_priority: 'medium' }
        ],
        security: [
          { check_name: 'Stripe webhook signature validation', status: 'fail', risk: 'Unverified events', solution: 'Set webhook secret', estimated_time: '30 min', recommended_priority: 'critical' },
          { check_name: 'RLS policies on sensitive entities', status: 'warn', risk: 'Review needed', solution: 'Audit entity RLS', estimated_time: '8 hours', recommended_priority: 'high' }
        ],
        ai: [
          { check_name: 'Rails connected to Knowledge Graph', status: 'warn', risk: 'Partial coverage', solution: 'Wire all rails to Knowledge Graph', estimated_time: '16 hours', recommended_priority: 'medium' },
          { check_name: 'Rails connected to Memory', status: 'warn', risk: 'Partial coverage', solution: 'Wire all rails to NCOSMemory', estimated_time: '16 hours', recommended_priority: 'medium' }
        ],
        automation: [
          { check_name: 'Daily cycle workflows', status: 'fail', risk: '403 self-invocation errors', solution: 'Refactor to scheduled triggers', estimated_time: '6 hours', recommended_priority: 'high' },
          { check_name: 'Canon verification automation', status: 'warn', risk: 'Incomplete', solution: 'Complete workflow', estimated_time: '8 hours', recommended_priority: 'medium' }
        ],
        knowledge: [
          { check_name: 'Development memory populated', status: 'pass', risk: '', solution: '', estimated_time: '', recommended_priority: 'low' },
          { check_name: 'Enterprise memory active', status: 'pass', risk: '', solution: '', estimated_time: '', recommended_priority: 'low' }
        ],
        documentation: [
          { check_name: 'Founder-facing docs per rail', status: 'fail', risk: 'Most rails undocumented', solution: 'Generate docs', estimated_time: '20 hours', recommended_priority: 'medium' }
        ],
        testing: [
          { check_name: 'Payment sandbox tests', status: 'warn', risk: 'Chargeback test failing', solution: 'Fix function bridge', estimated_time: '2 hours', recommended_priority: 'high' },
          { check_name: 'E2E workforce flows', status: 'warn', risk: 'Unverified', solution: 'Test workforce gateway flows', estimated_time: '8 hours', recommended_priority: 'medium' }
        ],
        production: [
          { check_name: 'Stripe production mode', status: 'fail', risk: 'Stuck at 40% readiness', solution: 'Set secrets + flip readiness', estimated_time: '1 hour', recommended_priority: 'critical' }
        ],
        experience_network: [{ check_name: 'Venue activations', status: 'warn', risk: '3 venues pending', solution: 'Activate venues', estimated_time: '8 hours', recommended_priority: 'medium' }],
        culture_rail: [{ check_name: 'Culture content populated', status: 'warn', risk: 'Limited content', solution: 'Populate catalog', estimated_time: '16 hours', recommended_priority: 'low' }],
        resource_compass: [{ check_name: 'Resource catalog', status: 'pass', risk: '', solution: '', estimated_time: '', recommended_priority: 'low' }],
        talent_partnership: [
          { check_name: 'Career levels configured', status: 'pass', risk: '', solution: '', estimated_time: '', recommended_priority: 'low' },
          { check_name: 'Client portal', status: 'fail', risk: 'No client-facing view', solution: 'Build client experience view', estimated_time: '12 hours', recommended_priority: 'medium' }
        ]
      };

      const domainScores = {};
      for (const [domain, checks] of Object.entries(domainChecks)) {
        const pass = checks.filter(c => c.status === 'pass').length;
        const total = checks.length;
        domainScores[domain] = total ? Math.round((pass / total) * 100) : 0;
        for (const c of checks) {
          const existing = await base44.asServiceRole.entities.LaunchReadinessCheck.filter({ domain, check_name: c.check_name }).catch(() => []);
          const data = {
            domain, check_name: c.check_name, status: c.status,
            blocker_reason: c.status !== 'pass' ? c.risk : '',
            risk: c.risk || '', solution: c.solution || '', estimated_time: c.estimated_time || '',
            recommended_priority: c.recommended_priority || 'medium',
            score: c.status === 'pass' ? 100 : c.status === 'warn' ? 50 : 0,
            last_checked: nowISO()
          };
          if (existing && existing[0]) {
            await base44.asServiceRole.entities.LaunchReadinessCheck.update(existing[0].id, data).catch(() => {});
            updated++;
          } else {
            await base44.asServiceRole.entities.LaunchReadinessCheck.create(data).catch(() => {});
            created++;
          }
        }
      }
      // overall = weighted average
      const overall = Math.round(Object.values(domainScores).reduce((s, v) => s + v, 0) / Object.values(domainScores).length);
      domainScores.overall = overall;
      return Response.json({ created, updated, domain_scores: domainScores });
    }

    // ---- get_launch_readiness ----
    if (operation === 'get_launch_readiness') {
      const list = await base44.asServiceRole.entities.LaunchReadinessCheck.list('-domain', 500).catch(() => []);
      const byDomain = {};
      for (const c of list) {
        if (!byDomain[c.domain]) byDomain[c.domain] = [];
        byDomain[c.domain].push(c);
      }
      const scores = {};
      for (const [d, checks] of Object.entries(byDomain)) {
        const pass = checks.filter(c => c.status === 'pass').length;
        scores[d] = checks.length ? Math.round((pass / checks.length) * 100) : 0;
      }
      return Response.json({ checks: list, by_domain: byDomain, scores });
    }

    // ---- run_founder_checklist ----
    if (operation === 'run_founder_checklist') {
      const capability = params.capability_name;
      let created = 0;
      for (const [section, questions] of Object.entries(CHECKLIST_QUESTIONS)) {
        for (const q of questions) {
          const existing = await base44.asServiceRole.entities.FounderChecklistAnswer.filter({ capability_name: capability, section, question: q }).catch(() => []);
          if (!existing || !existing.length) {
            await base44.asServiceRole.entities.FounderChecklistAnswer.create({
              checklist_key: genKey('CK'), capability_name: capability,
              capability_ref: params.capability_ref || '', section, question: q,
              answer: 'unknown', checked_at: nowISO()
            });
            created++;
          }
        }
      }
      const answers = await base44.asServiceRole.entities.FounderChecklistAnswer.filter({ capability_name: capability }, 'section', 50).catch(() => []);
      return Response.json({ created, answers });
    }

    // ---- get_evolution_score (Executive Command metrics) ----
    if (operation === 'get_evolution_score') {
      const blindSpots = await base44.asServiceRole.entities.BlindSpotDiscovery.filter({ status: 'open' }, '-rank', 100).catch(() => []);
      const integrations = await base44.asServiceRole.entities.IntegrationConnector.list('-health_score', 200).catch(() => []);
      const signals = await base44.asServiceRole.entities.EvolutionSignal.list('-discovered_at', 200).catch(() => []);
      const readiness = await base44.asServiceRole.entities.LaunchReadinessCheck.list('-domain', 500).catch(() => []);
      const techDebt = await base44.asServiceRole.entities.TechnicalDebt.list('-created_date', 200).catch(() => []);
      const memories = await base44.asServiceRole.entities.NCOSMemory.list('-created_date', 500).catch(() => []);
      const docs = await base44.asServiceRole.entities.CanonEntry.list('-created_date', 200).catch(() => []);
      const automations = await base44.asServiceRole.entities.Automation.list('-created_date', 200).catch(() => []);

      const founderDepAvg = blindSpots.length ? Math.round(blindSpots.reduce((s, b) => s + (b.founder_dependency_score || 0), 0) / blindSpots.length) : 0;
      const criticalSpots = blindSpots.filter(b => b.severity === 'critical').length;
      const integrationScore = integrations.length ? Math.round(integrations.filter(i => i.status === 'connected').reduce((s, i) => s + (i.health_score || 0), 0) / integrations.length) : 0;
      const readinessPass = readiness.filter(r => r.status === 'pass').length;
      const readinessScore = readiness.length ? Math.round((readinessPass / readiness.length) * 100) : 0;
      const memoryCoverage = Math.min(100, Math.round((memories.length / 500) * 100));
      const docCoverage = Math.min(100, Math.round((docs.length / 100) * 100));
      const automationCoverage = Math.min(100, Math.round((automations.length / 50) * 100));
      const aiCoverage = Math.min(100, Math.round((signals.length / 100) * 100));
      const evolutionScore = Math.round((readinessScore + integrationScore + memoryCoverage + docCoverage + automationCoverage + aiCoverage) / 6);
      const innovationScore = Math.min(100, Math.round((signals.filter(s => s.event_type === 'what_improved' || s.event_type === 'marketplace_intelligence').length / 20) * 100));
      const knowledgeGrowth = Math.min(100, Math.round((memories.length + docs.length) / 10));
      const techDebtCount = techDebt.filter(t => t.status !== 'resolved').length;

      const topRisks = blindSpots.sort((a, b) => (b.rank || 0) - (a.rank || 0)).slice(0, 25).map(b => ({
        title: b.title, category: b.category, severity: b.severity, rank: b.rank,
        risk: b.recommended_action, founder_dependency: b.founder_dependency_score
      }));
      const topOpportunities = blindSpots.filter(b => ['business_opportunity', 'customer_opportunity', 'integration_opportunity', 'marketplace_opportunity', 'competitive_opportunity', 'ai_opportunity'].includes(b.category))
        .sort((a, b) => (b.rank || 0) - (a.rank || 0)).slice(0, 25).map(b => ({ title: b.title, category: b.category, rank: b.rank, opportunity: b.recommended_action }));

      return Response.json({
        evolution_score: evolutionScore,
        innovation_score: innovationScore,
        integration_score: integrationScore,
        launch_readiness_score: readinessScore,
        knowledge_growth: knowledgeGrowth,
        founder_dependency_score: founderDepAvg,
        memory_coverage: memoryCoverage,
        documentation_coverage: docCoverage,
        automation_coverage: automationCoverage,
        ai_coverage: aiCoverage,
        technical_debt_items: techDebtCount,
        platform_maturity: readinessScore,
        blind_spots_open: blindSpots.length,
        critical_blind_spots: criticalSpots,
        integrations_connected: integrations.filter(i => i.status === 'connected').length,
        integrations_suggested: integrations.filter(i => i.suggested && i.status === 'pending').length,
        evolution_signals: signals.length,
        top_risks: topRisks,
        top_opportunities: topOpportunities,
        rails_observed: PLATFORM_RAILS.length,
        platform_rails: PLATFORM_RAILS
      });
    }

    // ---- ai_blind_spot_scan (AI-driven discovery) ----
    if (operation === 'ai_blind_spot_scan') {
      const blindSpots = await base44.asServiceRole.entities.BlindSpotDiscovery.filter({ status: 'open' }, '-rank', 50).catch(() => []);
      const res = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `You are the NC EvoSystem Blind Spot Engine. Given the current open blind spots, identify 5 NEW blind spots the platform has not yet discovered. Current blind spots: ${JSON.stringify(blindSpots.map(b => b.title))}. Platform rails: ${PLATFORM_RAILS.join(', ')}. Return JSON: { new_blind_spots: [{ category, title, description, severity, founder_dependency_score, recommended_action }] }`,
        response_json_schema: {
          type: 'object',
          properties: {
            new_blind_spots: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  category: { type: 'string' }, title: { type: 'string' }, description: { type: 'string' },
                  severity: { type: 'string' }, founder_dependency_score: { type: 'number' }, recommended_action: { type: 'string' }
                }
              }
            }
          }
        }
      });
      const found = (res.data || res).new_blind_spots || [];
      let created = 0;
      for (const f of found) {
        const existing = await base44.asServiceRole.entities.BlindSpotDiscovery.filter({ title: f.title }).catch(() => []);
        if (!existing || !existing.length) {
          const r = rankDiscovery(f);
          await base44.asServiceRole.entities.BlindSpotDiscovery.create({
            discovery_key: genKey('BS'), category: f.category || 'missing_capability',
            title: f.title, description: f.description || f.recommended_action || '',
            severity: f.severity || 'warning', founder_dependency_score: f.founder_dependency_score || 50,
            rank: r, recommended_action: f.recommended_action || '', recommended_action_type: 'improvement_item',
            status: 'open', discovered_by: 'ai', discovered_at: nowISO()
          });
          created++;
        }
      }
      return Response.json({ ai_discovered: created, found });
    }

    return Response.json({ error: 'Unknown operation: ' + operation }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});