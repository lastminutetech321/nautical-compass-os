import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// NC Autonomous Intelligence Loop — 20-module registry
const MODULE_REGISTRY = [
  { key: 'mission_control', name: 'Mission Control', dept: 'executive', entities: ['StrategicGoal','Project','Sprint'], dashboard: '/mission-control' },
  { key: 'executive_command', name: 'Executive Command', dept: 'executive', entities: ['Task','StrategicGoal'], dashboard: '/executive-command' },
  { key: 'director_compass', name: 'Director Compass', dept: 'workforce', entities: ['DirectorConversation','MemberJourney'], dashboard: '/director-assistant' },
  { key: 'customer_success', name: 'Customer Success', dept: 'customer_success', entities: ['CustomerSuccessProfile','CustomerInteraction'], dashboard: '/customer-success' },
  { key: 'crm', name: 'CRM', dept: 'sales', entities: ['CRMLead','CRMContact','CRMDeal','CRMOpportunity'], dashboard: '/crm' },
  { key: 'financial_intelligence', name: 'Financial Intelligence', dept: 'finance', entities: ['FinancialTransaction','FinancialSnapshot','FinancialForecast'], dashboard: '/financial-intelligence' },
  { key: 'workforce_gateway', name: 'Workforce Gateway', dept: 'workforce', entities: ['WorkforceProfile','WorkforceAssessment','CareerPipelineStage'], dashboard: '/workforce-gateway' },
  { key: 'contribution_intelligence', name: 'Contribution Intelligence', dept: 'workforce', entities: ['ContributionScore'], dashboard: '/workforce' },
  { key: 'trust_system', name: 'Trust System', dept: 'compliance', entities: ['TrustScore','ReputationRecord'], dashboard: '/workforce' },
  { key: 'knowledge_graph', name: 'Knowledge Graph', dept: 'technology', entities: ['KnowledgeNode','GraphNode','SemanticIndex'], dashboard: '/knowledge-graph' },
  { key: 'enterprise_memory', name: 'Enterprise Memory', dept: 'technology', entities: ['OrgMemoryProject','MemoryRecord','NCOSMemory'], dashboard: '/ncos-memory' },
  { key: 'development_memory', name: 'Development Memory', dept: 'engineering', entities: ['EngineeringLesson','EngineeringJournal','ADR','BugKnowledgeBase','PromptLibrary'], dashboard: '/nc-dev-memory' },
  { key: 'ai_workforce', name: 'AI Workforce', dept: 'ai_operations', entities: ['AgentProfile','AgentTask'], dashboard: '/workforce' },
  { key: 'noos', name: 'NOOS', dept: 'executive', entities: ['Department','DepartmentCollaboration','OrgIntelligenceEntry'], dashboard: '/noos' },
  { key: 'juris_engine', name: 'JurisEngine', dept: 'legal', entities: ['CaseFile','LegalIssue'], dashboard: '/jurisengine' },
  { key: 'nc_canon', name: 'NC Canon', dept: 'legal', entities: ['CanonEntry','CanonImportQueue','CanonCoverage'], dashboard: '/canon' },
  { key: 'evidence_vault', name: 'Evidence Vault', dept: 'legal', entities: ['Evidence','VideoEvidence','Witness'], dashboard: '/evidence' },
  { key: 'event_ecosystem', name: 'Event Ecosystem', dept: 'events', entities: ['Event','Venue','EventProvider'], dashboard: '/experience' },
  { key: 'resource_compass', name: 'Resource Compass', dept: 'community', entities: ['Resource','ResourceCase','ResourceApplication'], dashboard: '/resource-compass' },
  { key: 'nail', name: 'NAIL — Autonomous Loop', dept: 'technology', entities: ['ModuleHealthReport','FounderIntelligenceBrief','OrgIQScore','ExecutiveReview','OrgReflection'], dashboard: '/nail' },
];

const AI_EXECUTIVES = [
  { name: 'Chief Operations AI', dept: 'executive', focus: 'operations' },
  { name: 'Chief Technology AI', dept: 'technology', focus: 'technology' },
  { name: 'Chief Legal AI', dept: 'legal', focus: 'legal' },
  { name: 'Chief Financial AI', dept: 'finance', focus: 'finance' },
  { name: 'Chief Workforce AI', dept: 'workforce', focus: 'workforce' },
  { name: 'Chief Intelligence AI', dept: 'research', focus: 'intelligence' },
  { name: 'Chief Customer Success AI', dept: 'customer_success', focus: 'customer_success' },
  { name: 'Chief Event AI', dept: 'events', focus: 'events' },
  { name: 'Chief Research AI', dept: 'research', focus: 'research' },
];

function todayStr() { return new Date().toISOString().split('T')[0]; }
function nowISO() { return new Date().toISOString(); }

function iqLabel(score) {
  if (score >= 90) return 'Genius';
  if (score >= 75) return 'Advanced';
  if (score >= 60) return 'Proficient';
  if (score >= 45) return 'Developing';
  if (score >= 30) return 'Emerging';
  return 'Foundational';
}

async function safeList(base44, entityName, limit) {
  try {
    return await base44.asServiceRole.entities[entityName].list('-created_date', limit || 200);
  } catch (e) {
    return [];
  }
}

