import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { operation, params } = body;
    const admin = base44.asServiceRole;

    const fetchAll = async (entityName, limit = 200) => {
      try { return await admin.entities[entityName].list('-created_date', limit); }
      catch { return []; }
    };

    if (operation === 'run_daily_scan') {
      const [agents, existingItems, diagnostics, techDebt, bugs, lessons, journals, adrs, prompts, canon, builds, releases, roadmap, approvals, notifications, survival, subscriptions, invoices, crmLeads, crmDeals, resources, workerProfiles, cases, evidence, foia, authorityInteractions, knowledgeNodes, automations, projects, tasks, sprints, milestones, epics, releases2, packets, checkIns, intakes] = await Promise.all([
        fetchAll('AgentProfile', 100), fetchAll('ImprovementItem', 500), fetchAll('DiagnosticIssue', 100), fetchAll('TechnicalDebt', 100), fetchAll('BugKnowledgeBase', 200), fetchAll('LessonLearned', 200), fetchAll('EngineeringJournal', 300), fetchAll('ADR', 100), fetchAll('PromptLibrary', 200), fetchAll('CanonEntry', 100), fetchAll('BuildRegistry', 100), fetchAll('Release', 50), fetchAll('RoadmapItem', 100), fetchAll('ApprovalGate', 50), fetchAll('Notification', 100), fetchAll('SurvivalMetric', 10), fetchAll('Subscription', 200), fetchAll('Invoice', 200), fetchAll('CRMLead', 200), fetchAll('CRMDeal', 100), fetchAll('Resource', 200), fetchAll('WorkerProfile', 200), fetchAll('CaseFile', 100), fetchAll('Evidence', 100), fetchAll('FOIARequest', 100), fetchAll('AuthorityInteraction', 100), fetchAll('KnowledgeNode', 100), fetchAll('Automation', 100), fetchAll('Project', 100), fetchAll('Task', 200), fetchAll('Sprint', 20), fetchAll('Milestone', 50), fetchAll('Epic', 50), fetchAll('Release', 50), fetchAll('Packet', 200), fetchAll('CheckIn', 200), fetchAll('Intake', 200)
      ]);

      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const recentTasks = tasks.filter(t => new Date(t.created_date) >= thirtyDaysAgo);
      const verifiedComplete = recentTasks.filter(t => t.status === 'done' && t.verified_complete && t.founder_approved).length;
      const failed = recentTasks.filter(t => t.status === 'failed' || t.status === 'rejected' || t.status === 'stalled').length;
      const aiEffectiveness = recentTasks.length > 0 ? Math.max(0, Math.round(((verifiedComplete - failed) / recentTasks.length) * 100)) : 0;

      const verifiedMRR = subscriptions.filter(s => s.status === 'active' && s.stripe_subscription_id).reduce((sum, s) => sum + (s.mrr || 0), 0);
      const revenueHealth = Math.min(100, Math.round((verifiedMRR / 10000) * 100));

      const modules = ['CaseFile', 'Packet', 'CheckIn', 'Intake', 'CRMLead', 'CRMDeal', 'Evidence', 'FOIARequest'];
      const moduleActivity = {
        CaseFile: cases.filter(c => new Date(c.updated_date || c.created_date) >= thirtyDaysAgo && c.creator_id !== user.id).length > 0,
        Packet: packets.filter(p => new Date(p.created_date) >= thirtyDaysAgo && p.creator_id !== user.id).length > 0,
        CheckIn: checkIns.filter(c => new Date(c.created_date) >= thirtyDaysAgo && c.creator_id !== user.id).length > 0,
        Intake: intakes.filter(i => new Date(i.created_date) >= thirtyDaysAgo && i.creator_id !== user.id && i.status === 'completed').length > 0,
        CRMLead: crmLeads.filter(l => new Date(l.updated_date || l.created_date) >= thirtyDaysAgo && l.creator_id !== user.id).length > 0,
        CRMDeal: crmDeals.filter(d => new Date(d.updated_date || d.created_date) >= thirtyDaysAgo && d.creator_id !== user.id).length > 0,
        Evidence: evidence.filter(e => new Date(e.created_date) >= thirtyDaysAgo && e.creator_id !== user.id).length > 0,
        FOIARequest: foia.filter(f => new Date(f.updated_date || f.created_date) >= thirtyDaysAgo && f.creator_id !== user.id).length > 0
      };
      const activeModules = Object.values(moduleActivity).filter(Boolean).length;
      const moduleHealth = Math.round((activeModules / modules.length) * 100);

      const canonWithHoldings = canon.filter(c => c.verified && c.holding_id).length;
      const canonCoverage = canon.length > 0 ? Math.round((canonWithHoldings / canon.length) * 100) : 0;

      const packetsGenerated = packets.filter(p => new Date(p.created_date) >= thirtyDaysAgo && p.status === 'completed').length;
      const checkInsCompleted = checkIns.filter(c => new Date(c.created_date) >= thirtyDaysAgo && c.status === 'completed').length;
      const intakesFinished = intakes.filter(i => new Date(i.created_date) >= thirtyDaysAgo && i.status === 'completed').length;
      const intakesStuck = intakes.filter(i => new Date(i.created_date) >= thirtyDaysAgo && (i.status === 'stuck' || i.status === 'failed')).length;
      const userOutcomes = Math.round(((packetsGenerated + checkInsCompleted + intakesFinished) / Math.max(1, packetsGenerated + checkInsCompleted + intakesFinished + intakesStuck)) * 100);

      const operationalReadiness = Math.round((aiEffectiveness * 0.3) + (revenueHealth * 0.25) + (moduleHealth * 0.2) + (canonCoverage * 0.15) + (userOutcomes * 0.1));

      const buildCoverage = Math.min(100, Math.round(30 + (agents.length * 5) + (canon.length * 4) + (builds.length * 3) + (automations.length * 2) + (adrs.length * 1)));

      const platformState = {
        entities: { agents: agents.length, active_agents: agents.filter(a => a.status === 'active').length, improvement_items: existingItems.length, open_items: existingItems.filter(i => i.status === 'queued').length, diagnostics: diagnostics.length, critical_diagnostics: diagnostics.filter(d => d.severity === 'critical').length, tech_debt: techDebt.length, bugs: bugs.length, open_bugs: bugs.filter(b => b.status === 'open').length, lessons: lessons.length, journals: journals.length, adrs: adrs.length, prompts: prompts.length, canon_entries: canon.length, verified_canon: canon.filter(c => c.verified).length, builds: builds.length, blocked_builds: builds.filter(b => b.is_blocked).length, roadmap_items: roadmap.length, pending_approvals: approvals.length, unread_notifications: notifications.filter(n => !n.read).length, subscriptions: subscriptions.length, active_subs: subscriptions.filter(s => s.status === 'active').length, invoices: invoices.length, unpaid_invoices: invoices.filter(i => i.status === 'open').length, crm_leads: crmLeads.length, crm_deals: crmDeals.length, resources: resources.length, workers: workerProfiles.length, cases: cases.length, evidence: evidence.length, foia: foia.length, authority_interactions: authorityInteractions.length, knowledge_nodes: knowledgeNodes.length, automations: automations.length, projects: projects.length, tasks: tasks.length, open_tasks: tasks.filter(t => t.status !== 'done').length, sprints: sprints.length, milestones: milestones.length, epics: epics.length, packets: packets.length, check_ins: checkIns.length, intakes: intakes.length },
        revenue: { mrr: subscriptions.reduce((s, sub) => s + (sub.mrr || 0), 0), verified_mrr: verifiedMRR, unpaid_invoice_amount: invoices.filter(i => i.status === 'open').reduce((s, i) => s + (i.amount_due || 0), 0), active_sub_count: subscriptions.filter(s => s.status === 'active').length },
        health: { survival: survival[0] || null, critical_issues: diagnostics.filter(d => d.severity === 'critical').length, blocked_builds: builds.filter(b => b.is_blocked).length, pending_approvals: approvals.length, open_bugs: bugs.filter(b => b.status === 'open').length, tech_debt_items: techDebt.length },
        operational_readiness: { overall_score: operationalReadiness, ai_effectiveness: aiEffectiveness, revenue_health: revenueHealth, module_health: moduleHealth, canon_coverage: canonCoverage, user_outcomes: userOutcomes, dimensions: { ai_effectiveness: { score: aiEffectiveness, calculation: `(${verifiedComplete} verified - ${failed} failed) / ${recentTasks.length} tasks`, verified_complete: verifiedComplete, failed: failed, total_tasks: recentTasks.length }, revenue_health: { score: revenueHealth, calculation: `$${verifiedMRR} MRR / $10k target`, verified_mrr: verifiedMRR, active_stripe_subs: subscriptions.filter(s => s.status === 'active' && s.stripe_subscription_id).length }, module_health: { score: moduleHealth, calculation: `${activeModules} / ${modules.length} modules active`, active_modules: activeModules, total_modules: modules.length, module_activity: moduleActivity }, canon_coverage: { score: canonCoverage, calculation: `${canonWithHoldings} / ${canon.length} with holdings`, canon_with_holdings: canonWithHoldings, total_canon: canon.length }, user_outcomes: { score: userOutcomes, calculation: `${packetsGenerated + checkInsCompleted + intakesFinished} successes / total`, packets_generated: packetsGenerated, check_ins_completed: checkInsCompleted, intakes_finished: intakesFinished, intakes_stuck: intakesStuck } } },
        build_coverage: { score: buildCoverage, calculation: `30 base + ${agents.length}*5 + ${canon.length}*4 + ${builds.length}*3 + ${automations.length}*2 + ${adrs.length}*1`, agents: agents.length, canon: canon.length, builds: builds.length, automations: automations.length, adrs: adrs.length },
        agents: agents.slice(0, 30).map(a => ({ name: a.name, type: a.agent_type, c_suite: a.c_suite_title, status: a.status, skills: a.skills?.slice(0, 5), performance: a.performance_score })),
        existing_item_titles: existingItems.slice(0, 50).map(i => i.title),
        recent_bugs: bugs.slice(0, 10).map(b => ({ title: b.title, category: b.category, root_cause: b.root_cause?.slice(0, 80) })),
        recent_lessons: lessons.slice(0, 10).map(l => ({ type: l.lesson_type, title: l.title })),
        tech_debt_items: techDebt.slice(0, 10).map(t => ({ title: t.title || t.name, severity: t.severity, module: t.module })),
        diagnostic_issues: diagnostics.slice(0, 10).map(d => ({ title: d.title, severity: d.severity, category: d.category }))
      };

      const result = await admin.integrations.Core.InvokeLLM({
        prompt: `You are the NCOS Autonomous Improvement Engine. CURRENT PLATFORM STATE:\n${JSON.stringify(platformState).slice(0, 12000)}\n\nSCAN THE PLATFORM ACROSS ALL 13 DIMENSIONS: 1. BOTTLENECKS 2. MISSING_WORKFLOWS 3. DUPLICATION 4. UI 5. UX 6. DOCUMENTATION 7. TESTING 8. PERFORMANCE 9. ACCESSIBILITY 10. ENGINEERING_QUALITY 11. SECURITY 12. SCALABILITY 13. REVENUE. For EACH improvement found, provide: title, description, recommended_fix, improvement_dimension, bottleneck_type, estimated_effort, estimated_hours, estimated_revenue_impact, estimated_roi_score, readiness_increase_pct, business_impact, risk_level, risk_if_delayed, assigned_agent, priority, action_steps, success_metrics, what_it_unlocks. Also generate: executive_summary, platform_health_score, top_priorities, recommended_actions, revenue_opportunities, risk_warnings, dimension_scores. CRITICAL: Do NOT deploy changes, only generate backlog. All items require founder approval. Be specific and measurable.`,
        response_json_schema: { type: "object", properties: { executive_summary: { type: "string" }, platform_health_score: { type: "number" }, dimension_scores: { type: "object" }, improvements: { type: "array", items: { type: "object", properties: { title: { type: "string" }, description: { type: "string" }, recommended_fix: { type: "string" }, improvement_dimension: { type: "string" }, bottleneck_type: { type: "string" }, estimated_effort: { type: "string" }, estimated_hours: { type: "number" }, estimated_revenue_impact: { type: "number" }, estimated_roi_score: { type: "number" }, readiness_increase_pct: { type: "number" }, business_impact: { type: "string" }, risk_level: { type: "string" }, risk_if_delayed: { type: "string" }, assigned_agent: { type: "string" }, priority: { type: "string" }, action_steps: { type: "array", items: { type: "string" } }, success_metrics: { type: "array", items: { type: "string" } }, what_it_unlocks: { type: "string" } } } }, top_priorities: { type: "array", items: { type: "object" } }, recommended_actions: { type: "array", items: { type: "string" } }, revenue_opportunities: { type: "array", items: { type: "object" } }, risk_warnings: { type: "array", items: { type: "string" } } } }
      });

      const scanDate = new Date().toISOString().slice(0, 10);
      const improvements = result.improvements || [];
      const criticalItems = improvements.filter(i => i.priority === 'critical').length;
      const highItems = improvements.filter(i => i.priority === 'high').length;
      const totalRevenue = improvements.reduce((s, i) => s + (i.estimated_revenue_impact || 0), 0);
      const totalHours = improvements.reduce((s, i) => s + (i.estimated_hours || 0), 0);
      const totalReadiness = improvements.reduce((s, i) => s + (i.readiness_increase_pct || 0), 0);
      const bottlenecks = improvements.filter(i => i.improvement_dimension === 'bottlenecks').length;
      const missingWorkflows = improvements.filter(i => i.improvement_dimension === 'missing_workflows').length;
      const duplications = improvements.filter(i => i.improvement_dimension === 'duplication').length;

      const briefing = await admin.entities.ImprovementBriefing.create({
        briefing_date: scanDate,
        scan_summary: `Scanned ${Object.values(platformState.entities).reduce((a, b) => a + b, 0)} records. Found ${improvements.length} improvements. Operational Readiness: ${operationalReadiness}%, Build Coverage: ${buildCoverage}%.`,
        platform_health_score: result.platform_health_score || 50,
        operational_readiness_score: operationalReadiness,
        build_coverage_score: buildCoverage,
        total_items_generated: improvements.length,
        critical_items: criticalItems,
        high_priority_items: highItems,
        total_estimated_revenue_impact: totalRevenue,
        total_estimated_effort_hours: totalHours,
        estimated_readiness_increase: totalReadiness,
        bottlenecks_found: bottlenecks,
        missing_workflows_found: missingWorkflows,
        duplications_found: duplications,
        dimension_scores: result.dimension_scores || {},
        operational_readiness_breakdown: platformState.operational_readiness,
        build_coverage_breakdown: platformState.build_coverage,
        executive_summary: result.executive_summary || '',
        top_priorities: result.top_priorities || [],
        recommended_actions: result.recommended_actions || [],
        ai_agent_assignments: improvements.map(i => ({ title: i.title, agent: i.assigned_agent, dimension: i.improvement_dimension })),
        revenue_opportunities: result.revenue_opportunities || [],
        risk_warnings: result.risk_warnings || [],
        founder_approval_required: true,
        status: 'delivered'
      });

      const createdItems = [];
      for (const imp of improvements) {
        if (platformState.existing_item_titles.some(t => t && imp.title && t.toLowerCase() === imp.title.toLowerCase())) continue;
        try {
          const item = await admin.entities.ImprovementItem.create({
            title: imp.title, description: imp.description, recommended_fix: imp.recommended_fix, improvement_dimension: imp.improvement_dimension || 'engineering_quality', bottleneck_type: imp.bottleneck_type || 'none', estimated_effort: imp.estimated_effort || '1d', estimated_hours: imp.estimated_hours || 0, estimated_revenue_impact: imp.estimated_revenue_impact || 0, estimated_roi_score: imp.estimated_roi_score || 50, readiness_increase_pct: imp.readiness_increase_pct || 0, business_impact: imp.business_impact || 'medium', risk_level: imp.risk_level || 'medium', risk_if_delayed: imp.risk_if_delayed || '', assigned_agent: imp.assigned_agent || 'Chief Architect', ai_agents_required: imp.assigned_agent ? [imp.assigned_agent] : [], priority: imp.priority || 'medium', auto_prioritized: true, status: 'queued', requires_approval: true, approval_type: 'founder', founder_approved: false, source: 'Autonomous Improvement Engine', scan_date: scanDate, briefing_id: briefing.id, action_steps: imp.action_steps || [], success_metrics: imp.success_metrics || [], what_it_unlocks: imp.what_it_unlocks || '', strategic_priority_score: imp.estimated_roi_score || 50, confidence_score: 75
          });
          createdItems.push(item);
        } catch (e) {}
      }

      return Response.json({
        operation: 'run_daily_scan',
        briefing_id: briefing.id,
        items_created: createdItems.length,
        operational_readiness: operationalReadiness,
        build_coverage: buildCoverage,
        operational_readiness_breakdown: platformState.operational_readiness,
        build_coverage_breakdown: platformState.build_coverage,
        platform_health_score: result.platform_health_score,
        executive_summary: result.executive_summary,
        dimension_scores: result.dimension_scores,
        top_priorities: result.top_priorities,
        recommended_actions: result.recommended_actions,
        revenue_opportunities: result.revenue_opportunities,
        risk_warnings: result.risk_warnings,
        scan_date: scanDate,
        stats: { total_items: improvements.length, critical: criticalItems, high: highItems, bottlenecks, missing_workflows: missingWorkflows, duplications, total_revenue_impact: totalRevenue, total_effort_hours: totalHours, readiness_increase: totalReadiness }
      });
    }

    if (operation === 'get_backlog') {
      const items = await fetchAll('ImprovementItem', 500);
      const briefings = await fetchAll('ImprovementBriefing', 10);
      const sorted = items.sort((a, b) => (b.estimated_roi_score || 0) - (a.estimated_roi_score || 0));
      const byDimension = {};
      const dimensions = ["bottlenecks", "missing_workflows", "duplication", "ui", "ux", "documentation", "testing", "performance", "accessibility", "engineering_quality", "security", "scalability", "maintainability", "revenue"];
      for (const d of dimensions) byDimension[d] = items.filter(i => i.improvement_dimension === d);
      return Response.json({ operation: 'get_backlog', backlog: sorted, by_dimension: byDimension, latest_briefing: briefings[0] || null, stats: { total: items.length, queued: items.filter(i => i.status === 'queued').length, approved: items.filter(i => i.status === 'approved').length, in_progress: items.filter(i => i.status === 'in_progress').length, done: items.filter(i => i.status === 'done').length, dismissed: items.filter(i => i.status === 'dismissed').length, critical: items.filter(i => i.priority === 'critical').length, high: items.filter(i => i.priority === 'high').length, total_revenue_impact: items.reduce((s, i) => s + (i.estimated_revenue_impact || 0), 0), total_effort_hours: items.reduce((s, i) => s + (i.estimated_hours || 0), 0), avg_roi_score: items.length > 0 ? Math.round(items.reduce((s, i) => s + (i.estimated_roi_score || 0), 0) / items.length) : 0 } });
    }

    if (operation === 'approve_item') {
      const { item_id } = params;
      if (!item_id) return Response.json({ error: 'item_id required' }, { status: 400 });
      const updated = await admin.entities.ImprovementItem.update(item_id, { status: 'approved', founder_approved: true, approved_by: user.email, approved_at: new Date().toISOString() });
      return Response.json({ operation: 'approve_item', item: updated });
    }

    if (operation === 'dismiss_item') {
      const { item_id, reason } = params;
      if (!item_id) return Response.json({ error: 'item_id required' }, { status: 400 });
      const updated = await admin.entities.ImprovementItem.update(item_id, { status: 'dismissed', approved_by: user.email, reason: reason || 'Dismissed by founder' });
      return Response.json({ operation: 'dismiss_item', item: updated });
    }

    if (operation === 'start_execution') {
      const { item_id } = params;
      if (!item_id) return Response.json({ error: 'item_id required' }, { status: 400 });
      const item = await admin.entities.ImprovementItem.get(item_id);
      if (!item.founder_approved) return Response.json({ error: 'Founder approval required' }, { status: 403 });
      const updated = await admin.entities.ImprovementItem.update(item_id, { status: 'in_progress' });
      return Response.json({ operation: 'start_execution', item: updated });
    }

    if (operation === 'get_briefing') {
      const briefings = await fetchAll('ImprovementBriefing', 5);
      return Response.json({ operation: 'get_briefing', briefings, latest: briefings[0] || null });
    }

    return Response.json({ error: 'Unknown operation: ' + operation }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});