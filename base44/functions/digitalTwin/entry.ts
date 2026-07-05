import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Parallel data fetch
    const [builds, canon, agents, tasks, issues, improvements, subs, invoices, survival, agentTasks, approvals, roadmap, techDebt] = await Promise.all([
      base44.asServiceRole.entities.BuildRegistry.list('-created_date', 300).catch(() => []),
      base44.asServiceRole.entities.CanonEntry.list('-created_date', 500).catch(() => []),
      base44.asServiceRole.entities.AgentProfile.list('-created_date', 100).catch(() => []),
      base44.asServiceRole.entities.Task.list('-created_date', 300).catch(() => []),
      base44.asServiceRole.entities.DiagnosticIssue.filter({ status: 'open' }, '-created_date', 100).catch(() => []),
      base44.asServiceRole.entities.ImprovementItem.filter({ status: 'queued' }, '-created_date', 50).catch(() => []),
      base44.asServiceRole.entities.Subscription.filter({ status: 'active' }).catch(() => []),
      base44.asServiceRole.entities.Invoice.filter({ status: 'open' }).catch(() => []),
      base44.asServiceRole.entities.SurvivalMetric.list('-created_date', 1).catch(() => []),
      base44.asServiceRole.entities.AgentTask.list('-created_date', 100).catch(() => []),
      base44.asServiceRole.entities.ApprovalGate.filter({ status: 'pending' }, '-created_date', 20).catch(() => []),
      base44.asServiceRole.entities.RoadmapItem.list('-created_date', 100).catch(() => []),
      base44.asServiceRole.entities.TechnicalDebt.list('-created_date', 50).catch(() => []),
    ]);

    const s = survival[0] || null;

    // ── Metric helpers ──────────────────────────────────
    function pct(v) { return Math.min(100, Math.max(0, Math.round(v || 0))); }

    const verifiedCanon = canon.filter(e => e.verified && e.status === 'active').length;
    const canonGaps = canon.filter(e => e.is_canon_gap).length;
    const pendingReview = canon.filter(e => e.status === 'pending_review').length;
    const mrr = subs.reduce((a, sub) => a + (sub.mrr || 0), 0);
    const unpaid = invoices.reduce((a, inv) => a + (inv.amount_due || 0), 0);
    const totalCosts = s ? (s.monthly_platform_cost||0)+(s.ai_api_cost||0)+(s.hosting_cost||0)+(s.other_costs||0) : 0;
    const netMonthly = mrr - totalCosts;
    const runway = s?.cash_runway_months || 0;
    const critIssues = issues.filter(i => i.severity === 'critical');
    const blockedBuilds = builds.filter(b => b.is_blocked || (b.blocked_by||[]).length > 0);
    const totalTasksDone = builds.reduce((a, b) => a + (b.completed_tasks||[]).length, 0);
    const totalTasksReq = builds.reduce((a, b) => a + (b.required_tasks||[]).length, 0);
    const buildPct = totalTasksReq > 0 ? pct((totalTasksDone / totalTasksReq) * 100) : 0;
    const activeAgents = agents.filter(a => a.tasks_completed > 0).length;
    const tasksDone = tasks.filter(t => t.status === 'done').length;
    const taskPct = tasks.length > 0 ? pct((tasksDone / tasks.length) * 100) : 0;
    const highDebt = (techDebt || []).filter(d => d.severity === 'critical' || d.severity === 'high').length;
    const openApprovals = approvals.length;

    // ── Subsystem health calculations ──────────────────
    const subsystems = [
      {
        name: 'Revenue',
        category: 'financial',
        health_score: pct(mrr > 0 ? Math.min(100, (mrr / 5000) * 100) : 0),
        risk_score: pct(mrr === 0 ? 95 : mrr < 1000 ? 60 : 20),
        growth_score: pct(mrr > 0 ? 50 : 5),
        confidence_score: pct(mrr > 0 ? 70 : 20),
        forecast_score: pct(mrr > 0 ? 60 : 10),
        self_improvement_score: pct(improvements.filter(i => i.approval_type === 'financial').length * 15),
        dependency_score: pct(totalCosts > 0 ? Math.min(100, (totalCosts / Math.max(1, mrr + 1)) * 50) : 50),
        status: mrr === 0 ? 'critical' : mrr < 500 ? 'at_risk' : 'healthy',
        notes: `MRR: $${mrr}/mo · Costs: $${totalCosts}/mo · Net: $${netMonthly}/mo`
      },
      {
        name: 'Engineering',
        category: 'technical',
        health_score: pct(buildPct * 0.6 + taskPct * 0.4),
        risk_score: pct(blockedBuilds.length * 15 + critIssues.length * 10),
        growth_score: pct(buildPct),
        confidence_score: pct(100 - critIssues.length * 15),
        forecast_score: pct(builds.filter(b => b.estimated_finish_date).length * 10),
        self_improvement_score: pct(improvements.length * 5),
        dependency_score: pct(blockedBuilds.length * 20),
        status: blockedBuilds.length > 3 ? 'critical' : blockedBuilds.length > 0 ? 'at_risk' : 'healthy',
        notes: `${buildPct}% build completion · ${blockedBuilds.length} blocked · ${critIssues.length} critical issues`
      },
      {
        name: 'NC Canon',
        category: 'legal',
        health_score: pct((verifiedCanon / 25) * 100),
        risk_score: pct(verifiedCanon === 0 ? 100 : verifiedCanon < 5 ? 70 : 30),
        growth_score: pct(canon.length * 3),
        confidence_score: pct(verifiedCanon * 6),
        forecast_score: pct(pendingReview * 20),
        self_improvement_score: pct(canon.filter(e => e.status === 'draft').length * 5),
        dependency_score: pct(canonGaps * 10),
        status: verifiedCanon === 0 ? 'critical' : verifiedCanon < 5 ? 'at_risk' : 'operational',
        notes: `${verifiedCanon} verified · ${pendingReview} pending · ${canonGaps} gaps`
      },
      {
        name: 'AI Workforce',
        category: 'workforce',
        health_score: pct((activeAgents / Math.max(1, 8)) * 100),
        risk_score: pct(agents.length === 0 ? 80 : (1 - activeAgents / Math.max(1, agents.length)) * 60),
        growth_score: pct(agentTasks.filter(t => t.status === 'completed').length * 3),
        confidence_score: pct(activeAgents * 10),
        forecast_score: pct(agentTasks.filter(t => t.status === 'queued').length * 5),
        self_improvement_score: pct(agentTasks.filter(t => t.task_type === 'analyze').length * 8),
        dependency_score: pct(Math.max(0, (agents.length - activeAgents) * 8)),
        status: agents.length === 0 ? 'critical' : activeAgents === 0 ? 'idle' : 'active',
        notes: `${activeAgents}/${agents.length} agents active · ${agentTasks.filter(t => t.status === 'in_progress').length} tasks running`
      },
      {
        name: 'Legal Rail',
        category: 'legal',
        health_score: pct(builds.filter(b => b.rail === 'legal_rail').reduce((a, b) => a + (b.completed_tasks||[]).length, 0) / Math.max(1, builds.filter(b => b.rail === 'legal_rail').reduce((a, b) => a + (b.required_tasks||[]).length, 0)) * 100),
        risk_score: pct(verifiedCanon === 0 ? 90 : 40),
        growth_score: pct(builds.filter(b => b.rail === 'legal_rail' && b.deployment_status !== 'not_started').length * 20),
        confidence_score: pct(verifiedCanon * 8),
        forecast_score: pct(builds.filter(b => b.rail === 'legal_rail' && b.estimated_finish_date).length * 30),
        self_improvement_score: 30,
        dependency_score: pct(verifiedCanon === 0 ? 90 : 30),
        status: verifiedCanon === 0 ? 'blocked' : 'building',
        notes: `Depends on NC Canon · ${verifiedCanon} verified entries available`
      },
      {
        name: 'JurisEngine',
        category: 'legal',
        health_score: pct(verifiedCanon >= 5 ? 60 + verifiedCanon * 2 : verifiedCanon * 8),
        risk_score: pct(verifiedCanon === 0 ? 100 : verifiedCanon < 5 ? 65 : 25),
        growth_score: pct(verifiedCanon * 5),
        confidence_score: pct(verifiedCanon * 5),
        forecast_score: pct(verifiedCanon >= 10 ? 70 : 30),
        self_improvement_score: pct(canon.filter(e => e.category === 'ai_instruction').length * 10),
        dependency_score: pct(100 - (verifiedCanon / 25) * 100),
        status: verifiedCanon === 0 ? 'blocked' : verifiedCanon < 5 ? 'limited' : 'operational',
        notes: `Requires 5+ verified Canon entries. Current: ${verifiedCanon}`
      },
      {
        name: 'Evidence Vault',
        category: 'operations',
        health_score: pct(builds.filter(b => b.rail === 'legal_rail').reduce((a, b) => a + (b.completed_tasks||[]).length, 0) * 5),
        risk_score: 30,
        growth_score: 20,
        confidence_score: 60,
        forecast_score: 40,
        self_improvement_score: 40,
        dependency_score: 20,
        status: 'building',
        notes: 'Evidence ingestion and chain-of-custody tracking active'
      },
      {
        name: 'Infrastructure',
        category: 'technical',
        health_score: pct(100 - critIssues.filter(i => i.category === 'infrastructure').length * 20),
        risk_score: pct(highDebt * 10),
        growth_score: 50,
        confidence_score: pct(100 - openApprovals * 5),
        forecast_score: 60,
        self_improvement_score: pct((techDebt||[]).filter(d => d.status === 'in_progress').length * 15),
        dependency_score: pct(highDebt * 8),
        status: critIssues.length > 2 ? 'at_risk' : 'stable',
        notes: `${highDebt} high-severity technical debt items`
      },
      {
        name: 'Mission Control',
        category: 'operations',
        health_score: pct(buildPct * 0.4 + (verifiedCanon / 25 * 100) * 0.3 + (mrr > 0 ? 60 : 0) * 0.3),
        risk_score: pct(blockedBuilds.length * 10 + critIssues.length * 8),
        growth_score: pct(buildPct),
        confidence_score: pct(100 - openApprovals * 8),
        forecast_score: pct(roadmap.filter(r => r.target_date).length * 5),
        self_improvement_score: pct(improvements.length * 4),
        dependency_score: pct((blockedBuilds.length + critIssues.length) * 5),
        status: 'operational',
        notes: `${openApprovals} approvals pending · ${blockedBuilds.length} builds blocked`
      },
      {
        name: 'Culture Rail',
        category: 'product',
        health_score: pct(builds.filter(b => b.rail === 'culture_rail').reduce((a, b) => a + (b.completed_tasks||[]).length, 0) / Math.max(1, builds.filter(b => b.rail === 'culture_rail').reduce((a, b) => a + (b.required_tasks||[]).length, 0)) * 100),
        risk_score: 35,
        growth_score: 45,
        confidence_score: 55,
        forecast_score: 40,
        self_improvement_score: 25,
        dependency_score: 20,
        status: 'building',
        notes: 'Immersive creative experience platform in development'
      },
    ];

    // ── Compute aggregate health scores ──────────────
    const avgHealth = (categories) => {
      const relevant = subsystems.filter(s => categories.includes(s.category));
      return relevant.length > 0 ? pct(relevant.reduce((a, s) => a + s.health_score, 0) / relevant.length) : 0;
    };

    const platform_health_score = pct(subsystems.reduce((a, s) => a + s.health_score, 0) / subsystems.length);
    const revenue_health_score = avgHealth(['financial']);
    const engineering_health_score = avgHealth(['technical']);
    const legal_health_score = avgHealth(['legal']);
    const operational_health_score = avgHealth(['operations']);
    const mission_readiness_score = pct(
      (verifiedCanon / 25 * 100) * 0.3 +
      buildPct * 0.2 +
      (mrr > 0 ? 50 : 0) * 0.2 +
      (activeAgents / 8 * 100) * 0.15 +
      (100 - critIssues.length * 10) * 0.15
    );

    // ── Analysis arrays ────────────────────────────────
    const top_opportunities = [];
    if (mrr === 0) top_opportunities.push('Install Stripe + launch first subscription plan — fastest path from $0 to MRR');
    if (verifiedCanon < 5) top_opportunities.push(`Verify ${5 - verifiedCanon} more Canon entries to unlock JurisEngine and all legal AI services`);
    if (blockedBuilds.length > 0) top_opportunities.push(`Unblock ${blockedBuilds[0].name} — removing this dependency unlocks ${blockedBuilds.length} downstream builds`);
    if (activeAgents < agents.length) top_opportunities.push(`Activate ${agents.length - activeAgents} idle AI employees — each one adds parallel work capacity`);
    if (improvements.length > 0) top_opportunities.push(`${improvements.length} queued improvement items ready for execution — ${improvements[0].title}`);
    top_opportunities.push('Launch enterprise client outreach — one client transforms runway from months to years');

    const top_risks = [];
    if (mrr === 0 && runway < 6) top_risks.push('Zero revenue + limited runway — existential risk if not resolved in 30 days');
    if (verifiedCanon === 0) top_risks.push('Canon is empty — entire legal intelligence layer is offline, blocking JurisEngine, Legal Rail, and all legal AI services');
    if (critIssues.length > 0) top_risks.push(`${critIssues.length} critical diagnostic issues open — platform self-healing is degraded`);
    if (blockedBuilds.length > 2) top_risks.push(`${blockedBuilds.length} builds blocked — engineering velocity is reduced by dependency chains`);
    if (highDebt > 3) top_risks.push(`${highDebt} high-severity technical debt items — increasing complexity and reducing future velocity`);
    if (openApprovals > 3) top_risks.push(`${openApprovals} founder approvals pending — blocking autonomous operations and revenue actions`);

    const highest_roi_projects = [];
    if (mrr === 0) highest_roi_projects.push('Stripe + Subscription Plans — $499+/mo in < 2 hours, immediate survival impact');
    if (verifiedCanon < 10) highest_roi_projects.push('Canon Population — $5,000+/mo unlocked when JurisEngine becomes billable');
    highest_roi_projects.push('Enterprise Client Acquisition — $10,000-$50,000/deal, single client transforms company');
    highest_roi_projects.push('AI Workforce Activation — 10x engineering velocity per agent activated');
    if (blockedBuilds.length > 0) highest_roi_projects.push(`Dependency Resolution — ${blockedBuilds.length} builds ready once blockers cleared`);

    const critical_bottlenecks = [];
    if (verifiedCanon === 0) critical_bottlenecks.push('NC Canon empty → JurisEngine offline → Legal Rail blocked → 0 legal AI services');
    if (mrr === 0) critical_bottlenecks.push('No payment system → cannot charge → no revenue → no survival calculation');
    if (blockedBuilds.length > 0) critical_bottlenecks.push(...blockedBuilds.slice(0, 3).map(b => `${b.name} blocked by: ${(b.blocked_by||[]).join(', ')}`));
    if (openApprovals > 2) critical_bottlenecks.push(`${openApprovals} actions waiting for founder approval — creates operational pause`);

    const revenue_opportunities = [
      mrr === 0 ? 'Launch subscription tier at $99/mo — minimum viable revenue' : `Expand from $${mrr}/mo by adding higher tiers or annual plans`,
      'Legal AI services — charge per JurisEngine query (requires Canon population first)',
      'Evidence Vault Pro — paid tier for attorneys and legal advocates',
      'Enterprise licensing — NCOS as white-label for organizations',
      'FOIA automation service — $299/mo per organization',
      'Decision Compass Pro — $49/mo for ongoing case guidance'
    ];

    const infrastructure_weaknesses = [
      highDebt > 0 ? `${highDebt} high-severity technical debt items need resolution` : 'Technical debt under control',
      verifiedCanon === 0 ? 'Legal knowledge base completely empty — all legal services degraded' : `Canon at ${pct((verifiedCanon/25)*100)}% of target`,
      critIssues.length > 0 ? `${critIssues.length} critical open issues not resolved` : 'No critical infrastructure issues',
      'No monitoring/alerting system configured for production failures',
      'Database growth tracking not yet active'
    ];

    const founder_attention = [];
    if (mrr === 0) founder_attention.push('URGENT: Activate payment system — zero revenue is the highest existential risk');
    if (verifiedCanon === 0) founder_attention.push('URGENT: Paste statute text for §1983, FOIA, FCRA into Canon Entry Builder and verify');
    if (openApprovals > 0) founder_attention.push(`${openApprovals} items in Approval Gate require your decision before agents can proceed`);
    if (verifiedCanon > 0 && verifiedCanon < 10) founder_attention.push(`Verify ${10 - verifiedCanon} more Canon entries to reach meaningful JurisEngine coverage`);
    founder_attention.push('Define first enterprise client target — who is the ideal first paying organization?');

    const autonomous_improvements = [];
    if (improvements.length > 0) autonomous_improvements.push(...improvements.filter(i => !i.requires_approval).slice(0, 5).map(i => i.title));
    autonomous_improvements.push('Self-diagnosis scan — identify and queue new improvement items');
    autonomous_improvements.push('Canon gap analysis — cross-reference all builds for missing legal authorities');
    autonomous_improvements.push('Agent task rebalancing — redistribute work to underutilized agents');

    // ── Scenario answers (Executive Intelligence) ────
    const scenario_answers = {
      one_engineering_day: verifiedCanon === 0
        ? 'Populate NC Canon with §1983, FOIA, FCRA — unlocks JurisEngine, Legal Rail, and 4 blocked AI services in a single day'
        : mrr === 0
        ? 'Build and activate Stripe subscription flow — transforms platform from $0 to first revenue'
        : `Resolve ${blockedBuilds[0]?.name || 'top blocked build'} — removes the primary dependency chain blocking ${blockedBuilds.length} builds`,
      one_ai_employee: activeAgents < agents.length
        ? `Activate a specialized Legal AI agent to systematically import and verify Canon entries — this unblocks every legal feature`
        : `Deploy a Revenue Intelligence agent to identify, qualify, and draft outreach for enterprise clients`,
      five_hundred_dollars: mrr === 0
        ? 'Spend $200 on legal directory ads targeting organizations needing FOIA assistance — first paid clients fund everything else'
        : 'Allocate $300 to cloud infrastructure scaling and $200 to legal API access for Canon enrichment',
      one_enterprise_client: 'One enterprise client at $2,500+/mo transforms runway from months to 2+ years, funds Canon population, agent activation, and first hire',
      revenue_this_week: mrr === 0
        ? '1. Install Stripe (2h). 2. Create $99/mo Basic + $299/mo Pro tiers (1h). 3. Activate JurisEngine for paying users (1h). 4. Post in 3 legal aid forums. First revenue possible in 72 hours.'
        : `Upsell existing ${subs.length} subscriber(s) to annual plan + launch FOIA automation service at $299/mo`,
      ten_x_growth: 'Enterprise: White-label NCOS to 10 legal aid organizations at $2,500/mo each = $25,000 MRR. Build automated Canon import pipeline. Add 20 AI agents. Launch API marketplace for legal intelligence queries.',
      what_should_ncos_do: mission_readiness_score < 20
        ? 'Focus exclusively on: (1) Canon population, (2) Stripe activation, (3) unblocking top 3 builds. Everything else waits.'
        : mission_readiness_score < 50
        ? 'Accelerate Canon coverage to 25+ entries, activate first subscription tier, begin enterprise outreach while resolving all blocked builds.'
        : 'Scale: add enterprise tiers, expand Canon coverage, activate full AI workforce, begin automated client acquisition.'
    };

    // ── Executive Recommendations (ranked by composite score) ──
    const rawRecs = [
      { action: 'Verify 5 Canon entries in NC Canon Entry Builder', roi_score: 90, urgency_score: 95, effort_score: 85, strategic_value: 90, category: 'legal' },
      { action: 'Install Stripe + create first subscription plan ($99/mo)', roi_score: 95, urgency_score: mrr===0?98:40, effort_score: 90, strategic_value: 85, category: 'revenue' },
      { action: `Resolve build blockers: ${blockedBuilds[0]?.name || 'top blocked build'}`, roi_score: 70, urgency_score: 75, effort_score: 80, strategic_value: 75, category: 'engineering' },
      { action: `Review and approve ${openApprovals} pending approval gates`, roi_score: 80, urgency_score: openApprovals>2?85:40, effort_score: 95, strategic_value: 70, category: 'operations' },
      { action: 'Activate all idle AI agents with task queues', roi_score: 75, urgency_score: 70, effort_score: 90, strategic_value: 80, category: 'workforce' },
      { action: 'Run full self-diagnosis and approve top 3 auto-repairs', roi_score: 65, urgency_score: 60, effort_score: 88, strategic_value: 65, category: 'platform' },
      { action: 'Define enterprise client ICP and draft outreach', roi_score: 85, urgency_score: 65, effort_score: 60, strategic_value: 90, category: 'revenue' },
      { action: 'Close all critical diagnostic issues', roi_score: 70, urgency_score: critIssues.length>0?80:30, effort_score: 75, strategic_value: 70, category: 'platform' },
    ];

    const executive_recommendation = rawRecs
      .map((r, i) => ({
        ...r,
        rank: 0,
        combined_score: Math.round((r.roi_score * 0.3 + r.urgency_score * 0.3 + r.effort_score * 0.2 + r.strategic_value * 0.2))
      }))
      .sort((a, b) => b.combined_score - a.combined_score)
      .map((r, i) => ({ ...r, rank: i + 1 }));

    const today = new Date().toISOString().split('T')[0];
    const timeStr = new Date().toISOString();

    const snapshot = await base44.asServiceRole.entities.DigitalTwin.create({
      snapshot_date: today,
      snapshot_time: timeStr,
      subsystems,
      top_opportunities,
      top_risks,
      highest_roi_projects,
      critical_bottlenecks,
      revenue_opportunities,
      infrastructure_weaknesses,
      founder_attention,
      autonomous_improvements,
      scenario_answers,
      executive_recommendation,
      platform_health_score,
      revenue_health_score,
      engineering_health_score,
      legal_health_score,
      operational_health_score,
      mission_readiness_score,
      raw_metrics: {
        mrr, totalCosts, netMonthly, runway, verifiedCanon, canonTotal: canon.length,
        blockedBuilds: blockedBuilds.length, critIssues: critIssues.length,
        buildPct, taskPct, activeAgents, totalAgents: agents.length,
        openApprovals, highDebt, improvements: improvements.length
      },
      generated_by: 'NCOS Digital Twin Engine v1'
    });

    return Response.json({ success: true, snapshot });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});