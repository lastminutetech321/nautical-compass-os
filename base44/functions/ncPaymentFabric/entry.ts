import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const op = body.operation;
    const params = body.params || {};
    const args = body.args || {};
    const nowIso = new Date().toISOString();
    const founderOnly = async (action) => {
      if (user.role !== 'admin') return Response.json({ error: 'Founder approval required' }, { status: 403 });
      return action();
    };

    // ---------- FOUNDER CONFIG ----------
    const DEFAULT_SCORING_WEIGHTS = {
      contribution: 1.0, trust: 1.2, reputation: 0.8, experience: 0.6,
      leadership: 0.9, customer_success: 1.1, retention: 1.0, innovation: 0.8,
      learning: 0.5, quality: 1.0, professionalism: 0.7, ethics: 1.3, reliability: 0.9
    };
    const DEFAULT_DOCTRINE = {
      base_pct: 20, max_cap_pct: 30, hold_period_days: 7,
      approval_threshold: 500, residual_default_pct: 0, referral_default_pct: 0
    };

    const getFounderConfig = async () => {
      const [weights, doctrine, taxConfig] = await Promise.all([
        base44.asServiceRole.entities.FounderConfiguration.list({ filter: { config_key: 'contribution_scoring_weights', status: 'active' } }).catch(() => []),
        base44.asServiceRole.entities.FounderConfiguration.list({ filter: { config_key: 'payout_doctrine', status: 'active' } }).catch(() => []),
        base44.asServiceRole.entities.FounderConfiguration.list({ filter: { config_key: 'tax_config', status: 'active' } }).catch(() => [])
      ]);
      return {
        scoring_weights: (weights && weights[0]?.value) ? weights[0].value : DEFAULT_SCORING_WEIGHTS,
        payout_doctrine: (doctrine && doctrine[0]?.value) ? doctrine[0].value : DEFAULT_DOCTRINE,
        tax_config: (taxConfig && taxConfig[0]?.value) ? taxConfig[0].value : { default_rate: 0, per_jurisdiction: {} }
      };
    };

    // ---------- DASHBOARD ----------
    if (op === 'get_dashboard') {
      const [subs, invoices, txns, payoutRuns, payoutItems, refunds, credits, revEvents] = await Promise.all([
        base44.asServiceRole.entities.Subscription.list(500).catch(() => []),
        base44.asServiceRole.entities.Invoice.list(500).catch(() => []),
        base44.asServiceRole.entities.FinancialTransaction.list(500).catch(() => []),
        base44.asServiceRole.entities.PayoutRun.list(100).catch(() => []),
        base44.asServiceRole.entities.PayoutItem.list(500).catch(() => []),
        base44.asServiceRole.entities.RefundRequest.list(100).catch(() => []),
        base44.asServiceRole.entities.CreditLedger.list(200).catch(() => []),
        base44.asServiceRole.entities.RevenueEvent.list(500).catch(() => [])
      ]);
      const activeSubs = (subs || []).filter(s => s.status === 'active');
      const mrr = activeSubs.reduce((a, s) => a + (s.mrr || 0), 0);
      const arr = activeSubs.reduce((a, s) => a + (s.arr || 0), 0);
      const outstandingInvoices = (invoices || []).filter(i => i.status === 'open' || i.status === 'in_collections');
      const outstandingTotal = outstandingInvoices.reduce((a, i) => a + (i.amount_remaining || 0), 0);
      const revenueByPlan = {};
      (revEvents || []).forEach(r => { revenueByPlan[r.product || r.plan_name || 'other'] = (revenueByPlan[r.product || r.plan_name || 'other'] || 0) + (r.amount || 0); });
      const pendingPayouts = (payoutItems || []).filter(p => p.approval_status === 'pending');
      const pendingPayoutTotal = pendingPayouts.reduce((a, p) => a + (p.net_amount || 0), 0);
      const completedPayouts = (payoutItems || []).filter(p => p.status === 'paid');
      const completedPayoutTotal = completedPayouts.reduce((a, p) => a + (p.net_amount || 0), 0);
      const pendingRefunds = (refunds || []).filter(r => r.status === 'pending');
      const pendingRefundTotal = pendingRefunds.reduce((a, r) => a + (r.refund_amount || 0), 0);
      const revenueTxns = (txns || []).filter(t => t.transaction_type === 'revenue');
      const expenseTxns = (txns || []).filter(t => t.transaction_type === 'expense');
      const totalRevenue = revenueTxns.reduce((a, t) => a + (t.amount || 0), 0);
      const totalExpenses = expenseTxns.reduce((a, t) => a + (t.amount || 0), 0);
      const netCashFlow = totalRevenue - totalExpenses - completedPayoutTotal;
      const config = await getFounderConfig();
      return Response.json({
        operation: 'get_dashboard',
        dashboard: {
          mrr, arr,
          active_subscriptions: activeSubs.length,
          total_subscriptions: (subs || []).length,
          outstanding_invoices: outstandingInvoices.length,
          outstanding_total: outstandingTotal,
          total_revenue: totalRevenue,
          total_expenses: totalExpenses,
          net_cash_flow: netCashFlow,
          platform_profitability: totalRevenue - totalExpenses,
          founder_profitability: totalRevenue - totalExpenses - completedPayoutTotal,
          revenue_by_plan: revenueByPlan,
          pending_payouts: pendingPayouts.length,
          pending_payout_total: pendingPayoutTotal,
          completed_payouts: completedPayouts.length,
          completed_payout_total: completedPayoutTotal,
          pending_refunds: pendingRefunds.length,
          pending_refund_total: pendingRefundTotal,
          credits_outstanding: (credits || []).filter(c => c.direction === 'credit' && c.status === 'posted').reduce((a, c) => a + (c.amount || 0), 0),
          payout_forecast_30d: pendingPayoutTotal,
          commission_forecast: pendingPayoutTotal * 0.6,
          residual_forecast: (payoutItems || []).filter(p => p.payout_type === 'residual' && p.approval_status === 'pending').reduce((a, p) => a + (p.net_amount || 0), 0),
          founder_config: config
        }
      });
    }

    // ---------- CALCULATE PAYOUT ----------
    if (op === 'calculate_payout') {
      const { participant_id, participant_name, participant_type, payout_type, gross_amount, policy_id, period } = params;
      if (!participant_id || !gross_amount) return Response.json({ error: 'participant_id and gross_amount required' }, { status: 400 });
      let policy = null;
      if (policy_id) policy = await base44.asServiceRole.entities.PayoutPolicy.get(policy_id).catch(() => null);
      if (!policy) {
        const policies = await base44.asServiceRole.entities.PayoutPolicy.list({ filter: { target_role: participant_type, status: 'active' } });
        policy = (policies && policies[0]) || null;
      }
      const config = await getFounderConfig();
      const doctrine = config.payout_doctrine;
      const basePct = policy?.base_pct ?? doctrine.base_pct;
      const maxCapPct = policy?.max_cap_pct ?? doctrine.max_cap_pct;
      const maxCapAmount = policy?.max_cap_amount || 0;
      const trustWeight = policy?.trust_weight ?? 1;
      const weights = config.scoring_weights;
      const profile = (await base44.asServiceRole.entities.ContributionProfile.list({ filter: { participant_id, status: 'active' } }))[0];
      const composite = profile?.composite_score || 0;
      const trust = profile?.scores?.trust || 0;
      const contributionAdjustmentPct = (composite / 100) * (policy?.contribution_weights?.contribution || weights.contribution) * 5;
      const trustAdjustmentPct = (trust / 100) * trustWeight * 3;
      const penaltyAdjustmentPct = (profile?.violations?.length || 0) * -2;
      const baseAmount = gross_amount * (basePct / 100);
      const contributionAdjustment = baseAmount * (contributionAdjustmentPct / 100);
      const trustAdjustment = baseAmount * (trustAdjustmentPct / 100);
      const penaltyAdjustment = baseAmount * (penaltyAdjustmentPct / 100);
      let netAmount = baseAmount + contributionAdjustment + trustAdjustment + penaltyAdjustment;
      const capPctAmount = gross_amount * (maxCapPct / 100);
      if (netAmount > capPctAmount) netAmount = capPctAmount;
      if (maxCapAmount > 0 && netAmount > maxCapAmount) netAmount = maxCapAmount;
      if (netAmount < 0) netAmount = 0;
      const approvalThreshold = policy?.approval_threshold ?? doctrine.approval_threshold;
      const approvalRequired = (policy?.requires_founder_approval ?? true) && netAmount >= approvalThreshold;
      const holdDays = policy?.hold_period_days ?? doctrine.hold_period_days;
      const holdUntil = holdDays > 0 ? new Date(Date.now() + holdDays * 86400000).toISOString() : '';
      const explanation = `Base ${basePct}% of $${gross_amount.toFixed(2)} = $${baseAmount.toFixed(2)}. Contribution adj (${contributionAdjustmentPct.toFixed(1)}%) = $${contributionAdjustment.toFixed(2)}. Trust adj (${trustAdjustmentPct.toFixed(1)}%) = $${trustAdjustment.toFixed(2)}. Penalty adj (${penaltyAdjustmentPct.toFixed(1)}%) = $${penaltyAdjustment.toFixed(2)}. Capped at ${maxCapPct}% = $${capPctAmount.toFixed(2)}. Final: $${netAmount.toFixed(2)}.`;
      const payoutKey = 'PO-' + Math.random().toString(36).slice(2, 10).toUpperCase();
      const item = await base44.asServiceRole.entities.PayoutItem.create({
        payout_key: payoutKey,
        participant_id, participant_name, participant_type,
        payout_type: payout_type || 'commission',
        policy_id: policy?.id || '', policy_name: policy?.policy_name || 'default_doctrine', policy_version: policy?.version || 1,
        gross_amount, base_amount: baseAmount,
        contribution_adjustment: contributionAdjustment, trust_adjustment: trustAdjustment, penalty_adjustment: penaltyAdjustment,
        net_amount: netAmount,
        calculation_explanation: explanation,
        contribution_factors: profile?.verified_factors || [],
        trust_factors: profile ? [{ trust_score: trust, weight: trustWeight }] : [],
        approval_chain: approvalRequired ? [{ approver: 'founder', action: 'pending', timestamp: nowIso }] : [],
        hold_until: holdUntil,
        approval_required: approvalRequired,
        approval_status: approvalRequired ? 'pending' : 'not_required',
        status: approvalRequired ? 'pending_approval' : 'calculated',
        audit_trail: [{ action: 'calculated', by: user.full_name || user.email, at: nowIso, note: explanation }],
        created_at: nowIso
      });
      return Response.json({ operation: 'calculate_payout', payout_item: item });
    }

    // ---------- CREATE PAYOUT RUN ----------
    if (op === 'create_payout_run') {
      const { run_name, period, payout_type, participants } = params;
      if (!run_name || !participants?.length) return Response.json({ error: 'run_name and participants required' }, { status: 400 });
      const runKey = 'PR-' + Math.random().toString(36).slice(2, 10).toUpperCase();
      const run = await base44.asServiceRole.entities.PayoutRun.create({
        run_key: runKey, run_name, period: period || new Date().toISOString().slice(0, 7),
        payout_type: payout_type || 'commission',
        status: 'calculated', approval_required: true, created_by: user.full_name || user.email
      });
      const itemIds = [];
      let totalPayout = 0; let pendingApprovals = 0;
      for (const p of participants) {
        const calcRes = await base44.functions.invoke('ncPaymentFabric', {
          operation: 'calculate_payout',
          params: { participant_id: p.participant_id, participant_name: p.participant_name, participant_type: p.participant_type, payout_type: payout_type || 'commission', gross_amount: p.gross_amount, policy_id: p.policy_id, period: run.period }
        });
        const item = calcRes?.data?.payout_item;
        if (item) {
          await base44.asServiceRole.entities.PayoutItem.update(item.id, { run_id: run.id });
          itemIds.push(item.id); totalPayout += item.net_amount || 0;
          if (item.approval_status === 'pending') pendingApprovals++;
        }
      }
      const updated = await base44.asServiceRole.entities.PayoutRun.update(run.id, {
        item_count: itemIds.length, item_ids: itemIds, total_payout: totalPayout,
        pending_approvals: pendingApprovals, status: pendingApprovals > 0 ? 'pending_approval' : 'calculated'
      });
      return Response.json({ operation: 'create_payout_run', run: updated });
    }

    // ---------- APPROVE PAYOUT ITEM ----------
    if (op === 'approve_payout_item') return founderOnly(async () => {
      const item = await base44.asServiceRole.entities.PayoutItem.get(params.payout_id);
      if (!item) return Response.json({ error: 'Payout item not found' }, { status: 404 });
      const updated = await base44.asServiceRole.entities.PayoutItem.update(item.id, {
        approval_status: 'approved', approved_by: user.full_name || user.email, approved_at: nowIso,
        status: 'approved',
        approval_chain: [...(item.approval_chain || []), { approver: user.full_name || user.email, action: 'approved', timestamp: nowIso }],
        audit_trail: [...(item.audit_trail || []), { action: 'approved', by: user.full_name || user.email, at: nowIso }]
      });
      return Response.json({ operation: 'approve_payout_item', payout_item: updated });
    });

    // ---------- APPROVE PAYOUT RUN ----------
    if (op === 'approve_payout_run') return founderOnly(async () => {
      const run = await base44.asServiceRole.entities.PayoutRun.get(params.run_id);
      if (!run) return Response.json({ error: 'Run not found' }, { status: 404 });
      const items = await base44.asServiceRole.entities.PayoutItem.list({ filter: { run_id: run.id } });
      for (const it of items) {
        if (it.approval_status === 'pending') {
          await base44.asServiceRole.entities.PayoutItem.update(it.id, {
            approval_status: 'approved', approved_by: user.full_name || user.email, approved_at: nowIso, status: 'approved'
          });
        }
      }
      const updated = await base44.asServiceRole.entities.PayoutRun.update(run.id, {
        status: 'approved', approved_by: user.full_name || user.email, approved_at: nowIso, pending_approvals: 0
      });
      return Response.json({ operation: 'approve_payout_run', run: updated });
    });

    // ---------- PROCESS REFUND ----------
    if (op === 'process_refund') return founderOnly(async () => {
      const reqItem = await base44.asServiceRole.entities.RefundRequest.get(params.request_id);
      if (!reqItem) return Response.json({ error: 'Refund request not found' }, { status: 404 });
      const updated = await base44.asServiceRole.entities.RefundRequest.update(reqItem.id, {
        approval_status: 'approved', approved_by: user.full_name || user.email, approved_at: nowIso,
        status: 'processing',
        audit_trail: [...(reqItem.audit_trail || []), { action: 'approved', by: user.full_name || user.email, at: nowIso }]
      });
      // Record financial transaction
      await base44.asServiceRole.entities.FinancialTransaction.create({
        transaction_date: nowIso.slice(0, 10), transaction_type: 'refund', category: 'other_expense',
        amount: reqItem.refund_amount, description: `Refund ${reqItem.request_key} - ${reqItem.refund_reason}`,
        status: 'completed', notes: `Approved by ${user.full_name || user.email}`
      });
      return Response.json({ operation: 'process_refund', refund: updated, note: 'Refund approved. Execute in Stripe dashboard or via Stripe API.' });
    });

    // ---------- ISSUE CREDIT ----------
    if (op === 'issue_credit') {
      const { account_id, account_name, account_type, amount, direction, reason, reason_category } = params;
      if (!account_id || !amount) return Response.json({ error: 'account_id and amount required' }, { status: 400 });
      const config = await getFounderConfig();
      const threshold = config.payout_doctrine.approval_threshold;
      const approvalRequired = Math.abs(amount) >= threshold;
      if (approvalRequired && user.role !== 'admin') return Response.json({ error: 'Founder approval required for credits above threshold' }, { status: 403 });
      const entryKey = 'CL-' + Math.random().toString(36).slice(2, 10).toUpperCase();
      const entry = await base44.asServiceRole.entities.CreditLedger.create({
        entry_key: entryKey, account_id, account_name, account_type: account_type || 'customer',
        amount, currency: 'USD', direction: direction || 'credit', reason, reason_category: reason_category || 'other',
        authorization_required: approvalRequired,
        approval_status: approvalRequired ? 'approved' : 'not_required',
        approved_by: approvalRequired ? (user.full_name || user.email) : '',
        status: 'posted', posted_at: nowIso,
        audit_trail: [{ action: 'issued', by: user.full_name || user.email, at: nowIso, amount, reason }]
      });
      return Response.json({ operation: 'issue_credit', credit: entry });
    }

    // ---------- CONTRIBUTION PROFILE ----------
    if (op === 'get_contribution_profile') {
      const profiles = await base44.asServiceRole.entities.ContributionProfile.list({ filter: { participant_id: params.participant_id, status: 'active' } });
      return Response.json({ operation: 'get_contribution_profile', profile: profiles?.[0] || null });
    }

    if (op === 'update_contribution_scores') {
      const { participant_id, verified_factors, violations } = params;
      const existing = (await base44.asServiceRole.entities.ContributionProfile.list({ filter: { participant_id, status: 'active' } }))[0];
      const config = await getFounderConfig();
      const w = config.scoring_weights;
      const scores = { contribution:0, trust:0, reputation:0, experience:0, leadership:0, customer_success:0, retention:0, innovation:0, learning:0, quality:0, professionalism:0, ethics:0, reliability:0 };
      (verified_factors || []).forEach(f => {
        const dim = f.dimension || 'contribution';
        if (scores[dim] !== undefined) scores[dim] += (f.score_impact || 1) * (w[dim] || 1);
      });
      Object.keys(scores).forEach(k => { scores[k] = Math.min(100, Math.max(0, scores[k])); });
      const composite = Object.keys(w).reduce((a, k) => a + (scores[k] || 0) * (w[k] || 1), 0) / Object.keys(w).reduce((a, k) => a + (w[k] || 1), 0);
      const profile = existing
        ? await base44.asServiceRole.entities.ContributionProfile.update(existing.id, { scores, composite_score: composite, verified_factors: verified_factors || existing.verified_factors, violations: violations || existing.violations, last_updated: nowIso })
        : await base44.asServiceRole.entities.ContributionProfile.create({ participant_id, participant_name: params.participant_name, participant_type: params.participant_type || 'member', scores, composite_score: composite, verified_factors: verified_factors || [], violations: violations || [], last_updated: nowIso, status: 'active' });
      return Response.json({ operation: 'update_contribution_scores', profile });
    }

    // ---------- AI RECOMMENDATIONS ----------
    if (op === 'recommend_compensation' || op === 'recommend_promotion') {
      const profile = (await base44.asServiceRole.entities.ContributionProfile.list({ filter: { participant_id: params.participant_id, status: 'active' } }))[0];
      if (!profile) return Response.json({ error: 'Contribution profile not found' }, { status: 404 });
      const recType = op === 'recommend_promotion' ? 'promotion' : 'compensation_adjustment';
      const prompt = `Analyze this participant for a ${recType} recommendation in the NC Contribution Economy. Scores: ${JSON.stringify(profile.scores)}. Composite: ${profile.composite_score}. Verified factors: ${JSON.stringify(profile.verified_factors || [])}. Violations: ${JSON.stringify(profile.violations || [])}. Provide a JSON with: recommendation_text, rationale (2-3 sentences citing scores), suggested_action (object with type and details), ai_confidence (0-100). Reward sustainable value creation, trust, customer success, retention, quality. Never reward pressure selling.`;
      const llmRes = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: { type: 'object', properties: { recommendation_text: { type: 'string' }, rationale: { type: 'string' }, suggested_action: { type: 'object' }, ai_confidence: { type: 'number' } } }
      });
      const recKey = 'REC-' + Math.random().toString(36).slice(2, 10).toUpperCase();
      const rec = await base44.asServiceRole.entities.PayoutRecommendation.create({
        recommendation_key: recKey, participant_id: params.participant_id, participant_name: profile.participant_name, participant_type: profile.participant_type,
        recommendation_type: recType,
        recommendation_text: llmRes.recommendation_text, rationale: llmRes.rationale,
        supporting_scores: profile.scores, supporting_factors: (profile.verified_factors || []).map(f => f.description || f.factor_type || 'factor'),
        suggested_action: llmRes.suggested_action, policy_impact: recType === 'promotion', requires_founder_approval: true,
        approval_status: 'pending', ai_generated: true, ai_confidence: llmRes.ai_confidence || 0, status: 'active'
      });
      return Response.json({ operation: op, recommendation: rec });
    }

    // ---------- FOUNDER CONFIG GET/UPDATE ----------
    if (op === 'get_founder_config') return Response.json({ operation: 'get_founder_config', config: await getFounderConfig() });

    if (op === 'update_founder_config') return founderOnly(async () => {
      const { config_key, value, category, description } = params;
      const existing = (await base44.asServiceRole.entities.FounderConfiguration.list({ filter: { config_key, status: 'active' } }))[0];
      if (existing) {
        await base44.asServiceRole.entities.FounderConfiguration.update(existing.id, { status: 'superseded' });
      }
      const created = await base44.asServiceRole.entities.FounderConfiguration.create({
        config_key, category: category || 'compensation', value, data_type: 'object',
        description: description || '', status: 'active', version: (existing?.version || 0) + 1,
        effective_date: nowIso.slice(0, 10), last_modified_by: user.full_name || user.email, last_modified_at: nowIso,
        requires_founder_approval: true,
        history: [...(existing?.history || []), { version: existing?.version || 0, value: existing?.value, changed_by: user.full_name || user.email, at: nowIso }]
      });
      return Response.json({ operation: 'update_founder_config', config: created });
    });

    // ---------- PAYOUT POLICIES ----------
    if (op === 'get_payout_policies') {
      const policies = await base44.asServiceRole.entities.PayoutPolicy.list(200);
      return Response.json({ operation: 'get_payout_policies', policies });
    }
    if (op === 'upsert_payout_policy') {
      const { policy_name, policy_key, target_role, base_pct, max_cap_pct, ...rest } = params;
      const existing = (await base44.asServiceRole.entities.PayoutPolicy.list({ filter: { policy_key, status: 'active' } }))[0];
      const data = { policy_name, policy_key, target_role, base_pct, max_cap_pct, ...rest, version: (existing?.version || 0) + 1, status: 'draft' };
      const policy = existing
        ? await base44.asServiceRole.entities.PayoutPolicy.update(existing.id, data)
        : await base44.asServiceRole.entities.PayoutPolicy.create(data);
      return Response.json({ operation: 'upsert_payout_policy', policy });
    }
    if (op === 'activate_payout_policy') return founderOnly(async () => {
      const policy = await base44.asServiceRole.entities.PayoutPolicy.get(params.policy_id);
      if (!policy) return Response.json({ error: 'Policy not found' }, { status: 404 });
      const existingActive = await base44.asServiceRole.entities.PayoutPolicy.list({ filter: { target_role: policy.target_role, status: 'active' } });
      for (const p of existingActive) { if (p.id !== policy.id) await base44.asServiceRole.entities.PayoutPolicy.update(p.id, { status: 'superseded' }); }
      const updated = await base44.asServiceRole.entities.PayoutPolicy.update(policy.id, { status: 'active', approved_by: user.full_name || user.email, approved_at: nowIso });
      return Response.json({ operation: 'activate_payout_policy', policy: updated });
    });

    // ---------- AUDIT TRAIL ----------
    if (op === 'get_audit_trail') {
      const { entity_type, entity_id } = params;
      let records = [];
      if (entity_type === 'payout_item') { const it = await base44.asServiceRole.entities.PayoutItem.get(entity_id); records = it?.audit_trail || []; }
      else if (entity_type === 'credit') { const it = await base44.asServiceRole.entities.CreditLedger.get(entity_id); records = it?.audit_trail || []; }
      else if (entity_type === 'refund') { const it = await base44.asServiceRole.entities.RefundRequest.get(entity_id); records = it?.audit_trail || []; }
      return Response.json({ operation: 'get_audit_trail', audit_trail: records });
    }

    // ---------- LISTS ----------
    if (op === 'get_payout_runs') return Response.json({ operation: 'get_payout_runs', runs: await base44.asServiceRole.entities.PayoutRun.list(100) });
    if (op === 'get_payout_items') return Response.json({ operation: 'get_payout_items', items: await base44.asServiceRole.entities.PayoutItem.list(200) });
    if (op === 'get_refunds') return Response.json({ operation: 'get_refunds', refunds: await base44.asServiceRole.entities.RefundRequest.list(100) });
    if (op === 'get_credits') return Response.json({ operation: 'get_credits', credits: await base44.asServiceRole.entities.CreditLedger.list(200) });
    if (op === 'get_recommendations') return Response.json({ operation: 'get_recommendations', recommendations: await base44.asServiceRole.entities.PayoutRecommendation.list(100) });
    if (op === 'get_profiles') return Response.json({ operation: 'get_profiles', profiles: await base44.asServiceRole.entities.ContributionProfile.list(200) });
    if (op === 'get_stripe_events') return Response.json({ operation: 'get_stripe_events', events: await base44.asServiceRole.entities.StripeEvent.list(100) });

    return Response.json({ error: 'Unknown operation: ' + op }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});