import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { operation, params = {} } = body;
    const now = new Date().toISOString();

    // ─── SNAPSHOT: capture current financial state ───
    if (operation === 'snapshot') {
      const subscriptions = await base44.asServiceRole.entities.Subscription.list('-created_date', 200).catch(() => []);
      const plans = await base44.asServiceRole.entities.SubscriptionPlan.list('-created_date', 50).catch(() => []);
      const planMap = new Map(plans.map(p => [p.id, p]));
      const transactions = await base44.asServiceRole.entities.FinancialTransaction.list('-created_date', 500).catch(() => []);
      const revenueEvents = await base44.asServiceRole.entities.RevenueEvent.list('-created_date', 200).catch(() => []);

      // MRR from active subscriptions
      const activeSubs = subscriptions.filter(s => s.status === 'active' || s.status === 'trialing');
      let mrr = activeSubs.reduce((sum, s) => {
        const plan = s.plan_id ? planMap.get(s.plan_id) : null;
        return sum + (plan?.price_monthly || s.amount || 0);
      }, 0);

      // Fallback: MRR from recurring revenue transactions if no subscription entities
      if (mrr === 0) {
        const revenueTxns = transactions.filter(t => t.transaction_type === 'revenue' && t.status === 'completed' && (t.recurring || t.recurring_frequency !== 'one_time'));
        const monthlyRevenueMap = { daily: 30, weekly: 4.3, monthly: 1, quarterly: 1/3, annual: 1/12 };
        mrr = revenueTxns.reduce((sum, t) => {
          const mult = monthlyRevenueMap[t.recurring_frequency] || 0;
          return sum + (t.amount || 0) * mult;
        }, 0);
      }
      const arr = mrr * 12;

      // Monthly expenses from transactions (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const recentExpenses = transactions.filter(t =>
        t.transaction_type === 'expense' &&
        t.status === 'completed' &&
        new Date(t.transaction_date) >= thirtyDaysAgo
      );
      const monthlyExpenses = recentExpenses.reduce((sum, t) => sum + (t.amount || 0), 0);

      const apiCosts = recentExpenses.filter(t => t.category === 'api_cost').reduce((s, t) => s + (t.amount || 0), 0);
      const hostingCosts = recentExpenses.filter(t => t.category === 'hosting').reduce((s, t) => s + (t.amount || 0), 0);
      const aiUsageCosts = recentExpenses.filter(t => t.category === 'ai_usage').reduce((s, t) => s + (t.amount || 0), 0);
      const payrollCosts = recentExpenses.filter(t => t.category === 'payroll').reduce((s, t) => s + (t.amount || 0), 0);
      const marketingCosts = recentExpenses.filter(t => t.category === 'marketing').reduce((s, t) => s + (t.amount || 0), 0);
      const toolsCosts = recentExpenses.filter(t => t.category === 'tools').reduce((s, t) => s + (t.amount || 0), 0);
      const otherCosts = recentExpenses.filter(t => t.category === 'other_expense' || t.category === 'infrastructure').reduce((s, t) => s + (t.amount || 0), 0);

      const cogs = apiCosts + hostingCosts + aiUsageCosts;
      const grossMargin = mrr > 0 ? Math.round(((mrr - cogs) / mrr) * 100) : 0;
      const operatingMargin = mrr > 0 ? Math.round(((mrr - monthlyExpenses) / mrr) * 100) : 0;
      const profit = mrr - monthlyExpenses;

      const cashBalance = params.cash_balance !== undefined ? params.cash_balance : 50000;
      const monthlyBurn = monthlyExpenses > mrr ? monthlyExpenses - mrr : 0;
      const runwayDays = monthlyBurn > 0 ? Math.round((cashBalance / monthlyBurn) * 30) : 9999;
      const breakEvenMrr = monthlyExpenses;

      const newSubs = activeSubs.filter(s => new Date(s.created_date) >= thirtyDaysAgo).length;
      const churnedSubs = subscriptions.filter(s => s.status === 'cancelled' || s.status === 'churned').length;

      const snapshot = await base44.asServiceRole.entities.FinancialSnapshot.create({
        snapshot_date: now,
        period: 'daily',
        cash_balance: cashBalance,
        mrr: Math.round(mrr),
        arr: Math.round(arr),
        total_revenue: Math.round(mrr),
        total_expenses: Math.round(monthlyExpenses),
        api_costs: Math.round(apiCosts),
        hosting_costs: Math.round(hostingCosts),
        ai_usage_costs: Math.round(aiUsageCosts),
        payroll_costs: Math.round(payrollCosts),
        marketing_costs: Math.round(marketingCosts),
        tools_costs: Math.round(toolsCosts),
        other_costs: Math.round(otherCosts),
        profit: Math.round(profit),
        gross_margin_pct: grossMargin,
        operating_margin_pct: operatingMargin,
        monthly_burn: Math.round(monthlyBurn),
        runway_days: runwayDays,
        break_even_mrr: Math.round(breakEvenMrr),
        active_subscriptions: activeSubs.length,
        new_subscriptions: newSubs,
        churned_subscriptions: churnedSubs,
        auto_generated: true
      });

      return Response.json({ operation: 'snapshot', snapshot });
    }

    // ─── DASHBOARD ───
    if (operation === 'dashboard') {
      const snapshots = await base44.asServiceRole.entities.FinancialSnapshot.list('-snapshot_date', 30).catch(() => []);
      const transactions = await base44.asServiceRole.entities.FinancialTransaction.list('-created_date', 50).catch(() => []);
      const subscriptions = await base44.asServiceRole.entities.Subscription.list('-created_date', 200).catch(() => []);
      const latest = snapshots[0] || {};

      const activeSubs = subscriptions.filter(s => s.status === 'active' || s.status === 'trialing');
      const expenseByCategory = {};
      for (const t of transactions.filter(t => t.transaction_type === 'expense' && t.status === 'completed')) {
        expenseByCategory[t.category] = (expenseByCategory[t.category] || 0) + (t.amount || 0);
      }

      const financialHealth = calculateFinancialHealth(latest);
      const operationalLink = {
        active_customers: activeSubs.length,
        total_subscriptions: subscriptions.length,
        churn_rate: subscriptions.length > 0 ? Math.round((subscriptions.filter(s => s.status === 'cancelled' || s.status === 'churned').length / subscriptions.length) * 100) : 0
      };

      return Response.json({
        operation: 'dashboard',
        latest_snapshot: latest,
        snapshots: snapshots.slice(0, 12),
        recent_transactions: transactions.slice(0, 15),
        expense_by_category: expenseByCategory,
        financial_health: financialHealth,
        operational_link: operationalLink
      });
    }

    // ─── GENERATE CFO REPORT ───
    if (operation === 'generate_cfo_report') {
      const snapshots = await base44.asServiceRole.entities.FinancialSnapshot.list('-snapshot_date', 7).catch(() => []);
      const latest = snapshots[0] || {};
      const previous = snapshots[1] || {};
      const transactions = await base44.asServiceRole.entities.FinancialTransaction.list('-created_date', 50).catch(() => []);
      const subscriptions = await base44.asServiceRole.entities.Subscription.list('-created_date', 100).catch(() => []);

      const llmRes = await base44.integrations.Core.InvokeLLM({
        prompt: `You are the NC Financial Intelligence CFO AI. Generate a comprehensive daily CFO report.

CURRENT FINANCIAL SNAPSHOT:
- MRR: $${latest.mrr || 0}
- ARR: $${latest.arr || 0}
- Cash Balance: $${latest.cash_balance || 0}
- Monthly Expenses: $${latest.total_expenses || 0}
- Monthly Burn: $${latest.monthly_burn || 0}
- Runway: ${latest.runway_days || 0} days
- Profit: $${latest.profit || 0}
- Gross Margin: ${latest.gross_margin_pct || 0}%
- Operating Margin: ${latest.operating_margin_pct || 0}%
- Break-even MRR: $${latest.break_even_mrr || 0}
- Active Subscriptions: ${latest.active_subscriptions || 0}

EXPENSE BREAKDOWN:
- API Costs: $${latest.api_costs || 0}
- Hosting: $${latest.hosting_costs || 0}
- AI Usage: $${latest.ai_usage_costs || 0}
- Payroll: $${latest.payroll_costs || 0}
- Marketing: $${latest.marketing_costs || 0}
- Tools: $${latest.tools_costs || 0}
- Other: $${latest.other_costs || 0}

PREVIOUS SNAPSHOT (trend comparison):
- MRR: $${previous.mrr || 0}
- Expenses: $${previous.total_expenses || 0}
- Runway: ${previous.runway_days || 0} days

RECENT TRANSACTIONS: ${transactions.slice(0, 10).map(t => `${t.category}: $${t.amount} (${t.description})`).join('; ')}

Generate a daily CFO report with:
1. Executive summary (2-3 sentences)
2. Financial health score (0-100) and status
3. Key metrics summary
4. Revenue analysis
5. Expense analysis
6. Key risks (top 3)
7. Opportunities (top 3)
8. Recommended actions (top 5)
9. Founder alerts (if any critical issues)

Return as JSON.`,
        response_json_schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            report_date: { type: "string" },
            executive_summary: { type: "string" },
            financial_health: {
              type: "object",
              additionalProperties: false,
              properties: {
                score: { type: "number" },
                status: { type: "string" },
                summary: { type: "string" }
              },
              required: ["score", "status", "summary"]
            },
            key_metrics: {
              type: "object",
              additionalProperties: false,
              properties: {
                mrr: { type: "number" },
                arr: { type: "number" },
                runway_days: { type: "number" },
                burn_rate: { type: "number" },
                gross_margin_pct: { type: "number" },
                operating_margin_pct: { type: "number" }
              },
              required: ["mrr", "arr", "runway_days", "burn_rate", "gross_margin_pct", "operating_margin_pct"]
            },
            revenue_analysis: { type: "string" },
            expense_analysis: { type: "string" },
            key_risks: { type: "array", items: { type: "string" } },
            opportunities: { type: "array", items: { type: "string" } },
            recommended_actions: { type: "array", items: { type: "string" } },
            founder_alerts: { type: "array", items: { type: "string" } }
          },
          required: ["report_date", "executive_summary", "financial_health", "key_metrics", "revenue_analysis", "expense_analysis", "key_risks", "opportunities", "recommended_actions", "founder_alerts"]
        }
      });

      return Response.json({ operation: 'generate_cfo_report', report: llmRes });
    }

    // ─── GENERATE WEEKLY BRIEFING ───
    if (operation === 'generate_briefing') {
      const snapshots = await base44.asServiceRole.entities.FinancialSnapshot.list('-snapshot_date', 7).catch(() => []);
      const latest = snapshots[0] || {};
      const weekAgo = snapshots[6] || {};

      const mrrChange = (latest.mrr || 0) - (weekAgo.mrr || 0);
      const expenseChange = (latest.total_expenses || 0) - (weekAgo.total_expenses || 0);
      const runwayChange = (latest.runway_days || 0) - (weekAgo.runway_days || 0);

      const llmRes = await base44.integrations.Core.InvokeLLM({
        prompt: `You are the NC Financial Intelligence AI. Generate a weekly financial briefing for the founder.

WEEK OVER WEEK CHANGES:
- MRR: $${weekAgo.mrr || 0} → $${latest.mrr || 0} (Δ $${mrrChange})
- Expenses: $${weekAgo.total_expenses || 0} → $${latest.total_expenses || 0} (Δ $${expenseChange})
- Runway: ${weekAgo.runway_days || 0} → ${latest.runway_days || 0} days (Δ ${runwayChange})
- Profit: $${latest.profit || 0}
- Active Subscriptions: ${latest.active_subscriptions || 0}
- New This Week: ${latest.new_subscriptions || 0}

Generate a concise weekly briefing covering:
1. Week summary (1-2 sentences)
2. Key wins
3. Key concerns
4. Financial trajectory assessment
5. What to focus on next week (top 3)

Return as JSON.`,
        response_json_schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            week_summary: { type: "string" },
            key_wins: { type: "array", "items": { "type": "string" } },
            key_concerns: { type: "array", "items": { "type": "string" } },
            trajectory: { type: "string" },
            focus_next_week: { type: "array", "items": { "type": "string" } }
          },
          required: ["week_summary", "key_wins", "key_concerns", "trajectory", "focus_next_week"]
        }
      });

      return Response.json({ operation: 'generate_briefing', briefing: llmRes });
    }

    // ─── GENERATE QUARTERLY FORECAST ───
    if (operation === 'generate_forecast') {
      const snapshots = await base44.asServiceRole.entities.FinancialSnapshot.list('-snapshot_date', 90).catch(() => []);
      const latest = snapshots[0] || {};
      const subscriptions = await base44.asServiceRole.entities.Subscription.list('-created_date', 200).catch(() => []);

      const mrrHistory = snapshots.slice(0, 12).map(s => s.mrr || 0).reverse();
      const avgGrowthRate = mrrHistory.length > 1
        ? (mrrHistory[mrrHistory.length - 1] - mrrHistory[0]) / mrrHistory[0]
        : 0.1;

      const llmRes = await base44.integrations.Core.InvokeLLM({
        prompt: `You are the NC Financial Intelligence Forecasting AI. Generate a quarterly forecast.

CURRENT STATE:
- MRR: $${latest.mrr || 0}
- ARR: $${latest.arr || 0}
- Monthly Expenses: $${latest.total_expenses || 0}
- Cash Balance: $${latest.cash_balance || 0}
- Monthly Burn: $${latest.monthly_burn || 0}
- Runway: ${latest.runway_days || 0} days
- Active Subscriptions: ${latest.active_subscriptions || 0}
- Gross Margin: ${latest.gross_margin_pct || 0}%
- Operating Margin: ${latest.operating_margin_pct || 0}%
- MRR Growth Rate (recent): ${Math.round(avgGrowthRate * 100)}%
- Break-even MRR: $${latest.break_even_mrr || 0}

EXPENSE BREAKDOWN:
- API: $${latest.api_costs || 0}, Hosting: $${latest.hosting_costs || 0}, AI: $${latest.ai_usage_costs || 0}
- Payroll: $${latest.payroll_costs || 0}, Marketing: $${latest.marketing_costs || 0}

Generate a 90-day quarterly forecast with 3 scenarios (base, optimistic, pessimistic):
For each: projected MRR, ARR, expenses, profit, runway days, break-even month.
Also include assumptions and recommended actions.

Return as JSON.`,
        response_json_schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            forecast_summary: { type: "string" },
            scenarios: {
              type: "object",
              additionalProperties: false,
              properties: {
                base: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    projected_mrr: { type: "number" },
                    projected_arr: { type: "number" },
                    projected_expenses: { type: "number" },
                    projected_profit: { type: "number" },
                    projected_runway_days: { type: "number" },
                    break_even_month: { type: "string" }
                  },
                  required: ["projected_mrr", "projected_arr", "projected_expenses", "projected_profit", "projected_runway_days", "break_even_month"]
                },
                optimistic: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    projected_mrr: { type: "number" },
                    projected_arr: { type: "number" },
                    projected_expenses: { type: "number" },
                    projected_profit: { type: "number" },
                    projected_runway_days: { type: "number" },
                    break_even_month: { type: "string" }
                  },
                  required: ["projected_mrr", "projected_arr", "projected_expenses", "projected_profit", "projected_runway_days", "break_even_month"]
                },
                pessimistic: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    projected_mrr: { type: "number" },
                    projected_arr: { type: "number" },
                    projected_expenses: { type: "number" },
                    projected_profit: { type: "number" },
                    projected_runway_days: { type: "number" },
                    break_even_month: { type: "string" }
                  },
                  required: ["projected_mrr", "projected_arr", "projected_expenses", "projected_profit", "projected_runway_days", "break_even_month"]
                }
              },
              required: ["base", "optimistic", "pessimistic"]
            },
            assumptions: { type: "array", items: { type: "string" } },
            recommended_actions: { type: "array", items: { type: "string" } }
          },
          required: ["forecast_summary", "scenarios", "assumptions", "recommended_actions"]
        }
      });

      await base44.asServiceRole.entities.FinancialForecast.create({
        forecast_type: 'quarterly',
        forecast_date: now,
        forecast_period: `Q${Math.ceil((new Date().getMonth() + 1) / 3) + 1} ${new Date().getFullYear()}`,
        scenario: 'all',
        scenarios: llmRes.scenarios,
        assumptions: llmRes.assumptions,
        recommended_actions: llmRes.recommended_actions,
        summary: llmRes.forecast_summary,
        generated_by: 'NC Financial Intelligence'
      }).catch(() => {});

      return Response.json({ operation: 'generate_forecast', forecast: llmRes });
    }

    // ─── RECOMMEND (pricing, cost reductions, investments) ───
    if (operation === 'recommend') {
      const latest = (await base44.asServiceRole.entities.FinancialSnapshot.list('-snapshot_date', 1).catch(() => {}))[0] || {};
      const plans = await base44.asServiceRole.entities.SubscriptionPlan.list('-created_date', 20).catch(() => []);
      const transactions = await base44.asServiceRole.entities.FinancialTransaction.list('-created_date', 100).catch(() => []);

      const llmRes = await base44.integrations.Core.InvokeLLM({
        prompt: `You are the NC Financial Intelligence Advisory AI. Generate financial recommendations.

CURRENT STATE:
- MRR: $${latest.mrr || 0}, ARR: $${latest.arr || 0}
- Monthly Expenses: $${latest.total_expenses || 0}
- Profit: $${latest.profit || 0}
- Gross Margin: ${latest.gross_margin_pct || 0}%, Operating Margin: ${latest.operating_margin_pct || 0}%
- Runway: ${latest.runway_days || 0} days
- Cash: $${latest.cash_balance || 0}

PRICING PLANS:
${plans.map(p => `${p.name}: $${p.price_monthly}/mo (${p.plan_type})`).join('\n')}

EXPENSE CATEGORIES (monthly):
- API: $${latest.api_costs || 0}
- Hosting: $${latest.hosting_costs || 0}
- AI Usage: $${latest.ai_usage_costs || 0}
- Payroll: $${latest.payroll_costs || 0}
- Marketing: $${latest.marketing_costs || 0}
- Tools: $${latest.tools_costs || 0}

Generate:
1. PRICING RECOMMENDATIONS: adjustments to current plans to optimize revenue
2. COST REDUCTIONS: specific areas to cut costs with estimated savings
3. INVESTMENTS: areas to invest in for growth with expected ROI

For each recommendation include: action, rationale, estimated financial impact, priority.
Also flag any founder alerts.

Return as JSON.`,
        response_json_schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            pricing_recommendations: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  action: { type: "string" },
                  plan: { type: "string" },
                  current_price: { type: "number" },
                  recommended_price: { type: "number" },
                  rationale: { type: "string" },
                  expected_impact: { type: "string" },
                  priority: { type: "string" }
                },
                required: ["action", "plan", "current_price", "recommended_price", "rationale", "expected_impact", "priority"]
              }
            },
            cost_reductions: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  category: { type: "string" },
                  action: { type: "string" },
                  estimated_savings: { type: "number" },
                  rationale: { type: "string" },
                  effort: { type: "string" },
                  priority: { type: "string" }
                },
                required: ["category", "action", "estimated_savings", "rationale", "effort", "priority"]
              }
            },
            investments: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  area: { type: "string" },
                  action: { type: "string" },
                  estimated_cost: { type: "number" },
                  expected_roi: { type: "string" },
                  rationale: { type: "string" },
                  priority: { type: "string" }
                },
                required: ["area", "action", "estimated_cost", "expected_roi", "rationale", "priority"]
              }
            },
            summary: { type: "string" },
            founder_alerts: { type: "array", items: { type: "string" } }
          },
          required: ["pricing_recommendations", "cost_reductions", "investments", "summary", "founder_alerts"]
        }
      });

      return Response.json({ operation: 'recommend', recommendations: llmRes });
    }

    // ─── LOG TRANSACTION ───
    if (operation === 'log_transaction') {
      const txn = await base44.asServiceRole.entities.FinancialTransaction.create({
        transaction_date: params.transaction_date || now,
        transaction_type: params.transaction_type || 'expense',
        category: params.category || 'other_expense',
        amount: params.amount || 0,
        description: params.description || '',
        vendor: params.vendor || '',
        recurring: params.recurring || false,
        recurring_frequency: params.recurring_frequency || 'one_time',
        status: 'completed',
        currency: 'USD',
        tags: params.tags || [],
        notes: params.notes || ''
      });
      return Response.json({ operation: 'log_transaction', transaction: txn });
    }

    // ─── LIST TRANSACTIONS ───
    if (operation === 'list_transactions') {
      const filter = {};
      if (params.transaction_type) filter.transaction_type = params.transaction_type;
      if (params.category) filter.category = params.category;
      const txns = await base44.asServiceRole.entities.FinancialTransaction.filter(filter, '-transaction_date', 100).catch(() => []);
      return Response.json({ operation: 'list_transactions', transactions: txns, count: txns.length });
    }

    // ─── LIST SNAPSHOTS ───
    if (operation === 'list_snapshots') {
      const snaps = await base44.asServiceRole.entities.FinancialSnapshot.list('-snapshot_date', 30).catch(() => []);
      return Response.json({ operation: 'list_snapshots', snapshots: snaps });
    }

    return Response.json({ error: 'Unknown operation: ' + operation }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function calculateFinancialHealth(snapshot) {
  let score = 50;
  if (snapshot.mrr > 0 && snapshot.total_expenses > 0) {
    if (snapshot.profit > 0) score += 20;
    if (snapshot.gross_margin_pct > 70) score += 10;
    if (snapshot.operating_margin_pct > 0) score += 10;
    if (snapshot.runway_days > 180) score += 10;
    else if (snapshot.runway_days < 60) score -= 20;
    if (snapshot.mrr > snapshot.break_even_mrr) score += 10;
  }
  score = Math.max(0, Math.min(100, score));
  let status = 'critical';
  if (score >= 80) status = 'excellent';
  else if (score >= 65) status = 'good';
  else if (score >= 45) status = 'fair';
  else if (score >= 25) status = 'at_risk';
  return { score, status };
}