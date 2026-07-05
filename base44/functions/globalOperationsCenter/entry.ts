import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { operation, params } = body;

    const fetchAll = async (entityName, limit = 100) => {
      try { return await base44.asServiceRole.entities[entityName].list('-created_date', limit); }
      catch { return []; }
    };

    // ── GET COMPANIES ──
    if (operation === 'get_companies') {
      const [clones, orgs] = await Promise.all([
        fetchAll('EnterpriseClone', 50),
        fetchAll('EnterpriseOrg', 50),
      ]);
      const companies = [
        ...clones.map(c => ({
          id: c.id, name: c.clone_name || c.name || 'Unnamed Clone', type: 'clone',
          industry: c.industry, company_size: c.company_size,
          revenue_model: c.revenue_model, status: c.status,
          goals: c.goals, created_date: c.created_date,
        })),
        ...orgs.map(o => ({
          id: o.id, name: o.name || o.org_name || 'Unnamed Org', type: 'org',
          industry: o.industry, company_size: o.size,
          status: o.status || 'active', created_date: o.created_date,
        })),
      ];
      return Response.json({ companies, operation: 'get_companies' });
    }

    // ── GET GLOBAL OVERVIEW ──
    if (operation === 'get_global_overview') {
      const [clones, orgs, projects, agents, leads, subscriptions, revenueEvents, notifications, approvals, diagnostics, sprints, healthChecks, survivalMetrics, crmDeals] = await Promise.all([
        fetchAll('EnterpriseClone', 50),
        fetchAll('EnterpriseOrg', 50),
        fetchAll('Project', 50),
        fetchAll('AgentProfile', 100),
        fetchAll('CRMLead', 100),
        fetchAll('Subscription', 100),
        fetchAll('RevenueEvent', 100),
        fetchAll('Notification', 50),
        fetchAll('ApprovalGate', 50),
        fetchAll('DiagnosticIssue', 50),
        fetchAll('Sprint', 50),
        fetchAll('HealthCheck', 50),
        fetchAll('SurvivalMetric', 50),
        fetchAll('CRMDeal', 50),
      ]);

      const companies = [...clones, ...orgs];
      const totalRevenue = revenueEvents.reduce((s, r) => s + (r.amount || 0), 0);
      const activeSubscriptions = subscriptions.filter(s => s.status === 'active').length;
      const activeAlerts = notifications.filter(n => !n.read).length;
      const pendingApprovals = approvals.filter(a => a.status === 'pending' || a.status === 'requested').length;
      const criticalRisks = diagnostics.filter(d => d.severity === 'critical' || d.severity === 'high').length;
      const avgReadiness = survivalMetrics.length > 0
        ? survivalMetrics.reduce((s, m) => s + (m.readiness_score || m.readiness_pct || 0), 0) / survivalMetrics.length
        : 0;
      const activeAgents = agents.filter(a => a.status === 'active').length;
      const activeProjects = projects.filter(p => p.status === 'active' || p.status === 'in_progress').length;
      const wonDeals = crmDeals.filter(d => d.status === 'won' || d.status === 'closed_won').length;

      const companySummaries = companies.map(c => {
        const isClone = c.clone_name != null;
        const name = c.clone_name || c.name || c.org_name || 'Unknown';
        const orgCount = (c.organizations || []).length;
        const userCount = (c.users || []).length;
        const projectCount = (c.projects || []).length;
        const agentCount = (c.ai_workforce || []).length;
        const subCount = (c.subscriptions || []).length;
        const healthScore = Math.min(100, Math.round(
          (projectCount > 0 ? 20 : 0) + (agentCount > 0 ? 20 : 0) +
          (subCount > 0 ? 20 : 0) + (orgCount > 0 ? 20 : 0) + (userCount > 0 ? 20 : 0)
        ));
        return {
          id: c.id, name, type: isClone ? 'clone' : 'org',
          industry: c.industry, company_size: c.company_size, status: c.status,
          health_score: healthScore, org_count: orgCount, user_count: userCount,
          project_count: projectCount, agent_count: agentCount, subscription_count: subCount,
          revenue_estimate: subCount * 500, readiness: healthScore,
        };
      });

      const globalAlerts = notifications.filter(n => !n.read).sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).slice(0, 10);
      const criticalRiskItems = diagnostics.filter(d => d.severity === 'critical' || d.severity === 'high').slice(0, 10);
      const pendingApprovalItems = approvals.filter(a => a.status === 'pending' || a.status === 'requested').slice(0, 10);

      return Response.json({
        global_kpis: {
          total_companies: companies.length,
          total_revenue: totalRevenue,
          active_subscriptions: activeSubscriptions,
          total_projects: projects.length,
          active_projects: activeProjects,
          total_agents: agents.length,
          active_agents: activeAgents,
          total_customers: leads.length,
          won_deals: wonDeals,
          active_alerts: activeAlerts,
          pending_approvals: pendingApprovals,
          critical_risks: criticalRisks,
          avg_readiness: Math.round(avgReadiness),
          total_sprints: sprints.length,
        },
        company_summaries: companySummaries,
        global_alerts: globalAlerts.map(n => ({ id: n.id, title: n.title, type: n.type, severity: n.severity, message: n.message, created_date: n.created_date })),
        critical_risks: criticalRiskItems.map(d => ({ id: d.id, title: d.title || d.issue_title, severity: d.severity, module: d.affected_module || d.module, status: d.status })),
        pending_approvals: pendingApprovalItems.map(a => ({ id: a.id, title: a.title || a.action_description, type: a.approval_type, risk_level: a.risk_level, status: a.status, requested_at: a.created_date })),
        operation: 'get_global_overview'
      });
    }

    // ── GET COMPANY DASHBOARD ──
    if (operation === 'get_company_dashboard') {
      const { company_id } = params;
      if (!company_id) return Response.json({ error: 'company_id required' }, { status: 400 });

      let company = null;
      try { company = await base44.asServiceRole.entities.EnterpriseClone.get(company_id); } catch {}
      if (!company) { try { company = await base44.asServiceRole.entities.EnterpriseOrg.get(company_id); } catch {} }
      if (!company) return Response.json({ error: 'Company not found' }, { status: 404 });

      const isClone = company.clone_name != null;
      const name = company.clone_name || company.name || company.org_name || 'Unknown';

      const organizations = company.organizations || [];
      const users = company.users || [];
      const aiWorkforce = company.ai_workforce || [];
      const projects = company.projects || [];
      const subscriptions = company.subscriptions || [];
      const roadmap = company.roadmap || [];
      const entities = company.entities || [];
      const apis = company.apis || [];
      const dashboards = company.dashboards || [];

      const orgCount = organizations.length;
      const userCount = users.length;
      const projectCount = projects.length;
      const agentCount = aiWorkforce.length;
      const subCount = subscriptions.length;
      const revenueEstimate = subscriptions.reduce((s, sub) => s + (sub.price || sub.price_monthly || 0), 0);
      const activeProjects = projects.filter(p => p.status === 'active' || p.status === 'in_progress').length;
      const completedProjects = projects.filter(p => p.status === 'completed' || p.status === 'done').length;

      const healthScore = Math.min(100, Math.round(
        (projectCount > 0 ? 15 : 0) + (agentCount > 0 ? 15 : 0) + (subCount > 0 ? 15 : 0) +
        (orgCount > 0 ? 15 : 0) + (userCount > 0 ? 15 : 0) + (roadmap.length > 0 ? 10 : 0) +
        (entities.length > 0 ? 10 : 0) + (apis.length > 0 ? 5 : 0) + (company.status === 'active' ? 10 : 0)
      ));

      const summaryPrompt = `You are the NCOS Global Operations Center. Generate a concise executive summary for this company.

COMPANY: ${name}
INDUSTRY: ${company.industry || 'Not specified'}
SIZE: ${company.company_size || 'Not specified'}
STATUS: ${company.status || 'active'}

METRICS:
- Organizations: ${orgCount}
- Users: ${userCount}
- AI Workforce: ${agentCount} agents
- Projects: ${projectCount} (${activeProjects} active, ${completedProjects} completed)
- Subscriptions: ${subCount}
- Revenue Estimate: $${revenueEstimate}/month
- Roadmap Items: ${roadmap.length}
- Data Entities: ${entities.length}
- APIs: ${apis.length}
- Health Score: ${healthScore}/100

GOALS: ${(company.goals || []).join(', ') || 'Not specified'}

Generate a 3-4 sentence executive summary covering: organization health, revenue outlook, engineering progress, AI workforce status, and key risks or recommendations. Be direct and executive-level.`;

      let executiveSummary = '';
      try {
        const llmRes = await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt: summaryPrompt, model: 'claude_sonnet_4_6' });
        executiveSummary = typeof llmRes === 'string' ? llmRes : (llmRes.content || JSON.stringify(llmRes));
      } catch (e) {
        executiveSummary = `${name} is a ${company.company_size || 'standard'} enterprise in ${company.industry || 'general'} with ${orgCount} orgs, ${userCount} users, ${agentCount} AI agents, and ${projectCount} projects. Health: ${healthScore}/100. Revenue estimate: $${revenueEstimate}/mo.`;
      }

      return Response.json({
        company: {
          id: company.id, name, type: isClone ? 'clone' : 'org',
          industry: company.industry, company_size: company.company_size,
          revenue_model: company.revenue_model, status: company.status,
          goals: company.goals || [], executive_summary: company.executive_summary,
          inherited_components: company.inherited_components || [],
          customized_components: company.customized_components || [],
          cost_savings_estimate: company.cost_savings_estimate,
        },
        metrics: {
          org_count: orgCount, user_count: userCount, project_count: projectCount,
          active_projects: activeProjects, completed_projects: completedProjects,
          agent_count: agentCount, subscription_count: subCount, revenue_estimate: revenueEstimate,
          roadmap_items: roadmap.length, entity_count: entities.length, api_count: apis.length,
          dashboard_count: dashboards.length, health_score: healthScore, readiness: healthScore,
        },
        sections: {
          organization: { count: orgCount, items: organizations.slice(0, 5).map(o => ({ name: o.name || o.org_name, type: o.type, department: o.department })) },
          revenue: { monthly_estimate: revenueEstimate, subscription_count: subCount, items: subscriptions.slice(0, 5).map(s => ({ name: s.name || s.plan_name, price: s.price || s.price_monthly, status: s.status })) },
          engineering: { roadmap_items: roadmap.length, projects: projectCount, active_projects: activeProjects, entities: entities.length, apis: apis.length, items: roadmap.slice(0, 5).map(r => ({ title: r.title || r.name, phase: r.phase, status: r.status, priority: r.priority })) },
          security: { status: 'NCOS Platform Security Active', note: 'Security monitoring via NCOS AuditLog and Access Control' },
          legal: { status: 'NCOS Canon Compliance', note: 'Legal authority managed by NCOS Canon Entry system' },
          operations: { projects: projectCount, active: activeProjects, completed: completedProjects, items: projects.slice(0, 5).map(p => ({ name: p.name || p.title, status: p.status, priority: p.priority })) },
          ai_workforce: { count: agentCount, items: aiWorkforce.slice(0, 5).map(a => ({ name: a.name, role: a.role || a.title, department: a.department, status: a.status })) },
          infrastructure: { entities: entities.length, apis: apis.length, dashboards: dashboards.length, status: 'NCOS Platform Infrastructure' },
          subscriptions: { count: subCount, items: subscriptions.slice(0, 5).map(s => ({ name: s.name || s.plan_name, price: s.price || s.price_monthly, status: s.status })) },
          customers: { note: 'Customer data managed by NCOS CRM system', crm_available: true },
          projects: { count: projectCount, active: activeProjects, completed: completedProjects, items: projects.slice(0, 5).map(p => ({ name: p.name || p.title, status: p.status, priority: p.priority })) },
          mission_readiness: { score: healthScore, level: healthScore >= 80 ? 'high' : healthScore >= 50 ? 'medium' : 'low' },
        },
        ai_summary: executiveSummary,
        operation: 'get_company_dashboard'
      });
    }

    // ── GET GLOBAL ALERTS ──
    if (operation === 'get_global_alerts') {
      const [notifications, approvals] = await Promise.all([fetchAll('Notification', 50), fetchAll('ApprovalGate', 50)]);
      return Response.json({
        alerts: notifications.filter(n => !n.read).slice(0, 20),
        pending_approvals: approvals.filter(a => a.status === 'pending' || a.status === 'requested').slice(0, 20),
        operation: 'get_global_alerts'
      });
    }

    // ── GET CRITICAL RISKS ──
    if (operation === 'get_critical_risks') {
      const [diagnostics, improvements, legalIssues] = await Promise.all([
        fetchAll('DiagnosticIssue', 50), fetchAll('ImprovementItem', 50), fetchAll('LegalIssue', 50),
      ]);
      const criticalDiagnostics = diagnostics.filter(d => d.severity === 'critical' || d.severity === 'high');
      const highRiskImprovements = improvements.filter(i => i.risk_level === 'high' || i.risk_level === 'critical');
      const criticalLegal = legalIssues.filter(l => l.severity === 'critical' || l.severity === 'high');
      return Response.json({
        diagnostics: criticalDiagnostics.slice(0, 10),
        improvements: highRiskImprovements.slice(0, 10),
        legal: criticalLegal.slice(0, 10),
        total: criticalDiagnostics.length + highRiskImprovements.length + criticalLegal.length,
        operation: 'get_critical_risks'
      });
    }

    return Response.json({ error: 'Unknown operation: ' + operation }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});