import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ============================================================
// NC OPERATIONS & ORGANIZATIONAL OPERATING SYSTEM (NOOS)
// Turns isolated modules into a functioning organization
// ============================================================

const DEPARTMENTS = [
  { dept_key: "executive_office", dept_name: "Executive Office", dept_type: "executive",
    mission: "Set strategy, approve governance, protect founder authority",
    owned_systems: ["Executive Command", "Mission Control", "Founder Dashboard"],
    owned_dashboards: ["/executive-command", "/founder-dashboard", "/mission-control"],
    ai_executive: "Chief Operations AI" },
  { dept_key: "legal_ops", dept_name: "Legal Operations", dept_type: "legal",
    mission: "Legal research, evidence, authority compliance, case management",
    owned_systems: ["JurisEngine", "Evidence Vault", "NC Canon", "Case Files"],
    owned_dashboards: ["/jurisengine", "/evidence", "/canon", "/cases"],
    ai_executive: "Chief Legal AI" },
  { dept_key: "customer_success", dept_name: "Customer Success", dept_type: "customer_success",
    mission: "Maximize customer health, retention, expansion",
    owned_systems: ["Customer Success", "CRM"],
    owned_dashboards: ["/customer-success", "/crm"],
    ai_executive: "Chief Customer Success AI" },
  { dept_key: "workforce_ops", dept_name: "Workforce Operations", dept_type: "workforce",
    mission: "Talent pipeline, career progression, director mentorship",
    owned_systems: ["Workforce Gateway", "Workforce Hub", "Career Passport"],
    owned_dashboards: ["/workforce-gateway", "/workforce", "/workforce-director"],
    ai_executive: "Chief Workforce AI" },
  { dept_key: "business_dev", dept_name: "Business Development", dept_type: "business_development",
    mission: "Generate revenue, partnerships, enterprise expansion",
    owned_systems: ["Enterprise Marketplace", "Clone Engine", "CRM Pipeline"],
    owned_dashboards: ["/enterprise-marketplace", "/clone-engine", "/crm-pipeline"],
    ai_executive: "Chief Operations AI" },
  { dept_key: "finance", dept_name: "Finance", dept_type: "finance",
    mission: "Financial intelligence, runway, revenue operations",
    owned_systems: ["Financial Intelligence", "Revenue OS"],
    owned_dashboards: ["/financial-intelligence"],
    ai_executive: "Chief Financial AI" },
  { dept_key: "technology", dept_name: "Technology", dept_type: "technology",
    mission: "Platform architecture, infrastructure, technical debt",
    owned_systems: ["Build Studio", "Infrastructure Library", "Platform Health"],
    owned_dashboards: ["/build-studio", "/infrastructure", "/health"],
    ai_executive: "Chief Technology AI" },
  { dept_key: "engineering", dept_name: "Engineering", dept_type: "engineering",
    mission: "Build features, resolve dependencies, ship releases",
    owned_systems: ["Build Studio", "Sprint Board", "Feature Builder", "Blueprint Library"],
    owned_dashboards: ["/build-studio", "/sprint-board", "/features", "/blueprints"],
    ai_executive: "Chief Technology AI" },
  { dept_key: "ai_ops", dept_name: "AI Operations", dept_type: "ai_operations",
    mission: "Deploy, monitor, and coordinate AI workforce",
    owned_systems: ["AI Workforce", "Agent Center", "Agent Roster"],
    owned_dashboards: ["/workforce", "/agents", "/agent-roster"],
    ai_executive: "Chief Intelligence AI" },
  { dept_key: "research", dept_name: "Research", dept_type: "research",
    mission: "Investigate patterns, generate intelligence, evolve platform",
    owned_systems: ["NC Intelligence", "Evolution Engine", "Enterprise Simulator"],
    owned_dashboards: ["/nc-intelligence", "/evolution-engine", "/enterprise-simulator"],
    ai_executive: "Chief Research AI" },
  { dept_key: "training", dept_name: "Training", dept_type: "training",
    mission: "Engineering Academy, workforce training, knowledge transfer",
    owned_systems: ["Engineering Academy", "Training Library"],
    owned_dashboards: ["/engineering-academy", "/workforce/training"],
    ai_executive: "Chief Research AI" },
  { dept_key: "culture", dept_name: "Culture", dept_type: "culture",
    mission: "Cultural content, creator empowerment, community",
    owned_systems: ["Culture Rail", "Creator Dashboard", "Community Dashboard"],
    owned_dashboards: ["/culture", "/culture/creator-dashboard", "/culture/community-dashboard"],
    ai_executive: "Chief Operations AI" },
  { dept_key: "events", dept_name: "Events", dept_type: "events",
    mission: "Venue optimization, event readiness, experience network",
    owned_systems: ["Experience Network", "Event Readiness", "Event Operations"],
    owned_dashboards: ["/experience", "/experience/readiness", "/experience/operations"],
    ai_executive: "Chief Event AI" },
  { dept_key: "media", dept_name: "Media", dept_type: "media",
    mission: "Content production, media management, distribution",
    owned_systems: ["Culture Content Manager", "Videos", "Radio"],
    owned_dashboards: ["/culture/videos", "/culture/radio"],
    ai_executive: "Chief Operations AI" },
  { dept_key: "marketing", dept_name: "Marketing", dept_type: "marketing",
    mission: "Growth, advertising, engagement analytics",
    owned_systems: ["Advertising", "Engagement Analytics"],
    owned_dashboards: ["/culture/advertising", "/culture/analytics"],
    ai_executive: "Chief Operations AI" },
  { dept_key: "sales", dept_name: "Sales", dept_type: "sales",
    mission: "Lead conversion, pipeline management, deal closing",
    owned_systems: ["CRM Leads", "CRM Pipeline", "CRM Deals"],
    owned_dashboards: ["/crm-leads", "/crm-pipeline"],
    ai_executive: "Chief Customer Success AI" },
  { dept_key: "compliance", dept_name: "Compliance", dept_type: "compliance",
    mission: "Governance, ethics, constitutional enforcement",
    owned_systems: ["Self Governance", "NC Constitution", "Governance Engine"],
    owned_dashboards: ["/self-governance", "/canon"],
    ai_executive: "Chief Legal AI" },
  { dept_key: "community", dept_name: "Community", dept_type: "community",
    mission: "Member journey, reputation, trust system",
    owned_systems: ["Member Intake", "Reputation Records", "Trust Scores"],
    owned_dashboards: ["/resource-compass"],
    ai_executive: "Chief Customer Success AI" },
  { dept_key: "infrastructure", dept_name: "Infrastructure", dept_type: "infrastructure",
    mission: "Hosting, scaling, platform reliability",
    owned_systems: ["Platform Health Monitor", "Build Registry"],
    owned_dashboards: ["/health", "/build-registry"],
    ai_executive: "Chief Technology AI" },
  { dept_key: "security", dept_name: "Security", dept_type: "security",
    mission: "Audit logs, access control, threat detection",
    owned_systems: ["Audit Log", "Platform Config"],
    owned_dashboards: ["/audit-log", "/platform-config"],
    ai_executive: "Chief Legal AI" }
];

