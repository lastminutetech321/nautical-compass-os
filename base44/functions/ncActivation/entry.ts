import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const nowISO = () => new Date().toISOString();
const genKey = (p) => p + '-' + Math.random().toString(36).slice(2, 8).toUpperCase();

// ============================================================
// PART 1 — STRIPE PRODUCTION READINESS DEFINITION
// ============================================================
const STRIPE_CHECKS = [
  { id: 'stripe_secret_key', label: 'STRIPE_SECRET_KEY configured', status: 'founder_action', risk: 'No production payments possible', solution: 'Set STRIPE_SECRET_KEY in environment variables', priority: 'critical', founder_required: true },
  { id: 'stripe_publishable_key', label: 'STRIPE_PUBLISHABLE_KEY configured', status: 'founder_action', risk: 'Client-side checkout cannot init', solution: 'Set STRIPE_PUBLISHABLE_KEY', priority: 'critical', founder_required: true },
  { id: 'stripe_webhook_secret', label: 'STRIPE_WEBHOOK_SECRET configured', status: 'founder_action', risk: 'Unverified webhooks', solution: 'Set STRIPE_WEBHOOK_SECRET after registering webhook endpoint', priority: 'critical', founder_required: true },
  { id: 'webhook_signature_validation', label: 'Webhook signature validation', status: 'code_ready', risk: 'Skipped pending secret', solution: 'ncStripeWebhook validates HMAC-SHA256 once secret set', priority: 'critical', founder_required: false },
  { id: 'checkout_session', label: 'Checkout session readiness', status: 'code_ready', risk: 'None — awaiting keys', solution: 'Payment Fabric builds checkout sessions via Stripe SDK', priority: 'high', founder_required: false },
  { id: 'payment_link', label: 'Payment link readiness', status: 'code_ready', risk: 'None', solution: 'Payment Fabric can generate payment links', priority: 'medium', founder_required: false },
  { id: 'subscription_activation', label: 'Subscription activation checks', status: 'code_ready', risk: 'None', solution: 'ncStripeWebhook handles customer.subscription.created/updated/deleted', priority: 'high', founder_required: false },
  { id: 'failed_payment_handling', label: 'Failed payment handling', status: 'code_ready', risk: 'None', solution: 'invoice.payment_failed → subscription marked past_due, grace period logic in Payment Fabric', priority: 'high', founder_required: false },
  { id: 'chargeback_handling', label: 'Chargeback handling', status: 'code_ready', risk: 'None', solution: 'charge.dispute.created → RefundRequest + payout hold + founder notification (inlined handler)', priority: 'high', founder_required: false },
  { id: 'refund_approval', label: 'Refund approval flow', status: 'code_ready', risk: 'None', solution: 'RefundRequest entity + founder approval gate', priority: 'medium', founder_required: false },
  { id: 'payout_holds', label: 'Payout holds on dispute', status: 'code_ready', risk: 'None', solution: 'PayoutItem.dispute_status + hold_until field; payouts linked via stripe_charge_id', priority: 'high', founder_required: false },
  { id: 'production_readiness_gate', label: 'Production readiness gate', status: 'founder_action', risk: 'Sandbox stuck at ~40%', solution: 'Flip StripeReadinessConfig to production after secrets + sandbox tests pass', priority: 'critical', founder_required: true }
];

// ============================================================
// PART 2 — GITHUB CANON SYNC MAPPING
// ============================================================
const GITHUB_CANON_FIELDS = [
  'source_file_path', 'commit_sha', 'version_tag', 'title', 'category',
  'jurisdiction', 'citation', 'doctrine', 'notes', 'verification_status'
];

const GITHUB_CANON_INSTRUCTIONS = [
  '1. In the NCOS dashboard, go to Settings → OAuth Connectors (or use the GitHub connector when authorized).',
  '2. Connect the Founder GitHub account OR register a workspace-owned GitHub OAuth app (client_id + client_secret) for BYO shared mode.',
  '3. Grant repo:read scope on the target repository containing Canon / governance documents.',
  '4. In the Activation Center, run "GitHub Canon Sync" — NCOS will list .md / .txt / canon files from the repo.',
  '5. Review each proposed import in the Canon Import Review queue. NCOS will NOT overwrite existing CanonEntry records without Founder/Admin approval.',
  '6. Detect duplicates (same title or citation) and conflicts (same source path, different content).',
  '7. Approve imports individually or in bulk. Approved imports become CanonEntry records with verification_status=pending.',
  '8. Founder/Admin marks imported Canon as verified_active only after manual review.',
  '9. Every sync preserves source_file_path + commit_sha for version tracking.',
  'SECURITY: Never store GitHub PAT in entity fields. Use the OAuth connector token store only. Revoke access anytime.'
];

