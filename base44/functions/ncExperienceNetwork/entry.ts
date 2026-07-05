import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const operation = body.operation || 'dashboard';
    const params = body.params || {};
    const b = base44.asServiceRole.entities;

    if (operation === 'dashboard') {
      const [venues, providers, events, reports] = await Promise.all([
        b.Venue.list('-created_date', 200),
        b.EventProvider.list('-created_date', 200),
        b.Event.list('-created_date', 200),
        b.EventReport.list('-created_date', 100)
      ]);

      const activeVenues = venues.filter(v => v.status === 'active');
      const eventReady = venues.filter(v => v.event_ready);
      const verifiedProviders = providers.filter(p => p.verification_status === 'verified');
      const completedEvents = events.filter(e => e.status === 'completed');
      const totalRevenue = completedEvents.reduce((s, e) => s + (e.total_revenue || 0), 0);
      const totalProfit = completedEvents.reduce((s, e) => s + (e.net_profit || 0), 0);

      return Response.json({
        operation,
        venues: { total: venues.length, active: activeVenues.length, event_ready: eventReady.length },
        providers: { total: providers.length, verified: verifiedProviders.length },
        events: { total: events.length, completed: completedEvents.length, live: events.filter(e => e.status === 'live').length },
        revenue: { total_event_revenue: totalRevenue, total_profit: totalProfit, avg_per_event: completedEvents.length ? totalRevenue / completedEvents.length : 0 },
        reports: reports.length
      });
    }

    if (operation === 'optimize_venue') {
      const venue = params.venue;
      if (!venue?.id) return Response.json({ error: 'venue.id required' }, { status: 400 });
      const potential = Math.round((venue.capacity || 100) * 25 * 4);
      const uplift = Math.max(0, potential - (venue.current_monthly_revenue || 0));
      const updated = await b.Venue.update(venue.id, {
        event_revenue_potential: potential,
        target_monthly_revenue: (venue.current_monthly_revenue || 0) + uplift
      });
      return Response.json({ operation, venue_id: venue.id, event_revenue_potential: potential, monthly_uplift: uplift });
    }

    if (operation === 'assess_readiness') {
      const { venue_id, scores } = params;
      if (!venue_id || !scores) return Response.json({ error: 'venue_id and scores required' }, { status: 400 });
      const scoreValues = Object.values(scores);
      const overall = Math.round(scoreValues.reduce((s, v) => s + v, 0) / scoreValues.length);
      const level = overall >= 80 ? 'venue_certified' : overall >= 60 ? 'event_capable' : overall >= 40 ? 'developing' : overall >= 20 ? 'early_stage' : 'not_ready';
      const gaps = Object.entries(scores).filter(([, v]) => v < 50).map(([k, v]) => ({ area: k, score: v, recommendation: getGapRecommendation(k) }));
      const recommendations = gaps.map(g => g.recommendation);
      const venue = await b.Venue.get(venue_id);
      const assessment = await b.EventReadinessAssessment.create({
        venue_id, venue_name: venue?.name || '',
        assessment_date: new Date().toISOString().split('T')[0],
        scores, overall_readiness_score: overall, readiness_level: level,
        gaps, recommendations,
        estimated_investment: gaps.length * 500,
        estimated_roi_months: gaps.length > 5 ? 8 : gaps.length > 2 ? 4 : 2,
        assessed_by: user.full_name || 'NC Experience Network',
        status: 'active'
      });
      await b.Venue.update(venue_id, { readiness_score: overall, event_ready: overall >= 60 });
      return Response.json({ operation, assessment_id: assessment.id, overall_score: overall, level, gaps_count: gaps.length });
    }

    if (operation === 'create_provider') {
      const data = params.provider;
      if (!data?.name || !data?.provider_type) return Response.json({ error: 'name and provider_type required' }, { status: 400 });
      const provider = await b.EventProvider.create({
        ...data, trust_score: 50, contribution_score: 0,
        verification_status: 'pending', status: 'active',
        events_completed: 0, total_revenue_generated: 0
      });
      return Response.json({ operation, provider_id: provider.id, status: 'created', verification_status: 'pending' });
    }

    if (operation === 'generate_event_report') {
      const { event_id } = params;
      if (!event_id) return Response.json({ error: 'event_id required' }, { status: 400 });
      const event = await b.Event.get(event_id);
      if (!event) return Response.json({ error: 'Event not found' }, { status: 404 });
      const venue = event.venue_id ? await b.Venue.get(event.venue_id) : null;
      const baseline = venue?.current_monthly_revenue ? venue.current_monthly_revenue / 30 : 0;
      const eventDayRev = event.total_revenue || 0;
      const uplift = baseline > 0 ? Math.round((eventDayRev / baseline - 1) * 100) : 0;
      const report = await b.EventReport.create({
        event_id, event_title: event.title,
        venue_id: event.venue_id, venue_name: event.venue_name,
        report_date: new Date().toISOString().split('T')[0],
        venue_revenue_baseline: Math.round(baseline),
        venue_revenue_event_day: eventDayRev,
        revenue_uplift_pct: uplift,
        attendance_expected: event.expected_attendance,
        attendance_actual: event.actual_attendance,
        attendance_pct: event.expected_attendance ? Math.round(event.actual_attendance / event.expected_attendance * 100) : 0,
        customer_satisfaction_score: 75,
        total_revenue: event.total_revenue || 0,
        total_expenses: event.total_expenses || 0,
        net_profit: event.net_profit || 0,
        future_recommendations: [
          'Increase marketing for next event',
          'Optimize staffing based on attendance patterns',
          'Expand provider network for better rates'
        ],
        generated_by: 'NC Experience Network',
        status: 'generated'
      });
      if (venue) {
        await b.Venue.update(venue.id, {
          events_hosted: (venue.events_hosted || 0) + 1,
          total_event_revenue: (venue.total_event_revenue || 0) + eventDayRev,
          avg_event_revenue: Math.round(((venue.total_event_revenue || 0) + eventDayRev) / ((venue.events_hosted || 0) + 1))
        });
      }
      return Response.json({ operation, report_id: report.id, revenue_uplift_pct: uplift });
    }

    if (operation === 'event_operations') {
      const { event_id, role_view } = params;
      if (!event_id) return Response.json({ error: 'event_id required' }, { status: 400 });
      const event = await b.Event.get(event_id);
      if (!event) return Response.json({ error: 'Event not found' }, { status: 404 });
      const viewData = buildRoleView(event, role_view || 'venue');
      return Response.json({ operation, event, role_view: role_view || 'venue', view_data: viewData });
    }

    return Response.json({ error: 'Unknown operation' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function getGapRecommendation(area) {
  const recs = {
    occupancy: 'Optimize floor plan for flexible seating',
    sound_system: 'Invest in basic PA system or partner with AV provider',
    tvs_screens: 'Add display screens for visual content',
    stage: 'Install modular stage or riser platform',
    lighting: 'Upgrade to programmable LED lighting',
    internet: 'Upgrade to business-grade broadband',
    cameras: 'Install security and event recording cameras',
    seating: 'Add flexible, stackable seating options',
    security: 'Contract with licensed security provider',
    staffing: 'Train staff on event operations',
    permits_checklists: 'Obtain necessary event permits',
    insurance: 'Add event liability insurance rider',
    accessibility: 'Ensure ADA compliance for events',
    parking: 'Secure overflow parking arrangements',
    food_beverage: 'Develop event menu or partner with caterer'
  };
  return recs[area] || `Address ${area} gap`;
}

function buildRoleView(event, role) {
  const views = {
    venue: { focus: 'Venue readiness and capacity', tasks: event.tasks?.filter(t => t.venue_owner) || [], metrics: { capacity: event.capacity, attendance: event.actual_attendance } },
    nc_project_manager: { focus: 'Overall event coordination', tasks: event.tasks || [], metrics: { budget: event.budget, revenue: event.total_revenue } },
    artist: { focus: 'Performance setup and schedule', tasks: event.tasks?.filter(t => t.artist) || [], metrics: { stage_time: event.start_time, set_duration: event.end_time } },
    promoter: { focus: 'Marketing and ticket sales', tasks: event.tasks?.filter(t => t.promoter) || [], metrics: { expected: event.expected_attendance, actual: event.actual_attendance } },
    security: { focus: 'Safety and crowd management', tasks: event.tasks?.filter(t => t.security) || [], metrics: { capacity: event.capacity, attendance: event.actual_attendance } },
    production: { focus: 'AV, lighting, and stage', tasks: event.tasks?.filter(t => t.production) || [], metrics: { setup_complete: true } },
    staff: { focus: 'Service and operations', tasks: event.tasks?.filter(t => t.staff) || [], metrics: { headcount: 0 } },
    finance: { focus: 'Revenue, expenses, and profit', tasks: event.tasks?.filter(t => t.finance) || [], metrics: { revenue: event.total_revenue, expenses: event.total_expenses, profit: event.net_profit } }
  };
  return views[role] || views.venue;
}