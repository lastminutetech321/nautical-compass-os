import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { operation, params = {} } = body;
    const role = mapRole(user.role);

    switch (operation) {
      case 'generate':
        return Response.json(await generateCompass(base44, user, role));
      case 'suggestions':
        return Response.json(await getAISuggestions(base44.asServiceRole, role, params.sections || {}, user));
      case 'saveReflection':
        return Response.json(await saveReflection(base44, user, role, params));
      case 'getPreferences':
        return Response.json(await getPreferences(base44, user, role));
      case 'updatePreferences':
        return Response.json(await updatePreferences(base44, user, role, params));
      case 'getOrgIntelligence':
        return Response.json(await getOrgIntelligence(base44, params));
      default:
        return Response.json({ error: 'Unknown operation' }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function mapRole(role) {
  const r = (role || 'user').toLowerCase();
  if (r === 'admin' || r === 'founder') return 'founder';
  if (r === 'director') return 'director';
  if (r === 'staff') return 'staff';
  return 'member';
}

function getGreeting(role, name) {
  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const firstName = (name || '').split(' ')[0] || 'there';
  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);
  return `${timeOfDay}, ${firstName}. Here is your ${roleLabel} Daily Compass.`;
}

async function safeList(svc, entity, ...args) {
  try { return await svc.entities[entity].list(...args); } catch { return []; }
}
async function safeFilter(svc, entity, query, ...args) {
  try { return await svc.entities[entity].filter(query, ...args); } catch { return []; }
}

async function generateCompass(base44, user, role) {
  const svc = base44.asServiceRole;
  const today = new Date().toISOString().split('T')[0];
  const now = new Date().toISOString();

  let profiles = await safeFilter(svc, 'PersonalIntelligenceProfile', { user_id: user.id }, '-created_date', 1);
  let profile = profiles[0] || null;
  if (profile) {
    await svc.entities.PersonalIntelligenceProfile.update(profile.id, {
      session_count: (profile.session_count || 0) + 1,
      last_active: now
    }).catch(() => {});
  } else {
    profile = await svc.entities.PersonalIntelligenceProfile.create({
      user_id: user.id, user_name: user.full_name, user_role: role,
      session_count: 1, last_active: now
    }).catch(() => null);
  }

  const reflections = await safeFilter(svc, 'DailyReflection', { user_id: user.id, reflection_date: today }, '-created_date', 1);

  let sections = {};
  if (role === 'founder') sections = await getFounderSections(svc);
  else if (role === 'director') sections = await getDirectorSections(svc, user);
  else if (role === 'staff') sections = await getStaffSections(svc, user);
  else sections = await getMemberSections(svc, user);

  return {
    role,
    user: { id: user.id, name: user.full_name, email: user.email, role: user.role },
    date: today,
    greeting: getGreeting(role, user.full_name),
    profile,
    reflection_submitted_today: reflections.length > 0,
    sections,
    ai_suggestions: null
  };
}

async function getFounderSections(svc) {
  const [briefings, approvals, snapshots, healthChecks, tasks, canonEntries, evidence, agents, improvements, opportunities, sprints, customerAlerts, csProfiles] = await Promise.all([
    safeList(svc, 'DailyBriefing', '-created_date', 1),
    safeFilter(svc, 'ApprovalGate', { status: 'pending' }, '-created_date', 10),
    safeList(svc, 'FinancialSnapshot', '-created_date', 1),
    safeList(svc, 'HealthCheck', '-created_date', 1),
    safeList(svc, 'Task', '-created_date', 100),
    safeList(svc, 'CanonEntry', '-created_date', 200),
    safeList(svc, 'Evidence', '-created_date', 50),
    safeList(svc, 'AgentProfile', '-created_date', 50),
    safeFilter(svc, 'ImprovementItem', { status: 'queued' }, '-estimated_roi_score', 5),
    safeList(svc, 'CRMOpportunity', '-created_date', 10),
    safeList(svc, 'Sprint', '-created_date', 3),
    safeFilter(svc, 'CustomerSuccessProfile', { founder_alert_required: true }, '-created_date', 10),
    safeList(svc, 'CustomerSuccessProfile', '-created_date', 200),
  ]);

  const csMetrics = csProfiles.length > 0 ? {
    total: csProfiles.length,
    at_risk: csProfiles.filter(c => c.churn_risk_level === 'high' || c.churn_risk_level === 'critical').length,
    critical: csProfiles.filter(c => c.churn_risk_level === 'critical').length,
    avg_health: Math.round(csProfiles.reduce((s, c) => s + (c.health_score || 50), 0) / csProfiles.length),
    total_mrr: csProfiles.reduce((s, c) => s + (c.mrr || 0), 0),
    upcoming_renewals: csProfiles.filter(c => c.days_to_renewal > 0 && c.days_to_renewal <= 30).length,
    stalled_onboarding: csProfiles.filter(c => c.onboarding_status === 'stalled').length,
    founder_alerts: customerAlerts.length,
  } : null;

  const taskStats = {
    total: tasks.length,
    done: tasks.filter(t => t.status === 'done').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    overdue: tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done').length,
  };

  const canonStats = {
    total: canonEntries.length,
    verified: canonEntries.filter(c => c.verified).length,
    active: canonEntries.filter(c => c.status === 'active').length,
  };

  const agentStats = {
    total: agents.length,
    active: agents.filter(a => a.status === 'active').length,
    avg_performance: agents.length > 0 ? Math.round(agents.reduce((s, a) => s + (a.performance_score || 0), 0) / agents.length) : 0,
  };

  const latestSnapshot = snapshots[0] || {};
  const revenue_health = {
    mrr: latestSnapshot.mrr || 0,
    arr: latestSnapshot.arr || 0,
    runway_days: latestSnapshot.runway_days || 0,
    monthly_burn: latestSnapshot.monthly_burn || 0,
    profit: latestSnapshot.profit || 0,
  };

  const risk_items = [
    ...(customerAlerts.length > 0 ? [`${customerAlerts.length} customer(s) requiring founder attention`] : []),
    ...(taskStats.overdue > 0 ? [`${taskStats.overdue} overdue task(s)`] : []),
    ...(revenue_health.runway_days > 0 && revenue_health.runway_days < 90 ? [`Runway at ${revenue_health.runway_days} days`] : []),
  ];

  return {
    executive_briefing: briefings[0] || null,
    critical_alerts: {
      pending_approvals: approvals.length,
      customer_alerts: customerAlerts.length,
      overdue_tasks: taskStats.overdue,
      items: approvals.slice(0, 5),
    },
    revenue_health,
    platform_health: healthChecks[0] || { status: 'unknown' },
    engineering_health: taskStats,
    legal_readiness: canonStats,
    canon_progress: canonStats,
    evidence_progress: { total: evidence.length, recent: evidence.slice(0, 5) },
    ai_workforce: agentStats,
    pending_approvals: approvals,
    highest_roi_action: improvements[0] || null,
    highest_risk: { count: risk_items.length, items: risk_items },
    recommended_sprint: sprints[0] || null,
    business_opportunities: opportunities.slice(0, 8),
    customer_success: csMetrics,
  };
}

async function getDirectorSections(svc, user) {
  const [myTasks, goals, approvals, agents, training, meetings, teamTasks, csProfiles, csAlerts] = await Promise.all([
    safeFilter(svc, 'Task', { assignee_id: user.id, status: { $ne: 'done' } }, '-created_date', 15),
    safeList(svc, 'StrategicGoal', '-created_date', 5),
    safeFilter(svc, 'ApprovalGate', { status: 'pending' }, '-created_date', 10),
    safeList(svc, 'AgentProfile', '-created_date', 20),
    safeList(svc, 'TrainingCourse', '-created_date', 5),
    safeFilter(svc, 'CRMMeeting', {}, '-created_date', 10),
    safeList(svc, 'Task', '-created_date', 30),
    safeList(svc, 'CustomerSuccessProfile', '-created_date', 100),
    safeFilter(svc, 'CustomerSuccessProfile', { founder_alert_required: true }, '-created_date', 10),
  ]);

  const customerSuccess = {
    total: csProfiles.length,
    at_risk: csProfiles.filter(c => c.churn_risk_level === 'high' || c.churn_risk_level === 'critical').length,
    founder_alerts: csAlerts.length,
    upcoming_renewals: csProfiles.filter(c => c.days_to_renewal > 0 && c.days_to_renewal <= 30).length,
    stalled_onboarding: csProfiles.filter(c => c.onboarding_status === 'stalled').length,
    avg_health: csProfiles.length > 0 ? Math.round(csProfiles.reduce((s, c) => s + (c.health_score || 50), 0) / csProfiles.length) : 0,
  };

  const teamPerformance = {
    total_agents: agents.length,
    active: agents.filter(a => a.status === 'active').length,
    avg_performance: agents.length > 0 ? Math.round(agents.reduce((s, a) => s + (a.performance_score || 0), 0) / agents.length) : 0,
    tasks_completed: teamTasks.filter(t => t.status === 'done').length,
    tasks_in_progress: teamTasks.filter(t => t.status === 'in_progress').length,
  };

  return {
    todays_assignments: myTasks.filter(t => t.due_date === new Date().toISOString().split('T')[0] || !t.due_date),
    todays_goals: goals,
    member_followups: myTasks.filter(t => t.tags && t.tags.some(tag => /follow|check.?in/i.test(tag))),
    pending_approvals: approvals,
    team_performance: teamPerformance,
    department_kpis: {
      task_completion_rate: teamTasks.length > 0 ? Math.round(teamPerformance.tasks_completed / teamTasks.length * 100) : 0,
      active_agents: teamPerformance.active,
      open_tasks: teamTasks.filter(t => t.status !== 'done').length,
    },
    recommended_actions: [],
    training,
    upcoming_meetings: meetings,
    customer_success: customerSuccess,
  };
}

async function getStaffSections(svc, user) {
  const [myTasks, training, notifications, lessons, documents, allMyTasks] = await Promise.all([
    safeFilter(svc, 'Task', { assignee_id: user.id, status: { $ne: 'done' } }, '-due_date', 10),
    safeList(svc, 'TrainingCourse', '-created_date', 5),
    safeFilter(svc, 'Notification', {}, '-created_date', 10),
    safeList(svc, 'EngineeringLesson', '-created_date', 5),
    safeFilter(svc, 'Document', {}, '-created_date', 5),
    safeFilter(svc, 'Task', { assignee_id: user.id }, '-created_date', 50),
  ]);

  const today = new Date().toISOString().split('T')[0];
  const progress = {
    total: allMyTasks.length,
    done: allMyTasks.filter(t => t.status === 'done').length,
    in_progress: allMyTasks.filter(t => t.status === 'in_progress').length,
    completion_rate: allMyTasks.length > 0 ? Math.round(allMyTasks.filter(t => t.status === 'done').length / allMyTasks.length * 100) : 0,
  };

  return {
    todays_tasks: myTasks.filter(t => !t.due_date || t.due_date <= today),
    schedule: myTasks.filter(t => t.due_date).sort((a, b) => (a.due_date || '').localeCompare(b.due_date || '')),
    training,
    messages: notifications,
    knowledge_articles: lessons,
    documents,
    progress,
    support_requests: myTasks.filter(t => t.tags && t.tags.some(tag => /support|help/i.test(tag))),
  };
}

async function getMemberSections(svc, user) {
  const [myTasks, allMyTasks, evidence, cases, reminders, training, lessons, notifications] = await Promise.all([
    safeFilter(svc, 'Task', { assignee_id: user.id, status: { $ne: 'done' } }, '-created_date', 10),
    safeFilter(svc, 'Task', { assignee_id: user.id }, '-created_date', 50),
    safeFilter(svc, 'Evidence', {}, '-created_date', 5),
    safeFilter(svc, 'CaseFile', {}, '-created_date', 5),
    safeFilter(svc, 'ResourceReminder', {}, '-created_date', 10),
    safeList(svc, 'TrainingCourse', '-created_date', 5),
    safeList(svc, 'EngineeringLesson', '-created_date', 5),
    safeFilter(svc, 'Notification', {}, '-created_date', 10),
  ]);

  const progress = {
    total: allMyTasks.length,
    done: allMyTasks.filter(t => t.status === 'done').length,
    completion_rate: allMyTasks.length > 0 ? Math.round(allMyTasks.filter(t => t.status === 'done').length / allMyTasks.length * 100) : 0,
  };

  return {
    todays_progress: progress,
    evidence_uploads: evidence,
    open_matters: cases,
    reminders,
    learning_center: { courses: training, lessons },
    messages: notifications,
    achievements: allMyTasks.filter(t => t.status === 'done').slice(0, 5),
  };
}

async function getAISuggestions(svc, role, sections, user) {
  try {
    const prompt = buildSuggestionPrompt(role, sections, user);
    const res = await svc.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          suggestions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                description: { type: 'string' },
                priority: { type: 'string', enum: ['low', 'medium', 'high'] }
              }
            }
          },
          focus_area: { type: 'string' }
        }
      }
    });
    return res;
  } catch {
    return { suggestions: [], focus_area: 'Continue your excellent work.' };
  }
}