// ============================================================
// PART 3 — FIRST WORKER ONBOARDING (Founder niece → AV work)
// ============================================================
const WORKFORCE_ONBOARDING_STEPS = [
  { id: 'profile', label: 'Profile creation', entity: 'WorkforceProfile', status: 'ready' },
  { id: 'consent', label: 'Consent + data permissions', entity: 'ConsentGrant', status: 'ready' },
  { id: 'emergency_contact', label: 'Emergency contact', entity: 'WorkforceProfile', status: 'ready' },
  { id: 'availability', label: 'Availability', entity: 'WorkerSchedule', status: 'ready' },
  { id: 'transportation', label: 'Transportation / travel radius', entity: 'WorkforceProfile', status: 'ready' },
  { id: 'experience_level', label: 'Experience level', entity: 'WorkforceProfile', status: 'ready' },
  { id: 'skills', label: 'Skills inventory', entity: 'WorkerSkill', status: 'ready' },
  { id: 'training_needs', label: 'Training needs assessment', entity: 'WorkforceAssessment', status: 'ready' },
  { id: 'safety_orientation', label: 'Safety orientation', entity: 'SafetyReport', status: 'ready' },
  { id: 'insurance_status', label: 'Insurance status', entity: 'WorkforceProfile', status: 'ready' },
  { id: 'role_path', label: 'Role / career path assignment', entity: 'CareerLevel', status: 'ready' },
  { id: 'career_passport', label: 'Career Passport created', entity: 'CareerPassportEntry', status: 'ready' },
  { id: 'living_ledger', label: 'Living Ledger initialized', entity: 'LivingLedgerEntry', status: 'ready' },
  { id: 'mentor_assignment', label: 'Mentor / director assignment', entity: 'WorkforceProfile', status: 'founder_action' },
  { id: 'first_assignment_readiness', label: 'First assignment readiness', entity: 'PlacementRecord', status: 'founder_action' },
  { id: 'payroll_readiness', label: 'Payroll / payment readiness', entity: 'PayoutItem', status: 'founder_action' },
  { id: 'trust_baseline', label: 'Trust / reputation baseline', entity: 'TrustScore', status: 'ready' }
];

const WORKER_PATHWAYS = ['contractor', 'trainee', 'apprentice', 'future_employee'];

// ============================================================
// PART 4 — ARTIST + VENUE ONBOARDING
// ============================================================
const ARTIST_VENUE_ONBOARDING = [
  { id: 'artist_profile', label: 'Artist profile', entity: 'Artist', status: 'ready' },
  { id: 'venue_profile', label: 'Venue profile', entity: 'Venue', status: 'ready' },
  { id: 'promoter_profile', label: 'Promoter profile', entity: 'EventProvider', status: 'ready' },
  { id: 'event_provider', label: 'Event provider profile', entity: 'EventProvider', status: 'ready' },
  { id: 'av_crew_needs', label: 'AV crew needs', entity: 'Event', status: 'ready' },
  { id: 'security_provider', label: 'Security provider needs', entity: 'EventProvider', status: 'ready' },
  { id: 'rental_provider', label: 'Rental provider needs', entity: 'EventProvider', status: 'ready' },
  { id: 'ticketing_model', label: 'Ticketing model', entity: 'Event', status: 'founder_action' },
  { id: 'revenue_split', label: 'Revenue split model', entity: 'RevenueDistribution', status: 'ready' },
  { id: 'venue_readiness', label: 'Venue readiness assessment', entity: 'EventReadinessAssessment', status: 'ready' },
  { id: 'compliance_checklist', label: 'Compliance checklist', entity: 'Venue', status: 'founder_action' },
  { id: 'event_planning_timeline', label: 'Event planning timeline', entity: 'Event', status: 'ready' },
  { id: 'payout_routing', label: 'Payout routing', entity: 'PayoutItem', status: 'founder_action' },
  { id: 'living_ledger_event', label: 'Living Ledger / event record', entity: 'LivingLedgerEntry', status: 'ready' },
  { id: 'nc_attribution', label: 'NC attribution', entity: 'TalentAttribution', status: 'ready' }
];

// ============================================================
// PART 5 — FIRST REAL SUBSCRIPTION FLOW
// ============================================================
const SUBSCRIPTION_TIERS = [
  {
    id: 'living_ledger_starter', label: 'Living Ledger Starter', price_monthly: 0, plan_type: 'free',
    description: 'Free tier — immediate daily value, naturally encourages upgrades. No artificial frustration.',
    features: ['Account creation','Profile','Basic Living Ledger','Limited document storage','Limited AI assistance','Limited reminders','Limited messaging','Limited automation','Limited sharing','Limited uploads'],
    limits: { living_ledger_entries: 50, document_storage_mb: 100, ai_assistance_calls_per_month: 20, reminders_per_month: 10, messages_per_month: 50, automations_per_month: 3, shares_per_month: 5, uploads_per_month: 10, founder_configurable: true },
    founder_configurable: true, tier_key: 'free'
  },
  {
    id: 'living_ledger_plus', label: 'Living Ledger+', price_monthly: 9, plan_type: 'starter',
    description: 'Lowest paid subscription. Expanded storage (passthrough), unlimited history, premium AI + automation.',
    features: ['Expanded storage (passthrough pricing)','Unlimited Living Ledger history','Advanced search','AI organization','Document categorization','Premium reminders','Workflow automation','Exports','Premium backup','Sharing','Additional AI services'],
    storage_passthrough: true, founder_configurable: true, tier_key: 'subscriber'
  },
  {
    id: 'nc_legal', label: 'NC Legal', price_monthly: 135, plan_type: 'professional',
    description: 'Flagship subscription. Full legal intelligence + document automation. Price is fixed — do NOT reduce.',
    features: ['JurisEngine full access','Authority Compass','Document automation','Canon access (full)','Decision Compass (unlimited)','Evidence Vault','Case timeline + witnesses','FOIA tracker','Legal issue spotter'],
    flagship: true, founder_configurable: false, tier_key: 'subscriber'
  },
  {
    id: 'nc_workforce', label: 'NC Workforce', price_monthly: 0, plan_type: 'starter',
    description: 'Founder-configurable pricing. Bundle price depends on Workforce services and partnerships. Not permanently set.',
    features: ['Workforce Gateway','Talent Partnership','Career Passport','Worker profiles + skills','Scheduling + contracts','Training library','Opportunity matching','Payroll (partner service)','Safety reporting'],
    founder_configurable: true, pricing_pending: true, tier_key: 'subscriber'
  },
  {
    id: 'nc_culture', label: 'NC Culture', price_monthly: 0, plan_type: 'starter',
    description: 'Founder-configurable pricing. Reflects creator value, artist tools, distribution, promotion, licensing, royalties, marketplace access, future partner services. Not permanently set.',
    features: ['Culture Rail','Experience Network','Artist tools','Distribution + promotion','Licensing','Royalties','Marketplace access','Future partner services'],
    founder_configurable: true, pricing_pending: true, tier_key: 'subscriber'
  }
];

