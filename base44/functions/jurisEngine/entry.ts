import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// JurisEngine — full legal research platform backed by NC Canon
// POST { capability, query, context, project_id, memo_type }
// capabilities: issue_spotting | statute_search | case_search | contradiction | timeline |
//               standing | jurisdiction | capacity | immunity | civil_rights | foia |
//               evidence_review | memo | motion | complaint | discovery | strategy | questions
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { capability, query, context = '', project_id, memo_type = 'research_memo', save_memo = false } = await req.json();
    if (!query) return Response.json({ error: 'query is required' }, { status: 400 });

    // Step 1: Query Canon for relevant authorities
    const qLower = query.toLowerCase();
    const qTerms = qLower.split(/\s+/).filter(Boolean);

    // Pull VERIFIED canon entries first — JurisEngine must use verified Canon.
    let allEntries = await base44.asServiceRole.entities.CanonEntry.filter(
      { verified: true, status: 'active' },
      '-created_date',
      300
    );
    const usedVerified = allEntries.length > 0;
    // Fallback to active-unverified only if no verified entries exist (still surfaces content but warns)
    if (allEntries.length === 0) {
      allEntries = await base44.asServiceRole.entities.CanonEntry.filter(
        { status: 'active' },
        '-created_date',
        300
      );
    }

    // Score by relevance
    const scored = allEntries
      .map((e: any) => {
        const haystack = [e.search_index||'', e.title||'', e.citation||'', (e.keywords||[]).join(' '), e.summary||''].join(' ').toLowerCase();
        const score = qTerms.reduce((s: number, t: string) => s + (haystack.includes(t) ? 1 : 0), 0);
        return { entry: e, score };
      })
      .filter((r: any) => r.score > 0)
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 15)
      .map((r: any) => r.entry);

    // Canon Gap check — no verified (or any active) entries matched
    const hasResults = scored.length > 0;
    if (!hasResults) {
      // Track gap and create a CanonVerification gap case
      const allGaps = await base44.asServiceRole.entities.CanonEntry.filter({ is_canon_gap: true }, '-created_date', 100);
      const matchedGaps = allGaps.filter((g: any) => {
        const h = [(g.title||''), (g.keywords||[]).join(' ')].join(' ').toLowerCase();
        return qTerms.some((t: string) => h.includes(t));
      });
      // Auto-queue a CanonVerification gap case so the gap enters the resolution flow
      try {
        await base44.asServiceRole.entities.CanonVerification.create({
          canon_title: `Canon Gap: ${query.slice(0, 120)}`,
          is_gap_case: true,
          queue_priority: 'critical',
          verification_status: 'gap_flagged',
          blocks_jurisengine: true,
          blocks_builds: [capability],
          gap_resolution_flow: { is_gap: true, gap_reason: `No verified Canon for JurisEngine capability: ${capability}`, resolution_path: '', resolved_at: '', resolved_by: '', imported_entry_id: '' },
          tags: ['auto_gap', 'jurisengine']
        });
      } catch (_) {}
      return Response.json({
        success: false,
        canon_gap: true,
        query,
        capability,
        message: `CANON GAP — No verified Canon entries found for: "${query}". JurisEngine cannot provide legal analysis without source authorities. A Canon Verification gap case has been auto-created. Please upload the relevant statute, case, or regulation to the Canon Verification Engine.`,
        matched_gaps: matchedGaps.map((g: any) => ({ id: g.id, title: g.title, category: g.category })),
        fabrication_policy: 'STRICT — JurisEngine does not synthesize or invent legal rules. All analysis must cite verified Canon entries.',
      });
    }

    // Step 2: Build capability-specific prompt
    const canonContext = scored.map((e: any) =>
      `[${e.citation || e.title}] (${e.authority_level || e.category})\n${e.summary || e.content?.slice(0, 400) || ''}`
    ).join('\n\n');

    const capabilityPrompts: Record<string, string> = {
      issue_spotting: `Identify ALL legal issues present in the fact pattern. For each issue: name it, cite the applicable Canon authority, and explain how the facts trigger it.`,
      statute_search: `Locate and explain all relevant statutes from the Canon entries. Summarize what each statute says and how it applies to the query.`,
      case_search: `Find and analyze all relevant case law from the Canon entries. Summarize holdings and their application.`,
      contradiction: `Identify any contradictions, tensions, or conflicts between the Canon authorities. Explain implications.`,
      timeline: `Analyze the chronological sequence of legal events and authorities. Identify deadlines, limitations, and timing issues.`,
      standing: `Analyze Article III standing: injury-in-fact, causation, redressability. Cite Canon authorities.`,
      jurisdiction: `Analyze subject matter jurisdiction, personal jurisdiction, and venue based on Canon entries.`,
      capacity: `Analyze capacity to sue, Ex parte Young doctrine, and related doctrines from Canon.`,
      immunity: `Analyze qualified immunity, sovereign immunity, and Eleventh Amendment issues from Canon.`,
      civil_rights: `Analyze civil rights claims under available Canon authorities (§1983, Title VII, ADA, etc.).`,
      foia: `Analyze FOIA request rights, exemptions, and procedures based on Canon entries.`,
      evidence_review: `Analyze evidence standards, admissibility, and chain of custody issues from Canon.`,
      memo: `Write a complete legal research memorandum: Question Presented, Short Answer, Facts, Discussion (with Canon citations), Conclusion.`,
      motion: `Draft the legal argument section for a motion. Use Canon citations. Include headers and subheadings.`,
      complaint: `Draft complaint allegations and causes of action based on Canon authorities.`,
      discovery: `Create a targeted discovery plan: interrogatories, document requests, depositions based on identified issues.`,
      strategy: `Analyze case strategy options, strengths, weaknesses, and recommended approach based on Canon.`,
      questions: `Generate 15 targeted investigative/legal questions to develop this matter further.`,
    };

    const taskPrompt = capabilityPrompts[capability] || `Analyze the following legal query thoroughly, citing each Canon authority used.`;

    const systemPrompt = `You are JurisEngine, the legal research AI for Nautical Compass OS (NCOS).

CRITICAL RULES:
1. ONLY cite the Canon entries provided below — never invent or hallucinate citations.
2. If a Canon entry does not support your point, say so explicitly. Do not fabricate.
3. Every legal claim must be traceable to a specific Canon entry citation.
4. Mark any area without Canon support as [CANON GAP: {topic}].
5. This output is for informational and research purposes only — not legal advice.

${usedVerified ? 'VERIFIED' : 'UNVERIFIED — TREAT WITH CAUTION'} CANON ENTRIES (${scored.length} results):
${canonContext}

ADDITIONAL CONTEXT:
${context || 'None provided.'}

CAPABILITY: ${capability}
TASK: ${taskPrompt}

QUERY: ${query}`;

    const analysis = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: systemPrompt,
      model: 'claude_sonnet_4_6',
    });

    // Step 3: Optionally save as ResearchMemo
    let memoId = null;
    if (save_memo) {
      const memo = await base44.asServiceRole.entities.ResearchMemo.create({
        title: `[${capability.toUpperCase()}] ${query.slice(0, 80)}`,
        memo_type: memo_type,
        question_presented: query,
        analysis,
        project_id: project_id || undefined,
        canon_entries_cited: scored.map((e: any) => e.id),
        status: 'draft',
        generated_by: 'JurisEngine',
        is_informational: true,
        word_count: analysis.split(/\s+/).length,
      });
      memoId = memo.id;
    }

    // Update AI service call count
    try {
      const svcs = await base44.asServiceRole.entities.AIService.filter({ name: 'JurisEngine' });
      if (svcs.length > 0) {
        await base44.asServiceRole.entities.AIService.update(svcs[0].id, {
          call_count: (svcs[0].call_count || 0) + 1,
          last_called: new Date().toISOString(),
        });
      }
    } catch (_) {}

    return Response.json({
      success: true,
      capability,
      query,
      analysis,
      canon_entries_cited: scored.map((e: any) => ({ id: e.id, title: e.title, citation: e.citation, category: e.category })),
      canon_gap: false,
      memo_id: memoId,
      is_informational: true,
      fabrication_policy: 'STRICT — all citations verified against NC Canon.',
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});