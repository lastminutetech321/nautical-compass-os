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

    // ═══════════════════════════════════════════════════════════
    // RUN DAILY SCAN — the core autonomous improvement engine
    // ═══════════════════════════════════════════════════════════
    if (operation === 'run_daily_scan') {
      // 1. SCAN PLATFORM — gather all system state
      const [agents, existingItems, diagnostics, techDebt, bugs, lessons, journals, adrs, prompts, canon, builds, releases, roadmap, approvals, notifications, survival, subscriptions, invoices, crmLeads, crmDeals, resources, workerProfiles, cases, evidence, foia, authorityInteractions, knowledgeNodes, automations, projects, tasks, sprints, milestones, epics, releases2] = await Promise.all([
        fetchAll('AgentProfile', 100),
        fetchAll('ImprovementItem', 500),
        fetchAll('DiagnosticIssue', 100),
        fetchAll('TechnicalDebt', 100),
        fetchAll('BugKnowledgeBase', 200),
        fetchAll('LessonLearned', 200),
        fetchAll('EngineeringJournal', 300),
        fetchAll('ADR', 100),
        fetchAll('PromptLibrary', 200),
        fetchAll('CanonEntry', 100),
        fetchAll('BuildRegistry', 100),
        fetchAll('Release', 50),
        fetchAll('RoadmapItem', 100),
        fetchAll('ApprovalGate', 50),
        fetchAll('Notification', 100),
        fetchAll('SurvivalMetric', 10),
        fetchAll('Subscription', 200),
        fetchAll('Invoice', 200),
        fetchAll('CRMLead', 200),
        fetchAll('CRMDeal', 100),
        fetchAll('Resource', 200),
        fetchAll('WorkerProfile', 200),
        fetchAll('CaseFile', 100),
        fetchAll('Evidence', 100),
        fetchAll('FOIARequest', 100),
        fetchAll('AuthorityInteraction', 100),
        fetchAll('KnowledgeNode', 100),
        fetchAll('Automation', 100),
        fetchAll('Project', 100),
        fetchAll('Task', 200),
        fetchAll('Sprint', 20),
        fetchAll('Milestone', 50),
        fetchAll('Epic', 50),
        fetchAll('Release', 50),
      ]);

      // 2. ANALYZE PLATFORM STATE
      const platformState = {
        entities: {
          agents: agents.length, active_agents: agents.filter(a => a.status === 'active').length,
          improvement_items: existingItems.length, open_items: existingItems.filter(i => i.status === 'queued').length,
          diagnostics: diagnostics.length, critical_diagnostics: diagnostics.filter(d => d.severity === 'critical').length,
          tech_debt: techDebt.length, bugs: bugs.length, open_bugs: bugs.filter(b => b.status === 'open').length,
          lessons: lessons.length, journals: journals.length, adrs: adrs.length, prompts: prompts.length,
          canon_entries: canon.length, verified_canon: canon.filter(c => c.verified).length,
          builds: builds.length, blocked_builds: builds.filter(b => b.is_blocked).length,
          roadmap_items: roadmap.length, pending_approvals: approvals.length,
          unread_notifications: notifications.filter(n => !n.read).length,
          subscriptions: subscriptions.length, active_subs: subscriptions.filter(s => s.status === 'active').length,
          invoices: invoices.length, unpaid_invoices: invoices.filter(i => i.status === 'open').length,
          crm_leads: crmLeads.length, crm_deals: crmDeals.length,
          resources: resources.length, workers: workerProfiles.length,
          cases: cases.length, evidence: evidence.length, foia: foia.length,
          authority_interactions: authorityInteractions.length,
          knowledge_nodes: knowledgeNodes.length, automations: automations.length,
          projects: projects.length, tasks: tasks.length, open_tasks: tasks.filter(t => t.status !== 'done').length,
          sprints: sprints.length, milestones: milestones.length, epics: epics.length,
        },
        revenue: {
          mrr: subscriptions.reduce((s, sub) => s + (sub.mrr || 0), 0),
          unpaid_invoice_amount: invoices.filter(i => i.status === 'open').reduce((s, i) => s + (i.amount_due || 0), 0),
          active_sub_count: subscriptions.filter(s => s.status === 'active').length,
        },
        health: {
          survival: survival[0] || null,
          critical_issues: diagnostics.filter(d => d.severity === 'critical').length,
          blocked_builds: builds.filter(b => b.is_blocked).length,
          pending_approvals: approvals.length,
          open_bugs: bugs.filter(b => b.status === 'open').length,
          tech_debt_items: techDebt.length,
        },
        agents: agents.slice(0, 30).map(a => ({ name: a.name, type: a.agent_type, c_suite: a.c_suite_title, status: a.status, skills: a.skills?.slice(0, 5), performance: a.performance_score })),
        existing_item_titles: existingItems.slice(0, 50).map(i => i.title),
        recent_bugs: bugs.slice(0, 10).map(b => ({ title: b.title, category: b.category, root_cause: b.root_cause?.slice(0, 80) })),
        recent_lessons: lessons.slice(0, 10).map(l => ({ type: l.lesson_type, title: l.title })),
        tech_debt_items: techDebt.slice(0, 10).map(t => ({ title: t.title || t.name, severity: t.severity, module: t.module })),
        diagnostic_issues: diagnostics.slice(0, 10).map(d => ({ title: d.title, severity: d.severity, category: d.category })),
      };

      // 3. LLM ANALYSIS — scan across all 13 dimensions
      const result = await admin.integrations.Core.InvokeLLM({
        prompt: `You are the NCOS Autonomous Improvement Engine. Every day you scan the entire platform, find bottlenecks, measure ROI, identify missing workflows, remove duplication, and improve across 13 dimensions.

CURRENT PLATFORM STATE:
${JSON.stringify(platformState).slice(0, 12000)}

SCAN THE PLATFORM ACROSS ALL 13 DIMENSIONS:
1. BOTTLENECKS — data volume issues, slow processes, blocked dependencies, manual processes needing automation
2. MISSING_WORKFLOWS — processes that should be automated but aren't (no workflow/scheduled task exists)
3. DUPLICATION — duplicate entities, overlapping fields, redundant pages, repeated logic
4. UI — interface improvements needed
5. UX — user experience improvements needed
6. DOCUMENTATION — missing or outdated documentation
7. TESTING — missing test coverage, untested flows
8. PERFORMANCE — slow operations, optimization opportunities
9. ACCESSIBILITY — a11y issues
10. ENGINEERING_QUALITY — code quality, patterns, technical debt
11. SECURITY — security gaps, access control issues
12. SCALABILITY — scaling bottlenecks
13. REVENUE — revenue opportunities, monetization gaps, pricing improvements

For EACH improvement found, provide:
- title, description, recommended_fix
- improvement_dimension (one of the 13 above)
- bottleneck_type (if applicable)
- estimated_effort (1h/2-4h/1d/2-3d/1w/2w+)
- estimated_hours (numeric)
- estimated_revenue_impact (USD/month, 0 if none)
- estimated_roi_score (0-100, higher = better ROI)
- readiness_increase_pct (how much platform readiness improves)
- business_impact (low/medium/high/critical)
- risk_level (low/medium/high/critical)
- risk_if_delayed
- assigned_agent (name of best AI employee from the agent list, or "Chief Architect" / "CTO Agent" etc.)
- priority (low/medium/high/critical)
- action_steps (array of steps)
- success_metrics (array of measurable outcomes)
- what_it_unlocks

Also generate:
- executive_summary (2-3 paragraphs for the founder)
- platform_health_score (0-100)
- top_priorities (top 5 items with title, dimension, roi_score, revenue_impact)
- recommended_actions (5-7 actions for the founder)
- revenue_opportunities (items with revenue impact > 0)
- risk_warnings (critical risks that need immediate attention)
- dimension_scores (object mapping each of the 13 dimensions to a 0-100 score)

CRITICAL RULES:
- Do NOT deploy or execute any changes — only generate the backlog
- All items default to status "queued" and requires_approval true
- Founder approval is MANDATORY for all improvements
- Be specific and actionable — no generic suggestions
- Focus on items with measurable ROI`,
        response_json_schema: {
          type: "object",
          properties: {
            executive_summary: { type: "string" },
            platform_health_score: { type: "number" },
            dimension_scores: { type: "object" },
            improvements: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  recommended_fix: { type: "string" },
                  improvement_dimension: { type: "string" },
                  bottleneck_type: { type: "string" },
                  estimated_effort: { type: "string" },
                  estimated_hours: { type: "number" },
                  estimated_revenue_impact: { type: "number" },
                  estimated_roi_score: { type: "number" },
                  readiness_increase_pct: { type: "number" },
                  business_impact: { type: "string" },
                  risk_level: { type: "string" },
                  risk_if_delayed: { type: "string" },
                  assigned_agent: { type: "string" },
                  priority: { type: "string" },
                  action_steps: { type: "array", items: { type: "string" } },
                  success_metrics: { type: "array", items: { type: "string" } },
                  what_it_unlocks: { type: "string" },
                }
              }
            },
            top_priorities: { type: "array", items: { type: "object" } },
            recommended_actions: { type: "array", items: { type: "string" } },
            revenue_opportunities: { type: "array", items: { type: "object" } },
            risk_warnings: { type: "array", items: { type: "string" } },
          }
        }
      });

      const scanDate = new Date().toISOString().slice(0, 10);

      // 4. CREATE IMPROVEMENT BRIEFING
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
        scan_summary: `Scanned ${Object.values(platformState.entities).reduce((a, b) => a + b, 0)} records across ${Object.keys(platformState.entities).length} entity types. Found ${improvements.length} improvement opportunities.`,
        platform_health_score: result.platform_health_score || 50,
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
        executive_summary: result.executive_summary || '',
        top_priorities: result.top_priorities || [],
        recommended_actions: result.recommended_actions || [],
        ai_agent_assignments: improvements.map(i => ({ title: i.title, agent: i.assigned_agent, dimension: i.improvement_dimension })),
        revenue_opportunities: result.revenue_opportunities || [],
        risk_warnings: result.risk_warnings || [],
        founder_approval_required: true,
        status: 'delivered',
      });

      // 5. CREATE IMPROVEMENT ITEMS (all queued, founder approval required)
      const createdItems = [];
      for (const imp of improvements) {
        // Skip if title already exists in existing items
        if (platformState.existing_item_titles.some(t => t && imp.title && t.toLowerCase() === imp.title.toLowerCase())) continue;
        try {
          const item = await admin.entities.ImprovementItem.create({
            title: imp.title,
            description: imp.description,
            recommended_fix: imp.recommended_fix,
            improvement_dimension: imp.improvement_dimension || 'engineering_quality',
            bottleneck_type: imp.bottleneck_type || 'none',
            estimated_effort: imp.estimated_effort || '1d',
            estimated_hours: imp.estimated_hours || 0,
            estimated_revenue_impact: imp.estimated_revenue_impact || 0,
            estimated_roi_score: imp.estimated_roi_score || 50,
            readiness_increase_pct: imp.readiness_increase_pct || 0,
            business_impact: imp.business_impact || 'medium',
            risk_level: imp.risk_level || 'medium',
            risk_if_delayed: imp.risk_if_delayed || '',
            assigned_agent: imp.assigned_agent || 'Chief Architect',
            ai_agents_required: imp.assigned_agent ? [imp.assigned_agent] : [],
            priority: imp.priority || 'medium',
            auto_prioritized: true,
            status: 'queued',
            requires_approval: true,
            approval_type: 'founder',
            founder_approved: false,
            source: 'Autonomous Improvement Engine',
            scan_date: scanDate,
            briefing_id: briefing.id,
            action_steps: imp.action_steps || [],
            success_metrics: imp.success_metrics || [],
            what_it_unlocks: imp.what_it_unlocks || '',
            strategic_priority_score: imp.estimated_roi_score || 50,
            confidence_score: 75,
          });
          createdItems.push(item);
        } catch (e) { /* skip individual failures */ }
      }

      return Response.json({
        operation: 'run_daily_scan',
        briefing_id: briefing.id,
        items_created: createdItems.length,
        platform_health_score: result.platform_health_score,
        executive_summary: result.executive_summary,
        dimension_scores: result.dimension_scores,
        top_priorities: result.top_priorities,
        recommended_actions: result.recommended_actions,
        revenue_opportunities: result.revenue_opportunities,
        risk_warnings: result.risk_warnings,
        scan_date: scanDate,
        stats: {
          total_items: improvements.length,
          critical: criticalItems,
          high: highItems,
          bottlenecks, missing_workflows: missingWorkflows, duplications,
          total_revenue_impact: totalRevenue,
          total_effort_hours: totalHours,
          readiness_increase: totalReadiness,
        }
      });
    }

    // ═══════════════════════════════════════════════════════════
    // GET BACKLOG — prioritized improvement items
    // ═══════════════════════════════════════════════════════════
    if (operation === 'get_backlog') {
      const items = await fetchAll('ImprovementItem', 500);
      const briefings = await fetchAll('ImprovementBriefing', 10);

      // Sort by ROI score (auto-prioritized)
      const sorted = items.sort((a, b) => (b.estimated_roi_score || 0) - (a.estimated_roi_score || 0));

      const byDimension = {};
      const dimensions = ["bottlenecks", "missing_workflows", "duplication", "ui", "ux", "documentation", "testing", "performance", "accessibility", "engineering_quality", "security", "scalability", "maintainability", "revenue"];
      for (const d of dimensions) {
        byDimension[d] = items.filter(i => i.improvement_dimension === d);
      }

      return Response.json({
        operation: 'get_backlog',
        backlog: sorted,
        by_dimension: byDimension,
        latest_briefing: briefings[0] || null,
        stats: {
          total: items.length,
          queued: items.filter(i => i.status === 'queued').length,
          approved: items.filter(i => i.status === 'approved').length,
          in_progress: items.filter(i => i.status === 'in_progress').length,
          done: items.filter(i => i.status === 'done').length,
          dismissed: items.filter(i => i.status === 'dismissed').length,
          critical: items.filter(i => i.priority === 'critical').length,
          high: items.filter(i => i.priority === 'high').length,
          total_revenue_impact: items.reduce((s, i) => s + (i.estimated_revenue_impact || 0), 0),
          total_effort_hours: items.reduce((s, i) => s + (i.estimated_hours || 0), 0),
          avg_roi_score: items.length > 0 ? Math.round(items.reduce((s, i) => s + (i.estimated_roi_score || 0), 0) / items.length) : 0,
        }
      });
    }

    // ═══════════════════════════════════════════════════════════
    // APPROVE ITEM — founder approves an improvement
    // ═══════════════════════════════════════════════════════════
    if (operation === 'approve_item') {
      const { item_id } = params;
      if (!item_id) return Response.json({ error: 'item_id required' }, { status: 400 });

      const updated = await admin.entities.ImprovementItem.update(item_id, {
        status: 'approved',
        founder_approved: true,
        approved_by: user.email,
        approved_at: new Date().toISOString(),
      });

      return Response.json({ operation: 'approve_item', item: updated });
    }

    // ═══════════════════════════════════════════════════════════
    // DISMISS ITEM — founder dismisses an improvement
    // ═══════════════════════════════════════════════════════════
    if (operation === 'dismiss_item') {
      const { item_id, reason } = params;
      if (!item_id) return Response.json({ error: 'item_id required' }, { status: 400 });

      const updated = await admin.entities.ImprovementItem.update(item_id, {
        status: 'dismissed',
        approved_by: user.email,
        reason: reason || 'Dismissed by founder',
      });

      return Response.json({ operation: 'dismiss_item', item: updated });
    }

    // ═══════════════════════════════════════════════════════════
    // START EXECUTION — mark approved item as in_progress
    // ═══════════════════════════════════════════════════════════
    if (operation === 'start_execution') {
      const { item_id } = params;
      if (!item_id) return Response.json({ error: 'item_id required' }, { status: 400 });

      const item = await admin.entities.ImprovementItem.get(item_id);
      if (!item.founder_approved) {
        return Response.json({ error: 'Founder approval required before execution' }, { status: 403 });
      }

      const updated = await admin.entities.ImprovementItem.update(item_id, {
        status: 'in_progress',
      });

      return Response.json({ operation: 'start_execution', item: updated });
    }

    // ═══════════════════════════════════════════════════════════
    // GET BRIEFING — latest executive briefing
    // ═══════════════════════════════════════════════════════════
    if (operation === 'get_briefing') {
      const briefings = await fetchAll('ImprovementBriefing', 5);
      return Response.json({ operation: 'get_briefing', briefings, latest: briefings[0] || null });
    }

    return Response.json({ error: 'Unknown operation: ' + operation }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});