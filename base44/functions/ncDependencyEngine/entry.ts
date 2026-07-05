import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { operation, params } = body;

    const fetchSample = async (entityName, limit = 50) => {
      try { return await base44.asServiceRole.entities[entityName].list('-created_date', limit); }
      catch { return []; }
    };

    const fetchFiltered = async (entityName, query, limit = 50) => {
      try { return await base44.asServiceRole.entities[entityName].filter(query, '-created_date', limit); }
      catch { return []; }
    };

    // --- SCAN: Auto-detect all 11 types of missing dependencies ---
    if (operation === 'scan') {
      const [builds, issues, canonGaps, pendingApprovals, roadmap, improvements, agents, releases] = await Promise.all([
        fetchSample('BuildRegistry', 50),
        fetchFiltered('DiagnosticIssue', { status: 'open' }, 50),
        fetchFiltered('CanonEntry', { is_canon_gap: true }, 50),
        fetchFiltered('ApprovalGate', { status: 'pending' }, 30),
        fetchFiltered('RoadmapItem', { status: 'planned' }, 30),
        fetchFiltered('ImprovementItem', { status: 'queued' }, 30),
        fetchSample('AgentProfile', 30),
        fetchFiltered('Release', { status: 'planned' }, 20),
      ]);

      const platformData = {
        builds: builds.map(b => ({
          id: b.id, name: b.name, rail: b.rail, is_blocked: b.is_blocked, blocked_by: b.blocked_by,
          deployment_status: b.deployment_status, testing_status: b.testing_status, api_status: b.api_status,
          database_status: b.database_status, ai_status: b.ai_status, production_status: b.production_status,
          owner: b.owner, estimated_finish_date: b.estimated_finish_date, estimated_hours: b.estimated_hours,
          architecture_pct: b.architecture_pct, backend_pct: b.backend_pct, testing_pct: b.testing_pct,
          documentation_pct: b.documentation_pct, dependencies: b.dependencies, required_tasks: b.required_tasks,
          completed_tasks: b.completed_tasks, priority: b.priority,
        })),
        open_issues: issues.map(i => ({ id: i.id, title: i.title, category: i.category, severity: i.severity, affected_modules: i.affected_modules, description: i.description })),
        canon_gaps: canonGaps.map(c => ({ id: c.id, title: c.title, category: c.category, gap_notes: c.gap_notes })),
        pending_approvals: pendingApprovals.map(a => ({ id: a.id, title: a.title, approval_type: a.approval_type, severity: a.severity })),
        planned_roadmap: roadmap.map(r => ({ id: r.id, title: r.title, category: r.category, priority: r.priority, effort_estimate: r.effort_estimate })),
        queued_improvements: improvements.map(i => ({ id: i.id, title: i.title, risk_level: i.risk_level, business_impact: i.business_impact, estimated_revenue_impact: i.estimated_revenue_impact })),
        agents: agents.map(a => ({ id: a.id, name: a.name, status: a.status, agent_type: a.agent_type })),
        planned_releases: releases.map(r => ({ id: r.id, version: r.version, name: r.name, status: r.status, risk_level: r.risk_level })),
      };

      const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `You are the NCOS Dependency Engine. Analyze this platform data and detect ALL missing dependencies across 11 categories.

Platform data:
${JSON.stringify(platformData).slice(0, 12000)}

Detect missing dependencies in these 11 categories:
1. requirement — missing product/feature requirements
2. entity — missing database entities or data structures
3. api — missing or broken API endpoints
4. documentation — missing docs
5. test — missing test coverage
6. canon — missing legal canon/authority (from canon_gaps)
7. permission — missing agent/user permissions
8. approval — missing founder/legal/financial approvals (from pending_approvals)
9. infrastructure — missing infrastructure (DB, hosting, etc.)
10. integration — missing third-party integrations
11. workflow — missing automated workflows

For each detected dependency, provide:
- dependency_type (one of the 11)
- title (short name)
- what_is_missing (specific description)
- why_blocked (why this blocks progress)
- source_name (which build/feature/module it blocks, or "platform-wide")
- owner (who should resolve it, derive from build owner or "Unassigned")
- estimated_hours (rough estimate)
- business_impact (low/medium/high/critical)
- financial_impact (dollar estimate if known, 0 if unknown)
- resolution_steps (2-4 actionable steps)
- priority_score (0-100 based on how many things it blocks + severity)

Return up to 25 most critical missing dependencies.`,
        response_json_schema: {
          type: "object",
          properties: {
            dependencies: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  dependency_type: { type: "string" },
                  title: { type: "string" },
                  what_is_missing: { type: "string" },
                  why_blocked: { type: "string" },
                  source_name: { type: "string" },
                  owner: { type: "string" },
                  estimated_hours: { type: "number" },
                  business_impact: { type: "string" },
                  financial_impact: { type: "number" },
                  resolution_steps: { type: "array", items: { type: "string" } },
                  priority_score: { type: "number" },
                }
              }
            },
            scan_summary: { type: "string" },
          }
        }
      });

      // Persist detected dependencies (skip duplicates by title)
      const existing = await fetchSample('Dependency', 100);
      const existingTitles = new Set(existing.map(d => d.title));
      const created = [];

      if (result.dependencies) {
        for (const dep of result.dependencies.slice(0, 25)) {
          if (existingTitles.has(dep.title)) continue;
          try {
            // Find matching build for source
            const matchingBuild = builds.find(b => b.name === dep.source_name);
            const blocksBuildIds = matchingBuild ? [matchingBuild.id] : [];
            const blocksBuildNames = matchingBuild ? [matchingBuild.name] : (dep.source_name !== 'platform-wide' ? [dep.source_name] : []);

            const record = await base44.asServiceRole.entities.Dependency.create({
              dependency_type: dep.dependency_type || 'requirement',
              title: dep.title,
              description: dep.what_is_missing,
              what_is_missing: dep.what_is_missing,
              why_blocked: dep.why_blocked,
              source_name: dep.source_name,
              source_entity_type: matchingBuild ? 'BuildRegistry' : '',
              source_entity_id: matchingBuild?.id || '',
              owner: dep.owner || 'Unassigned',
              estimated_hours: dep.estimated_hours || 0,
              business_impact: dep.business_impact || 'medium',
              financial_impact: dep.financial_impact || 0,
              blocks_build_ids: blocksBuildIds,
              blocks_build_names: blocksBuildNames,
              priority_score: dep.priority_score || 50,
              unblock_count: blocksBuildIds.length,
              status: 'missing',
              resolution_steps: dep.resolution_steps || [],
              detected_by: 'NC Dependency Engine',
              detected_at: new Date().toISOString(),
              tags: [dep.dependency_type],
            });
            created.push(record);
          } catch (e) { /* skip */ }
        }
      }

      return Response.json({
        scan_summary: result.scan_summary,
        detected_count: result.dependencies?.length || 0,
        created_count: created.length,
        created,
        operation: 'scan',
      });
    }

    // --- BLOCKED BUILDS: Every blocked build with WHY/WHAT/WHO/ETA/impact ---
    if (operation === 'blocked_builds') {
      const blockedBuilds = await fetchFiltered('BuildRegistry', { is_blocked: true }, 50);
      const allDeps = await fetchFiltered('Dependency', { status: { $ne: 'resolved' } }, 200);

      const explained = blockedBuilds.map(build => {
        const buildDeps = allDeps.filter(d =>
          (d.blocks_build_ids || []).includes(build.id) ||
          (d.blocks_build_names || []).includes(build.name) ||
          (build.blocked_by || []).some(b => d.title.includes(b) || b.includes(d.title))
        );

        return {
          id: build.id,
          name: build.name,
          rail: build.rail,
          owner: build.owner || 'Unassigned',
          priority: build.priority,
          why: build.blocked_by?.length ? build.blocked_by.join('; ') : 'Unspecified blocker',
          what_is_missing: buildDeps.map(d => `${d.dependency_type}: ${d.what_is_missing}`),
          missing_count: buildDeps.length,
          dependencies: buildDeps.map(d => ({
            id: d.id, type: d.dependency_type, title: d.title, what_is_missing: d.what_is_missing,
            owner: d.owner, status: d.status, priority_score: d.priority_score,
            estimated_hours: d.estimated_hours, business_impact: d.business_impact,
            financial_impact: d.financial_impact, resolution_steps: d.resolution_steps,
          })),
          estimated_completion: build.estimated_finish_date,
          estimated_hours_remaining: build.estimated_hours,
          business_impact: buildDeps.some(d => d.business_impact === 'critical') ? 'critical'
            : buildDeps.some(d => d.business_impact === 'high') ? 'high'
            : build.priority,
          financial_impact: buildDeps.reduce((sum, d) => sum + (d.financial_impact || 0), 0),
          completion: {
            architecture: build.architecture_pct, backend: build.backend_pct, testing: build.testing_pct,
            documentation: build.documentation_pct, deployment: build.deployment_pct,
          },
        };
      });

      return Response.json({ blocked_builds: explained, total: explained.length, operation: 'blocked_builds' });
    }

    // --- REPRIORITIZE: Auto-reprioritize based on dependency chains ---
    if (operation === 'reprioritize') {
      const [deps, builds] = await Promise.all([
        fetchFiltered('Dependency', { status: { $ne: 'resolved' } }, 200),
        fetchSample('BuildRegistry', 50),
      ]);

      // Calculate unblock_count: how many builds each dependency blocks
      const buildLookup = {};
      builds.forEach(b => { buildLookup[b.id] = b; buildLookup[b.name] = b; });

      const scored = deps.map(dep => {
        const unblockCount = (dep.blocks_build_ids || []).length + (dep.blocks_build_names || []).filter(n => buildLookup[n]).length;
        const financialWeight = (dep.financial_impact || 0) / 1000;
        const impactWeight = dep.business_impact === 'critical' ? 40 : dep.business_impact === 'high' ? 25 : dep.business_impact === 'medium' ? 10 : 5;
        const reprioritizedScore = Math.min(100, Math.round((unblockCount * 15) + (dep.priority_score || 50) * 0.4 + impactWeight + financialWeight));

        return {
          id: dep.id,
          title: dep.title,
          dependency_type: dep.dependency_type,
          what_is_missing: dep.what_is_missing,
          owner: dep.owner,
          status: dep.status,
          unblock_count: unblockCount,
          priority_score: dep.priority_score,
          reprioritized_score: reprioritizedScore,
          estimated_hours: dep.estimated_hours,
          business_impact: dep.business_impact,
          financial_impact: dep.financial_impact,
          blocks_build_names: dep.blocks_build_names,
          resolution_steps: dep.resolution_steps,
        };
      });

      // Sort by reprioritized score descending — work on highest-impact first
      scored.sort((a, b) => b.reprioritized_score - a.reprioritized_score);

      // Also identify builds that would be unblocked
      const unblockableBuilds = builds.filter(b => b.is_blocked).map(b => {
        const depsForBuild = scored.filter(d => (d.blocks_build_names || []).includes(b.name));
        return {
          name: b.name, owner: b.owner, priority: b.priority,
          blocking_deps: depsForBuild.length,
          top_blocker: depsForBuild[0]?.title || '—',
          would_unblock_on: depsForBuild[0]?.title || '—',
        };
      }).sort((a, b) => b.blocking_deps - a.blocking_deps);

      // Update priority scores in DB
      for (const s of scored.slice(0, 20)) {
        try {
          await base44.asServiceRole.entities.Dependency.update(s.id, {
            unblock_count: s.unblock_count,
            priority_score: s.reprioritized_score,
          });
        } catch (e) { /* skip */ }
      }

      return Response.json({
        reprioritized: scored.slice(0, 20),
        unblockable_builds: unblockableBuilds,
        total_deps: scored.length,
        total_blocked_builds: unblockableBuilds.length,
        recommended_first: scored[0] || null,
        operation: 'reprioritize',
      });
    }

    // --- DEPENDENCY CHAIN: Trace full chain for a build ---
    if (operation === 'dependency_chain') {
      const { build_id } = params;
      if (!build_id) return Response.json({ error: 'build_id required' }, { status: 400 });

      let build = null;
      try { build = await base44.asServiceRole.entities.BuildRegistry.get(build_id); }
      catch { return Response.json({ error: 'Build not found' }, { status: 404 }); }

      const directDeps = await fetchFiltered('Dependency', { blocks_build_ids: build_id, status: { $ne: 'resolved' } }, 50);

      // Trace 2 levels deep: what do the direct deps themselves depend on?
      const chain = [];
      for (const dep of directDeps) {
        const subDeps = await fetchFiltered('Dependency', { blocks_build_ids: dep.id, status: { $ne: 'resolved' } }, 10);
        chain.push({
          level: 1,
          dependency: dep,
          sub_dependencies: subDeps.map(sd => ({ level: 2, dependency: sd })),
        });
      }

      return Response.json({
        build: { id: build.id, name: build.name, is_blocked: build.is_blocked, blocked_by: build.blocked_by },
        chain,
        total_direct: directDeps.length,
        total_transitive: chain.reduce((sum, c) => sum + 1 + c.sub_dependencies.length, 0),
        operation: 'dependency_chain',
      });
    }

    // --- RESOLVE: Mark a dependency as resolved ---
    if (operation === 'resolve') {
      const { dependency_id, resolved_by } = params;
      if (!dependency_id) return Response.json({ error: 'dependency_id required' }, { status: 400 });

      const updated = await base44.asServiceRole.entities.Dependency.update(dependency_id, {
        status: 'resolved',
        resolved_at: new Date().toISOString(),
      });

      // Check if any builds it blocked can now be unblocked
      const unblocked = [];
      for (const buildId of updated.blocks_build_ids || []) {
        const remainingDeps = await fetchFiltered('Dependency', { blocks_build_ids: buildId, status: { $ne: 'resolved' } }, 50);
        if (remainingDeps.length === 0) {
          try {
            await base44.asServiceRole.entities.BuildRegistry.update(buildId, { is_blocked: false });
            unblocked.push(buildId);
          } catch (e) { /* skip */ }
        }
      }

      return Response.json({ dependency: updated, unblocked_builds: unblocked, operation: 'resolve' });
    }

    // --- OVERVIEW ---
    if (operation === 'overview') {
      const [deps, blockedBuilds] = await Promise.all([
        fetchSample('Dependency', 200),
        fetchFiltered('BuildRegistry', { is_blocked: true }, 50),
      ]);

      const byType = {};
      const byStatus = {};
      const byImpact = { low: 0, medium: 0, high: 0, critical: 0 };
      let totalFinancial = 0;
      let totalHours = 0;

      for (const d of deps) {
        byType[d.dependency_type] = (byType[d.dependency_type] || 0) + 1;
        byStatus[d.status] = (byStatus[d.status] || 0) + 1;
        if (byImpact[d.business_impact] !== undefined) byImpact[d.business_impact]++;
        totalFinancial += d.financial_impact || 0;
        totalHours += d.estimated_hours || 0;
      }

      return Response.json({
        overview: {
          total_dependencies: deps.length,
          by_type: byType,
          by_status: byStatus,
          by_impact: byImpact,
          total_financial_impact: totalFinancial,
          total_estimated_hours: totalHours,
          blocked_builds: blockedBuilds.length,
          critical_count: byImpact.critical,
          resolved_count: byStatus.resolved || 0,
          missing_count: byStatus.missing || 0,
        },
        operation: 'overview',
      });
    }

    return Response.json({ error: 'Unknown operation: ' + operation }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});