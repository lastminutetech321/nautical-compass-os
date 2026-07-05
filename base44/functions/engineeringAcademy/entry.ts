import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { operation, params } = body;

    const fetchAll = async (entityName, limit = 100) => {
      try { return await base44.asServiceRole.entities[entityName].list('-created_date', limit); }
      catch { return []; }
    };

    const CATEGORIES = ["engineering", "architecture", "security", "ux", "database", "performance", "prompt", "testing", "documentation"];

    // ── GENERATE LESSONS FROM SPRINT ──
    if (operation === 'generate_lessons') {
      const { sprint_id } = params;

      const sprints = await fetchAll('Sprint', 50);
      let sprint = null;
      if (sprint_id) {
        try { sprint = await base44.asServiceRole.entities.Sprint.get(sprint_id); } catch {}
      }
      if (!sprint && sprints.length > 0) {
        sprint = sprints[0];
      }
      if (!sprint) {
        return Response.json({ error: 'No sprints found to generate lessons from' }, { status: 400 });
      }

      const tasks = await fetchAll('Task', 50);
      const bugs = await fetchAll('BugKnowledgeBase', 30);
      const improvements = await fetchAll('ImprovementItem', 20);

      const sprintTasks = tasks.filter(t => t.sprint_id === sprint.id || t.sprint === sprint.name);
      const taskData = sprintTasks.length > 0 ? sprintTasks : tasks.slice(0, 15);

      const prompt = `You are the NCOS Engineering Academy. Analyze a completed sprint and generate practical engineering lessons that AI employees can learn from.

SPRINT DATA:
${JSON.stringify(sprint, null, 2)}

RELATED TASKS:
${JSON.stringify(taskData.map(t => ({ title: t.title, status: t.status, description: t.description, priority: t.priority })), null, 2)}

RELATED BUGS/ISSUES:
${JSON.stringify(bugs.slice(0, 10).map(b => ({ title: b.title || b.bug_title, description: b.description, resolution: b.resolution || b.fix, severity: b.severity })), null, 2)}

RECENT IMPROVEMENTS:
${JSON.stringify(improvements.slice(0, 5).map(i => ({ title: i.title, recommended_fix: i.recommended_fix, dimension: i.improvement_dimension })), null, 2)}

Generate lessons across these 9 categories. Only generate a lesson where the data genuinely supports it:
1. engineering — software engineering practices, patterns, code quality, refactoring
2. architecture — system design, scalability, structural decisions, module boundaries
3. security — security vulnerabilities, hardening, access control, data protection
4. ux — user experience, interface design, user flows, accessibility
5. database — data modeling, query optimization, schema design, indexing
6. performance — speed, efficiency, resource usage, caching, optimization
7. prompt — AI prompt engineering, LLM usage patterns, context management
8. testing — test coverage, QA, validation strategies, edge cases
9. documentation — docs, comments, knowledge capture, API docs

For each lesson provide:
- title: concise, actionable lesson title
- category: one of the 9 categories above
- content: detailed lesson description (2-4 sentences explaining the lesson)
- key_takeaways: array of 2-4 key points
- mistakes_to_avoid: array of 1-3 specific mistakes this lesson helps avoid
- best_practices: array of 2-4 recommended practices
- difficulty: "beginner" | "intermediate" | "advanced" | "expert"
- applicable_roles: array of agent types this applies to (e.g. ["architecture", "security", "qa", "documentation"])

Generate between 3-9 lessons. Only include categories where there is genuine learning value from this sprint data.`;

      const llmRes = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            lessons: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  category: { type: "string" },
                  content: { type: "string" },
                  key_takeaways: { type: "array", items: { type: "string" } },
                  mistakes_to_avoid: { type: "array", items: { type: "string" } },
                  best_practices: { type: "array", items: { type: "string" } },
                  difficulty: { type: "string" },
                  applicable_roles: { type: "array", items: { type: "string" } },
                }
              }
            },
            summary: { type: "string" }
          }
        },
        model: "claude_sonnet_4_6",
      });

      const result = typeof llmRes === 'string' ? JSON.parse(llmRes) : llmRes;
      const lessons = result.lessons || [];

      const created = [];
      for (const lesson of lessons) {
        if (!lesson.title || !lesson.category || !lesson.content) continue;
        try {
          const rec = await base44.asServiceRole.entities.EngineeringLesson.create({
            title: lesson.title,
            category: lesson.category,
            content: lesson.content,
            key_takeaways: lesson.key_takeaways || [],
            mistakes_to_avoid: lesson.mistakes_to_avoid || [],
            best_practices: lesson.best_practices || [],
            difficulty: lesson.difficulty || 'intermediate',
            source_type: 'sprint',
            source_id: sprint.id,
            source_name: sprint.name || sprint.title || 'Sprint',
            source_sprint_id: sprint.id,
            applicable_roles: lesson.applicable_roles || [],
            status: 'active',
            created_by: user.full_name || user.email,
            auto_generated: true,
            tags: ['auto-generated', lesson.category],
          });
          created.push(rec);
        } catch (e) { /* skip on error */ }
      }

      return Response.json({ lessons: created, summary: result.summary || `Generated ${created.length} lessons from sprint`, sprint_name: sprint.name || sprint.title, operation: 'generate_lessons' });
    }

    // ── GET LESSONS ──
    if (operation === 'get_lessons') {
      const { category } = params || {};
      let lessons = await fetchAll('EngineeringLesson', 100);
      lessons = lessons.filter(l => l.status === 'active' || l.status === 'draft');
      if (category && category !== 'all') {
        lessons = lessons.filter(l => l.category === category);
      }
      return Response.json({ lessons: lessons.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)), operation: 'get_lessons' });
    }

    // ── GET SPRINTS ──
    if (operation === 'get_sprints') {
      const sprints = await fetchAll('Sprint', 50);
      return Response.json({ sprints, operation: 'get_sprints' });
    }

    // ── ASSIGN TO AGENT ──
    if (operation === 'assign_to_agent') {
      const { agent_id, agent_name, lesson_id, agent_type } = params;
      if (!agent_id || !lesson_id) return Response.json({ error: 'agent_id and lesson_id required' }, { status: 400 });

      const lesson = await base44.asServiceRole.entities.EngineeringLesson.get(lesson_id);
      const existing = await fetchAll('AgentLearning', 200);
      const already = existing.find(al => al.agent_id === agent_id && al.lesson_id === lesson_id);
      if (already) return Response.json({ learning: already, operation: 'assign_to_agent' });

      const learning = await base44.asServiceRole.entities.AgentLearning.create({
        agent_id,
        agent_name: agent_name || '',
        agent_type: agent_type || '',
        lesson_id,
        lesson_title: lesson.title,
        lesson_category: lesson.category,
        status: 'assigned',
        mastery_level: 0,
        assigned_by: user.full_name || user.email,
      });

      await base44.asServiceRole.entities.EngineeringLesson.update(lesson_id, {
        assigned_count: (lesson.assigned_count || 0) + 1,
      });

      return Response.json({ learning, operation: 'assign_to_agent' });
    }

    // ── MARK LEARNED ──
    if (operation === 'mark_learned') {
      const { learning_id, status, mastery_level, mistakes_avoided, applied } = params;
      if (!learning_id) return Response.json({ error: 'learning_id required' }, { status: 400 });

      const existing = await base44.asServiceRole.entities.AgentLearning.get(learning_id);
      const update = {
        status: status || existing.status,
        last_reviewed: new Date().toISOString(),
      };
      if (mastery_level != null) update.mastery_level = mastery_level;
      if (mistakes_avoided) update.mistakes_avoided_count = (existing.mistakes_avoided_count || 0) + mistakes_avoided;
      if (applied) update.applied_count = (existing.applied_count || 0) + applied;
      if (status === 'mastered') update.mastery_level = 100;

      const updated = await base44.asServiceRole.entities.AgentLearning.update(learning_id, update);

      if (status === 'mastered' && existing.status !== 'mastered') {
        const lesson = await base44.asServiceRole.entities.EngineeringLesson.get(existing.lesson_id);
        await base44.asServiceRole.entities.EngineeringLesson.update(lesson.id, {
          learned_count: (lesson.learned_count || 0) + 1,
        });
      }

      return Response.json({ learning: updated, operation: 'mark_learned' });
    }

    // ── GET AGENT PROGRESS ──
    if (operation === 'get_agent_progress') {
      const { agent_id } = params;
      if (!agent_id) return Response.json({ error: 'agent_id required' }, { status: 400 });
      const allLearning = await fetchAll('AgentLearning', 200);
      const agentLearning = allLearning.filter(al => al.agent_id === agent_id);
      return Response.json({ learning: agentLearning, operation: 'get_agent_progress' });
    }

    // ── REFERENCE FOR AGENT ──
    if (operation === 'reference_for_agent') {
      const { agent_type } = params;
      const lessons = await fetchAll('EngineeringLesson', 100);
      const active = lessons.filter(l => l.status === 'active');

      let relevant = active;
      if (agent_type) {
        const roleMatch = active.filter(l => (l.applicable_roles || []).includes(agent_type));
        if (roleMatch.length >= 3) relevant = roleMatch;
      }

      const byCategory = {};
      relevant.forEach(l => {
        if (!byCategory[l.category]) byCategory[l.category] = [];
        byCategory[l.category].push(l);
      });

      const condensed = Object.entries(byCategory).map(([cat, catLessons]) => {
        const top = catLessons[0];
        return `${cat.toUpperCase()}: ${top.title} — ${(top.mistakes_to_avoid || []).slice(0, 2).join("; ")}`;
      }).join("\n");

      const reference = `═══ ENGINEERING ACADEMY — RELEVANT LESSONS ═══
${condensed || "No lessons available yet."}

═══ DIRECTIVE ═══
Review these lessons before starting your task. Avoid the listed mistakes. Apply the best practices. When you encounter a situation covered by a lesson, reference it and increment your applied count.`;

      return Response.json({ reference, lesson_count: relevant.length, operation: 'reference_for_agent' });
    }

    // ── MATURITY REPORT ──
    if (operation === 'maturity_report') {
      const [lessons, allLearning, agents] = await Promise.all([
        fetchAll('EngineeringLesson', 100),
        fetchAll('AgentLearning', 200),
        fetchAll('AgentProfile', 100),
      ]);

      const activeLessons = lessons.filter(l => l.status === 'active');
      const byCategory = {};
      CATEGORIES.forEach(c => { byCategory[c] = 0; });
      activeLessons.forEach(l => { if (byCategory[l.category] != null) byCategory[l.category]++; });

      const totalAssignments = allLearning.length;
      const mastered = allLearning.filter(al => al.status === 'mastered').length;
      const applied = allLearning.filter(al => al.status === 'applied' || al.status === 'mastered').length;
      const avgMastery = totalAssignments > 0 ? allLearning.reduce((s, al) => s + (al.mastery_level || 0), 0) / totalAssignments : 0;
      const totalMistakesAvoided = allLearning.reduce((s, al) => s + (al.mistakes_avoided_count || 0), 0);
      const totalApplied = allLearning.reduce((s, al) => s + (al.applied_count || 0), 0);

      const activeAgents = agents.filter(a => a.status === 'active').length;
      const agentsWithLearning = new Set(allLearning.map(al => al.agent_id)).size;
      const coveragePct = activeAgents > 0 ? (agentsWithLearning / activeAgents) * 100 : 0;

      const categoryCoverage = Object.values(byCategory).filter(c => c > 0).length / CATEGORIES.length * 100;
      const maturityScore = Math.round((categoryCoverage * 0.3 + avgMastery * 0.4 + coveragePct * 0.3));

      const agentBreakdown = {};
      allLearning.forEach(al => {
        const key = al.agent_name || al.agent_id;
        if (!agentBreakdown[key]) {
          agentBreakdown[key] = { total: 0, mastered: 0, applied: 0, mistakes_avoided: 0, avg_mastery: 0, mastery_sum: 0 };
        }
        const ab = agentBreakdown[key];
        ab.total++;
        if (al.status === 'mastered') ab.mastered++;
        if (al.status === 'applied' || al.status === 'mastered') ab.applied++;
        ab.mistakes_avoided += al.mistakes_avoided_count || 0;
        ab.mastery_sum += al.mastery_level || 0;
      });
      Object.values(agentBreakdown).forEach(ab => { ab.avg_mastery = ab.total > 0 ? Math.round(ab.mastery_sum / ab.total) : 0; });

      return Response.json({
        report: {
          total_lessons: activeLessons.length,
          by_category: byCategory,
          category_coverage_pct: Math.round(categoryCoverage),
          total_agents: activeAgents,
          agents_learning: agentsWithLearning,
          coverage_pct: Math.round(coveragePct),
          total_assignments: totalAssignments,
          mastered_count: mastered,
          applied_count: applied,
          avg_mastery: Math.round(avgMastery),
          total_mistakes_avoided: totalMistakesAvoided,
          total_applied: totalApplied,
          maturity_score: maturityScore,
          agent_breakdown: agentBreakdown,
        },
        operation: 'maturity_report'
      });
    }

    // ── DELETE LESSON ──
    if (operation === 'delete_lesson') {
      const { lesson_id } = params;
      await base44.asServiceRole.entities.EngineeringLesson.delete(lesson_id);
      return Response.json({ success: true, operation: 'delete_lesson' });
    }

    return Response.json({ error: 'Unknown operation: ' + operation }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});