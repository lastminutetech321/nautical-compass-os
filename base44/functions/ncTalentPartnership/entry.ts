import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const nowISO = () => new Date().toISOString();
const genKey = (p) => p + '-' + Math.random().toString(36).slice(2, 8).toUpperCase();

const DEFAULT_CAREER_LEVELS = [
  { name: 'Explorer', level_key: 'explorer', level_order: 1, min_readiness: 10, min_trust: 20, min_contribution: 0, min_experience_hours: 0, pay_recommendations: { min_hourly_rate: 15, max_hourly_rate: 20 } },
  { name: 'Apprentice', level_key: 'apprentice', level_order: 2, min_readiness: 25, min_trust: 35, min_contribution: 10, min_experience_hours: 100, pay_recommendations: { min_hourly_rate: 20, max_hourly_rate: 28 } },
  { name: 'Insurance Stagehand', level_key: 'insurance_stagehand', level_order: 3, min_readiness: 40, min_trust: 50, min_contribution: 20, min_experience_hours: 300, required_certifications: ['general_liability'], pay_recommendations: { min_hourly_rate: 28, max_hourly_rate: 38 } },
  { name: 'Stagehand', level_key: 'stagehand', level_order: 4, min_readiness: 55, min_trust: 60, min_contribution: 35, min_experience_hours: 600, pay_recommendations: { min_hourly_rate: 35, max_hourly_rate: 50 } },
  { name: 'Technician', level_key: 'technician', level_order: 5, min_readiness: 65, min_trust: 68, min_contribution: 45, min_experience_hours: 1000, required_certifications: ['technical_cert'], pay_recommendations: { min_hourly_rate: 45, max_hourly_rate: 65 } },
  { name: 'Lead Technician', level_key: 'lead_technician', level_order: 6, min_readiness: 72, min_trust: 73, min_contribution: 55, min_experience_hours: 1500, leadership_required: true, pay_recommendations: { min_hourly_rate: 55, max_hourly_rate: 80, bonus_pct: 5 } },
  { name: 'Crew Lead', level_key: 'crew_lead', level_order: 7, min_readiness: 78, min_trust: 78, min_contribution: 62, min_experience_hours: 2000, leadership_required: true, pay_recommendations: { min_hourly_rate: 65, max_hourly_rate: 95, bonus_pct: 8 } },
  { name: 'Project Manager', level_key: 'project_manager', level_order: 8, min_readiness: 83, min_trust: 82, min_contribution: 70, min_experience_hours: 3000, leadership_required: true, required_certifications: ['project_management'], pay_recommendations: { salary_range_low: 65000, salary_range_high: 95000, bonus_pct: 12, residual_pct: 1 } },
  { name: 'Operations Manager', level_key: 'operations_manager', level_order: 9, min_readiness: 87, min_trust: 85, min_contribution: 75, min_experience_hours: 4000, leadership_required: true, pay_recommendations: { salary_range_low: 85000, salary_range_high: 125000, bonus_pct: 15, residual_pct: 2 } },
  { name: 'Director', level_key: 'director', level_order: 10, min_readiness: 90, min_trust: 88, min_contribution: 82, min_experience_hours: 6000, leadership_required: true, pay_recommendations: { salary_range_low: 110000, salary_range_high: 180000, bonus_pct: 20, residual_pct: 3 } },
  { name: 'Partner', level_key: 'partner', level_order: 11, min_readiness: 93, min_trust: 92, min_contribution: 88, min_experience_hours: 8000, leadership_required: true, pay_recommendations: { salary_range_low: 150000, salary_range_high: 250000, bonus_pct: 25, residual_pct: 5 } },
  { name: 'Enterprise Builder', level_key: 'enterprise_builder', level_order: 12, min_readiness: 96, min_trust: 95, min_contribution: 93, min_experience_hours: 10000, leadership_required: true, pay_recommendations: { salary_range_low: 200000, salary_range_high: 400000, bonus_pct: 30, residual_pct: 8 } }
];