// ---- OPERATION: scan_modules ----
async function scanModules(base44) {
  const departments = await safeList(base44, 'Department', 50);
  const deptMap = {};
  for (const d of departments) deptMap[d.dept_key] = d;
  const reports = [];

  for (const mod of MODULE_REGISTRY) {
    let recordsCount = 0;
    for (const entName of mod.entities) {
      const items = await safeList(base44, entName, 50);
      recordsCount += items.length;
    }

    const dept = deptMap[mod.dept];
    const deptHealth = dept ? (dept.health_score || 50) : 50;
    const dataScore = recordsCount > 20 ? 100 : Math.min(100, recordsCount * 5);
    const healthScore = Math.round(dataScore * 0.4 + deptHealth * 0.6);
    const riskLevel = healthScore < 35 ? 'critical' : healthScore < 45 ? 'high' : healthScore < 65 ? 'medium' : 'low';
    const trend = (dept && dept.health_trend) || 'stable';

    const recommendedActions = [];
    if (recordsCount === 0) recommendedActions.push({ action: `Seed initial data for ${mod.name}`, priority: 65, dashboard: mod.dashboard });
    if (healthScore < 50) recommendedActions.push({ action: `Improve ${mod.name} data quality and automation coverage`, priority: 70, dashboard: mod.dashboard });
    if (recordsCount > 20 && healthScore < 80) recommendedActions.push({ action: `${mod.name} has active data — automate next workflow`, priority: 55, dashboard: mod.dashboard });

    const knowledgeLinks = [{ source: mod.key, target: 'dept_' + mod.dept, type: 'owned_by' }];
    if (recordsCount > 0) knowledgeLinks.push({ source: mod.key, target: 'data:' + mod.entities.join(','), type: 'has_data' });

    let report;
    try {
      report = await base44.asServiceRole.entities.ModuleHealthReport.create({
        module_key: mod.key,
        module_name: mod.name,
        dept_key: mod.dept,
        report_type: 'daily',
        health_score: healthScore,
        health_label: healthScore >= 80 ? 'Excellent' : healthScore >= 60 ? 'Good' : healthScore >= 40 ? 'Fair' : 'At Risk',
        confidence: Math.min(100, 40 + recordsCount * 3),
        risk_level: riskLevel,
        risk_summary: recordsCount === 0 ? `${mod.name} has no data` : `${mod.name} operating at ${healthScore}/100 across ${mod.entities.length} entities`,
        opportunity_summary: recordsCount > 10 ? `${mod.name} has ${recordsCount} records ready for automation` : `${mod.name} needs data seeding to unlock value`,
        dependencies: mod.entities,
        dependency_issues: [],
        recommended_actions: recommendedActions,
        memory_updates: recordsCount > 0 ? [`${mod.name}: ${recordsCount} records active`] : [],
        knowledge_graph_links: knowledgeLinks,
        metrics: { records_count: recordsCount, dept_health: deptHealth, entities_tracked: mod.entities.length },
        records_count: recordsCount,
        trend,
        predicted_bottleneck: healthScore < 45,
        predicted_bottleneck_desc: healthScore < 45 ? `${mod.name} health at ${healthScore}/100 — may block dependent modules` : '',
        report_date: nowISO(),
        dashboard_path: mod.dashboard,
        status: 'active'
      });
    } catch (e) { /* skip persist */ }

    reports.push({ module_key: mod.key, module_name: mod.name, health_score: healthScore, records_count: recordsCount, risk_level: riskLevel, trend, dashboard: mod.dashboard });
  }

  return { operation: 'scan_modules', modules_scanned: reports.length, reports };
}

// ---- OPERATION: daily_reflection ----
async function dailyReflection(base44) {
  const dateStr = todayStr();
  const tasks = await safeList(base44, 'Task', 100);
  const insights = await safeList(base44, 'OrchestrationInsight', 50);
  const lessons = await safeList(base44, 'EngineeringLesson', 50);
  const automations = await safeList(base44, 'Automation', 50);
  const memories = await safeList(base44, 'OrgMemoryProject', 50);
  const reflections = await safeList(base44, 'OrgReflection', 10);

  const tasksCompleted = tasks.filter(t => t.status === 'done').length;
  const tasksInProgress = tasks.filter(t => t.status === 'in_progress').length;
  const openTasks = tasks.filter(t => t.status === 'todo' || t.status === 'backlog').length;
  const criticalInsights = insights.filter(i => (i.severity || '') === 'critical' || (i.priority || 0) >= 70).length;

  const whatHappened = `Today: ${tasksCompleted} tasks completed, ${tasksInProgress} in progress, ${openTasks} open. ${criticalInsights} critical insights. ${lessons.length} engineering lessons, ${automations.length} automations, ${memories.length} project memories.`;
  const whatImproved = [];
  if (lessons.length > 0) whatImproved.push(`${lessons.length} engineering lessons captured`);
  if (automations.length > 0) whatImproved.push(`${automations.length} automations registered`);
  if (memories.length > 0) whatImproved.push(`${memories.length} project memories stored`);
  if (tasksCompleted > 0) whatImproved.push(`${tasksCompleted} tasks completed`);

  const whatFailed = [];
  const stalledTasks = tasks.filter(t => t.status === 'todo' || t.status === 'backlog');
  if (stalledTasks.length > 5) whatFailed.push(`${stalledTasks.length} tasks stalled in backlog/todo`);
  if (criticalInsights > 0) whatFailed.push(`${criticalInsights} critical insights unresolved`);

  const whatRepeated = [];
  if (openTasks > 10) whatRepeated.push(`${openTasks} open tasks — recurring backlog pattern`);
  if (insights.length > 0 && criticalInsights > 2) whatRepeated.push('Critical insights recurring — systemic issue');

  const shouldAutomate = [];
  if (openTasks > 10) shouldAutomate.push({ suggestion: 'Automate task triage and auto-assignment', priority: 70 });
  if (tasksCompleted > 5) shouldAutomate.push({ suggestion: 'Automate completed-task learning capture', priority: 65 });

  const shouldPolicy = [];
  if (criticalInsights > 2) shouldPolicy.push({ suggestion: 'Policy: auto-escalate critical insights to founder within 1 hour', priority: 80 });

  const shouldTraining = lessons.slice(0, 3).map(l => ({ suggestion: `Convert lesson "${l.title || l.lesson || 'Untitled'}" into Engineering Academy training`, priority: 60 }));

  const shouldMemory = memories.slice(0, 3).map(m => m.project_name || 'Project memory captured').filter(Boolean);
  if (whatImproved.length > 0) shouldMemory.push(`Daily progress: ${tasksCompleted} tasks, ${lessons.length} lessons`);

  const shouldCanon = [];
  const canonEntries = await safeList(base44, 'CanonEntry', 20);
  if (canonEntries.length === 0) shouldCanon.push({ suggestion: 'NC Canon has 0 verified entries — prioritize canon population', priority: 90 });

  const founderReview = [];
  if (criticalInsights > 0) founderReview.push(`Review ${criticalInsights} critical insights`);
  if (canonEntries.length === 0) founderReview.push('Review canon population strategy — 0 entries is a critical blocker');
  founderReview.push('Review Org IQ trend and automation coverage');

  let prevIq = 0;
  if (reflections.length > 0) prevIq = reflections[0].org_iq_delta || 0;

  let reflection;
  try {
    reflection = await base44.asServiceRole.entities.OrgReflection.create({
      reflection_date: dateStr,
      what_happened_today: whatHappened,
      what_improved: whatImproved,
      what_failed: whatFailed,
      what_surprised_us: whatRepeated.length > 0 ? ['Recurring patterns detected — see what_repeated'] : [],
      what_repeated: whatRepeated,
      should_become_automation: shouldAutomate,
      should_become_policy: shouldPolicy,
      should_become_training: shouldTraining,
      should_become_memory: shouldMemory,
      should_become_canon: shouldCanon,
      founder_review_tomorrow: founderReview,
      org_iq_delta: prevIq,
      automation_created: shouldAutomate.length,
      memory_captured: shouldMemory.length,
      knowledge_graph_updates: lessons.length + memories.length,
      status: 'active'
    });
  } catch (e) { /* skip */ }

  return {
    operation: 'daily_reflection',
    reflection_date: dateStr,
    summary: whatHappened,
    what_improved: whatImproved,
    what_failed: whatFailed,
    what_repeated: whatRepeated,
    should_become_automation: shouldAutomate,
    should_become_policy: shouldPolicy,
    should_become_training: shouldTraining,
    should_become_memory: shouldMemory,
    should_become_canon: shouldCanon,
    founder_review_tomorrow: founderReview
  };
}

