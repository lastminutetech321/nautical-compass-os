/**
 * JurisEngine: Update Resolution Status
 * Called by the resolver agent to update task progress
 */

import { EntityManager } from '@base44/functions-sdk';

export default async function handler(req: Request) {
  try {
    const { task_id, status, notes, resolved_at } = await req.json();
    const em = new EntityManager(req);

    const updates: any = { status };
    if (notes) updates.resolution_notes = notes;
    if (resolved_at) updates.resolved_at = resolved_at;
    if (status === 'in_progress' || status === 'failed') {
      const task = await em.get('juris_resolution_task', task_id);
      updates.attempts = (task.attempts || 0) + 1;
    }

    await em.update('juris_resolution_task', task_id, updates);

    return new Response(JSON.stringify({
      success: true,
      task_id,
      status
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