async function ensureDefaultLevels(base44) {
  try {
    const existing = await base44.asServiceRole.entities.CareerLevel.filter({ is_default_template: true });
    if (existing && existing.length) return existing.length;
    for (const lvl of DEFAULT_CAREER_LEVELS) {
      try {
        await base44.asServiceRole.entities.CareerLevel.create({ ...lvl, is_default_template: true, status: 'active' });
      } catch {}
    }
    return DEFAULT_CAREER_LEVELS.length;
  } catch { return 0; }
}

async function getWorkerScores(base44, workerId) {
  let trust = 0, contribution = 0, reputation = 0, readiness = 0, experienceHours = 0;
  try {
    const trustScores = await base44.asServiceRole.entities.TrustScore.filter({ participant_id: workerId }).catch(() => []);
    if (trustScores && trustScores[0]) trust = trustScores[0].score || trustScores[0].trust_score || 0;
  } catch {}
  try {
    const contribScores = await base44.asServiceRole.entities.ContributionScore.filter({ participant_id: workerId }).catch(() => []);
    if (contribScores && contribScores[0]) contribution = contribScores[0].score || contribScores[0].composite_score || 0;
  } catch {}
  try {
    const repScores = await base44.asServiceRole.entities.ReputationRecord.filter({ participant_id: workerId }).catch(() => []);
    if (repScores && repScores[0]) reputation = repScores[0].score || repScores[0].reputation_score || 0;
  } catch {}
  try {
    const profiles = await base44.asServiceRole.entities.WorkforceProfile.filter({ worker_id: workerId }).catch(() => []);
    if (profiles && profiles[0]) {
      readiness = profiles[0].readiness_score || 0;
      experienceHours = profiles[0].total_hours || 0;
    }
  } catch {}
  return { trust, contribution, reputation, readiness, experienceHours };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const operation = body.operation;
    const params = body.params || {};

    // ---- seed_defaults ----
    if (operation === 'seed_defaults') {
      const count = await ensureDefaultLevels(base44);
      return Response.json({ seeded: count, message: 'Default career levels ensured' });
    }

    // ---- get_career_levels ----
    if (operation === 'get_career_levels') {
      await ensureDefaultLevels(base44);
      const levels = await base44.asServiceRole.entities.CareerLevel.filter({ status: 'active' });
      const sorted = (levels || []).sort((a, b) => (a.level_order || 0) - (b.level_order || 0));
      return Response.json({ levels: sorted });
    }

    // ---- create_career_level ----
    if (operation === 'create_career_level') {
      const created = await base44.asServiceRole.entities.CareerLevel.create(params);
      return Response.json({ created });
    }

    // ---- evaluate_promotion ----
    if (operation === 'evaluate_promotion') {
      const workerId = params.worker_id;
      const scores = await getWorkerScores(base44, workerId);
      await ensureDefaultLevels(base44);
      const levels = await base44.asServiceRole.entities.CareerLevel.filter({ status: 'active' });
      const sorted = (levels || []).sort((a, b) => (a.level_order || 0) - (b.level_order || 0));

      // get worker current certs + training
      let workerCerts = [], workerTraining = [];
      try {
        const certs = await base44.asServiceRole.entities.WorkerCertification.filter({ worker_id: workerId }).catch(() => []);
        workerCerts = (certs || []).map(c => c.certification_name || c.name).filter(Boolean);
        const courses = await base44.asServiceRole.entities.TrainingCourse.filter({}).catch(() => []);
        workerTraining = (courses || []).map(c => c.course_name || c.name).filter(Boolean);
      } catch {}

      // find highest level worker qualifies for
      let currentLevel = sorted[0] || null;
      let nextLevel = null;
      const evaluation = [];
      for (const lvl of sorted) {
        const meets = (
          scores.readiness >= (lvl.min_readiness || 0) &&
          scores.trust >= (lvl.min_trust || 0) &&
          scores.contribution >= (lvl.min_contribution || 0) &&
          scores.experienceHours >= (lvl.min_experience_hours || 0)
        );
        const missingCerts = (lvl.required_certifications || []).filter(c => !workerCerts.includes(c));
        const meetsAll = meets && missingCerts.length === 0 && (!lvl.leadership_required || scores.trust >= 70);
        evaluation.push({
          level: lvl.name, level_order: lvl.level_order, meets, meetsAll,
          missing_certs: missingCerts, gap: {
            readiness: Math.max(0, (lvl.min_readiness || 0) - scores.readiness),
            trust: Math.max(0, (lvl.min_trust || 0) - scores.trust),
            contribution: Math.max(0, (lvl.min_contribution || 0) - scores.contribution),
            experience_hours: Math.max(0, (lvl.min_experience_hours || 0) - scores.experienceHours)
          }
        });
        if (meetsAll) currentLevel = lvl;
      }
      // next level = first level above current that isn't fully met
      const currentOrder = currentLevel?.level_order || 0;
      nextLevel = sorted.find(l => l.level_order > currentOrder) || null;
      return Response.json({ worker_id: workerId, scores, current_level: currentLevel, next_level: nextLevel, evaluation });
    }

    // ---- record_placement ----
    // Creates PlacementRecord + TalentAttribution + ClientRelationship + LivingLedger entries + updates scores
    if (operation === 'record_placement') {
      const p = params;
      const placementKey = genKey('PLC');
      const attrKey = genKey('ATT');
      const now = nowISO();

      // Ensure / fetch client relationship
      let clientRel = null;
      if (p.client_id) {
        try {
          const existing = await base44.asServiceRole.entities.ClientRelationship.filter({ client_ref_id: p.client_id }).catch(() => []);
          clientRel = existing && existing[0];
        } catch {}
      }
      if (!clientRel && p.client_name) {
        const clientKey = genKey('CL');
        clientRel = await base44.asServiceRole.entities.ClientRelationship.create({
          client_key: clientKey,
          client_name: p.client_name,
          client_type: p.client_type || 'business',
          client_ref_id: p.client_id || '',
          client_ref_type: p.client_ref_type || 'manual',
          introduced_by_nc: !!p.introduced_by_nc,
          assigned_through_nc: true,
          requested_by_client: !!p.requested_by_client,
          first_engagement_date: p.start_date,
          last_engagement_date: p.start_date,
          total_assignments: 1,
          total_revenue: p.total_revenue || 0,
          lifetime_value: p.total_revenue || 0,
          placement_ids: [],
          relationship_status: 'active'
        });
      }

      // Create placement
      const placement = await base44.asServiceRole.entities.PlacementRecord.create({
        placement_key: placementKey,
        worker_id: p.worker_id,
        worker_name: p.worker_name,
        client_id: p.client_id || '',
        client_name: p.client_name,
        client_relationship_id: clientRel?.id || '',
        director_id: p.director_id || '',
        director_name: p.director_name || '',
        service_model: p.service_model || 'temporary_assignment',
        role_title: p.role_title || '',
        career_level: p.career_level || '',
        start_date: p.start_date,
        end_date: p.end_date,
        status: p.status || 'active',
        rate: p.rate || 0,
        rate_type: p.rate_type || 'hourly',
        total_revenue: p.total_revenue || 0,
        conversion_eligible: !!p.conversion_eligible,
        placement_protection: p.placement_protection || { legal_review_required: true, legal_review_status: 'pending', mobility_restricted: false },
        repeat_assignment: !!p.repeat_assignment,
        repeat_client: clientRel && (clientRel.total_assignments || 0) > 1,
        audit_trail: [{ action: 'placement_created', at: now, by: user.full_name, detail: `Placement ${placementKey} created` }],
        tags: p.tags || []
      });

      // Create attribution (permanent record)
      const attribution = await base44.asServiceRole.entities.TalentAttribution.create({
        attribution_key: attrKey,
        placement_id: placement.id,
        worker_id: p.worker_id,
        worker_name: p.worker_name,
        client_id: p.client_id || '',
        client_name: p.client_name,
        director_id: p.director_id || '',
        director_name: p.director_name || '',
        recruiter_id: p.recruiter_id || '',
        recruiter_name: p.recruiter_name || '',
        referral_source_id: p.referral_source_id || '',
        referral_source_name: p.referral_source_name || '',
        referral_type: p.referral_type || 'direct',
        training_completed: p.training_completed || [],
        certifications_earned: p.certifications_earned || [],
        career_level_at_placement: p.career_level || '',
        skills_verified: p.skills_verified || [],
        date_introduced: p.date_introduced,
        date_assigned: p.start_date,
        date_completed: p.date_completed,
        revenue_generated: p.total_revenue || 0,
        customer_satisfaction: p.customer_satisfaction || 0,
        worker_satisfaction: p.worker_satisfaction || 0,
        contribution_generated: p.contribution_generated || 0,
        trust_impact: p.trust_impact || 0,
        reputation_impact: p.reputation_impact || 0,
        knowledge_captured: p.knowledge_captured || [],
        living_ledger_refs: [],
        career_passport_refs: [],
        is_permanent: true,
        status: 'active',
        tags: ['placement', p.service_model || 'temporary_assignment']
      });

      // Living Ledger entries (placement + attribution)
      const ledgerRefs = [];
      const tier = p.ledger_tier || 'free';
      try {
        const l1 = await base44.asServiceRole.entities.LivingLedgerEntry.create({
          ledger_key: genKey('LL'), worker_id: p.worker_id, worker_name: p.worker_name,
          entry_type: 'placement', tier, title: `Placement: ${p.role_title || 'Assignment'} at ${p.client_name}`,
          description: `Service model: ${p.service_model}. Revenue: $${p.total_revenue || 0}. Director: ${p.director_name || 'N/A'}.`,
          event_date: p.start_date, permanent: true, linked_placement_id: placement.id, linked_attribution_id: attribution.id,
          tags: ['placement', p.service_model || 'temporary_assignment']
        });
        ledgerRefs.push(l1.id);
      } catch {}
      try {
        const l2 = await base44.asServiceRole.entities.LivingLedgerEntry.create({
          ledger_key: genKey('LL'), worker_id: p.worker_id, worker_name: p.worker_name,
          entry_type: 'income', tier, title: `Income: ${p.role_title || 'Assignment'} — $${p.total_revenue || 0}`,
          description: `Revenue generated from ${p.client_name} placement.`,
          event_date: p.start_date, permanent: true, linked_placement_id: placement.id, tags: ['income', 'placement']
        });
        ledgerRefs.push(l2.id);
      } catch {}

      // Career Passport entry
      let passportRef = '';
      try {
        const pe = await base44.asServiceRole.entities.CareerPassportEntry.create({
          worker_id: p.worker_id, worker_name: p.worker_name,
          entry_type: 'placement',
          title: `Placement at ${p.client_name}`,
          description: `${p.role_title || 'Assignment'} — ${p.service_model}`,
          event_date: p.start_date,
          permanent: true,
          linked_ref: placement.id,
          tags: ['placement', 'talent_partnership']
        });
        passportRef = pe.id;
      } catch {}

      // Update client relationship totals
      if (clientRel) {
        try {
          await base44.asServiceRole.entities.ClientRelationship.update(clientRel.id, {
            total_assignments: (clientRel.total_assignments || 0) + 1,
            total_revenue: (clientRel.total_revenue || 0) + (p.total_revenue || 0),
            lifetime_value: (clientRel.lifetime_value || 0) + (p.total_revenue || 0),
            last_engagement_date: p.start_date,
            repeat_client: (clientRel.total_assignments || 0) >= 1,
            placement_ids: [...(clientRel.placement_ids || []), placement.id]
          });
        } catch {}
      }

      // Link ledger refs + passport back to attribution
      try {
        await base44.asServiceRole.entities.TalentAttribution.update(attribution.id, {
          living_ledger_refs: ledgerRefs,
          career_passport_refs: passportRef ? [passportRef] : []
        });
      } catch {}

      // Update contribution + trust scores (knowledge capture)
      if (p.contribution_generated) {
        try {
          await base44.asServiceRole.entities.ContributionScore.create({
            participant_id: p.worker_id, participant_name: p.worker_name, participant_type: 'workforce',
            score: p.contribution_generated, source: 'placement', description: `Placement at ${p.client_name}`,
            event_date: p.start_date
          });
        } catch {}
      }
      if (p.trust_impact) {
        try {
          await base44.asServiceRole.entities.TrustScore.create({
            participant_id: p.worker_id, participant_name: p.worker_name, participant_type: 'workforce',
            score: p.trust_impact, source: 'placement', description: `Trust from placement at ${p.client_name}`,
            event_date: p.start_date
          });
        } catch {}
      }

      return Response.json({ placement, attribution, client_relationship: clientRel, ledger_refs: ledgerRefs, passport_ref: passportRef });
    }

    // ---- complete_placement ---- (knowledge capture automation)
    if (operation === 'complete_placement') {
      const placement = await base44.asServiceRole.entities.PlacementRecord.get(params.placement_id);
      const now = nowISO();
      await base44.asServiceRole.entities.PlacementRecord.update(params.placement_id, {
        status: 'completed',
        date_completed: now,
        client_satisfaction: params.client_satisfaction || placement.client_satisfaction,
        worker_satisfaction: params.worker_satisfaction || placement.worker_satisfaction,
        performance_rating: params.performance_rating || placement.performance_rating,
        audit_trail: [...(placement.audit_trail || []), { action: 'completed', at: now, by: user.full_name, detail: 'Placement completed; knowledge captured.' }]
      });

      // Auto-update Living Ledger, Contribution, Trust, Reputation, Knowledge Graph, Memory
      const capture = { ledger: null, contribution: null, trust: null, reputation: null, memory: null };
      try {
        capture.ledger = await base44.asServiceRole.entities.LivingLedgerEntry.create({
          ledger_key: genKey('LL'), worker_id: placement.worker_id, worker_name: placement.worker_name,
          entry_type: 'client_feedback', tier: 'subscriber', title: `Client feedback: ${placement.client_name}`,
          description: `Satisfaction: ${params.client_satisfaction || 0}/100. Performance: ${params.performance_rating || 0}/5.`,
          event_date: now.slice(0, 10), permanent: true, linked_placement_id: placement.id, ai_organized: true,
          tags: ['completion', 'feedback']
        });
      } catch {}
      try {
        capture.contribution = await base44.asServiceRole.entities.ContributionScore.create({
          participant_id: placement.worker_id, participant_name: placement.worker_name, participant_type: 'workforce',
          score: Math.round((params.client_satisfaction || 0) / 10), source: 'placement_completion',
          description: `Completed placement at ${placement.client_name}`, event_date: now.slice(0, 10)
        });
      } catch {}
      try {
        capture.trust = await base44.asServiceRole.entities.TrustScore.create({
          participant_id: placement.worker_id, participant_name: placement.worker_name, participant_type: 'workforce',
          score: Math.round((params.client_satisfaction || 0) / 10), source: 'placement_completion',
          description: `Trust reinforced by completed ${placement.client_name} placement`, event_date: now.slice(0, 10)
        });
      } catch {}
      try {
        capture.reputation = await base44.asServiceRole.entities.ReputationRecord.create({
          participant_id: placement.worker_id, participant_name: placement.worker_name, participant_type: 'workforce',
          score: Math.round((params.performance_rating || 0) * 20), source: 'placement_completion',
          description: `Reputation from ${placement.client_name}`, event_date: now.slice(0, 10)
        });
      } catch {}
      try {
        capture.memory = await base44.asServiceRole.entities.NCOSMemory.create({
          title: `Placement completed: ${placement.worker_name} @ ${placement.client_name}`,
          content: `Role: ${placement.role_title}. Model: ${placement.service_model}. Revenue: $${placement.total_revenue}. Satisfaction: ${params.client_satisfaction || 0}.`,
          memory_type: 'workforce',
          tags: ['placement', 'knowledge_capture', 'talent_partnership']
        });
      } catch {}

      return Response.json({ completed: true, knowledge_captured: capture });
    }

    // ---- get_client_relationship ----
    if (operation === 'get_client_relationship') {
      const rels = await base44.asServiceRole.entities.ClientRelationship.list('-lifetime_value', 200);
      return Response.json({ relationships: rels });
    }

    // ---- create_alumni ----
    if (operation === 'create_alumni') {
      const created = await base44.asServiceRole.entities.AlumniProfile.create({
        alumni_key: genKey('ALM'),
        ...params
      });
      return Response.json({ created });
    }

    // ---- get_alumni_dashboard ----
    if (operation === 'get_alumni_dashboard') {
      const alumni = await base44.asServiceRole.entities.AlumniProfile.list('-departed_date', 200);
      const byRole = {};
      for (const a of alumni) { byRole[a.alumni_role] = (byRole[a.alumni_role] || 0) + 1; }
      const returned = alumni.filter(a => a.return_to_nc).length;
      const mentors = alumni.filter(a => a.alumni_role === 'mentor').length;
      const referrals = alumni.reduce((s, a) => s + (a.referral_count || 0), 0);
      const totalValue = alumni.reduce((s, a) => s + (a.relationship_value || 0), 0);
      return Response.json({ alumni, by_role: byRole, returned, mentors, total_referrals: referrals, total_relationship_value: totalValue, total_alumni: alumni.length });
    }

    // ---- add_ledger_entry ----
    if (operation === 'add_ledger_entry') {
      const entry = await base44.asServiceRole.entities.LivingLedgerEntry.create({
        ledger_key: genKey('LL'),
        ...params
      });
      return Response.json({ created: entry });
    }

    // ---- get_worker_ledger ----
    if (operation === 'get_worker_ledger') {
      const entries = await base44.asServiceRole.entities.LivingLedgerEntry.filter({ worker_id: params.worker_id }, '-event_date', 100);
      return Response.json({ entries });
    }

    // ---- get_executive_metrics ----
    if (operation === 'get_executive_metrics') {
      const placements = await base44.asServiceRole.entities.PlacementRecord.list('-created_date', 500);
      const attributions = await base44.asServiceRole.entities.TalentAttribution.list('-created_date', 500);
      const alumni = await base44.asServiceRole.entities.AlumniProfile.list('-created_date', 200);
      const clientRels = await base44.asServiceRole.entities.ClientRelationship.list('-lifetime_value', 200);
      const workers = await base44.asServiceRole.entities.WorkforceProfile.list('-created_date', 500).catch(() => []);

      const activeWorkers = (workers || []).length;
      const readyWorkers = (workers || []).filter(w => (w.readiness_score || 0) >= 70).length;
      const promotedWorkers = attributions.filter(a => a.career_level_at_placement).length;
      const repeatAssignments = placements.filter(p => p.repeat_assignment).length;
      const repeatClients = clientRels.filter(c => c.repeat_client).length;
      const totalRevenue = placements.reduce((s, p) => s + (p.total_revenue || 0), 0);
      const ltvByClient = clientRels.reduce((s, c) => s + (c.lifetime_value || 0), 0);
      const activePlacements = placements.filter(p => p.status === 'active').length;
      const completed = placements.filter(p => p.status === 'completed').length;
      const conversions = placements.filter(p => p.converted_to_direct).length;
      const avgSatisfaction = placements.length ? (placements.reduce((s, p) => s + (p.client_satisfaction || 0), 0) / placements.length) : 0;
      const enterprisePartners = clientRels.filter(c => c.enterprise_partner).length;
      const alumniActive = alumni.filter(a => a.alumni_status === 'active').length;
      const alumniReturned = alumni.filter(a => a.return_to_nc).length;
      const directorPerformance = {};
      for (const a of attributions) {
        if (!a.director_name) continue;
        if (!directorPerformance[a.director_name]) directorPerformance[a.director_name] = { placements: 0, revenue: 0, satisfaction: 0 };
        directorPerformance[a.director_name].placements++;
        directorPerformance[a.director_name].revenue += a.revenue_generated || 0;
        directorPerformance[a.director_name].satisfaction += a.customer_satisfaction || 0;
      }

      return Response.json({
        active_workers: activeWorkers,
        workers_ready: readyWorkers,
        workers_training: Math.max(0, activeWorkers - readyWorkers),
        workers_promoted: promotedWorkers,
        active_placements: activePlacements,
        completed_placements: completed,
        direct_hire_conversions: conversions,
        repeat_assignments: repeatAssignments,
        repeat_clients: repeatClients,
        enterprise_partnerships: enterprisePartners,
        alumni_network: alumniActive,
        alumni_returned: alumniReturned,
        revenue_by_workforce: totalRevenue,
        lifetime_value_by_client: ltvByClient,
        avg_client_satisfaction: Math.round(avgSatisfaction),
        director_performance: directorPerformance,
        total_client_relationships: clientRels.length
      });
    }

    // ---- ai_career_coach ----
    if (operation === 'ai_career_coach') {
      const workerId = params.worker_id;
      const scores = await getWorkerScores(base44, workerId);
      await ensureDefaultLevels(base44);
      const levels = await base44.asServiceRole.entities.CareerLevel.filter({ status: 'active' });
      const sorted = (levels || []).sort((a, b) => (a.level_order || 0) - (b.level_order || 0));
      const ledger = await base44.asServiceRole.entities.LivingLedgerEntry.filter({ worker_id: workerId }, '-event_date', 20).catch(() => []);

      const prompt = `You are the NC Career Coach for the Nautical Compass Workforce Gateway. Given a worker's current scores and career history, produce a personalized career development plan. Scores: trust=${scores.trust}, contribution=${scores.contribution}, readiness=${scores.readiness}, experience_hours=${scores.experienceHours}. Available career levels: ${sorted.map(l => `${l.name} (min readiness ${l.min_readiness}, trust ${l.min_trust}, contribution ${l.min_contribution})`).join('; ')}. Recent ledger: ${(ledger || []).slice(0, 5).map(e => `${e.entry_type}: ${e.title}`).join('; ') || 'none'}. Return JSON with: current_level_estimate, next_level, gap_analysis (array of strings), recommended_training (array), recommended_actions (array of 3-5 next steps), 30_day_goals (array), 90_day_goals (array), pay_recommendation (object with suggested_rate_range), motivation_note (string).`;
      const res = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            current_level_estimate: { type: 'string' },
            next_level: { type: 'string' },
            gap_analysis: { type: 'array', items: { type: 'string' } },
            recommended_training: { type: 'array', items: { type: 'string' } },
            recommended_actions: { type: 'array', items: { type: 'string' } },
            thirty_day_goals: { type: 'array', items: { type: 'string' } },
            ninety_day_goals: { type: 'array', items: { type: 'string' } },
            pay_recommendation: { type: 'object' },
            motivation_note: { type: 'string' }
          }
        }
      });
      const plan = res.data || res;
      // Save as ledger entry
      try {
        await base44.asServiceRole.entities.LivingLedgerEntry.create({
          ledger_key: genKey('LL'), worker_id: workerId, worker_name: params.worker_name || 'worker',
          entry_type: 'recommendation', tier: 'subscriber', title: 'AI Career Coach Plan',
          description: plan.motivation_note || 'Career development plan generated.', event_date: nowISO().slice(0, 10),
          metadata: plan, ai_organized: true, tags: ['career_coach', 'recommendation']
        });
      } catch {}
      return Response.json({ plan, scores });
    }

    return Response.json({ error: 'Unknown operation: ' + operation }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});