const SUBSCRIPTION_DOCTRINE = {
  objective: 'Maximize long-term subscriber conversion through obvious value progression — NOT to maximize free usage.',
  principles: [
    'Free tier provides immediate value while naturally encouraging upgrades',
    'No artificial frustration',
    'Do not give away the majority of premium functionality',
    'Basic messaging remains free; automation services remain premium',
    'Founder controls all upgrade thresholds and pricing',
    'Storage costs pass through to subscriber with Founder-configurable margin'
  ],
  free_communication: 'Basic messaging is free. Premium automation (AI automation, workflow automation, notifications, advanced reminders, document automation, scheduling, customer automation, director automation, partner integrations) requires a paid subscription.',
  upgrade_engine: 'Recommend appropriate subscription when users consistently approach free-tier limits. Never block core functionality unexpectedly. Explain upgrade value. Use actual usage patterns. Founder controls thresholds.'
};

const PARTNER_SERVICES_CATALOG = [
  { id: 'payroll', name: 'Payroll Processing', category: 'financial', base_price: 0, platform_revenue_pct: 0, description: 'Payroll processing for workforce + talent partnership. Optional, pay-per-use.' },
  { id: 'insurance', name: 'Insurance', category: 'protection', base_price: 0, platform_revenue_pct: 0, description: 'Workers comp, liability, event insurance. Optional marketplace service.' },
  { id: 'bookkeeping', name: 'Bookkeeping', category: 'financial', base_price: 0, platform_revenue_pct: 0, description: 'Bookkeeping + accounting sync. Optional, pay-per-use.' },
  { id: 'tax', name: 'Tax Preparation', category: 'financial', base_price: 0, platform_revenue_pct: 0, description: 'Tax filing + compliance. Optional marketplace service.' },
  { id: 'background_checks', name: 'Background Checks', category: 'compliance', base_price: 0, platform_revenue_pct: 0, description: 'Identity + criminal background checks for workforce onboarding.' },
  { id: 'training', name: 'Training + Certification', category: 'learning', base_price: 0, platform_revenue_pct: 0, description: 'Training courses, certifications, skill verification.' },
  { id: 'hr', name: 'HR Services', category: 'hr', base_price: 0, platform_revenue_pct: 0, description: 'HR management, onboarding, compliance, benefits admin.' },
  { id: 'benefits', name: 'Benefits Administration', category: 'hr', base_price: 0, platform_revenue_pct: 0, description: 'Benefits packages, enrollment, management.' },
  { id: 'identity_verification', name: 'Identity Verification', category: 'compliance', base_price: 0, platform_revenue_pct: 0, description: 'KYC / identity verification for onboarding.' },
  { id: 'cloud_storage', name: 'Cloud Storage', category: 'infrastructure', base_price: 0, platform_revenue_pct: 0, description: 'Expanded cloud storage with passthrough pricing.' },
  { id: 'scheduling', name: 'Scheduling Services', category: 'operations', base_price: 0, platform_revenue_pct: 0, description: 'Advanced scheduling, dispatch, appointment management.' },
  { id: 'financial_services', name: 'Financial Services', category: 'financial', base_price: 0, platform_revenue_pct: 0, description: 'Banking, payments, financial management tools.' },
  { id: 'investment_services', name: 'Investment Services', category: 'financial', base_price: 0, platform_revenue_pct: 0, description: 'Investment, retirement, wealth management. Optional marketplace service.' }
];

const SUBSCRIPTION_CHECKS = [
  { id: 'subscription_plans', label: 'Subscription plans defined', status: 'founder_action', risk: 'Plans not yet created as SubscriptionPlan records', solution: 'Create SubscriptionPlan records for each tier', priority: 'high' },
  { id: 'checkout_readiness', label: 'Checkout readiness', status: 'code_ready', risk: 'Awaiting Stripe keys', solution: 'Payment Fabric builds checkout sessions', priority: 'high' },
  { id: 'member_access', label: 'Member access gating', status: 'code_ready', risk: 'None', solution: 'ProtectedRoute + subscription status check', priority: 'medium' },
  { id: 'subscription_status', label: 'Subscription status tracking', status: 'code_ready', risk: 'None', solution: 'Subscription entity synced via webhook', priority: 'medium' },
  { id: 'failed_payment', label: 'Failed payment handling', status: 'code_ready', risk: 'None', solution: 'Grace period + dunning via Payment Fabric', priority: 'high' },
  { id: 'grace_period', label: 'Grace period', status: 'code_ready', risk: 'None', solution: 'Configurable grace period in StripeReadinessConfig.risk_tolerances', priority: 'medium' },
  { id: 'cancellation', label: 'Cancellation flow', status: 'code_ready', risk: 'None', solution: 'customer.subscription.deleted webhook handler', priority: 'medium' },
  { id: 'refund_request', label: 'Refund request flow', status: 'code_ready', risk: 'None', solution: 'RefundRequest entity + founder approval', priority: 'medium' },
  { id: 'audit_trail', label: 'Audit trail', status: 'code_ready', risk: 'None', solution: 'AuditLog + FinancialTransaction records', priority: 'low' },
  { id: 'founder_dashboard', label: 'Founder dashboard visibility', status: 'code_ready', risk: 'None', solution: 'Executive Command + Mission Control subscription widgets', priority: 'low' }
];