// ---- OPERATION: executive_reviews ----
async function executiveReviews(base44) {
  const dateStr = todayStr();
  const departments = await safeList(base44, 'Department', 50);
  const deptMap = {};
  for (const d of departments) deptMap[d.dept_key] = d;

  const reviews = [];
  for (const exec of AI_EXECUTIVES) {
    const dept = deptMap[exec.dept] || {};
    const health = dept.health_score || 45;
    const risks = [];
    const opportunities = [];
    const recommendations = [];

    if (health < 50) risks.push({ risk: `${exec.dept} department health at ${health}/100`, severity: 'high' });
    if (!dept.owned_systems || dept.owned_systems.length === 0) risks.push({ risk: `${exec.dept} has no registered systems`, severity: 'medium' });

    if (health >= 60) opportunities.push({ opportunity: `${exec.dept} ready for automation expansion`, impact: 'high' });
    opportunities.push({ opportunity: 'Cross-department collaboration chain available', impact: 'medium' });

    recommendations.push(`Increase automation coverage in ${exec.dept}`);
    recommendations.push(`Capture lessons from completed ${exec.dept} work`);

    const f30 = { health_projection: Math.min(100, health + 5), key_risk: health < 50 ? 'Low health may persist' : 'Stable operations' };
    const f90 = { health_projection: Math.min(100, health + 12), growth_opportunity: `Automate 3+ ${exec.dept} workflows` };

    const knowledgeLearned = [`${exec.focus} department reviewed at ${health}/100 health`];
    const automationOpps = [{ workflow: `Auto-scan ${exec.dept} every 4 hours`, effort: 'low', impact: 'medium' }];

    const requiresApproval = ['legal', 'finance', 'compliance'].includes(exec.dept);
    const founderItems = requiresApproval ? [`${exec.dept} changes require founder approval`] : [];

    let review;
    try {
      review = await base44.asServiceRole.entities.ExecutiveReview.create({
        review_date: dateStr,
        executive_name: exec.name,
        executive_id: exec.name.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
        dept_key: exec.dept,
        department_health: health,
        biggest_risks: risks,
        biggest_opportunities: opportunities,
        immediate_recommendations: recommendations,
        forecast_30_day: f30,
        forecast_90_day: f90,
        knowledge_learned: knowledgeLearned,
        automation_opportunities: automationOpps,
        requires_founder_approval: requiresApproval,
        founder_review_items: founderItems,
        status: 'completed'
      });
    } catch (e) { /* skip */ }

    reviews.push({ executive: exec.name, dept: exec.dept, health, risks: risks.length, opportunities: opportunities.length, requires_approval: requiresApproval });
  }

  return { operation: 'executive_reviews', executives_reviewed: reviews.length, reviews };
}

