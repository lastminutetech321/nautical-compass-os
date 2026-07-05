import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Shared utility: AI Services query the NC Canon dynamically at runtime
// Usage: POST { service_name, query, categories, limit }
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { service_name, query, categories, limit = 10 } = await req.json();

    if (!query) return Response.json({ error: 'query is required' }, { status: 400 });

    // Fetch VERIFIED canon entries first — JurisEngine must use verified Canon.
    // If no verified entries exist, fall back to active (and flag canon gap).
    let entries = [];
    const verifiedQuery = { verified: true, status: 'active' };
    if (categories && categories.length > 0) {
      const perCat = await Promise.all(
        categories.map((cat) =>
          base44.asServiceRole.entities.CanonEntry.filter(
            { ...verifiedQuery, category: cat },
            '-created_date',
            50
          ).catch(() => [])
        )
      );
      entries = perCat.flat();
    } else {
      entries = await base44.asServiceRole.entities.CanonEntry.filter(
        verifiedQuery,
        '-created_date',
        200
      ).catch(() => []);
    }
    // Fallback to active-unverified only if no verified entries exist (still surfaces content but warns)
    const usedVerified = entries.length > 0;

    // Simple search: score each entry by keyword match in search_index / title / keywords
    const qLower = query.toLowerCase();
    const qTerms = qLower.split(/\s+/).filter(Boolean);

    const scored = entries
      .map((e) => {
        const haystack = [
          e.search_index || '',
          e.title || '',
          e.citation || '',
          (e.keywords || []).join(' '),
          e.summary || '',
        ].join(' ').toLowerCase();
        const score = qTerms.reduce((s, term) => s + (haystack.includes(term) ? 1 : 0), 0);
        return { entry: e, score };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((r) => r.entry);

    // Track call on AI service if service_name provided
    if (service_name) {
      try {
        const services = await base44.asServiceRole.entities.AIService.filter({ name: service_name });
        if (services.length > 0) {
          const svc = services[0];
          await base44.asServiceRole.entities.AIService.update(svc.id, {
            call_count: (svc.call_count || 0) + 1,
            last_called: new Date().toISOString(),
          });
        }
      } catch (_) { /* non-critical */ }
    }

    // Detect Canon Gaps — fetch gap placeholders for unmatched query terms
    const allGaps = await base44.asServiceRole.entities.CanonEntry.filter(
      { status: 'draft', verified: false },
      '-created_date',
      200
    ).catch(() => []);

    // A gap is a placeholder entry whose title/keywords overlap query terms but has no real content
    const gaps = allGaps
      .filter((e) => {
        if (!e.is_canon_gap) return false;
        const haystack = [(e.title || ''), (e.keywords || []).join(' ')].join(' ').toLowerCase();
        return qTerms.some((term) => haystack.includes(term));
      })
      .slice(0, 5);

    // If no verified results, try active-unverified as a last resort but flag heavily
    if (entries.length === 0) {
      const fallbackQuery = { status: 'active' };
      if (categories && categories.length > 0) {
        const perCat = await Promise.all(
          categories.map((cat) =>
            base44.asServiceRole.entities.CanonEntry.filter(
              { ...fallbackQuery, category: cat }, '-created_date', 50
            ).catch(() => [])
          )
        );
        entries = perCat.flat();
      } else {
        entries = await base44.asServiceRole.entities.CanonEntry.filter(
          fallbackQuery, '-created_date', 200
        ).catch(() => []);
      }
    }

    // Determine if query has zero real results — flag it explicitly
    const hasResults = scored.length > 0;
    const canonGapWarning = !hasResults
      ? `CANON GAP — No verified Canon entries found for query: "${query}". JurisEngine must return CANON GAP. Do not synthesize legal rules — request source document upload to the Canon Verification Engine.`
      : (!usedVerified ? `WARNING — No VERIFIED Canon entries matched. Results are unverified active entries. Treat with caution; route through Canon Verification Engine before citing.` : null);

    return Response.json({
      success: hasResults,
      canon_gap: !hasResults,
      used_verified: usedVerified,
      query,
      service: service_name || 'unknown',
      results: scored.map((e) => ({
        id: e.id,
        title: e.title,
        citation: e.citation,
        category: e.category,
        authority_level: e.authority_level,
        summary: e.summary,
        content: e.content,
        keywords: e.keywords,
        related_doctrines: e.related_doctrines,
        related_constitutional_provisions: e.related_constitutional_provisions,
        related_statutes: e.related_statutes,
        related_case_law: e.related_case_law,
        verified: e.verified,
      })),
      canon_gaps: gaps.map((g) => ({
        id: g.id,
        title: g.title,
        gap_reason: g.summary || 'Not imported',
        category: g.category,
        import_status: g.subcategory || 'not_imported',
      })),
      canon_gap_warning: canonGapWarning,
      total_active_entries: entries.length,
      fabrication_policy: 'STRICT — AI services must not synthesize legal rules from gaps. Only verified Canon entries may be cited.',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});