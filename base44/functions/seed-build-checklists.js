/**
 * Seed standard task checklists for 9 core builds
 * Auto-repair function for Build Registry module
 */

import { createClient } from '@base44/sdk';

const STANDARD_CHECKLISTS = {
  'frontend-production': [
    { task: 'Set VITE_BASE44_APP_ID env var', required: true, completed: false },
    { task: 'Configure VITE_BASE44_APP_BASE_URL', required: true, completed: false },
    { task: 'Run npm run build locally', required: true, completed: false },
    { task: 'Verify zero build errors', required: true, completed: false },
    { task: 'Register domain in Base44 allowed origins', required: true, completed: false },
    { task: 'Deploy to DigitalOcean App Platform', required: true, completed: false },
    { task: 'Verify login flow works', required: true, completed: false },
    { task: 'Check entity loads and no CORS errors', required: true, completed: false },
    { task: 'Point custom domain DNS', required: false, completed: false },
    { task: 'Update SSL certificate', required: false, completed: false }
  ],
  'backend-base44': [
    { task: 'Sync all entities to Base44', required: true, completed: false },
    { task: 'Deploy all serverless functions', required: true, completed: false },
    { task: 'Activate workflows', required: true, completed: false },
    { task: 'Configure auth providers', required: true, completed: false },
    { task: 'Test GitHub connector scopes', required: true, completed: false },
    { task: 'Verify email auth flow', required: true, completed: false },
    { task: 'Test OAuth (Google)', required: true, completed: false },
    { task: 'Run health check on all functions', required: true, completed: false }
  ],
  'canon-inventory': [
    { task: 'Initialize Canon Inventory entity', required: true, completed: false },
    { task: 'Connect GitHub repositories', required: true, completed: false },
    { task: 'Classify existing canon files', required: true, completed: false },
    { task: 'Verify 2-way sync operational', required: true, completed: false },
    { task: 'Test auto-classification workflow', required: true, completed: false },
    { task: 'Migrate Termius/local canon files', required: false, completed: false },
    { task: 'Import legal research docs', required: false, completed: false }
  ],
  'payment-fabric': [
    { task: 'Configure Stripe sandbox keys', required: true, completed: false },
    { task: 'Test payment flow in staging', required: true, completed: false },
    { task: 'Verify webhook endpoints', required: true, completed: false },
    { task: 'Set up production Stripe account', required: true, completed: false },
    { task: 'Configure production secrets in Base44', required: true, completed: false },
    { task: 'Test live payment processing', required: true, completed: false },
    { task: 'Verify refund flow', required: true, completed: false },
    { task: 'Enable PCI compliance monitoring', required: true, completed: false }
  ],
  'auth-system': [
    { task: 'Configure email auth provider', required: true, completed: false },
    { task: 'Set up Google OAuth credentials', required: true, completed: false },
    { task: 'Register all auth redirect URLs', required: true, completed: false },
    { task: 'Test password reset flow', required: true, completed: false },
    { task: 'Verify session management', required: true, completed: false },
    { task: 'Test multi-device login', required: true, completed: false },
    { task: 'Enable 2FA (future)', required: false, completed: false }
  ],
  'github-integration': [
    { task: 'Authorize GitHub OAuth app', required: true, completed: false },
    { task: 'Verify repo and read:user scopes', required: true, completed: false },
    { task: 'Test 2-way repo sync', required: true, completed: false },
    { task: 'Configure webhook endpoints', required: true, completed: false },
    { task: 'Test push event handling', required: true, completed: false },
    { task: 'Verify pull request creation', required: true, completed: false }
  ],
  'evosystem-ai': [
    { task: 'Deploy AI agent configurations', required: true, completed: false },
    { task: 'Test agent orchestration', required: true, completed: false },
    { task: 'Verify self-healing triggers', required: true, completed: false },
    { task: 'Configure learning rate parameters', required: true, completed: false },
    { task: 'Test autonomous improvement cycle', required: true, completed: false },
    { task: 'Monitor agent decision logs', required: true, completed: false }
  ],
  'workflow-engine': [
    { task: 'Deploy all 12+ workflows', required: true, completed: false },
    { task: 'Test manual trigger workflows', required: true, completed: false },
    { task: 'Test scheduled workflows', required: true, completed: false },
    { task: 'Verify event-driven workflows', required: true, completed: false },
    { task: 'Test error handling and retries', required: true, completed: false },
    { task: 'Monitor workflow execution logs', required: true, completed: false }
  ],
  'monitoring-observability': [
    { task: 'Set up health check endpoints', required: true, completed: false },
    { task: 'Configure error tracking', required: true, completed: false },
    { task: 'Enable performance monitoring', required: true, completed: false },
    { task: 'Set up alerting thresholds', required: true, completed: false },
    { task: 'Test incident response workflow', required: true, completed: false },
    { task: 'Create monitoring dashboard', required: true, completed: false }
  ]
};

export default async function seedBuildChecklists(event, context) {
  const client = createClient({
    appId: context.env.BASE44_APP_ID,
    apiKey: context.env.BASE44_API_KEY
  });

  const results = [];
  let created = 0;
  let updated = 0;
  let errors = 0;

  for (const [buildName, checklist] of Object.entries(STANDARD_CHECKLISTS)) {
    try {
      // Check if build exists
      const existing = await client.entities('Build').filter({ name: buildName }).findOne();

      const requiredTasks = checklist.filter(t => t.required).length;
      const completedRequired = checklist.filter(t => t.required && t.completed).length;
      const completion = requiredTasks > 0 ? Math.round((completedRequired / requiredTasks) * 100) : 0;

      const buildData = {
        name: buildName,
        checklist: checklist,
        checklist_completion: completion,
        updated_at: new Date().toISOString()
      };

      if (existing) {
        // Update existing build with checklist
        await client.entities('Build').update(existing.id, buildData);
        updated++;
        results.push({ build: buildName, action: 'updated', completion });
      } else {
        // Create new build entry
        await client.entities('Build').create({
          ...buildData,
          type: inferBuildType(buildName),
          status: 'pending',
          health: 'unknown',
          created_at: new Date().toISOString()
        });
        created++;
        results.push({ build: buildName, action: 'created', completion });
      }
    } catch (error) {
      errors++;
      results.push({ build: buildName, action: 'error', error: error.message });
    }
  }

  return {
    success: errors === 0,
    summary: `Seeded checklists for ${Object.keys(STANDARD_CHECKLISTS).length} builds`,
    stats: { created, updated, errors },
    results
  };
}

function inferBuildType(buildName) {
  if (buildName.includes('frontend')) return 'frontend';
  if (buildName.includes('backend')) return 'backend';
  if (buildName.includes('workflow') || buildName.includes('evosystem')) return 'workflow';
  if (buildName.includes('integration') || buildName.includes('github')) return 'integration';
  return 'backend';
}
