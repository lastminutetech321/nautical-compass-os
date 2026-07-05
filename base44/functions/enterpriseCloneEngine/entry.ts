import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { operation, params } = body;

    const fetchAll = async (entityName, limit = 200) => {
      try { return await base44.asServiceRole.entities[entityName].list('-created_date', limit); }
      catch { return []; }
    };

    // ── CLONE ENTERPRISE ──
    if (operation === 'clone_enterprise') {
      const { source_blueprint_id, clone_name, industry, goals, company_size, revenue_model, required_modules, tags } = params;
      if (!source_blueprint_id || !clone_name) return Response.json({ error: 'source_blueprint_id and clone_name required' }, { status: 400 });

      const blueprint = await base44.asServiceRole.entities.EnterpriseBlueprint.get(source_blueprint_id);

      // Load existing platform assets for reference (proven patterns)
      const [agents, plans, projects, roadmapItems] = await Promise.all([
        fetchAll('AgentProfile', 30),
        fetchAll('SubscriptionPlan', 20),
        fetchAll('Project', 20),
        fetchAll('RoadmapItem', 20),
      ]);

      const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `You are the NCOS Enterprise Clone Engine. You are instantiating a FULL enterprise from a proven blueprint. Inherit reusable infrastructure from the blueprint but DO NOT copy client-specific data — generate fresh, concrete instances for this new company.

SOURCE BLUEPRINT: ${blueprint.name} v${blueprint.version} (${blueprint.industry})
Blueprint Executive Summary: ${blueprint.executive_summary || "N/A"}

BLUEPRINT COMPONENTS (inherit structure, customize content):
- Departments: ${JSON.stringify(blueprint.departments || []).slice(0, 2000)}
- Roles: ${JSON.stringify(blueprint.roles || []).slice(0, 2000)}
- Policies: ${JSON.stringify(blueprint.policies || []).slice(0, 1500)}
- Permissions: ${JSON.stringify(blueprint.permissions || []).slice(0, 1500)}
- Workflows: ${JSON.stringify(blueprint.workflows || []).slice(0, 1500)}
- Business Rules: ${JSON.stringify(blueprint.business_rules || []).slice(0, 1500)}
- Revenue Flows: ${JSON.stringify(blueprint.revenue_flows || []).slice(0, 1500)}
- Customer Journeys: ${JSON.stringify(blueprint.customer_journeys || []).slice(0, 1500)}
- AI Employee Journeys: ${JSON.stringify(blueprint.ai_employee_journeys || []).slice(0, 1500)}
- Infrastructure Map: ${JSON.stringify(blueprint.infrastructure_map || {}).slice(0, 1500)}
- Security Architecture: ${JSON.stringify(blueprint.security_architecture || {}).slice(0, 1000)}
- Database Blueprint: ${JSON.stringify(blueprint.database_blueprint || {}).slice(0, 1000)}
- API Blueprint: ${JSON.stringify(blueprint.api_blueprint || []).slice(0, 1500)}
- Deployment Plan: ${JSON.stringify(blueprint.deployment_plan || {}).slice(0, 1000)}
- Growth Roadmap: ${JSON.stringify(blueprint.growth_roadmap || []).slice(0, 1500)}

CLONE CONFIGURATION:
- Clone Name: ${clone_name}
- Industry: ${industry || blueprint.industry}
- Goals: ${JSON.stringify(goals || [])}
- Company Size: ${company_size}
- Revenue Model: ${revenue_model}
- Required Modules: ${JSON.stringify(required_modules || [])}

REFERENCE PLATFORM ASSETS (proven patterns to reuse):
- Existing AI Agent Types: ${agents.slice(0, 15).map(a => a.name + " (" + a.agent_type + ")").join(", ")}
- Existing Subscription Plans: ${plans.slice(0, 10).map(p => p.name + " ($" + p.price_monthly + "/mo)").join(", ")}
- Existing Project Patterns: ${projects.slice(0, 10).map(p => p.name).join(", ")}

Generate ALL 15 enterprise instantiation outputs. Each must be concrete, specific to this clone, and actionable:

1. organizations[]: { name, type, parent_org, budget, head_count }
2. users[]: { role, department, permissions_level, is_admin, responsibilities }
3. permissions[]: { role, resources[], actions[], constraints }
4. ai_workforce[]: { name, agent_type, department, purpose, capabilities[], human_oversight }
5. projects[]: { name, description, priority, assigned_team, milestones[], estimated_weeks }
6. roadmap[]: { phase, duration_weeks, deliverables[], success_metrics[], dependencies[] }
7. entities[]: { name, purpose, key_fields[], estimated_records, module }
8. apis[]: { path, method, auth_required, description, module, rate_limit }
9. subscriptions[]: { name, plan_type, price_monthly, features[], target_segment }
10. dashboards[]: { name, module, widgets[], audience, refresh_interval }
11. mission_control_config: { tabs[], kpis[], alerts[], default_view }
12. executive_command_config: { metrics[], reports[], approval_gates[], briefing_schedule }
13. knowledge_graph_config: { node_types[], relationships[], seed_entities[], traversal_depth }
14. engineering_plan: { team_structure, tech_stack[], sprint_plan[], milestones[], risk_mitigation }
15. development_plan: { phases[], priorities[], resource_needs[], timeline_weeks, launch_criteria[] }

Also generate:
- executive_summary: 2-3 sentence overview of the cloned enterprise
- inherited_components[]: list of components inherited from the blueprint (reusable infrastructure)
- customized_components[]: list of components customized for this specific clone
- cost_savings_estimate: estimated savings from cloning vs building from scratch`,
        response_json_schema: {
          type: "object",
          properties: {
            organizations: { type: "array", items: { type: "object", additionalProperties: true } },
            users: { type: "array", items: { type: "object", additionalProperties: true } },
            permissions: { type: "array", items: { type: "object", additionalProperties: true } },
            ai_workforce: { type: "array", items: { type: "object", additionalProperties: true } },
            projects: { type: "array", items: { type: "object", additionalProperties: true } },
            roadmap: { type: "array", items: { type: "object", additionalProperties: true } },
            entities: { type: "array", items: { type: "object", additionalProperties: true } },
            apis: { type: "array", items: { type: "object", additionalProperties: true } },
            subscriptions: { type: "array", items: { type: "object", additionalProperties: true } },
            dashboards: { type: "array", items: { type: "object", additionalProperties: true } },
            mission_control_config: { type: "object", additionalProperties: true },
            executive_command_config: { type: "object", additionalProperties: true },
            knowledge_graph_config: { type: "object", additionalProperties: true },
            engineering_plan: { type: "object", additionalProperties: true },
            development_plan: { type: "object", additionalProperties: true },
            executive_summary: { type: "string" },
            inherited_components: { type: "array", items: { type: "string" } },
            customized_components: { type: "array", items: { type: "string" } },
            cost_savings_estimate: { type: "string" },
          }
        }
      });

      const created = await base44.asServiceRole.entities.EnterpriseClone.create({
        clone_name,
        source_blueprint_id,
        source_blueprint_name: blueprint.name,
        source_blueprint_version: blueprint.version,
        industry: industry || blueprint.industry,
        goals: goals || [],
        company_size: company_size || "startup",
        revenue_model: revenue_model || "",
        required_modules: required_modules || [],
        ...result,
        status: "provisioned",
        generated_by: user.full_name || user.email,
        founder_approval_required: true,
        tags: tags || ["cloned"],
      });

      return Response.json({ clone: created, source_blueprint: { id: blueprint.id, name: blueprint.name, version: blueprint.version }, operation: 'clone_enterprise' });
    }

    // ── COMPARE CLONE TO PARENT ──
    if (operation === 'compare_clone_to_parent') {
      const { clone_id } = params;
      if (!clone_id) return Response.json({ error: 'clone_id required' }, { status: 400 });

      const clone = await base44.asServiceRole.entities.EnterpriseClone.get(clone_id);
      const blueprint = await base44.asServiceRole.entities.EnterpriseBlueprint.get(clone.source_blueprint_id);

      const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `Compare a cloned enterprise to its parent blueprint. Identify what was inherited, what was customized, what's new, and assess readiness.

PARENT BLUEPRINT: ${blueprint.name} v${blueprint.version}
- Departments: ${(blueprint.departments || []).length}
- Roles: ${(blueprint.roles || []).length}
- Policies: ${(blueprint.policies || []).length}
- Workflows: ${(blueprint.workflows || []).length}
- Revenue Flows: ${(blueprint.revenue_flows || []).length}
- API Endpoints: ${(blueprint.api_blueprint || []).length}
- Growth Phases: ${(blueprint.growth_roadmap || []).length}

CLONED ENTERPRISE: ${clone.clone_name}
- Industry: ${clone.industry}
- Company Size: ${clone.company_size}
- Revenue Model: ${clone.revenue_model}
- Goals: ${JSON.stringify(clone.goals)}
- Organizations: ${(clone.organizations || []).length}
- Users: ${(clone.users || []).length}
- AI Workforce: ${(clone.ai_workforce || []).length}
- Projects: ${(clone.projects || []).length}
- Roadmap Phases: ${(clone.roadmap || []).length}
- Entities: ${(clone.entities || []).length}
- APIs: ${(clone.apis || []).length}
- Subscriptions: ${(clone.subscriptions || []).length}
- Dashboards: ${(clone.dashboards || []).length}

Clone Executive Summary: ${clone.executive_summary}
Inherited Components: ${JSON.stringify(clone.inherited_components)}
Customized Components: ${JSON.stringify(clone.customized_components)}

Generate a comparison dashboard covering: what_was_inherited, what_was_customized, what_is_new, readiness_assessment, gaps, and recommendations.`,
        response_json_schema: {
          type: "object",
          properties: {
            overall_assessment: { type: "string" },
            inheritance_summary: { type: "string" },
            what_was_inherited: { type: "array", items: { type: "string" } },
            what_was_customized: { type: "array", items: { type: "string" } },
            what_is_new: { type: "array", items: { type: "string" } },
            component_comparison: { type: "array", items: { type: "object", additionalProperties: true } },
            readiness_score: { type: "number" },
            readiness_assessment: { type: "string" },
            gaps: { type: "array", items: { type: "string" } },
            recommendations: { type: "array", items: { type: "string" } },
            estimated_time_to_launch: { type: "string" },
          }
        }
      });

      return Response.json({
        comparison: result,
        clone: { id: clone.id, name: clone.clone_name, industry: clone.industry, company_size: clone.company_size },
        parent: { id: blueprint.id, name: blueprint.name, version: blueprint.version },
        operation: 'compare_clone_to_parent'
      });
    }

    // ── OVERVIEW ──
    if (operation === 'overview') {
      const clones = await fetchAll('EnterpriseClone', 200);
      const blueprints = await fetchAll('EnterpriseBlueprint', 200);

      const statusCounts = clones.reduce((acc, c) => {
        acc[c.status] = (acc[c.status] || 0) + 1;
        return acc;
      }, {});

      return Response.json({
        overview: {
          total_clones: clones.length,
          provisioned: statusCounts.provisioned || 0,
          active: statusCounts.active || 0,
          archived: statusCounts.archived || 0,
          total_blueprints_available: blueprints.length,
          templates_available: blueprints.filter(b => b.is_template).length,
        },
        operation: 'overview'
      });
    }

    return Response.json({ error: 'Unknown operation: ' + operation }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});