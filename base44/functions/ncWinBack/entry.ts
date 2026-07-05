import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const operation = body.operation || 'scan';
    const b = base44.asServiceRole.entities;

    if (operation === 'scan') {
      const [csChurned, csAtRisk, subs, trustScores] = await Promise.all([
        b.CustomerSuccessProfile.filter({ retention_status: { $in: ['churned', 'won_back'] } }, '-created_date', 100),
        b.CustomerSuccessProfile.filter({ churn_risk_level: { $in: ['high', 'critical'] } }, '-created_date', 100),
        b.Subscription.filter({ status: { $in: ['cancelled', 'expired', 'past_due'] } }, '-created_date', 100),
        b.TrustScore.filter({ trust_score: { $lt: 30 } }, '-created_date', 50)
      ]);

      const targets = new Map();
      for (const cs of [...csChurned, ...csAtRisk]) {
        if (!targets.has(cs.id)) {
          targets.set(cs.id, {
            source: 'customer_success', profile_id: cs.id,
            customer_name: cs.customer_name, customer_email: cs.customer_email,
            status: cs.retention_status, churn_risk: cs.churn_risk_level,
            reason: detectReason(cs), last_active: cs.last_active_date
          });
        }
      }
      for (const sub of subs) {
        const key = sub.customer_email || sub.id;
        if (!targets.has(key)) {
          targets.set(key, {
            source: 'subscription', subscription_id: sub.id,
            customer_name: sub.customer_name, customer_email: sub.customer_email,
            status: sub.status, reason: detectSubReason(sub), last_active: sub.current_period_end
          });
        }
      }

      const winBackTargets = Array.from(targets.values());
      return Response.json({
        operation, total_targets: winBackTargets.length,
        churned: winBackTargets.filter(t => t.status === 'churned' || t.status === 'cancelled').length,
        at_risk: winBackTargets.filter(t => t.status === 'at_risk' || t.status === 'past_due').length,
        targets: winBackTargets
      });
    }

    if (operation === 'create_winback') {
      const target = body.params.target;
      if (!target) return Response.json({ error: 'target required' }, { status: 400 });

      const moduleRecommendation = recommendModule(target);
      const outreach = generateOutreach(target);

      const task = await b.Task.create({
        title: `Win-Back: ${target.customer_name}`,
        description: outreach.message,
        priority: 'high',
        status: 'todo',
        tags: ['win-back', 'value-first', target.source]
      });

      await b.OrganizationalIntelligence.create({
        title: `Win-back opportunity: ${target.customer_name}`,
        description: `Churn reason: ${target.reason}. Recommended module: ${moduleRecommendation}. Outreach strategy: value-first.`,
        insight_type: 'customer_friction',
        source: 'win_back_engine',
        priority: 'high',
        affected_roles: ['founder', 'director'],
        affected_modules: ['customer_success', moduleRecommendation.toLowerCase().replace(/ /g, '_')],
        status: 'active',
        tags: ['win-back', 'churn']
      });

      if (target.profile_id) {
        await b.CustomerSuccessProfile.update(target.profile_id, {
          journey_stage: 'won_back',
          recommended_outreach: [{ action: outreach.action, message: outreach.message, channel: 'email', priority: 'high' }],
          recommended_education: [{ topic: moduleRecommendation, resource: 'Value demonstration session', reason: 'Re-engage with value-first approach' }]
        });
      }

      return Response.json({
        operation, task_id: task.id,
        customer: target.customer_name,
        churn_reason: target.reason,
        recommended_module: moduleRecommendation,
        outreach_strategy: outreach,
        pressure_free: true
      });
    }

    if (operation === 'log_outcome') {
      const { profile_id, customer_name, outcome, notes } = body.params;
      await b.CustomerInteraction.create({
        customer_profile_id: profile_id || '',
        customer_name: customer_name || '',
        interaction_type: 'feedback',
        channel: 'in_app',
        description: `Win-back outcome: ${outcome}. ${notes || ''}`,
        outcome: outcome,
        sentiment: outcome === 're-engaged' ? 'positive' : 'neutral',
        impact_on_health: outcome === 're-engaged' ? 10 : 0
      });
      await b.OrganizationalIntelligence.create({
        title: `Win-back outcome logged: ${customer_name}`,
        description: `Outcome: ${outcome}. Notes: ${notes}`,
        insight_type: outcome === 're-engaged' ? 'process_improvement' : 'customer_friction',
        source: 'win_back_engine',
        priority: 'medium',
        status: 'active',
        tags: ['win-back', outcome]
      });
      return Response.json({ operation, status: 'logged' });
    }

    return Response.json({ error: 'Unknown operation' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function detectReason(cs) {
  if (cs.churn_signals?.length > 0) return cs.churn_signals[0];
  if (cs.usage_trend === 'sharp_decline') return 'sharp_usage_decline';
  if (cs.support_tickets_open > 3) return 'support_overload';
  if (cs.onboarding_status === 'stalled') return 'onboarding_stalled';
  if (cs.nps_score < 0) return 'low_nps';
  if (!cs.last_active_date) return 'inactive';
  return 'unknown';
}

function detectSubReason(sub) {
  if (sub.status === 'cancelled') return 'cancelled';
  if (sub.status === 'expired') return 'expired';
  if (sub.status === 'past_due') return 'payment_failure';
  return 'unknown';
}

function recommendModule(target) {
  const reason = target.reason || '';
  if (reason.includes('onboarding')) return 'Director Assistant';
  if (reason.includes('support')) return 'AI Workforce';
  if (reason.includes('usage')) return 'Build Studio';
  if (reason.includes('payment')) return 'Resource Compass';
  return 'Daily Compass';
}

function generateOutreach(target) {
  const module = recommendModule(target);
  return {
    action: 'Send value-first check-in',
    channel: 'email',
    message: `Hi ${target.customer_name}, we noticed you haven't been active recently. No pressure at all — we'd love to show you something new in ${module} that might help with what you were working on. Would a quick walkthrough be helpful? Completely optional.`
  };
}