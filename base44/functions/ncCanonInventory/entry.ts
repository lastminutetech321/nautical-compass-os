import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const LIBRARIES = ['canon', 'governance', 'constitution', 'prompt_library', 'engineering', 'legal_research', 'development_memory'];

const LIBRARY_LABELS = {
  canon: 'Canon',
  governance: 'Governance',
  constitution: 'Constitution',
  prompt_library: 'Prompt Library',
  engineering: 'Engineering Documentation',
  legal_research: 'Legal Research',
  development_memory: 'Development Memory'
};

// Classification rules — priority order (most specific first)
const CLASSIFICATION_RULES = [
  { library: 'constitution', pathPatterns: ['constitution', 'amendment', 'bill-of-rights', 'principles', 'charter'], filePatterns: ['constitution', 'amendment'] },
  { library: 'governance', pathPatterns: ['governance', '/adr/', 'adr-', 'decision-record', 'bylaw', 'policy'], filePatterns: ['governance', 'adr', 'decision'] },
  { library: 'canon', pathPatterns: ['canon', 'doctrine', 'playbook', 'handbook'], filePatterns: ['canon', 'doctrine'] },
  { library: 'prompt_library', pathPatterns: ['prompt', 'prompt-library'], filePatterns: ['prompt'] },
  { library: 'legal_research', pathPatterns: ['legal', 'case-law', 'statute', 'regulation', 'juris', 'authority', 'compliance', 'research'], filePatterns: ['legal', 'statute', 'juris'] },
  { library: 'development_memory', pathPatterns: ['memory', 'journal', 'lesson', 'learning', 'reflection', 'retrospective', 'dev-memory'], filePatterns: ['memory', 'journal', 'lesson', 'reflection'] },
  { library: 'engineering', pathPatterns: ['engineering', 'architecture', 'technical', 'api', 'spec', 'docs/'], filePatterns: ['readme', 'architecture', 'spec'] },
];

const TARGET_ENTITY = {
  canon: 'CanonEntry',
  governance: 'GovernancePolicy',
  constitution: 'NCConstitution',
  prompt_library: 'PromptLibrary',
  engineering: 'EngineeringJournal',
  legal_research: 'ResearchMemo',
  development_memory: 'MemoryRecord'
};

const ENTITY_MAP = {
  canon: ['CanonEntry'],
  governance: ['GovernancePolicy', 'ADR'],
  constitution: ['NCConstitution'],
  prompt_library: ['PromptLibrary'],
  engineering: ['EngineeringJournal', 'EngineeringLesson'],
  legal_research: ['LegalIssue', 'ResearchMemo'],
  development_memory: ['NCOSMemory', 'MemoryRecord', 'MemoryTimelineEntry']
};

function classifyFile(path) {
  const lowerPath = path.toLowerCase();
  const fileName = lowerPath.split('/').pop() || '';
  for (const rule of CLASSIFICATION_RULES) {
    for (const p of rule.pathPatterns) {
      if (lowerPath.includes(p)) return rule.library;
    }
    for (const f of rule.filePatterns) {
      if (fileName.includes(f)) return rule.library;
    }
  }
  return null;
}

function normalizeTitle(path) {
  const fileName = (path.split('/').pop() || path).replace(/\.(md|txt|markdown|json|yaml|yml)$/i, '');
  return fileName.toLowerCase().replace(/[-_]+/g, ' ').trim();
}

