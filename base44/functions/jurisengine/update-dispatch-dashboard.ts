/**
 * JurisEngine: Update Dispatch Dashboard
 * Records dispatch metrics for monitoring
 */

import { EntityManager } from '@base44/functions-sdk';

export default async function handler(req: Request) {
  try {
    const { dispatched_count, timestamp } = await req.json();
    const em = new EntityManager(req);

    await em.create('system_metric', {
      metric_name: 'jurisengine_dispatch_count',
      value: dispatched_count,
      timestamp,
      module: 'JurisEngine v1'
    });

    return new Response(JSON.stringify({
      success: true,
      message: 'Dashboard updated'
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
