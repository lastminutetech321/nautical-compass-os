/**
 * JurisEngine: Get Pending Resolution Tasks
 * Returns unresolved issues flagged by Self-Healing Engine v3
 */

import { EntityManager } from '@base44/functions-sdk';

export default async function handler(req: Request) {
  try {
    const em = new EntityManager(req);

    // Query healing_logs for unresolved JurisEngine issues
    const pending = await em.query('healing_log', {
      filters: {
        module: 'JurisEngine v1',
        status: { $in: ['pending', 'failed'] },
        action: 'Dispatch resolution tasks for JurisEngine v1'
      },
      sort: { priority: -1, created_at: 1 },
      limit: 50
    });

    const tasks = pending.map((log: any) => ({
      id: log.id,
      priority: log.severity === 'critical' ? 'critical' : log.severity === 'error' ? 'high' : 'medium',
      description: log.action,
      context: log.context,
      detected_at: log.created_at
    }));

    return new Response(JSON.stringify({
      success: true,
      tasks,
      count: tasks.length
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