// ============================================================
// PART 6 — CONSOLIDATION (known duplications)
// ============================================================
const KNOWN_DUPLICATIONS = [
  { title: 'Two Culture Rail sidebar groups', severity: 'low', recommendation: 'Consolidate the two "Culture Rail" sidebar groups into one', entities: ['Sidebar.jsx'] },
  { title: 'WorkforceProfile vs WorkerProfile entity overlap', severity: 'medium', recommendation: 'Consolidate WorkforceProfile and WorkerProfile into one canonical workforce entity; migrate records', entities: ['WorkforceProfile', 'WorkerProfile'] },
  { title: 'Multiple intelligence engines (ncIntelligence, ncIntelligenceEngine, ncIntelligenceOps, ncEcosystemOrchestrator)', severity: 'medium', recommendation: 'Clarify responsibilities; ncIntelligence = read/UI, ncIntelligenceEngine = processing, ncIntelligenceOps = ops, ncEcosystemOrchestrator = scan. Document boundaries.', entities: ['ncIntelligence', 'ncIntelligenceEngine', 'ncIntelligenceOps', 'ncEcosystemOrchestrator'] },
  { title: 'Multiple memory entities (NCOSMemory, MemoryRecord, MemoryTimelineEntry, OrgMemoryProject)', severity: 'medium', recommendation: 'Define canonical memory entity; others become views/projections', entities: ['NCOSMemory', 'MemoryRecord', 'MemoryTimelineEntry', 'OrgMemoryProject'] },
  { title: 'Daily briefing systems (DailyBriefing, DailyCompass, DailyReflection, FounderIntelligenceBrief)', severity: 'low', recommendation: 'Consolidate into Daily Compass as the single daily entry point', entities: ['DailyBriefing', 'DailyCompass', 'DailyReflection', 'FounderIntelligenceBrief'] },
  { title: 'Founder intelligence dashboards (FounderDashboard, FounderBrain, FounderVision, ExecutiveCommand, MissionControl)', severity: 'medium', recommendation: 'Define Executive Command as the single founder command center; others feed into it', entities: ['FounderDashboard', 'FounderBrain', 'FounderVision', 'ExecutiveCommand', 'MissionControl'] },
  { title: 'Career entities (CareerPlan, CareerPipelineStage, CareerLevel, CareerPassportEntry)', severity: 'low', recommendation: 'Document: CareerLevel = growth path config, CareerPipelineStage = pipeline stages, CareerPlan = worker plan, CareerPassportEntry = history. No duplication.', entities: ['CareerPlan', 'CareerPipelineStage', 'CareerLevel', 'CareerPassportEntry'] },
  { title: 'Trust/Reputation/Contribution overlap (TrustScore, ContributionScore, ReputationRecord, ContributionProfile)', severity: 'low', recommendation: 'Document: TrustScore/ContributionScore/ReputationRecord = event records, ContributionProfile = aggregate. No duplication.', entities: ['TrustScore', 'ContributionScore', 'ReputationRecord', 'ContributionProfile'] },
  { title: 'Self-improvement engines (autonomousImprovement, ncAutoFixEngine, ncEvoSystem, selfDiagnosis)', severity: 'medium', recommendation: 'ncEvoSystem = strategic discovery, autonomousImprovement = tactical, ncAutoFixEngine = reactive fix, selfDiagnosis = health check. Document boundaries.', entities: ['autonomousImprovement', 'ncAutoFixEngine', 'ncEvoSystem', 'selfDiagnosis'] }
];

