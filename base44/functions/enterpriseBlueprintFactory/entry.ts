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

    // ── GENERATE ENTERPRISE BLUEPRINT ──
    if (operation === 'generate_enterprise_blueprint') {
      const { name, description, industry, company_type, parent_blueprint_id, blueprint_type, is_template, tags } = params;
      if (!name) return Response.json({ error: 'name required' }, { status: 400 });

      let parentBlueprint = null;
      if (parent_blueprint_id) {
        try { parentBlueprint = await base44.asServiceRole.entities.EnterpriseBlueprint.get(parent_blueprint_id); }
        catch (e) { /* ignore */ }
      }

      // Load development memory for proven patterns
      const [adrs, lessons] = await Promise.all([
        fetchAll('ADR', 50),
        fetchAll('LessonLearned', 50),
      ]);
      const acceptedAdrs = adrs.filter(a => a.status === 'accepted');

      const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `You are the NCOS Enterprise Blueprint Factory. Design a COMPLETE enterprise architecture before any code is written.

ENTERPRISE REQUEST:
- Name: ${name}
- Industry: ${industry || "Technology / Legal Services"}
- Company Type: ${company_type || "LLC"}
- Description: ${description || "Build a comprehensive enterprise platform"}
${parentBlueprint ? `\nINHERITING FROM PARENT BLUEPRINT: ${parentBlueprint.name} v${parentBlueprint.version}\nParent blueprint structure will be inherited and customized for this new enterprise.\n` : ""}

REFERENCE KNOWLEDGE (proven engineering patterns):
- Accepted Architecture Decisions: ${acceptedAdrs.length} ADRs
- Key ADRs: ${acceptedAdrs.slice(0, 10).map(a => a.title).join(", ")}
- Lessons Learned: ${lessons.length} lessons
- Top Lessons: ${lessons.slice(0, 8).map(l => l.title).join(", ")}

Generate ALL 20 enterprise blueprint components. Each must be detailed, actionable, and production-ready. This blueprint will be used to build the entire enterprise before any code is written.

1. business_architecture: { value_proposition, market_positioning, operational_model, competitive_advantages[] }
2. organization_chart: { executive_structure, reporting_lines[], governance_hierarchy }
3. departments[]: { name, purpose, head_count_target, budget_allocation, key_functions[] }
4. roles[]: { title, department, level, responsibilities[], reports_to, permissions_level }
5. policies[]: { name, category, description, enforcement_method }
6. permissions[]: { role, resources[], actions[], constraints }
7. workflows[]: { name, trigger, steps[], outputs[], sla_hours }
8. business_rules[]: { rule_id, category, condition, action, priority, enforcement }
9. revenue_flows[]: { stream_name, source, pricing_model, unit_price, flow_description, frequency }
10. customer_journeys[]: { stage_name, touchpoints[], customer_actions[], business_actions[], goals[], pain_points[] }
11. employee_journeys[]: { stage, activities[], tools[], milestones[], development_goals[] }
12. ai_employee_journeys[]: { agent_name, role, stages[], tasks[], human_oversight, escalation }
13. infrastructure_map: { components[], connections[], scaling_strategy, third_party_services[], data_flow }
14. security_architecture: { layers[], controls[], compliance_frameworks[], threat_model }
15. database_blueprint: { data_architecture, storage_strategy, key_entities[], indexing_strategy, backup_policy }
16. api_blueprint[]: { path, method, auth_required, rate_limit, description }
17. entity_relationship_diagram: { core_entities[{name, fields[]}], relationships[{type, source, target, cardinality}] }
18. communication_map: { internal_channels[], external_channels[], notification_matrix[], escalation_paths[] }
19. deployment_plan: { environments[], deployment_strategy, ci_cd_pipeline, rollback_plan, monitoring }
20. growth_roadmap[]: { phase, duration_weeks, milestones[], success_metrics[], investment_required }

Also generate:
- executive_summary: 2-3 sentence overview
${parentBlueprint ? "- inheritance_notes: what was inherited vs customized\n- customization_summary: key changes from parent\n- cost_savings_from_inheritance: estimated savings vs starting fresh\n" : ""}`,
        response_json_schema: {
          type: "object",
          properties: {
            business_architecture: { type: "object", additionalProperties: true },
            organization_chart: { type: "object", additionalProperties: true },
            departments: { type: "array", items: { type: "object", additionalProperties: true } },
            roles: { type: "array", items: { type: "object", additionalProperties: true } },
            policies: { type: "array", items: { type: "object", additionalProperties: true } },
            permissions: { type: "array", items: { type: "object", additionalProperties: true } },
            workflows: { type: "array", items: { type: "object", additionalProperties: true } },
            business_rules: { type: "array", items: { type: "object", additionalProperties: true } },
            revenue_flows: { type: "array", items: { type: "object", additionalProperties: true } },
            customer_journeys: { type: "array", items: { type: "object", additionalProperties: true } },
            employee_journeys: { type: "array", items: { type: "object", additionalProperties: true } },
            ai_employee_journeys: { type: "array", items: { type: "object", additionalProperties: true } },
            infrastructure_map: { type: "object", additionalProperties: true },
            security_architecture: { type: "object", additionalProperties: true },
            database_blueprint: { type: "object", additionalProperties: true },
            api_blueprint: { type: "array", items: { type: "object", additionalProperties: true } },
            entity_relationship_diagram: { type: "object", additionalProperties: true },
            communication_map: { type: "object", additionalProperties: true },
            deployment_plan: { type: "object", additionalProperties: true },
            growth_roadmap: { type: "array", items: { type: "object", additionalProperties: true } },
            executive_summary: { type: "string" },
            inheritance_notes: { type: "string" },
            customization_summary: { type: "string" },
            cost_savings_from_inheritance: { type: "string" },
          }
        }
      });

      // Determine version
      const existingVersions = await base44.asServiceRole.entities.EnterpriseBlueprint.filter({ name });
      const maxVersion = existingVersions.reduce((max, b) => {
        const v = parseFloat(b.version || "1.0");
        return v > max ? v : max;
      }, 0);
      const newVersion = (maxVersion + 1).toFixed(1);

      const created = await base44.asServiceRole.entities.EnterpriseBlueprint.create({
        name,
        description: description || "",
        blueprint_type: blueprint_type || "enterprise",
        industry: industry || "Technology",
        company_type: company_type || "LLC",
        version: newVersion,
        parent_blueprint_id: parent_blueprint_id || "",
        parent_blueprint_name: parentBlueprint?.name || "",
        is_template: is_template || false,
        is_published: false,
        status: "active",
        ...result,
        generated_by: user.full_name || user.email,
        founder_approval_required: true,
        tags: tags || (parentBlueprint ? ["inherited"] : []),
      });

      return Response.json({ blueprint: created, operation: 'generate_enterprise_blueprint' });
    }

    // ── COMPARE TWO BLUEPRINTS ──
    if (operation === 'compare_blueprints') {
      const { blueprint_id_1, blueprint_id_2 } = params;
      if (!blueprint_id_1 || !blueprint_id_2) return Response.json({ error: 'two blueprint IDs required' }, { status: 400 });

      const [bp1, bp2] = await Promise.all([
        base44.asServiceRole.entities.EnterpriseBlueprint.get(blueprint_id_1),
        base44.asServiceRole.entities.EnterpriseBlueprint.get(blueprint_id_2),
      ]);

      const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `Compare two enterprise blueprints and identify differences, improvements, and tradeoffs across all 20 components.

BLUEPRINT 1: ${bp1.name} v${bp1.version} (${bp1.industry})
${JSON.stringify(bp1).slice(0, 8000)}

BLUEPRINT 2: ${bp2.name} v${bp2.version} (${bp2.industry})
${JSON.stringify(bp2).slice(0, 8000)}

Generate a detailed comparison. For each component, identify what_changed, impact, risk_level, and recommendation.`,
        response_json_schema: {
          type: "object",
          properties: {
            overall_assessment: { type: "string" },
            component_comparisons: { type: "array", items: { type: "object", additionalProperties: true } },
            key_differences: { type: "array", items: { type: "string" } },
            improvements: { type: "array", items: { type: "string" } },
            regressions: { type: "array", items: { type: "string" } },
            recommendation: { type: "string" },
          }
        }
      });

      return Response.json({
        comparison: result,
        blueprint_1: { id: bp1.id, name: bp1.name, version: bp1.version },
        blueprint_2: { id: bp2.id, name: bp2.name, version: bp2.version },
        operation: 'compare_blueprints'
      });
    }

    // ── INHERIT BLUEPRINT ──
    if (operation === 'inherit_blueprint') {
      const { parent_blueprint_id, name, description, overrides } = params;
      if (!parent_blueprint_id || !name) return Response.json({ error: 'parent_blueprint_id and name required' }, { status: 400 });

      const parent = await base44.asServiceRole.entities.EnterpriseBlueprint.get(parent_blueprint_id);

      const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `You are inheriting an enterprise blueprint and customizing it for a new enterprise. Maintain proven patterns while adapting to the new context.

PARENT BLUEPRINT: ${parent.name} v${parent.version}
Industry: ${parent.industry}
${JSON.stringify(parent).slice(0, 10000)}

NEW ENTERPRISE:
- Name: ${name}
- Description: ${description}
- Custom Overrides: ${JSON.stringify(overrides || {})}

Inherit the parent blueprint structure and customize ALL 20 components for the new enterprise. Output the same 20 components (business_architecture, organization_chart, departments, roles, policies, permissions, workflows, business_rules, revenue_flows, customer_journeys, employee_journeys, ai_employee_journeys, infrastructure_map, security_architecture, database_blueprint, api_blueprint, entity_relationship_diagram, communication_map, deployment_plan, growth_roadmap) with customizations applied.

Also provide: executive_summary, inheritance_notes (what was inherited), customization_summary (key changes), cost_savings_from_inheritance.`,
        response_json_schema: {
          type: "object",
          properties: {
            business_architecture: { type: "object", additionalProperties: true },
            organization_chart: { type: "object", additionalProperties: true },
            departments: { type: "array", items: { type: "object", additionalProperties: true } },
            roles: { type: "array", items: { type: "object", additionalProperties: true } },
            policies: { type: "array", items: { type: "object", additionalProperties: true } },
            permissions: { type: "array", items: { type: "object", additionalProperties: true } },
            workflows: { type: "array", items: { type: "object", additionalProperties: true } },
            business_rules: { type: "array", items: { type: "object", additionalProperties: true } },
            revenue_flows: { type: "array", items: { type: "object", additionalProperties: true } },
            customer_journeys: { type: "array", items: { type: "object", additionalProperties: true } },
            employee_journeys: { type: "array", items: { type: "object", additionalProperties: true } },
            ai_employee_journeys: { type: "array", items: { type: "object", additionalProperties: true } },
            infrastructure_map: { type: "object", additionalProperties: true },
            security_architecture: { type: "object", additionalProperties: true },
            database_blueprint: { type: "object", additionalProperties: true },
            api_blueprint: { type: "array", items: { type: "object", additionalProperties: true } },
            entity_relationship_diagram: { type: "object", additionalProperties: true },
            communication_map: { type: "object", additionalProperties: true },
            deployment_plan: { type: "object", additionalProperties: true },
            growth_roadmap: { type: "array", items: { type: "object", additionalProperties: true } },
            executive_summary: { type: "string" },
            inheritance_notes: { type: "string" },
            customization_summary: { type: "string" },
            cost_savings_from_inheritance: { type: "string" },
          }
        }
      });

      const existingVersions = await base44.asServiceRole.entities.EnterpriseBlueprint.filter({ name });
      const maxVersion = existingVersions.reduce((max, b) => {
        const v = parseFloat(b.version || "1.0");
        return v > max ? v : max;
      }, 0);

      const created = await base44.asServiceRole.entities.EnterpriseBlueprint.create({
        name,
        description: description || "",
        blueprint_type: parent.blueprint_type,
        industry: overrides?.industry || parent.industry,
        company_type: overrides?.company_type || parent.company_type,
        version: (maxVersion + 1).toFixed(1),
        parent_blueprint_id,
        parent_blueprint_name: parent.name,
        is_template: false,
        is_published: false,
        status: "active",
        ...result,
        generated_by: user.full_name || user.email,
        founder_approval_required: true,
        tags: ["inherited"],
      });

      return Response.json({ blueprint: created, parent_blueprint: { id: parent.id, name: parent.name, version: parent.version }, operation: 'inherit_blueprint' });
    }

    // ── OVERVIEW ──
    if (operation === 'overview') {
      const blueprints = await fetchAll('EnterpriseBlueprint', 200);
      const templates = blueprints.filter(b => b.is_template);
      const published = blueprints.filter(b => b.is_published);
      const inherited = blueprints.filter(b => b.parent_blueprint_id);

      const nameGroups = {};
      blueprints.forEach(b => {
        if (!nameGroups[b.name]) nameGroups[b.name] = [];
        nameGroups[b.name].push(b);
      });

      return Response.json({
        overview: {
          total_blueprints: blueprints.length,
          total_templates: templates.length,
          total_published: published.length,
          total_inherited: inherited.length,
          unique_enterprises: Object.keys(nameGroups).length,
          enterprises_with_multiple_versions: Object.values(nameGroups).filter(v => v.length > 1).length,
        },
        operation: 'overview'
      });
    }

    return Response.json({ error: 'Unknown operation: ' + operation }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});