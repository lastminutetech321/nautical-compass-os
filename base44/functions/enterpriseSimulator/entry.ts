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

    const sumField = (arr, field) => arr.reduce((s, item) => s + (Number(item[field]) || 0), 0);

    const gatherPlatformState = async () => {
      const [survival, subscriptions, plans, revenue, techDebt, agents, resources, crmLeads, crmOpps, payProviders, improvementItems, enterprises] = await Promise.all([
        fetchAll('SurvivalMetric', 5),
        fetchAll('Subscription', 100),
        fetchAll('SubscriptionPlan', 20),
        fetchAll('RevenueEvent', 100),
        fetchAll('TechnicalDebt', 100),
        fetchAll('AgentProfile', 100),
        fetchAll('Resource', 50),
        fetchAll('CRMLead', 100),
        fetchAll('CRMOpportunity', 100),
        fetchAll('PaymentProvider', 20),
        fetchAll('ImprovementItem', 50),
        fetchAll('EnterpriseBlueprint', 20),
      ]);

      const latestSurvival = survival[0] || {};
      const activeSubs = subscriptions.filter(s => s.status === 'active');
      const mrr = sumField(activeSubs, 'monthly_amount') || latestSurvival.mrr || latestSurvival.monthly_revenue || 0;
      const totalRevenue = sumField(revenue, 'amount');
      const openTechDebt = techDebt.filter(t => t.status !== 'resolved' && t.status !== 'closed').length;

      return {
        financials: {
          mrr,
          total_revenue_events: totalRevenue,
          runway_months: latestSurvival.runway_months || 0,
          cash_on_hand: latestSurvival.cash_on_hand || latestSurvival.cash || 0,
          burn_rate: latestSurvival.monthly_burn || latestSurvival.burn_rate || 0,
          break_even_mrr: latestSurvival.break_even_mrr || 0,
        },
        subscriptions: {
          active_count: activeSubs.length,
          total: subscriptions.length,
          plans_count: plans.length,
        },
        growth: {
          crm_leads: crmLeads.length,
          crm_opportunities: crmOpps.length,
          resources_count: resources.length,
        },
        infrastructure: {
          ai_employees: agents.length,
          active_agents: agents.filter(a => a.status === 'active').length,
          payment_providers: payProviders.length,
          active_providers: payProviders.filter(p => p.is_active).length,
        },
        enterprise: {
          blueprints: enterprises.length,
        },
        health: {
          open_tech_debt: openTechDebt,
          improvement_items: improvementItems.length,
          pending_improvements: improvementItems.filter(i => i.status === 'queued' || i.status === 'approved').length,
        },
        raw: {
          plans: plans.slice(0, 5).map(p => ({ name: p.name, price: p.price_monthly, type: p.plan_type })),
          providers: payProviders.map(p => ({ name: p.name, type: p.provider_type, active: p.is_active })),
        }
      };
    };

    // ── RUN SCENARIO ──
    if (operation === 'run_scenario') {
      const { question, scenario_type, parameters, name } = params;
      if (!question) return Response.json({ error: 'question required' }, { status: 400 });

      const platformState = await gatherPlatformState();

      const scenario = await base44.asServiceRole.entities.SimulationScenario.create({
        name: name || question.substring(0, 80),
        scenario_type: scenario_type || 'custom',
        question,
        parameters: parameters || {},
        status: 'running',
        created_by: user.full_name || user.email,
        tags: ['simulation'],
      });

      try {
        const prompt = `You are the NCOS Enterprise Simulator — an AI that predicts the future of an AI-first enterprise operating system. You analyze what-if scenarios and produce data-driven 12-month projections with proactive recommendations.

CURRENT PLATFORM STATE:
${JSON.stringify(platformState, null, 2)}

WHAT-IF SCENARIO:
Question: ${question}
${parameters && Object.keys(parameters).length > 0 ? `Parameters: ${JSON.stringify(parameters)}` : ''}

Analyze the impact across ALL 13 dimensions over a 12-month projection. For EACH dimension provide an object with:
- current_value: string describing current state (include numbers where possible)
- projected_value_12mo: string describing projected state under this scenario
- change_pct: number (percentage change, 0 if not numeric)
- risk_level: "low" | "medium" | "high" | "critical"
- notes: brief explanation of the impact

The 13 dimensions:
1. revenue — MRR, ARR, total revenue impact
2. growth — user acquisition rate, market penetration
3. infrastructure_costs — hosting, database, CDN, bandwidth costs
4. hiring — roles needed, headcount, personnel cost
5. customer_load — active users, concurrent users, support volume
6. server_load — requests/sec, CPU, memory, storage needs
7. ai_costs — LLM API costs, token usage, agent operation costs
8. subscription_growth — new subs, upgrades, downgrades
9. enterprise_growth — enterprise deals, clone engine usage, blueprint demand
10. cash_runway — months remaining, burn rate change
11. churn — churn rate, at-risk segments
12. risk — operational, financial, technical, legal risk exposure
13. technical_debt — accumulated debt, maintenance burden

Then provide:
- recommendations: 5-7 PROACTIVE actions to take BEFORE problems occur. Each item: { action: string, priority: "low"|"medium"|"high"|"critical", timeline: string (e.g. "immediate", "30 days", "90 days"), reason: string }
- risk_assessment: { overall_risk: "low"|""medium"|"high"|"critical", top_risks: [array of risk strings], failure_probability_pct: number 0-100, worst_case: string }
- summary: 2-3 sentence executive summary of the scenario impact

Be realistic and data-driven. Use the current platform state as the baseline. If a dimension has minimal impact, set risk_level to "low" and note "minimal impact".`;

        const llmRes = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt,
          response_json_schema: {
            type: "object",
            properties: {
              predictions: {
                type: "object",
                properties: {
                  revenue: { type: "object" },
                  growth: { type: "object" },
                  infrastructure_costs: { type: "object" },
                  hiring: { type: "object" },
                  customer_load: { type: "object" },
                  server_load: { type: "object" },
                  ai_costs: { type: "object" },
                  subscription_growth: { type: "object" },
                  enterprise_growth: { type: "object" },
                  cash_runway: { type: "object" },
                  churn: { type: "object" },
                  risk: { type: "object" },
                  technical_debt: { type: "object" },
                }
              },
              recommendations: { type: "array" },
              risk_assessment: { type: "object" },
              summary: { type: "string" }
            }
          },
          model: "claude_sonnet_4_6",
        });

        const results = typeof llmRes === 'string' ? JSON.parse(llmRes) : llmRes;

        const updated = await base44.asServiceRole.entities.SimulationScenario.update(scenario.id, {
          status: 'completed',
          results: results.predictions || {},
          recommendations: results.recommendations || [],
          risk_assessment: results.risk_assessment || {},
          summary: results.summary || "",
        });

        return Response.json({ scenario: updated, operation: 'run_scenario' });
      } catch (error) {
        await base44.asServiceRole.entities.SimulationScenario.update(scenario.id, {
          status: 'failed',
          results: { error: error.message },
        });
        return Response.json({ error: error.message, scenario_id: scenario.id }, { status: 500 });
      }
    }

    // ── GET SCENARIOS ──
    if (operation === 'get_scenarios') {
      const scenarios = await fetchAll('SimulationScenario', 50);
      return Response.json({ scenarios: scenarios.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)), operation: 'get_scenarios' });
    }

    // ── PLATFORM STATE ──
    if (operation === 'platform_state') {
      const state = await gatherPlatformState();
      return Response.json({ state, operation: 'platform_state' });
    }

    // ── DELETE SCENARIO ──
    if (operation === 'delete_scenario') {
      const { scenario_id } = params;
      await base44.asServiceRole.entities.SimulationScenario.delete(scenario_id);
      return Response.json({ success: true, operation: 'delete_scenario' });
    }

    return Response.json({ error: 'Unknown operation: ' + operation }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});