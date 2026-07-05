import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { operation, params = {} } = body;
    const svc = base44.asServiceRole;

    // ─── HEALTH AUDIT: Calculate all domain health scores ───
    if (operation === 'health_audit') {
      const [builds, tasks, issues, canonEntries, agents, csProfiles, subs, snapshots, approvals, policies, trustScores, workflows, automations, roadmapItems, releases, lessons, knowledgeNodes, orgIntel, diagnosticFindings, healthChecks, improvements, refunds, invoices] = await Promise.all([
        safeList(svc, 'BuildRegistry', '-created_date', 200),
        safeList(svc, 'Task', '-created_date', 500),
        safeList(svc, 'DiagnosticIssue', '-created_date', 200),
        safeList(svc, 'CanonEntry', '-created_date', 200),
        safeList(svc, 'AgentProfile', '-created_date', 100),
        safeList(svc, 'CustomerSuccessProfile', '-created_date', 200),
        safeList(svc, 'Subscription', '-created_date', 200),
        safeList(svc, 'FinancialSnapshot', '-created_date', 5),
        safeFilter(svc, 'ApprovalGate', { status: 'pending' }, '-created_date', 50),
        safeList(svc, 'GovernancePolicy', '-created_date', 100),
        safeList(svc, 'TrustScore', '-created_date', 100),
        safeList(svc, 'Sprint', '-created_date', 10),
        safeList(svc, 'Automation', '-created_date', 100),
        safeList(svc, 'RoadmapItem', '-created_date', 50),
        safeList(svc, 'Release', '-created_date', 20),
        safeList(svc, 'EngineeringLesson', '-created_date', 100),
        safeList(svc, 'KnowledgeNode', '-created_date', 100),
        safeList(svc, 'OrganizationalIntelligence', '-created_date', 100),
        safeFilter(svc, 'DiagnosticFinding', { status: { $ne: 'resolved' } }, '-created_date', 100),
        safeList(svc, 'HealthCheck', '-created_date', 5),
        safeList(svc, 'ImprovementItem', '-created_date', 100),
        safeList(svc, 'Refund', '-created_date', 50),
        safeList(svc, 'Invoice', '-created_date', 100),
      ]);

      const scores = [];

      // Platform Health
      const blockedBuilds = builds.filter(b => b.is_blocked || (b.blocked_by || []).length > 0);
      const platformScore = clampScore(
        40 + (builds.length > 0 ? (1 - blockedBuilds.length / builds.length) * 30 : 20) +
        (tasks.length > 0 ? (tasks.filter(t => t.status === 'done').length / tasks.length) * 20 : 10) -
        (issues.filter(i => i.severity === 'critical').length * 5)
      );
      scores.push(makeScore('platform', 'Platform', platformScore, [
        { factor: 'Blocked Builds', value: blockedBuilds.length, weight: -2 },
        { factor: 'Critical Issues', value: issues.filter(i => i.severity === 'critical').length, weight: -3 },
        { factor: 'Task Completion', value: tasks.length > 0 ? Math.round(tasks.filter(t => t.status === 'done').length / tasks.length * 100) : 0, weight: 0.2 },
      ], blockedBuilds.length > 0 ? [`${blockedBuilds.length} blocked builds`] : []));

      // Revenue Health
      const latestSnap = snapshots[0] || {};
      const mrr = latestSnap.mrr || subs.reduce((s, sub) => s + (sub.mrr || sub.amount || 0), 0);
      const runway = latestSnap.runway_days || 0;
      const revenueScore = clampScore(
        (mrr > 0 ? 40 : 10) + (runway > 180 ? 30 : runway > 90 ? 20 : runway > 30 ? 10 : 0) +
        (latestSnap.profit > 0 ? 20 : 0) + (latestSnap.gross_margin_pct > 50 ? 10 : 0)
      );
      scores.push(makeScore('revenue', 'Revenue', revenueScore, [
        { factor: 'MRR', value: `$${mrr}`, weight: 0.3 },
        { factor: 'Runway (days)', value: runway, weight: 0.3 },
        { factor: 'Profit', value: latestSnap.profit || 0, weight: 0.2 },
      ], runway < 90 && mrr > 0 ? ['Runway below 90 days'] : mrr === 0 ? ['Zero MRR'] : []));

      // Customer Health
      const csTotal = csProfiles.length;
      const csAtRisk = csProfiles.filter(c => c.churn_risk_level === 'high' || c.churn_risk_level === 'critical').length;
      const csAvgHealth = csTotal > 0 ? Math.round(csProfiles.reduce((s, c) => s + (c.health_score || 50), 0) / csTotal) : 50;
      const customerScore = clampScore(csAvgHealth - (csAtRisk > csTotal * 0.3 ? 15 : 0));
      scores.push(makeScore('customer', 'Customer', customerScore, [
        { factor: 'Total Customers', value: csTotal, weight: 0.1 },
        { factor: 'At-Risk', value: csAtRisk, weight: -1 },
        { factor: 'Avg Health', value: csAvgHealth, weight: 0.5 },
      ], csAtRisk > 0 ? [`${csAtRisk} at-risk customers`] : []));

      // AI Health
      const aiActive = agents.filter(a => a.status === 'active').length;
      const aiAvgPerf = agents.length > 0 ? Math.round(agents.reduce((s, a) => s + (a.performance_score || 0), 0) / agents.length) : 0;
      const aiScore = clampScore(30 + (agents.length > 0 ? (aiActive / agents.length) * 30 : 0) + aiAvgPerf * 0.4);
      scores.push(makeScore('ai', 'AI Workforce', aiScore, [
        { factor: 'Total Agents', value: agents.length, weight: 0.1 },
        { factor: 'Active', value: aiActive, weight: 0.3 },
        { factor: 'Avg Performance', value: aiAvgPerf, weight: 0.4 },
      ], aiActive < agents.length * 0.5 ? ['Less than 50% agents active'] : []));

      // Governance Health
      const activePolicies = policies.filter(p => p.status === 'active').length;
      const governanceScore = clampScore(40 + activePolicies * 5 + (approvals.length > 10 ? -10 : 0));
      scores.push(makeScore('governance', 'Governance', governanceScore, [
        { factor: 'Active Policies', value: activePolicies, weight: 0.3 },
        { factor: 'Pending Approvals', value: approvals.length, weight: -0.5 },
      ], approvals.length > 10 ? [`${approvals.length} pending approvals`] : []));

      // Canon Health
      const verifiedCanon = canonEntries.filter(c => c.verified && c.status === 'active').length;
      const canonScore = clampScore(20 + verifiedCanon * 3);
      scores.push(makeScore('canon', 'NC Canon', canonScore, [
        { factor: 'Total Entries', value: canonEntries.length, weight: 0.1 },
        { factor: 'Verified Active', value: verifiedCanon, weight: 0.6 },
      ], verifiedCanon < 10 ? ['Canon severely underpopulated'] : []));

      // Engineering Health
      const doneTasks = tasks.filter(t => t.status === 'done').length;
      const engScore = clampScore(tasks.length > 0 ? Math.round((doneTasks / tasks.length) * 70) + 30 : 50);
      scores.push(makeScore('engineering', 'Engineering', engScore, [
        { factor: 'Total Tasks', value: tasks.length, weight: 0.1 },
        { factor: 'Done', value: doneTasks, weight: 0.3 },
        { factor: 'In Progress', value: tasks.filter(t => t.status === 'in_progress').length, weight: 0.1 },
      ], []));

      // Knowledge Health
      const knowledgeScore = clampScore(30 + knowledgeNodes.length * 2 + lessons.length * 1);
      scores.push(makeScore('knowledge', 'Knowledge', knowledgeScore, [
        { factor: 'Knowledge Nodes', value: knowledgeNodes.length, weight: 0.3 },
        { factor: 'Lessons Learned', value: lessons.length, weight: 0.2 },
      ], []));

      // Automation Health
      const activeAutomations = automations.filter(a => a.status === 'active').length;
      const automationScore = clampScore(30 + activeAutomations * 5);
      scores.push(makeScore('automation', 'Automation', automationScore, [
        { factor: 'Total Automations', value: automations.length, weight: 0.1 },
        { factor: 'Active', value: activeAutomations, weight: 0.4 },
      ], []));

      // Development Health
      const devScore = clampScore(30 + lessons.length * 2 + (roadmapItems.length > 0 ? 20 : 0));
      scores.push(makeScore('development', 'Development', devScore, [
        { factor: 'Lessons', value: lessons.length, weight: 0.2 },
        { factor: 'Roadmap Items', value: roadmapItems.length, weight: 0.1 },
      ], []));

      // Documentation Health
      const docScore = clampScore(30 + canonEntries.filter(c => c.status === 'active').length * 2);
      scores.push(makeScore('documentation', 'Documentation', docScore, [
        { factor: 'Canon Entries', value: canonEntries.length, weight: 0.2 },
      ], []));

      // Operational Readiness (composite)
      const opsScore = clampScore(Math.round(
        platformScore * 0.25 + revenueScore * 0.2 + customerScore * 0.15 + aiScore * 0.1 +
        engScore * 0.1 + governanceScore * 0.05 + canonScore * 0.05 + automationScore * 0.05 + knowledgeScore * 0.05
      ));
      scores.push(makeScore('operational_readiness', 'Operational Readiness', opsScore, [], []));

      // Founder Workload (inverse — higher score = less workload)
      const founderWorkload = approvals.length + csProfiles.filter(c => c.founder_alert_required).length + issues.filter(i => i.severity === 'critical').length + diagnosticFindings.filter(d => d.founder_alert_required).length;
      const founderScore = clampScore(100 - founderWorkload * 5);
      scores.push(makeScore('founder_workload', 'Founder Workload', founderScore, [
        { factor: 'Pending Approvals', value: approvals.length, weight: -1 },
        { factor: 'CS Alerts', value: csProfiles.filter(c => c.founder_alert_required).length, weight: -1 },
        { factor: 'Critical Issues', value: issues.filter(i => i.severity === 'critical').length, weight: -1 },
      ], founderWorkload > 10 ? [`${founderWorkload} items need founder attention`] : []));

      // Persist scores
      const saved = [];
      for (const s of scores) {
        try {
          const record = await svc.entities.SystemHealthScore.create({ ...s, last_evaluated: new Date().toISOString() });
          saved.push({ entity_type: s.entity_type, score: s.score, id: record.id });
        } catch {}
      }

      return Response.json({
        operation: 'health_audit',
        scores: saved,
        platform_readiness: opsScore,
        founder_workload_score: founderScore,
        intelligence_growth_score: clampScore(orgIntel.length * 2 + lessons.length * 1),
        evaluated_at: new Date().toISOString()
      });
    }

    // ─── DIAGNOSE: Run platform diagnostics ───
    if (operation === 'diagnose') {
      const [builds, tasks, agents, canonEntries, csProfiles, issues, automations, workflows, pages, entities, functions] = await Promise.all([
        safeList(svc, 'BuildRegistry', '-created_date', 200),
        safeList(svc, 'Task', '-created_date', 500),
        safeList(svc, 'AgentProfile', '-created_date', 100),
        safeList(svc, 'CanonEntry', '-created_date', 200),
        safeList(svc, 'CustomerSuccessProfile', '-created_date', 200),
        safeList(svc, 'DiagnosticIssue', '-created_date', 200),
        safeList(svc, 'Automation', '-created_date', 100),
        safeList(svc, 'Sprint', '-created_date', 10),
        safeList(svc, 'Page', '-created_date', 100),
        safeList(svc, 'Entity', '-created_date', 100),
        safeList(svc, 'Function', '-created_date', 100),
      ]);

      const findings = [];

      // Blocked builds
      for (const b of builds.filter(b => b.is_blocked || (b.blocked_by || []).length > 0)) {
        findings.push({
          finding_type: 'incomplete_build',
          severity: 'high',
          title: `Blocked build: ${b.name || 'Unnamed'}`,
          description: `Build "${b.name}" is blocked by: ${(b.blocked_by || []).join(', ')}`,
          explanation: 'Blocked builds halt progress on the affected rail and may cascade to dependent builds.',
          recommended_fix: 'Resolve blocking dependencies or escalate to founder.',
          estimated_effort: 'medium',
          risk_level: 'high',
          affected_modules: [b.rail || 'platform'],
          auto_fix_eligible: false,
          status: 'detected',
          detected_at: new Date().toISOString()
        });
      }

      // Inactive AI agents
      const idleAgents = agents.filter(a => a.status === 'idle' || a.status === 'paused');
      if (idleAgents.length > agents.length * 0.3 && agents.length > 0) {
        findings.push({
          finding_type: 'inactive_ai_agent',
          severity: 'medium',
          title: `${idleAgents.length} inactive AI agents (${Math.round(idleAgents.length / agents.length * 100)}%)`,
          description: `${idleAgents.length} of ${agents.length} agents are idle or paused.`,
          explanation: 'Inactive agents reduce workforce capacity and may indicate misconfigured task assignment.',
          recommended_fix: 'Review agent task queues and reactivate or reassign idle agents.',
          estimated_effort: 'small',
          risk_level: 'medium',
          affected_modules: ['ai_workforce'],
          auto_fix_eligible: false,
          status: 'detected',
          detected_at: new Date().toISOString()
        });
      }

      // Canon gaps
      const verifiedCanon = canonEntries.filter(c => c.verified && c.status === 'active').length;
      if (verifiedCanon < 10) {
        findings.push({
          finding_type: 'canon_gap',
          severity: 'high',
          title: `Canon severely underpopulated (${verifiedCanon} verified entries)`,
          description: `Only ${verifiedCanon} verified active Canon entries. Target: 25+. Canon is the foundation of legal readiness.`,
          explanation: 'Without sufficient verified Canon, the platform cannot provide reliable legal guidance.',
          recommended_fix: 'Prioritize Canon ingestion and review. Focus on high-impact categories.',
          estimated_effort: 'large',
          risk_level: 'high',
          affected_modules: ['canon', 'legal'],
          auto_fix_eligible: false,
          status: 'detected',
          detected_at: new Date().toISOString()
        });
      }

      // Customer friction
      const atRiskCustomers = csProfiles.filter(c => c.churn_risk_level === 'high' || c.churn_risk_level === 'critical');
      if (atRiskCustomers.length > 0) {
        findings.push({
          finding_type: 'customer_friction',
          severity: atRiskCustomers.filter(c => c.churn_risk_level === 'critical').length > 0 ? 'critical' : 'high',
          title: `${atRiskCustomers.length} at-risk customers detected`,
          description: `${atRiskCustomers.length} customers have high or critical churn risk. ${atRiskCustomers.filter(c => c.founder_alert_required).length} require founder attention.`,
          explanation: 'Customer churn directly impacts revenue and may indicate product or support gaps.',
          recommended_fix: 'Run CS evaluation, generate outreach, and address churn factors systematically.',
          estimated_effort: 'medium',
          risk_level: 'high',
          affected_modules: ['customer_success', 'revenue'],
          auto_fix_eligible: false,
          status: 'detected',
          detected_at: new Date().toISOString()
        });
      }

      // Unassigned work
      const unassignedTasks = tasks.filter(t => t.status !== 'done' && !t.assignee_id);
      if (unassignedTasks.length > 5) {
        findings.push({
          finding_type: 'unassigned_work',
          severity: 'medium',
          title: `${unassignedTasks.length} unassigned tasks`,
          description: `${unassignedTasks.length} tasks have no assignee and may be stalled.`,
          explanation: 'Unassigned work creates bottlenecks and reduces throughput.',
          recommended_fix: 'Assign tasks to available agents or team members.',
          estimated_effort: 'small',
          risk_level: 'medium',
          affected_modules: ['engineering'],
          auto_fix_eligible: false,
          status: 'detected',
          detected_at: new Date().toISOString()
        });
      }

      // Revenue leak (unpaid invoices)
      const unpaidInvoices = (await safeFilter(svc, 'Invoice', { status: 'unpaid' }, '-created_date', 50));
      if (unpaidInvoices.length > 3) {
        findings.push({
          finding_type: 'revenue_leak',
          severity: 'high',
          title: `${unpaidInvoices.length} unpaid invoices`,
          description: `${unpaidInvoices.length} invoices are unpaid. Total value: $${unpaidInvoices.reduce((s, inv) => s + (inv.amount || 0), 0).toLocaleString()}.`,
          explanation: 'Unpaid invoices reduce cash flow and may indicate billing or collections issues.',
          recommended_fix: 'Review collections queue and follow up on overdue invoices.',
          estimated_effort: 'small',
          risk_level: 'high',
          affected_modules: ['revenue', 'billing'],
          auto_fix_eligible: false,
          status: 'detected',
          detected_at: new Date().toISOString()
        });
      }

      // Missing automation
      const manualProcesses = tasks.filter(t => t.tags && t.tags.some(tag => /manual|repetitive/i.test(tag)));
      if (manualProcesses.length > 5) {
        findings.push({
          finding_type: 'missing_automation',
          severity: 'low',
          title: `${manualProcesses.length} tasks tagged as manual/repetitive`,
          description: `${manualProcesses.length} tasks are tagged as manual or repetitive — candidates for automation.`,
          explanation: 'Manual processes reduce throughput and increase error rates.',
          recommended_fix: 'Review tagged tasks and create automations for high-frequency processes.',
          estimated_effort: 'medium',
          risk_level: 'low',
          affected_modules: ['automation'],
          auto_fix_eligible: true,
          status: 'detected',
          detected_at: new Date().toISOString()
        });
      }

      // Persist findings
      const saved = [];
      for (const f of findings) {
        try {
          const record = await svc.entities.DiagnosticFinding.create(f);
          saved.push({ finding_type: f.finding_type, severity: f.severity, id: record.id });
        } catch {}
      }

      return Response.json({
        operation: 'diagnose',
        findings: saved,
        total_findings: findings.length,
        critical_count: findings.filter(f => f.severity === 'critical').length,
        high_count: findings.filter(f => f.severity === 'high').length,
        auto_fix_eligible_count: findings.filter(f => f.auto_fix_eligible).length,
        diagnosed_at: new Date().toISOString()
      });
    }

    // ─── DASHBOARD: Unified NIOC dashboard data ───
    if (operation === 'dashboard') {
      const [healthScores, findings, orgIntel, csProfiles, agents, approvals, builds, canonEntries, snapshots, issues, lessons, improvements] = await Promise.all([
        safeList(svc, 'SystemHealthScore', '-created_date', 50),
        safeFilter(svc, 'DiagnosticFinding', { status: { $ne: 'resolved' } }, '-created_date', 50),
        safeList(svc, 'OrganizationalIntelligence', '-created_date', 20),
        safeList(svc, 'CustomerSuccessProfile', '-created_date', 200),
        safeList(svc, 'AgentProfile', '-created_date', 100),
        safeFilter(svc, 'ApprovalGate', { status: 'pending' }, '-created_date', 20),
        safeList(svc, 'BuildRegistry', '-created_date', 100),
        safeList(svc, 'CanonEntry', '-created_date', 200),
        safeList(svc, 'FinancialSnapshot', '-created_date', 1),
        safeList(svc, 'DiagnosticIssue', '-created_date', 50),
        safeList(svc, 'EngineeringLesson', '-created_date', 50),
        safeList(svc, 'ImprovementItem', '-created_date', 20),
      ]);

      // Get latest score per entity_type
      const latestByType = {};
      for (const hs of healthScores) {
        if (!latestByType[hs.entity_type] || new Date(hs.last_evaluated || hs.created_date) > new Date(latestByType[hs.entity_type].last_evaluated || latestByType[hs.entity_type].created_date)) {
          latestByType[hs.entity_type] = hs;
        }
      }
      const latestScores = Object.values(latestByType);

      const platformReadiness = latestByType.operational_readiness?.score || 0;
      const founderWorkload = latestByType.founder_workload?.score || 0;
      const intelligenceGrowth = clampScore(orgIntel.length * 2 + lessons.length * 1);

      // Critical findings
      const criticalFindings = findings.filter(f => f.severity === 'critical' || f.severity === 'high');

      // Founder attention required
      const founderAttention = [
        ...approvals.map(a => ({ source: 'Approval', title: a.title, severity: 'high', url: '/self-governance' })),
        ...csProfiles.filter(c => c.founder_alert_required).map(c => ({ source: 'Customer Success', title: `CHURN ALERT: ${c.customer_name}`, severity: c.alert_severity === 'critical' ? 'critical' : 'high', url: '/customer-success' })),
        ...criticalFindings.map(f => ({ source: 'Diagnostic', title: f.title, severity: f.severity, url: '/nc-intelligence-ops' })),
      ];

      return Response.json({
        operation: 'dashboard',
        health_scores: latestScores,
        platform_readiness_score: platformReadiness,
        founder_workload_reduction_score: founderWorkload,
        intelligence_growth_score: intelligenceGrowth,
        autonomy_readiness_score: clampScore(
          (latestByType.automation?.score || 50) * 0.3 +
          (latestByType.ai?.score || 50) * 0.3 +
          (latestByType.knowledge?.score || 50) * 0.2 +
          (orgIntel.length > 10 ? 20 : orgIntel.length)
        ),
        diagnostic_findings: {
          total: findings.length,
          critical: findings.filter(f => f.severity === 'critical').length,
          high: findings.filter(f => f.severity === 'high').length,
          medium: findings.filter(f => f.severity === 'medium').length,
          auto_fix_eligible: findings.filter(f => f.auto_fix_eligible).length,
          items: findings.slice(0, 15)
        },
        org_intelligence_feed: orgIntel.slice(0, 10),
        founder_attention_required: founderAttention.slice(0, 10),
        module_summary: {
          builds: builds.length,
          blocked_builds: builds.filter(b => b.is_blocked || (b.blocked_by || []).length > 0).length,
          canon_verified: canonEntries.filter(c => c.verified && c.status === 'active').length,
          agents_active: agents.filter(a => a.status === 'active').length,
          cs_at_risk: csProfiles.filter(c => c.churn_risk_level === 'high' || c.churn_risk_level === 'critical').length,
          pending_approvals: approvals.length,
          lessons_learned: lessons.length,
          improvements_queued: improvements.filter(i => i.status === 'queued').length,
        },
        snapshot: snapshots[0] || null,
        evaluated_at: new Date().toISOString()
      });
    }

    // ─── AGGREGATE INTELLIGENCE: Collect intelligence from all sources ───
    if (operation === 'aggregate_intelligence') {
      const [orgIntel, reflections, csProfiles, lessons, improvements, diagnosticIssues, findings] = await Promise.all([
        safeList(svc, 'OrganizationalIntelligence', '-created_date', 100),
        safeList(svc, 'DailyReflection', '-created_date', 50),
        safeList(svc, 'CustomerSuccessProfile', '-created_date', 200),
        safeList(svc, 'EngineeringLesson', '-created_date', 100),
        safeList(svc, 'ImprovementItem', '-created_date', 100),
        safeList(svc, 'DiagnosticIssue', '-created_date', 50),
        safeList(svc, 'DiagnosticFinding', '-created_date', 50),
      ]);

      const byType = {};
      for (const i of orgIntel) {
        byType[i.insight_type] = (byType[i.insight_type] || 0) + 1;
      }

      const bySource = {};
      for (const i of orgIntel) {
        bySource[i.source] = (bySource[i.source] || 0) + 1;
      }

      // Convert unresolved findings to org intelligence
      const newIntel = [];
      for (const f of findings.filter(f => f.status === 'detected')) {
        try {
          const insight = await svc.entities.OrganizationalIntelligence.create({
            insight_type: 'workflow_bottleneck',
            title: `Diagnostic: ${f.title}`,
            description: f.description || f.explanation || '',
            frequency: 1,
            affected_modules: f.affected_modules || [],
            recommended_action: f.recommended_fix || '',
            source: 'system_scan',
            status: 'active',
            priority: f.severity === 'critical' ? 'critical' : f.severity === 'high' ? 'high' : 'medium',
            tags: ['diagnostic', f.finding_type]
          });
          newIntel.push(insight.id);
          await svc.entities.DiagnosticFinding.update(f.id, { status: 'investigating', linked_intelligence_ids: [...(f.linked_intelligence_ids || []), insight.id] }).catch(() => {});
        } catch {}
      }

      return Response.json({
        operation: 'aggregate_intelligence',
        total_insights: orgIntel.length,
        by_type: byType,
        by_source: bySource,
        new_insights_from_diagnostics: newIntel.length,
        reflections_processed: reflections.length,
        cs_profiles_monitored: csProfiles.length,
        lessons_accumulated: lessons.length,
        improvements_queued: improvements.filter(i => i.status === 'queued').length,
        diagnostic_findings_active: findings.filter(f => f.status !== 'resolved').length,
        aggregated_at: new Date().toISOString()
      });
    }

    return Response.json({ error: 'Unknown operation: ' + operation }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// ─── Helpers ───
async function safeList(svc, entity, ...args) {
  try { return await svc.entities[entity].list(...args); } catch { return []; }
}
async function safeFilter(svc, entity, query, ...args) {
  try { return await svc.entities[entity].filter(query, ...args); } catch { return []; }
}

function clampScore(n) { return Math.max(0, Math.min(100, Math.round(n))); }

function makeScore(entityType, entityName, score, factors, rootCauses) {
  let status = 'critical';
  if (score >= 80) status = 'excellent';
  else if (score >= 65) status = 'good';
  else if (score >= 45) status = 'fair';
  else if (score >= 25) status = 'at_risk';

  const recommended_actions = rootCauses.length > 0
    ? rootCauses.map(rc => `Address: ${rc}`)
    : ['Maintain current trajectory'];

  return {
    entity_type: entityType,
    entity_name: entityName,
    score,
    status,
    trend: 'stable',
    factors: factors.map(f => ({ name: f.factor, value: f.value, weight: f.weight })),
    root_causes: rootCauses,
    recommended_actions,
    expected_impact: score >= 65 ? 'Low risk — maintain current operations' : 'Moderate risk — address root causes to improve score',
    confidence_level: 75,
    founder_alert_required: score < 30,
    alert_reason: score < 30 ? `${entityName} health is critical (${score}/100). Immediate attention required.` : ''
  };
}