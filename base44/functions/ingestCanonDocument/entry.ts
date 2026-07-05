import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { file_url, file_name, hint_category, hint_jurisdiction } = body;

    if (!file_url) return Response.json({ error: 'file_url is required' }, { status: 400 });

    // Step 1: Fetch the file content as text for AI processing
    let rawText = '';
    try {
      const fileResp = await fetch(file_url);
      rawText = await fileResp.text();
      // Truncate to 12000 chars to stay within LLM context limits
      if (rawText.length > 12000) rawText = rawText.slice(0, 12000) + '\n\n[TRUNCATED — full text stored separately]';
    } catch (_) {
      rawText = `[Could not fetch file content. File URL: ${file_url}]`;
    }

    const categoryHint = hint_category || 'other';
    const jurisdictionHint = hint_jurisdiction || 'Federal';

    // Step 2: AI extraction — produce a structured Canon Entry
    // STRICT RULE: Only extract what is literally present in the document text.
    // Never fabricate statutes, citations, holdings, case names, or legal rules.
    const extracted = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are a legal knowledge engineer for Nautical Compass OS (NCOS).
Your job is to extract a structured Canon Entry from the EXACT document text provided.

CRITICAL RULES — VIOLATIONS CORRUPT THE LEGAL DATABASE:
1. NEVER invent, fabricate, or hallucinate any statute, citation, case name, holding, or legal rule.
2. ONLY extract information that is LITERALLY present in the document text below.
3. If a field cannot be determined from the text, use an empty string "" or empty array [].
4. Do NOT fill gaps with general legal knowledge. An empty field is correct. A fabricated field is a critical error.
5. For cross_references, related_statutes, related_case_law: only include items EXPLICITLY cited in the document text.
6. The summary must describe only what THIS document says, not what you know about the topic.
7. Content must be quoted or closely paraphrased from the document — not synthesized.

FILE NAME: ${file_name || 'Unknown'}
HINT CATEGORY: ${categoryHint}
HINT JURISDICTION: ${jurisdictionHint}

DOCUMENT TEXT (extract ONLY from this):
${rawText}

Extract these fields from the document text above:
- title: The official name/title as it appears in the document
- citation: Official citation as it appears in the document (empty string if not present)
- category: One of: federal_statute, state_statute, case_law, constitutional_law, civil_rights, standing_doctrine, jurisdiction, capacity_doctrine, administrative_law, consumer_protection, indigenous_rights, nc_doctrine, evidence_standard, other
- subcategory: Specific area as described in the document (empty string if unclear)
- jurisdiction: As stated in the document (empty string if not stated)
- authority_level: One of: supreme_court, circuit_court, district_court, federal_agency, state_supreme, state_appellate, state_statute, municipal, constitutional, nc_doctrine
- summary: 2-4 sentences describing ONLY what this specific document establishes — no outside knowledge
- content: The operative text, holding, or core legal rule as it appears in the document (under 800 words, direct quote or close paraphrase)
- keywords: Terms that appear in the document text (8-15 max)
- cross_references: Only items EXPLICITLY cited in this document
- related_doctrines: Only doctrines EXPLICITLY named in this document
- related_constitutional_provisions: Only provisions EXPLICITLY cited in this document
- related_statutes: Only statutes EXPLICITLY cited in this document
- related_case_law: Only cases EXPLICITLY cited in this document
- ai_services: Which NCOS AI services should query this (array from: JurisEngine, Investigation Compass, Court Compass, Authority Compass, Legal Rail)
- effective_date: Date as stated in the document (YYYY-MM-DD or empty string)

Return ONLY valid JSON. No explanation, no markdown, no invented data.`,
      response_json_schema: {
        type: "object",
        properties: {
          title: { type: "string" },
          citation: { type: "string" },
          category: { type: "string" },
          subcategory: { type: "string" },
          jurisdiction: { type: "string" },
          authority_level: { type: "string" },
          summary: { type: "string" },
          content: { type: "string" },
          keywords: { type: "array", items: { type: "string" } },
          cross_references: { type: "array", items: { type: "string" } },
          related_doctrines: { type: "array", items: { type: "string" } },
          related_constitutional_provisions: { type: "array", items: { type: "string" } },
          related_statutes: { type: "array", items: { type: "string" } },
          related_case_law: { type: "array", items: { type: "string" } },
          ai_services: { type: "array", items: { type: "string" } },
          effective_date: { type: "string" }
        },
        required: ["title","category","content","summary"]
      }
    });

    // Step 3: Build search index — concatenation of all searchable fields
    const searchIndex = [
      extracted.title,
      extracted.citation,
      extracted.summary,
      extracted.content,
      (extracted.keywords || []).join(' '),
      (extracted.cross_references || []).join(' '),
      (extracted.related_doctrines || []).join(' '),
    ].filter(Boolean).join(' ').toLowerCase();

    // Step 4: Build AI embedding stub (summary + keywords — full vector embedding 
    // would require a dedicated embeddings endpoint; this gives a rich text representation)
    const aiEmbedding = JSON.stringify({
      title: extracted.title,
      citation: extracted.citation,
      summary: extracted.summary,
      keywords: extracted.keywords,
      category: extracted.category,
      authority_level: extracted.authority_level,
    });

    const now = new Date().toISOString();

    // Step 5: Persist to CanonEntry
    const entry = await base44.asServiceRole.entities.CanonEntry.create({
      title: extracted.title || file_name || 'Untitled',
      citation: extracted.citation || '',
      category: extracted.category || categoryHint,
      subcategory: extracted.subcategory || '',
      jurisdiction: extracted.jurisdiction || jurisdictionHint,
      authority_level: extracted.authority_level || 'federal_agency',
      summary: extracted.summary || '',
      content: extracted.content || rawText.slice(0, 3000),
      full_text: rawText,
      keywords: extracted.keywords || [],
      cross_references: extracted.cross_references || [],
      related_doctrines: extracted.related_doctrines || [],
      related_constitutional_provisions: extracted.related_constitutional_provisions || [],
      related_statutes: extracted.related_statutes || [],
      related_case_law: extracted.related_case_law || [],
      ai_services: extracted.ai_services || [],
      effective_date: extracted.effective_date || undefined,
      source_file_url: file_url,
      search_index: searchIndex,
      ai_embedding: aiEmbedding,
      status: 'pending_review',
      verified: false,
      imported_at: now,
      indexed_at: now,
      version: '1.0',
    });

    return Response.json({ success: true, entry_id: entry.id, title: entry.title, category: entry.category });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});