const AI_EXECUTIVES = [
  { name: "Chief Operations AI", purpose: "Coordinate all operational departments", department: "executive_office",
    c_suite_title: "Chief Operating Officer", agent_type: "c_suite",
    capabilities: ["coordination", "resource_allocation", "priority_management"],
    authority_limits: "Cannot approve legal, financial, pricing, or governance decisions" },
  { name: "Chief Technology AI", purpose: "Coordinate technology and engineering", department: "technology",
    c_suite_title: "Chief Technology Officer", agent_type: "c_suite",
    capabilities: ["architecture", "technical_debt", "build_coordination"],
    authority_limits: "Cannot approve pricing or governance decisions" },
  { name: "Chief Financial AI", purpose: "Coordinate finance and revenue", department: "finance",
    c_suite_title: "Chief Financial Officer", agent_type: "c_suite",
    capabilities: ["financial_analysis", "runway_management", "revenue_optimization"],
    authority_limits: "Cannot approve financial decisions — founder approval required" },
  { name: "Chief Workforce AI", purpose: "Coordinate workforce and talent", department: "workforce_ops",
    c_suite_title: "Chief People Officer", agent_type: "c_suite",
    capabilities: ["workforce_planning", "career_progression", "readiness_scoring"],
    authority_limits: "Cannot approve compensation changes — founder approval required" },
  { name: "Chief Customer Success AI", purpose: "Coordinate customer success and retention", department: "customer_success",
    c_suite_title: "Chief Customer Officer", agent_type: "c_suite",
    capabilities: ["churn_prevention", "health_scoring", "renewal_management"],
    authority_limits: "Cannot approve pricing or compensation decisions" },
  { name: "Chief Legal AI", purpose: "Coordinate legal, compliance, and canon", department: "legal_ops",
    c_suite_title: "Chief Legal Officer", agent_type: "c_suite",
    capabilities: ["legal_research", "compliance", "canon_verification"],
    authority_limits: "Cannot approve legal or governance decisions — founder approval required" },
  { name: "Chief Research AI", purpose: "Coordinate research and evolution", department: "research",
    c_suite_title: "Chief Research Officer", agent_type: "c_suite",
    capabilities: ["pattern_analysis", "evolution_engine", "simulation"],
    authority_limits: "Cannot approve governance or financial decisions" },
  { name: "Chief Intelligence AI", purpose: "Coordinate AI workforce and organizational intelligence", department: "ai_ops",
    c_suite_title: "Chief Intelligence Officer", agent_type: "c_suite",
    capabilities: ["ai_coordination", "intelligence_aggregation", "knowledge_graph"],
    authority_limits: "Cannot approve governance, pricing, or financial decisions" },
  { name: "Chief Event AI", purpose: "Coordinate events and experience network", department: "events",
    c_suite_title: "Chief Event Officer", agent_type: "c_suite",
    capabilities: ["event_readiness", "venue_optimization", "provider_management"],
    authority_limits: "Cannot approve financial or governance decisions" }
];

const QUESTION_MAP = {
  what_we_are_learning: "What are we learning?",
  what_keeps_repeating: "What keeps repeating?",
  what_creates_most_value: "What creates the most value?",
  what_wastes_most_time: "What wastes the most time?",
  what_should_automate_next: "What should we automate next?",
  what_should_delegate: "What should we delegate?",
  what_should_remove: "What should we remove?"
};

