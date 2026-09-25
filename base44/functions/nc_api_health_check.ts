export default async function(req: Request): Promise<Response> {
  const health = {
    osha: await fetch('https://www.osha.gov/').then(r => r.ok).catch(() => false),
    nlrb: await fetch('https://www.nlrb.gov/').then(r => r.ok).catch(() => false),
    eeoc: await fetch('https://www.eeoc.gov/').then(r => r.ok).catch(() => false),
    sam_gov: await fetch('https://sam.gov/').then(r => r.ok).catch(() => false),
    bls: !!Deno.env.get('BLS_API_KEY') && await fetch('https://api.bls.gov/publicAPI/v2/timeseries/data/').then(r => r.ok).catch(() => false)
  };
  return new Response(JSON.stringify(health), {headers: {'Content-Type': 'application/json'}});
}