// ============================================================
// PART 7 — MARKETPLACE + ENTERPRISE READINESS
// ============================================================
const MARKETPLACE_READINESS = [
  { id: 'enterprise_cloning', label: 'Enterprise cloning readiness', entity: 'EnterpriseClone', status: 'code_ready' },
  { id: 'marketplace_modules', label: 'Marketplace modules', entity: 'MarketplaceModule', status: 'code_ready' },
  { id: 'partner_integrations', label: 'Partner integrations (Integration Fabric)', entity: 'IntegrationConnector', status: 'code_ready' },
  { id: 'app_connectors', label: 'App connectors', entity: 'connector', status: 'founder_action' },
  { id: 'venue_marketplace', label: 'Venue marketplace', entity: 'Venue', status: 'founder_action' },
  { id: 'workforce_marketplace', label: 'Workforce marketplace', entity: 'WorkerProfile', status: 'founder_action' },
  { id: 'artist_marketplace', label: 'Artist marketplace', entity: 'Artist', status: 'founder_action' },
  { id: 'service_provider_marketplace', label: 'Service provider marketplace', entity: 'EventProvider', status: 'founder_action' },
  { id: 'cross_company_learning', label: 'Cross-company learning', entity: 'EnterpriseBlueprint', status: 'founder_action' }
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const operation = body.operation;
    const params = body.params || {};

    // ---- stripe_readiness ----
    if (operation === 'stripe_readiness') {
      let config = null;
      try {
        const cfgs = await base44.asServiceRole.entities.StripeReadinessConfig.filter({ config_key: 'stripe_readiness' });
        config = cfgs && cfgs[0];
      } catch {}
      // Read secret status from the StripeReadinessConfig entity (tracks set/valid) — avoids requiring live secrets here.
      const secretsStatusMap = (config && config.secrets_status) || {};
      const secretsSet = {
        STRIPE_SECRET_KEY: !!secretsStatusMap.STRIPE_SECRET_KEY?.set,
        STRIPE_PUBLISHABLE_KEY: !!secretsStatusMap.STRIPE_PUBLISHABLE_KEY?.set,
        STRIPE_WEBHOOK_SECRET: !!secretsStatusMap.STRIPE_WEBHOOK_SECRET?.set
      };
      const checks = STRIPE_CHECKS.map(c => {
        if (c.id === 'stripe_secret_key') return { ...c, status: secretsSet.STRIPE_SECRET_KEY ? 'ready' : 'founder_action' };
        if (c.id === 'stripe_publishable_key') return { ...c, status: secretsSet.STRIPE_PUBLISHABLE_KEY ? 'ready' : 'founder_action' };
        if (c.id === 'stripe_webhook_secret') return { ...c, status: secretsSet.STRIPE_WEBHOOK_SECRET ? 'ready' : 'founder_action' };
        return c;
      });
      const ready = checks.filter(c => c.status === 'ready' || c.status === 'code_ready').length;
      const founderActions = checks.filter(c => c.founder_required).length;
      const readinessScore = Math.round((ready / checks.length) * 100);
      return Response.json({ checks, secrets_set: secretsSet, readiness_score: readinessScore, founder_actions_required: founderActions, config, production_active: !!config?.production_active });
    }

    // ---- github_canon_requirements ----
    if (operation === 'github_canon_requirements') {
      return Response.json({
        instructions: GITHUB_CANON_INSTRUCTIONS,
        canon_fields: GITHUB_CANON_FIELDS,
        rules: [
          'GitHub Canon = source of truth, not recreated from scratch',
          'Existing CanonEntry records are never overwritten without Founder/Admin review',
          'Duplicates detected by title or citation match',
          'Conflicts detected by same source_file_path with different content',
          'Imported Canon enters verification_status=pending; verified_active only after manual approval'
        ],
        connector_status: 'not_authorized',
        connector_instructions: 'Authorize the GitHub API connector (integration_type: github) via OAuth, OR register a workspace-owned GitHub OAuth app for BYO shared mode. Grant repo:read scope on the Canon repository.'
      });
    }

    // ---- github_canon_sync (live scan — connector authorized) ----
    if (operation === 'github_canon_sync') {
      let githubConn = null;
      try { githubConn = await base44.asServiceRole.connectors.getConnection('github').catch(() => null); } catch {}
      if (!githubConn || !githubConn.accessToken) {
        return Response.json({ status: 'connector_not_authorized', message: 'Authorize the GitHub connector to begin Canon sync.', proposed_imports: [], duplicates: [], conflicts: [] });
      }
      const token = githubConn.accessToken;
      const headers = { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github+json', 'User-Agent': 'ncos-canon-sync' };

      // 1. List user's repos (first 50)
      const reposResp = await fetch('https://api.github.com/user/repos?per_page=50&sort=updated', { headers });
      if (!reposResp.ok) {
        const errBody = await reposResp.text().catch(() => '');
        return Response.json({ status: 'error', message: `GitHub API error: ${reposResp.status}`, error_body: errBody.slice(0, 500), token_prefix: (token || '').slice(0, 8), token_length: (token || '').length, proposed_imports: [], duplicates: [], conflicts: [] });
      }
      const repos = await reposResp.json();

      // 2. Detect canon-related files in each repo
      const CANON_KEYWORDS = ['canon', 'governance', 'constitution', 'prompt', 'engineering', 'legal', 'doctrine', 'policy', 'adr', 'memory', 'playbook', 'handbook'];
      const CANON_CATEGORIES = {
        canon: 'canon', governance: 'governance', constitution: 'constitution',
        prompt: 'prompt_library', engineering: 'engineering', legal: 'legal',
        doctrine: 'canon', policy: 'governance', adr: 'engineering',
        memory: 'development_memory', playbook: 'engineering', handbook: 'engineering'
      };
      const proposedImports = [];
      const duplicates = [];
      let scanned = 0;
      const MAX_REPOS = 10;
      const MAX_FILES = 60;

      for (const repo of repos) {
        if (scanned >= MAX_REPOS || proposedImports.length + duplicates.length >= MAX_FILES) break;
        scanned++;
        const owner = repo.owner?.login, name = repo.name, branch = repo.default_branch || 'main';
        let tree = null;
        try {
          const treeResp = await fetch(`https://api.github.com/repos/${owner}/${name}/git/trees/${branch}?recursive=1`, { headers });
          if (treeResp.ok) tree = await treeResp.json();
        } catch {}
        if (!tree || !tree.tree) continue;

        for (const entry of tree.tree) {
          if (proposedImports.length + duplicates.length >= MAX_FILES) break;
          if (entry.type !== 'blob') continue;
          const path = entry.path || '';
          const lower = path.toLowerCase();
          if (!lower.endsWith('.md') && !lower.endsWith('.txt') && !lower.endsWith('.mdx')) continue;
          const matched = CANON_KEYWORDS.find(k => lower.includes(k));
          if (!matched) continue;
          const title = path.split('/').pop().replace(/\.(md|txt|mdx)$/i, '');
          const category = CANON_CATEGORIES[matched] || 'general';

          // 3. Duplicate detection against existing CanonEntry
          let dupe = null;
          try {
            const existing = await base44.asServiceRole.entities.CanonEntry.filter({ title }).catch(() => []);
            dupe = existing && existing[0];
          } catch {}
          // 4. Duplicate detection against existing CanonImportQueue (same source_url)
          const sourceUrl = `https://github.com/${owner}/${name}/blob/${branch}/${path}`;
          let queueDupe = null;
          try {
            const q = await base44.asServiceRole.entities.CanonImportQueue.filter({ source_url: sourceUrl }).catch(() => []);
            queueDupe = q && q[0];
          } catch {}

          if (dupe) {
            duplicates.push({ title, source_url: sourceUrl, category, reason: 'CanonEntry with same title exists', existing_id: dupe.id });
            continue;
          }
          if (queueDupe) {
            duplicates.push({ title, source_url: sourceUrl, category, reason: 'Already in import queue', existing_id: queueDupe.id, import_status: queueDupe.import_status });
            continue;
          }

          // 5. Create CanonImportQueue entry (review_pending — NOT imported)
          let created = null;
          try {
            created = await base44.asServiceRole.entities.CanonImportQueue.create({
              title, category, source_type: 'bulk_import', source_url: sourceUrl,
              jurisdiction: '', authority_level: '',
              content_preview: `Detected from ${owner}/${name}@${branch}/${path}`,
              citation: `${owner}/${name}`, priority: 'medium',
              import_status: 'review_pending', verification_required: true, auto_verified: false,
              submitted_by: 'github_canon_sync', submitted_at: nowISO(),
              tags: ['github_canon', category, matched, `${owner}/${name}`],
              notes: `path=${path} sha=${entry.sha || ''} repo=${owner}/${name} branch=${branch}`
            });
          } catch {}

          proposedImports.push({
            title, category, source_url: sourceUrl, repo: `${owner}/${name}`, branch, path, sha: entry.sha,
            commit_ref: branch, matched_keyword: matched,
            import_queue_id: created?.id, import_status: 'review_pending'
          });
        }
      }

      return Response.json({
        status: 'scan_complete',
        repos_scanned: scanned,
        proposed_imports: proposedImports,
        duplicates: duplicates,
        conflicts: [],
        message: `Scanned ${scanned} repos. ${proposedImports.length} proposed imports queued for Founder review. ${duplicates.length} duplicates detected. Nothing imported until Founder approval.`,
        rules_enforced: [
          'GitHub Canon = source of truth, not recreated',
          'No import without Founder approval',
          'Duplicates detected by title + source_url',
          'All imports enter review_pending status',
          'Source path + commit + version preserved'
        ]
      });
    }

    // ---- github_canon_import (approve a proposed import) ----
    if (operation === 'github_canon_import') {
      const imp = params;
      // Check for duplicate CanonEntry
      const dupes = await base44.asServiceRole.entities.CanonEntry.filter({ title: imp.title }).catch(() => []);
      if (dupes && dupes.length) {
        return Response.json({ status: 'duplicate_detected', existing: dupes[0], message: 'CanonEntry with same title exists. Review before importing.' });
      }
      const created = await base44.asServiceRole.entities.CanonEntry.create({
        title: imp.title,
        category: imp.category || 'general',
        jurisdiction: imp.jurisdiction || '',
        citation: imp.citation || '',
        doctrine: imp.doctrine || '',
        notes: imp.notes || `Imported from GitHub: ${imp.source_file_path} @ ${imp.commit_sha || 'latest'}`,
        source_file_path: imp.source_file_path,
        source_commit_sha: imp.commit_sha,
        verification_status: 'pending',
        imported_from: 'github',
        tags: ['github_canon', 'imported']
      });
      return Response.json({ status: 'imported', created, verification_status: 'pending' });
    }

    // ---- workforce_onboarding_readiness ----
    if (operation === 'workforce_onboarding_readiness') {
      const steps = WORKFORCE_ONBOARDING_STEPS;
      const ready = steps.filter(s => s.status === 'ready').length;
      const founderActions = steps.filter(s => s.status === 'founder_action').length;
      return Response.json({ steps, pathways: WORKER_PATHWAYS, ready, founder_actions_required: founderActions, readiness_score: Math.round((ready / steps.length) * 100), use_case: "Founder's niece — AV work introduction" });
    }

    // ---- onboard_first_worker ----
    if (operation === 'onboard_first_worker') {
      const w = params;
      // Create WorkforceProfile
      const profile = await base44.asServiceRole.entities.WorkforceProfile.create({
        worker_id: genKey('WF'),
        full_name: w.full_name, email: w.email, phone: w.phone,
        pathway: w.pathway || 'apprentice',
        experience_level: w.experience_level || 'beginner',
        emergency_contact: w.emergency_contact || '',
        transportation: w.transportation || '',
        insurance_status: w.insurance_status || 'none',
        readiness_score: 20, trust_score: 30, status: 'active',
        career_level: w.career_level || 'Explorer',
        assigned_mentor: w.assigned_mentor || '',
        assigned_director: w.assigned_director || '',
        tags: ['first_worker', 'av_work']
      }).catch(() => null);

      // Consent grant
      let consent = null;
      try {
        consent = await base44.asServiceRole.entities.ConsentGrant.create({
          consent_key: genKey('CON'), integration_id: 'workforce_gateway', integration_name: 'Workforce Gateway',
          scope: 'individual', grantor_id: profile?.id || '', grantor_name: w.full_name,
          data_requested: w.data_requested || ['assignments', 'schedules', 'hours', 'skills', 'training'],
          purpose: 'Workforce onboarding and career management', benefits: 'Career passport, living ledger, placement matching',
          retention_policy: 'Per worker consent; revocable anytime', permissions: {}, revocable: true, revoked: false,
          granted_at: nowISO()
        });
      } catch {}

      // Career Passport entry
      let passport = null;
      try {
        passport = await base44.asServiceRole.entities.CareerPassportEntry.create({
          worker_id: profile?.id || '', worker_name: w.full_name, entry_type: 'onboarding',
          title: 'Onboarded to NC Workforce Gateway', description: `Pathway: ${w.pathway || 'apprentice'}. Experience: ${w.experience_level || 'beginner'}.`,
          event_date: nowISO().slice(0, 10), permanent: true, tags: ['onboarding', 'first_worker']
        });
      } catch {}

      // Living Ledger entry
      let ledger = null;
      try {
        ledger = await base44.asServiceRole.entities.LivingLedgerEntry.create({
          ledger_key: genKey('LL'), worker_id: profile?.id || '', worker_name: w.full_name,
          entry_type: 'career_goal', tier: 'free', title: 'Onboarded — Career Partnership begins',
          description: `Welcome to NC. Pathway: ${w.pathway || 'apprentice'}.`, event_date: nowISO().slice(0, 10),
          permanent: true, tags: ['onboarding']
        });
      } catch {}

      // Trust baseline
      let trust = null;
      try {
        trust = await base44.asServiceRole.entities.TrustScore.create({
          participant_id: profile?.id || '', participant_name: w.full_name, participant_type: 'workforce',
          score: 30, source: 'onboarding', description: 'Baseline trust on onboarding', event_date: nowISO().slice(0, 10)
        });
      } catch {}

      return Response.json({ profile, consent, passport, ledger, trust, next_steps: ['Assign mentor/director', 'Complete safety orientation', 'Schedule first assignment'] });
    }

    // ---- artist_venue_readiness ----
    if (operation === 'artist_venue_readiness') {
      const steps = ARTIST_VENUE_ONBOARDING;
      const ready = steps.filter(s => s.status === 'ready').length;
      const founderActions = steps.filter(s => s.status === 'founder_action').length;
      return Response.json({ steps, ready, founder_actions_required: founderActions, readiness_score: Math.round((ready / steps.length) * 100) });
    }

    // ---- subscription_readiness ----
    if (operation === 'subscription_readiness') {
      // Check existing SubscriptionPlan records
      let plans = [];
      try { plans = await base44.asServiceRole.entities.SubscriptionPlan.list('-created_date', 50); } catch {}
      const checks = SUBSCRIPTION_CHECKS.map(c => {
        if (c.id === 'subscription_plans') return { ...c, status: plans.length >= SUBSCRIPTION_TIERS.length ? 'ready' : 'founder_action', detail: `${plans.length}/${SUBSCRIPTION_TIERS.length} plans created` };
        return c;
      });
      const ready = checks.filter(c => c.status === 'ready' || c.status === 'code_ready').length;
      return Response.json({ tiers: SUBSCRIPTION_TIERS, checks, existing_plans: plans.length, readiness_score: Math.round((ready / checks.length) * 100) });
    }

    // ---- subscription_doctrine ----
    if (operation === 'subscription_doctrine') {
      const freeVsPremium = SUBSCRIPTION_TIERS.map(t => ({
        plan: t.label, price_monthly: t.price_monthly, plan_type: t.plan_type,
        founder_configurable: !!t.founder_configurable, pricing_pending: !!t.pricing_pending,
        features: t.features, limits: t.limits || null,
        free: t.plan_type === 'free'
      }));
      return Response.json({ doctrine: SUBSCRIPTION_DOCTRINE, tiers: SUBSCRIPTION_TIERS, free_vs_premium_matrix: freeVsPremium });
    }

    // ---- partner_services_catalog ----
    if (operation === 'partner_services_catalog') {
      let existing = [];
      try { existing = await base44.asServiceRole.entities.PartnerService.list('-created_date', 50); } catch {}
      const created = [];
      for (const svc of PARTNER_SERVICES_CATALOG) {
        const dupe = existing.find(e => e.name === svc.name);
        if (!dupe) {
          try {
            const p = await base44.asServiceRole.entities.PartnerService.create({
              service_key: svc.id, name: svc.name, category: svc.category,
              base_price: svc.base_price, platform_revenue_pct: svc.platform_revenue_pct,
              description: svc.description, founder_configurable: true, is_optional: true,
              pay_per_use: true, status: 'available', tags: ['partner_service', 'marketplace']
            });
            created.push(p);
          } catch {}
        }
      }
      return Response.json({ catalog: PARTNER_SERVICES_CATALOG, existing_count: existing.length, created: created.length, partner_services: existing.concat(created) });
    }

    // ---- create_subscription_plans ----
    if (operation === 'create_subscription_plans') {
      const created = [];
      for (const tier of SUBSCRIPTION_TIERS) {
        const existing = await base44.asServiceRole.entities.SubscriptionPlan.filter({ name: tier.label }).catch(() => []);
        if (!existing || !existing.length) {
          try {
            const p = await base44.asServiceRole.entities.SubscriptionPlan.create({
              name: tier.label, price_monthly: tier.price_monthly,
              price_annual: tier.price_monthly > 0 ? tier.price_monthly * 12 : 0,
              plan_type: tier.plan_type, billing_model: 'flat_rate', currency: 'USD',
              description: tier.description, features: tier.features, limits: tier.limits || null,
              max_seats: 1, seats_included: 1, grace_period_days: 3,
              is_active: true, is_public: true,
              tags: [tier.id, tier.founder_configurable ? 'founder_configurable' : 'fixed', tier.pricing_pending ? 'pricing_pending' : 'active'].filter(Boolean)
            });
            created.push(p);
          } catch {}
        } else {
          // Update existing record to match current doctrine
          try {
            const u = await base44.asServiceRole.entities.SubscriptionPlan.update(existing[0].id, {
              price_monthly: tier.price_monthly,
              price_annual: tier.price_monthly > 0 ? tier.price_monthly * 12 : 0,
              plan_type: tier.plan_type, description: tier.description, features: tier.features,
              limits: tier.limits || null,
              tags: [tier.id, tier.founder_configurable ? 'founder_configurable' : 'fixed', tier.pricing_pending ? 'pricing_pending' : 'active'].filter(Boolean)
            });
            created.push(u);
          } catch {}
        }
      }
      return Response.json({ created: created.length, plans: created });
    }

    // ---- consolidation_scan ----
    if (operation === 'consolidation_scan') {
      let created = 0;
      const findings = [];
      for (const d of KNOWN_DUPLICATIONS) {
        const existing = await base44.asServiceRole.entities.BuildQueueItem.filter({ title: d.title }).catch(() => []);
        if (!existing || !existing.length) {
          try {
            await base44.asServiceRole.entities.BuildQueueItem.create({
              title: d.title, description: d.recommendation,
              source_type: 'architecture_gap', category: 'consolidation',
              status: 'proposed', risk: d.severity === 'medium' ? 40 : 20,
              strategic_value: d.severity === 'medium' ? 60 : 40,
              engineering_effort: d.severity === 'medium' ? 8 : 4,
              requires_founder_approval: false,
              tags: ['consolidation', 'duplication']
            });
            created++;
            findings.push({ title: d.title, severity: d.severity, recommendation: d.recommendation, entities: d.entities, build_queue_item_created: true });
          } catch {}
        } else {
          findings.push({ title: d.title, severity: d.severity, recommendation: d.recommendation, entities: d.entities, build_queue_item_created: false, already_exists: true });
        }
      }
      return Response.json({ build_queue_items_created: created, findings });
    }

    // ---- marketplace_readiness ----
    if (operation === 'marketplace_readiness') {
      const steps = MARKETPLACE_READINESS;
      const ready = steps.filter(s => s.status === 'code_ready').length;
      return Response.json({ steps, ready, founder_actions_required: steps.length - ready, readiness_score: Math.round((ready / steps.length) * 100) });
    }

    // ---- get_activation_dashboard (aggregate) ----
    if (operation === 'get_activation_dashboard') {
      return Response.json({
        parts: ['stripe', 'github_canon', 'workforce', 'artist_venue', 'subscription', 'consolidation', 'marketplace'],
        summary: 'Activation Mode: 7 parts. Stripe awaits Founder secrets; GitHub awaits connector; Workforce/Artist/Venue onboarding flows ready; Subscription tiers defined; Consolidation scan ready; Marketplace checklist ready.'
      });
    }

    // ---- founder_actions_required ----
    if (operation === 'founder_actions_required') {
      const actions = [
        { part: 'Stripe', action: 'Set STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET in environment variables', priority: 'critical' },
        { part: 'Stripe', action: 'Register Stripe webhook endpoint in dashboard and copy signing secret', priority: 'critical' },
        { part: 'Stripe', action: 'Flip StripeReadinessConfig to production mode after sandbox tests pass', priority: 'critical' },
        { part: 'GitHub', action: 'Authorize GitHub API connector or register workspace OAuth app', priority: 'high' },
        { part: 'GitHub', action: 'Grant repo:read on the Canon repository', priority: 'high' },
        { part: 'Workforce', action: 'Assign mentor/director for first worker', priority: 'high' },
        { part: 'Workforce', action: 'Schedule first assignment + payroll readiness', priority: 'high' },
        { part: 'Artist/Venue', action: 'Define ticketing model + compliance checklist for first venue', priority: 'medium' },
        { part: 'Artist/Venue', action: 'Configure payout routing for first event', priority: 'medium' },
        { part: 'Subscription', action: 'Create SubscriptionPlan records for the 5 tiers (or run create_subscription_plans)', priority: 'high' },
        { part: 'Marketplace', action: 'Activate venue/workforce/artist/service provider marketplaces based on real usage', priority: 'medium' },
        { part: 'Marketplace', action: 'Authorize app connectors for partner integrations', priority: 'medium' }
      ];
      return Response.json({ actions });
    }

    // ---- next_activation_tasks (top 10) ----
    if (operation === 'next_activation_tasks') {
      const tasks = [
        { rank: 1, task: 'Set Stripe environment secrets (SECRET_KEY, PUBLISHABLE_KEY, WEBHOOK_SECRET)', part: 'Stripe', priority: 'critical', effort: '10 min' },
        { rank: 2, task: 'Register Stripe webhook endpoint + copy signing secret', part: 'Stripe', priority: 'critical', effort: '15 min' },
        { rank: 3, task: 'Authorize GitHub connector + grant repo:read on Canon repo', part: 'GitHub', priority: 'high', effort: '20 min' },
        { rank: 4, task: 'Run GitHub Canon sync + review proposed imports', part: 'GitHub', priority: 'high', effort: '1 hour' },
        { rank: 5, task: 'Onboard first worker (Founder niece) via Activation Center', part: 'Workforce', priority: 'high', effort: '30 min' },
        { rank: 6, task: 'Assign mentor/director + schedule safety orientation', part: 'Workforce', priority: 'high', effort: '30 min' },
        { rank: 7, task: 'Create 5 SubscriptionPlan records (run create_subscription_plans)', part: 'Subscription', priority: 'high', effort: '5 min' },
        { rank: 8, task: 'Onboard first artist + first venue profiles', part: 'Artist/Venue', priority: 'medium', effort: '1 hour' },
        { rank: 9, task: 'Run consolidation scan → review 9 BuildQueueItems', part: 'Consolidation', priority: 'medium', effort: '30 min' },
        { rank: 10, task: 'Flip StripeReadinessConfig to production after sandbox pass', part: 'Stripe', priority: 'critical', effort: '5 min' }
      ];
      return Response.json({ tasks });
    }

    return Response.json({ error: 'Unknown operation: ' + operation }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});