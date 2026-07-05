import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const operation = body.operation || 'sync_all';
    const params = body.params || {};
    const b = base44.asServiceRole.entities;

    if (operation === 'sync_all') {
      const [subscriptions, csProfiles, convertedLeads, enterprises] = await Promise.all([
        b.Subscription.list('-created_date', 500),
        b.CustomerSuccessProfile.list('-created_date', 500),
        b.CRMLead.filter({ status: 'converted' }, '-created_date', 200),
        b.EnterpriseOrg.filter({ status: 'active' }, '-created_date', 200)
      ]);

      const existingKeys = new Set(csProfiles.map(p => (p.customer_email || p.customer_ref_id || '').toLowerCase()));
      const created = [];

      for (const sub of subscriptions) {
        const key = (sub.customer_email || sub.id).toLowerCase();
        if (existingKeys.has(key)) continue;
        existingKeys.add(key);
        const profile = await b.CustomerSuccessProfile.create({
          customer_name: sub.customer_name || 'Unknown',
          customer_email: sub.customer_email || '',
          customer_type: 'subscription',
          customer_ref_id: sub.id, customer_ref_type: 'subscription',
          subscription_id: sub.id, subscription_plan: sub.plan_name,
          subscription_status: sub.status, mrr: sub.mrr || 0,
          contract_value: sub.arr || 0,
          journey_stage: sub.status === 'trialing' ? 'onboarding' : 'adoption',
          onboarding_status: sub.status === 'trialing' ? 'in_progress' : 'completed',
          status: 'active'
        });
        created.push({ id: profile.id, source: 'subscription', name: profile.customer_name });
      }

      for (const lead of convertedLeads) {
        const key = (lead.email || lead.id).toLowerCase();
        if (existingKeys.has(key)) continue;
        existingKeys.add(key);
        const profile = await b.CustomerSuccessProfile.create({
          customer_name: lead.name || lead.company || 'Unknown',
          customer_email: lead.email || '',
          customer_type: lead.company ? 'enterprise' : 'individual',
          customer_ref_id: lead.id, customer_ref_type: 'crm_lead',
          journey_stage: 'onboarding', onboarding_status: 'in_progress', status: 'active'
        });
        created.push({ id: profile.id, source: 'crm_lead', name: profile.customer_name });
      }

      for (const ent of enterprises) {
        const key = (ent.name || ent.id).toLowerCase();
        if (existingKeys.has(key)) continue;
        existingKeys.add(key);
        const profile = await b.CustomerSuccessProfile.create({
          customer_name: ent.name,
          customer_type: 'enterprise',
          customer_ref_id: ent.id, customer_ref_type: 'enterprise_org',
          contract_value: ent.contract_value || 0,
          journey_stage: 'onboarding', onboarding_status: 'in_progress', status: 'active'
        });
        created.push({ id: profile.id, source: 'enterprise_org', name: profile.customer_name });
      }

      return Response.json({ operation, profiles_created: created.length, created });
    }

    if (operation === 'sync_subscription') {
      const sub = params.subscription;
      if (!sub) return Response.json({ error: 'subscription required' }, { status: 400 });
      const existing = await b.CustomerSuccessProfile.filter({ customer_ref_id: sub.id });
      if (existing.length > 0) return Response.json({ status: 'already_exists', profile_id: existing[0].id });
      const profile = await b.CustomerSuccessProfile.create({
        customer_name: sub.customer_name || 'Unknown',
        customer_email: sub.customer_email || '',
        customer_type: 'subscription', customer_ref_id: sub.id, customer_ref_type: 'subscription',
        subscription_id: sub.id, subscription_plan: sub.plan_name,
        subscription_status: sub.status, mrr: sub.mrr || 0, contract_value: sub.arr || 0,
        journey_stage: sub.status === 'trialing' ? 'onboarding' : 'adoption',
        onboarding_status: sub.status === 'trialing' ? 'in_progress' : 'completed', status: 'active'
      });
      return Response.json({ status: 'created', profile_id: profile.id });
    }

    if (operation === 'update_usage') {
      const profiles = await b.CustomerSuccessProfile.filter({ status: 'active' }, '-created_date', 200);
      const usageEvents = await b.ModuleUsageEvent.list('-created_date', 1000);
      let updated = 0;
      for (const profile of profiles) {
        const userEvents = usageEvents.filter(e =>
          e.created_by_id === profile.assigned_cs_agent_id ||
          (profile.customer_email && e.user_email === profile.customer_email)
        );
        const sessions30d = userEvents.filter(e => {
          const days = (Date.now() - new Date(e.created_date).getTime()) / 86400000;
          return days <= 30;
        }).length;
        const features = new Set(userEvents.map(e => e.module_name).filter(Boolean));
        if (sessions30d !== profile.sessions_30d || features.size !== profile.key_features_used) {
          await b.CustomerSuccessProfile.update(profile.id, {
            sessions_30d: sessions30d,
            active_days_30d: Math.min(30, sessions30d),
            key_features_used: features.size,
            adopted_features: Array.from(features),
            last_active_date: userEvents[0]?.created_date || profile.last_active_date,
            usage_frequency: sessions30d > 20 ? 'daily' : sessions30d > 5 ? 'weekly' : sessions30d > 0 ? 'monthly' : 'inactive',
            usage_trend: sessions30d > profile.sessions_30d ? 'increasing' : sessions30d < profile.sessions_30d ? 'declining' : profile.usage_trend
          });
          updated++;
        }
      }
      return Response.json({ operation, profiles_updated: updated });
    }

    return Response.json({ error: 'Unknown operation: ' + operation }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});