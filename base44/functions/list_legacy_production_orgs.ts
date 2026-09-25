import { Base44 } from 'https://deno.land/x/base44/mod.ts';

export async function handler(req: Request) {
  const base44 = new Base44();
  try {
    const orgs = await base44.entity('organizations').list({ filter: { type: 'client', tags: { $contains: 'production_company' } } });
    return new Response(JSON.stringify({ success: true, count: orgs.data?.length || 0, organizations: orgs.data || [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('List legacy production orgs error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
