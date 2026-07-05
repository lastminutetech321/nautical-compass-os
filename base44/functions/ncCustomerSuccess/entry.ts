import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { operation, params = {} } = body;

    // ─── EVALUATE ALL CUSTOMERS ───
    if (operation === 'evaluate') {
      const profiles = await base44.asServiceRole.entities.CustomerSuccessProfile.list('-created_date', 200);
      const subscriptions = await base44.asServiceRole.entities.Subscription.list('-created_date', 100).catch(() => []);
      const crmLeads = await base44.asServiceRole.entities.CRMLead.list('-created_date', 100).catch(() => []);
      const interactions = await base44.asServiceRole.entities.CustomerInteraction.list('-created_date', 200).catch(() => []);
      const revenueEvents = await base44.asServiceRole.entities.RevenueEvent.list('-created_date', 50).catch(() => []);

      const subMap = new Map(subscriptions.map(s => [s.id, s]));
      const leadMap = new Map(crmLeads.map(l => [l.id, l]));
      const interactionMap = new Map();
      for (const i of interactions) {
        const arr = interactionMap.get(i.customer_profile_id) || [];
        arr.push(i);
        interactionMap.set(i.customer_profile_id, arr);
      }

      const evaluated = [];
      const updates = [];

      for (const profile of profiles) {
        const sub = profile.subscription_id ? subMap.get(profile.subscription_id) : null;
        const lead = profile.customer_ref_type === 'crm_lead' && profile.customer_ref_id ? leadMap.get(profile.customer_ref_id) : null;
        const custInteractions = interactionMap.get(profile.id) || [];
        const result = calculateHealthScore(profile, sub, lead, custInteractions);

        updates.push({
          id: profile.id,
          health_score: result.health_score,
          health_status: result.health_status,
          health_trend: result.health_trend,
          churn_risk_score: result.churn_risk_score,
          churn_risk_level: result.churn_risk_level,
          churn_risk_factors: result.churn_risk_factors,
          churn_signals: result.churn_signals,
          journey_stage: result.journey_stage,
          retention_status: result.retention_status,
          days_to_renewal: result.days_to_renewal,
          renewal_status: result.renewal_status,
          last_health_evaluation: new Date().toISOString(),
          founder_alert_required: result.founder_alert_required,
          alert_reason: result.alert_reason,
          alert_severity: result.alert_severity,
          alert_triggered_at: result.founder_alert_required ? new Date().toISOString() : null,
          mrr: sub?.amount || profile.mrr || 0,
          subscription_plan: sub?.plan_name || profile.subscription_plan,
          subscription_status: sub?.status || profile.subscription_status
        });

        evaluated.push({ ...profile, ...result });
      }

      if (updates.length > 0) {
        await base44.asServiceRole.entities.CustomerSuccessProfile.bulkUpdate(updates.slice(0, 500));
      }

      const atRisk = evaluated.filter(c => c.churn_risk_level === 'high' || c.churn_risk_level === 'critical' || c.health_score < 60);
      const portfolioSummary = {
        total_customers: evaluated.length,
        active_customers: evaluated.filter(c => c.status === 'active').length,
        at_risk_count: atRisk.length,
        critical_count: evaluated.filter(c => c.churn_risk_level === 'critical').length,
        churned_count: evaluated.filter(c => c.retention_status === 'churned').length,
        avg_health_score: evaluated.length ? Math.round(evaluated.reduce((s, c) => s + c.health_score, 0) / evaluated.length) : 0,
        total_mrr: evaluated.reduce((s, c) => s + (c.mrr || 0), 0),
        upcoming_renewals_30d: evaluated.filter(c => c.days_to_renewal > 0 && c.days_to_renewal <= 30).length,
        founder_alerts: evaluated.filter(c => c.founder_alert_required).length,
        onboarding_completion: evaluated.length ? Math.round(evaluated.reduce((s, c) => s + (c.onboarding_progress_pct || 0), 0) / evaluated.length) : 0,
        avg_feature_adoption: evaluated.length ? Math.round(evaluated.reduce((s, c) => s + (c.feature_adoption_pct || 0), 0) / evaluated.length) : 0
      };

      let aiRecommendations = null;
      if (atRisk.length > 0) {
        aiRecommendations = await generateRecommendations(base44, atRisk.slice(0, 10), portfolioSummary);

        for (const rec of aiRecommendations.customer_recommendations || []) {
          const matching = atRisk.find(c => c.customer_name === rec.customer_name);
          if (matching) {
            await base44.asServiceRole.entities.CustomerSuccessProfile.update(matching.id, {
              recommended_outreach: rec.outreach || [],
              recommended_education: rec.education || [],
              recommended_upgrades: rec.upgrades || [],
              recommended_ai_assistance: rec.ai_assistance || [],
              notes: rec.health_summary || matching.notes
            });

            if (rec.founder_alert && rec.alert_reason) {
              await base44.asServiceRole.entities.ApprovalGate.create({
                title: `CHURN ALERT: ${rec.customer_name}`,
                description: rec.alert_reason,
                approval_type: 'founder',
                risk_level: matching.churn_risk_level === 'critical' ? 'critical' : 'high',
                status: 'pending',
                requested_by: 'NC Customer Success OS',
                entity_type: 'CustomerSuccessProfile',
                entity_id: matching.id,
                context: { customer_name: rec.customer_name, health_score: matching.health_score, churn_risk: matching.churn_risk_score, mrr: matching.mrr }
              }).catch(() => {});
            }
          }
        }
      }

      // ── INTELLIGENCE FEEDBACK LOOP: Generate OrganizationalIntelligence from evaluation ──
      const intelligenceCreated = [];

      const stalledCount = evaluated.filter(c => c.onboarding_status === 'stalled' || (c.churn_risk_factors || []).includes('Onboarding stalled')).length;
      if (stalledCount > 0) {
        try {
          const insight = await base44.asServiceRole.entities.OrganizationalIntelligence.create({
            insight_type: 'workflow_bottleneck',
            title: `${stalledCount} customer(s) with stalled onboarding`,
            description: `CS evaluation: ${stalledCount} customer(s) have stalled onboarding. Pattern: incomplete onboarding → low adoption → churn risk.`,
            frequency: stalledCount,
            affected_roles: ['founder', 'director'],
            affected_workflows: ['customer_onboarding'],
            affected_modules: ['customer_success'],
            recommended_action: 'Automate onboarding check-ins at day 7/14/21. Assign CS agent to every new customer.',
            source: 'system_scan',
            status: 'active',
            priority: stalledCount > 2 ? 'high' : 'medium',
            tags: ['customer-success', 'onboarding']
          });
          intelligenceCreated.push({ type: 'onboarding_bottleneck', id: insight.id });
        } catch {}
      }

      const lowAdoptionCount = evaluated.filter(c => (c.feature_adoption_pct || 0) < 30).length;
      if (lowAdoptionCount > 0) {
        try {
          const insight = await base44.asServiceRole.entities.OrganizationalIntelligence.create({
            insight_type: 'training_gap',
            title: `${lowAdoptionCount} customer(s) with low feature adoption (<30%)`,
            description: `CS evaluation: ${lowAdoptionCount} customer(s) below 30% feature adoption. Education gap: not discovering key features.`,
            frequency: lowAdoptionCount,
            affected_roles: ['director', 'staff'],
            affected_workflows: ['feature_education'],
            affected_modules: ['customer_success'],
            recommended_action: 'Create feature adoption training. Send targeted education to at-risk customers.',
            source: 'system_scan',
            status: 'active',
            priority: 'medium',
            tags: ['customer-success', 'education']
          });
          intelligenceCreated.push({ type: 'education_gap', id: insight.id });
        } catch {}
      }

      const negativeSatisfactionCount = evaluated.filter(c => (c.nps_score || 0) < 0 || (c.churn_risk_factors || []).some(f => /negative|nps/i.test(f))).length;
      if (negativeSatisfactionCount > 0) {
        try {
          const insight = await base44.asServiceRole.entities.OrganizationalIntelligence.create({
            insight_type: 'support_trend',
            title: `${negativeSatisfactionCount} customer(s) showing negative satisfaction`,
            description: `CS evaluation: ${negativeSatisfactionCount} customer(s) with negative NPS or negative interactions. Satisfaction declining.`,
            frequency: negativeSatisfactionCount,
            affected_roles: ['founder', 'director'],
            affected_workflows: ['customer_satisfaction'],
            affected_modules: ['customer_success'],
            recommended_action: 'Root cause analysis on negative sentiment. Review support patterns.',
            source: 'system_scan',
            status: 'active',
            priority: negativeSatisfactionCount > 2 ? 'high' : 'medium',
            tags: ['customer-success', 'satisfaction']
          });
          intelligenceCreated.push({ type: 'satisfaction_trend', id: insight.id });
        } catch {}
      }

      const factorFreq = {};
      for (const c of evaluated) {
        for (const f of (c.churn_risk_factors || [])) {
          factorFreq[f] = (factorFreq[f] || 0) + 1;
        }
      }
      for (const [factor, count] of Object.entries(factorFreq).sort((a, b) => b[1] - a[1]).slice(0, 3)) {
        if (count >= 2) {
          try {
            const insight = await base44.asServiceRole.entities.OrganizationalIntelligence.create({
              insight_type: 'common_question',
              title: `Recurring customer issue: ${factor}`,
              description: `${count} customer(s) share risk factor: "${factor}". Systemic issue — address at product/process level.`,
              frequency: count,
              affected_roles: ['founder', 'director'],
              affected_modules: ['customer_success'],
              recommended_action: `Address "${factor}" — product fix, process improvement, or proactive communication.`,
              source: 'system_scan',
              status: 'active',
              priority: count >= 3 ? 'high' : 'medium',
              tags: ['customer-success', 'churn-factor']
            });
            intelligenceCreated.push({ type: 'common_complaint', factor, id: insight.id });
          } catch {}
        }
      }

      // Notifications for founder alerts
      const notificationsCreated = [];
      for (const c of evaluated.filter(c => c.founder_alert_required)) {
        try {
          await base44.asServiceRole.entities.Notification.create({
            title: `CHURN ALERT: ${c.customer_name}`,
            message: c.alert_reason || `${c.customer_name} requires founder attention. Churn risk: ${c.churn_risk_level}.`,
            type: 'revenue_alert',
            severity: c.alert_severity === 'critical' ? 'critical' : 'high',
            recipient_id: 'founder',
            read: false,
            action_url: '/customer-success',
            action_label: 'View Customer',
            source_entity_type: 'CustomerSuccessProfile',
            source_entity_id: c.id
          });
          notificationsCreated.push(c.customer_name);
        } catch {}
      }

      return Response.json({
        operation: 'evaluate',
        portfolio_summary: portfolioSummary,
        ai_recommendations: aiRecommendations,
        evaluated_count: evaluated.length,
        at_risk_count: atRisk.length,
        founder_alerts_triggered: evaluated.filter(c => c.founder_alert_required).length,
        intelligence_created: intelligenceCreated,
        notifications_created: notificationsCreated.length
      });
    }

    // ─── DASHBOARD ───
    if (operation === 'dashboard') {
      const profiles = await base44.asServiceRole.entities.CustomerSuccessProfile.list('-created_date', 200);
      const interactions = await base44.asServiceRole.entities.CustomerInteraction.list('-created_date', 50).catch(() => []);

      const total = profiles.length;
      const atRisk = profiles.filter(c => c.churn_risk_level === 'high' || c.churn_risk_level === 'critical');
      const critical = profiles.filter(c => c.churn_risk_level === 'critical');
      const churned = profiles.filter(c => c.retention_status === 'churned');
      const founderAlerts = profiles.filter(c => c.founder_alert_required);
      const upcomingRenewals = profiles.filter(c => c.days_to_renewal > 0 && c.days_to_renewal <= 30);
      const stalledOnboarding = profiles.filter(c => c.onboarding_status === 'stalled');
      const avgHealth = total ? Math.round(profiles.reduce((s, c) => s + (c.health_score || 50), 0) / total) : 0;
      const totalMrr = profiles.reduce((s, c) => s + (c.mrr || 0), 0);
      const avgAdoption = total ? Math.round(profiles.reduce((s, c) => s + (c.feature_adoption_pct || 0), 0) / total) : 0;
      const avgOnboarding = total ? Math.round(profiles.reduce((s, c) => s + (c.onboarding_progress_pct || 0), 0) / total) : 0;

      return Response.json({
        operation: 'dashboard',
        metrics: {
          total_customers: total,
          active_customers: profiles.filter(c => c.status === 'active').length,
          at_risk_count: atRisk.length,
          critical_count: critical.length,
          churned_count: churned.length,
          founder_alerts: founderAlerts.length,
          upcoming_renewals_30d: upcomingRenewals.length,
          stalled_onboarding: stalledOnboarding.length,
          avg_health_score: avgHealth,
          total_mrr: totalMrr,
          avg_feature_adoption: avgAdoption,
          avg_onboarding_progress: avgOnboarding
        },
        at_risk_customers: atRisk.sort((a, b) => b.churn_risk_score - a.churn_risk_score).slice(0, 10).map(c => ({
          id: c.id,
          customer_name: c.customer_name,
          customer_type: c.customer_type,
          health_score: c.health_score,
          health_status: c.health_status,
          churn_risk_score: c.churn_risk_score,
          churn_risk_level: c.churn_risk_level,
          churn_risk_factors: c.churn_risk_factors,
          mrr: c.mrr,
          renewal_date: c.renewal_date,
          days_to_renewal: c.days_to_renewal,
          alert_severity: c.alert_severity,
          alert_reason: c.alert_reason,
          recommended_outreach: c.recommended_outreach,
          recommended_education: c.recommended_education,
          recommended_upgrades: c.recommended_upgrades,
          recommended_ai_assistance: c.recommended_ai_assistance,
          journey_stage: c.journey_stage,
          last_active_date: c.last_active_date,
          usage_trend: c.usage_trend,
          assigned_cs_agent: c.assigned_cs_agent
        })),
        recent_interactions: interactions.slice(0, 10),
        renewal_watchlist: upcomingRenewals.sort((a, b) => (a.days_to_renewal || 0) - (b.days_to_renewal || 0)).slice(0, 10).map(c => ({
          id: c.id,
          customer_name: c.customer_name,
          renewal_date: c.renewal_date,
          days_to_renewal: c.days_to_renewal,
          health_score: c.health_score,
          mrr: c.mrr,
          renewal_status: c.renewal_status
        }))
      });
    }

    // ─── GET PROFILE ───
    if (operation === 'get_profile') {
      const profile = await base44.asServiceRole.entities.CustomerSuccessProfile.get(params.profile_id);
      const interactions = await base44.asServiceRole.entities.CustomerInteraction.filter({ customer_profile_id: params.profile_id }, '-interaction_date', 20).catch(() => []);
      return Response.json({ operation: 'get_profile', profile, interactions });
    }

    // ─── LIST PROFILES ───
    if (operation === 'list_profiles') {
      const filter = {};
      if (params.status) filter.status = params.status;
      if (params.churn_risk_level) filter.churn_risk_level = params.churn_risk_level;
      if (params.health_status) filter.health_status = params.health_status;
      const profiles = await base44.asServiceRole.entities.CustomerSuccessProfile.filter(filter, '-health_score', 100);
      return Response.json({ operation: 'list_profiles', profiles, count: profiles.length });
    }

    // ─── LOG INTERACTION ───
    if (operation === 'log_interaction') {
      const interaction = await base44.asServiceRole.entities.CustomerInteraction.create({
        customer_profile_id: params.customer_profile_id,
        customer_name: params.customer_name,
        interaction_type: params.interaction_type || 'check_in',
        channel: params.channel || 'email',
        description: params.description || '',
        outcome: params.outcome || '',
        sentiment: params.sentiment || 'neutral',
        interaction_date: new Date().toISOString(),
        agent_name: params.agent_name || user.full_name,
        agent_id: user.id,
        follow_up_required: params.follow_up_required || false,
        follow_up_date: params.follow_up_date || null,
        impact_on_health: params.impact_on_health || 0,
        tags: params.tags || [],
        notes: params.notes || ''
      });

      if (params.customer_profile_id) {
        const profile = await base44.asServiceRole.entities.CustomerSuccessProfile.get(params.customer_profile_id);
        const sentimentImpact = params.sentiment === 'positive' ? 5 : params.sentiment === 'negative' ? -10 : params.sentiment === 'very_negative' ? -20 : 0;
        await base44.asServiceRole.entities.CustomerSuccessProfile.update(params.customer_profile_id, {
          last_active_date: new Date().toISOString(),
          health_score: Math.max(0, Math.min(100, (profile.health_score || 50) + sentimentImpact))
        });
      }

      return Response.json({ operation: 'log_interaction', interaction });
    }

    // ─── GENERATE OUTREACH ───
    if (operation === 'generate_outreach') {
      const profile = await base44.asServiceRole.entities.CustomerSuccessProfile.get(params.profile_id);
      const interactions = await base44.asServiceRole.entities.CustomerInteraction.filter({ customer_profile_id: params.profile_id }, '-interaction_date', 5).catch(() => []);

      const llmRes = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a Customer Success Manager AI. Generate a personalized outreach message for this customer.

Customer: ${profile.customer_name}
Type: ${profile.customer_type}
Health Score: ${profile.health_score}/100 (${profile.health_status})
Churn Risk: ${profile.churn_risk_level} (${profile.churn_risk_score}/100)
Journey Stage: ${profile.journey_stage}
Usage: ${profile.usage_frequency}, trend: ${profile.usage_trend}
Onboarding: ${profile.onboarding_status} (${profile.onboarding_progress_pct}%)
Feature Adoption: ${profile.feature_adoption_pct}%
Support Tickets Open: ${profile.support_tickets_open}
NPS: ${profile.nps_score}
MRR: $${profile.mrr}
Renewal: ${profile.renewal_date || 'N/A'} (${profile.days_to_renewal} days)
Churn Factors: ${(profile.churn_risk_factors || []).join(', ')}
Recent Interactions: ${interactions.map(i => `${i.interaction_type}: ${i.outcome} (${i.sentiment})`).join('; ')}

Generate:
1. A personalized outreach email/message
2. The recommended channel (email, phone, video, in_app)
3. The goal of this outreach
4. Key talking points

Return as JSON.`,
        response_json_schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            subject: { type: "string" },
            message: { type: "string" },
            channel: { type: "string" },
            goal: { type: "string" },
            talking_points: { type: "array", items: { type: "string" } }
          },
          required: ["subject", "message", "channel", "goal", "talking_points"]
        }
      });

      return Response.json({ operation: 'generate_outreach', outreach: llmRes, customer_name: profile.customer_name });
    }

    // ─── CREATE PROFILE ───
    if (operation === 'create_profile') {
      const profile = await base44.asServiceRole.entities.CustomerSuccessProfile.create({
        customer_name: params.customer_name,
        customer_email: params.customer_email,
        customer_type: params.customer_type || 'subscription',
        customer_ref_id: params.customer_ref_id,
        customer_ref_type: params.customer_ref_type || 'manual',
        subscription_id: params.subscription_id,
        assigned_cs_agent: params.assigned_cs_agent,
        tags: params.tags || [],
        notes: params.notes || '',
        status: 'active',
        journey_stage: 'prospecting',
        onboarding_status: 'not_started',
        onboarding_progress_pct: 0,
        feature_adoption_pct: 0,
        health_score: 50,
        health_status: 'fair',
        churn_risk_score: 0,
        churn_risk_level: 'low',
        retention_status: 'active'
      });
      return Response.json({ operation: 'create_profile', profile });
    }

    // ─── UPDATE PROFILE ───
    if (operation === 'update_profile') {
      const { profile_id, ...updateData } = params;
      const profile = await base44.asServiceRole.entities.CustomerSuccessProfile.update(profile_id, updateData);
      return Response.json({ operation: 'update_profile', profile });
    }

    return Response.json({ error: 'Unknown operation: ' + operation }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// ─── HEALTH SCORE CALCULATION ───
function calculateHealthScore(profile, subscription, crmLead, interactions) {
  const factors = [];
  const signals = [];

  // Onboarding component (20%)
  const onboardingScore = (profile.onboarding_progress_pct || 0) * 0.2;
  if (profile.onboarding_status === 'stalled') { factors.push('Onboarding stalled'); signals.push('Onboarding not progressing'); }

  // Feature adoption component (20%)
  const adoptionScore = (profile.feature_adoption_pct || 0) * 0.2;
  if ((profile.feature_adoption_pct || 0) < 30) { factors.push('Low feature adoption'); }

  // Support satisfaction (15%)
  const csat = profile.support_satisfaction_score || 0;
  const nps = profile.nps_score || 0;
  const supportScore = ((csat + Math.max(0, nps)) / 2) * 0.15;
  if ((profile.support_tickets_open || 0) > 3) { factors.push(`${profile.support_tickets_open} open support tickets`); signals.push('High support burden'); }
  if (nps < 0) { factors.push('Negative NPS'); signals.push('Detractor'); }

  // Usage (25%)
  const usageFreqMap = { daily: 100, weekly: 70, monthly: 40, rare: 15, inactive: 0 };
  const usageFreqScore = (usageFreqMap[profile.usage_frequency] || 15);
  const trendMultiplier = profile.usage_trend === 'increasing' ? 1.15 : profile.usage_trend === 'stable' ? 1.0 : profile.usage_trend === 'declining' ? 0.75 : 0.5;
  const usageScore = (usageFreqScore * trendMultiplier) * 0.25;
  if (profile.usage_trend === 'declining') { factors.push('Usage declining'); signals.push('Engagement dropping'); }
  if (profile.usage_trend === 'sharp_decline') { factors.push('Sharp usage decline'); signals.push('Critical engagement loss'); }
  if (profile.usage_frequency === 'inactive' || profile.usage_frequency === 'rare') { factors.push('Rare/inactive usage'); signals.push('Low engagement'); }

  // Renewal (10%)
  let renewalScore = 50;
  const daysToRenewal = profile.renewal_date ? Math.ceil((new Date(profile.renewal_date) - new Date()) / (1000 * 60 * 60 * 24)) : 999;
  if (daysToRenewal <= 30 && daysToRenewal > 0) { renewalScore = 30; factors.push(`Renewal in ${daysToRenewal} days`); signals.push('Upcoming renewal with risk'); }
  else if (daysToRenewal <= 0) { renewalScore = 20; factors.push('Renewal overdue'); signals.push('Past renewal date'); }
  else if (daysToRenewal <= 90) { renewalScore = 60; }
  else { renewalScore = 80; }
  const renewalScoreWeighted = renewalScore * 0.10;

  // Interaction sentiment (10%)
  const recentInteractions = interactions.slice(0, 5);
  let sentimentScore = 50;
  if (recentInteractions.length > 0) {
    const sentimentValues = { positive: 100, neutral: 50, negative: 20, very_negative: 0 };
    sentimentScore = recentInteractions.reduce((s, i) => s + (sentimentValues[i.sentiment] || 50), 0) / recentInteractions.length;
  }
  const hasNegative = recentInteractions.some(i => i.sentiment === 'negative' || i.sentiment === 'very_negative');
  if (hasNegative) { factors.push('Recent negative interactions'); signals.push('Negative sentiment detected'); }
  const sentimentScoreWeighted = sentimentScore * 0.10;

  // Total health score
  const healthScore = Math.round(Math.max(0, Math.min(100, onboardingScore + adoptionScore + supportScore + usageScore + renewalScoreWeighted + sentimentScoreWeighted)));

  let healthStatus = 'critical';
  if (healthScore >= 80) healthStatus = 'excellent';
  else if (healthScore >= 65) healthStatus = 'good';
  else if (healthScore >= 45) healthStatus = 'fair';
  else if (healthScore >= 25) healthStatus = 'at_risk';

  // Churn risk = inverse of health + signal penalties
  let churnRisk = Math.max(0, 100 - healthScore);
  if (profile.usage_trend === 'sharp_decline') churnRisk = Math.min(100, churnRisk + 20);
  if (profile.usage_trend === 'declining') churnRisk = Math.min(100, churnRisk + 10);
  if (profile.onboarding_status === 'stalled') churnRisk = Math.min(100, churnRisk + 15);
  if ((profile.support_tickets_open || 0) > 5) churnRisk = Math.min(100, churnRisk + 10);
  if (hasNegative) churnRisk = Math.min(100, churnRisk + 15);
  if (daysToRenewal <= 30 && daysToRenewal > 0 && healthScore < 60) churnRisk = Math.min(100, churnRisk + 20);
  churnRisk = Math.round(Math.max(0, Math.min(100, churnRisk)));

  let churnLevel = 'low';
  if (churnRisk >= 75) churnLevel = 'critical';
  else if (churnRisk >= 50) churnLevel = 'high';
  else if (churnRisk >= 25) churnLevel = 'medium';

  // Journey stage
  let journeyStage = profile.journey_stage || 'prospecting';
  if (profile.retention_status === 'churned') journeyStage = 'churned';
  else if (churnLevel === 'critical' || churnLevel === 'high') journeyStage = 'churn_risk';
  else if (profile.onboarding_status !== 'completed') journeyStage = 'onboarding';
  else if ((profile.feature_adoption_pct || 0) > 50) journeyStage = 'adoption';
  else if (daysToRenewal <= 90) journeyStage = 'renewal';
  else if ((profile.feature_adoption_pct || 0) > 30) journeyStage = 'activation';

  // Retention status
  let retentionStatus = profile.retention_status || 'active';
  if (churnLevel === 'high' || churnLevel === 'critical') retentionStatus = 'at_risk';

  // Renewal status
  let renewalStatus = 'not_due';
  if (profile.renewal_status === 'churned' || profile.renewal_status === 'cancelled') renewalStatus = profile.renewal_status;
  else if (daysToRenewal <= 0) renewalStatus = 'at_risk';
  else if (daysToRenewal <= 30) renewalStatus = 'upcoming';

  // Founder alert
  const founderAlertRequired = churnLevel === 'critical' || (churnLevel === 'high' && (profile.mrr || 0) > 1000);
  let alertReason = '';
  let alertSeverity = 'info';
  if (founderAlertRequired) {
    alertReason = `${profile.customer_name} has ${churnLevel} churn risk (${churnRisk}/100). Health: ${healthScore}/100. Factors: ${factors.join(', ') || 'multiple risk signals'}. MRR: $${profile.mrr || 0}.`;
    alertSeverity = churnLevel === 'critical' ? 'critical' : 'urgent';
  }

  // Health trend (simplified: compare current to previous)
  const prevScore = profile.health_score || 50;
  let healthTrend = 'stable';
  if (healthScore > prevScore + 5) healthTrend = 'improving';
  else if (healthScore < prevScore - 5) healthTrend = 'declining';
  else if (healthScore < prevScore - 15) healthTrend = 'sharp_decline';

  return {
    health_score: healthScore,
    health_status: healthStatus,
    health_trend: healthTrend,
    churn_risk_score: churnRisk,
    churn_risk_level: churnLevel,
    churn_risk_factors: factors,
    churn_signals: signals,
    journey_stage: journeyStage,
    retention_status: retentionStatus,
    days_to_renewal: daysToRenewal === 999 ? 0 : daysToRenewal,
    renewal_status: renewalStatus,
    founder_alert_required: founderAlertRequired,
    alert_reason: alertReason,
    alert_severity: alertSeverity
  };
}

// ─── AI RECOMMENDATIONS ───
async function generateRecommendations(base44, atRiskCustomers, portfolioSummary) {
  const customerData = atRiskCustomers.map(c => ({
    name: c.customer_name,
    type: c.customer_type,
    health_score: c.health_score,
    health_status: c.health_status,
    churn_risk_score: c.churn_risk_score,
    churn_risk_level: c.churn_risk_level,
    churn_factors: c.churn_risk_factors,
    churn_signals: c.churn_signals,
    usage_frequency: c.usage_frequency,
    usage_trend: c.usage_trend,
    onboarding_status: c.onboarding_status,
    onboarding_progress: c.onboarding_progress_pct,
    feature_adoption_pct: c.feature_adoption_pct,
    adopted_features: c.adopted_features,
    support_tickets_open: c.support_tickets_open,
    nps_score: c.nps_score,
    mrr: c.mrr,
    renewal_date: c.renewal_date,
    days_to_renewal: c.days_to_renewal,
    journey_stage: c.journey_stage,
    assigned_cs_agent: c.assigned_cs_agent,
    last_active: c.last_active_date
  }));

  const llmRes = await base44.integrations.Core.InvokeLLM({
    prompt: `You are the NC Customer Success AI Engine. Analyze these at-risk customers and generate personalized recommendations for each.

PORTFOLIO SUMMARY:
- Total customers: ${portfolioSummary.total_customers}
- Average health: ${portfolioSummary.avg_health_score}
- Total MRR: $${portfolioSummary.total_mrr}

AT-RISK CUSTOMERS:
${JSON.stringify(customerData, null, 2)}

For EACH customer, generate:
1. OUTREACH: 1-2 recommended outreach actions (personalized message, channel, priority)
2. EDUCATION: 1-2 recommended educational resources or training topics
3. UPGRADES: 0-1 recommended plan upgrades or feature expansions (only if appropriate)
4. AI_ASSISTANCE: 1-2 recommended AI agent assignments to help this customer succeed

Also provide:
- A health_summary (1-2 sentences on why they're at risk)
- founder_alert: true if this customer needs founder intervention before churn
- alert_reason: detailed explanation if founder_alert is true

Finally, provide a portfolio_summary with:
- overall_health assessment
- key_risks (top 3)
- key_wins (if any)
- recommended_actions (top 3 for the founder)

Return as JSON.`,
    response_json_schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        customer_recommendations: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              customer_name: { type: "string" },
              health_summary: { type: "string" },
              outreach: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    action: { type: "string" },
                    message: { type: "string" },
                    priority: { type: "string" },
                    channel: { type: "string" }
                  },
                  required: ["action", "message", "priority", "channel"]
                }
              },
              education: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    topic: { type: "string" },
                    resource: { type: "string" },
                    reason: { type: "string" }
                  },
                  required: ["topic", "resource", "reason"]
                }
              },
              upgrades: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    plan: { type: "string" },
                    reason: { type: "string" },
                    expected_value: { type: "string" }
                  },
                  required: ["plan", "reason", "expected_value"]
                }
              },
              ai_assistance: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    agent: { type: "string" },
                    task: { type: "string" },
                    reason: { type: "string" }
                  },
                  required: ["agent", "task", "reason"]
                }
              },
              founder_alert: { type: "boolean" },
              alert_reason: { type: "string" }
            },
            required: ["customer_name", "health_summary", "outreach", "education", "upgrades", "ai_assistance", "founder_alert", "alert_reason"]
          }
        },
        portfolio_summary: {
          type: "object",
          additionalProperties: false,
          properties: {
            overall_health: { type: "string" },
            key_risks: { type: "array", items: { type: "string" } },
            key_wins: { type: "array", items: { type: "string" } },
            recommended_actions: { type: "array", items: { type: "string" } }
          },
          required: ["overall_health", "key_risks", "key_wins", "recommended_actions"]
        }
      },
      required: ["customer_recommendations", "portfolio_summary"]
    }
  });

  return llmRes;
}