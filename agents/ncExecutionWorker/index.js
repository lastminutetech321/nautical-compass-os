import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function loadFileTree(basePath) {
  const tree = {};
  
  function scan(dir, prefix = '') {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      const fullPath = path.join(dir, entry.name);
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
      
      if (entry.isDirectory()) {
        scan(fullPath, relativePath);
      } else {
        tree[relativePath] = true;
      }
    }
  }
  
  scan(basePath);
  return tree;
}

function validateFilePaths(changes, fileTree) {
  const errors = [];
  for (const change of changes) {
    const isCreate = change.operation === 'create' || change.is_new;
    if (!isCreate && !fileTree[change.path]) {
      errors.push(`File does not exist: ${change.path}`);
    }
  }
  return errors;
}

export async function executeTask(task, context) {
  const projectRoot = path.resolve(__dirname, '../../..');
  const fileTree = loadFileTree(projectRoot);
  
  const systemPrompt = `You are the NC Execution Worker generating a minimal source patch.

RULES:
(1) Return ONLY a raw JSON object — no markdown fences, no backticks, no prose. Start with { and end with }.
(2) MINIMAL CHANGES: edit only the lines that must change. For large files, include the COMPLETE file but make surgical edits to only the relevant sections.
(3) Keep new_content complete and valid — no ellipsis, no "// rest unchanged".
(4) No new frameworks or dependencies.
(5) Preserve all existing functionality.
(6) CRITICAL: Only edit files that exist. Current file tree: ${JSON.stringify(Object.keys(fileTree).slice(0, 200))}...
(7) Mark new files explicitly with "operation": "create"

Schema: {"changes":[{"path":"...","operation":"edit|create","new_content":"..."}],"summary":"one line","why":"one line","tests_to_run":["npm run build"],"lessons":["..."],"future":["..."]}. The JSON must be valid and complete.`;

  const userPrompt = `TASK: ${task.title}\n\n${task.description || ''}`;

  const response = await anthropic.messages.create({
    model: 'claude-3-7-sonnet-20250219',
    max_tokens: 200000,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }]
  });

  const rawText = response.content[0].text.trim();
  let patch;
  
  try {
    patch = JSON.parse(rawText);
  } catch (e) {
    throw new Error(`Worker returned invalid JSON: ${e.message}`);
  }

  const validationErrors = validateFilePaths(patch.changes || [], fileTree);
  if (validationErrors.length > 0) {
    throw new Error(`File path validation failed:\n${validationErrors.join('\n')}`);
  }

  for (const change of patch.changes) {
    const targetPath = path.join(projectRoot, change.path);
    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(targetPath, change.new_content, 'utf8');
  }

  return {
    status: 'waiting_review',
    verification_status: 'not_executed',
    files_changed: patch.changes.map(c => c.path),
    output_data: patch,
    result_summary: patch.summary
  };
}
