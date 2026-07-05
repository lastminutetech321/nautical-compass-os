import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Canon Verification Engine — ensures no Canon entry is marked verified without Founder/Admin review.
// AI may summarize, classify, detect citations, map relationships, and recommend; humans approve.
// POST { operation, ...params }
// operations: get_queue | queue_entry | validate_citation | classify_authority |
//             map_related | recommend_verification | approve_verification |
//             reject_verification | flag_gap | resolve_gap | get_verified_for_juris | get_stats
const FOUNDER_APPROVAL_CATEGORIES = ['legal', 'governance', 'compensation', 'canon_change'];

function now() { return new Date().toISOString(); }
function isAdmin(u) { return u && (u.role === 'admin' || u.role === 'founder'); }

async function safeFilter(svc, entity, query, sort, limit) {
  try { return await svc.asServiceRole.entities[entity].filter(query, sort || '-created_date', limit || 200); } catch { return []; }
}
async function safeList(svc, entity, sort, limit) {
  try { return await svc.asServiceRole.entities[entity].list(sort || '-created_date', limit || 200); } catch { return []; }
}
function pushHistory(rec, status, by, note) {
  if (!rec.verification_history) rec.verification_history = [];
  rec.verification_history.push({ status, changed_by: by || 'system', changed_at: now(), note: note || '' });
  return rec;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const operation = body.operation;
    const svc = base44;

    // ─── GET QUEUE ───
    if (operation === 'get_queue') {
      const { status_filter, priority_filter, limit = 100 } = body;
      const query = { status: 'active' };
      if (status_filter) query.verification_status = status_filter;
      else query.verification_status = { $ne: 'verified' };
      if (priority_filter) query.queue_priority = priority_filter;
      const queue = await safeFilter(svc, 'CanonVerification', query, '-created_date', limit);
      const verified = await safeFilter(svc, 'CanonVerification', { verification_status: 'verified' }, '-approved_at', 20);
      return Response.json({ operation: 'get_queue', queue, recently_verified: verified });
    }

    // ─── QUEUE ENTRY (create verification case for a CanonEntry) ───
    if (operation === 'queue_entry') {
      const { canon_entry_id, is_gap_case = false, blocks_jurisengine = false, blocks_builds = [] } = body;
      if (!canon_entry_id && !is_gap_case) return Response.json({ error: 'canon_entry_id or is_gap_case required' }, { status: 400 });
      let entry = null;
      if (canon_entry_id) {
        try { entry = await svc.asServiceRole.entities.CanonEntry.get(canon_entry_id); } catch {}
      }
      // Don't duplicate: check existing
      if (canon_entry_id) {
        const existing = await safeFilter(svc, 'CanonVerification', { canon_entry_id, status: 'active' }, '-created_date', 1);
        if (existing.length > 0) return Response.json({ operation: 'queue_entry', already_queued: true, verification_id: existing[0].id });
      }
      const rec = pushHistory({
        canon_entry_id: canon_entry_id || '',
        canon_title: entry?.title || body.canon_title || 'Canon Gap',
        canon_citation: entry?.citation || '',
        is_gap_case,
        queue_priority: body.priority || (blocks_jurisengine ? 'critical' : 'high'),
        verification_status: 'queued',
        blocks_jurisengine,
        blocks_builds: blocks_builds || [],
        tags: [is_gap_case ? 'gap' : 'entry'].filter(Boolean)
      }, 'queued', user.full_name || user.email, 'Verification case created');
      const created = await svc.asServiceRole.entities.CanonVerification.create(rec);
      return Response.json({ operation: 'queue_entry', verification: created });
    }

    // ─── VALIDATE CITATION (AI) ───
    if (operation === 'validate_citation') {
      const { verification_id } = body;
      const v = await svc.asServiceRole.entities.CanonVerification.get(verification_id);
      if (!v) return Response.json({ error: 'not found' }, { status: 404 });
      let entry = null;
      if (v.canon_entry_id) { try { entry = await svc.asServiceRole.entities.CanonEntry.get(v.canon_entry_id); } catch {} }
      const citation = (entry?.citation || v.canon_citation || '').trim();
      let validation = { citation_text: citation, format_valid: false, citation_found: false, source_confirmed: false, validation_notes: '', validated_at: now() };
      if (citation) {
        const llm = await svc.asServiceRole.integrations.Core.InvokeLLM({
          prompt: `Validate this legal citation. Respond with ONLY a JSON object (no markdown): {"format_valid": boolean, "citation_found": boolean, "source_confirmed": boolean, "validation_notes": string, "suggested_correction": string}.\nCitation: "${citation}"\nSource URL: ${entry?.source_url || 'none'}\nRules: format_valid means it follows standard legal citation format. citation_found means the authority appears real and locatable. source_confirmed means the provided source URL corroborates it. Never fabricate — if uncertain, mark false.`,
        });
        try { validation = { ...validation, ...(typeof llm === 'string' ? JSON.parse(llm) : llm), validated_at: now(), citation_text: citation }; } catch {}
      } else {
        validation.validation_notes = 'No citation provided.';
      }
      const updated = pushHistory({ ...v, citation_validation: validation, verification_status: 'citation_validated' }, 'citation_validated', 'ai', validation.validation_notes);
      await svc.asServiceRole.entities.CanonVerification.update(verification_id, updated);
      return Response.json({ operation: 'validate_citation', validation });
    }

    // ─── CLASSIFY AUTHORITY (AI) ───
    if (operation === 'classify_authority') {
      const { verification_id } = body;
      const v = await svc.asServiceRole.entities.CanonVerification.get(verification_id);
      if (!v) return Response.json({ error: 'not found' }, { status: 404 });
      let entry = null;
      if (v.canon_entry_id) { try { entry = await svc.asServiceRole.entities.CanonEntry.get(v.canon_entry_id); } catch {} }
      const llm = await svc.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `Classify this legal authority. Respond with ONLY a JSON object (no markdown): {"suggested_category": string, "suggested_authority_level": string, "suggested_jurisdiction": string, "reasoning": string}.\nTitle: ${entry?.title || v.canon_title}\nCitation: ${entry?.citation || v.canon_citation}\nContent excerpt: ${(entry?.content || '').slice(0, 800)}\nAuthority levels: supreme_court, circuit_court, district_court, federal_agency, state_supreme, state_appellate, state_statute, municipal, constitutional, nc_doctrine, administrative, policy.`,
      });
      let classification = {};
      try { classification = typeof llm === 'string' ? JSON.parse(llm) : llm; } catch {}
      const updated = pushHistory({ ...v, ai_classification: classification, verification_status: 'authority_reviewed' }, 'authority_reviewed', 'ai', classification.reasoning || '');
      await svc.asServiceRole.entities.CanonVerification.update(verification_id, updated);
      return Response.json({ operation: 'classify_authority', classification });
    }

    // ─── MAP RELATED AUTHORITIES ───
    if (operation === 'map_related') {
      const { verification_id } = body;
      const v = await svc.asServiceRole.entities.CanonVerification.get(verification_id);
      if (!v) return Response.json({ error: 'not found' }, { status: 404 });
      let entry = null;
      if (v.canon_entry_id) { try { entry = await svc.asServiceRole.entities.CanonEntry.get(v.canon_entry_id); } catch {} }
      const allEntries = await safeFilter(svc, 'CanonEntry', { status: 'active' }, '-created_date', 300);
      const related = [];
      const terms = ((entry?.title || v.canon_title || '') + ' ' + (entry?.keywords || []).join(' ') + ' ' + (entry?.related_doctrines || []).join(' ')).toLowerCase().split(/\s+/).filter(t => t.length > 3);
      for (const e of allEntries) {
        if (e.id === v.canon_entry_id) continue;
        const h = ((e.title || '') + ' ' + (e.keywords || []).join(' ') + ' ' + (e.related_doctrines || []).join(' ')).toLowerCase();
        const score = terms.reduce((s, t) => s + (h.includes(t) ? 1 : 0), 0);
        if (score >= 2) related.push({ related_entry_id: e.id, related_title: e.title, relationship_type: 'topical', notes: `score ${score}` });
      }
      const updated = pushHistory({ ...v, related_authority_mapping: related.slice(0, 15), related_authority_count: related.length, verification_status: 'relationships_mapped' }, 'relationships_mapped', 'ai', `${related.length} related`);
      await svc.asServiceRole.entities.CanonVerification.update(verification_id, updated);
      return Response.json({ operation: 'map_related', related_count: related.length, related: related.slice(0, 15) });
    }

    // ─── RECOMMEND VERIFICATION (AI confidence + recommendation) ───
    if (operation === 'recommend_verification') {
      const { verification_id } = body;
      const v = await svc.asServiceRole.entities.CanonVerification.get(verification_id);
      if (!v) return Response.json({ error: 'not found' }, { status: 404 });
      let entry = null;
      if (v.canon_entry_id) { try { entry = await svc.asServiceRole.entities.CanonEntry.get(v.canon_entry_id); } catch {} }
      const cv = v.citation_validation || {};
      const ac = v.ai_classification || {};
      const llm = await svc.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `Review this Canon verification case and recommend. Respond with ONLY a JSON object (no markdown): {"confidence_score": number 0-100, "ai_recommendation": "recommend_verify"|"recommend_reject"|"needs_more_info", "ai_summary": string}.\nTitle: ${entry?.title || v.canon_title}\nCitation: ${entry?.citation || v.canon_citation}\nCitation valid: ${cv.format_valid}, found: ${cv.citation_found}, source confirmed: ${cv.source_confirmed}\nClassification: ${JSON.stringify(ac)}\nHas content: ${(entry?.content || '').length > 100}\nRules: confidence reflects citation validity + source corroboration + classification clarity. Never recommend_verify above 90 without human confirmation. This is a recommendation only — a human must approve.`,
      });
      let rec = {};
      try { rec = typeof llm === 'string' ? JSON.parse(llm) : llm; } catch {}
      const updated = pushHistory({
        ...v,
        ai_summary: rec.ai_summary || v.ai_summary || '',
        ai_recommendation: rec.ai_recommendation || 'pending',
        confidence_score: Math.min(95, Math.max(0, rec.confidence_score || 0)),
        verification_status: 'ai_recommended',
        ai_recommended_at: now()
      }, 'ai_recommended', 'ai', rec.ai_summary || '');
      await svc.asServiceRole.entities.CanonVerification.update(verification_id, updated);
      return Response.json({ operation: 'recommend_verification', recommendation: rec });
    }

    // ─── APPROVE VERIFICATION (Founder/Admin only) ───
    if (operation === 'approve_verification') {
      const { verification_id, reviewer_note } = body;
      if (!isAdmin(user)) return Response.json({ error: 'Founder/Admin approval required for Canon verification' }, { status: 403 });
      const v = await svc.asServiceRole.entities.CanonVerification.get(verification_id);
      if (!v) return Response.json({ error: 'not found' }, { status: 404 });
      const updated = pushHistory({
        ...v,
        verification_status: 'verified',
        reviewer_id: user.id,
        reviewer_name: user.full_name || user.email,
        reviewed_at: now(),
        approved_by: user.full_name || user.email,
        approved_at: now()
      }, 'verified', user.full_name || user.email, reviewer_note || 'Approved by Founder/Admin');
      if (!updated.reviewer_notes) updated.reviewer_notes = [];
      updated.reviewer_notes.push({ reviewer: user.full_name || user.email, note: reviewer_note || 'Approved', action: 'approve', timestamp: now() });
      await svc.asServiceRole.entities.CanonVerification.update(verification_id, updated);
      // Mark the CanonEntry verified
      if (v.canon_entry_id) {
        try {
          await svc.asServiceRole.entities.CanonEntry.update(v.canon_entry_id, {
            verified: true,
            status: 'active',
            reviewer: user.full_name || user.email,
            reviewed_at: now(),
            confidence: updated.confidence_score || 0
          });
        } catch {}
      }
      return Response.json({ operation: 'approve_verification', verification: updated, canon_entry_marked_verified: !!v.canon_entry_id });
    }

    // ─── REJECT VERIFICATION ───
    if (operation === 'reject_verification') {
      const { verification_id, rejection_reason } = body;
      if (!isAdmin(user)) return Response.json({ error: 'Founder/Admin required' }, { status: 403 });
      const v = await svc.asServiceRole.entities.CanonVerification.get(verification_id);
      if (!v) return Response.json({ error: 'not found' }, { status: 404 });
      const updated = pushHistory({
        ...v,
        verification_status: 'rejected',
        rejection_reason: rejection_reason || '',
        reviewer_id: user.id,
        reviewer_name: user.full_name || user.email,
        reviewed_at: now()
      }, 'rejected', user.full_name || user.email, rejection_reason || 'Rejected');
      if (!updated.reviewer_notes) updated.reviewer_notes = [];
      updated.reviewer_notes.push({ reviewer: user.full_name || user.email, note: rejection_reason || 'Rejected', action: 'reject', timestamp: now() });
      await svc.asServiceRole.entities.CanonVerification.update(verification_id, updated);
      if (v.canon_entry_id) {
        try { await svc.asServiceRole.entities.CanonEntry.update(v.canon_entry_id, { verified: false, status: 'draft' }); } catch {}
      }
      return Response.json({ operation: 'reject_verification', verification: updated });
    }

    // ─── FLAG GAP ───
    if (operation === 'flag_gap') {
      const { verification_id, gap_reason, blocks_builds } = body;
      const v = await svc.asServiceRole.entities.CanonVerification.get(verification_id);
      if (!v) return Response.json({ error: 'not found' }, { status: 404 });
      const updated = pushHistory({
        ...v,
        verification_status: 'gap_flagged',
        is_gap_case: true,
        gap_resolution_flow: { is_gap: true, gap_reason: gap_reason || '', resolution_path: '', resolved_at: '', resolved_by: '', imported_entry_id: '' },
        blocks_builds: blocks_builds || v.blocks_builds || []
      }, 'gap_flagged', user.full_name || user.email, gap_reason || '');
      await svc.asServiceRole.entities.CanonVerification.update(verification_id, updated);
      return Response.json({ operation: 'flag_gap', verification: updated });
    }

    // ─── RESOLVE GAP ───
    if (operation === 'resolve_gap') {
      const { verification_id, imported_entry_id, resolution_path } = body;
      if (!isAdmin(user)) return Response.json({ error: 'Founder/Admin required to resolve Canon gap' }, { status: 403 });
      const v = await svc.asServiceRole.entities.CanonVerification.get(verification_id);
      if (!v) return Response.json({ error: 'not found' }, { status: 404 });
      const updated = pushHistory({
        ...v,
        verification_status: 'gap_resolved',
        canon_entry_id: imported_entry_id || v.canon_entry_id,
        gap_resolution_flow: { ...(v.gap_resolution_flow || {}), is_gap: true, resolution_path: resolution_path || '', resolved_at: now(), resolved_by: user.full_name || user.email, imported_entry_id: imported_entry_id || '' }
      }, 'gap_resolved', user.full_name || user.email, 'Gap resolved with imported entry');
      await svc.asServiceRole.entities.CanonVerification.update(verification_id, updated);
      return Response.json({ operation: 'resolve_gap', verification: updated });
    }

    // ─── GET VERIFIED FOR JURIS (used by JurisEngine) ───
    if (operation === 'get_verified_for_juris') {
      const { query, categories, limit = 15 } = body;
      const qLower = (query || '').toLowerCase();
      const qTerms = qLower.split(/\s+/).filter(Boolean);
      let entries = [];
      const filterQuery = { verified: true, status: 'active' };
      if (categories && categories.length) {
        const perCat = await Promise.all(categories.map(c => safeFilter(svc, 'CanonEntry', { ...filterQuery, category: c }, '-created_date', 50)));
        entries = perCat.flat();
      } else {
        entries = await safeFilter(svc, 'CanonEntry', filterQuery, '-created_date', 300);
      }
      const scored = entries.map(e => {
        const haystack = [e.search_index || '', e.title || '', e.citation || '', (e.keywords || []).join(' '), e.summary || ''].join(' ').toLowerCase();
        const score = qTerms.reduce((s, t) => s + (haystack.includes(t) ? 1 : 0), 0);
        return { entry: e, score };
      }).filter(r => r.score > 0).sort((a, b) => b.score - a.score).slice(0, limit).map(r => r.entry);
      const hasResults = scored.length > 0;
      return Response.json({
        success: hasResults,
        canon_gap: !hasResults,
        query,
        verified_results: scored.map(e => ({ id: e.id, title: e.title, citation: e.citation, category: e.category, authority_level: e.authority_level, summary: e.summary, content: e.content, keywords: e.keywords, verified: true })),
        canon_gap_warning: !hasResults ? `CANON GAP — No verified Canon entries found for: "${query}". JurisEngine must return CANON GAP. Do not synthesize legal rules.` : null,
        fabrication_policy: 'STRICT — only verified Canon entries may be cited. AI must not fabricate law.'
      });
    }

    // ─── GET STATS ───
    if (operation === 'get_stats') {
      const all = await safeList(svc, 'CanonVerification', '-created_date', 500);
      const canonEntries = await safeList(svc, 'CanonEntry', '-created_date', 500);
      const stats = {
        total_cases: all.length,
        queued: all.filter(v => v.verification_status === 'queued').length,
        ai_recommended: all.filter(v => v.verification_status === 'ai_recommended').length,
        founder_review: all.filter(v => v.verification_status === 'founder_review').length,
        verified: all.filter(v => v.verification_status === 'verified').length,
        rejected: all.filter(v => v.verification_status === 'rejected').length,
        gaps_flagged: all.filter(v => v.verification_status === 'gap_flagged').length,
        gaps_resolved: all.filter(v => v.verification_status === 'gap_resolved').length,
        total_canon_entries: canonEntries.length,
        verified_canon_entries: canonEntries.filter(e => e.verified === true).length,
        active_unverified: canonEntries.filter(e => e.status === 'active' && !e.verified).length,
        blocks_jurisengine: all.filter(v => v.blocks_jurisengine && v.verification_status !== 'verified' && v.verification_status !== 'gap_resolved').length,
        avg_confidence: all.length ? Math.round(all.reduce((s, v) => s + (v.confidence_score || 0), 0) / all.length) : 0
      };
      return Response.json({ operation: 'get_stats', stats });
    }

    return Response.json({ error: 'unknown operation: ' + operation }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});