// ---- OPERATION: workforce_automation ----
async function workforceAutomation(base44) {
  const profiles = await safeList(base44, 'WorkforceProfile', 100);
  const pipelineStages = await safeList(base44, 'CareerPipelineStage', 50);
  const assessments = await safeList(base44, 'WorkforceAssessment', 50);
  const passports = await safeList(base44, 'CareerPassportEntry', 50);
  const training = await safeList(base44, 'TrainingCourse', 50);

  let updated = 0;
  const summary = [];

  for (const profile of profiles) {
    const profileAssessments = assessments.filter(a => a.workforce_profile_id === profile.id);
    const profilePassports = passports.filter(p => p.workforce_profile_id === profile.id);
    const currentStage = pipelineStages.find(s => s.stage_key === profile.current_stage) || pipelineStages[0];
    const nextStage = pipelineStages.find(s => s.stage_order === ((currentStage && currentStage.stage_order) || 0) + 1);

    const readinessScore = profile.readiness_score || 0;
    const trustScore = profile.trust_score || 0;
    const contributionScore = profile.contribution_score || 0;

    const statusUpdate = {
      current_status: currentStage ? currentStage.stage_name : 'Interest',
      next_training: training.length > 0 ? (training[0].title || training[0].course_name || 'Next available training') : 'Assign training',
      next_certification: profileAssessments.length > 0 ? 'Schedule certification assessment' : 'Complete assessment first',
      next_assignment: readinessScore >= 60 ? 'Eligible for assignment' : 'Continue readiness building',
      next_goal: nextStage ? `Advance to ${nextStage.stage_name}` : 'Reach eligible stage',
      career_progress: Math.round((profilePassports.length / Math.max(1, pipelineStages.length)) * 100),
      trust_change: trustScore > 70 ? '+2 (strong)' : trustScore > 50 ? '0 (stable)' : '-1 (attention)',
      contribution_change: contributionScore > 50 ? '+3 (active)' : '0 (baseline)',
      director_notes: readinessScore < 40 ? 'Needs readiness support' : 'On track',
      mentor_recommendation: trustScore > 70 && readinessScore > 60 ? 'Ready to mentor juniors' : 'Continue development',
      passport_updates: profilePassports.length,
      last_auto_update: nowISO()
    };

    try {
      await base44.asServiceRole.entities.WorkforceProfile.update(profile.id, {
        auto_status: statusUpdate.current_status,
        auto_next_training: statusUpdate.next_training,
        auto_next_goal: statusUpdate.next_goal,
        auto_career_progress_pct: statusUpdate.career_progress,
        auto_mentor_recommendation: statusUpdate.mentor_recommendation,
        last_auto_update: statusUpdate.last_auto_update
      });
      updated++;
      if (summary.length < 10) summary.push({ profile_id: profile.id, name: profile.full_name || profile.name || 'Worker', stage: statusUpdate.current_status, progress: statusUpdate.career_progress });
    } catch (e) { /* skip */ }
  }

  return { operation: 'workforce_automation', workers_updated: updated, sample: summary };
}

// ---- OPERATION: director_briefings ----
async function directorBriefings(base44) {
  const dateStr = todayStr();
  const customers = await safeList(base44, 'CustomerSuccessProfile', 100);
  const workers = await safeList(base44, 'WorkforceProfile', 100);
  const tasks = await safeList(base44, 'Task', 100);

  const customerAlerts = customers.filter(c => (c.churn_risk_level || 'low') === 'high' || (c.churn_risk_level || 'low') === 'critical');
  const followUpCustomers = customers.filter(c => c.follow_up_required || (c.health_score || 50) < 50);
  const readyWorkers = workers.filter(w => (w.readiness_score || 0) >= 60);
  const complianceWarnings = workers.filter(w => (w.compliance_status || 'pending') === 'non_compliant');
  const revenueOpps = customers.filter(c => (c.mrr || 0) > 0 && (c.renewal_status || '') === 'upcoming');

  const briefing = {
    date: dateStr,
    morning_briefing: `${customerAlerts.length} customer alerts, ${followUpCustomers.length} need follow-up, ${readyWorkers.length} workers ready, ${complianceWarnings.length} compliance warnings`,
    worker_alerts: readyWorkers.slice(0, 5).map(w => ({ name: w.full_name || w.name, readiness: w.readiness_score })),
    customer_alerts: customerAlerts.slice(0, 5).map(c => ({ name: c.customer_name, risk: c.churn_risk_level })),
    upcoming_assignments: tasks.filter(t => t.status === 'todo' && t.priority === 'high').slice(0, 5).map(t => ({ title: t.title, due: t.due_date })),
    customers_needing_followup: followUpCustomers.slice(0, 5).map(c => ({ name: c.customer_name, health: c.health_score })),
    training_recommendations: ['Assign compliance training to flagged workers', 'Mentor-ready workers should guide juniors'],
    compliance_warnings: complianceWarnings.length,
    revenue_opportunities: revenueOpps.slice(0, 5).map(c => ({ name: c.customer_name, mrr: c.mrr })),
    mentoring_opportunities: readyWorkers.slice(0, 3).map(w => ({ name: w.full_name || w.name, recommendation: 'Ready to mentor' })),
    daily_reflection_summary: 'See Org Reflection for full daily summary'
  };

  return { operation: 'director_briefings', briefing };
}

// ---- OPERATION: org_learning ----
async function orgLearning(base44) {
  const tasks = await safeList(base44, 'Task', 200);
  const completedTasks = tasks.filter(t => t.status === 'done');

  const recommendations = [];
  for (const task of completedTasks.slice(0, 50)) {
    const title = (task.title || '').toLowerCase();
    const rec = { task_id: task.id, title: task.title, destination: 'memory', reason: '', priority: 50 };

    if (title.includes('bug') || title.includes('fix') || title.includes('error')) {
      rec.destination = 'bug_knowledge'; rec.reason = 'Bug fix — capture in BugKnowledgeBase and Engineering Academy'; rec.priority = 75;
    } else if (title.includes('automate') || title.includes('workflow') || title.includes('cron')) {
      rec.destination = 'automation'; rec.reason = 'Automation task — register as reusable workflow'; rec.priority = 80;
    } else if (title.includes('policy') || title.includes('governance') || title.includes('rule')) {
      rec.destination = 'policy'; rec.reason = 'Governance change — requires founder approval then policy record'; rec.priority = 85;
    } else if (title.includes('train') || title.includes('lesson') || title.includes('academy')) {
      rec.destination = 'training'; rec.reason = 'Training content — add to Engineering Academy'; rec.priority = 70;
    } else if (title.includes('canon') || title.includes('legal') || title.includes('statute')) {
      rec.destination = 'canon'; rec.reason = 'Legal/canon content — add to NC Canon'; rec.priority = 80;
    } else if (title.includes('graph') || title.includes('knowledge') || title.includes('node')) {
      rec.destination = 'knowledge_graph'; rec.reason = 'Knowledge structure — update Knowledge Graph'; rec.priority = 65;
    } else {
      rec.destination = 'memory'; rec.reason = 'General completion — capture in Development Memory'; rec.priority = 50;
    }

    if (rec.priority >= 80 && ['policy', 'canon'].includes(rec.destination)) rec.founder_review = true;
    recommendations.push(rec);
  }

  const byDestination = {};
  for (const r of recommendations) byDestination[r.destination] = (byDestination[r.destination] || 0) + 1;

  return {
    operation: 'org_learning',
    tasks_reviewed: recommendations.length,
    by_destination: byDestination,
    recommendations: recommendations.slice(0, 15),
    founder_review_count: recommendations.filter(r => r.founder_review).length
  };
}

