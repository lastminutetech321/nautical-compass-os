import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { operation, params } = body;

    const fetchSample = async (entityName, limit = 50) => {
      try { return await base44.asServiceRole.entities[entityName].list('-created_date', limit); }
      catch { return []; }
    };
    const fetchFiltered = async (entityName, query, limit = 50) => {
      try { return await base44.asServiceRole.entities[entityName].filter(query, '-created_date', limit); }
      catch { return []; }
    };

    // --- EVALUATE: Hourly evaluation generating all 6 outputs ---
    if (operation === 'evaluate') {
      const [projects, tasks, sprints, dependencies, survivalMetrics, revenueEvents,
        agentProfiles, roadmapItems, milestones, builds, issues, improvements, epics] = await Promise.all([
        fetchSample('Project', 50),
        fetchSample('Task', 100),
        fetchSample('Sprint', 10),
        fetchFiltered('Dependency', { status: { $ne: 'resolved' } }, 100),
        fetchSample('SurvivalMetric', 5),
        fetchFiltered('RevenueEvent', {}, 20),
        fetchSample('AgentProfile', 50),
        fetchFiltered('RoadmapItem', { status: { $ne: 'shipped' } }, 30),
        fetchSample('Milestone', 20),
        fetchSample('BuildRegistry', 50),
        fetchFiltered('DiagnosticIssue', { status: 'open' }, 30),
        fetchFiltered('ImprovementItem', { status: { $in: ['queued', 'approved'] } }, 20),
        fetchSample('Epic', 20),
      ]);

      // Calculate metrics
      const activeProjects = projects.filter(p => p.status === 'active' || p.status === 'in_progress').length;
      const overdueTasks = tasks.filter(t => {
        if (!t.due_date || t.status === 'done' || t.status === 'completed') return false;
        return new Date(t.due_date) < new Date();
      }).length;
      const blockedBuilds = builds.filter(b => b.is_blocked).length;
      const criticalDeps = dependencies.filter(d => d.business_impact === 'critical').length;
      const latestSurvival = survivalMetrics[0] || {};
      const monthlyRevenue = (revenueEvents || []).reduce((sum, r) => sum + (r.amount || 0), 0);
      const activeSprints = sprints.filter(s => s.status === 'active' || s.status === 'in_progress');
      const sprintVelocity = activeSprints.length > 0
        ? Math.round(activeSprints.reduce((sum, s) => sum + (s.completed_points || s.velocity || 0), 0) / activeSprints.length)
        : 0;
      const activeAgents = agentProfiles.filter(a => a.status === 'active').length;
      const openRisks = issues.length;
      const avgReadiness = builds.length > 0
        ? Math.round(builds.reduce((sum, b) => sum + ((b.architecture_pct + b.backend_pct + b.testing_pct + b.documentation_pct + b.deployment_pct) / 5), 0) / builds.length)
        : 0;

      const metricsSnapshot = {
        total_projects: projects.length,
        active_projects: activeProjects,
        total_tasks: tasks.length,
        overdue_tasks: overdueTasks,
        blocked_builds: blockedBuilds,
        total_dependencies: dependencies.length,
        critical_dependencies: criticalDeps,
        cash_runway_days: latestSurvival.runway_days || 0,
        monthly_revenue: monthlyRevenue,
        monthly_burn: latestSurvival.monthly_burn || 0,
        sprint_velocity: sprintVelocity,
        active_agents: activeAgents,
        open_risks: openRisks,
        engineering_readiness: avgReadiness,
      };

      // Compact data for LLM
      const platformContext = {
        metrics: metricsSnapshot,
        projects: projects.slice(0, 20).map(p => ({ name: p.name, status: p.status, priority: p.priority, progress: p.progress, owner: p.owner, due_date: p.due_date, health: p.health })),
        overdue_tasks: tasks.filter(t => t.due_date && t.status !== 'done' && new Date(t.due_date) < new Date()).slice(0, 15).map(t => ({ title: t.title, project: t.project_name, due: t.due_date, assignee: t.assignee, priority: t.priority })),
        sprints: sprints.slice(0, 5).map(s => ({ name: s.name, status: s.status, velocity: s.velocity || s.completed_points, goal: s.goal })),
        critical_dependencies: dependencies.filter(d => d.business_impact === 'critical' || d.business_impact === 'high').slice(0, 15).map(d => ({ title: d.title, type: d.dependency_type, what: d.what_is_missing, blocks: d.blocks_build_names, owner: d.owner, hours: d.estimated_hours })),
        blocked_builds: builds.filter(b => b.is_blocked).slice(0, 10).map(b => ({ name: b.name, rail: b.rail, blocked_by: b.blocked_by, owner: b.owner })),
        survival: { runway_days: latestSurvival.runway_days, monthly_burn: latestSurvival.monthly_burn, monthly_revenue: monthlyRevenue, break_even: latestSurvival.break_even_progress },
        active_agents: agentProfiles.filter(a => a.status === 'active').slice(0, 15).map(a => ({ name: a.name, type: a.agent_type, department: a.department, tasks_completed: a.tasks_completed, performance: a.performance_score })),
        roadmap: roadmapItems.slice(0, 15).map(r => ({ title: r.title, phase: r.phase, priority: r.priority, status: r.status, target_date: r.target_date })),
        milestones: milestones.slice(0, 10).map(m => ({ title: m.title, target_date: m.target_date, status: m.status })),
        open_risks: issues.slice(0, 10).map(i => ({ title: i.title, severity: i.severity, category: i.category })),
        improvements: improvements.slice(0, 10).map(i => ({ title: i.title, priority: i.priority, business_impact: i.business_impact })),
      };

      const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `You are the NCOS Project Director — an AI Executive Project Manager. You evaluate the entire platform every hour and generate executive outputs.

Current platform state:
${JSON.stringify(platformContext).slice(0, 15000)}

Generate ALL 6 outputs:

1. DAILY EXECUTIVE BRIEFING — headline, key wins, key risks, revenue status, platform health, founder actions required, summary
2. WEEKLY ROADMAP — week theme, priority initiatives (name, owner, effort, impact), milestones this week, resource allocation, summary
3. MONTHLY MILESTONES — month theme, milestones (title, target_date, owner, status), revenue target, readiness target, summary
4. RECOMMENDED SPRINT — sprint name, sprint goal, duration weeks, assigned team, sprint backlog (task, points, assignee), success criteria, summary
5. RECOMMENDED STAFFING — current capacity, gaps identified, hire recommendations (role, urgency, reason), agent reallocation (agent, from, to, reason), summary
6. RECOMMENDED PRIORITIES — top 5 priorities (title, rationale, impact, effort, owner), deprioritize list, rationale, summary

CRITICAL RULES:
- NEVER recommend automatic production modifications
- ALL recommendations require Founder approval before execution
- Be specific and actionable — use real project names, real agent names, real dependency titles from the data
- If cash runway < 90 days, flag as critical risk
- If engineering readiness < 50%, flag as needing acceleration
- Prioritize unblocking blocked builds and resolving critical dependencies`,
        response_json_schema: {
          type: "object",
          properties: {
            daily_briefing: {
              type: "object",
              additionalProperties: false,
              properties: {
                headline: { type: "string" },
                key_wins: { type: "array", items: { type: "string" } },
                key_risks: { type: "array", items: { type: "string" } },
                revenue_status: { type: "string" },
                platform_health: { type: "string" },
                founder_actions_required: { type: "array", items: { type: "string" } },
                summary: { type: "string" }
              },
              required: ["headline", "key_wins", "key_risks", "revenue_status", "platform_health", "founder_actions_required", "summary"]
            },
            weekly_roadmap: {
              type: "object",
              additionalProperties: false,
              properties: {
                week_theme: { type: "string" },
                priority_initiatives: { type: "array", items: { type: "object", additionalProperties: false, properties: { name: { type: "string" }, owner: { type: "string" }, effort: { type: "string" }, impact: { type: "string" } }, required: ["name", "owner", "effort", "impact"] } },
                milestones_this_week: { type: "array", items: { type: "string" } },
                resource_allocation: { type: "array", items: { type: "object", additionalProperties: false, properties: { resource: { type: "string" }, allocated_to: { type: "string" }, hours: { type: "string" } }, required: ["resource", "allocated_to", "hours"] } },
                summary: { type: "string" }
              },
              required: ["week_theme", "priority_initiatives", "milestones_this_week", "resource_allocation", "summary"]
            },
            monthly_milestones: {
              type: "object",
              additionalProperties: false,
              properties: {
                month_theme: { type: "string" },
                milestones: { type: "array", items: { type: "object", additionalProperties: false, properties: { title: { type: "string" }, target_date: { type: "string" }, owner: { type: "string" }, status: { type: "string" } }, required: ["title", "target_date", "owner", "status"] } },
                revenue_target: { type: "number" },
                readiness_target: { type: "number" },
                summary: { type: "string" }
              },
              required: ["month_theme", "milestones", "revenue_target", "readiness_target", "summary"]
            },
            recommended_sprint: {
              type: "object",
              additionalProperties: false,
              properties: {
                sprint_name: { type: "string" },
                sprint_goal: { type: "string" },
                duration_weeks: { type: "number" },
                assigned_team: { type: "array", items: { type: "string" } },
                sprint_backlog: { type: "array", items: { type: "object", additionalProperties: false, properties: { task: { type: "string" }, points: { type: "number" }, assignee: { type: "string" } }, required: ["task", "points", "assignee"] } },
                success_criteria: { type: "array", items: { type: "string" } },
                summary: { type: "string" }
              },
              required: ["sprint_name", "sprint_goal", "duration_weeks", "assigned_team", "sprint_backlog", "success_criteria", "summary"]
            },
            recommended_staffing: {
              type: "object",
              additionalProperties: false,
              properties: {
                current_capacity: { type: "string" },
                gaps_identified: { type: "array", items: { type: "string" } },
                hire_recommendations: { type: "array", items: { type: "object", additionalProperties: false, properties: { role: { type: "string" }, urgency: { type: "string" }, reason: { type: "string" } }, required: ["role", "urgency", "reason"] } },
                agent_reallocation: { type: "array", items: { type: "object", additionalProperties: false, properties: { agent: { type: "string" }, from: { type: "string" }, to: { type: "string" }, reason: { type: "string" } }, required: ["agent", "from", "to", "reason"] } },
                summary: { type: "string" }
              },
              required: ["current_capacity", "gaps_identified", "hire_recommendations", "agent_reallocation", "summary"]
            },
            recommended_priorities: {
              type: "object",
              additionalProperties: false,
              properties: {
                top_5_priorities: { type: "array", items: { type: "object", additionalProperties: false, properties: { title: { type: "string" }, rationale: { type: "string" }, impact: { type: "string" }, effort: { type: "string" }, owner: { type: "string" } }, required: ["title", "rationale", "impact", "effort", "owner"] } },
                deprioritize: { type: "array", items: { type: "string" } },
                rationale: { type: "string" },
                summary: { type: "string" }
              },
              required: ["top_5_priorities", "deprioritize", "rationale", "summary"]
            },
            founder_approval_actions: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  approval_type: { type: "string" },
                  risk_level: { type: "string" },
                },
                required: ["title", "description", "approval_type", "risk_level"]
              }
            }
          },
          additionalProperties: false,
          required: ["daily_briefing", "weekly_roadmap", "monthly_milestones", "recommended_sprint", "recommended_staffing", "recommended_priorities", "founder_approval_actions"]
        }
      });

      const evaluationId = `PD-${Date.now()}`;
      const now = new Date();
      const nextEval = new Date(now.getTime() + 60 * 60 * 1000); // +1 hour

      // Create approval gates for founder approval actions
      const approvalGateIds = [];
      if (result.founder_approval_actions) {
        for (const action of result.founder_approval_actions.slice(0, 10)) {
          try {
            const gate = await base44.asServiceRole.entities.ApprovalGate.create({
              title: action.title,
              description: action.description,
              approval_type: action.approval_type || 'founder',
              risk_level: action.risk_level || 'medium',
              status: 'pending',
              requested_by: 'NC Project Director',
              source_entity_type: 'ProjectDirectorReport',
              source_entity_id: evaluationId,
              created_at: now.toISOString(),
            });
            approvalGateIds.push(gate.id);
          } catch (e) { /* skip */ }
        }
      }

      const report = await base44.asServiceRole.entities.ProjectDirectorReport.create({
        evaluation_id: evaluationId,
        report_type: 'hourly_evaluation',
        generated_at: now.toISOString(),
        next_evaluation: nextEval.toISOString(),
        metrics_snapshot: metricsSnapshot,
        daily_briefing: result.daily_briefing,
        weekly_roadmap: result.weekly_roadmap,
        monthly_milestones: result.monthly_milestones,
        recommended_sprint: result.recommended_sprint,
        recommended_staffing: result.recommended_staffing,
        recommended_priorities: result.recommended_priorities,
        approval_gates: approvalGateIds,
        approval_required: approvalGateIds.length > 0,
        status: 'pending_approval',
      });

      return Response.json({
        report,
        metrics: metricsSnapshot,
        approval_gates_created: approvalGateIds.length,
        operation: 'evaluate',
      });
    }

    // --- LATEST: Get most recent report ---
    if (operation === 'latest') {
      const reports = await fetchSample('ProjectDirectorReport', 1);
      if (reports.length === 0) {
        return Response.json({ report: null, message: 'No evaluations yet. Run evaluate to generate the first report.' });
      }
      return Response.json({ report: reports[0], operation: 'latest' });
    }

    // --- HISTORY: List past reports ---
    if (operation === 'history') {
      const reports = await fetchSample('ProjectDirectorReport', 20);
      return Response.json({ reports: reports.map(r => ({
        id: r.id, evaluation_id: r.evaluation_id, generated_at: r.generated_at,
        status: r.status, metrics_snapshot: r.metrics_snapshot,
      })), operation: 'history' });
    }

    // --- APPROVE: Founder approves recommendations ---
    if (operation === 'approve') {
      const { report_id, approved_by, notes } = params;
      if (!report_id) return Response.json({ error: 'report_id required' }, { status: 400 });

      const report = await base44.asServiceRole.entities.ProjectDirectorReport.get(report_id);

      // Approve all linked approval gates
      const approvedGates = [];
      for (const gateId of report.approval_gates || []) {
        try {
          const gate = await base44.asServiceRole.entities.ApprovalGate.update(gateId, {
            status: 'approved',
            approved_by: approved_by || user.full_name,
            approved_at: new Date().toISOString(),
          });
          approvedGates.push(gate.id);
        } catch (e) { /* skip */ }
      }

      const updated = await base44.asServiceRole.entities.ProjectDirectorReport.update(report_id, {
        status: 'approved',
        approved_by: approved_by || user.full_name,
        approved_at: new Date().toISOString(),
        founder_notes: notes || '',
      });

      return Response.json({ report: updated, approved_gates: approvedGates, operation: 'approve' });
    }

    // --- REJECT: Founder rejects ---
    if (operation === 'reject') {
      const { report_id, reason } = params;
      if (!report_id) return Response.json({ error: 'report_id required' }, { status: 400 });

      const report = await base44.asServiceRole.entities.ProjectDirectorReport.get(report_id);
      for (const gateId of report.approval_gates || []) {
        try {
          await base44.asServiceRole.entities.ApprovalGate.update(gateId, { status: 'rejected' });
        } catch (e) { /* skip */ }
      }

      const updated = await base44.asServiceRole.entities.ProjectDirectorReport.update(report_id, {
        status: 'rejected',
        rejected_reason: reason || '',
      });

      return Response.json({ report: updated, operation: 'reject' });
    }

    // --- STATUS: Current director status ---
    if (operation === 'status') {
      const reports = await fetchSample('ProjectDirectorReport', 5);
      const latest = reports[0];
      const pendingApprovals = await fetchFiltered('ApprovalGate', { status: 'pending', source_entity_type: 'ProjectDirectorReport' }, 20);

      return Response.json({
        is_operational: true,
        last_evaluation: latest?.generated_at || null,
        next_evaluation: latest?.next_evaluation || null,
        total_evaluations: reports.length,
        pending_approvals: pendingApprovals.length,
        latest_status: latest?.status || 'none',
        latest_metrics: latest?.metrics_snapshot || null,
        operation: 'status',
      });
    }

    return Response.json({ error: 'Unknown operation: ' + operation }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});