function buildSuggestionPrompt(role, sections, user) {
  const roleContext = {
    founder: 'You are advising the Founder of NCOS. Focus on strategic priorities, revenue, risk, and growth.',
    director: 'You are advising a Director. Focus on team performance, goal alignment, and operational efficiency.',
    staff: 'You are advising a Staff member. Focus on task prioritization, skill development, and productivity.',
    member: 'You are advising a Member. Focus on their cases, resources, learning, and progress.'
  }[role] || 'Provide helpful guidance.';

  const summary = JSON.stringify(sections).slice(0, 3000);
  return `${roleContext}\n\nUser: ${user.full_name}\nRole: ${role}\n\nCurrent console data summary:\n${summary}\n\nProvide 3 concise, actionable suggestions for what this person should focus on today. Each suggestion should have a title, brief description, and priority level.`;
}

async function saveReflection(base44, user, role, params) {
  const svc = base44.asServiceRole;
  const today = new Date().toISOString().split('T')[0];

  const reflection = await svc.entities.DailyReflection.create({
    user_id: user.id,
    user_name: user.full_name,
    user_role: role,
    reflection_date: today,
    session_duration_minutes: params.session_duration_minutes || 0,
    what_slowed_you_down: params.what_slowed_you_down || '',
    what_was_confusing: params.what_was_confusing || '',
    what_worked_well: params.what_worked_well || '',
    better_workflow_discovered: params.better_workflow_discovered || '',
    what_nc_should_improve: params.what_nc_should_improve || '',
    ai_recommendation_helped: params.ai_recommendation_helped || 'not_applicable',
    would_change: params.would_change || '',
    status: 'submitted',
  });

  const created = [];
  const insightIds = [];

  // Generate organizational intelligence from reflection answers
  const insightMap = [
    { field: 'what_slowed_you_down', type: 'workflow_bottleneck', label: 'Workflow bottleneck reported' },
    { field: 'what_was_confusing', type: 'ui_confusion', label: 'UI confusion reported' },
    { field: 'better_workflow_discovered', type: 'process_improvement', label: 'Process improvement discovered' },
    { field: 'what_nc_should_improve', type: 'feature_request', label: 'Feature request from feedback' },
    { field: 'what_was_confusing', type: 'documentation_gap', label: 'Documentation gap identified' },
  ];

  for (const item of insightMap) {
    const text = params[item.field];
    if (text && text.trim().length > 3) {
      try {
        const insight = await svc.entities.OrganizationalIntelligence.create({
          insight_type: item.type,
          title: item.label,
          description: text.trim(),
          frequency: 1,
          affected_roles: [role],
          source: 'daily_reflection',
          status: 'active',
          priority: 'medium',
        });
        insightIds.push(insight.id);
        created.push({ type: 'org_intelligence', id: insight.id, insight_type: item.type });
      } catch {}
    }
  }

  // Create improvement item if they said what NC should improve
  if (params.what_nc_should_improve && params.what_nc_should_improve.trim().length > 5) {
    try {
      const improvement = await svc.entities.ImprovementItem.create({
        title: `Feedback from ${user.full_name} — ${new Date().toLocaleDateString()}`,
        description: params.what_nc_should_improve.trim(),
        recommended_fix: 'Review user feedback and determine appropriate action.',
        improvement_dimension: 'ux',
        source: 'Daily Learning Loop',
        scan_date: today,
        status: 'queued',
        requires_approval: true,
        approval_type: 'founder',
        priority: 'medium',
        tags: ['daily-reflection', role],
      });
      created.push({ type: 'improvement_item', id: improvement.id });
    } catch {}
  }

  // Create knowledge article if a better workflow was discovered
  if (params.better_workflow_discovered && params.better_workflow_discovered.trim().length > 5) {
    try {
      const lesson = await svc.entities.EngineeringLesson.create({
        title: `Workflow discovery by ${user.full_name}`,
        category: 'ux',
        content: params.better_workflow_discovered.trim(),
        source_type: 'manual',
        source_name: 'Daily Learning Loop',
        status: 'draft',
        auto_generated: true,
        tags: ['daily-reflection', 'workflow'],
      });
      created.push({ type: 'knowledge_article', id: lesson.id });
    } catch {}
  }

  await svc.entities.DailyReflection.update(reflection.id, {
    organizational_insights_generated: insightIds,
    converted_to: created,
    status: 'processed',
  }).catch(() => {});

  return { reflection, created_items: created, insights_count: insightIds.length };
}