// ---- OPERATION: compute_org_iq ----
async function computeOrgIQ(base44) {
  const dateStr = todayStr();
  const lessons = await safeList(base44, 'EngineeringLesson', 100);
  const automations = await safeList(base44, 'Automation', 100);
  const memories = await safeList(base44, 'OrgMemoryProject', 100);
  const reflections = await safeList(base44, 'OrgReflection', 100);
  const customers = await safeList(base44, 'CustomerSuccessProfile', 100);
  const workers = await safeList(base44, 'WorkforceProfile', 100);
  const departments = await safeList(base44, 'Department', 50);
  const prevIQs = await safeList(base44, 'OrgIQScore', 5);

  // 10 dimensions
  const knowledgeGrowth = Math.min(100, lessons.length * 4);
  const automationCoverage = Math.min(100, automations.length * 8);
  const memoryQuality = Math.min(100, memories.length * 5);
  const decisionAccuracy = Math.min(100, 50 + reflections.length * 5);
  const predictionAccuracy = 55; // baseline, improves as predictions verified
  const crossDeptCollab = departments.length > 0 ? Math.min(100, Math.round(departments.filter(d => (d.owned_systems || []).length > 0).length / departments.length * 100)) : 0;
  const learningVelocity = Math.min(100, lessons.length * 6);
  const founderWorkloadReduction = Math.min(100, 20 + automations.length * 6 + reflections.length * 4);
  const customerOutcomes = customers.length > 0 ? Math.min(100, Math.round(customers.filter(c => (c.health_score || 0) >= 60).length / customers.length * 100)) : 0;
  const workforceGrowth = workers.length > 0 ? Math.min(100, Math.round(workers.filter(w => (w.readiness_score || 0) >= 60).length / Math.max(1, workers.length) * 100)) : 0;

  const dims = { knowledgeGrowth, automationCoverage, memoryQuality, decisionAccuracy, predictionAccuracy, crossDeptCollab, learningVelocity, founderWorkloadReduction, customerOutcomes, workforceGrowth };
  const orgIQ = Math.round(Object.values(dims).reduce((a, b) => a + b, 0) / 10);
  const prevIQ = prevIQs.length > 0 ? prevIQs[0].org_iq : 0;
  const delta = orgIQ - prevIQ;
  const trend = delta > 2 ? 'improving' : delta < -2 ? 'declining' : 'stable';

  let score;
  try {
    score = await base44.asServiceRole.entities.OrgIQScore.create({
      score_date: dateStr,
      org_iq: orgIQ,
      iq_label: iqLabel(orgIQ),
      knowledge_growth: knowledgeGrowth,
      automation_coverage: automationCoverage,
      memory_quality: memoryQuality,
      decision_accuracy: decisionAccuracy,
      prediction_accuracy: predictionAccuracy,
      cross_dept_collaboration: crossDeptCollab,
      learning_velocity: learningVelocity,
      founder_workload_reduction: founderWorkloadReduction,
      customer_outcomes: customerOutcomes,
      workforce_growth: workforceGrowth,
      trend,
      previous_iq: prevIQ,
      delta,
      notes: `Org IQ computed from ${Object.keys(dims).length} dimensions`,
      status: 'active'
    });
  } catch (e) { /* skip */ }

  return { operation: 'compute_org_iq', org_iq: orgIQ, iq_label: iqLabel(orgIQ), dimensions: dims, trend, delta, previous_iq: prevIQ };
}

