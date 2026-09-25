import { createClient } from 'https://esm.sh/@base44/node-sdk@latest';

const FLAG = 'nc_contract_review';
const PATTERNS = {
  pay_if_paid: /pay[- ]if[- ]paid/i,
  pay_when_paid: /pay[- ]when[- ]paid|net \d{2,}/i,
  retainage_no_release: /retainage|holdback(?!.*release)/i,
  rate_deductions: /deduct.*late|deduct.*equipment|deduct.*uniform/i,
  no_cancellation_pay: /no.*cancellation.*pay/i,
  no_call_minimum: /no.*minimum.*hours/i,
  unpaid_travel: /travel.*not.*paid/i,
  no_overtime_terms: /no.*overtime/i,
  backcharges_no_proof: /back[- ]charge.*without.*proof/i,
  verbal_changes_unpaid: /verbal.*change.*not.*paid/i,
  scope_open_ended: /all work reasonably necessary/i,
  no_stop_work_right: /no.*right.*stop.*work/i,
  time_is_essence_damages: /time is of the essence.*liquidated/i,
  broad_form_indemnity: /indemnify.*own.*negligence/i,
  insurance_costs_shifted: /contractor.*provide.*insurance/i,
  unconditional_lien_waiver: /unconditional.*lien.*waiver/i,
  misclassification_risk: /independent contractor.*set.*hours/i,
  non_compete_overreach: /non[- ]compete.*production/i,
  missing_prevailing_wage: /(?!.*prevailing)public.*project/i
};

export default async function(req: Request): Promise<Response> {
  const base44 = createClient({appId: Deno.env.get('BASE44_APP_ID')!, masterKey: Deno.env.get('BASE44_MASTER_KEY')!});
  const flagRes = await base44.entities('FeatureFlagEntity').find({where: {flag_name: FLAG}});
  if (!flagRes.data?.[0]?.enabled) return new Response(JSON.stringify({error: 'disabled'}), {status: 403});
  const {worker_id, contract_text, company_name, gig_id, dispatch_id} = await req.json();
  if (!worker_id || !contract_text) return new Response(JSON.stringify({error: 'missing fields'}), {status: 400});
  const flags: Record<string, boolean> = {};
  let risk = 0;
  for (const [k, p] of Object.entries(PATTERNS)) {
    flags[k] = p.test(contract_text);
    if (flags[k]) risk += ['pay_if_paid','unconditional_lien_waiver','broad_form_indemnity','misclassification_risk'].includes(k) ? 10 : 5;
  }
  const types = [];
  const low = contract_text.toLowerCase();
  if (low.includes('stagehand')) types.push('av_stagehand');
  if (low.includes('crew call')) types.push('crew_call');
  if (low.includes('staffing')) types.push('staffing_agency');
  if (low.includes('electrical')) types.push('electrical_sub');
  if (low.includes('public project')) types.push('public_project');
  const review = await base44.entities('ContractReviewEntity').create({worker_id, contract_text, company_name, risk_score: risk, flags, contract_types_detected: types, gig_id, dispatch_id, ...flags});
  if (company_name) {
    const hash = btoa(company_name).slice(0, 16);
    const agg = await base44.entities('ContractAggregateEntity').find({where: {company_name_hash: hash}});
    if (agg.data?.[0]) {
      const old = agg.data[0];
      const newCounts: Record<string, number> = old.flag_counts || {};
      for (const k of Object.keys(flags)) if (flags[k]) newCounts[k] = (newCounts[k] || 0) + 1;
      await base44.entities('ContractAggregateEntity').update(old.id, {total_reviews: old.total_reviews + 1, flag_counts: newCounts, avg_risk_score: ((old.avg_risk_score || 0) * old.total_reviews + risk) / (old.total_reviews + 1), last_aggregated: new Date().toISOString()});
    } else {
      const counts: Record<string, number> = {};
      for (const k of Object.keys(flags)) if (flags[k]) counts[k] = 1;
      await base44.entities('ContractAggregateEntity').create({company_name_hash: hash, total_reviews: 1, flag_counts: counts, avg_risk_score: risk, last_aggregated: new Date().toISOString()});
    }
  }
  return new Response(JSON.stringify({review_id: review.data.id, risk_score: risk, flags, types}), {headers: {'Content-Type': 'application/json'}});
}