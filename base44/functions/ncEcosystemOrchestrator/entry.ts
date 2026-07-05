import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ─── The 26-module Ecosystem Registry ───
// Each module: key, name, category, dependencies, expected entities, expected pages
const ECOSYSTEM_MODULES = [
  { key: 'executive_command', name: 'Executive Command', cat: 'executive', deps: ['mission_control', 'financial_intelligence', 'customer_success', 'ai_workforce', 'workforce_gateway', 'knowledge_graph'], entities: [], pages: ['/executive-command'] },
  { key: 'mission_control', name: 'Mission Control', cat: 'executive', deps: ['executive_command', 'organizational_intelligence', 'knowledge_graph'], entities: ['StrategicGoal', 'DailyBriefing'], pages: ['/mission-control'] },
  { key: 'workforce_gateway', name: 'Workforce Gateway', cat: 'workforce', deps: ['trust_system', 'contribution_intelligence', 'knowledge_graph', 'enterprise_memory', 'training_library'], entities: ['WorkforceProfile', 'IndustryTemplate', 'CareerPipelineStage', 'WorkforceAssessment', 'CoachingNote', 'CareerPassportEntry'], pages: ['/workforce-gateway', '/workforce-director'] },
  { key: 'director_compass', name: 'Director Compass', cat: 'workforce', deps: ['trust_system', 'member_journey', 'organizational_intelligence'], entities: ['DirectorConversation', 'MemberIntake'], pages: ['/director-assistant'] },
  { key: 'daily_compass', name: 'Daily Compass', cat: 'executive', deps: ['organizational_intelligence', 'knowledge_graph'], entities: ['DailyReflection'], pages: ['/'] },
  { key: 'customer_success', name: 'Customer Success', cat: 'customer', deps: ['crm', 'revenue_health', 'notifications'], entities: ['CustomerSuccessProfile', 'CustomerInteraction'], pages: ['/customer-success'] },
  { key: 'crm', name: 'CRM', cat: 'customer', deps: ['revenue_health', 'customer_success'], entities: ['CRMLead', 'CRMContact', 'CRMDeal', 'CRMOpportunity'], pages: ['/crm', '/crm-pipeline'] },
  { key: 'ai_workforce', name: 'AI Workforce', cat: 'intelligence', deps: ['knowledge_graph', 'organizational_intelligence'], entities: ['AgentProfile', 'AgentTask'], pages: ['/agents', '/agent-roster'] },
  { key: 'contribution_intelligence', name: 'Contribution Intelligence', cat: 'intelligence', deps: ['trust_system', 'reputation_system', 'workforce_gateway'], entities: ['ContributionScore'], pages: [] },
  { key: 'trust_system', name: 'Trust System', cat: 'intelligence', deps: ['reputation_system', 'knowledge_graph'], entities: ['TrustScore'], pages: [] },
  { key: 'reputation_system', name: 'Reputation System', cat: 'intelligence', deps: ['contribution_intelligence', 'trust_system'], entities: ['ReputationRecord'], pages: [] },
  { key: 'knowledge_graph', name: 'Knowledge Graph', cat: 'knowledge', deps: ['enterprise_memory', 'development_memory'], entities: ['KnowledgeNode', 'GraphNode', 'RelationshipLink', 'SemanticIndex'], pages: ['/knowledge-graph'] },
  { key: 'enterprise_memory', name: 'Enterprise Memory', cat: 'knowledge', deps: ['organizational_intelligence', 'knowledge_graph'], entities: ['NCOSMemory', 'MemoryRecord'], pages: ['/ncos-memory'] },
  { key: 'development_memory', name: 'Development Memory', cat: 'knowledge', deps: ['knowledge_graph', 'organizational_intelligence'], entities: ['EngineeringJournal', 'EngineeringLesson', 'BugKnowledgeBase', 'PromptLibrary', 'ADR'], pages: ['/nc-dev-memory'] },
  { key: 'organizational_intelligence', name: 'Organizational Intelligence', cat: 'intelligence', deps: ['daily_compass', 'enterprise_memory', 'development_memory'], entities: ['OrganizationalIntelligence', 'PatternRecord'], pages: ['/nc-intelligence'] },
  { key: 'financial_intelligence', name: 'Financial Intelligence', cat: 'financial', deps: ['revenue_health', 'customer_success', 'executive_command'], entities: ['FinancialSnapshot', 'FinancialTransaction', 'FinancialForecast'], pages: ['/financial-intelligence'] },
  { key: 'survival_engine', name: 'Survival Engine', cat: 'financial', deps: ['financial_intelligence', 'revenue_health'], entities: ['SurvivalMetric'], pages: ['/survival'] },
  { key: 'self_governance', name: 'Self-Governance', cat: 'governance', deps: ['nc_canon', 'organizational_intelligence'], entities: ['GovernancePolicy', 'NCConstitution', 'FounderConfiguration', 'ApprovalGate'], pages: ['/self-governance'] },
  { key: 'event_ecosystem', name: 'Event Ecosystem', cat: 'experience', deps: ['workforce_gateway', 'crm', 'revenue_health'], entities: ['Venue', 'Event', 'EventProvider', 'EventReadinessAssessment', 'EventReport'], pages: ['/experience'] },
  { key: 'resource_compass', name: 'Resource Compass', cat: 'resource', deps: ['crm', 'customer_success'], entities: ['ResourceCase', 'ResourceApplication', 'ResourceAppointment', 'ResourceReminder'], pages: ['/resource-compass'] },
  { key: 'jurisengine', name: 'JurisEngine', cat: 'legal', deps: ['nc_canon', 'evidence_vault'], entities: ['LegalIssue', 'JurisEngine'], pages: ['/jurisengine'] },
  { key: 'nc_canon', name: 'NC Canon', cat: 'governance', deps: ['jurisengine', 'evidence_vault'], entities: ['CanonEntry', 'CanonCoverage', 'CanonImportQueue'], pages: ['/canon', '/canon-dashboard'] },
  { key: 'evidence_vault', name: 'Evidence Vault', cat: 'legal', deps: ['nc_canon'], entities: ['Evidence', 'CaseFile', 'VideoEvidence', 'Witness'], pages: ['/evidence'] },
  { key: 'notifications', name: 'Notifications', cat: 'infrastructure', deps: ['executive_command', 'customer_success'], entities: ['Notification'], pages: ['/notifications'] },
  { key: 'scheduling', name: 'Scheduling', cat: 'infrastructure', deps: ['workforce_gateway', 'event_ecosystem'], entities: ['WorkerSchedule', 'ResourceAppointment'], pages: ['/workforce/schedule'] },
  { key: 'analytics', name: 'Analytics', cat: 'intelligence', deps: ['organizational_intelligence', 'financial_intelligence', 'customer_success'], entities: ['EngagementMetric', 'ModuleUsageEvent'], pages: [] },
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const svc = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));
    const { operation, params = {} } = body;

    // ─── FULL ECOSYSTEM SCAN ───
    if (operation === 'scan') {
      // Gather counts across all expected entities + key diagnostic entities
      const entityCounts = {};
      const allEntitiesToCheck = new Set();
      for (const m of ECOSYSTEM_MODULES) (m.entities || []).forEach(e => allEntitiesToCheck.add(e));
      ['BuildRegistry', 'Task', 'AgentProfile', 'Automation', 'CanonEntry', 'CustomerSuccessProfile', 'Subscription', 'DiagnosticFinding', 'SystemHealthScore', 'OrganizationalIntelligence', 'RoadmapItem', 'EngineeringLesson', 'KnowledgeNode', 'RevenueEvent', 'FinancialSnapshot', 'SurvivalMetric'].forEach(e => allEntitiesToCheck.add(e));

      // Bounded parallel batch counting (5 at a time) with retry to avoid rate limits
      const entityList = Array.from(allEntitiesToCheck);
      const countResults = await processBatch(entityList, 5, async (entity) => {
        try {
          const sample = await withRetry(() => svc.entities[entity].list('-created_date', 50));
          return { entity, count: sample.length };
        } catch { return { entity, count: -1 }; } // entity doesn't exist
      });
      for (const r of countResults) if (r) entityCounts[r.entity] = r.count;

      // Build module health
      const modules = [];
      for (const m of ECOSYSTEM_MODULES) {
        const missingEntities = (m.entities || []).filter(e => entityCounts[e] === -1);
        const emptyEntities = (m.entities || []).filter(e => entityCounts[e] === 0);
        const hasRecords = (m.entities || []).some(e => entityCounts[e] > 0);
        const score = clampScore(
          (hasRecords ? 40 : 0) +
          (missingEntities.length === 0 ? 30 : Math.max(0, 30 - missingEntities.length * 10)) +
          (emptyEntities.length === 0 ? 20 : Math.max(0, 20 - emptyEntities.length * 5)) +
          (m.entities.length > 0 ? 10 : 30)
        );
        let status = 'critical';
        if (score >= 80) status = 'excellent';
        else if (score >= 65) status = 'good';
        else if (score >= 45) status = 'fair';
        else if (score >= 25) status = 'at_risk';
        if (!hasRecords && m.entities.length > 0) status = 'unregistered';

        modules.push({
          module_key: m.key,
          module_name: m.name,
          module_category: m.cat,
          depends_on: m.deps,
          depended_by: ECOSYSTEM_MODULES.filter(x => x.deps.includes(m.key)).map(x => x.key),
          expected_entities: m.entities,
          expected_pages: m.pages,
          health_score: score,
          health_status: status,
          record_count: (m.entities || []).reduce((s, e) => s + Math.max(0, entityCounts[e] || 0), 0),
          is_registered: hasRecords || m.entities.length === 0,
          missing_entities: missingEntities,
          empty_entities: emptyEntities,
        });
      }

      // Persist module dependencies — clear old then batch-create (8 per batch) with retry
      const depRecords = modules.map(mod => ({
        module_key: mod.module_key,
        module_name: mod.module_name,
        module_category: mod.module_category,
        depends_on: mod.depends_on,
        depended_by: mod.depended_by,
        expected_entities: mod.expected_entities,
        expected_pages: mod.expected_pages,
        health_score: mod.health_score,
        health_status: mod.health_status,
        record_count: mod.record_count,
        is_registered: mod.is_registered,
        auto_registered: true,
        registered_at: new Date().toISOString(),
        missing_entities: mod.missing_entities,
        empty_entities: mod.empty_entities,
      }));
      try {
        await withRetry(() => svc.entities.ModuleDependency.deleteMany({ orchestrator_managed: true }));
        await persistBatched(svc, 'ModuleDependency', depRecords, 8);
      } catch {}

      // ─── Detect bottlenecks, missing relationships, duplicates, unused ───
      const insights = [];

      // 1. Module bottlenecks — modules with at_risk/critical health
      for (const mod of modules.filter(m => m.health_status === 'critical' || m.health_status === 'at_risk' || m.health_status === 'unregistered')) {
        insights.push({
          insight_key: `bottleneck_${mod.module_key}`,
          title: `${mod.module_name} is ${mod.health_status.replace('_', ' ')}`,
          description: `${mod.module_name} health score: ${mod.health_score}/100. Missing entities: ${(mod.missing_entities || []).join(', ') || 'none'}. Empty entities: ${(mod.empty_entities || []).join(', ') || 'none'}.`,
          insight_type: 'bottleneck',
          affected_modules: [mod.module_key],
          root_cause: mod.health_status === 'unregistered' ? 'Module has no data records yet' : 'Missing or empty entities within the module',
          recommended_action: mod.health_status === 'unregistered' ? `Seed initial data for ${mod.module_name} to activate the module` : `Resolve missing/empty entities in ${mod.module_name}`,
          what_it_unlocks: `Activating ${mod.module_name} enables ${(mod.depended_by || []).length} dependent modules`,
          customer_impact: mod.depended_by.includes('customer_success') || mod.depended_by.includes('crm') ? 70 : 30,
          revenue_impact: mod.depended_by.includes('financial_intelligence') || mod.depended_by.includes('revenue_health') ? 70 : 25,
          strategic_importance: mod.depended_by.length * 10,
          intelligence_gained: 40,
          dev_effort_hours: mod.missing_entities.length > 0 ? 8 : 4,
          dev_effort_label: mod.missing_entities.length > 0 ? 'medium' : 'small',
          approval_category: 'general',
          requires_founder_approval: false,
          auto_apply_eligible: false,
          detected_at: new Date().toISOString(),
          evidence: [{ module: mod.module_key, health_score: mod.health_score, missing: mod.missing_entities, empty: mod.empty_entities }],
        });
      }

      // 2. Missing relationships — modules whose dependencies are unhealthy
      for (const mod of modules) {
        const unhealthyDeps = mod.depends_on.filter(d => {
          const dep = modules.find(m => m.module_key === d);
          return dep && (dep.health_status === 'critical' || dep.health_status === 'unregistered');
        });
        if (unhealthyDeps.length > 0) {
          insights.push({
            insight_key: `missing_rel_${mod.module_key}`,
            title: `${mod.module_name} depends on ${unhealthyDeps.length} unhealthy modules`,
            description: `${mod.module_name} requires: ${unhealthyDeps.join(', ')} — but these are critical or unregistered.`,
            insight_type: 'missing_relationship',
            affected_modules: [mod.module_key, ...unhealthyDeps],
            root_cause: 'Upstream dependencies not yet activated',
            recommended_action: `Activate ${unhealthyDeps.join(', ')} before relying on ${mod.module_name}`,
            what_it_unlocks: `Full ${mod.module_name} functionality`,
            customer_impact: 40, revenue_impact: 35, strategic_importance: 60, intelligence_gained: 30,
            dev_effort_hours: 12, dev_effort_label: 'medium',
            approval_category: 'general', requires_founder_approval: false, auto_apply_eligible: false,
            detected_at: new Date().toISOString(),
            evidence: [{ module: mod.module_key, unhealthy_deps: unhealthyDeps }],
          });
        }
      }

      // 3. Unused entities — entities with 0 records that are expected
      const unusedEntities = [];
      for (const [entity, count] of Object.entries(entityCounts)) {
        if (count === 0 && entity !== 'FinancialForecast' && entity !== 'SurvivalMetric') {
          // Skip entities that are legitimately sparse
          if (!['ADR', 'EvolutionProposal', 'SimulationScenario', 'EnterpriseClone', 'EnterpriseBlueprint', 'ModuleReview', 'ModuleInstallation', 'DigitalTwin', 'PlatformApplication'].includes(entity)) {
            unusedEntities.push(entity);
          }
        }
      }
      if (unusedEntities.length > 0) {
        insights.push({
          insight_key: 'unused_entities_cluster',
          title: `${unusedEntities.length} entities have zero records`,
          description: `Entities with no data: ${unusedEntities.slice(0, 10).join(', ')}${unusedEntities.length > 10 ? '...' : ''}`,
          insight_type: 'unused_asset',
          affected_modules: [],
          root_cause: 'Entities created but never populated',
          recommended_action: 'Seed these entities with initial data or archive if no longer needed',
          what_it_unlocks: 'Cleaner platform, focused development effort',
          customer_impact: 10, revenue_impact: 5, strategic_importance: 20, intelligence_gained: 15,
          dev_effort_hours: 2, dev_effort_label: 'trivial',
          approval_category: 'general', requires_founder_approval: false, auto_apply_eligible: true,
          detected_at: new Date().toISOString(),
          evidence: unusedEntities.slice(0, 20).map(e => ({ entity: e, count: 0 })),
        });
      }

      // 4. Duplicate functionality — detect entities with similar names
      const allEntityNames = Object.keys(entityCounts).filter(e => entityCounts[e] >= 0);
      const duplicates = [];
      const seen = new Set();
      for (const e of allEntityNames) {
        if (seen.has(e)) continue;
        const base = e.replace(/^(NC|CRM|Worker|Event)/, '').toLowerCase();
        const similar = allEntityNames.filter(o => o !== e && !seen.has(o) && o.replace(/^(NC|CRM|Worker|Event)/, '').toLowerCase() === base);
        if (similar.length > 0) { duplicates.push([e, ...similar]); [e, ...similar].forEach(x => seen.add(x)); }
      }
      // Known duplicate families
      const knownDupes = [
        ['KnowledgeNode', 'GraphNode', 'SemanticIndex'],
        ['NCOSMemory', 'MemoryRecord'],
        ['EngineeringJournal', 'EngineeringLesson'],
        ['WorkforceProfile', 'WorkerProfile'],
        ['GigOpportunity', 'Event'],
      ];
      for (const family of knownDupes) {
        const existing = family.filter(e => entityCounts[e] >= 0);
        if (existing.length > 1) {
          insights.push({
            insight_key: `duplicate_${existing[0]}`,
            title: `Potential duplicate entities: ${existing.join(' / ')}`,
            description: `${existing.join(', ')} may serve overlapping purposes. Consolidating would reduce complexity.`,
            insight_type: 'duplicate_functionality',
            affected_modules: [],
            root_cause: 'Entities created at different times for similar purposes',
            recommended_action: 'Consolidate into one canonical entity or document the distinct purpose of each',
            what_it_unlocks: 'Reduced data fragmentation, simpler queries',
            customer_impact: 5, revenue_impact: 5, strategic_importance: 15, intelligence_gained: 10,
            dev_effort_hours: 16, dev_effort_label: 'large',
            approval_category: 'general', requires_founder_approval: false, auto_apply_eligible: false,
            detected_at: new Date().toISOString(),
            evidence: existing.map(e => ({ entity: e, count: entityCounts[e] })),
          });
        }
      }

      // 5. Canon gap (critical)
      const canonCount = entityCounts['CanonEntry'] || 0;
      if (canonCount < 10) {
        insights.push({
          insight_key: 'canon_gap_critical',
          title: `NC Canon has ${canonCount} entries (target: 25+)`,
          description: 'Canon is the foundation of legal readiness. Without verified Canon, JurisEngine and Evidence Vault cannot provide reliable guidance.',
          insight_type: 'canon_gap',
          affected_modules: ['nc_canon', 'jurisengine', 'evidence_vault'],
          root_cause: 'Canon ingestion not prioritized',
          recommended_action: 'Import legal authority text and verify Canon entries — focus on high-impact categories',
          what_it_unlocks: 'Unlocks JurisEngine reliability, Evidence Vault cross-referencing, and legal readiness',
          customer_impact: 60, revenue_impact: 50, strategic_importance: 95, intelligence_gained: 80,
          dev_effort_hours: 40, dev_effort_label: 'large',
          approval_category: 'legal', requires_founder_approval: true, auto_apply_eligible: false,
          detected_at: new Date().toISOString(),
          evidence: [{ entity: 'CanonEntry', count: canonCount, target: 25 }],
        });
      }

      // 6. Inactive AI agents
      const agentProfiles = await safeList(svc, 'AgentProfile', '-created_date', 200);
      const idleAgents = agentProfiles.filter(a => a.status === 'idle' || a.status === 'paused');
      if (idleAgents.length > 0) {
        insights.push({
          insight_key: 'dormant_agents',
          title: `${idleAgents.length} dormant AI agents`,
          description: `${idleAgents.length} of ${agentProfiles.length} agents are idle or paused. Names: ${idleAgents.slice(0, 5).map(a => a.name).join(', ')}${idleAgents.length > 5 ? '...' : ''}`,
          insight_type: 'agent_dormant',
          affected_modules: ['ai_workforce'],
          root_cause: 'Agents not assigned to active task queues',
          recommended_action: 'Reactivate dormant agents and assign to high-priority work queues',
          what_it_unlocks: 'Increased autonomous workforce capacity',
          customer_impact: 40, revenue_impact: 30, strategic_importance: 50, intelligence_gained: 45,
          dev_effort_hours: 3, dev_effort_label: 'small',
          approval_category: 'general', requires_founder_approval: false, auto_apply_eligible: true,
          detected_at: new Date().toISOString(),
          evidence: idleAgents.slice(0, 10).map(a => ({ name: a.name, status: a.status })),
        });
      }

      // 7. Customer churn risk
      const csProfiles = await safeList(svc, 'CustomerSuccessProfile', '-created_date', 200);
      const atRisk = csProfiles.filter(c => c.churn_risk_level === 'high' || c.churn_risk_level === 'critical');
      if (atRisk.length > 0) {
        insights.push({
          insight_key: 'customer_churn_risk',
          title: `${atRisk.length} customers at churn risk`,
          description: `${atRisk.filter(c => c.churn_risk_level === 'critical').length} critical, ${atRisk.filter(c => c.churn_risk_level === 'high').length} high. ${atRisk.filter(c => c.founder_alert_required).length} require founder attention.`,
          insight_type: 'customer_risk',
          affected_modules: ['customer_success', 'revenue_health'],
          root_cause: 'Insufficient proactive engagement or product gaps',
          recommended_action: 'Execute win-back workflow and generate personalized outreach for each at-risk customer',
          what_it_unlocks: 'Prevents revenue loss, improves retention',
          customer_impact: 90, revenue_impact: 80, strategic_importance: 85, intelligence_gained: 50,
          dev_effort_hours: 6, dev_effort_label: 'medium',
          approval_category: 'general', requires_founder_approval: false, auto_apply_eligible: false,
          detected_at: new Date().toISOString(),
          evidence: atRisk.slice(0, 5).map(c => ({ name: c.customer_name, level: c.churn_risk_level })),
        });
      }

      // 8. Knowledge graph growth
      const kgCount = entityCounts['KnowledgeNode'] || 0;
      if (kgCount < 50) {
        insights.push({
          insight_key: 'knowledge_graph_thin',
          title: `Knowledge Graph has ${kgCount} nodes (target: 100+)`,
          description: 'A thin Knowledge Graph limits the platform\'s ability to connect insights, detect patterns, and recommend actions.',
          insight_type: 'knowledge_gap',
          affected_modules: ['knowledge_graph', 'organizational_intelligence'],
          root_cause: 'Insufficient auto-registration of entities as knowledge nodes',
          recommended_action: 'Run Knowledge Graph sync to register all entities as nodes with relationships',
          what_it_unlocks: 'Cross-module intelligence, pattern detection, recommendation engine',
          customer_impact: 30, revenue_impact: 25, strategic_importance: 70, intelligence_gained: 90,
          dev_effort_hours: 4, dev_effort_label: 'small',
          approval_category: 'general', requires_founder_approval: false, auto_apply_eligible: true,
          detected_at: new Date().toISOString(),
          evidence: [{ entity: 'KnowledgeNode', count: kgCount, target: 100 }],
        });
      }

      // Rank insights by composite priority
      for (const ins of insights) {
        ins.priority_score = clampScore(
          (ins.customer_impact || 0) * 0.25 +
          (ins.revenue_impact || 0) * 0.25 +
          (ins.strategic_importance || 0) * 0.25 +
          (ins.intelligence_gained || 0) * 0.15 +
          (100 - (ins.dev_effort_hours || 0) * 2) * 0.10
        );
      }
      insights.sort((a, b) => b.priority_score - a.priority_score);

      // Persist insights via bounded batch queue — delete old detected, then batch-create 5 at a time with retry+backoff
      const persistenceErrors = [];
      let insightsPersisted = 0;
      try {
        await withRetry(() => svc.entities.OrchestrationInsight.deleteMany({ status: 'detected' }));
      } catch (e) { persistenceErrors.push({ phase: 'delete_detected', error: e.message }); }
      const persistRes = await persistBatched(svc, 'OrchestrationInsight', insights, 5);
      insightsPersisted = persistRes.saved;
      persistenceErrors.push(...persistRes.errors);

      // ─── Executive Readiness Score ───
      const readiness = calcExecutiveReadiness(modules, insights, entityCounts);

      // Persist readiness as a health score
      try {
        await svc.entities.SystemHealthScore.create({
          entity_type: 'operational_readiness',
          entity_name: 'Executive Readiness',
          score: readiness.overall,
          status: readiness.overall >= 80 ? 'excellent' : readiness.overall >= 65 ? 'good' : readiness.overall >= 45 ? 'fair' : readiness.overall >= 25 ? 'at_risk' : 'critical',
          factors: readiness.dimensions.map(d => ({ name: d.name, value: d.score, weight: d.weight })),
          recommended_actions: readiness.gaps.slice(0, 5).map(g => g.action),
          expected_impact: `${readiness.overall}% toward autonomous NC operating system`,
          confidence_level: 80,
          last_evaluated: new Date().toISOString(),
          founder_alert_required: readiness.overall < 40,
          alert_reason: readiness.overall < 40 ? `Executive Readiness at ${readiness.overall}% — significant work remaining` : '',
        });
      } catch {}

      return Response.json({
        operation: 'scan',
        modules_scanned: modules.length,
        modules_healthy: modules.filter(m => m.health_status === 'excellent' || m.health_status === 'good').length,
        modules_at_risk: modules.filter(m => m.health_status === 'at_risk' || m.health_status === 'critical').length,
        modules_unregistered: modules.filter(m => m.health_status === 'unregistered').length,
        insights_generated: insights.length,
        insights_persisted: insightsPersisted,
        insights_persistence_errors: persistenceErrors.slice(0, 5),
        insights_auto_applyable: insights.filter(i => i.auto_apply_eligible).length,
        insights_founder_approval: insights.filter(i => i.requires_founder_approval).length,
        executive_readiness: readiness,
        module_dependency_map: modules,
        scanned_at: new Date().toISOString(),
      });
    }

    // ─── BUILD NC: Highest-value work remaining ───
    if (operation === 'build_nc') {
      const insights = await safeFilter(svc, 'OrchestrationInsight', { status: { $ne: 'applied' } }, '-created_date', 100);
      const modules = await safeList(svc, 'ModuleDependency', '-created_date', 100);
      const latestModules = dedupeLatest(modules, 'module_key');

      // Sort by priority score descending
      const sorted = insights.filter(i => i.priority_score !== undefined).sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0));

      // Group by approval category
      const byCategory = {
        founder: sorted.filter(i => i.requires_founder_approval),
        auto: sorted.filter(i => i.auto_apply_eligible && !i.requires_founder_approval),
        manual: sorted.filter(i => !i.auto_apply_eligible && !i.requires_founder_approval),
      };

      // Calculate cumulative impact if all top insights are resolved
      const topWork = sorted.slice(0, 12).map(i => ({
        id: i.id,
        key: i.insight_key,
        title: i.title,
        description: i.description,
        what_it_unlocks: i.what_it_unlocks,
        recommended_action: i.recommended_action,
        priority_score: i.priority_score,
        dimensions: {
          customer_impact: i.customer_impact,
          revenue_impact: i.revenue_impact,
          strategic_importance: i.strategic_importance,
          intelligence_gained: i.intelligence_gained,
          dev_effort_hours: i.dev_effort_hours,
        },
        approval_category: i.approval_category,
        requires_founder_approval: i.requires_founder_approval,
        auto_apply_eligible: i.auto_apply_eligible,
        status: i.status,
        affected_modules: i.affected_modules,
      }));

      // Readiness
      const entityCounts = {};
      const allEntities = new Set();
      for (const m of Object.values(latestModules)) (m.expected_entities || []).forEach(e => allEntities.add(e));
      for (const e of allEntities) {
        try { const r = await svc.entities[e].list('-created_date', 500); entityCounts[e] = r.length; } catch { entityCounts[e] = -1; }
      }
      const readiness = calcExecutiveReadiness(Object.values(latestModules), insights, entityCounts);

      return Response.json({
        operation: 'build_nc',
        top_work: topWork,
        founder_queue: byCategory.founder.map(i => ({ id: i.id, title: i.title, category: i.approval_category, priority: i.priority_score })),
        auto_apply_queue: byCategory.auto.map(i => ({ id: i.id, title: i.title, priority: i.priority_score })),
        manual_queue_count: byCategory.manual.length,
        total_open_insights: sorted.length,
        cumulative_impact_if_all_resolved: {
          customer: Math.min(100, sorted.reduce((s, i) => s + (i.customer_impact || 0), 0) / Math.max(1, sorted.length)),
          revenue: Math.min(100, sorted.reduce((s, i) => s + (i.revenue_impact || 0), 0) / Math.max(1, sorted.length)),
          intelligence: Math.min(100, sorted.reduce((s, i) => s + (i.intelligence_gained || 0), 0) / Math.max(1, sorted.length)),
        },
        executive_readiness: readiness,
        evaluated_at: new Date().toISOString(),
      });
    }

    // ─── APPLY INSIGHT: Auto-apply or founder-approved ───
    if (operation === 'apply_insight') {
      const { insight_id, approved = false } = params;
      const insight = await svc.entities.OrchestrationInsight.get(insight_id).catch(() => null);
      if (!insight) return Response.json({ error: 'Insight not found' }, { status: 404 });

      if (insight.requires_founder_approval && !approved) {
        return Response.json({ error: 'Founder approval required for this insight', approval_category: insight.approval_category }, { status: 403 });
      }

      // Mark as applied
      await svc.entities.OrchestrationInsight.update(insight_id, {
        status: 'applied',
        applied_at: new Date().toISOString(),
        approved_by: approved ? user.id : 'system',
        approved_at: approved ? new Date().toISOString() : undefined,
        auto_applied: !approved,
      });

      // Capture as organizational intelligence (lesson learned)
      try {
        await svc.entities.OrganizationalIntelligence.create({
          insight_type: 'process_improvement',
          title: `Resolved: ${insight.title}`,
          description: `Orchestrator ${approved ? 'applied with founder approval' : 'auto-applied'}: ${insight.recommended_action}`,
          frequency: 1,
          affected_modules: insight.affected_modules || [],
          recommended_action: insight.recommended_action,
          source: 'system_scan',
          status: 'resolved',
          priority: insight.priority_score > 70 ? 'critical' : 'high',
          tags: ['orchestrator', 'auto_applied', insight.insight_type],
        });
      } catch {}

      return Response.json({ operation: 'apply_insight', insight_id, applied: true, auto: !approved });
    }

    // ─── REGISTER ASSET: Auto-registration of new entities/pages/automations ───
    if (operation === 'register_asset') {
      const { asset_key, asset_name, asset_type, module_key, route_path, entity_name } = params;
      if (!asset_key || !asset_name || !asset_type) return Response.json({ error: 'Missing required fields' }, { status: 400 });
      try {
        const existing = await svc.entities.PlatformAsset.filter({ asset_key }, '-created_date', 1);
        if (existing.length > 0) {
          await svc.entities.PlatformAsset.update(existing[0].id, { last_used: new Date().toISOString(), is_used: true, usage_count: (existing[0].usage_count || 0) + 1 });
          return Response.json({ operation: 'register_asset', asset_key, updated: true });
        }
        const rec = await svc.entities.PlatformAsset.create({
          asset_key, asset_name, asset_type,
          module_key: module_key || 'unknown',
          module_name: (ECOSYSTEM_MODULES.find(m => m.key === module_key) || {}).name || module_key || 'Unknown',
          route_path, entity_name,
          auto_registered: true,
          registered_at: new Date().toISOString(),
          is_used: true, usage_count: 1,
          health_status: 'active',
        });
        return Response.json({ operation: 'register_asset', asset_key, id: rec.id, created: true });
      } catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
    }

    // ─── DEPENDENCY MAP: What depends on what ───
    if (operation === 'dependency_map') {
      const modules = await safeList(svc, 'ModuleDependency', '-created_date', 100);
      const latest = dedupeLatest(modules, 'module_key');
      const map = Object.values(latest).map(m => ({
        module_key: m.module_key,
        module_name: m.module_name,
        category: m.module_category,
        depends_on: m.depends_on || [],
        depended_by: m.depended_by || [],
        health_score: m.health_score,
        health_status: m.health_status,
        record_count: m.record_count,
        missing_entities: m.missing_entities || [],
        empty_entities: m.empty_entities || [],
      }));
      return Response.json({ operation: 'dependency_map', modules: map, total: map.length, evaluated_at: new Date().toISOString() });
    }

    return Response.json({ error: 'Unknown operation: ' + operation }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// ─── Helpers ───
async function safeList(svc, entity, ...args) { try { return await svc.entities[entity].list(...args); } catch { return []; } }
async function safeFilter(svc, entity, query, ...args) { try { return await svc.entities[entity].filter(query, ...args); } catch { return []; } }
function clampScore(n) { return Math.max(0, Math.min(100, Math.round(n))); }

function dedupeLatest(records, keyField) {
  const latest = {};
  for (const r of records) {
    if (!latest[r[keyField]] || new Date(r.created_date) > new Date(latest[r[keyField]].created_date)) latest[r[keyField]] = r;
  }
  return latest;
}

function calcExecutiveReadiness(modules, insights, entityCounts) {
  const dims = [
    { name: 'Module Health', score: avg(modules.map(m => m.health_score || 50)), weight: 0.20 },
    { name: 'Customer Health', score: clampScore(100 - (insights.filter(i => i.insight_type === 'customer_risk').length * 15)), weight: 0.12 },
    { name: 'Revenue Health', score: clampScore((entityCounts['Subscription'] || 0) > 0 ? 60 : 30), weight: 0.12 },
    { name: 'Intelligence Growth', score: clampScore((entityCounts['OrganizationalIntelligence'] || 0) * 3 + (entityCounts['EngineeringLesson'] || 0) * 2), weight: 0.10 },
    { name: 'Knowledge Growth', score: clampScore((entityCounts['KnowledgeNode'] || 0) * 1.5 + (entityCounts['EngineeringLesson'] || 0) * 1), weight: 0.10 },
    { name: 'Canon Coverage', score: clampScore((entityCounts['CanonEntry'] || 0) * 4), weight: 0.10 },
    { name: 'Automation Coverage', score: clampScore((entityCounts['Automation'] || 0) * 5 + 20), weight: 0.08 },
    { name: 'Compliance Health', score: clampScore((entityCounts['GovernancePolicy'] || 0) * 5 + 30), weight: 0.08 },
    { name: 'AI Effectiveness', score: clampScore(30 + (entityCounts['AgentProfile'] || 0) * 5), weight: 0.10 },
  ];
  const overall = clampScore(dims.reduce((s, d) => s + d.score * d.weight, 0));
  const gaps = dims.filter(d => d.score < 60).map(d => ({ dimension: d.name, score: d.score, action: `Improve ${d.name} from ${d.score} to 70+` }));
  return {
    overall,
    dimensions: dims,
    gaps,
    autonomous_pct: overall,
    label: overall >= 80 ? 'Self-Improving Enterprise' : overall >= 65 ? 'Near-Autonomous' : overall >= 45 ? 'Coordinated Operations' : overall >= 25 ? 'Fragmented' : 'Early Stage',
  };
}

function avg(arr) { return arr.length > 0 ? Math.round(arr.reduce((s, n) => s + (n || 0), 0) / arr.length) : 0; }

// ─── Batch queue helpers (rate-limit resilient) ───
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Retry a DB op with exponential backoff on rate-limit errors
async function withRetry(fn, retries = 3, baseDelay = 600) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try { return await fn(); }
    catch (e) {
      const msg = ((e?.message || '') + '').toLowerCase();
      const isRateLimit = msg.includes('rate') || msg.includes('429') || msg.includes('too many') || msg.includes('overload') || msg.includes('throttl') || msg.includes('econnreset') || msg.includes('timeout');
      if (attempt === retries || !isRateLimit) throw e;
      await sleep(baseDelay * Math.pow(2, attempt));
    }
  }
}

