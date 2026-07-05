import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const COMPLIANCE_PROMPT = `
COMPLIANCE GUARDRAILS — You MUST follow these at all times:
1. Never invent facts. If you don't know something, say "I'm not certain" and recommend appropriate follow-up.
2. Never promise legal outcomes. Legal situations are unpredictable.
3. Never pressure someone to subscribe or purchase.
4. Never exaggerate NC capabilities. Be honest about what NC can and cannot do.
5. If uncertainty exists, advise the Director to acknowledge it and recommend professional assistance where needed.
6. Value-first philosophy: teach, guide, listen, organize, help. Only recommend a subscription when it clearly aligns with the person's needs.
7. If NC is not the right fit today, help the person anyway within the platform's capabilities.
`;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { operation, params = {} } = body;

    switch (operation) {
      case 'prepareConversation':
        return Response.json(await prepareConversation(base44, user, params));
      case 'getGuidance':
        return Response.json(await getGuidance(base44, user, params));
      case 'summarizeConversation':
        return Response.json(await summarizeConversation(base44, user, params));
      case 'submitIntake':
        return Response.json(await submitIntake(base44, user, params));
      case 'getJourney':
        return Response.json(await getJourney(base44, user, params));
      case 'completeJourneyStep':
        return Response.json(await completeJourneyStep(base44, user, params));
      case 'getTrustScore':
        return Response.json(await getTrustScore(base44, params));
      case 'adjustTrust':
        return Response.json(await adjustTrust(base44, user, params));
      case 'getOrgLearning':
        return Response.json(await getOrgLearning(base44, params));
      case 'getDashboard':
        return Response.json(await getDashboard(base44, user));
      default:
        return Response.json({ error: 'Unknown operation' }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function safeFilter(svc, entity, query, ...args) {
  try { return await svc.entities[entity].filter(query, ...args); } catch { return []; }
}
async function safeList(svc, entity, ...args) {
  try { return await svc.entities[entity].list(...args); } catch { return []; }
}

async function prepareConversation(base44, user, params) {
  const svc = base44.asServiceRole;
  const { member_id, member_name, member_email, conversation_type } = params;

  const [intakes, journeys, trustScores, pastConvos] = await Promise.all([
    safeFilter(svc, 'MemberIntake', { member_id }, '-created_date', 1),
    safeFilter(svc, 'MemberJourney', { member_id }, '-created_date', 1),
    safeFilter(svc, 'TrustScore', { entity_type: 'member', entity_id: member_id }, '-created_date', 1),
    safeFilter(svc, 'DirectorConversation', { member_id, status: 'completed' }, '-created_date', 5),
  ]);

  const intake = intakes[0] || null;
  const journey = journeys[0] || null;
  const trust = trustScores[0] || null;

  const context = {
    member_name, member_email, conversation_type,
    intake: intake ? {
      reason_for_visit: intake.reason_for_visit,
      current_challenges: intake.current_challenges,
      goals: [...(intake.short_term_goals || []), ...(intake.long_term_goals || [])],
      occupation: intake.occupation,
      interests: [...(intake.business_interests || []), ...(intake.legal_interests || []), ...(intake.community_interests || [])],
      current_nc_knowledge: intake.current_nc_knowledge,
    } : null,
    journey_stage: journey?.current_stage,
    trust_score: trust?.trust_score,
    past_conversations: pastConvos.map(c => ({ type: c.conversation_type, date: c.completed_at, summary: c.conversation_summary })),
  };

  let aiPrep = { prepared_questions: [], recommended_resources: [], recommended_modules: [], prep_notes: '' };
  try {
    const res = await svc.integrations.Core.InvokeLLM({
      prompt: `${COMPLIANCE_PROMPT}

You are an AI Director Assistant helping a Director prepare for a conversation with a member.

MEMBER CONTEXT:
${JSON.stringify(context, null, 2)}

Generate preparation for this ${conversation_type} conversation:
1. prepared_questions: 3-5 thoughtful questions the Director should ask to understand and help the member
2. recommended_resources: 2-3 NC resources or tools that might help (Decision Compass, Resource Compass, Evidence Vault, Engineering Academy, etc.)
3. recommended_modules: 2-3 NC modules that align with the member's needs
4. prep_notes: A brief summary of what the Director should focus on

Remember: value-first, no pressure, no invented facts.`,
      response_json_schema: {
        type: 'object',
        properties: {
          prepared_questions: { type: 'array', items: { type: 'string' } },
          recommended_resources: { type: 'array', items: { type: 'string' } },
          recommended_modules: { type: 'array', items: { type: 'string' } },
          prep_notes: { type: 'string' }
        }
      }
    });
    aiPrep = res;
  } catch (e) {
    aiPrep = {
      prepared_questions: ['What brings you to NC today?', 'What are you hoping to accomplish?', 'What challenges are you currently facing?'],
      recommended_resources: ['Decision Compass', 'Resource Compass'],
      recommended_modules: [],
      prep_notes: 'AI preparation unavailable. Start with open-ended questions to understand the member.'
    };
  }

  const conversation = await svc.entities.DirectorConversation.create({
    director_id: user.id,
    director_name: user.full_name,
    member_id,
    member_name,
    member_email: member_email || '',
    conversation_type: conversation_type || 'guidance',
    status: 'preparing',
    started_at: new Date().toISOString(),
    prep_notes: aiPrep.prep_notes,
    ai_prepared_questions: aiPrep.prepared_questions || [],
    ai_recommended_resources: aiPrep.recommended_resources || [],
    ai_recommended_modules: aiPrep.recommended_modules || [],
    trust_before: trust?.trust_score || 50,
    linked_intake_id: intake?.id || null,
    linked_journey_id: journey?.id || null,
  });

  return { conversation, ai_prep: aiPrep, member_context: context };
}

async function getGuidance(base44, user, params) {
  const svc = base44.asServiceRole;
  const { conversation_id, conversation_notes, member_context } = params;

  let guidance = { questions_to_ask: [], concepts_to_explain: [], modules_to_introduce: [], resources_to_share: [], potential_misunderstandings: [], follow_up_opportunities: [], compliance_warnings: [] };
  try {
    const res = await svc.integrations.Core.InvokeLLM({
      prompt: `${COMPLIANCE_PROMPT}

You are providing real-time guidance to a Director during a conversation with a member.

MEMBER CONTEXT:
${JSON.stringify(member_context || {}, null, 2)}

CONVERSATION SO FAR (Director's notes):
${conversation_notes || '(conversation just started)'}

Provide real-time guidance for the Director:
1. questions_to_ask: 2-3 questions the Director could ask next
2. concepts_to_explain: 1-2 NC concepts that might help the member understand
3. modules_to_introduce: NC modules relevant to what's being discussed
4. resources_to_share: specific NC resources that would help right now
5. potential_misunderstandings: things the member might be confused about
6. follow_up_opportunities: natural follow-up paths
7. compliance_warnings: any compliance concerns (if the conversation touches legal promises, pressure, or uncertainty)

The Director always decides what to say. These are suggestions only.`,
      response_json_schema: {
        type: 'object',
        properties: {
          questions_to_ask: { type: 'array', items: { type: 'string' } },
          concepts_to_explain: { type: 'array', items: { type: 'string' } },
          modules_to_introduce: { type: 'array', items: { type: 'string' } },
          resources_to_share: { type: 'array', items: { type: 'string' } },
          potential_misunderstandings: { type: 'array', items: { type: 'string' } },
          follow_up_opportunities: { type: 'array', items: { type: 'string' } },
          compliance_warnings: { type: 'array', items: { type: 'string' } }
        }
      }
    });
    guidance = res;
  } catch (e) {
    guidance = {
      questions_to_ask: ['Can you tell me more about that?'],
      concepts_to_explain: [],
      modules_to_introduce: [],
      resources_to_share: [],
      potential_misunderstandings: [],
      follow_up_opportunities: [],
      compliance_warnings: []
    };
  }

  if (conversation_id) {
    await svc.entities.DirectorConversation.update(conversation_id, { status: 'active' }).catch(() => {});
  }

  return { guidance };
}

async function summarizeConversation(base44, user, params) {
  const svc = base44.asServiceRole;
  const { conversation_id, conversation_notes, member_satisfaction, subscription_discussed } = params;

  let summary = { conversation_summary: '', follow_up_notes: '', identified_needs: [], identified_goals: [], recommended_starting_point: '', compliance_issues: [] };
  try {
    const res = await svc.integrations.Core.InvokeLLM({
      prompt: `${COMPLIANCE_PROMPT}

Summarize this Director-Member conversation and extract actionable insights.

CONVERSATION NOTES:
${conversation_notes || '(no notes provided)'}

Generate:
1. conversation_summary: A clear summary of what was discussed
2. follow_up_notes: Specific follow-up actions the Director should take
3. identified_needs: The member's needs discovered during the conversation
4. identified_goals: The member's goals (short and long term)
5. recommended_starting_point: The best starting point within NC for this member
6. compliance_issues: Any compliance concerns noted (invented facts, legal promises, pressure, exaggeration) — empty if none`,
      response_json_schema: {
        type: 'object',
        properties: {
          conversation_summary: { type: 'string' },
          follow_up_notes: { type: "string" },
          identified_needs: { type: 'array', items: { type: 'string' } },
          identified_goals: { type: 'array', items: { type: 'string' } },
          recommended_starting_point: { type: 'string' },
          compliance_issues: { type: 'array', items: { type: 'string' } }
        }
      }
    });
    summary = res;
  } catch (e) {
    summary = {
      conversation_summary: conversation_notes || 'Conversation completed.',
      follow_up_notes: 'Follow up with member as needed.',
      identified_needs: [],
      identified_goals: [],
      recommended_starting_point: 'Daily Compass',
      compliance_issues: []
    };
  }

  const pressure_detected = (summary.compliance_issues || []).some(c => /pressure|subscribe|purchase/i.test(c));

  if (conversation_id) {
    const existing = await svc.entities.DirectorConversation.filter({ id: conversation_id }, '-created_date', 1);
    if (existing.length > 0) {
      await svc.entities.DirectorConversation.update(conversation_id, {
        status: 'completed',
        completed_at: new Date().toISOString(),
        conversation_notes: conversation_notes || existing[0].conversation_notes,
        conversation_summary: summary.conversation_summary,
        follow_up_notes: summary.follow_up_notes,
        identified_needs: summary.identified_needs || [],
        identified_goals: summary.identified_goals || [],
        recommended_starting_point: summary.recommended_starting_point,
        compliance_flags: summary.compliance_issues || [],
        pressure_detected,
        subscription_discussed: subscription_discussed || false,
        member_satisfaction: member_satisfaction || 'neutral',
      });

      // Adjust trust score
      await adjustTrust(base44, user, {
        entity_type: 'member',
        entity_id: existing[0].member_id,
        entity_name: existing[0].member_name,
        action: 'conversation_completed',
        details: {
          satisfaction: member_satisfaction,
          needs_identified: (summary.identified_needs || []).length,
          compliance_issues: (summary.compliance_issues || []).length
        }
      });
    }
  }

  return { summary };
}

async function submitIntake(base44, user, params) {
  const svc = base44.asServiceRole;
  const { member_id, member_name, member_email, intake_data } = params;
  const today = new Date().toISOString().split('T')[0];

  let existing = await safeFilter(svc, 'MemberIntake', { member_id }, '-created_date', 1);

  let analysis = {
    identified_needs: [],
    recommended_starting_point: 'Daily Compass',
    recommended_modules: [],
    recommended_rails: [],
    recommended_compasses: [],
    recommended_ai_assistants: [],
    recommended_learning_modules: []
  };
  try {
    const res = await svc.integrations.Core.InvokeLLM({
      prompt: `${COMPLIANCE_PROMPT}

Analyze this member intake and recommend the best starting point within NCOS.

MEMBER INTAKE:
Name: ${member_name}
Reason for visit: ${intake_data.reason_for_visit}
Current challenges: ${JSON.stringify(intake_data.current_challenges)}
Urgent issues: ${JSON.stringify(intake_data.urgent_issues)}
Short-term goals: ${JSON.stringify(intake_data.short_term_goals)}
Long-term goals: ${JSON.stringify(intake_data.long_term_goals)}
Occupation: ${intake_data.occupation}
Education: ${intake_data.education}
Business interests: ${JSON.stringify(intake_data.business_interests)}
Legal interests: ${JSON.stringify(intake_data.legal_interests)}
Community interests: ${JSON.stringify(intake_data.community_interests)}
Financial goals: ${JSON.stringify(intake_data.financial_goals)}
Current NC knowledge: ${intake_data.current_nc_knowledge}

Analyze and recommend:
1. identified_needs: What the member needs from NC
2. recommended_starting_point: The single best starting point
3. recommended_modules: NC modules that align (e.g., Decision Compass, Resource Compass, Evidence Vault, Engineering Academy, CRM, Financial Intelligence, Customer Success, Evolution Engine)
4. recommended_rails: NC Rails relevant (Culture Rail, Resource Compass Rail, Workforce Rail, Authority Compass Rail)
5. recommended_compasses: Which Daily Compass sections are most relevant
6. recommended_ai_assistants: AI assistants that would help (Director Assistant, AI Assistant, JurisEngine)
7. recommended_learning_modules: Specific learning topics to start with

Be honest. If NC isn't the right fit for some needs, say so.`,
      response_json_schema: {
        type: 'object',
        properties: {
          identified_needs: { type: 'array', items: { type: 'string' } },
          recommended_starting_point: { type: 'string' },
          recommended_modules: { type: 'array', items: { type: 'string' } },
          recommended_rails: { type: 'array', items: { type: 'string' } },
          recommended_compasses: { type: 'array', items: { type: 'string' } },
          recommended_ai_assistants: { type: 'array', items: { type: 'string' } },
          recommended_learning_modules: { type: 'array', items: { type: 'string' } }
        }
      }
    });
    analysis = res;
  } catch (e) {}

  const intakeRecord = {
    member_id,
    member_name,
    member_email: member_email || '',
    director_id: user.id,
    director_name: user.full_name,
    intake_date: today,
    intake_status: 'completed',
    ...intake_data,
    identified_needs: analysis.identified_needs || [],
    recommended_starting_point: analysis.recommended_starting_point || 'Daily Compass',
    recommended_modules: analysis.recommended_modules || [],
    recommended_rails: analysis.recommended_rails || [],
    recommended_compasses: analysis.recommended_compasses || [],
    recommended_ai_assistants: analysis.recommended_ai_assistants || [],
    recommended_learning_modules: analysis.recommended_learning_modules || [],
    completed_at: new Date().toISOString(),
  };

  let intake;
  if (existing.length > 0) {
    intake = await svc.entities.MemberIntake.update(existing[0].id, intakeRecord);
  } else {
    intake = await svc.entities.MemberIntake.create(intakeRecord);
  }

  // Auto-build journey from intake
  const journey = await buildJourneyFromIntake(svc, intake, user);

  return { intake, analysis, journey };
}

async function buildJourneyFromIntake(svc, intake, user) {
  const existing = await safeFilter(svc, 'MemberJourney', { member_id: intake.member_id }, '-created_date', 1);

  const milestones = [
    { id: 'm1', title: 'Intake completed', description: 'Member completed their intake', completed: true, completed_at: new Date().toISOString() },
    { id: 'm2', title: 'First Daily Compass visit', description: 'Member opens their Daily Compass', completed: false },
    { id: 'm3', title: 'Starting point explored', description: `Explore ${intake.recommended_starting_point}`, completed: false },
    { id: 'm4', title: 'First learning module', description: 'Complete first learning module', completed: false },
    { id: 'm5', title: 'First resource used', description: 'Use first recommended resource', completed: false },
    { id: 'm6', title: 'First goal defined', description: 'Define a personal goal in the platform', completed: false },
    { id: 'm7', title: 'First milestone achieved', description: 'Achieve a personal milestone', completed: false },
  ];

  const journeyData = {
    member_id: intake.member_id,
    member_name: intake.member_name,
    journey_status: 'active',
    current_stage: 'orientation',
    today_step: {
      title: 'Open your Daily Compass',
      description: 'Start by exploring your personalized Daily Compass to see what NC has prepared for you.',
      action: '/compass'
    },
    tomorrow_step: {
      title: `Explore ${intake.recommended_starting_point}`,
      description: `Based on your intake, ${intake.recommended_starting_point} is your best starting point.`,
    },
    this_week_priorities: (intake.recommended_learning_modules || []).slice(0, 3).map((m, i) => ({
      title: m,
      description: 'Recommended learning module',
      priority: i === 0 ? 'high' : 'medium'
    })),
    learning_modules: (intake.recommended_learning_modules || []).map(m => ({
      title: m,
      status: 'not_started'
    })),
    recommended_ai_assistants: intake.recommended_ai_assistants || [],
    recommended_rails: intake.recommended_rails || [],
    recommended_compasses: intake.recommended_compasses || [],
    milestones,
    milestones_completed: 1,
    milestones_total: milestones.length,
    progress_pct: Math.round(100 / milestones.length),
    last_updated: new Date().toISOString(),
    linked_intake_id: intake.id,
  };

  if (existing.length > 0) {
    return await svc.entities.MemberJourney.update(existing[0].id, journeyData);
  }
  return await svc.entities.MemberJourney.create(journeyData);
}

async function getJourney(base44, user, params) {
  const svc = base44.asServiceRole;
  const { member_id } = params;
  const journeys = await safeFilter(svc, 'MemberJourney', { member_id }, '-created_date', 1);
  return journeys[0] || null;
}

async function completeJourneyStep(base44, user, params) {
  const svc = base44.asServiceRole;
  const { journey_id, milestone_id } = params;

  const journeys = await safeFilter(svc, 'MemberJourney', { id: journey_id }, '-created_date', 1);
  if (journeys.length === 0) return { error: 'Journey not found' };

  const journey = journeys[0];
  const milestones = (journey.milestones || []).map(m =>
    m.id === milestone_id ? { ...m, completed: true, completed_at: new Date().toISOString() } : m
  );
  const completed = milestones.filter(m => m.completed).length;
  const total = milestones.length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  const stages = ['intake', 'orientation', 'first_step', 'exploration', 'adoption', 'mastery', 'graduation'];
  const stageIndex = Math.min(Math.floor((completed / total) * stages.length), stages.length - 1);

  const updated = await svc.entities.MemberJourney.update(journey_id, {
    milestones,
    milestones_completed: completed,
    milestones_total: total,
    progress_pct: progress,
    current_stage: stages[stageIndex],
    last_updated: new Date().toISOString(),
  });

  // Adjust trust score for milestone completion
  await adjustTrust(base44, user, {
    entity_type: 'member',
    entity_id: journey.member_id,
    entity_name: journey.member_name,
    action: 'milestone_completed',
    details: { milestone_id }
  });

  return { journey: updated, milestone_completed: true, celebration: completed === total ? 'graduation' : 'milestone' };
}

async function getTrustScore(base44, params) {
  const svc = base44.asServiceRole;
  const { entity_type = 'member', entity_id } = params;
  const scores = await safeFilter(svc, 'TrustScore', { entity_type, entity_id }, '-created_date', 1);
  if (scores.length > 0) return scores[0];

  // Create initial trust score
  const initial = await svc.entities.TrustScore.create({
    entity_type,
    entity_id,
    entity_name: params.entity_name || '',
    trust_score: 50,
    trust_level: 'building',
    trust_trend: 'stable',
    factors: [],
    questions_answered_clearly: 0,
    resources_helpful: 0,
    onboarding_completed: false,
    voluntary_returns: 0,
    satisfaction_reports: 0,
    goals_achieved: 0,
    last_interaction: new Date().toISOString(),
    history: [],
  }).catch(() => null);
  return initial;
}

async function adjustTrust(base44, user, params) {
  const svc = base44.asServiceRole;
  const { entity_type = 'member', entity_id, entity_name, action, details = {} } = params;

  const existing = await safeFilter(svc, 'TrustScore', { entity_type, entity_id }, '-created_date', 1);
  let score = existing[0];
  if (!score) {
    score = await getTrustScore(base44, { entity_type, entity_id, entity_name });
    if (!score) return { error: 'Could not create trust score' };
  }

  const adjustments = {
    question_answered_clearly: { delta: +3, factor: 'Question answered clearly', counter: 'questions_answered_clearly' },
    resource_helpful: { delta: +3, factor: 'Resource was helpful', counter: 'resources_helpful' },
    onboarding_completed: { delta: +10, factor: 'Onboarding completed', flag: 'onboarding_completed', flag_value: true },
    voluntary_return: { delta: +5, factor: 'Member returned voluntarily', counter: 'voluntary_returns' },
    satisfaction_report: { delta: +5, factor: 'Member reported satisfaction', counter: 'satisfaction_reports' },
    goal_achieved: { delta: +8, factor: 'Member achieved a goal', counter: 'goals_achieved' },
    conversation_completed: {
      delta: details.satisfaction === 'very_satisfied' ? +5 : details.satisfaction === 'satisfied' ? +3 : details.satisfaction === 'dissatisfied' ? -3 : +1,
      factor: 'Conversation completed',
    },
    milestone_completed: { delta: +4, factor: 'Journey milestone completed' },
    compliance_violation: { delta: -5, factor: 'Compliance issue detected' },
  };

  const adj = adjustments[action] || adjustments.conversation_completed;
  const delta = adj.delta;
  const newScore = Math.max(0, Math.min(100, (score.trust_score || 50) + delta));

  let newLevel = 'building';
  if (newScore >= 80) newLevel = 'ambassador';
  else if (newScore >= 65) newLevel = 'strong';
  else if (newScore >= 50) newLevel = 'established';

  const trend = delta > 0 ? 'improving' : delta < 0 ? 'declining' : 'stable';

  const updateData = {
    trust_score: newScore,
    trust_level: newLevel,
    trust_trend: trend,
    last_interaction: new Date().toISOString(),
    history: [...(score.history || []), {
      action, delta, factor: adj.factor, details, timestamp: new Date().toISOString(), score_after: newScore
    }],
  };

  if (adj.counter) updateData[adj.counter] = (score[adj.counter] || 0) + 1;
  if (adj.flag) updateData[adj.flag] = adj.flag_value;

  const updated = await svc.entities.TrustScore.update(score.id, updateData);
  return { trust_score: updated, adjustment: { action, delta, new_score: newScore, new_level: newLevel } };
}

async function getOrgLearning(base44, params) {
  const svc = base44.asServiceRole;
  const limit = params.limit || 20;

  const [conversations, orgIntel] = await Promise.all([
    safeList(svc, 'DirectorConversation', '-created_date', limit),
    safeList(svc, 'OrganizationalIntelligence', '-created_date', limit),
  ]);

  // Aggregate FAQ patterns from conversations
  const faqPatterns = {};
  const confusionPatterns = {};
  const onboardingPatterns = {};

  for (const c of conversations) {
    for (const need of (c.identified_needs || [])) {
      const key = need.toLowerCase().trim();
      faqPatterns[key] = (faqPatterns[key] || 0) + 1;
    }
    for (const flag of (c.compliance_flags || [])) {
      if (/uncertain|confus/i.test(flag)) {
        confusionPatterns[flag] = (confusionPatterns[flag] || 0) + 1;
      }
    }
    if (c.conversation_type === 'onboarding' && c.status === 'completed') {
      onboardingPatterns.success = (onboardingPatterns.success || 0) + 1;
    }
  }

  const topFaqs = Object.entries(faqPatterns).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([topic, count]) => ({ topic, count }));
  const topConfusions = Object.entries(confusionPatterns).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([topic, count]) => ({ topic, count }));

  return {
    conversations_total: conversations.length,
    top_faqs: topFaqs,
    common_confusions: topConfusions,
    onboarding_patterns: onboardingPatterns,
    org_intelligence_entries: orgIntel,
  };
}

async function getDashboard(base44, user) {
  const svc = base44.asServiceRole;
  const [conversations, intakes, journeys, trustScores] = await Promise.all([
    safeFilter(svc, 'DirectorConversation', { director_id: user.id }, '-created_date', 50),
    safeFilter(svc, 'MemberIntake', { director_id: user.id }, '-created_date', 50),
    safeList(svc, 'MemberJourney', '-created_date', 50),
    safeFilter(svc, 'TrustScore', { entity_type: 'member' }, '-created_date', 50),
  ]);

  return {
    stats: {
      conversations_total: conversations.length,
      conversations_active: conversations.filter(c => c.status === 'active').length,
      intakes_completed: intakes.filter(i => i.intake_status === 'completed').length,
      journeys_active: journeys.filter(j => j.journey_status === 'active').length,
      avg_trust: trustScores.length > 0 ? Math.round(trustScores.reduce((s, t) => s + (t.trust_score || 50), 0) / trustScores.length) : 50,
    },
    recent_conversations: conversations.slice(0, 10),
    recent_intakes: intakes.slice(0, 10),
    recent_journeys: journeys.slice(0, 10),
    trust_scores: trustScores.slice(0, 20),
  };
}