async function getPreferences(base44, user, role) {
  const svc = base44.asServiceRole;
  const profiles = await safeFilter(svc, 'PersonalIntelligenceProfile', { user_id: user.id }, '-created_date', 1);
  if (profiles.length > 0) return profiles[0];
  const profile = await svc.entities.PersonalIntelligenceProfile.create({
    user_id: user.id, user_name: user.full_name, user_role: role,
    session_count: 0,
  }).catch(() => null);
  return profile;
}

async function updatePreferences(base44, user, role, params) {
  const svc = base44.asServiceRole;
  const profiles = await safeFilter(svc, 'PersonalIntelligenceProfile', { user_id: user.id }, '-created_date', 1);
  const updateData = {
    preferred_communication_style: params.preferred_communication_style,
    preferred_learning_style: params.preferred_learning_style,
    preferred_dashboard_layout: params.preferred_dashboard_layout,
    productivity_patterns: params.productivity_patterns || [],
    favorite_workflows: params.favorite_workflows || [],
    frequently_used_tools: params.frequently_used_tools || [],
    goals: params.goals || [],
    strengths: params.strengths || [],
    areas_needing_support: params.areas_needing_support || [],
    common_questions: params.common_questions || [],
    notes: params.notes || '',
    preferences: params.preferences || {},
  };

  if (profiles.length > 0) {
    return await svc.entities.PersonalIntelligenceProfile.update(profiles[0].id, updateData);
  }
  return await svc.entities.PersonalIntelligenceProfile.create({
    user_id: user.id, user_name: user.full_name, user_role: role,
    ...updateData,
  });
}

async function getOrgIntelligence(base44, params) {
  const svc = base44.asServiceRole;
  const limit = params.limit || 20;
  const insights = await safeList(svc, 'OrganizationalIntelligence', '-created_date', limit);
  const byType = {};
  for (const i of insights) {
    byType[i.insight_type] = (byType[i.insight_type] || 0) + 1;
  }
  return { insights, summary: { total: insights.length, by_type: byType } };
}