// ---- OPERATION: founder_intelligence ----
async function founderIntelligence(base44) {
  const dateStr = todayStr();
  const departments = await safeList(base44, 'Department', 50);
  const moduleReports = await safeList(base44, 'ModuleHealthReport', 100);
  const agents = await safeList(base44, 'AgentProfile', 100);
  const customers = await safeList(base44, 'CustomerSuccessProfile', 100);
  const workers = await safeList(base44, 'WorkforceProfile', 100);
  const tasks = await safeList(base44, 'Task', 200);
  const insights = await safeList(base44, 'OrchestrationInsight', 50);
  const iqScores = await safeList(base44, 'OrgIQScore', 5);
  const canonEntries = await safeList(base44, 'CanonEntry', 20);
  const financialTxns = await safeList(base44, 'FinancialTransaction', 100);
  const automations = await safeList(base44, 'Automation', 100);
  const memories = await safeList(base44, 'OrgMemoryProject', 100);
  const lessons = await safeList(base44, 'EngineeringLesson', 100);

  const orgIQ = iqScores.length > 0 ? iqScores[0].org_iq : 0;
  const orgHealth = departments.length > 0 ? Math.round(departments.reduce((s, d) => s + (d.health_score || 50), 0) / departments.length) : 50;
  const orgReadiness = departments.length > 0 ? Math.round(departments.reduce((s, d) => s + (d.readiness_score || 50), 0) / departments.length) : 50;

  // Top 10 Priorities
  const topPriorities = [];
  const criticalCustomers = customers.filter(c => (c.churn_risk_level || 'low') === 'critical' || (c.churn_risk_level || 'low') === 'high');
  if (criticalCustomers.length > 0) topPriorities.push({ title: `${criticalCustomers.length} customers at churn risk`, action: 'Execute win-back workflow', priority: 90, dashboard: '/customer-success' });
  if (canonEntries.length === 0) topPriorities.push({ title: 'NC Canon has 0 verified entries', action: 'Populate canon — critical blocker for legal readiness', priority: 88, dashboard: '/canon' });
  const lowHealthDepts = departments.filter(d => (d.health_score || 50) < 45);
  if (lowHealthDepts.length > 0) topPriorities.push({ title: `${lowHealthDepts.length} departments below 45 health`, action: 'Intervene on low-health departments', priority: 75, dashboard: '/noos' });
  const openHighTasks = tasks.filter(t => t.status !== 'done' && t.priority === 'critical');
  if (openHighTasks.length > 0) topPriorities.push({ title: `${openHighTasks.length} critical tasks open`, action: 'Resolve critical tasks', priority: 80, dashboard: '/sprint-board' });
  const criticalInsights = insights.filter(i => (i.severity || '') === 'critical' || (i.priority || 0) >= 70);
  if (criticalInsights.length > 0) topPriorities.push({ title: `${criticalInsights.length} critical orchestration insights`, action: 'Review and resolve', priority: 78, dashboard: '/build-nc' });
  topPriorities.push({ title: 'Review Org IQ trend', action: `Org IQ at ${orgIQ} — drive automation + learning`, priority: 60, dashboard: '/nail' });
  while (topPriorities.length < 10 && tasks.length > 0) {
    const t = tasks[topPriorities.length % Math.max(1, tasks.length)];
    if (t && t.title) topPriorities.push({ title: t.title, action: 'Complete task', priority: 40, dashboard: '/sprint-board' });
    else break;
  }

  // Top 10 Risks
  const topRisks = [];
  topRisks.push({ risk: 'Canon population blocker', detail: `${canonEntries.length} canon entries — legal readiness blocked`, level: 'critical' });
  topRisks.push({ risk: 'Customer churn', detail: `${criticalCustomers.length} customers at high/critical churn risk`, level: criticalCustomers.length > 0 ? 'critical' : 'low' });
  topRisks.push({ risk: 'Low department health', detail: `${lowHealthDepts.length} departments below 45`, level: lowHealthDepts.length > 3 ? 'high' : 'medium' });
  const predictedBottlenecks = moduleReports.filter(m => m.predicted_bottleneck);
  topRisks.push({ risk: 'Module bottlenecks', detail: `${predictedBottlenecks.length} modules predicted to bottleneck`, level: predictedBottlenecks.length > 3 ? 'high' : 'medium' });
  topRisks.push({ risk: 'Automation gap', detail: `${automations.length} automations registered — low coverage`, level: automations.length < 5 ? 'high' : 'medium' });

  // Top 10 Opportunities
  const topOpportunities = [];
  topOpportunities.push({ opportunity: 'Automate workforce status updates', impact: 'high', effort: 'low', dashboard: '/workforce-gateway' });
  topOpportunities.push({ opportunity: 'Automate director daily briefings', impact: 'high', effort: 'low', dashboard: '/director-assistant' });
  topOpportunities.push({ opportunity: 'Expand AI executive autonomy', impact: 'high', effort: 'medium', dashboard: '/executive-workforce' });
  topOpportunities.push({ opportunity: 'Capture org learning from completed tasks', impact: 'medium', effort: 'low', dashboard: '/nail' });
  topOpportunities.push({ opportunity: 'Populate NC Canon for legal readiness', impact: 'critical', effort: 'high', dashboard: '/canon' });

  // Top delegation candidates (tasks that could be delegated to AI)
  const topDelegation = tasks.filter(t => t.status !== 'done').slice(0, 10).map(t => ({ task: t.title, delegate_to: 'AI Executive', reason: 'Routine task — AI can handle', dashboard: '/sprint-board' }));

  // Top automation candidates
  const topAutomation = [];
  topAutomation.push({ candidate: 'Module health scanning (every 4h)', effort: 'low', impact: 'high' });
  topAutomation.push({ candidate: 'Daily reflection engine', effort: 'low', impact: 'high' });
  topAutomation.push({ candidate: 'Workforce status auto-update', effort: 'medium', impact: 'high' });
  topAutomation.push({ candidate: 'Org learning recommendation', effort: 'low', impact: 'medium' });
  topAutomation.push({ candidate: 'Org IQ computation', effort: 'low', impact: 'medium' });

  // Top revenue opportunities
  const topRevenue = customers.filter(c => (c.mrr || 0) > 0).sort((a, b) => (b.mrr || 0) - (a.mrr || 0)).slice(0, 10).map(c => ({ customer: c.customer_name, mrr: c.mrr, action: c.renewal_status === 'upcoming' ? 'Renewal outreach' : 'Expansion opportunity', dashboard: '/crm-revenue' }));
  const predictedRevenue = customers.reduce((s, c) => s + (c.mrr || 0) * 12, 0);

  // Top customers needing attention
  const topCustomers = customers.filter(c => (c.health_score || 50) < 60 || (c.churn_risk_level || 'low') !== 'low').sort((a, b) => (a.health_score || 50) - (b.health_score || 50)).slice(0, 10).map(c => ({ customer: c.customer_name, health: c.health_score, churn_risk: c.churn_risk_level, mrr: c.mrr, dashboard: '/customer-success' }));

  // Top workers ready for advancement
  const topWorkers = workers.filter(w => (w.readiness_score || 0) >= 60).sort((a, b) => (b.readiness_score || 0) - (a.readiness_score || 0)).slice(0, 10).map(w => ({ name: w.full_name || w.name, readiness: w.readiness_score, trust: w.trust_score, stage: w.current_stage, dashboard: '/workforce-gateway' }));

  // Top departments needing intervention
  const topDepts = departments.sort((a, b) => (a.health_score || 50) - (b.health_score || 50)).slice(0, 10).map(d => ({ name: d.dept_name, health: d.health_score, readiness: d.readiness_score, risk: d.risk_level, dashboard: '/noos' }));

  // Highest ROI action today
  const highestROI = criticalCustomers.length > 0
    ? { action: 'Execute win-back for critical churn-risk customers', roi: criticalCustomers.length * 500 + criticalCustomers.reduce((s, c) => s + (c.mrr || 0) * 12, 0), dashboard: '/customer-success' }
    : { action: 'Populate NC Canon to unlock legal readiness', roi: 5000, dashboard: '/canon' };

  // Predictions
  const predictedChurn = criticalCustomers.map(c => ({ customer: c.customer_name, risk: c.churn_risk_level, mrr: c.mrr, days_to_renewal: c.days_to_renewal }));
  const predictedStaffing = workers.length < 10 ? [{ need: 'Workforce expansion', detail: `${workers.length} workers — consider recruiting`, priority: 'medium' }] : [{ need: 'Optimize existing workforce', detail: `${workers.length} workers tracked`, priority: 'low' }];
  const predictedInfra = [{ need: 'Scale automation infrastructure', detail: `${automations.length} automations — increase for autonomy`, priority: 'medium' }];
  const predictedFounderWorkload = Math.max(2, 40 - automations.length * 2 - orgIQ / 4);
  const predictedAIWorkload = Math.min(100, 30 + automations.length * 5 + agents.length);

  // Health dimensions
  const legalReadiness = Math.min(100, canonEntries.length * 5);
  const financialReadiness = financialTxns.length > 0 ? Math.min(100, 50 + financialTxns.length * 2) : 20;
  const customerHealth = customers.length > 0 ? Math.round(customers.reduce((s, c) => s + (c.health_score || 50), 0) / customers.length) : 50;
  const workforceHealth = workers.length > 0 ? Math.round(workers.reduce((s, w) => s + (w.readiness_score || 50), 0) / workers.length) : 50;
  const revenueHealth = Math.min(100, Math.round((predictedRevenue / 100000) * 100));
  const automationCoverage = Math.min(100, automations.length * 8);
  const memoryGrowth = memories.length + lessons.length;
  const knowledgeGrowth = lessons.length;
  const systemConfidence = Math.round((orgHealth + orgIQ + orgReadiness) / 3);

  // AI health
  const aiHealth = agents.slice(0, 10).map(a => ({ name: a.name, status: a.status, performance: a.performance_score || 0, tasks_completed: a.tasks_completed || 0 }));

  // Department health
  const deptHealth = departments.slice(0, 20).map(d => ({ name: d.dept_name, health: d.health_score, readiness: d.readiness_score, risk: d.risk_level, ai_executive: d.assigned_ai_executive }));

  // Module health
  const modHealth = moduleReports.slice(0, 20).map(m => ({ name: m.module_name, health: m.health_score, risk: m.risk_level, records: m.records_count, dashboard: m.dashboard_path }));

  const founderTimeSavedWeek = Math.round((automationCoverage / 100) * 20 + (orgIQ / 100) * 15 + memories.length * 0.1);

  let brief;
  try {
    brief = await base44.asServiceRole.entities.FounderIntelligenceBrief.create({
      brief_date: dateStr,
      brief_type: 'morning',
      org_health_score: orgHealth,
      org_iq: orgIQ,
      org_readiness: orgReadiness,
      top_priorities: topPriorities.slice(0, 10),
      top_risks: topRisks.slice(0, 10),
      top_opportunities: topOpportunities,
      top_delegation_candidates: topDelegation,
      top_automation_candidates: topAutomation,
      top_revenue_opportunities: topRevenue.slice(0, 10),
      top_customers_needing_attention: topCustomers,
      top_workers_ready_advancement: topWorkers,
      top_departments_needing_intervention: topDepts,
      highest_roi_action: highestROI,
      predicted_revenue: predictedRevenue,
      predicted_churn: predictedChurn,
      predicted_staffing_needs: predictedStaffing,
      predicted_infrastructure_needs: predictedInfra,
      predicted_founder_workload_hours: predictedFounderWorkload,
      predicted_ai_workload_hours: predictedAIWorkload,
      founder_time_saved_week_hours: founderTimeSavedWeek,
      department_health: deptHealth,
      module_health: modHealth,
      ai_health: aiHealth,
      system_confidence: systemConfidence,
      automation_coverage_pct: automationCoverage,
      memory_growth: memoryGrowth,
      knowledge_growth: knowledgeGrowth,
      legal_readiness: legalReadiness,
      financial_readiness: financialReadiness,
      customer_health: customerHealth,
      workforce_health: workforceHealth,
      revenue_health: revenueHealth,
      status: 'active'
    });
  } catch (e) { /* skip */ }

  return {
    operation: 'founder_intelligence',
    brief_date: dateStr,
    org_health: orgHealth,
    org_iq: orgIQ,
    org_readiness: orgReadiness,
    top_priorities: topPriorities.slice(0, 10),
    top_risks: topRisks.slice(0, 10),
    top_opportunities: topOpportunities,
    top_delegation_candidates: topDelegation.length,
    top_automation_candidates: topAutomation,
    top_revenue_opportunities: topRevenue.slice(0, 5),
    top_customers_needing_attention: topCustomers.slice(0, 5),
    top_workers_ready_advancement: topWorkers.slice(0, 5),
    top_departments_needing_intervention: topDepts.slice(0, 5),
    highest_roi_action: highestROI,
    predicted_revenue: predictedRevenue,
    predicted_churn_count: predictedChurn.length,
    predicted_founder_workload_hours: predictedFounderWorkload,
    predicted_ai_workload_hours: predictedAIWorkload,
    founder_time_saved_week_hours: founderTimeSavedWeek,
    legal_readiness: legalReadiness,
    financial_readiness: financialReadiness,
    customer_health: customerHealth,
    workforce_health: workforceHealth,
    revenue_health: revenueHealth,
    automation_coverage_pct: automationCoverage,
    memory_growth: memoryGrowth,
    knowledge_growth: knowledgeGrowth,
    system_confidence: systemConfidence
  };
}

