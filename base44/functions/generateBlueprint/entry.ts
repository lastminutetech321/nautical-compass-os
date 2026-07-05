import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { operation, params } = body;

    const fetchAll = async (entityName, limit = 200) => {
      try {
        return await base44.asServiceRole.entities[entityName].list('-created_date', limit);
      } catch { return []; }
    };

    // --- GENERATE PROJECT BLUEPRINT ---
    // Uses ALL development memory to generate a complete project blueprint
    if (operation === 'generate_blueprint') {
      const { project_name, project_type, description, reference_platform } = params;
      if (!project_name) return Response.json({ error: 'project_name required' }, { status: 400 });

      // Gather ALL development memory
      const [journals, adrs, prompts, bugs, lessons, canonEntries, agents, builds, entities, releases, milestones, roadmap] = await Promise.all([
        fetchAll('EngineeringJournal', 300),
        fetchAll('ADR', 100),
        fetchAll('PromptLibrary', 200),
        fetchAll('BugKnowledgeBase', 200),
        fetchAll('LessonLearned', 200),
        fetchAll('CanonEntry', 100),
        fetchAll('AgentProfile', 100),
        fetchAll('BuildRegistry', 100),
        fetchAll('BuildProject', 50),
        fetchAll('Release', 50),
        fetchAll('Milestone', 50),
        fetchAll('RoadmapItem', 100),
      ]);

      // Summarize development memory for the LLM
      const memorySummary = {
        total_journal_entries: journals.length,
        total_adrs: adrs.length,
        total_prompts: prompts.length,
        total_bugs: bugs.length,
        total_lessons: lessons.length,
        recent_journals: journals.slice(0, 20).map(j => ({ title: j.title, type: j.entry_type, files: j.files_modified?.length, outcome: j.actual_outcome?.slice(0, 100), readiness: j.readiness_increase, time: j.time_required_hours, value: j.business_value })),
        key_adrs: adrs.filter(a => a.status === 'accepted').slice(0, 15).map(a => ({ title: a.title, decision: a.decision?.slice(0, 150), tradeoffs: a.consequences?.slice(0, 100) })),
        top_prompts: prompts.filter(p => p.success_score >= 70).slice(0, 10).map(p => ({ title: p.prompt_title, purpose: p.purpose, score: p.success_score, category: p.category })),
        bug_patterns: bugs.slice(0, 15).map(b => ({ title: b.title, root_cause: b.root_cause?.slice(0, 100), fix: b.fix?.slice(0, 100), category: b.category, recurrence: b.can_happen_again })),
        lessons_learned: lessons.slice(0, 20).map(l => ({ type: l.lesson_type, title: l.title, description: l.description?.slice(0, 150), recommendations: l.recommendations_for_future })),
        architecture_entities: [...new Set(journals.flatMap(j => j.entities_created || []))].slice(0, 30),
        modules_built: [...new Set(journals.map(j => j.module).filter(Boolean))].slice(0, 20),
        total_time_invested: journals.reduce((s, j) => s + (j.time_required_hours || 0), 0),
        avg_readiness_per_entry: journals.length > 0 ? (journals.reduce((s, j) => s + (j.readiness_increase || 0), 0) / journals.length).toFixed(1) : 0,
      };

      const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `You are the NCOS Project Blueprint Generator. Using ALL accumulated development memory, generate a complete project blueprint for a new platform.

NEW PROJECT REQUEST:
- Name: ${project_name}
- Type: ${project_type || "enterprise platform"}
- Description: ${description || "Build another platform similar to NCOS"}
- Reference: ${reference_platform || "NCOS"}

DEVELOPMENT MEMORY (proven engineering knowledge):
${JSON.stringify(memorySummary).slice(0, 10000)}

Generate a COMPLETE project blueprint that leverages all lessons learned, proven patterns, successful prompts, resolved bugs, and architecture decisions. The blueprint must make the next project faster, better, and cheaper than starting from scratch.

Provide:
1. architecture - recommended architecture with reasoning from past ADRs
2. database - database design leveraging proven entity patterns
3. entities - list of recommended entities with fields
4. apis - recommended API/backend functions
5. ai_agents - recommended AI agents with roles
6. workflows - recommended workflows
7. roadmap - phased roadmap with milestones
8. milestones - key milestones with dates
9. dependencies - technical dependencies
10. estimated_timeline_weeks - estimated timeline
11. lessons_applied - which lessons from development memory are being applied
12. prompt_history - recommended prompts from the prompt library to reuse
13. architecture_decisions - recommended ADRs based on past decisions
14. engineering_journal_template - template for tracking engineering work
15. cost_savings - estimated cost savings from using development memory vs starting fresh
16. risk_mitigations - risks to avoid based on past bugs`,
        response_json_schema: {
          type: "object",
          properties: {
            architecture: { type: "string" },
            database: { type: "string" },
            entities: { type: "array", items: { type: "object", properties: { name: { type: "string" }, purpose: { type: "string" }, key_fields: { type: "array", items: { type: "string" } } } } },
            apis: { type: "array", items: { type: "object", properties: { name: { type: "string" }, purpose: { type: "string" } } } },
            ai_agents: { type: "array", items: { type: "object", properties: { name: { type: "string" }, role: { type: "string" }, responsibilities: { type: "array", items: { type: "string" } } } } },
            workflows: { type: "array", items: { type: "string" } },
            roadmap: { type: "array", items: { type: "object", properties: { phase: { type: "string" }, duration_weeks: { type: "number" }, deliverables: { type: "array", items: { type: "string" } } } } },
            milestones: { type: "array", items: { type: "object", properties: { name: { type: "string" }, target_week: { type: "number" } } } },
            dependencies: { type: "array", items: { type: "string" } },
            estimated_timeline_weeks: { type: "number" },
            lessons_applied: { type: "array", items: { type: "string" } },
            prompt_history: { type: "array", items: { type: "string" } },
            architecture_decisions: { type: "array", items: { type: "string" } },
            engineering_journal_template: { type: "array", items: { type: "string" } },
            cost_savings: { type: "string" },
            risk_mitigations: { type: "array", items: { type: "string" } },
            executive_summary: { type: "string" },
          }
        }
      });

      return Response.json({ blueprint: result, project_name, development_memory_used: memorySummary, operation: 'generate_blueprint' });
    }

    // --- AUTO-GENERATE SPRINT LESSONS ---
    if (operation === 'generate_sprint_lessons') {
      const { sprint } = params;
      if (!sprint) return Response.json({ error: 'sprint required' }, { status: 400 });

      const [journals, bugs, adrs] = await Promise.all([
        fetchAll('EngineeringJournal', 200),
        fetchAll('BugKnowledgeBase', 100),
        fetchAll('ADR', 50),
      ]);

      const sprintJournals = journals.filter(j => j.sprint === sprint);
      const sprintBugs = bugs.filter(b => b.first_seen?.includes(sprint) || b.resolved_at?.includes(sprint));

      const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `You are the NCOS Lesson Learned Generator. Analyze sprint data and generate lessons learned.

SPRINT: ${sprint}

SPRINT JOURNAL ENTRIES (${sprintJournals.length}):
${JSON.stringify(sprintJournals.map(j => ({ title: j.title, type: j.entry_type, outcome: j.actual_outcome?.slice(0, 100), time: j.time_required_hours, readiness: j.readiness_increase, value: j.business_value }))).slice(0, 4000)}

SPRINT BUGS (${sprintBugs.length}):
${JSON.stringify(sprintBugs.map(b => ({ title: b.title, root_cause: b.root_cause?.slice(0, 100), fix: b.fix?.slice(0, 100), time: b.time_to_resolve_hours }))).slice(0, 2000)}

Generate lessons in 5 categories: what_worked, what_failed, what_should_change, what_should_repeat, recommendations_for_future.`,
        response_json_schema: {
          type: "object",
          properties: {
            lessons: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  lesson_type: { type: "string" },
                  title: { type: "string" },
                  description: { type: "string" },
                  recommendations_for_future: { type: "array", items: { type: "string" } },
                  priority: { type: "string" },
                }
              }
            },
            sprint_summary: { type: "string" },
          }
        }
      });

      // Persist lessons
      const created = [];
      if (result.lessons) {
        for (const l of result.lessons) {
          try {
            const rec = await base44.asServiceRole.entities.LessonLearned.create({
              title: l.title,
              sprint,
              lesson_type: l.lesson_type,
              description: l.description,
              recommendations_for_future: l.recommendations_for_future || [],
              priority: l.priority || 'medium',
              applied_to_future: false,
            });
            created.push(rec);
          } catch (e) { /* skip */ }
        }
      }

      return Response.json({ result, created_lessons: created, operation: 'generate_sprint_lessons' });
    }

    // --- NCDM OVERVIEW ---
    if (operation === 'overview') {
      const [journals, adrs, prompts, bugs, lessons] = await Promise.all([
        fetchAll('EngineeringJournal', 500),
        fetchAll('ADR', 100),
        fetchAll('PromptLibrary', 200),
        fetchAll('BugKnowledgeBase', 200),
        fetchAll('LessonLearned', 200),
      ]);

      const totalTime = journals.reduce((s, j) => s + (j.time_required_hours || 0), 0);
      const totalReadiness = journals.reduce((s, j) => s + (j.readiness_increase || 0), 0);
      const avgPromptScore = prompts.length > 0 ? (prompts.reduce((s, p) => s + (p.success_score || 0), 0) / prompts.length).toFixed(1) : 0;
      const openBugs = bugs.filter(b => b.status === 'open' || b.status === 'investigating').length;
      const criticalBugs = bugs.filter(b => b.severity === 'critical').length;
      const reusablePrompts = prompts.filter(p => p.reusable).length;
      const appliedLessons = lessons.filter(l => l.applied_to_future).length;
      const sprints = [...new Set(journals.map(j => j.sprint).filter(Boolean))];

      return Response.json({
        overview: {
          total_journal_entries: journals.length,
          total_adrs: adrs.length,
          accepted_adrs: adrs.filter(a => a.status === 'accepted').length,
          total_prompts: prompts.length,
          reusable_prompts: reusablePrompts,
          avg_prompt_score: Number(avgPromptScore),
          total_bugs: bugs.length,
          open_bugs: openBugs,
          critical_bugs: criticalBugs,
          total_lessons: lessons.length,
          applied_lessons: appliedLessons,
          total_time_invested_hours: totalTime,
          total_readiness_increase: totalReadiness,
          sprints_tracked: sprints.length,
          sprint_list: sprints,
          entities_created: [...new Set(journals.flatMap(j => j.entities_created || []))].length,
          functions_added: [...new Set(journals.flatMap(j => j.functions_added || []))].length,
          pages_created: [...new Set(journals.flatMap(j => j.pages_created || []))].length,
        },
        operation: 'overview'
      });
    }

    return Response.json({ error: 'Unknown operation: ' + operation }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});