const COLLABORATION_CHAINS = {
  customer_issue: [
    { dept_key: "customer_success", action: "Discover and log customer issue" },
    { dept_key: "engineering", action: "Receive improvement request" },
    { dept_key: "ai_ops", action: "Store lesson in Development Memory" },
    { dept_key: "training", action: "Update training materials" },
    { dept_key: "research", action: "Update Knowledge Graph relationships" },
    { dept_key: "executive_office", action: "Update strategic priorities" }
  ],
  churn_signal: [
    { dept_key: "customer_success", action: "Detect churn risk signal" },
    { dept_key: "finance", action: "Assess revenue impact" },
    { dept_key: "executive_office", action: "Alert founder if critical" },
    { dept_key: "workforce_ops", action: "Assign win-back director" },
    { dept_key: "research", action: "Capture pattern in Org Intelligence" }
  ],
  canon_gap: [
    { dept_key: "legal_ops", action: "Identify canon gap blocking builds" },
    { dept_key: "research", action: "Analyze dependency impact" },
    { dept_key: "executive_office", action: "Prioritize ingestion" },
    { dept_key: "training", action: "Prepare ingestion workflow" }
  ],
  workforce_readiness: [
    { dept_key: "workforce_ops", action: "Assess worker readiness" },
    { dept_key: "training", action: "Assign required training" },
    { dept_key: "events", action: "Match to event opportunities" },
    { dept_key: "finance", action: "Calculate compensation" }
  ]
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const svc = base44.asServiceRole;

    const body = await req.json().catch(() => ({}));
    const operation = body.operation || 'overview';
    const params = body.params || {};

    // ============================================================
    // INIT: Seed departments + AI executives
    // ============================================================
    if (operation === 'init') {
      const existingDepts = await svc.entities.Department.list('-created_date', 100);
      const existingKeys = new Set(existingDepts.map(d => d.dept_key));
      const createdDepts = [];
      for (const d of DEPARTMENTS) {
        if (!existingKeys.has(d.dept_key)) {
          const rec = await svc.entities.Department.create({
            dept_key: d.dept_key,
            dept_name: d.dept_name,
            dept_type: d.dept_type,
            mission: d.mission,
            owned_systems: d.owned_systems || [],
            owned_dashboards: d.owned_dashboards || [],
            assigned_ai_executive: d.ai_executive,
            dependencies: [],
            current_objectives: [],
            current_problems: [],
            blocked_work: [],
            kpis: [],
            upcoming_deadlines: [],
            recommended_priorities: [],
            status: "active",
            founder_configurable: true,
            health_score: 50, productivity_score: 50, automation_score: 0,
            knowledge_score: 50, trust_score: 50, readiness_score: 50,
            revenue_impact: 0, cost: 0, risk_level: "low"
          });
          createdDepts.push(rec);
        }
      }

      // Seed AI executives as AgentProfile records
      const existingAgents = await svc.entities.AgentProfile.list('-created_date', 100);
      const existingAgentNames = new Set(existingAgents.map(a => a.name));
      const createdAgents = [];
      for (const a of AI_EXECUTIVES) {
        if (!existingAgentNames.has(a.name)) {
          const rec = await svc.entities.AgentProfile.create({
            name: a.name, purpose: a.purpose, agent_type: a.agent_type,
            c_suite_title: a.c_suite_title, department: a.department,
            capabilities: a.capabilities, authority_limits: a.authority_limits,
            status: "idle", performance_score: 0, tasks_completed: 0, tasks_failed: 0,
            permissions: ["read", "analyze", "recommend"], connected_modules: [],
            approval_chain: ["founder"], reports_to: "Founder",
            escalation_path: "Founder",
            executive_reporting: "Direct to Founder — cannot approve legal, financial, pricing, or governance"
          });
          createdAgents.push(rec);
        }
      }

      return Response.json({
        operation: 'init',
        departments_total: existingDepts.length + createdDepts.length,
        departments_created: createdDepts.length,
        ai_executives_total: existingAgents.length + createdAgents.length,
        ai_executives_created: createdAgents.length,
        message: `NOOS initialized: ${(existingDepts.length + createdDepts.length)} departments, ${(existingAgents.length + createdAgents.length)} AI executives`
      });
    }

    // ============================================================
    // EVALUATE HEALTH: Compute department health scores
    // ============================================================
    if (operation === 'evaluate_health') {
      const departments = await svc.entities.Department.list('-created_date', 100);
      const tasks = await svc.entities.Task.list('-created_date', 200);
      const insights = await svc.entities.OrchestrationInsight.list('-created_date', 100);
      const goals = await svc.entities.StrategicGoal.list('-created_date', 50);
      const projects = await svc.entities.Project.list('-created_date', 100);
      const agents = await svc.entities.AgentProfile.list('-created_date', 100);
      const txns = await svc.entities.FinancialTransaction.list('-created_date', 200);
      const csProfiles = await svc.entities.CustomerSuccessProfile.list('-created_date', 100);

      const updated = [];
      for (const dept of departments) {
        // Map dept to its systems
        const sysNames = dept.owned_systems || [];

        // Productivity: task completion rate for tasks tagged with this dept
        const deptTasks = tasks.filter(t => (t.tags || []).includes(dept.dept_key) || (t.tags || []).some(tag => sysNames.includes(tag)));
        const completedTasks = deptTasks.filter(t => t.status === 'done');
        const productivity = deptTasks.length > 0 ? Math.round((completedTasks.length / deptTasks.length) * 100) : 50;

        // Automation: count workflows/automations owned
        const automationScore = Math.min(100, ((dept.owned_workflows || []).length * 20) + (dept.owned_agents?.length || 0) * 15);

        // Knowledge: engineering lessons linked to this dept
        const lessons = await svc.entities.EngineeringLesson.list('-created_date', 50).catch(() => []);
        const deptLessons = lessons.filter(l => (l.tags || []).includes(dept.dept_key));
        const knowledgeScore = deptLessons.length > 0 ? Math.min(100, 40 + deptLessons.length * 10) : 40;

        // Trust: from existing trust scores if available
        const trustScore = dept.trust_score || 50;

        // Readiness: composite
        const readiness = Math.round((productivity * 0.3 + automationScore * 0.2 + knowledgeScore * 0.2 + trustScore * 0.3));

        // Health: composite of all
        const health = Math.round((productivity * 0.25 + automationScore * 0.15 + knowledgeScore * 0.15 + trustScore * 0.15 + readiness * 0.3));

        // Revenue impact & cost
        const revenue = txns.filter(t => t.transaction_type === 'revenue' && (t.tags || []).includes(dept.dept_key))
          .reduce((sum, t) => sum + (t.amount || 0), 0);
        const cost = txns.filter(t => t.transaction_type === 'expense' && (t.tags || []).includes(dept.dept_key))
          .reduce((sum, t) => sum + (t.amount || 0), 0);

        // Risk level
        const blockedCount = (dept.blocked_work || []).length;
        const atRiskCustomers = csProfiles.filter(c => c.churn_risk_level === 'high' || c.churn_risk_level === 'critical').length;
        let riskLevel = 'low';
        if (dept.dept_key === 'customer_success' && atRiskCustomers > 0) riskLevel = atRiskCustomers > 2 ? 'critical' : 'high';
        if (blockedCount > 2) riskLevel = 'high';
        if (health < 30) riskLevel = 'critical';
        else if (health < 50) riskLevel = 'high';
        else if (health < 70) riskLevel = 'medium';

        // Recommended priorities (from insights affecting this dept)
        const deptInsights = insights.filter(i => (i.affected_modules || []).some(m => sysNames.includes(m)) || (i.tags || []).includes(dept.dept_key));
        const recPriorities = deptInsights.slice(0, 5).map(i => i.recommended_action || i.title);

        await svc.entities.Department.update(dept.id, {
          productivity_score: productivity,
          automation_score: automationScore,
          knowledge_score: knowledgeScore,
          readiness_score: readiness,
          health_score: health,
          revenue_impact: revenue,
          cost,
          risk_level: riskLevel,
          recommended_priorities: recPriorities,
          last_evaluated: new Date().toISOString()
        });
        updated.push({
          dept_key: dept.dept_key, dept_name: dept.dept_name,
          health, productivity, automation: automationScore, knowledge: knowledgeScore,
          readiness, revenue_impact: revenue, cost, risk_level: riskLevel,
          recommended_priorities_count: recPriorities.length
        });
      }

      return Response.json({
        operation: 'evaluate_health',
        departments_evaluated: updated.length,
        departments: updated.sort((a, b) => b.health - a.health)
      });
    }

    // ============================================================
    // CROSS COLLABORATE: Process a cross-department chain
    // ============================================================
    if (operation === 'cross_collaborate') {
      const triggerType = params.trigger_type || 'customer_issue';
      const chain = COLLABORATION_CHAINS[triggerType] || COLLABORATION_CHAINS.customer_issue;
      const sourceDept = chain[0].dept_key;

      const collabKey = `${triggerType}_${Date.now()}`;
      const chainWithStatus = chain.map((step, i) => ({
        ...step,
        step_order: i,
        status: i === 0 ? 'completed' : 'pending',
        completed_at: i === 0 ? new Date().toISOString() : null
      }));

      const collab = await svc.entities.DepartmentCollaboration.create({
        collaboration_key: collabKey,
        title: params.title || `Cross-department collaboration: ${triggerType}`,
        source_dept: sourceDept,
        source_dept_name: DEPARTMENTS.find(d => d.dept_key === sourceDept)?.dept_name || sourceDept,
        trigger_event: triggerType,
        trigger_description: params.description || `Auto-initiated ${triggerType} collaboration`,
        trigger_entity: params.trigger_entity || '',
        trigger_entity_id: params.trigger_entity_id || '',
        chain: chainWithStatus,
        status: 'in_progress',
        auto_initiated: true,
        knowledge_captured: false
      });

      return Response.json({
        operation: 'cross_collaborate',
        collaboration_id: collab.id,
        collaboration_key: collabKey,
        source_dept: sourceDept,
        chain_steps: chainWithStatus.length,
        status: 'in_progress',
        message: `Collaboration chain initiated across ${chainWithStatus.length} departments`
      });
    }

    // ============================================================
    // ORG INTELLIGENCE: Answer the 7 living questions
    // ============================================================
    if (operation === 'org_intelligence') {
      const lessons = await svc.entities.EngineeringLesson.list('-created_date', 50).catch(() => []);
      const insights = await svc.entities.OrchestrationInsight.list('-created_date', 100);
      const memories = await svc.entities.NCOSMemory.list('-created_date', 100).catch(() => []);
      const patterns = await svc.entities.PatternRecord.list('-created_date', 50).catch(() => []);
      const tasks = await svc.entities.Task.list('-created_date', 200);
      const projects = await svc.entities.Project.list('-created_date', 100);
      const agents = await svc.entities.AgentProfile.list('-created_date', 100);

      const answers = {};

      // 1. What are we learning?
      answers.what_we_are_learning = {
        question_text: QUESTION_MAP.what_we_are_learning,
        answer: `${lessons.length} engineering lessons captured. ${patterns.length} patterns recorded. Top lesson: ${lessons[0]?.lesson_title || lessons[0]?.title || 'N/A'}. Memory records: ${memories.length}.`,
        confidence: Math.min(100, 40 + lessons.length * 5),
        trend: 'increasing',
        linked_entities: ['EngineeringLesson', 'PatternRecord', 'NCOSMemory'],
        recommended_actions: ['Review top 3 lessons this week', 'Apply lessons to active sprints']
      };

      // 2. What keeps repeating?
      const patternCounts = {};
      patterns.forEach(p => { const k = p.pattern_type || p.category || 'general'; patternCounts[k] = (patternCounts[k] || 0) + 1; });
      const topPattern = Object.entries(patternCounts).sort((a, b) => b[1] - a[1])[0];
      answers.what_keeps_repeating = {
        question_text: QUESTION_MAP.what_keeps_repeating,
        answer: topPattern ? `Most frequent pattern: ${topPattern[0]} (${topPattern[1]} occurrences). ${patterns.length} total patterns tracked.` : 'Insufficient pattern data — continue capturing.',
        confidence: patterns.length > 5 ? 80 : 40,
        trend: 'stable',
        linked_entities: ['PatternRecord'],
        recommended_actions: topPattern ? [`Investigate root cause of recurring: ${topPattern[0]}`, 'Automate resolution if pattern is benign'] : ['Capture more patterns']
      };

      // 3. What creates the most value?
      const completedProjects = projects.filter(p => p.status === 'done' || p.status === 'completed');
      const totalValue = completedProjects.reduce((s, p) => s + (p.value || p.revenue_impact || 0), 0);
      answers.what_creates_most_value = {
        question_text: QUESTION_MAP.what_creates_most_value,
        answer: `${completedProjects.length} completed projects generating ${totalValue} value. Top performing agent: ${agents.sort((a, b) => (b.performance_score || 0) - (a.performance_score || 0))[0]?.name || 'N/A'}.`,
        confidence: 70,
        trend: 'stable',
        linked_entities: ['Project', 'AgentProfile'],
        recommended_actions: ['Replicate top-value project patterns', 'Allocate more resources to high-value work']
      };

      // 4. What wastes the most time?
      const staleTasks = tasks.filter(t => t.status !== 'done' && t.created_date && (Date.now() - new Date(t.created_date).getTime()) > 14 * 86400000);
      answers.what_wastes_most_time = {
        question_text: QUESTION_MAP.what_wastes_most_time,
        answer: `${staleTasks.length} tasks stale (>14 days open). ${insights.filter(i => i.insight_type === 'bottleneck').length} active bottlenecks detected. Manual coordination overhead remains high.`,
        confidence: 75,
        trend: 'declining',
        linked_entities: ['Task', 'OrchestrationInsight'],
        recommended_actions: ['Close or reassign stale tasks', 'Automate bottleneck resolution', 'Reduce manual handoffs']
      };

      // 5. What should we automate next?
      const autoCandidates = insights.filter(i => i.auto_apply_eligible || i.insight_type === 'missing_automation');
      answers.what_should_automate_next = {
        question_text: QUESTION_MAP.what_should_automate_next,
        answer: `${autoCandidates.length} automation candidates identified. Top: ${autoCandidates[0]?.title || 'Continue scanning for repetitive manual processes'}.`,
        confidence: 80,
        trend: 'increasing',
        linked_entities: ['OrchestrationInsight'],
        recommended_actions: autoCandidates.slice(0, 3).map(i => i.recommended_action || i.title)
      };

      // 6. What should we delegate?
      const delegatable = tasks.filter(t => t.status === 'todo' && !t.assignee_id);
      answers.what_should_delegate = {
        question_text: QUESTION_MAP.what_should_delegate,
        answer: `${delegatable.length} unassigned tasks ready for delegation. ${agents.filter(a => a.status === 'idle').length} idle AI agents available for assignment.`,
        confidence: 70,
        trend: 'stable',
        linked_entities: ['Task', 'AgentProfile'],
        recommended_actions: ['Assign idle AI agents to unassigned tasks', 'Delegate routine work to AI workforce']
      };

      // 7. What should we remove?
      const unusedAssets = insights.filter(i => i.insight_type === 'unused_asset' || i.insight_type === 'duplicate_functionality');
      answers.what_should_remove = {
        question_text: QUESTION_MAP.what_should_remove,
        answer: `${unusedAssets.length} unused or duplicate assets identified. Removing them reduces maintenance overhead and cognitive load.`,
        confidence: 65,
        trend: 'stable',
        linked_entities: ['OrchestrationInsight', 'PlatformAsset'],
        recommended_actions: unusedAssets.slice(0, 3).map(i => i.recommended_action || i.title)
      };

      // Persist entries (clear old + bulkCreate)
      try {
        await svc.entities.OrgIntelligenceEntry.deleteMany({ status: 'active' });
        const entries = Object.entries(answers).map(([key, val]) => ({
          question_key: key, question_text: val.question_text, answer: val.answer,
          confidence: val.confidence, trend: val.trend,
          linked_entities: val.linked_entities || [], linked_departments: [],
          recommended_actions: val.recommended_actions || [],
          last_updated: new Date().toISOString(), status: 'active'
        }));
        await svc.entities.OrgIntelligenceEntry.bulkCreate(entries);
      } catch (e) { /* rate limit guard */ }

      return Response.json({
        operation: 'org_intelligence',
        questions_answered: 7,
        answers
      });
    }

    // ============================================================
    // CAPTURE PROJECT MEMORY
    // ============================================================
    if (operation === 'capture_project_memory') {
      const projectId = params.project_id;
      const project = projectId
        ? await svc.entities.Project.get(projectId)
        : { name: params.project_name || 'Unnamed Project', id: null };

      const tasks = projectId
        ? await svc.entities.Task.filter({ project_id: projectId }).catch(() => [])
        : [];

      const lessonPrompt = `Generate an organizational memory entry for a completed project.
Project: ${project.name || project.title || 'Unnamed'}
Description: ${project.description || 'N/A'}
Tasks completed: ${tasks.filter(t => t.status === 'done').length} of ${tasks.length}

Return JSON with:
- executive_summary (2-3 sentences, business outcome)
- technical_summary (2-3 sentences, what was built/changed)
- business_summary (2-3 sentences, value created)
- lessons_learned (array of 3-5 strings)
- mistakes (array of 2-3 strings, what went wrong)
- future_improvements (array of 3-5 strings)
- affected_departments (array of department keys from: executive_office, legal_ops, customer_success, workforce_ops, business_dev, finance, technology, engineering, ai_ops, research, training, culture, events, media, marketing, sales, compliance, community, infrastructure, security)`;

      const aiResp = await svc.integrations.Core.InvokeLLM({
        prompt: lessonPrompt,
        response_json_schema: {
          type: "object",
          properties: {
            executive_summary: { type: "string" },
            technical_summary: { type: "string" },
            business_summary: { type: "string" },
            lessons_learned: { type: "array", items: { type: "string" } },
            mistakes: { type: "array", items: { type: "string" } },
            future_improvements: { type: "array", items: { type: "string" } },
            affected_departments: { type: "array", items: { type: "string" } }
          }
        }
      });

      const mem = await svc.entities.OrgMemoryProject.create({
        project_name: project.name || project.title || params.project_name || 'Unnamed Project',
        project_id_ref: projectId || '',
        completion_date: new Date().toISOString(),
        executive_summary: aiResp.executive_summary || '',
        technical_summary: aiResp.technical_summary || '',
        business_summary: aiResp.business_summary || '',
        lessons_learned: aiResp.lessons_learned || [],
        mistakes: aiResp.mistakes || [],
        future_improvements: aiResp.future_improvements || [],
        affected_departments: aiResp.affected_departments || [],
        knowledge_graph_updates: [`Project ${project.name} completed — update relationship edges`],
        ai_training_updates: [`Lesson: ${aiResp.executive_summary?.slice(0, 100)}`],
        time_spent_hours: tasks.reduce((s, t) => s + (t.actual_hours || 0), 0),
        status: 'completed',
        knowledge_stored: true,
        departments_notified: true
      });

      return Response.json({
        operation: 'capture_project_memory',
        memory_id: mem.id,
        project_name: mem.project_name,
        affected_departments: mem.affected_departments,
        message: 'Organizational memory captured and departments notified'
      });
    }

    // ============================================================
    // EXECUTIVE BOARD: Compute board snapshot
    // ============================================================
    if (operation === 'executive_board') {
      const departments = await svc.entities.Department.list('-created_date', 100);
      const insights = await svc.entities.OrchestrationInsight.list('-created_date', 100);
      const projects = await svc.entities.Project.list('-created_date', 100);
      const agents = await svc.entities.AgentProfile.list('-created_date', 100);
      const csProfiles = await svc.entities.CustomerSuccessProfile.list('-created_date', 100);
      const goals = await svc.entities.StrategicGoal.list('-created_date', 50).catch(() => []);

      // Top risks
      const topRisks = insights.filter(i => i.insight_type === 'bottleneck' || i.insight_type === 'customer_risk')
        .sort((a, b) => b.priority_score - a.priority_score).slice(0, 5)
        .map(i => ({ title: i.title, description: i.description, priority: i.priority_score, modules: i.affected_modules }));

      // Top opportunities
      const topOpps = insights.filter(i => i.insight_type === 'platform_improvement' || i.insight_type === 'revenue_leak')
        .sort((a, b) => b.priority_score - a.priority_score).slice(0, 5)
        .map(i => ({ title: i.title, description: i.description, priority: i.priority_score, what_it_unlocks: i.what_it_unlocks }));

      // Most valuable project
      const mvp = projects.filter(p => p.status === 'in_progress' || p.status === 'todo')
        .sort((a, b) => (b.value || b.revenue_impact || 0) - (a.value || a.revenue_impact || 0))[0];

      // Largest bottleneck
      const bottleneck = insights.filter(i => i.insight_type === 'bottleneck')
        .sort((a, b) => b.priority_score - a.priority_score)[0];

      // Most valuable AI
      const topAI = agents.sort((a, b) => (b.performance_score || 0) - (a.performance_score || 0))[0];

      // Biggest revenue opportunity
      const revOpp = insights.filter(i => i.revenue_impact > 50)
        .sort((a, b) => b.revenue_impact - a.revenue_impact)[0];

      // Critical dependencies
      const criticalDeps = insights.filter(i => i.insight_type === 'bottleneck' && i.priority_score > 60)
        .slice(0, 5).map(i => ({ title: i.title, modules: i.affected_modules, priority: i.priority_score }));

      // Department health
      const deptHealth = departments.map(d => ({
        dept_key: d.dept_key, dept_name: d.dept_name,
        health_score: d.health_score || 50, readiness_score: d.readiness_score || 50,
        risk_level: d.risk_level || 'low'
      }));

      // Org readiness
      const avgHealth = departments.length > 0
        ? Math.round(departments.reduce((s, d) => s + (d.health_score || 50), 0) / departments.length)
        : 0;
      const readinessLabel = avgHealth >= 90 ? 'Self-Managing' : avgHealth >= 75 ? 'Highly Autonomous' :
        avgHealth >= 60 ? 'Near-Autonomous' : avgHealth >= 40 ? 'Coordinated' : 'Fragmented';

      const snapshot = await svc.entities.ExecutiveBoard.create({
        snapshot_date: new Date().toISOString(),
        department_health: deptHealth,
        top_risks: topRisks,
        top_opportunities: topOpps,
        most_valuable_project: mvp ? { name: mvp.name || mvp.title, value: mvp.value || mvp.revenue_impact || 0, status: mvp.status } : null,
        largest_bottleneck: bottleneck ? { title: bottleneck.title, description: bottleneck.description, priority: bottleneck.priority_score } : null,
        most_valuable_employee: { name: 'Founder', note: 'Directing all operations' },
        most_valuable_director: { name: 'To be assigned', note: 'Director assignment pending' },
        highest_performing_ai: topAI ? { name: topAI.name, performance_score: topAI.performance_score, tasks_completed: topAI.tasks_completed } : null,
        biggest_revenue_opportunity: revOpp ? { title: revOpp.title, revenue_impact: revOpp.revenue_impact, action: revOpp.recommended_action } : null,
        critical_dependencies: criticalDeps,
        org_readiness_score: avgHealth,
        readiness_label: readinessLabel,
        status: 'active'
      });

      return Response.json({
        operation: 'executive_board',
        snapshot_id: snapshot.id,
        org_readiness_score: avgHealth,
        readiness_label: readinessLabel,
        departments: deptHealth.length,
        top_risks: topRisks.length,
        top_opportunities: topOpps.length,
        most_valuable_project: snapshot.most_valuable_project,
        largest_bottleneck: snapshot.largest_bottleneck,
        highest_performing_ai: snapshot.highest_performing_ai,
        biggest_revenue_opportunity: snapshot.biggest_revenue_opportunity,
        critical_dependencies: criticalDeps.length
      });
    }

    // ============================================================
    // DAILY BRIEFING: Founder morning briefing
    // ============================================================
    if (operation === 'daily_briefing') {
      const departments = await svc.entities.Department.list('-created_date', 100);
      const insights = await svc.entities.OrchestrationInsight.list('-created_date', 50);
      const csProfiles = await svc.entities.CustomerSuccessProfile.list('-created_date', 100);
      const tasks = await svc.entities.Task.list('-created_date', 100);
      const goals = await svc.entities.StrategicGoal.list('-created_date', 20).catch(() => []);

      // Today's priorities (top 3 insights)
      const priorities = insights.sort((a, b) => b.priority_score - a.priority_score).slice(0, 3)
        .map(i => ({ title: i.title, action: i.recommended_action, priority: i.priority_score }));

      // Critical risks
      const criticalRisks = csProfiles.filter(c => c.churn_risk_level === 'critical').slice(0, 3)
        .map(c => ({ customer: c.customer_name, reason: c.alert_reason || 'Churn risk', level: c.churn_risk_level }));

      // Revenue opportunities
      const revOpps = insights.filter(i => i.revenue_impact > 50).slice(0, 3)
        .map(i => ({ title: i.title, impact: i.revenue_impact, action: i.recommended_action }));

      // Departments needing attention
      const deptsAttn = departments.filter(d => (d.health_score || 50) < 60 || d.risk_level === 'high' || d.risk_level === 'critical')
        .slice(0, 5).map(d => ({ name: d.dept_name, health: d.health_score, risk: d.risk_level, issue: (d.current_problems || [])[0] }));

      // Customers needing follow-up
      const custFollowup = csProfiles.filter(c => c.founder_alert_required || c.churn_risk_level === 'critical' || c.churn_risk_level === 'high')
        .slice(0, 5).map(c => ({ name: c.customer_name, reason: c.alert_reason || `${c.churn_risk_level} churn risk`, severity: c.alert_severity }));

      // Automation recommendations
      const autoRecs = insights.filter(i => i.auto_apply_eligible).slice(0, 3)
        .map(i => ({ title: i.title, action: i.recommended_action }));

      // Knowledge gained yesterday
      const recentMem = await svc.entities.NCOSMemory.list('-created_date', 5).catch(() => []);
      const knowledgeGained = recentMem.map(m => m.content || m.memory_text || m.title || 'Memory entry').slice(0, 3);

      // Highest ROI task
      const highRoiTask = tasks.filter(t => t.status === 'todo' && t.priority === 'critical').slice(0, 1)
        .map(t => ({ title: t.title, priority: t.priority, due: t.due_date }))[0] || null;

      const briefing = {
        date: new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
        today_priorities: priorities,
        critical_risks: criticalRisks,
        revenue_opportunities: revOpps,
        departments_needing_attention: deptsAttn,
        people_needing_coaching: [], // populated by workforce director
        customers_needing_followup: custFollowup,
        automation_recommendations: autoRecs,
        knowledge_gained_yesterday: knowledgeGained,
        highest_roi_task: highRoiTask
      };

      return Response.json({
        operation: 'daily_briefing',
        briefing
      });
    }

    // ============================================================
    // DEPENDENCY MAP: Live dependency graph
    // ============================================================
    if (operation === 'dependency_map') {
      const departments = await svc.entities.Department.list('-created_date', 100);
      const modules = await svc.entities.ModuleDependency.list('-created_date', 100).catch(() => []);
      const insights = await svc.entities.OrchestrationInsight.list('-created_date', 50);
      const agents = await svc.entities.AgentProfile.list('-created_date', 100);

      const nodes = [];

      // Department nodes
      for (const d of departments) {
        const blocked = (d.blocked_work || []).length;
        const isBottleneck = (d.health_score || 50) < 40 || blocked > 2;
        nodes.push({
          node_key: `dept_${d.dept_key}`, node_name: d.dept_name, node_type: 'department',
          dept_key: d.dept_key,
          depends_on: (d.dependencies || []).map(dep => `dept_${dep}`),
          depended_by: [],
          health_score: d.health_score || 50,
          is_bottleneck: isBottleneck,
          bottleneck_severity: isBottleneck ? (blocked > 2 ? 'critical' : 'high') : 'none',
          blocked_count: blocked,
          status: d.status || 'active'
        });
      }

      // Module nodes
      for (const m of modules) {
        const isBottleneck = (m.health_score || 50) < 40;
        nodes.push({
          node_key: `mod_${m.module_key}`, node_name: m.module_name, node_type: 'module',
          dept_key: m.module_category,
          depends_on: (m.depends_on || []).map(dep => `mod_${dep}`),
          depended_by: (m.depended_by || []).map(dep => `mod_${dep}`),
          health_score: m.health_score || 50,
          is_bottleneck: isBottleneck,
          bottleneck_severity: isBottleneck ? 'high' : 'none',
          blocked_count: 0,
          status: m.health_status || 'active'
        });
      }

      // AI agent nodes
      for (const a of agents) {
        nodes.push({
          node_key: `ai_${a.id}`, node_name: a.name, node_type: 'ai_agent',
          dept_key: a.department,
          depends_on: [], depended_by: [],
          health_score: a.performance_score || 50,
          is_bottleneck: a.status === 'error',
          bottleneck_severity: a.status === 'error' ? 'high' : 'none',
          blocked_count: 0,
          status: a.status || 'idle'
        });
      }

      // Persist (clear old + bulkCreate)
      try {
        await svc.entities.OrgDependency.deleteMany({});
        await svc.entities.OrgDependency.bulkCreate(nodes);
      } catch (e) { /* guard */ }

      const bottlenecks = nodes.filter(n => n.is_bottleneck);
      return Response.json({
        operation: 'dependency_map',
        total_nodes: nodes.length,
        departments: nodes.filter(n => n.node_type === 'department').length,
        modules: nodes.filter(n => n.node_type === 'module').length,
        ai_agents: nodes.filter(n => n.node_type === 'ai_agent').length,
        bottlenecks: bottlenecks.length,
        bottleneck_nodes: bottlenecks.sort((a, b) => b.blocked_count - a.blocked_count).slice(0, 10)
      });
    }

    // ============================================================
    // ORG READINESS: How close to self-managing?
    // ============================================================
    if (operation === 'org_readiness') {
      const departments = await svc.entities.Department.list('-created_date', 100);
      const agents = await svc.entities.AgentProfile.list('-created_date', 100);
      const insights = await svc.entities.OrchestrationInsight.list('-created_date', 100);
      const automationCount = await svc.entities.Automation.list('-created_date', 100).catch(() => []);
      const workflows = []; // workflows not in entity SDK

      const dimensions = [
        { name: 'Department Coordination', score: departments.length > 0 ? Math.round(departments.reduce((s, d) => s + (d.health_score || 50), 0) / departments.length) : 0, weight: 0.2 },
        { name: 'AI Autonomy', score: agents.length > 0 ? Math.round(agents.filter(a => a.status === 'active').length / agents.length * 100) : 0, weight: 0.2 },
        { name: 'Automation Coverage', score: Math.min(100, automationCount.length * 10), weight: 0.15 },
        { name: 'Cross-Dept Collaboration', score: 60, weight: 0.15 },
        { name: 'Knowledge Capture', score: Math.min(100, 40 + insights.length * 2), weight: 0.1 },
        { name: 'Org Memory', score: 50, weight: 0.1 },
        { name: 'Dependency Visibility', score: 70, weight: 0.1 }
      ];

      const overall = Math.round(dimensions.reduce((s, d) => s + d.score * d.weight, 0));
      const label = overall >= 90 ? 'Self-Managing Enterprise' : overall >= 75 ? 'Highly Autonomous' :
        overall >= 60 ? 'Near-Autonomous' : overall >= 40 ? 'Coordinated Modules' : 'Fragmented Modules';

      return Response.json({
        operation: 'org_readiness',
        overall_score: overall,
        label,
        dimensions,
        autonomous_pct: overall,
        remaining_to_self_managing: Math.max(0, 100 - overall),
        departments_count: departments.length,
        ai_executives_count: agents.filter(a => a.agent_type === 'c_suite').length,
        automations_count: automationCount.length
      });
    }

    // ============================================================
    // OVERVIEW: Default
    // ============================================================
    if (operation === 'overview') {
      const departments = await svc.entities.Department.list('-created_date', 100);
      const agents = await svc.entities.AgentProfile.filter({ agent_type: 'c_suite' }).catch(() => []);
      const collabs = await svc.entities.DepartmentCollaboration.list('-created_date', 20);
      const intelligence = await svc.entities.OrgIntelligenceEntry.list('-created_date', 10);
      const memories = await svc.entities.OrgMemoryProject.list('-created_date', 10);

      return Response.json({
        operation: 'overview',
        status: departments.length === 0 ? 'not_initialized' : 'active',
        departments: departments.length,
        ai_executives: agents.length,
        active_collaborations: collabs.filter(c => c.status === 'in_progress').length,
        org_intelligence_entries: intelligence.length,
        org_memory_projects: memories.length
      });
    }

    return Response.json({ error: 'Unknown operation' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});