function contentFingerprint(content) {
  const normalized = (content || '').replace(/\s+/g, ' ').trim().slice(0, 300);
  return `${normalized.length}:${normalized.slice(0, 200)}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let body = {};
    try { body = await req.json(); } catch {}
    const operation = body.operation || 'build_inventory';

    if (operation !== 'build_inventory') {
      return Response.json({ error: 'Unknown operation. Supported: build_inventory' }, { status: 400 });
    }

    // 1. Get GitHub token
    const githubConn = await base44.asServiceRole.connectors.getConnection('github');
    if (!githubConn || !githubConn.accessToken) {
      return Response.json({
        status: 'error',
        message: 'GitHub connector not authorized. Founder must connect GitHub first.',
        proposed_inventory: null
      });
    }
    const token = githubConn.accessToken;
    const headers = { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github+json', 'User-Agent': 'ncos-canon-inventory' };

    // 2. List ALL repos (paginate)
    const allRepos = [];
    let page = 1;
    const MAX_REPOS = 30;
    while (allRepos.length < MAX_REPOS) {
      const resp = await fetch(`https://api.github.com/user/repos?per_page=100&page=${page}&sort=updated&affiliation=owner,organization_member`, { headers });
      if (!resp.ok) break;
      const batch = await resp.json();
      if (!batch.length) break;
      allRepos.push(...batch);
      if (batch.length < 100) break;
      page++;
      if (page > 5) break;
    }
    const repos = allRepos.slice(0, MAX_REPOS);

    // 3. For each repo, get full file tree and classify
    const inventory = {};
    for (const l of LIBRARIES) inventory[l] = [];
    const allClassifiedFiles = [];
    const MAX_FILES_TO_FETCH = 35;
    let totalBlobsScanned = 0;

    for (const repo of repos) {
      const fullName = repo.full_name;
      const defaultBranch = repo.default_branch || 'main';
      const treeResp = await fetch(`https://api.github.com/repos/${fullName}/git/trees/${defaultBranch}?recursive=1`, { headers });
      if (!treeResp.ok) continue;
      const treeData = await treeResp.json();
      if (!treeData.tree) continue;

      for (const item of treeData.tree) {
        if (item.type !== 'blob') continue;
        totalBlobsScanned++;
        if (!/\.(md|txt|markdown|json|yaml|yml)$/i.test(item.path)) continue;
        if (item.size > 500000) continue;
        const library = classifyFile(item.path);
        if (!library) continue;
        const fileRecord = {
          repo: fullName,
          branch: defaultBranch,
          path: item.path,
          sha: item.sha,
          size: item.size,
          title: normalizeTitle(item.path),
          library,
          library_label: LIBRARY_LABELS[library],
          source_url: `https://github.com/${fullName}/blob/${defaultBranch}/${item.path}`,
          raw_url: `https://raw.githubusercontent.com/${fullName}/${defaultBranch}/${item.path}`
        };
        allClassifiedFiles.push(fileRecord);
        inventory[library].push(fileRecord);
      }
    }

    // 4. Fetch content for top files (sorted by library priority then smallest size)
    const libraryOrder = { constitution: 0, governance: 1, canon: 2, prompt_library: 3, legal_research: 4, development_memory: 5, engineering: 6 };
    const sortedFiles = [...allClassifiedFiles].sort((a, b) => (libraryOrder[a.library] - libraryOrder[b.library]) || (a.size - b.size));
    const filesToFetch = sortedFiles.slice(0, MAX_FILES_TO_FETCH);

    for (const file of filesToFetch) {
      try {
        const contentResp = await fetch(file.raw_url, { headers: { 'User-Agent': 'ncos-canon-inventory', 'Authorization': `Bearer ${token}` } });
        if (contentResp.ok) {
          const content = await contentResp.text();
          file.content_preview = content.slice(0, 2000);
          file.content_fingerprint = contentFingerprint(content);
          file.content_length = content.length;
          file.word_count = content.split(/\s+/).filter(w => w).length;
          const h1Match = content.match(/^#\s+(.+)$/m);
          if (h1Match) file.detected_title = h1Match[1].trim();
        } else {
          file.content_fetch_error = `HTTP ${contentResp.status}`;
        }
      } catch (e) {
        file.content_fetch_error = e.message.slice(0, 100);
      }
    }

    // 5. Query DB entities for duplicate/conflict detection
    const dbIndex = {};
    for (const l of LIBRARIES) dbIndex[l] = [];
    const dbTitleMap = {};
    for (const l of LIBRARIES) dbTitleMap[l] = {};

    for (const [library, entities] of Object.entries(ENTITY_MAP)) {
      for (const entityName of entities) {
        try {
          const records = await base44.asServiceRole.entities[entityName].list('-updated_date', 100);
          for (const r of records) {
            const title = r.title || r.name || r.subject || r.entry_key || r.canon_key || r.memory_key || r.adr_key || r.id;
            const record = {
              entity: entityName,
              id: r.id,
              title,
              normalized_title: normalizeTitle(title || ''),
              updated_date: r.updated_date,
              source_url: r.source_url || r.source || r.canon_url || r.url || ''
            };
            dbIndex[library].push(record);
            if (record.normalized_title) {
              if (!dbTitleMap[library][record.normalized_title]) dbTitleMap[library][record.normalized_title] = [];
              dbTitleMap[library][record.normalized_title].push(record);
            }
          }
        } catch {}
      }
    }

    // 6. Detect duplicates + conflicts
    const exactDuplicates = [];
    const titleConflicts = [];
    const newImports = [];
    const contentDuplicateCandidates = [];

    // Build GitHub-internal title map for intra-GitHub duplicate detection
    const githubTitleMap = {};
    for (const file of allClassifiedFiles) {
      const normTitle = normalizeTitle(file.detected_title || file.title);
      const key = `${file.library}:${normTitle}`;
      if (!githubTitleMap[key]) githubTitleMap[key] = [];
      githubTitleMap[key].push(file);
    }
    const intraGithubDuplicates = [];
    for (const [key, files] of Object.entries(githubTitleMap)) {
      if (files.length > 1) {
        intraGithubDuplicates.push({ key, files: files.map(f => ({ repo: f.repo, path: f.path, source_url: f.source_url })), reason: 'same title found in multiple GitHub locations' });
      }
    }

    // Content fingerprint map (within GitHub) for content-level dupes
    const githubFingerprintMap = {};
    for (const file of allClassifiedFiles) {
      if (!file.content_fingerprint) continue;
      if (!githubFingerprintMap[file.content_fingerprint]) githubFingerprintMap[file.content_fingerprint] = [];
      githubFingerprintMap[file.content_fingerprint].push(file);
    }
    const intraGithubContentDuplicates = [];
    for (const [fp, files] of Object.entries(githubFingerprintMap)) {
      if (files.length > 1) {
        intraGithubContentDuplicates.push({ fingerprint: fp.slice(0, 40), files: files.map(f => ({ repo: f.repo, path: f.path, library: f.library })), reason: 'identical content in multiple locations' });
      }
    }

    for (const file of allClassifiedFiles) {
      const normTitle = normalizeTitle(file.detected_title || file.title);
      const dbMatches = dbTitleMap[file.library]?.[normTitle] || [];

      if (dbMatches.length > 0) {
        const sourceMatch = dbMatches.find(db => db.source_url && file.source_url && db.source_url === file.source_url);
        if (sourceMatch) {
          exactDuplicates.push({ file, db_match: sourceMatch, reason: 'title + source_url match' });
        } else {
          titleConflicts.push({
            file: {
              library: file.library,
              title: file.detected_title || file.title,
              source_url: file.source_url,
              repo: file.repo,
              path: file.path,
              sha: file.sha,
              content_preview: (file.content_preview || '').slice(0, 300),
              content_fingerprint: file.content_fingerprint
            },
            db_matches: dbMatches,
            reason: 'same normalized title, different source — Founder must resolve',
            resolution_options: ['keep_db_version', 'overwrite_with_github', 'merge_both', 'rename_github_import']
          });
        }
      } else {
        newImports.push({
          library: file.library,
          library_label: file.library_label,
          title: file.detected_title || file.title,
          source_url: file.source_url,
          repo: file.repo,
          path: file.path,
          sha: file.sha,
          content_preview: (file.content_preview || '').slice(0, 200),
          content_length: file.content_length || 0,
          has_content: !!file.content_preview,
          recommended_action: 'import_as_new',
          target_entity: TARGET_ENTITY[file.library],
          verification_status: 'pending_founder_approval'
        });
      }
    }

    // 7. Build merge plan
    const mergePlan = {
      new_imports: newImports,
      duplicates_to_skip: exactDuplicates.map(x => ({
        library: x.file.library,
        title: x.file.detected_title || x.file.title,
        source_url: x.file.source_url,
        db_match: x.db_match,
        reason: x.reason
      })),
      conflicts_needing_resolution: titleConflicts,
      intra_github_title_duplicates: intraGithubDuplicates,
      intra_github_content_duplicates: intraGithubContentDuplicates
    };

    // 8. Summary
    const inventoryCounts = {};
    for (const l of LIBRARIES) inventoryCounts[l] = inventory[l].length;
    const dbCounts = {};
    for (const l of LIBRARIES) dbCounts[l] = dbIndex[l].length;

    const summary = {
      repos_scanned: repos.length,
      repos_list: repos.map(r => r.full_name),
      total_blobs_scanned: totalBlobsScanned,
      files_classified: allClassifiedFiles.length,
      files_with_content_fetched: allClassifiedFiles.filter(f => f.content_preview).length,
      inventory_counts: inventoryCounts,
      db_records_indexed: dbCounts,
      db_total_indexed: Object.values(dbCounts).reduce((a, b) => a + b, 0),
      new_imports: mergePlan.new_imports.length,
      duplicates_to_skip: mergePlan.duplicates_to_skip.length,
      conflicts_needing_resolution: mergePlan.conflicts_needing_resolution.length,
      intra_github_title_duplicates: intraGithubDuplicates.length,
      intra_github_content_duplicates: intraGithubContentDuplicates.length,
      total_founder_decisions: mergePlan.new_imports.length + mergePlan.conflicts_needing_resolution.length
    };

    return Response.json({
      status: 'inventory_complete',
      operation: 'build_inventory',
      summary,
      inventory: Object.fromEntries(LIBRARIES.map(l => [l, inventory[l].map(f => ({
        title: f.detected_title || f.title,
        library: f.library,
        library_label: f.library_label,
        repo: f.repo,
        path: f.path,
        sha: f.sha,
        size: f.size,
        source_url: f.source_url,
        has_content: !!f.content_preview,
        content_length: f.content_length || 0,
        word_count: f.word_count || 0,
        content_preview: f.content_preview ? f.content_preview.slice(0, 300) : null
      }))])),
      database_index: dbIndex,
      duplicate_detection: {
        exact_duplicates: exactDuplicates.length,
        intra_github_title_duplicates: intraGithubDuplicates.length,
        intra_github_content_duplicates: intraGithubContentDuplicates.length
      },
      conflict_detection: {
        title_conflicts: titleConflicts.length
      },
      merge_plan: mergePlan,
      rules_enforced: [
        'GitHub = source of truth — inventory only, no writes',
        'No records created, overwritten, or verified',
        'All imports require Founder approval before any write',
        'Duplicates detected by normalized title + source_url + content fingerprint',
        'Conflicts flagged for Founder resolution with resolution options',
        'Intra-GitHub duplicates detected (same title or content, multiple locations)',
        'Content fingerprints captured for post-import verification',
        'Target entity mapped per library classification'
      ],
      founder_action_required: summary.total_founder_decisions > 0,
      message: `Scanned ${repos.length} repos (${totalBlobsScanned} files). ${allClassifiedFiles.length} classified across 7 libraries. ${mergePlan.new_imports.length} new imports, ${mergePlan.duplicates_to_skip.length} duplicates, ${mergePlan.conflicts_needing_resolution.length} conflicts. Nothing written — awaiting Founder approval.`
    });
  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack?.split('\n').slice(0, 5) }, { status: 500 });
  }
});