// Process items in bounded parallel batches (size concurrency), resilient to individual failures
async function processBatch(items, size, fn) {
  const results = [];
  for (let i = 0; i < items.length; i += size) {
    const chunk = items.slice(i, i + size);
    const settled = await Promise.allSettled(chunk.map(fn));
    for (const r of settled) results.push(r.status === 'fulfilled' ? r.value : null);
    if (i + size < items.length) await sleep(120); // brief pause between batches
  }
  return results;
}

// Persist records via a bounded batch queue: bulkCreate in small chunks, fall back to one-by-one on failure
async function persistBatched(svc, entity, records, batchSize = 5) {
  let saved = 0;
  const errors = [];
  for (let i = 0; i < records.length; i += batchSize) {
    const chunk = records.slice(i, i + batchSize);
    try {
      await withRetry(() => svc.entities[entity].bulkCreate(chunk));
      saved += chunk.length;
    } catch (e) {
      // Fallback: create records one-by-one so a single bad record doesn't sink the batch
      for (const rec of chunk) {
        try { await withRetry(() => svc.entities[entity].create(rec)); saved++; }
        catch (e2) { errors.push({ key: rec.insight_key || rec.module_key || rec.asset_key || 'unknown', error: e2.message }); }
      }
      await sleep(250);
    }
    if (i + batchSize < records.length) await sleep(150); // brief pause between batches
  }
  return { saved, errors };
}