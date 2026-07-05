import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// NCOS Self-Diagnosis + Self-Healing Engine v3
// POST {} — full platform scan, auto-creates DiagnosticIssues + ImprovementItems
// Now includes: auto-repair dispatch, resolution tracking, escalation gates
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const [builds, canonEntries, agents, projects, tasks, subs, invoices, approvals, agentTasks, notifications] = await Promise.all([
      base44.asServiceRole.entities.BuildRegistry.list('-created_date', 200).catch(() => []),
      base44.asServiceRole.entities.CanonEntry.list('-created_date', 500).catch(() => []),
      base44.asServiceRole.entities.AgentProfile.list('-created_date', 100).catch(() => []),
      base44.asServiceRole.entities.Project.list('-created_date', 50).catch(() => []),
      base44.asServiceRole.entities.Task.list('-created_date', 200).catch(() => []),
      base44.asServiceRole.entities.Subscription.list('-created_date', 100).catch(() => []),
      base44.asServiceRole.entities.Invoice.list('-created_date', 100).catch(() => []),
      base44.asServiceRole.entities.ApprovalGate.filter({ status: 'pending' }).catch(() => []),
      base44.asServiceRole.entities.AgentTask.filter({ status: { $in: ['queued','in_progress'] } }).catch(() => []),
      base44.asServiceRole.entities.Notification.filter({ read: false }).catch(() => []),
    ]);

    const issues: any[] = [];
    const improvementItems: any[] = [];
    const autoRepairs: any[] = [];
    const founderEscalations: any[] = [];
    const now = new Date().toISOString();

    // ── CANON ANALYSIS ────────────────────────────────────────────────
    const verifiedActive = canonEntries.filter((e: any) => e.verified && e.status === 'active');
    const canonGaps = canonEntries.filter((e: any) => e.is_canon_gap);
    const pendingReview = canonEntries.filter((e: any) => e.status === 'pending_review');
    const draftEntries = canonEntries.filter((e: any) => e.status === 'draft');
    const avgQuality = canonEntries.length > 0 ? Math.round(canonEntries.reduce((s: number, e: any) => {
      let q = 0;
      if (e.full_text && e.full_text.length > 50) q += 30;
      if (e.summary && e.summary.length > 20) q += 20;
      if (e.citation) q += 15;
      if (e.verified) q += 25;
      if ((e.keywords || []).length > 2) q += 10;
      return s + q;
    }, 0) / canonEntries.length) : 0;

    if (verifiedActive.length === 0) {
      issues.push({
        title: 'NC Canon is empty — zero verified entries',
        category: 'canon_gap', severity: 'critical',
        affected_modules: ['JurisEngine','Legal Research Agent','NC Canon'],
        description: 'No verified Canon entries exist. All AI legal services return CANON GAP. JurisEngine is non-functional.',
        detected_at: now,
        can_auto_repair: false,
        escalate_to: 'founder',
        repair_notes: 'Canon entries require verified legal authority. Use Canon Population Hub to draft and verify entries.',
      });
      founderEscalations.push({ module: 'NC Canon', action: 'Upload and verify priority legal authorities via Canon Population Hub', revenue_impact: 5000 });
      improvementItems.push({
        title: 'Populate NC Canon with priority legal authorities',
        recommended_fix: 'Use Canon Population Hub at /canon-population. AI can draft entries — you verify them.',
        reason: 'JurisEngine cannot function without verified Canon entries.',
        why_it_matters: 'Every legal AI service requires Canon entries. Without this, JurisEngine returns CANON GAP on 100% of queries.',
        what_it_unlocks: 'JurisEngine, Legal Research Agent, FOIA Agent, Civil Rights Agent, Decision Compass Canon Mode',
        risk_if_delayed: 'Platform has zero legal intelligence. No demos. Revenue from legal services completely blocked.',
        affected_modules: ['JurisEngine','NC Canon','Legal Research Agent'],
        estimated_effort: '2-3d', estimated_hours: 16,
        risk_level: 'critical', priority: 'critical',
        requires_approval: false, approval_type: 'none',
        expected_impact: 'Activates all legal AI capabilities and enables JurisEngine client demos',
        estimated_revenue_impact: 5000, readiness_increase_pct: 25,
        strategic_priority_score: 100, confidence_score: 99,
        ai_agents_required: ['Canon Librarian Agent'],
        source: 'Self-Diagnosis Engine v3'
      });
    } else if (verifiedActive.length < 10) {
      issues.push({
        title: `Canon has only ${verifiedActive.length} verified entries — insufficient coverage`,
        category: 'canon_gap', severity: 'high',
        affected_modules: ['JurisEngine','NC Canon'],
        description: `${verifiedActive.length} verified entries is insufficient. Minimum 25+ required for meaningful JurisEngine results.`,
        detected_at: now, can_auto_repair: false,
      });
    }

    if (pendingReview.length > 0) {
      issues.push({
        title: `${pendingReview.length} Canon entries pending verification`,
        category: 'incomplete_workflow', severity: 'medium',
        affected_modules: ['NC Canon'],
        description: `${pendingReview.length} entries imported but not verified. Unavailable to AI services.`,
        detected_at: now, can_auto_repair: false,
        repair_notes: 'Go to Canon Population Hub > Pending Review tab to verify entries.',
      });
    }

    if (draftEntries.length > 0) {
      issues.push({
        title: `${draftEntries.length} Canon draft entries need completion`,
        category: 'incomplete_workflow', severity: 'low',
        affected_modules: ['NC Canon'],
        description: `${draftEntries.length} draft entries have been started but not submitted for review.`,
        detected_at: now, can_auto_repair: true,
        repair_notes: 'AI can complete and submit draft entries automatically.',
      });
      autoRepairs.push({ module: 'NC Canon', action: `Submit ${draftEntries.length} draft entries for review`, auto: true });
    }

    // ── BUILD / DEPENDENCY ANALYSIS ───────────────────────────────────
    const blockedBuilds = builds.filter((b: any) => b.is_blocked || (b.blocked_by || []).length > 0);
    blockedBuilds.forEach((b: any) => {
      issues.push({
        title: `Blocked build: ${b.name}`,
        category: 'blocked_build',
        severity: b.priority === 'critical' ? 'critical' : 'high',
        affected_modules: [b.name, ...(b.blocked_by || [])],
        description: `${b.name} is blocked by: ${(b.blocked_by || []).join(', ')}.`,
        detected_at: now, can_auto_repair: true,
        repair_notes: 'Dependency Resolution Engine can dispatch resolution tasks to agents.',
      });
      autoRepairs.push({ module: b.name, action: `Dispatch resolution tasks for ${b.name}`, auto: true });
      improvementItems.push({
        title: `Unblock build: ${b.name}`,
        recommended_fix: `Resolve blockers: ${(b.blocked_by || []).join(', ')} via Dependency Resolution Engine`,
        why_it_matters: `${b.name} is on the critical path for ${b.rail} rail.`,
        what_it_unlocks: `${b.rail} rail build progress`,
        risk_if_delayed: 'Direct delay to rail readiness and revenue.',
        affected_modules: [b.name],
        estimated_effort: '1d', estimated_hours: 4,
        risk_level: b.priority === 'critical' ? 'critical' : 'high',
        priority: b.priority || 'high',
        requires_approval: false,
        readiness_increase_pct: 8, strategic_priority_score: 85, confidence_score: 90,
        source: 'Self-Diagnosis Engine v3'
      });
    });

    const incompleteBuilds = builds.filter((b: any) => {
      const req = (b.required_tasks || []).length;
      const done = (b.completed_tasks || []).length;
      return req > 0 && done < req && !b.is_blocked;
    });
    if (incompleteBuilds.length > 3) {
      issues.push({
        title: `${incompleteBuilds.length} builds have incomplete task checklists`,
        category: 'incomplete_workflow', severity: 'medium',
        affected_modules: incompleteBuilds.slice(0,5).map((b: any) => b.name),
        description: 'Multiple builds have incomplete task lists.',
        detected_at: now, can_auto_repair: true,
      });
      autoRepairs.push({ module: 'Build Registry', action: `Add standard task checklists to ${incompleteBuilds.length} builds`, auto: true });
    }

    // ── AGENT ANALYSIS ────────────────────────────────────────────────
    const REQUIRED_AGENTS = ['Canon Librarian Agent','Product Manager Agent','QA Agent','Security Agent','Documentation Agent','Evidence Agent','FOIA Agent','Civil Rights Agent'];
    const agentNames = agents.map((a: any) => a.name);
    const missingAgents = REQUIRED_AGENTS.filter(n => !agentNames.includes(n));
    if (missingAgents.length > 0) {
      issues.push({
        title: `Missing required agents: ${missingAgents.join(', ')}`,
        category: 'agent_gap', severity: 'high',
        affected_modules: missingAgents,
        description: `${missingAgents.length} required AI agents are not deployed.`,
        detected_at: now, can_auto_repair: true,
      });
      autoRepairs.push({ module: 'AI Workforce', action: `Create and activate ${missingAgents.length} missing agents`, auto: true });
      improvementItems.push({
        title: `Deploy missing agents: ${missingAgents.slice(0,3).join(', ')}`,
        recommended_fix: 'Go to AI Workforce Activator to deploy all missing agents with pre-configured task queues.',
        why_it_matters: 'Missing agents = manual work for tasks that should be automated.',
        what_it_unlocks: 'Full autonomous platform operation',
        affected_modules: missingAgents,
        estimated_effort: '1h', estimated_hours: 1,
        risk_level: 'medium', priority: 'high',
        requires_approval: false,
        readiness_increase_pct: 10, strategic_priority_score: 75, confidence_score: 95,
        source: 'Self-Diagnosis Engine v3'
      });
    }

    const idleAgents = agents.filter((a: any) => a.status === 'idle');
    const agentsWithNoTasks = agents.filter((a: any) => {
      const myTasks = agentTasks.filter((t: any) => t.agent_name === a.name);
      return myTasks.length === 0;
    });
    if (agentsWithNoTasks.length > 2) {
      issues.push({
        title: `${agentsWithNoTasks.length} agents have no queued tasks`,
        category: 'agent_gap', severity: 'low',
        affected_modules: agentsWithNoTasks.slice(0,4).map((a: any) => a.name),
        description: 'Many agents have no work. Use AI Workforce Activator to dispatch autonomous work queues.',
        detected_at: now, can_auto_repair: true,
        repair_notes: 'AI Workforce Activator can dispatch standard work packages to idle agents.',
      });
      autoRepairs.push({ module: 'AI Workforce', action: `Dispatch task queues to ${agentsWithNoTasks.length} agents via Workforce Activator`, auto: true });
    }

    // ── REVENUE / SURVIVAL ANALYSIS ───────────────────────────────────
    const activeSubs = subs.filter((s: any) => s.status === 'active');
    const totalMRR = activeSubs.reduce((sum: number, s: any) => sum + (s.mrr || 0), 0);
    const unpaidTotal = invoices.filter((i: any) => i.status === 'open').reduce((sum: number, i: any) => sum + (i.amount_due || 0), 0);

    if (totalMRR === 0) {
      issues.push({
        title: 'Zero MRR — no active subscriptions',
        category: 'missing_revenue_path', severity: 'critical',
        affected_modules: ['Business Platform','Survival Engine'],
        description: 'Platform has zero monthly recurring revenue. Existential risk.',
        detected_at: now, can_auto_repair: false, escalate_to: 'founder',
        repair_notes: 'Revenue engine requires Stripe activation — see Revenue Survival Mode.',
      });
      founderEscalations.push({ module: 'Revenue Engine', action: 'Install Stripe and create first subscription plan', revenue_impact: 499 });
      improvementItems.push({
        title: 'Activate revenue engine — first paying subscriber',
        recommended_fix: 'Install Base44 Payments, create subscription tiers, share payment link with first prospect.',
        why_it_matters: 'Zero MRR = platform is burning runway with no income.',
        what_it_unlocks: 'First MRR, cash runway calculation, investor confidence',
        risk_if_delayed: 'Platform cannot sustain itself. Runway shrinks toward zero.',
        affected_modules: ['Business Platform'],
        estimated_effort: '1w', estimated_hours: 10,
        risk_level: 'critical', priority: 'critical',
        requires_approval: true, approval_type: 'founder',
        expected_impact: 'First MRR begins revenue journey',
        estimated_revenue_impact: 499, readiness_increase_pct: 5,
        strategic_priority_score: 98, confidence_score: 90,
        source: 'Self-Diagnosis Engine v3'
      });
    }

    if (unpaidTotal > 0) {
      issues.push({
        title: `$${unpaidTotal.toFixed(0)} in uncollected invoices`,
        category: 'missing_revenue_path', severity: 'high',
        affected_modules: ['Invoices'],
        description: `${invoices.filter((i: any) => i.status === 'open').length} open invoices totaling $${unpaidTotal.toFixed(0)}.`,
        detected_at: now, can_auto_repair: true,
        repair_notes: 'Agent can draft follow-up notifications for all open invoices.',
      });
    }

    // ── PLATFORM CONFIGURATION ────────────────────────────────────────
    const platformConfigs = await base44.asServiceRole.entities.PlatformConfig.list('-created_date', 50).catch(() => []);
    if (platformConfigs.length === 0) {
      issues.push({
        title: 'Platform configuration not initialized',
        category: 'incomplete_workflow', severity: 'medium',
        affected_modules: ['Platform Config'],
        description: 'No platform configuration entries found.',
        detected_at: now, can_auto_repair: false,
      });
    }

    // ── CASE FILES ────────────────────────────────────────────────────
    const caseFiles = await base44.asServiceRole.entities.CaseFile.list('-created_date', 50).catch(() => []);
    const urgentCases = caseFiles.filter((c: any) => c.priority === 'urgent' && !['closed','settled'].includes(c.status));
    const deadlineSoon = caseFiles.filter((c: any) => c.filing_deadline && new Date(c.filing_deadline).getTime() - Date.now() < 14 * 24 * 60 * 60 * 1000 && new Date(c.filing_deadline) > new Date());
    if (urgentCases.length > 0) {
      issues.push({ title: `${urgentCases.length} urgent cases require immediate attention`, category: 'missing_feature', severity: 'high', affected_modules: ['Case Files'], description: `${urgentCases.length} urgent open cases.`, detected_at: now, can_auto_repair: false });
    }
    if (deadlineSoon.length > 0) {
      issues.push({ title: `${deadlineSoon.length} filing deadlines within 14 days`, category: 'incomplete_workflow', severity: 'critical', affected_modules: ['Case Files'], description: `${deadlineSoon.length} cases have imminent filing deadlines.`, detected_at: now, can_auto_repair: false, escalate_to: 'founder' });
    }

    // ── APPROVAL BACKLOG ──────────────────────────────────────────────
    if (approvals.length > 5) {
      issues.push({ title: `${approvals.length} approval gates pending review`, category: 'security_risk', severity: 'medium', affected_modules: ['Approval Gates'], description: 'Large approval backlog. Review Self-Governance > Approval Gates.', detected_at: now, can_auto_repair: false });
    }

    // ── NOTIFICATION BACKLOG ──────────────────────────────────────────
    const criticalUnread = notifications.filter((n: any) => n.severity === 'critical');
    if (criticalUnread.length > 0) {
      issues.push({ title: `${criticalUnread.length} unread critical notifications`, category: 'missing_feature', severity: 'high', affected_modules: ['Notifications'], description: `${criticalUnread.length} critical platform notifications have not been read.`, detected_at: now, can_auto_repair: false });
    }

    // ── PROJECT / TASK ANALYSIS ───────────────────────────────────────
    const overdueTasks = tasks.filter((t: any) => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done');
    if (overdueTasks.length > 0) {
      issues.push({ title: `${overdueTasks.length} overdue tasks`, category: 'incomplete_workflow', severity: overdueTasks.length > 5 ? 'high' : 'medium', affected_modules: ['Projects'], description: `${overdueTasks.length} tasks are past due date.`, detected_at: now, can_auto_repair: true });
    }

    // ── DEDUPLICATION & PERSISTENCE ──────────────────────────────────
    const existingIssues = await base44.asServiceRole.entities.DiagnosticIssue.filter({ status: 'open' }, '-created_date', 200).catch(() => []);
    const existingTitles = new Set(existingIssues.map((i: any) => i.title));
    const newIssues = issues.filter((i: any) => !existingTitles.has(i.title));
    const createdIssues = await Promise.all(newIssues.map((i: any) => base44.asServiceRole.entities.DiagnosticIssue.create(i)));

    const existingItems = await base44.asServiceRole.entities.ImprovementItem.filter({ status: { $in: ['queued','in_progress'] } }, '-created_date', 100).catch(() => []);
    const existingItemTitles = new Set(existingItems.map((i: any) => i.title));
    const newItems = improvementItems.filter((i: any) => !existingItemTitles.has(i.title));
    const createdItems = await Promise.all(newItems.map((i: any) => base44.asServiceRole.entities.ImprovementItem.create(i)));

    // ── AUTO-REPAIR: dispatch agent tasks for fixable issues ─────────
    let autoRepairCount = 0;
    const existingAgentTaskTitles = new Set(
      (await base44.asServiceRole.entities.AgentTask.filter({ status: { $in: ['queued','in_progress'] } }).catch(() => [])).map((t: any) => t.title)
    );

    for (const repair of autoRepairs) {
      const taskTitle = `[Auto-Repair] ${repair.action}`;
      if (!existingAgentTaskTitles.has(taskTitle)) {
        await base44.asServiceRole.entities.AgentTask.create({
          title: taskTitle,
          description: `Auto-dispatched by Self-Healing Engine v3. Module: ${repair.module}. Action: ${repair.action}`,
          agent_name: 'Product Manager Agent',
          task_type: 'analyze',
          status: 'queued',
          priority: 'high',
        }).catch(() => null);
        autoRepairCount++;
      }
    }

    // ── CREATE NOTIFICATIONS FOR NEW CRITICAL ISSUES ─────────────────
    const criticalNew = newIssues.filter((i: any) => i.severity === 'critical');
    for (const issue of criticalNew.slice(0, 3)) {
      await base44.asServiceRole.entities.Notification.create({
        title: `🚨 Critical Issue: ${issue.title}`,
        message: issue.description,
        type: 'system',
        severity: 'critical',
        read: false,
        action_url: '/self-governance',
        action_label: 'View in Self-Governance',
      }).catch(() => null);
    }

    // ── SURVIVAL METRICS ──────────────────────────────────────────────
    const totalMonthlyCost = 200;
    const netMonthly = totalMRR - totalMonthlyCost;
    const autoFixable = issues.filter((i: any) => i.can_auto_repair).length;

    return Response.json({
      success: true,
      scanned_at: now,
      issues_found: issues.length,
      new_issues_created: createdIssues.length,
      improvement_items_created: createdItems.length,
      auto_repairs_dispatched: autoRepairCount,
      founder_escalations: founderEscalations.length,
      pending_approvals: approvals.length,
      auto_fixable_issues: autoFixable,
      requires_founder: issues.filter((i: any) => i.escalate_to === 'founder').length,
      survival_summary: {
        mrr: totalMRR,
        monthly_cost_estimate: totalMonthlyCost,
        net_monthly: netMonthly,
        break_even_mrr: totalMonthlyCost,
        unpaid_invoices: unpaidTotal,
        active_subscriptions: activeSubs.length,
      },
      diagnosis: {
        canon: { total: canonEntries.length, verified_active: verifiedActive.length, gaps: canonGaps.length, pending_review: pendingReview.length, drafts: draftEntries.length, avg_quality: avgQuality },
        builds: { total: builds.length, blocked: blockedBuilds.length, incomplete: incompleteBuilds.length },
        agents: { total: agents.length, missing: missingAgents.length, idle: idleAgents.length, no_tasks: agentsWithNoTasks.length },
        tasks: { total: tasks.length, overdue: overdueTasks.length, agent_queued: agentTasks.length },
        revenue: { mrr: totalMRR, unpaid: unpaidTotal, active_subs: activeSubs.length },
        notifications: { unread: notifications.length, critical_unread: criticalUnread.length },
      },
      issues: issues.map((i: any) => ({ title: i.title, category: i.category, severity: i.severity, can_auto_repair: i.can_auto_repair, escalate_to: i.escalate_to || null })),
      founder_escalations: founderEscalations,
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});