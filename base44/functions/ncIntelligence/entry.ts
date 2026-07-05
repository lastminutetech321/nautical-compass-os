import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { operation, params } = body;

    // Helper: fetch a sample of records from an entity type
    const fetchEntitySample = async (entityName, limit = 50) => {
      try {
        return await base44.asServiceRole.entities[entityName].list('-created_date', limit);
      } catch {
        return [];
      }
    };

    // Helper: fetch existing memory records
    const fetchMemories = async (memoryType, limit = 100) => {
      const query = memoryType ? { memory_type: memoryType, is_active: true } : { is_active: true };
      try {
        return await base44.asServiceRole.entities.MemoryRecord.filter(query, '-created_date', limit);
      } catch {
        return [];
      }
    };

    // --- SEMANTIC SEARCH ---
    // Uses LLM to search across all indexed content + live entity data
    if (operation === 'semantic_search') {
      const { query, target_modules, memory_types } = params;
      if (!query) return Response.json({ error: 'Query required' }, { status: 400 });

      // Gather relevant content from semantic index + memories
      const [memories, semanticIndex] = await Promise.all([
        fetchMemories(null, 200),
        fetchEntitySample('SemanticIndex', 200),
      ]);

      // Filter by memory types if specified
      let filteredMemories = memory_types?.length
        ? memories.filter(m => memory_types.includes(m.memory_type))
        : memories;

      const contextData = {
        memories: filteredMemories.map(m => ({ id: m.id, type: m.memory_type, title: m.title, content: m.content?.slice(0, 500), summary: m.summary, tags: m.tags })),
        semantic_entries: semanticIndex.map(s => ({ id: s.entity_id, type: s.entity_type, name: s.entity_name, content: s.content_text?.slice(0, 300), keywords: s.keywords })),
      };

      const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `You are the NCOS Semantic Search Engine. A user searched for: "${query}".

Search across all provided intelligence data and return the most relevant matches.

Available data:
${JSON.stringify(contextData).slice(0, 8000)}

Return the top matches with relevance scores, matched snippets, and the source entity reference.`,
        response_json_schema: {
          type: "object",
          properties: {
            results: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  entity_id: { type: "string" },
                  entity_type: { type: "string" },
                  title: { type: "string" },
                  matched_snippet: { type: "string" },
                  relevance_score: { type: "number" },
                  reason: { type: "string" },
                  source_module: { type: "string" },
                }
              }
            },
            search_summary: { type: "string" },
            total_matches: { type: "number" },
          }
        }
      });

      // Track consumption
      return Response.json({ result, operation: 'semantic_search' });
    }

    // --- PATTERN RECOGNITION ---
    // Analyzes entity data to detect patterns across modules
    if (operation === 'detect_patterns') {
      const { target_module, entity_types } = params;

      // Gather data from requested entity types or default set
      const typesToScan = entity_types || ['Task', 'BuildRegistry', 'CRMOpportunity', 'Subscription', 'DiagnosticIssue', 'AgentProfile', 'Evidence', 'CanonEntry'];
      const entityData = {};
      for (const et of typesToScan) {
        entityData[et] = await fetchEntitySample(et, 30);
      }

      // Fetch existing patterns to avoid duplicates
      const existingPatterns = await fetchEntitySample('PatternRecord', 50);

      const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `You are the NCOS Pattern Recognition Engine. Analyze the following entity data and detect meaningful patterns.

Entity data:
${JSON.stringify(entityData).slice(0, 8000)}

Existing patterns already detected (avoid duplicates):
${JSON.stringify(existingPatterns.map(p => p.title)).slice(0, 1000)}

Detect patterns in categories: temporal (time-based), behavioral (recurring actions), structural (architecture), anomaly (outliers), correlation (linked occurrences), causal (cause-effect).

For each pattern, provide: title, description, pattern_type, entities involved, confidence (0-100), significance, recommended actions.`,
        response_json_schema: {
          type: "object",
          properties: {
            patterns: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  pattern_type: { type: "string" },
                  entity_types_involved: { type: "array", items: { type: "string" } },
                  confidence: { type: "number" },
                  significance: { type: "string" },
                  recommended_actions: { type: "array", items: { type: "string" } },
                }
              }
            },
            analysis_summary: { type: "string" },
          }
        }
      });

      // Persist detected patterns
      const createdPatterns = [];
      if (result.patterns) {
        for (const p of result.patterns.slice(0, 10)) {
          try {
            const created = await base44.asServiceRole.entities.PatternRecord.create({
              pattern_type: p.pattern_type || 'behavioral',
              title: p.title,
              description: p.description,
              entity_types_involved: p.entity_types_involved || [],
              confidence: p.confidence || 50,
              significance: p.significance || 'medium',
              recommended_actions: p.recommended_actions || [],
              detected_by_agent: 'nc_intelligence',
              status: 'detected',
              first_seen: new Date().toISOString().slice(0, 10),
              last_seen: new Date().toISOString().slice(0, 10),
            });
            createdPatterns.push(created);
          } catch (e) { /* skip on error */ }
        }
      }

      return Response.json({ result, created_patterns: createdPatterns, operation: 'detect_patterns' });
    }

    // --- RECOMMENDATION ENGINE ---
    // Generates actionable recommendations from patterns + memory
    if (operation === 'generate_recommendations') {
      const { target_module, priority_filter } = params;

      const [patterns, memories, builds, issues, roadmap] = await Promise.all([
        fetchEntitySample('PatternRecord', 50),
        fetchMemories(null, 100),
        fetchEntitySample('BuildRegistry', 30),
        fetchEntitySample('DiagnosticIssue', 30),
        fetchEntitySample('RoadmapItem', 30),
      ]);

      const existingRecs = await fetchEntitySample('Recommendation', 50);

      const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `You are the NCOS Recommendation Engine. Generate actionable recommendations based on platform intelligence.

Detected patterns:
${JSON.stringify(patterns.map(p => ({ title: p.title, type: p.pattern_type, significance: p.significance, actions: p.recommended_actions }))).slice(0, 3000)}

Active memory records:
${JSON.stringify(memories.map(m => ({ type: m.memory_type, title: m.title, importance: m.importance_score }))).slice(0, 2000)}

Current platform state:
- Builds: ${builds.length} (${builds.filter(b => b.is_blocked).length} blocked)
- Open issues: ${issues.length} (${issues.filter(i => i.severity === 'critical').length} critical)
- Roadmap items: ${roadmap.filter(r => r.status === 'in_progress').length} in progress

Existing recommendations (avoid duplicates):
${JSON.stringify(existingRecs.map(r => r.title)).slice(0, 1000)}

Generate 5-10 high-value recommendations with: title, description, rationale, target_module, priority, confidence, expected_impact, effort_estimate, action_steps.`,
        response_json_schema: {
          type: "object",
          properties: {
            recommendations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  rationale: { type: "string" },
                  recommendation_type: { type: "string" },
                  target_module: { type: "string" },
                  priority: { type: "string" },
                  confidence: { type: "number" },
                  expected_impact: { type: "string" },
                  effort_estimate: { type: "string" },
                  action_steps: { type: "array", items: { type: "string" } },
                }
              }
            },
            strategy_summary: { type: "string" },
          }
        }
      });

      // Persist recommendations
      const createdRecs = [];
      if (result.recommendations) {
        for (const r of result.recommendations.slice(0, 10)) {
          try {
            const created = await base44.asServiceRole.entities.Recommendation.create({
              recommendation_type: r.recommendation_type || 'action',
              title: r.title,
              description: r.description,
              rationale: r.rationale,
              target_module: r.target_module,
              priority: r.priority || 'medium',
              confidence: r.confidence || 50,
              expected_impact: r.expected_impact || 'medium',
              effort_estimate: r.effort_estimate || 'md',
              action_steps: r.action_steps || [],
              generated_by_agent: 'nc_intelligence',
              status: 'pending',
            });
            createdRecs.push(created);
          } catch (e) { /* skip */ }
        }
      }

      return Response.json({ result, created_recommendations: createdRecs, operation: 'generate_recommendations' });
    }

    // --- DUPLICATE DETECTION ---
    if (operation === 'detect_duplicates') {
      const { entity_type } = params;
      if (!entity_type) return Response.json({ error: 'entity_type required' }, { status: 400 });

      const records = await fetchEntitySample(entity_type, 100);
      if (records.length < 2) return Response.json({ duplicates: [], message: 'Not enough records to compare' });

      const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `You are the NCOS Duplicate Detection Engine. Analyze the following ${entity_type} records and identify duplicates or near-duplicates.

Records:
${JSON.stringify(records.map(r => ({ id: r.id, name: r.name || r.title || r.full_name, content: (r.content || r.description || r.purpose || '').slice(0, 200) }))).slice(0, 6000)}

Identify groups of records that are likely duplicates. For each group, specify the primary record (most complete) and the duplicates, with a confidence score.`,
        response_json_schema: {
          type: "object",
          properties: {
            duplicate_groups: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  primary_id: { type: "string" },
                  duplicate_ids: { type: "array", items: { type: "string" } },
                  confidence: { type: "number" },
                  reason: { type: "string" },
                }
              }
            },
            total_duplicates: { type: "number" },
          }
        }
      });

      return Response.json({ result, operation: 'detect_duplicates' });
    }

    // --- SIMILARITY SEARCH ---
    if (operation === 'similarity_search') {
      const { entity_id, entity_type, top_k } = params;

      // Find the source record
      let sourceRecord = null;
      try {
        sourceRecord = await base44.asServiceRole.entities[entity_type].get(entity_id);
      } catch {
        return Response.json({ error: 'Entity not found' }, { status: 404 });
      }

      const allRecords = await fetchEntitySample(entity_type, 100);
      const candidates = allRecords.filter(r => r.id !== entity_id);

      const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `You are the NCOS Similarity Search Engine. Find the most similar records to the given source.

Source record:
${JSON.stringify({ id: sourceRecord.id, name: sourceRecord.name || sourceRecord.title, content: (sourceRecord.content || sourceRecord.description || sourceRecord.purpose || '').slice(0, 400) })}

Candidate records:
${JSON.stringify(candidates.map(r => ({ id: r.id, name: r.name || r.title, content: (r.content || r.description || r.purpose || '').slice(0, 200) }))).slice(0, 6000)}

Return the top ${top_k || 5} most similar records with similarity scores and reasons.`,
        response_json_schema: {
          type: "object",
          properties: {
            similar_items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  entity_id: { type: "string" },
                  entity_name: { type: "string" },
                  similarity_score: { type: "number" },
                  reason: { type: "string" },
                }
              }
            },
          }
        }
      });

      return Response.json({ result, operation: 'similarity_search' });
    }

    // --- INGEST MEMORY ---
    // Stores a new memory record from any module
    if (operation === 'ingest_memory') {
      const { memory_type, title, content, source_entity_type, source_entity_id, source_module, importance_score, tags } = params;
      if (!memory_type || !title || !content) {
        return Response.json({ error: 'memory_type, title, content required' }, { status: 400 });
      }

      const created = await base44.asServiceRole.entities.MemoryRecord.create({
        memory_type,
        title,
        content,
        source_entity_type,
        source_entity_id,
        source_module: source_module || 'external',
        importance_score: importance_score || 50,
        tags: tags || [],
        created_by_module: source_module || 'external',
        is_active: true,
        status: 'active',
      });

      // Also index in semantic index
      try {
        await base44.asServiceRole.entities.SemanticIndex.create({
          entity_type: 'MemoryRecord',
          entity_id: created.id,
          entity_name: title,
          content_text: content,
          keywords: tags || [],
          memory_type,
          source_module: source_module || 'external',
          last_indexed: new Date().toISOString(),
          status: 'indexed',
        });
      } catch (e) { /* skip indexing on error */ }

      return Response.json({ memory: created, operation: 'ingest_memory' });
    }

    // --- BUILD RELATIONSHIP GRAPH ---
    // Discovers relationships between entities using AI
    if (operation === 'discover_relationships') {
      const { entity_type, entity_id } = params;

      let sourceRecord = null;
      try {
        sourceRecord = await base44.asServiceRole.entities[entity_type].get(entity_id);
      } catch {
        return Response.json({ error: 'Entity not found' }, { status: 404 });
      }

      // Get a sample of other records to find relationships with
      const candidates = await fetchEntitySample(entity_type, 50);
      const otherRecords = candidates.filter(r => r.id !== entity_id);

      const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `You are the NCOS Relationship Graph Engine. Discover relationships between the source entity and candidate entities.

Source entity (${entity_type}):
${JSON.stringify({ id: sourceRecord.id, name: sourceRecord.name || sourceRecord.title, content: (sourceRecord.content || sourceRecord.description || sourceRecord.purpose || '').slice(0, 400), tags: sourceRecord.tags, category: sourceRecord.category }).slice(0, 800)}

Candidate entities:
${JSON.stringify(otherRecords.map(r => ({ id: r.id, name: r.name || r.title, content: (r.content || r.description || r.purpose || '').slice(0, 150), tags: r.tags, category: r.category }))).slice(0, 5000)}

Identify meaningful relationships. For each: target_id, relationship_type, strength (0-100), description, confidence.`,
        response_json_schema: {
          type: "object",
          properties: {
            relationships: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  target_id: { type: "string" },
                  target_name: { type: "string" },
                  relationship_type: { type: "string" },
                  strength: { type: "number" },
                  description: { type: "string" },
                  confidence: { type: "number" },
                }
              }
            },
            graph_summary: { type: "string" },
          }
        }
      });

      // Persist relationships
      const createdLinks = [];
      if (result.relationships) {
        for (const rel of result.relationships) {
          try {
            const link = await base44.asServiceRole.entities.RelationshipLink.create({
              source_entity_type: entity_type,
              source_entity_id: entity_id,
              source_entity_name: sourceRecord.name || sourceRecord.title,
              target_entity_type: entity_type,
              target_entity_id: rel.target_id,
              target_entity_name: rel.target_name,
              relationship_type: rel.relationship_type,
              strength: rel.strength || 50,
              description: rel.description,
              discovered_by: 'ai',
              confidence: rel.confidence || 50,
              status: 'active',
            });
            createdLinks.push(link);
          } catch (e) { /* skip */ }
        }
      }

      return Response.json({ result, created_links: createdLinks, operation: 'discover_relationships' });
    }

    // --- GET INTELLIGENCE OVERVIEW ---
    if (operation === 'overview') {
      const [memories, patterns, recommendations, relationships, semanticIndex] = await Promise.all([
        fetchMemories(null, 500),
        fetchEntitySample('PatternRecord', 100),
        fetchEntitySample('Recommendation', 100),
        fetchEntitySample('RelationshipLink', 200),
        fetchEntitySample('SemanticIndex', 200),
      ]);

      const memoryByType = {};
      for (const m of memories) {
        memoryByType[m.memory_type] = (memoryByType[m.memory_type] || 0) + 1;
      }

      return Response.json({
        overview: {
          total_memories: memories.length,
          memory_by_type: memoryByType,
          total_patterns: patterns.length,
          confirmed_patterns: patterns.filter(p => p.status === 'confirmed').length,
          total_recommendations: recommendations.length,
          pending_recommendations: recommendations.filter(r => r.status === 'pending').length,
          accepted_recommendations: recommendations.filter(r => r.status === 'accepted' || r.status === 'implemented').length,
          total_relationships: relationships.length,
          verified_relationships: relationships.filter(r => r.verified).length,
          indexed_entities: semanticIndex.length,
          stale_index: semanticIndex.filter(s => s.status === 'stale').length,
        },
        operation: 'overview'
      });
    }

    // --- GET CONTEXT (module consumption entry point) ---
    // Any module calls this before taking an action to get relevant intelligence
    if (operation === 'get_context') {
      const { target_module, action_description, memory_types } = params;
      if (!target_module || !action_description) {
        return Response.json({ error: 'target_module and action_description required' }, { status: 400 });
      }

      const [memories, patterns, recommendations] = await Promise.all([
        fetchMemories(memory_types || null, 200),
        fetchEntitySample('PatternRecord', 50),
        fetchEntitySample('Recommendation', 50),
      ]);

      const filteredMemories = memory_types?.length
        ? memories.filter(m => memory_types.includes(m.memory_type))
        : memories;

      const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `You are the NCOS Intelligence Context Provider. Module "${target_module}" is about to perform: "${action_description}".

Find the most relevant memories, patterns, and recommendations that should inform this action.

Available memories:
${JSON.stringify(filteredMemories.map(m => ({ id: m.id, type: m.memory_type, title: m.title, content: (m.content || '').slice(0, 300), importance: m.importance_score, tags: m.tags }))).slice(0, 6000)}

Detected patterns:
${JSON.stringify(patterns.map(p => ({ id: p.id, title: p.title, type: p.pattern_type, significance: p.significance, actions: p.recommended_actions }))).slice(0, 2000)}

Recommendations:
${JSON.stringify(recommendations.map(r => ({ id: r.id, title: r.title, target: r.target_module, priority: r.priority, steps: r.action_steps }))).slice(0, 2000)}

Return the most relevant context items (max 5 memories, 3 patterns, 3 recommendations) that should inform this action.`,
        response_json_schema: {
          type: "object",
          properties: {
            relevant_memories: { type: "array", items: { type: "object", properties: { memory_id: { type: "string" }, title: { type: "string" }, relevance: { type: "string" }, why_it_matters: { type: "string" } } } },
            relevant_patterns: { type: "array", items: { type: "object", properties: { pattern_id: { type: "string" }, title: { type: "string" }, relevance: { type: "string" } } } },
            relevant_recommendations: { type: "array", items: { type: "object", properties: { rec_id: { type: "string" }, title: { type: "string" }, relevance: { type: "string" } } } },
            context_summary: { type: "string" },
            risk_flags: { type: "array", items: { type: "string" } },
          }
        }
      });

      // Record consumption for each memory used
      if (result.relevant_memories) {
        for (const rm of result.relevant_memories.slice(0, 5)) {
          if (rm.memory_id) {
            try {
              const mem = await base44.asServiceRole.entities.MemoryRecord.get(rm.memory_id);
              await base44.asServiceRole.entities.MemoryRecord.update(rm.memory_id, {
                consumption_count: (mem.consumption_count || 0) + 1,
                last_consumed_at: new Date().toISOString(),
                last_consumed_by: target_module,
              });
            } catch (e) { /* skip */ }
          }
        }
      }

      return Response.json({ context: result, consumed_by: target_module, operation: 'get_context' });
    }

    // --- RECORD CONSUMPTION ---
    if (operation === 'record_consumption') {
      const { memory_id, consumed_by_module } = params;
      if (!memory_id || !consumed_by_module) {
        return Response.json({ error: 'memory_id and consumed_by_module required' }, { status: 400 });
      }
      try {
        const mem = await base44.asServiceRole.entities.MemoryRecord.get(memory_id);
        const updated = await base44.asServiceRole.entities.MemoryRecord.update(memory_id, {
          consumption_count: (mem.consumption_count || 0) + 1,
          last_consumed_at: new Date().toISOString(),
          last_consumed_by: consumed_by_module,
        });
        return Response.json({ memory: updated, operation: 'record_consumption' });
      } catch (e) {
        return Response.json({ error: 'Memory not found' }, { status: 404 });
      }
    }

    // --- AUTO INGEST (creates memory from entity data) ---
    if (operation === 'auto_ingest') {
      const { entity_type, entity_id, action, source_module } = params;
      if (!entity_type || !entity_id) {
        return Response.json({ error: 'entity_type and entity_id required' }, { status: 400 });
      }

      const ENTITY_MEMORY_MAP = {
        'DecisionRecord': 'decision', 'ApprovalGate': 'decision',
        'EnterpriseOrg': 'organization', 'Organization': 'organization', 'EnterpriseClone': 'organization',
        'CRMLead': 'business', 'CRMOpportunity': 'business', 'CRMDeal': 'business', 'Subscription': 'business',
        'BuildRegistry': 'engineering', 'Task': 'engineering', 'Sprint': 'engineering', 'ADR': 'engineering',
        'CanonEntry': 'legal', 'LegalIssue': 'legal', 'FOIARequest': 'legal',
        'Evidence': 'evidence', 'CaseFile': 'evidence', 'VideoEvidence': 'evidence',
        'RevenueEvent': 'revenue', 'Invoice': 'revenue',
        'Project': 'operational', 'Activity': 'operational', 'DiagnosticIssue': 'operational',
      };

      let entity = null;
      try { entity = await base44.asServiceRole.entities[entity_type].get(entity_id); }
      catch { return Response.json({ error: 'Entity not found' }, { status: 404 }); }

      const memoryType = ENTITY_MEMORY_MAP[entity_type] || 'operational';
      const entityName = entity.name || entity.title || entity.clone_name || `${entity_type} ${entity_id.slice(-6)}`;
      const entityContent = entity.description || entity.content || entity.purpose || entity.summary || entity.notes || JSON.stringify(entity).slice(0, 1000);

      const title = `[${action || 'created'}] ${entityName} (${entity_type})`;
      const content = `Action: ${action || 'entity_created'}\nEntity: ${entity_type} (${entity_id})\nName: ${entityName}\nDetails: ${entityContent}`;

      const created = await base44.asServiceRole.entities.MemoryRecord.create({
        memory_type: memoryType,
        title,
        content,
        source_entity_type: entity_type,
        source_entity_id: entity_id,
        source_module: source_module || entity_type,
        importance_score: 50,
        tags: [entity_type, action || 'created'],
        created_by_module: source_module || 'auto_ingest',
        is_active: true,
        status: 'active',
      });

      try {
        await base44.asServiceRole.entities.SemanticIndex.create({
          entity_type: 'MemoryRecord',
          entity_id: created.id,
          entity_name: title,
          content_text: content,
          keywords: [entity_type, memoryType, action || 'created'],
          memory_type: memoryType,
          source_module: source_module || 'auto_ingest',
          last_indexed: new Date().toISOString(),
          status: 'indexed',
        });
      } catch (e) { /* skip */ }

      return Response.json({ memory: created, memory_type: memoryType, operation: 'auto_ingest' });
    }

    // --- GET CONSUMPTION STATS ---
    if (operation === 'get_consumption_stats') {
      const memories = await fetchMemories(null, 500);
      const byModule = {};
      const byConsumer = {};
      const byMemoryType = {};
      let totalConsumed = 0;

      for (const m of memories) {
        byMemoryType[m.memory_type] = (byMemoryType[m.memory_type] || 0) + 1;
        if (m.source_module) byModule[m.source_module] = (byModule[m.source_module] || 0) + 1;
        if (m.consumption_count > 0) totalConsumed += m.consumption_count;
        if (m.last_consumed_by) byConsumer[m.last_consumed_by] = (byConsumer[m.last_consumed_by] || 0) + 1;
      }

      return Response.json({
        stats: {
          total_memories: memories.length,
          total_consumed: totalConsumed,
          avg_consumption: memories.length > 0 ? Math.round(totalConsumed / memories.length * 10) / 10 : 0,
          by_module: byModule,
          by_consumer: byConsumer,
          by_memory_type: byMemoryType,
          most_consumed: memories.filter(m => m.consumption_count > 0).sort((a, b) => (b.consumption_count || 0) - (a.consumption_count || 0)).slice(0, 5).map(m => ({ id: m.id, title: m.title, count: m.consumption_count, consumed_by: m.last_consumed_by })),
        },
        operation: 'get_consumption_stats'
      });
    }

    // --- BUILD KNOWLEDGE GRAPH ---
    if (operation === 'build_knowledge_graph') {
      const [semanticIndex, relationships, memories] = await Promise.all([
        fetchEntitySample('SemanticIndex', 200),
        fetchEntitySample('RelationshipLink', 200),
        fetchMemories(null, 200),
      ]);

      const nodes = semanticIndex.map(s => ({
        id: s.id,
        entity_id: s.entity_id,
        entity_type: s.entity_type,
        name: s.entity_name,
        keywords: s.keywords || [],
        memory_type: s.memory_type,
      }));

      const edges = relationships
        .filter(r => r.status === 'active')
        .map(r => ({
          id: r.id,
          source: r.source_entity_id,
          source_name: r.source_entity_name,
          target: r.target_entity_id,
          target_name: r.target_entity_name,
          type: r.relationship_type,
          strength: r.strength || 50,
        }));

      // Find most connected nodes
      const connectionCount = {};
      for (const e of edges) {
        connectionCount[e.source] = (connectionCount[e.source] || 0) + 1;
        connectionCount[e.target] = (connectionCount[e.target] || 0) + 1;
      }
      const topNodes = Object.entries(connectionCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([id, count]) => ({ id, connections: count, name: nodes.find(n => n.entity_id === id)?.name || id }));

      // Entity type distribution
      const typeDistribution = {};
      for (const n of nodes) {
        typeDistribution[n.entity_type] = (typeDistribution[n.entity_type] || 0) + 1;
      }

      return Response.json({
        graph: {
          nodes,
          edges,
          stats: {
            total_nodes: nodes.length,
            total_edges: edges.length,
            total_memories_indexed: memories.length,
            type_distribution: typeDistribution,
            top_connected_nodes: topNodes,
            avg_connections: nodes.length > 0 ? Math.round((edges.length * 2 / nodes.length) * 10) / 10 : 0,
          },
        },
        operation: 'build_knowledge_graph'
      });
    }

    return Response.json({ error: 'Unknown operation: ' + operation }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});