// ---- OPERATION: founder_dashboard ----
async function founderDashboard(base44) {
  const briefs = await safeList(base44, 'FounderIntelligenceBrief', 1);
  const iqScores = await safeList(base44, 'OrgIQScore', 7);
  const moduleReports = await safeList(base44, 'ModuleHealthReport', 100);
  const executiveReviews = await safeList(base44, 'ExecutiveReview', 20);
  const reflections = await safeList(base44, 'OrgReflection', 5);
  const departments = await safeList(base44, 'Department', 50);
  const agents = await safeList(base44, 'AgentProfile', 100);

  const latestBrief = briefs[0] || null;
  const latestIQ = iqScores[0] || null;
  const iqHistory = iqScores.slice().reverse().map(s => ({ date: s.score_date, iq: s.org_iq, delta: s.delta }));

  // dedupe module reports by module_key (latest)
  const modMap = {};
  for (const r of moduleReports) if (!modMap[r.module_key] || new Date(r.report_date) > new Date(modMap[r.module_key].report_date)) modMap[r.module_key] = r;
  const moduleHealth = Object.values(modMap).map(m => ({ module_key: m.module_key, module_name: m.module_name, health_score: m.health_score, risk_level: m.risk_level, records_count: m.records_count, trend: m.trend, predicted_bottleneck: m.predicted_bottleneck, dashboard: m.dashboard_path }));

  const aiHealth = agents.slice(0, 20).map(a => ({ name: a.name, status: a.status, performance: a.performance_score || 0, tasks_completed: a.tasks_completed || 0, department: a.department }));

  const deptHealth = departments.map(d => ({ name: d.dept_name, dept_key: d.dept_key, health: d.health_score, readiness: d.readiness_score, risk: d.risk_level, automation: d.automation_score, ai_executive: d.assigned_ai_executive }));

  const execReviews = executiveReviews.slice(0, 9).map(r => ({ executive: r.executive_name, dept: r.dept_key, health: r.department_health, risks: r.biggest_risks, opportunities: r.biggest_opportunities, recommendations: r.immediate_recommendations, requires_approval: r.requires_founder_approval, forecast_30: r.forecast_30_day, forecast_90: r.forecast_90_day }));

  const latestReflection = reflections[0] || null;

  return {
    operation: 'founder_dashboard',
    latest_brief: latestBrief,
    latest_iq: latestIQ,
    iq_history: iqHistory,
    module_health: moduleHealth,
    department_health: deptHealth,
    ai_health: aiHealth,
    executive_reviews: execReviews,
    latest_reflection: latestReflection,
    departments_count: departments.length,
    modules_count: moduleHealth.length,
    ai_agents_count: agents.length
  };
}

