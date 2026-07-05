import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ─── NCICE: NC Continuous Intelligence & Communication Engine ───
// Platform-agnostic: every behavior below is driven by NCICE_CONFIG.
// Deployable into future Axiom Boundary Technologies platforms via configuration only.

const NCICE_CONFIG = {
  org_name: 'Nautical Compass',
  roles: [
    { key: 'founder', label: 'Founder', scope: 'organization', sees: ['organization_wide'] },
    { key: 'executive_ai', label: 'Executive AI', scope: 'department', sees: ['department'] },
    { key: 'director', label: 'Director', scope: 'team', sees: ['assigned_workers', 'assigned_customers'] },
    { key: 'employee', label: 'Employee', scope: 'assigned', sees: ['assigned_work'] },
    { key: 'worker', label: 'Worker', scope: 'assignments', sees: ['assignments', 'career_progress'] },
    { key: 'mentor', label: 'Mentor', scope: 'mentees', sees: ['mentees'] },
    { key: 'customer', label: 'Customer', scope: 'onboarding', sees: ['onboarding', 'progress', 'next_steps'] },
  ],
  meeting_types: ['founder','director','customer','vendor','legal','engineering','workforce','research','event_planning','other'],
  memory_targets: ['enterprise_memory','development_memory','knowledge_graph','engineering_journal','training_library','founder_journal','director_journal','customer_timeline','career_passport','organizational_intelligence','policy_library','workflow_library','canon_review_queue'],
  feedback_questions: [
    'What happened?', 'Did we accomplish the objective?', 'What delayed progress?',
    'What accelerated progress?', 'What should improve?', 'What should be automated?',
    'What should become training?', 'What should become policy?', 'What should become memory?',
    'What should become canon?', 'What should become engineering work?', 'What should Founder review?'
  ],
  comms_dimensions: ['clarity','professionalism','helpfulness','accuracy','empathy','compliance','trust_building','educational_value','relationship_building'],
  founder_approval_categories: ['governance','legal','pricing','compensation','structural','ip','external_comms'],
  digest_sections: ['organization','department','revenue','customer','workforce','legal','engineering','research','event','risk','knowledge','automation'],
};

