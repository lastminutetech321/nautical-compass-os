import fs from 'fs';

const registry = JSON.parse(fs.readFileSync('nc_modules/registry.json', 'utf-8'));

for (const [name, path] of Object.entries(registry.schemas)) {
  if (!fs.existsSync(path)) {
    throw new Error(`Schema ${name} not found at ${path}`);
  }
  const schema = JSON.parse(fs.readFileSync(path, 'utf-8'));
  if (!schema.$schema || !schema.type) {
    throw new Error(`Invalid JSON Schema: ${name}`);
  }
}

const graph = {};
for (const [modName, mod] of Object.entries(registry.modules)) {
  graph[modName] = mod.depends_on.map(d => d.module);
}

function hasCycle(graph) {
  const visited = new Set();
  const recStack = new Set();
  function dfs(node) {
    visited.add(node);
    recStack.add(node);
    for (const neighbor of graph[node] || []) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) return true;
      } else if (recStack.has(neighbor)) {
        return true;
      }
    }
    recStack.delete(node);
    return false;
  }
  for (const node of Object.keys(graph)) {
    if (!visited.has(node) && dfs(node)) return true;
  }
  return false;
}

if (hasCycle(graph)) {
  throw new Error('Circular dependency detected in module registry');
}

console.log('✅ Module registry validation passed');
console.log(`   Modules: ${Object.keys(registry.modules).length}`);
console.log(`   Schemas: ${Object.keys(registry.schemas).length}`);
