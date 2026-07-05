import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { operation, params } = body;

    const PROFILE_STAGES = [
      { key: "interest", order: 0, name: "Interest", next: "profile" },
      { key: "profile", order: 1, name: "Workforce Profile", next: "assessment" },
      { key: "assessment", order: 2, name: "Assessment", next: "training" },
      { key: "training", order: 3, name: "Training", next: "compliance" },
      { key: "compliance", order: 4, name: "Compliance Review", next: "readiness" },
      { key: "readiness", order: 5, name: "Readiness Evaluation", next: "mentor_assignment" },
      { key: "mentor_assignment", order: 6, name: "Mentor Assignment", next: "eligible" },
      { key: "eligible", order: 7, name: "Eligible for Work", next: "assignments" },
      { key: "assignments", order: 8, name: "Assignments", next: "performance_review" },
      { key: "performance_review", order: 9, name: "Performance Reviews", next: "career_advancement" },
      { key: "career_advancement", order: 10, name: "Career Advancement", next: null }
    ];

    // ── DASHBOARD (Director Workspace) ──────────────────────────
    if (operation === 'dashboard') {
      const [profiles, assessments, coachingNotes, passportEntries, templates, stages] = await Promise.all([
        base44.asServiceRole.entities.WorkforceProfile.list('-created_date', 500),
        base44.asServiceRole.entities.WorkforceAssessment.list('-created_date', 100),
        base44.asServiceRole.entities.CoachingNote.list('-created_date', 200),
        base44.asServiceRole.entities.CareerPassportEntry.list('-created_date', 200),
        base44.asServiceRole.entities.IndustryTemplate.filter({ status: 'active' }),
        base44.asServiceRole.entities.CareerPipelineStage.filter({ status: 'active' }, 'stage_order')
      ]);

      const newApplicants = profiles.filter(p => p.pipeline_stage === 'interest' || p.pipeline_stage === 'profile');
      const awaitingOnboarding = profiles.filter(p => p.pipeline_stage === 'assessment' || p.pipeline_stage === 'training');
      const inTraining = profiles.filter(p => p.pipeline_stage === 'training');
      const readyForAssignments = profiles.filter(p => p.pipeline_stage === 'eligible' || p.pipeline_stage === 'assignments');
      const needingFollowup = profiles.filter(p => {
        if (!p.last_coaching_date) return false;
        const daysSince = (Date.now() - new Date(p.last_coaching_date).getTime()) / 86400000;
        return daysSince > 14 && p.status === 'active';
      });
      const mentorshipAssignments = profiles.filter(p => p.assigned_mentor_id && p.pipeline_stage !== 'career_advancement');
      const complianceAlerts = profiles.filter(p => p.compliance_status === 'non_compliant' || p.compliance_status === 'suspended' || p.background_check_status === 'failed');

      const recentAssignments = passportEntries.filter(e => e.entry_type === 'assignment');
      const avgPerformance = profiles.length > 0
        ? Math.round(profiles.reduce((s, p) => s + (p.avg_performance_score || 0), 0) / profiles.length)
        : 0;

      // Career advancement recommendations
      const advancementRecs = [];
      for (const p of profiles) {
        if (!p.industry_template_id || !p.current_level) continue;
        const template = templates.find(t => t.id === p.industry_template_id);
        if (!template || !template.levels) continue;
        const currentLevel = template.levels.find(l => l.level_name === p.current_level);
        if (!currentLevel) continue;
        const nextLevel = template.levels.find(l => l.level_order === (currentLevel.level_order + 1));
        if (nextLevel && (p.readiness_score || 0) >= (nextLevel.min_readiness_score || 0) && (p.assignments_completed || 0) >= 3) {
          advancementRecs.push({ worker_id: p.id, worker_name: p.full_name, current_level: p.current_level, recommended_level: nextLevel.level_name, readiness: p.readiness_score });
        }
      }

      const nextActions = [];
      if (newApplicants.length > 0) nextActions.push({ action: `Review ${newApplicants.length} new applicant(s)`, priority: 'high' });
      if (complianceAlerts.length > 0) nextActions.push({ action: `Resolve ${complianceAlerts.length} compliance alert(s)`, priority: 'critical' });
      if (awaitingOnboarding.length > 0) nextActions.push({ action: `Begin onboarding for ${awaitingOnboarding.length} worker(s)`, priority: 'high' });
      if (needingFollowup.length > 0) nextActions.push({ action: `Follow up with ${needingFollowup.length} worker(s) overdue for coaching`, priority: 'medium' });
      if (advancementRecs.length > 0) nextActions.push({ action: `Review ${advancementRecs.length} career advancement recommendation(s)`, priority: 'medium' });

      return Response.json({
        operation: 'dashboard',
        metrics: {
          total_workers: profiles.length,
          new_applicants: newApplicants.length,
          awaiting_onboarding: awaitingOnboarding.length,
          in_training: inTraining.length,
          ready_for_assignments: readyForAssignments.length,
          needing_followup: needingFollowup.length,
          mentorship_assignments: mentorshipAssignments.length,
          compliance_alerts: complianceAlerts.length,
          avg_readiness: profiles.length > 0 ? Math.round(profiles.reduce((s, p) => s + (p.readiness_score || 0), 0) / profiles.length) : 0,
          avg_trust: profiles.length > 0 ? Math.round(profiles.reduce((s, p) => s + (p.trust_score || 0), 0) / profiles.length) : 0,
          avg_contribution: profiles.length > 0 ? Math.round(profiles.reduce((s, p) => s + (p.contribution_score || 0), 0) / profiles.length) : 0,
          avg_performance: avgPerformance,
          assignments_completed: profiles.reduce((s, p) => s + (p.assignments_completed || 0), 0),
          hours_worked_total: profiles.reduce((s, p) => s + (p.hours_worked_total || 0), 0),
          training_completion_pct: profiles.filter(p => p.training_completed?.length > 0).length / Math.max(profiles.length, 1) * 100,
          retention_pct: profiles.filter(p => p.status === 'active' || p.status === 'assigned').length / Math.max(profiles.length, 1) * 100,
        },
        new_applicants: newApplicants,
        awaiting_onboarding: awaitingOnboarding,
        in_training: inTraining,
        ready_for_assignments: readyForAssignments,
        needing_followup: needingFollowup,
        mentorship_assignments: mentorshipAssignments,
        compliance_alerts: complianceAlerts,
        advancement_recommendations: advancementRecs,
        next_actions: nextActions,
        pipeline_stages: stages.length > 0 ? stages : PROFILE_STAGES,
        industry_templates: templates,
        recent_coaching: coachingNotes.slice(0, 10),
        performance_trend: recentAssignments.slice(-20).map(a => ({ date: a.entry_date, rating: a.supervisor_rating, worker: a.worker_name }))
      });
    }

    // ── EXECUTIVE METRICS (for Executive Command) ──────────────────────────
    if (operation === 'executive_metrics') {
      const [profiles, passportEntries, templates, coachingNotes] = await Promise.all([
        base44.asServiceRole.entities.WorkforceProfile.list('-created_date', 500),
        base44.asServiceRole.entities.CareerPassportEntry.list('-created_date', 500),
        base44.asServiceRole.entities.IndustryTemplate.filter({ status: 'active' }),
        base44.asServiceRole.entities.CoachingNote.list('-created_date', 500)
      ]);

      const applicants = profiles.filter(p => p.pipeline_stage === 'interest' || p.pipeline_stage === 'profile').length;
      const workersReady = profiles.filter(p => p.pipeline_stage === 'eligible').length;
      const workersInTraining = profiles.filter(p => p.pipeline_stage === 'training').length;
      const assignmentsCompleted = profiles.reduce((s, p) => s + (p.assignments_completed || 0), 0);
      const avgReadiness = profiles.length > 0 ? Math.round(profiles.reduce((s, p) => s + (p.readiness_score || 0), 0) / profiles.length) : 0;
      const avgTrust = profiles.length > 0 ? Math.round(profiles.reduce((s, p) => s + (p.trust_score || 0), 0) / profiles.length) : 0;
      const avgContribution = profiles.length > 0 ? Math.round(profiles.reduce((s, p) => s + (p.contribution_score || 0), 0) / profiles.length) : 0;
      const trainingCompletion = profiles.filter(p => p.training_completed?.length > 0).length / Math.max(profiles.length, 1) * 100;
      const retention = profiles.filter(p => p.status === 'active' || p.status === 'assigned').length / Math.max(profiles.length, 1) * 100;

      const industryGrowth = templates.map(t => ({
        industry: t.name,
        workers: profiles.filter(p => p.industry_template_id === t.id).length
      }));

      const directorIds = [...new Set(profiles.filter(p => p.assigned_director_id).map(p => p.assigned_director_id))];
      const directorEffectiveness = directorIds.map(dId => {
        const directorWorkers = profiles.filter(p => p.assigned_director_id === dId);
        return {
          director_id: dId,
          director_name: directorWorkers[0]?.assigned_director_name || 'Unknown',
          workers: directorWorkers.length,
          avg_readiness: directorWorkers.length > 0 ? Math.round(directorWorkers.reduce((s, p) => s + (p.readiness_score || 0), 0) / directorWorkers.length) : 0,
          avg_performance: directorWorkers.length > 0 ? Math.round(directorWorkers.reduce((s, p) => s + (p.avg_performance_score || 0), 0) / directorWorkers.length) : 0
        };
      });

      const revenueGenerated = passportEntries.filter(e => e.entry_type === 'assignment').reduce((s, e) => s + (e.hours_worked || 0) * 45, 0);

      const healthDeclining = avgReadiness < 50 || retention < 70 || trainingCompletion < 40;
      const recommendedActions = [];
      if (avgReadiness < 50) recommendedActions.push("Workforce readiness below 50% — increase training and mentorship assignments");
      if (retention < 70) recommendedActions.push("Retention below 70% — review coaching frequency and worker engagement");
      if (trainingCompletion < 40) recommendedActions.push("Training completion low — assign training modules to pending workers");
      if (profiles.filter(p => p.compliance_status === 'non_compliant').length > 0) recommendedActions.push("Non-compliant workers detected — resolve compliance issues immediately");
      if (profiles.filter(p => p.pipeline_stage === 'interest' && new Date(p.created_date) < new Date(Date.now() - 7 * 86400000)).length > 0) recommendedActions.push("Applicants stalled in Interest stage — advance to assessment");

      return Response.json({
        operation: 'executive_metrics',
        metrics: {
          applicants,
          workers_ready: workersReady,
          workers_in_training: workersInTraining,
          assignments_completed: assignmentsCompleted,
          avg_readiness: avgReadiness,
          avg_trust: avgTrust,
          avg_contribution: avgContribution,
          training_completion_pct: Math.round(trainingCompletion),
          retention_pct: Math.round(retention),
          industry_growth: industryGrowth,
          director_effectiveness: directorEffectiveness,
          revenue_generated: revenueGenerated,
          total_workers: profiles.length,
          coaching_notes_total: coachingNotes.length,
          health_declining: healthDeclining,
          recommended_actions: recommendedActions
        }
      });
    }

    // ── CREATE PROFILE ──────────────────────────
    if (operation === 'create_profile') {
      const p = params;
      const fullName = `${p.first_name} ${p.last_name}`;
      const stage = PROFILE_STAGES.find(s => s.key === 'profile');
      const created = await base44.entities.WorkforceProfile.create({
        ...p,
        full_name: fullName,
        pipeline_stage: 'profile',
        pipeline_stage_order: stage.order,
        status: 'prospective',
        readiness_score: 0,
        readiness_level: 'needs_review',
        trust_score: 50,
        contribution_score: 0,
        reputation_score: 50,
        compliance_status: 'pending',
        pipeline_history: [{ stage: 'interest', date: new Date().toISOString(), action: 'Profile created' }]
      });

      await base44.asServiceRole.entities.CareerPassportEntry.create({
        worker_profile_id: created.id,
        worker_name: fullName,
        entry_type: 'milestone',
        title: 'Workforce Profile Created',
        description: `${fullName} entered the NC Workforce Gateway`,
        entry_date: new Date().toISOString(),
        level: p.desired_position || 'Explorer',
        verified: true,
        verified_by: user.full_name || 'System'
      });

      await base44.asServiceRole.entities.KnowledgeNode.create({
        title: `Workforce: ${fullName}`,
        node_type: 'workforce_profile',
        source_entity_type: 'WorkforceProfile',
        source_entity_id: created.id,
        description: `Workforce profile for ${fullName} — ${p.desired_position || 'General'} (${p.experience_level || 'entry'})`,
        tags: ['workforce', p.experience_level || 'entry', p.desired_position || 'general'].filter(Boolean)
      }).catch(() => {});

      return Response.json({ operation: 'create_profile', profile: created });
    }

    // ── UPDATE PROFILE ──────────────────────────
    if (operation === 'update_profile') {
      const { profile_id, updates } = params;
      const updated = await base44.entities.WorkforceProfile.update(profile_id, updates);
      return Response.json({ operation: 'update_profile', profile: updated });
    }

    // ── ADVANCE PIPELINE ──────────────────────────
    if (operation === 'advance_pipeline') {
      const { profile_id, target_stage, notes } = params;
      const profile = await base44.entities.WorkforceProfile.get(profile_id);
      const currentStage = PROFILE_STAGES.find(s => s.key === profile.pipeline_stage);
      const nextStage = target_stage ? PROFILE_STAGES.find(s => s.key === target_stage) : PROFILE_STAGES.find(s => s.key === currentStage?.next);

      if (!nextStage) return Response.json({ error: 'No next stage available' }, { status: 400 });

      const history = profile.pipeline_history || [];
      history.push({ stage: nextStage.key, date: new Date().toISOString(), action: 'Advanced', notes, by: user.full_name });

      const updates = {
        pipeline_stage: nextStage.key,
        pipeline_stage_order: nextStage.order,
        pipeline_history: history
      };

      if (nextStage.key === 'eligible') updates.status = 'active';
      if (nextStage.key === 'assignments') updates.status = 'assigned';

      const updated = await base44.entities.WorkforceProfile.update(profile_id, updates);

      await base44.asServiceRole.entities.CareerPassportEntry.create({
        worker_profile_id: profile_id,
        worker_name: profile.full_name,
        entry_type: 'milestone',
        title: `Advanced to ${nextStage.name}`,
        description: notes || `Pipeline stage advanced from ${currentStage?.name} to ${nextStage.name}`,
        entry_date: new Date().toISOString(),
        verified: true,
        verified_by: user.full_name || 'System'
      });

      return Response.json({ operation: 'advance_pipeline', profile: updated, new_stage: nextStage });
    }

    // ── CREATE ASSESSMENT (Readiness Engine) ──────────────────────────
    if (operation === 'create_assessment') {
      const { worker_profile_id, categories, assessment_type, notes } = params;
      const profile = await base44.entities.WorkforceProfile.get(worker_profile_id);

      const weightConfigs = await base44.asServiceRole.entities.FounderConfiguration.filter({
        category: 'approval_thresholds',
        config_key: { $regex: 'readiness_weight' }
      }).catch(() => []);

      const DEFAULT_WEIGHTS = {
        professionalism: 12, attendance: 10, communication: 10, reliability: 12,
        safety: 10, training: 8, technical_knowledge: 10, customer_service: 8,
        documentation: 5, ethics: 8, compliance: 5, leadership_potential: 2
      };

      const weights = weightConfigs.length > 0
        ? weightConfigs.reduce((acc, c) => {
            const key = c.config_key.replace('readiness_weight_', '');
            acc[key] = c.value?.value || DEFAULT_WEIGHTS[key] || 5;
            return acc;
          }, {})
        : DEFAULT_WEIGHTS;

      const totalWeight = Object.values(weights).reduce((s, w) => s + w, 0);
      const overallScore = Math.round(
        Object.keys(categories).reduce((sum, key) => {
          return sum + (categories[key] || 0) * (weights[key] || 0);
        }, 0) / totalWeight
      );

      let readinessLevel = 'needs_review';
      const thresholds = await base44.asServiceRole.entities.FounderConfiguration.filter({
        config_key: 'readiness_thresholds'
      }).catch(() => []);

      const thresholdValues = thresholds[0]?.value || { ready: 80, training: 60, mentor: 40, compliance: 30 };
      if (overallScore >= (thresholdValues.ready || 80)) readinessLevel = 'ready_for_work';
      else if (overallScore >= (thresholdValues.training || 60)) readinessLevel = 'needs_training';
      else if (overallScore >= (thresholdValues.mentor || 40)) readinessLevel = 'needs_mentor';
      else if (overallScore >= (thresholdValues.compliance || 30)) readinessLevel = 'needs_compliance';

      const strengths = Object.keys(categories).filter(k => categories[k] >= 80);
      const weaknesses = Object.keys(categories).filter(k => categories[k] < 50);
      const recommendations = [];
      if (weaknesses.includes('safety')) recommendations.push('Complete safety training before assignment');
      if (weaknesses.includes('compliance')) recommendations.push('Resolve compliance gaps immediately');
      if (weaknesses.includes('technical_knowledge')) recommendations.push('Assign technical training modules');
      if (weaknesses.includes('communication')) recommendations.push('Pair with mentor for communication coaching');
      if (overallScore < 40) recommendations.push('Extended mentorship recommended before any assignment');

      const assessment = await base44.entities.WorkforceAssessment.create({
        worker_profile_id,
        worker_name: profile.full_name,
        assessment_type: assessment_type || 'readiness',
        categories,
        category_weights: weights,
        overall_score: overallScore,
        readiness_level: readinessLevel,
        strengths,
        weaknesses,
        recommendations,
        assessor_id: user.id,
        assessor_name: user.full_name || 'Director',
        assessor_type: user.role === 'admin' ? 'founder' : 'director',
        assessment_date: new Date().toISOString(),
        next_assessment_date: new Date(Date.now() + 90 * 86400000).toISOString(),
        linked_pipeline_stage: profile.pipeline_stage,
        notes
      });

      await base44.entities.WorkforceProfile.update(worker_profile_id, {
        readiness_score: overallScore,
        readiness_level: readinessLevel,
        last_assessment_date: new Date().toISOString()
      });

      await base44.asServiceRole.entities.CareerPassportEntry.create({
        worker_profile_id,
        worker_name: profile.full_name,
        entry_type: 'milestone',
        title: `Assessment: ${assessment_type || 'Readiness'} — ${overallScore}/100`,
        description: `Readiness level: ${readinessLevel.replace(/_/g, ' ')}. Strengths: ${strengths.join(', ') || 'none'}. Areas to improve: ${weaknesses.join(', ') || 'none'}.`,
        entry_date: new Date().toISOString(),
        verified: true,
        verified_by: user.full_name || 'System'
      });

      return Response.json({ operation: 'create_assessment', assessment, overall_score: overallScore, readiness_level: readinessLevel });
    }

    // ── CREATE COACHING NOTE (with memory propagation) ──────────────────────────
    if (operation === 'create_coaching_note') {
      const { worker_profile_id, note_type, category, note_text, rating, action_items, follow_up_date } = params;
      const profile = await base44.entities.WorkforceProfile.get(worker_profile_id);

      const note = await base44.entities.CoachingNote.create({
        worker_profile_id,
        worker_name: profile.full_name,
        director_id: user.id,
        director_name: user.full_name || 'Director',
        note_type: note_type || 'coaching',
        category: category || 'general',
        note_text,
        rating: rating || 3,
        action_items: action_items || [],
        follow_up_date,
        knowledge_captured: true,
        created_date: new Date().toISOString()
      });

      const orgIntel = await base44.asServiceRole.entities.OrganizationalIntelligence.create({
        category: 'workforce_insight',
        title: `Coaching: ${profile.full_name} — ${category}`,
        content: note_text,
        source: 'director_coaching',
        source_id: note.id,
        source_type: 'CoachingNote',
        tags: ['workforce', 'coaching', category, profile.full_name],
        status: 'active',
        verified: true
      }).catch(() => {});
      if (orgIntel) note.org_intelligence_id = orgIntel.id;

      const devMemory = await base44.asServiceRole.entities.EngineeringJournal.create({
        title: `Workforce Coaching: ${profile.full_name} — ${category}`,
        entry_type: 'observation',
        description: note_text,
        tags: ['workforce', 'coaching', category],
        source_name: user.full_name || 'Director',
        source_type: 'director',
        source_id: note.id,
        status: 'active'
      }).catch(() => {});
      if (devMemory) note.dev_memory_id = devMemory.id;

      const kgNode = await base44.asServiceRole.entities.KnowledgeNode.create({
        title: `Coaching: ${profile.full_name} — ${category}`,
        node_type: 'coaching_note',
        source_entity_type: 'CoachingNote',
        source_entity_id: note.id,
        description: note_text,
        tags: ['coaching', category, profile.full_name]
      }).catch(() => {});
      if (kgNode) note.knowledge_graph_id = kgNode.id;

      const trustImpact = rating >= 4 ? 2 : rating <= 2 ? -3 : 0;
      const newTrust = Math.max(0, Math.min(100, (profile.trust_score || 50) + trustImpact));
      await base44.entities.WorkforceProfile.update(worker_profile_id, {
        trust_score: newTrust,
        last_coaching_date: new Date().toISOString()
      });

      return Response.json({ operation: 'create_coaching_note', note });
    }

    // ── KNOWLEDGE CAPTURE (post-assignment) ──────────────────────────
    if (operation === 'knowledge_capture') {
      const { worker_profile_id, assignment_data } = params;
      const profile = await base44.entities.WorkforceProfile.get(worker_profile_id);

      const ad = assignment_data || {};
      const performanceScore = ad.supervisor_rating > 0 ? Math.round((ad.supervisor_rating / 5) * 100) : 0;
      const contributionImpact = performanceScore > 70 ? 3 : performanceScore < 50 ? -2 : 1;

      const entry = await base44.entities.CareerPassportEntry.create({
        worker_profile_id,
        worker_name: profile.full_name,
        entry_type: 'knowledge_capture',
        title: ad.title || 'Assignment Completed',
        description: ad.description || '',
        client_name: ad.client_name,
        role: ad.role,
        hours_worked: ad.hours_worked || 0,
        location: ad.location,
        equipment_used: ad.equipment_used || [],
        skills_learned: ad.skills_learned || [],
        skills_demonstrated: ad.skills_demonstrated || [],
        certifications_earned: ad.certifications_earned || [],
        training_completed: ad.training_completed || [],
        supervisor_feedback: ad.supervisor_feedback,
        supervisor_rating: ad.supervisor_rating || 0,
        customer_feedback: ad.customer_feedback,
        customer_rating: ad.customer_rating || 0,
        contribution_score: (profile.contribution_score || 0) + contributionImpact,
        trust_score: profile.trust_score || 50,
        reputation_score: profile.reputation_score || 50,
        what_worked: ad.what_worked,
        what_failed: ad.what_failed,
        what_was_learned: ad.what_was_learned,
        what_nc_should_remember: ad.what_nc_should_remember,
        suggested_improvements: ad.suggested_improvements,
        knowledge_stored: true,
        entry_date: new Date().toISOString(),
        start_date: ad.start_date,
        end_date: ad.end_date,
        verified: true,
        verified_by: user.full_name || 'Director',
        status: 'active'
      });

      const orgIntel = await base44.asServiceRole.entities.OrganizationalIntelligence.create({
        category: 'workforce_knowledge',
        title: `Assignment Knowledge: ${profile.full_name} — ${ad.title}`,
        content: `What worked: ${ad.what_worked || 'N/A'}\nWhat failed: ${ad.what_failed || 'N/A'}\nWhat was learned: ${ad.what_was_learned || 'N/A'}\nNC should remember: ${ad.what_nc_should_remember || 'N/A'}\nSuggested improvements: ${ad.suggested_improvements || 'N/A'}`,
        source: 'assignment_knowledge_capture',
        source_id: entry.id,
        source_type: 'CareerPassportEntry',
        tags: ['workforce', 'knowledge_capture', ad.role || 'general', ad.client_name || ''].filter(Boolean),
        status: 'active',
        verified: true
      }).catch(() => {});
      if (orgIntel) entry.org_intelligence_id = orgIntel.id;

      const devMemory = await base44.asServiceRole.entities.EngineeringJournal.create({
        title: `Workforce Lesson: ${profile.full_name} — ${ad.title}`,
        entry_type: 'lesson',
        description: ad.what_was_learned || ad.what_nc_should_remember || ad.description,
        tags: ['workforce', 'knowledge_capture', 'lesson'],
        source_name: profile.full_name,
        source_type: 'worker',
        source_id: entry.id,
        status: 'active',
        readiness_increase: performanceScore > 70 ? 1 : 0
      }).catch(() => {});
      if (devMemory) entry.dev_memory_id = devMemory.id;

      const kgNode = await base44.asServiceRole.entities.KnowledgeNode.create({
        title: `Workforce Knowledge: ${profile.full_name} — ${ad.title}`,
        node_type: 'knowledge_capture',
        source_entity_type: 'CareerPassportEntry',
        source_entity_id: entry.id,
        description: ad.what_was_learned || ad.what_nc_should_remember || ad.description,
        tags: ['workforce', 'knowledge_capture', ad.role || 'general', ad.client_name || ''].filter(Boolean)
      }).catch(() => {});
      if (kgNode) entry.knowledge_graph_id = kgNode.id;

      if (ad.skills_learned?.length > 0 || ad.certifications_earned?.length > 0) {
        const trainingLib = await base44.asServiceRole.entities.TrainingCourse.create({
          title: `Field Training: ${ad.title} (${profile.full_name})`,
          description: `Skills learned: ${(ad.skills_learned || []).join(', ')}. Certifications: ${(ad.certifications_earned || []).join(', ')}`,
          course_type: 'field_experience',
          category: ad.role || 'general',
          tags: ['field_training', 'workforce', profile.full_name],
          status: 'active'
        }).catch(() => {});
        if (trainingLib) entry.training_library_id = trainingLib.id;
      }

      const newHours = (profile.hours_worked_total || 0) + (ad.hours_worked || 0);
      const newAssignments = (profile.assignments_completed || 0) + 1;
      const newAvgPerf = profile.assignments_completed > 0
        ? Math.round(((profile.avg_performance_score || 0) * profile.assignments_completed + performanceScore) / newAssignments)
        : performanceScore;
      const newContribution = Math.max(0, Math.min(100, (profile.contribution_score || 0) + contributionImpact));

      await base44.entities.WorkforceProfile.update(worker_profile_id, {
        hours_worked_total: newHours,
        assignments_completed: newAssignments,
        avg_performance_score: newAvgPerf,
        contribution_score: newContribution,
        last_assignment_date: new Date().toISOString(),
        skills: [...new Set([...(profile.skills || []), ...(ad.skills_learned || [])])],
        certifications: [...(profile.certifications || []), ...(ad.certifications_earned?.map(c => ({ name: c, date: new Date().toISOString() })) || [])]
      });

      return Response.json({ operation: 'knowledge_capture', entry, updated_scores: { hours: newHours, assignments: newAssignments, avg_performance: newAvgPerf, contribution: newContribution } });
    }

    // ── GET PASSPORT ──────────────────────────
    if (operation === 'get_passport') {
      const { worker_profile_id } = params;
      const [profile, entries] = await Promise.all([
        base44.asServiceRole.entities.WorkforceProfile.get(worker_profile_id),
        base44.asServiceRole.entities.CareerPassportEntry.filter({ worker_profile_id }, '-entry_date', 500)
      ]);

      const assignments = entries.filter(e => e.entry_type === 'assignment' || e.entry_type === 'knowledge_capture');
      const training = entries.filter(e => e.entry_type === 'training');
      const certifications = entries.filter(e => e.entry_type === 'certification');
      const milestones = entries.filter(e => e.entry_type === 'milestone');
      const coaching = entries.filter(e => e.entry_type === 'coaching');

      const timeline = entries.sort((a, b) => new Date(a.entry_date) - new Date(b.entry_date));

      const assessments = await base44.asServiceRole.entities.WorkforceAssessment.filter({ worker_profile_id }, '-assessment_date', 100);
      const growthHistory = assessments.map(a => ({ date: a.assessment_date, score: a.overall_score, level: a.readiness_level }));

      return Response.json({
        operation: 'get_passport',
        profile,
        passport: {
          assignments,
          training,
          certifications,
          milestones,
          coaching,
          timeline,
          growth_history: growthHistory,
          total_hours: profile.hours_worked_total || 0,
          total_assignments: profile.assignments_completed || 0,
          clients: [...new Set(assignments.map(a => a.client_name).filter(Boolean))],
          equipment_used: [...new Set(assignments.flatMap(a => a.equipment_used || []))],
          skills_learned: [...new Set(assignments.flatMap(a => a.skills_learned || []))],
          avg_supervisor_rating: assignments.length > 0 ? (assignments.reduce((s, a) => s + (a.supervisor_rating || 0), 0) / assignments.length).toFixed(1) : 0,
          avg_customer_rating: assignments.length > 0 ? (assignments.reduce((s, a) => s + (a.customer_rating || 0), 0) / assignments.length).toFixed(1) : 0,
          contribution_score: profile.contribution_score || 0,
          trust_score: profile.trust_score || 0,
          reputation_score: profile.reputation_score || 0
        }
      });
    }

    // ── GET PIPELINE STAGES ──────────────────────────
    if (operation === 'get_pipeline_stages') {
      const stages = await base44.asServiceRole.entities.CareerPipelineStage.filter({ status: 'active' }, 'stage_order');
      return Response.json({
        operation: 'get_pipeline_stages',
        stages: stages.length > 0 ? stages : PROFILE_STAGES.map(s => ({ ...s, stage_key: s.key, stage_name: s.name }))
      });
    }

    // ── GET INDUSTRY TEMPLATES ──────────────────────────
    if (operation === 'get_industry_templates') {
      const templates = await base44.asServiceRole.entities.IndustryTemplate.filter({ status: 'active' });
      return Response.json({ operation: 'get_industry_templates', templates });
    }

    // ── CREATE INDUSTRY TEMPLATE ──────────────────────────
    if (operation === 'create_industry_template') {
      const template = await base44.entities.IndustryTemplate.create({
        ...params,
        status: params.status || 'draft',
        version: 1,
        created_by: user.full_name || 'Founder'
      });
      return Response.json({ operation: 'create_industry_template', template });
    }

    // ── UPDATE PIPELINE STAGE (founder config) ──────────────────────────
    if (operation === 'update_pipeline_stage') {
      const { stage_id, updates } = params;
      const updated = await base44.entities.CareerPipelineStage.update(stage_id, updates);
      return Response.json({ operation: 'update_pipeline_stage', stage: updated });
    }

    return Response.json({ error: 'Unknown operation' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});