// ─── Rate-limit-resilient batch helpers ───
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
async function withRetry(fn, retries = 3, baseDelay = 600) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try { return await fn(); }
    catch (e) {
      const msg = ((e?.message || '') + '').toLowerCase();
      const isRateLimit = msg.includes('rate') || msg.includes('429') || msg.includes('too many') || msg.includes('overload') || msg.includes('throttl') || msg.includes('econnreset') || msg.includes('timeout');
      if (attempt === retries || !isRateLimit) throw e;
      await sleep(baseDelay * Math.pow(2, attempt));
    }
  }
}
async function persistBatched(svc, entity, records, batchSize = 5) {
  let saved = 0; const errors = [];
  for (let i = 0; i < records.length; i += batchSize) {
    const chunk = records.slice(i, i + batchSize);
    try { await withRetry(() => svc.entities[entity].bulkCreate(chunk)); saved += chunk.length; }
    catch (e) {
      for (const rec of chunk) {
        try { await withRetry(() => svc.entities[entity].create(rec)); saved++; }
        catch (e2) { errors.push({ key: rec.insight_key || rec.node_key || rec.commitment_text || 'unknown', error: e2.message }); }
      }
      await sleep(250);
    }
    if (i + batchSize < records.length) await sleep(150);
  }
  return { saved, errors };
}
async function safeList(svc, entity, ...args) { try { return await withRetry(() => svc.entities[entity].list(...args)); } catch { return []; } }
async function safeFilter(svc, entity, query, ...args) { try { return await withRetry(() => svc.entities[entity].filter(query, ...args)); } catch { return []; } }
const clamp = (n) => Math.max(0, Math.min(100, Math.round(n)));
const avg = (a) => a.length ? Math.round(a.reduce((s, n) => s + (n || 0), 0) / a.length) : 0;
const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toISOString();
const slug = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 80);

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const svc = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));
    const { operation, params = {} } = body;

    // ─── CAPTURE EVENT: the heart of NCICE ───
    if (operation === 'capture_event') {
      const result = await captureEventInternal(svc, user, params);
      return Response.json({ operation: 'capture_event', ...result });
    }

    // ─── CAPTURE MEETING (convenience alias) ───
    if (operation === 'capture_meeting') {
      const result = await captureEventInternal(svc, user, { ...params, source_type: 'meeting' });
      return Response.json({ operation: 'capture_meeting', ...result });
    }

    // ─── CAPTURE RECENT: auto-ingest recent organizational events ───
    if (operation === 'capture_recent') {
      const recentMeetings = await safeList(svc, 'MeetingIntelligence', '-created_date', 5);
      const recentInteractions = await safeList(svc, 'CustomerInteraction', '-created_date', 10);
      const recentReviews = await safeList(svc, 'ExecutiveReview', '-created_date', 5);
      const captured = [];
      for (const m of recentMeetings.filter(m => !m.executive_summary)) {
        try {
          await captureEventInternal(svc, user, { source_type: 'meeting', source_id: m.id, source_title: m.meeting_title, raw_content: m.raw_notes || m.meeting_title, meeting_type: m.meeting_type, department: m.department });
          captured.push({ type: 'meeting', id: m.id, ok: true });
        } catch (e) { captured.push({ type: 'meeting', id: m.id, error: e.message }); }
        await sleep(400);
      }
      for (const ci of recentInteractions.slice(0, 5)) {
        try {
          await captureEventInternal(svc, user, { source_type: 'customer_interaction', source_id: ci.id, source_title: ci.description || 'Customer interaction', raw_content: `${ci.description || ''} — outcome: ${ci.outcome || ''}`, department: 'customer_success' });
          captured.push({ type: 'interaction', id: ci.id, ok: true });
        } catch (e) { captured.push({ type: 'interaction', id: ci.id, error: e.message }); }
        await sleep(400);
      }
      for (const er of recentReviews.slice(0, 3)) {
        try {
          await captureEventInternal(svc, user, { source_type: 'executive_review', source_id: er.id, source_title: `${er.executive_name} review`, raw_content: `${er.executive_name} department review. Risks: ${JSON.stringify(er.biggest_risks || [])}. Recommendations: ${JSON.stringify(er.immediate_recommendations || [])}`, department: er.dept_key });
          captured.push({ type: 'review', id: er.id, ok: true });
        } catch (e) { captured.push({ type: 'review', id: er.id, error: e.message }); }
        await sleep(400);
      }
      return Response.json({ operation: 'capture_recent', captured: captured.length, details: captured });
    }

    // ─── GENERATE ROLE BRIEFING ───
    if (operation === 'generate_briefing') {
      const result = await generateBriefingInternal(svc, user, params);
      return Response.json({ operation: 'generate_briefing', role: params.target_role || 'founder', briefing: result.briefing, id: result.id });
    }

    // ─── GENERATE ORG DIGEST ───
    if (operation === 'generate_digest') {
      const result = await generateDigestInternal(svc, params);
      return Response.json({ operation: 'generate_digest', digest: result.digest, id: result.id });
    }

    // ─── PROCESS FOLLOW-UPS: never lose a commitment ───
    if (operation === 'process_followups') {
      const result = await processFollowupsInternal(svc);
      return Response.json({ operation: 'process_followups', ...result });
    }

    // ─── CONVERSATION GRAPH ───
    if (operation === 'conversation_graph') {
      const { node_type, q } = params;
      const query = {};
      if (node_type) query.node_type = node_type;
      let nodes = await safeFilter(svc, 'ConversationNode', query, '-discussion_count', 100);
      if (q) {
        const ql = q.toLowerCase();
        nodes = nodes.filter(n => (n.node_label || '').toLowerCase().includes(ql) || (n.node_description || '').toLowerCase().includes(ql));
      }
      const recurring = nodes.filter(n => n.is_recurring_topic).sort((a, b) => (b.recurrence_count || 0) - (a.recurrence_count || 0));
      const unresolved = nodes.filter(n => n.is_unresolved);
      const experts = nodes.filter(n => (n.expert_score || 0) > 0).sort((a, b) => (b.expert_score || 0) - (a.expert_score || 0));
      return Response.json({ operation: 'conversation_graph', total_nodes: nodes.length, recurring_topics: recurring.slice(0, 15), unresolved: unresolved.slice(0, 15), experts: experts.slice(0, 10), all: nodes.slice(0, 50) });
    }

    // ─── MEMORY TIMELINE SEARCH ───
    if (operation === 'memory_timeline_search') {
      const { q, entry_type, linked_department, linked_customer, linked_project, limit = 50 } = params;
      const query = {};
      if (entry_type) query.entry_type = entry_type;
      if (linked_department) query.linked_department = linked_department;
      if (linked_customer) query.linked_customer = linked_customer;
      if (linked_project) query.linked_project = linked_project;
      let entries = await safeFilter(svc, 'MemoryTimelineEntry', query, '-entry_date', limit);
      if (q) {
        const ql = q.toLowerCase();
        entries = entries.filter(e => (e.searchable_text || e.title || e.description || '').toLowerCase().includes(ql));
      }
      return Response.json({ operation: 'memory_timeline_search', total: entries.length, entries });
    }

    // ─── METRICS ───
    if (operation === 'metrics') {
      const m = await computeMetrics(svc);
      return Response.json({ operation: 'metrics', ...m });
    }

    // ─── RUN DAILY CYCLE: digest + all role briefings + follow-ups (direct internal calls) ───
    if (operation === 'run_daily_cycle') {
      const steps = [];
      try {
        const d = await generateDigestInternal(svc, { digest_type: 'morning' });
        steps.push({ step: 'digest', status: 'ok', id: d?.id });
      } catch (e) { steps.push({ step: 'digest', status: 'error', error: e.message }); }

      const briefResults = [];
      for (const role of NCICE_CONFIG.roles.slice(0, 5)) {
        try {
          await generateBriefingInternal(svc, user, { target_role: role.key });
          briefResults.push({ role: role.key, ok: true });
        } catch (e) { briefResults.push({ role: role.key, ok: false, error: e.message }); }
        await sleep(400);
      }
      steps.push({ step: 'briefings', status: 'ok', results: briefResults });

      try {
        const f = await processFollowupsInternal(svc);
        steps.push({ step: 'followups', status: 'ok', ...f });
      } catch (e) { steps.push({ step: 'followups', status: 'error', error: e.message }); }

      try {
        const m = await computeMetrics(svc);
        steps.push({ step: 'metrics', status: 'ok', ...m });
      } catch (e) { steps.push({ step: 'metrics', status: 'error', error: e.message }); }

      return Response.json({ operation: 'run_daily_cycle', steps_completed: steps.length, steps });
    }

    // ─── DASHBOARD: aggregated frontend data ───
    if (operation === 'dashboard') {
      const [latestDigest, latestBriefs, recentMeetings, recentFeedback, openCommitments, graph, recentComms, recentTimeline, metricsData] = await Promise.all([
        safeList(svc, 'OrgDigest', '-created_date', 1),
        safeList(svc, 'RoleBriefing', '-created_date', 10),
        safeList(svc, 'MeetingIntelligence', '-created_date', 10),
        safeList(svc, 'FeedbackLoopEntry', '-created_date', 10),
        safeFilter(svc, 'CommitmentTracker', { status: { $ne: 'completed' } }, '-due_date', 50),
        safeList(svc, 'ConversationNode', '-discussion_count', 30),
        safeList(svc, 'CommunicationEvaluation', '-created_date', 10),
        safeList(svc, 'MemoryTimelineEntry', '-entry_date', 20),
        computeMetrics(svc)
      ]);
      return Response.json({
        operation: 'dashboard',
        latest_digest: latestDigest[0] || null,
        latest_briefings: latestBriefs,
        recent_meetings: recentMeetings,
        recent_feedback: recentFeedback,
        open_commitments: openCommitments,
        conversation_graph: graph,
        recent_communications: recentComms,
        recent_timeline: recentTimeline,
        metrics: metricsData
      });
    }

    return Response.json({ error: 'Unknown operation: ' + operation }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// ─── CAPTURE EVENT INTERNAL: the unified intelligence extractor ───
async function captureEventInternal(svc, user, params) {
  const { source_type, source_id, source_title, raw_content, participants, meeting_type, organizer, department, linked_customers, linked_projects, due_date, owner } = params;
  if (!source_type || !raw_content) throw new Error('source_type and raw_content required');

  const llm = await svc.integrations.Core.InvokeLLM({
    prompt: `You are the NC Continuous Intelligence Engine for ${NCICE_CONFIG.org_name}. Analyze this organizational event and extract structured intelligence so nothing valuable is forgotten.

EVENT TYPE: ${source_type}
TITLE: ${source_title || 'Untitled'}
DEPARTMENT: ${department || 'unspecified'}
PARTICIPANTS: ${JSON.stringify(participants || [])}
RAW CONTENT:
"""
${raw_content}
"""

Extract:
1. executive_summary (2-4 sentences)
2. feedback_loop: answer all 12 questions (what_happened, objective_accomplished bool, what_delayed_progress[], what_accelerated_progress[], what_should_improve[], should_automate[], should_become_training[], should_become_policy[], should_become_memory[], should_become_canon[], should_become_engineering_work[], founder_review_items[])
3. meeting_artifacts (if applicable): action_items[{text,owner,due_date,priority}], decisions_made[{decision,rationale}], open_questions[], risks[{risk,level}], follow_ups[{item,owner,due_date}], future_meeting_agenda[]
4. memory_updates[] (strings — what should be remembered)
5. conversation_topics[] (recurring themes / entities mentioned — each {label,type,description,recurring,unresolved,sentiment})
6. communication_evaluation: scores 0-100 for each of [clarity,professionalism,helpfulness,accuracy,empathy,compliance,trust_building,educational_value,relationship_building] plus overall_score, strengths[], weaknesses[], improvement_recommendations[]
7. confidence_score (0-100) and evidence[] (key facts supporting the analysis)
8. requires_founder_approval (bool) and approval_category — founder approval needed for: ${NCICE_CONFIG.founder_approval_categories.join(', ')}

Be precise. Only set requires_founder_approval true if the event touches governance, legal, pricing, compensation, structural, IP, or external communications.

Respond with ONLY a valid JSON object (no markdown, no explanation) with these exact top-level fields:
{
  "executive_summary": "string",
  "what_happened": "string",
  "objective_accomplished": true,
  "what_delayed_progress": ["string"],
  "what_accelerated_progress": ["string"],
  "what_should_improve": ["string"],
  "should_automate": [{"suggestion":"string","priority":"low|medium|high"}],
  "should_become_training": [{"suggestion":"string"}],
  "should_become_policy": [{"suggestion":"string"}],
  "should_become_memory": ["string"],
  "should_become_canon": [{"suggestion":"string","priority":"low|medium|high"}],
  "should_become_engineering_work": [{"suggestion":"string"}],
  "founder_review_items": ["string"],
  "action_items": [{"text":"string","owner":"string","due_date":"YYYY-MM-DD","priority":"low|medium|high|critical"}],
  "decisions_made": [{"decision":"string","rationale":"string"}],
  "open_questions": ["string"],
  "risks": [{"risk":"string","level":"low|medium|high|critical"}],
  "follow_ups": [{"item":"string","owner":"string","due_date":"YYYY-MM-DD"}],
  "future_meeting_agenda": ["string"],
  "memory_updates": ["string"],
  "conversation_topics": [{"label":"string","type":"person|department|project|idea|problem|solution|lesson|topic","description":"string","recurring":false,"unresolved":false,"sentiment":"positive|neutral|negative|mixed"}],
  "comms_clarity": 0,
  "comms_professionalism": 0,
  "comms_helpfulness": 0,
  "comms_accuracy": 0,
  "comms_empathy": 0,
  "comms_compliance": 0,
  "comms_trust_building": 0,
  "comms_educational_value": 0,
  "comms_relationship_building": 0,
  "comms_overall_score": 0,
  "comms_strengths": ["string"],
  "comms_weaknesses": ["string"],
  "comms_improvements": ["string"],
  "confidence_score": 0,
  "evidence": [{"fact":"string"}],
  "requires_founder_approval": false,
  "approval_category": "string",
  "sentiment": "positive|neutral|negative|mixed"
}`
  });

  const rawText = llm || '';
  let intel = {};
  try { intel = typeof rawText === 'string' ? JSON.parse(rawText) : rawText; } catch { intel = {}; }
  const fl = { what_happened: intel.what_happened, objective_accomplished: intel.objective_accomplished, what_delayed_progress: intel.what_delayed_progress, what_accelerated_progress: intel.what_accelerated_progress, what_should_improve: intel.what_should_improve, should_automate: intel.should_automate, should_become_training: intel.should_become_training, should_become_policy: intel.should_become_policy, should_become_memory: intel.should_become_memory, should_become_canon: intel.should_become_canon, should_become_engineering_work: intel.should_become_engineering_work, founder_review_items: intel.founder_review_items };
  const ma = { action_items: intel.action_items, decisions_made: intel.decisions_made, open_questions: intel.open_questions, risks: intel.risks, follow_ups: intel.follow_ups, future_meeting_agenda: intel.future_meeting_agenda };
  const ce = { clarity: intel.comms_clarity, professionalism: intel.comms_professionalism, helpfulness: intel.comms_helpfulness, accuracy: intel.comms_accuracy, empathy: intel.comms_empathy, compliance: intel.comms_compliance, trust_building: intel.comms_trust_building, educational_value: intel.comms_educational_value, relationship_building: intel.comms_relationship_building, overall_score: intel.comms_overall_score, strengths: intel.comms_strengths, weaknesses: intel.comms_weaknesses, improvement_recommendations: intel.comms_improvements };
  const dateStr = today();

  // 1. FeedbackLoopEntry
  const feedbackRec = {
    source_type, source_id: source_id || '', source_title: source_title || '',
    loop_date: dateStr,
    what_happened: fl.what_happened || intel.executive_summary || '',
    objective_accomplished: !!fl.objective_accomplished,
    what_delayed_progress: fl.what_delayed_progress || [],
    what_accelerated_progress: fl.what_accelerated_progress || [],
    what_should_improve: fl.what_should_improve || [],
    should_automate: fl.should_automate || [],
    should_become_training: fl.should_become_training || [],
    should_become_policy: fl.should_become_policy || [],
    should_become_memory: fl.should_become_memory || [],
    should_become_canon: fl.should_become_canon || [],
    should_become_engineering_work: fl.should_become_engineering_work || [],
    founder_review_items: fl.founder_review_items || [],
    confidence_score: clamp(intel.confidence_score || 60),
    evidence: intel.evidence || [],
    department: department || '',
    ai_generated: true,
    tags: [source_type, department || 'general'].filter(Boolean)
  };
  let feedbackSaved = null;
  try { feedbackSaved = await withRetry(() => svc.entities.FeedbackLoopEntry.create(feedbackRec)); } catch {}

  // 2. MeetingIntelligence (if meeting)
  let meetingSaved = null;
  if (source_type === 'meeting') {
    const meetingRec = {
      meeting_title: source_title || 'Untitled Meeting',
      meeting_type: meeting_type || 'other',
      meeting_date: dateStr,
      organizer: organizer || '',
      department: department || '',
      participants: participants || [],
      raw_notes: raw_content,
      executive_summary: intel.executive_summary || '',
      action_items: ma.action_items || [],
      decisions_made: ma.decisions_made || [],
      open_questions: ma.open_questions || [],
      risks: ma.risks || [],
      follow_ups: ma.follow_ups || [],
      assigned_owners: (ma.action_items || []).map(a => a.owner).filter(Boolean),
      deadlines: (ma.action_items || []).filter(a => a.due_date).map(a => ({ owner: a.owner, due_date: a.due_date, item: a.text })),
      memory_updates: intel.memory_updates || [],
      knowledge_graph_updates: (intel.conversation_topics || []).map(t => ({ node: t.label || t.topic || t, type: t.type || 'topic' })),
      training_candidates: fl.should_become_training || [],
      policy_recommendations: fl.should_become_policy || [],
      workflow_recommendations: fl.should_automate || [],
      future_meeting_agenda: ma.future_meeting_agenda || [],
      requires_founder_approval: !!intel.requires_founder_approval,
      approval_category: intel.approval_category || 'general',
      sentiment: intel.sentiment || 'neutral',
      outcomes_achieved: !!fl.objective_accomplished,
      linked_customers: linked_customers || [],
      linked_projects: linked_projects || [],
      status: 'completed',
      tags: [meeting_type, department || 'general'].filter(Boolean)
    };
    try { meetingSaved = await withRetry(() => svc.entities.MeetingIntelligence.create(meetingRec)); } catch {}
  }

  // 3. CommitmentTrackers
  const commitments = [];
  const allActions = [...(ma.action_items || []), ...(ma.follow_ups || [])];
  for (const a of allActions) {
    const text = a.text || a.item || '';
    if (!text) continue;
    commitments.push({
      commitment_text: text,
      source_type: source_type === 'meeting' ? 'meeting' : source_type,
      source_id: meetingSaved?.id || source_id || '',
      source_title: source_title || '',
      owner: a.owner || owner || '',
      assigned_by: organizer || user?.full_name || 'system',
      department: department || '',
      due_date: a.due_date || due_date || '',
      priority: a.priority || 'medium',
      status: 'open',
      notify_users: a.owner ? [a.owner] : [],
      linked_meeting_id: meetingSaved?.id || '',
      linked_customer_id: (linked_customers || [])[0] || '',
      linked_project_id: (linked_projects || [])[0] || '',
      requires_founder_approval: !!intel.requires_founder_approval,
      tags: [source_type].filter(Boolean)
    });
  }
  let commitmentsSaved = 0;
  if (commitments.length > 0) {
    const res = await persistBatched(svc, 'CommitmentTracker', commitments, 5);
    commitmentsSaved = res.saved;
  }

  // 4. ConversationNodes (upsert to avoid duplication)
  let nodesSaved = 0;
  for (const t of (intel.conversation_topics || [])) {
    const label = t.label || t.topic || t.name || String(t);
    const type = t.type || 'topic';
    const nodeKey = `${type}_${slug(label)}`;
    try {
      const existing = await safeFilter(svc, 'ConversationNode', { node_key: nodeKey }, '-created_date', 1);
      if (existing.length > 0) {
        await withRetry(() => svc.entities.ConversationNode.update(existing[0].id, {
          discussion_count: (existing[0].discussion_count || 0) + 1,
          last_discussed: now(),
          is_recurring_topic: true,
          recurrence_count: (existing[0].recurrence_count || 0) + 1
        }));
      } else {
        await withRetry(() => svc.entities.ConversationNode.create({
          node_key: nodeKey, node_type: type, node_label: label,
          node_description: t.description || t.context || '',
          discussion_count: 1, last_discussed: now(),
          is_recurring_topic: !!t.recurring, is_unresolved: !!t.unresolved,
          sentiment_trend: t.sentiment || 'neutral', tags: [source_type]
        }));
      }
      nodesSaved++;
    } catch {}
  }

  // 5. MemoryTimelineEntry
  let timelineSaved = null;
  try {
    timelineSaved = await withRetry(() => svc.entities.MemoryTimelineEntry.create({
      entry_date: dateStr,
      entry_type: source_type === 'meeting' ? 'meeting' : source_type === 'customer_interaction' ? 'interaction' : source_type === 'executive_review' ? 'decision' : 'event',
      title: source_title || `${source_type} capture`,
      description: intel.executive_summary || fl.what_happened || '',
      linked_department: department || '',
      linked_customer: (linked_customers || [])[0] || '',
      linked_project: (linked_projects || [])[0] || '',
      linked_meeting_id: meetingSaved?.id || '',
      memory_target: 'organizational_intelligence',
      memory_record_id: feedbackSaved?.id || '',
      is_traceable: true,
      confidence_score: clamp(intel.confidence_score || 60),
      evidence: intel.evidence || [],
      ai_generated: true,
      searchable_text: `${source_title || ''} ${intel.executive_summary || ''} ${fl.what_happened || ''} ${(intel.memory_updates || []).join(' ')} ${(intel.conversation_topics || []).map(t => t.label || t.topic || '').join(' ')}`.slice(0, 2000),
      tags: [source_type, department || 'general'].filter(Boolean)
    }));
  } catch {}

  // 6. CommunicationEvaluation
  let commsSaved = null;
  if (ce.overall_score || ce.clarity) {
    try {
      commsSaved = await withRetry(() => svc.entities.CommunicationEvaluation.create({
        communication_type: source_type === 'meeting' ? 'meeting' : 'email',
        source_id: meetingSaved?.id || feedbackSaved?.id || '',
        source_title: source_title || '',
        author: organizer || user?.full_name || '',
        audience: (participants || []).map(p => p.name || p).filter(Boolean),
        evaluation_date: dateStr,
        clarity_score: clamp(ce.clarity || 0), professionalism_score: clamp(ce.professionalism || 0),
        helpfulness_score: clamp(ce.helpfulness || 0), accuracy_score: clamp(ce.accuracy || 0),
        empathy_score: clamp(ce.empathy || 0), compliance_score: clamp(ce.compliance || 0),
        trust_building_score: clamp(ce.trust_building || 0), educational_value_score: clamp(ce.educational_value || 0),
        relationship_building_score: clamp(ce.relationship_building || 0),
        overall_score: clamp(ce.overall_score || avg([ce.clarity, ce.professionalism, ce.helpfulness, ce.accuracy, ce.empathy, ce.compliance, ce.trust_building, ce.educational_value, ce.relationship_building].filter(v => v !== undefined))),
        improvement_recommendations: ce.improvement_recommendations || [],
        strengths: ce.strengths || [], weaknesses: ce.weaknesses || [],
        trend: 'stable', tags: [source_type]
      }));
    } catch {}
  }

  // 7. OrganizationalIntelligence — link, don't duplicate
  try {
    await withRetry(() => svc.entities.OrganizationalIntelligence.create({
      insight_type: source_type === 'meeting' ? 'meeting_intelligence' : 'process_improvement',
      title: source_title || `${source_type} intelligence`,
      description: intel.executive_summary || fl.what_happened || '',
      frequency: 1,
      affected_modules: department ? [department] : [],
      recommended_action: (fl.what_should_improve || [])[0] || '',
      source: 'ncice_capture',
      status: 'active',
      priority: intel.requires_founder_approval ? 'critical' : 'high',
      tags: ['ncice', source_type]
    }));
  } catch {}

  return {
    source_type, source_title,
    feedback_loop_id: feedbackSaved?.id || null,
    meeting_id: meetingSaved?.id || null,
    commitments_created: commitmentsSaved,
    conversation_nodes: nodesSaved,
    timeline_id: timelineSaved?.id || null,
    comms_evaluation_id: commsSaved?.id || null,
    requires_founder_approval: !!intel.requires_founder_approval,
    approval_category: intel.approval_category || 'general',
    confidence_score: clamp(intel.confidence_score || 60),
    captured_at: now()
  };
}

// ─── GENERATE BRIEFING INTERNAL ───
async function generateBriefingInternal(svc, user, params) {
  const { target_role = 'founder', target_user_id, target_name, department } = params;
  const role = NCICE_CONFIG.roles.find(r => r.key === target_role) || NCICE_CONFIG.roles[0];
  const dateStr = today();

  const [tasks, commitments, approvals, customers, agents, reflections, feedbackLoops] = await Promise.all([
    safeList(svc, 'Task', '-created_date', 30),
    safeFilter(svc, 'CommitmentTracker', { status: { $ne: 'completed' } }, '-due_date', 30),
    safeFilter(svc, 'ApprovalGate', { status: 'pending' }, '-created_date', 20),
    safeFilter(svc, 'CustomerSuccessProfile', { churn_risk_level: { $in: ['high', 'critical'] } }, '-updated_date', 10),
    safeFilter(svc, 'AgentProfile', { status: { $in: ['idle', 'paused'] } }, '-created_date', 10),
    safeList(svc, 'OrgReflection', '-created_date', 3),
    safeList(svc, 'FeedbackLoopEntry', '-created_date', 10)
  ]);

  let scopedTasks = tasks, scopedCommitments = commitments;
  if (role.scope === 'team' || role.scope === 'department') scopedCommitments = commitments.filter(c => !department || c.department === department);
  if (role.scope === 'assignments') {
    scopedTasks = tasks.filter(t => !t.assignee_id || t.assignee_id === target_user_id);
    scopedCommitments = commitments.filter(c => !c.owner_id || c.owner_id === target_user_id);
  }

  const llm = await svc.integrations.Core.InvokeLLM({
    prompt: `Generate a personalized daily briefing for the ${role.label} role${target_name ? ` (${target_name})` : ''}${department ? ` in ${department}` : ''} at ${NCICE_CONFIG.org_name}, dated ${dateStr}.

ROLE SCOPE: ${role.scope} — sees: ${role.sees.join(', ')}.
Founder is final approval authority for: ${NCICE_CONFIG.founder_approval_categories.join(', ')}.

AVAILABLE DATA:
- Open tasks: ${JSON.stringify(scopedTasks.slice(0, 12).map(t => ({ title: t.title, status: t.status, priority: t.priority, due_date: t.due_date })))}
- Open commitments: ${JSON.stringify(scopedCommitments.slice(0, 12).map(c => ({ text: c.commitment_text, owner: c.owner, due_date: c.due_date, priority: c.priority, status: c.status })))}
- Pending approvals: ${JSON.stringify(approvals.slice(0, 8).map(a => ({ name: a.gate_name || a.name, category: a.approval_category })))}
- At-risk customers: ${JSON.stringify(customers.slice(0, 6).map(c => ({ name: c.customer_name, level: c.churn_risk_level, mrr: c.mrr })))}
- Dormant agents: ${agents.length}
- Recent lessons (feedback loops): ${JSON.stringify(feedbackLoops.slice(0, 5).map(f => ({ what_happened: f.what_happened, improve: f.what_should_improve?.slice(0, 2) })))}
- Recent reflections: ${JSON.stringify(reflections.slice(0, 2).map(r => ({ what_improved: r.what_improved?.slice(0, 2), what_failed: r.what_failed?.slice(0, 2) })))}

Produce a briefing with: executive_summary (1-3 sentences), todays_priorities[{title,reason,link}], upcoming_deadlines[], pending_approvals[], new_opportunities[], risks[], assigned_work[], knowledge_learned_overnight[], predictions[], recommended_conversations[], suggested_automations[], training_reminders[], compliance_reminders[]. Only include sections relevant to this role's scope. Never overload with irrelevant info.`,
    response_json_schema: {
      type: 'object',
      properties: {
        executive_summary: { type: 'string' },
        todays_priorities: { type: 'array', items: { type: 'object' } },
        upcoming_deadlines: { type: 'array', items: { type: 'object' } },
        pending_approvals: { type: 'array', items: { type: 'object' } },
        new_opportunities: { type: 'array', items: { type: 'object' } },
        risks: { type: 'array', items: { type: 'object' } },
        assigned_work: { type: 'array', items: { type: 'object' } },
        knowledge_learned_overnight: { type: 'array', items: { type: 'string' } },
        predictions: { type: 'array', items: { type: 'object' } },
        recommended_conversations: { type: 'array', items: { type: 'object' } },
        suggested_automations: { type: 'array', items: { type: 'object' } },
        training_reminders: { type: 'array', items: { type: 'object' } },
        compliance_reminders: { type: 'array', items: { type: 'object' } }
      }
    }
  });

  const b = llm || {};
  const rec = {
    briefing_date: dateStr, target_role, target_user_id: target_user_id || '', target_name: target_name || role.label, department: department || '',
    todays_priorities: b.todays_priorities || [],
    upcoming_deadlines: b.upcoming_deadlines || scopedCommitments.filter(c => c.due_date).slice(0, 8).map(c => ({ item: c.commitment_text, due: c.due_date, owner: c.owner })),
    pending_approvals: b.pending_approvals || approvals.slice(0, 5).map(a => ({ name: a.gate_name || a.name, category: a.approval_category })),
    new_opportunities: b.new_opportunities || [],
    risks: b.risks || customers.slice(0, 4).map(c => ({ customer: c.customer_name, level: c.churn_risk_level })),
    assigned_work: b.assigned_work || scopedTasks.slice(0, 8).map(t => ({ title: t.title, status: t.status, priority: t.priority })),
    knowledge_learned_overnight: b.knowledge_learned_overnight || feedbackLoops.slice(0, 5).map(f => f.what_happened).filter(Boolean),
    predictions: b.predictions || [], recommended_conversations: b.recommended_conversations || [],
    suggested_automations: b.suggested_automations || [], training_reminders: b.training_reminders || [],
    compliance_reminders: b.compliance_reminders || [],
    executive_summary: b.executive_summary || `Daily briefing for ${role.label}.`,
    read_time_minutes: 5,
    tags: [target_role, department || 'general'].filter(Boolean)
  };
  let saved = null;
  try { saved = await withRetry(() => svc.entities.RoleBriefing.create(rec)); } catch {}
  return { briefing: rec, id: saved?.id || null };
}

// ─── GENERATE DIGEST INTERNAL ───
async function generateDigestInternal(svc, params) {
  const { digest_type = 'morning' } = params;
  const dateStr = today();

  const [tasks, commitments, customers, agents, canonEntries, kgNodes, automations, feedbackLoops, comms, reflections] = await Promise.all([
    safeList(svc, 'Task', '-created_date', 50),
    safeFilter(svc, 'CommitmentTracker', { status: { $ne: 'completed' } }, '-due_date', 50),
    safeList(svc, 'CustomerSuccessProfile', '-updated_date', 50),
    safeList(svc, 'AgentProfile', '-created_date', 50),
    safeList(svc, 'CanonEntry', '-created_date', 50),
    safeList(svc, 'KnowledgeNode', '-created_date', 50),
    safeList(svc, 'Automation', '-created_date', 50),
    safeList(svc, 'FeedbackLoopEntry', '-created_date', 30),
    safeList(svc, 'CommunicationEvaluation', '-created_date', 30),
    safeList(svc, 'OrgReflection', '-created_date', 5)
  ]);

  const atRiskCustomers = customers.filter(c => c.churn_risk_level === 'high' || c.churn_risk_level === 'critical');
  const overdueCommitments = commitments.filter(c => c.due_date && c.due_date < dateStr && c.status !== 'completed');
  const commsScores = comms.map(c => c.overall_score || 0);
  const memoryGrowth = feedbackLoops.length + reflections.length + kgNodes.length;
  const orgIQ = clamp(avg([kgNodes.length * 1.5, automations.length * 5, feedbackLoops.length * 3, commsScores.length ? avg(commsScores) : 50, 30]));
  const selfImprovementIdx = clamp(feedbackLoops.length * 4 + automations.length * 3 + 20);
  const commsIntelScore = commsScores.length ? clamp(avg(commsScores)) : 50;
  const memoryCoverage = clamp(Math.min(100, memoryGrowth * 2));
  const founderTimeSaved = Math.round((automations.length * 0.5) + (feedbackLoops.length * 0.3) + (commsIntelScore / 100) * 5);

  const llm = await svc.integrations.Core.InvokeLLM({
    prompt: `Produce the ${digest_type} organizational digest for ${NCICE_CONFIG.org_name} on ${dateStr}.

DATA:
- Open tasks: ${tasks.length}, Overdue commitments: ${overdueCommitments.length}
- Customers at risk: ${atRiskCustomers.length} of ${customers.length}
- Dormant AI agents: ${agents.filter(a => a.status === 'idle' || a.status === 'paused').length}
- Canon entries: ${canonEntries.length}, Knowledge nodes: ${kgNodes.length}, Automations: ${automations.length}
- Feedback loops captured (30d): ${feedbackLoops.length}
- Avg communication score: ${commsIntelScore}/100
- Memory growth: ${memoryGrowth}, Org IQ: ${orgIQ}, Self-Improvement Index: ${selfImprovementIdx}
- Founder time saved est: ${founderTimeSaved}h
- Recent reflections: ${JSON.stringify(reflections.slice(0, 2).map(r => ({ improved: r.what_improved?.slice(0, 2), failed: r.what_failed?.slice(0, 2) })))}

Generate: organization_summary (3-5 sentences covering whole org), department_summaries[{dept,summary,health,risk}], revenue_summary{}, customer_summary{}, workforce_summary{}, legal_summary{}, engineering_summary{}, research_summary{}, event_summary{}, risk_summary{}, knowledge_summary{}, automation_summary{}, and top_recommended_decision{decision,rationale,expected_impact,requires_founder_approval}. Be concise but substantive.`,
    response_json_schema: {
      type: 'object',
      properties: {
        organization_summary: { type: 'string' },
        department_summaries: { type: 'array', items: { type: 'object' } },
        revenue_summary: { type: 'object' }, customer_summary: { type: 'object' },
        workforce_summary: { type: 'object' }, legal_summary: { type: 'object' },
        engineering_summary: { type: 'object' }, research_summary: { type: 'object' },
        event_summary: { type: 'object' }, risk_summary: { type: 'object' },
        knowledge_summary: { type: 'object' }, automation_summary: { type: 'object' },
        top_recommended_decision: { type: 'object' }
      }
    }
  });

  const d = llm || {};
  const rec = {
    digest_date: dateStr, digest_type,
    organization_summary: d.organization_summary || `Organizational digest for ${dateStr}.`,
    department_summaries: d.department_summaries || [],
    revenue_summary: d.revenue_summary || { open_commitments: commitments.length },
    customer_summary: d.customer_summary || { at_risk: atRiskCustomers.length, total: customers.length },
    workforce_summary: d.workforce_summary || { dormant_agents: agents.filter(a => a.status === 'idle').length },
    legal_summary: d.legal_summary || { canon_entries: canonEntries.length },
    engineering_summary: d.engineering_summary || { open_tasks: tasks.length },
    research_summary: d.research_summary || {}, event_summary: d.event_summary || {},
    risk_summary: d.risk_summary || { overdue_commitments: overdueCommitments.length, at_risk_customers: atRiskCustomers.length },
    knowledge_summary: d.knowledge_summary || { knowledge_nodes: kgNodes.length, feedback_loops: feedbackLoops.length },
    automation_summary: d.automation_summary || { automations: automations.length },
    memory_growth: memoryGrowth, organizational_iq: orgIQ, self_improvement_index: selfImprovementIdx,
    founder_time_saved_hours: founderTimeSaved,
    top_recommended_decision: d.top_recommended_decision || { decision: 'Review at-risk customers', requires_founder_approval: false },
    communication_intelligence_score: commsIntelScore, memory_coverage_score: memoryCoverage,
    tags: [digest_type]
  };
  let saved = null;
  try { saved = await withRetry(() => svc.entities.OrgDigest.create(rec)); } catch {}
  return { digest: rec, id: saved?.id || null };
}

// ─── PROCESS FOLLOW-UPS INTERNAL ───
async function processFollowupsInternal(svc) {
  const dateStr = today();
  const open = await safeFilter(svc, 'CommitmentTracker', { status: { $in: ['open', 'in_progress', 'blocked'] } }, '-due_date', 200);
  let overdueCount = 0, escalatedCount = 0;
  for (const c of open) {
    if (c.due_date && c.due_date < dateStr && c.status !== 'completed') {
      try {
        const updates = { missed_deadline: true, status: 'overdue', reminder_count: (c.reminder_count || 0) + 1, last_reminder_sent: now() };
        if (c.priority === 'critical' || (c.reminder_count || 0) >= 3) { updates.founder_escalation = true; escalatedCount++; }
        await withRetry(() => svc.entities.CommitmentTracker.update(c.id, updates));
        overdueCount++;
      } catch {}
    }
  }
  return { open_commitments: open.length, overdue_flagged: overdueCount, founder_escalations: escalatedCount, processed_at: now() };
}

// ─── METRICS computation ───
async function computeMetrics(svc) {
  const [comms, feedback, timeline, commitments, nodes, automations] = await Promise.all([
    safeList(svc, 'CommunicationEvaluation', '-created_date', 50),
    safeList(svc, 'FeedbackLoopEntry', '-created_date', 50),
    safeList(svc, 'MemoryTimelineEntry', '-created_date', 100),
    safeFilter(svc, 'CommitmentTracker', { status: { $ne: 'completed' } }, '-due_date', 100),
    safeList(svc, 'ConversationNode', '-discussion_count', 50),
    safeList(svc, 'Automation', '-created_date', 50)
  ]);
  const commsIntelScore = comms.length ? clamp(avg(comms.map(c => c.overall_score || 0))) : 50;
  return {
    communication_intelligence_score: commsIntelScore,
    memory_coverage_score: clamp(Math.min(100, timeline.length * 2)),
    self_improvement_index: clamp(feedback.length * 4 + automations.length * 3 + 20),
    organizational_iq: clamp(avg([nodes.length * 1.5, automations.length * 5, feedback.length * 3, commsIntelScore, 30])),
    founder_hours_saved: Math.round((automations.length * 0.5) + (feedback.length * 0.3) + (commsIntelScore / 100) * 5),
    feedback_loops_captured: feedback.length,
    memory_timeline_entries: timeline.length,
    conversation_nodes: nodes.length,
    open_commitments: commitments.length,
    overdue_commitments: commitments.filter(c => c.due_date && c.due_date < today() && c.status !== 'completed').length,
    founder_escalations: commitments.filter(c => c.founder_escalation).length,
    remaining_opportunities: [
      'Capture every workflow completion into the feedback loop automatically',
      'Connect meeting intelligence to calendar for auto-scheduling follow-ups',
      'Expand conversation graph expert detection across more node types',
      'Route founder-review items into a single approval queue',
      'Train communication evaluation on historical best-practice templates'
    ]
  };
}