// ---- OPERATION: run_full_loop ----
async function runFullLoop(base44) {
  const steps = [];
  try { const r = await scanModules(base44); steps.push({ step: 'scan_modules', status: 'ok', modules: r.modules_scanned }); } catch (e) { steps.push({ step: 'scan_modules', status: 'error', error: e.message }); }
  try { const r = await computeOrgIQ(base44); steps.push({ step: 'compute_org_iq', status: 'ok', org_iq: r.org_iq }); } catch (e) { steps.push({ step: 'compute_org_iq', status: 'error', error: e.message }); }
  try { const r = await executiveReviews(base44); steps.push({ step: 'executive_reviews', status: 'ok', reviews: r.executives_reviewed }); } catch (e) { steps.push({ step: 'executive_reviews', status: 'error', error: e.message }); }
  try { const r = await workforceAutomation(base44); steps.push({ step: 'workforce_automation', status: 'ok', workers: r.workers_updated }); } catch (e) { steps.push({ step: 'workforce_automation', status: 'error', error: e.message }); }
  try { const r = await directorBriefings(base44); steps.push({ step: 'director_briefings', status: 'ok' }); } catch (e) { steps.push({ step: 'director_briefings', status: 'error', error: e.message }); }
  try { const r = await orgLearning(base44); steps.push({ step: 'org_learning', status: 'ok', tasks: r.tasks_reviewed }); } catch (e) { steps.push({ step: 'org_learning', status: 'error', error: e.message }); }
  try { const r = await dailyReflection(base44); steps.push({ step: 'daily_reflection', status: 'ok' }); } catch (e) { steps.push({ step: 'daily_reflection', status: 'error', error: e.message }); }
  try { const r = await founderIntelligence(base44); steps.push({ step: 'founder_intelligence', status: 'ok', org_iq: r.org_iq, founder_time_saved_week_hours: r.founder_time_saved_week_hours }); } catch (e) { steps.push({ step: 'founder_intelligence', status: 'error', error: e.message }); }
  return { operation: 'run_full_loop', steps_completed: steps.length, steps };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    let body = {};
    try { body = await req.json(); } catch (e) { /* allow empty */ }
    const operation = body.operation || 'founder_dashboard';

    let result;
    switch (operation) {
      case 'scan_modules': result = await scanModules(base44); break;
      case 'daily_reflection': result = await dailyReflection(base44); break;
      case 'executive_reviews': result = await executiveReviews(base44); break;
      case 'workforce_automation': result = await workforceAutomation(base44); break;
      case 'director_briefings': result = await directorBriefings(base44); break;
      case 'org_learning': result = await orgLearning(base44); break;
      case 'compute_org_iq': result = await computeOrgIQ(base44); break;
      case 'founder_intelligence': result = await founderIntelligence(base44); break;
      case 'founder_dashboard': result = await founderDashboard(base44); break;
      case 'run_full_loop': result = await runFullLoop(base44); break;
      case 'init': result = { operation: 'init', message: 'NAIL ready — no seeding required. Use run_full_loop to execute the full autonomous loop.', module_count: MODULE_REGISTRY.length, executive_count: AI_EXECUTIVES.length }; break;
      default: result = { error: 'Unknown operation: ' + operation };
    }

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});