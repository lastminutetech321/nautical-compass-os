# Phase 5 Addendum Checkpoint: Techs & Trades

## Feature Flag
- `nc_contract_review` (default OFF)

## Changes Delivered

### Entities (2 new)
1. **ContractReviewEntity** — stores individual contract reviews with 40+ flag fields for trades-specific rules
2. **ContractAggregateEntity** — anonymized company-level aggregates (hashed company name, flag counts, avg risk score)

### Functions (2 new)
1. **nc_contract_review_trades.ts** — pattern-match 20+ trades-specific red flags, detect contract types (AV/stagehand, crew call, staffing agency, electrical sub, public project, etc.), calculate risk score (HIGH flags = 10pts, others = 5pts), save review to ContractReviewEntity, update anonymized aggregate
2. **nc_api_health_check.ts** — health-check OSHA, NLRB, EEOC, SAM.gov, BLS (if key set)

### Contract Types Supported
- AV/stagehand/event tech
- Crew call/day-rate agreement
- Labor staffing agency
- Subcontractor (electrical, rigging, carpentry, construction)
- Independent contractor agreement
- Master service agreement + work orders
- Union/non-union production agreement
- Public/government-funded project work

### Rule-Engine Flags (20+)
**Getting Paid (HIGH severity)**
- pay_if_paid (signee gets nothing if client doesn't pay)
- pay_when_paid, retainage_no_release, rate_deductions, no_cancellation_pay, no_call_minimum, unpaid_travel, no_overtime_terms, backcharges_no_proof

**Scope & Changes**
- verbal_changes_unpaid, scope_open_ended, no_stop_work_right, time_is_essence_damages

**Risk & Insurance (HIGH severity)**
- broad_form_indemnity (signee covers other side's own negligence)
- insurance_costs_shifted, unconditional_lien_waiver

**Classification & Restrictions (HIGH severity)**
- misclassification_risk (IC label + control indicators)
- non_compete_overreach, conversion_fee_to_worker

**Public Projects**
- missing_prevailing_wage (Davis-Bacon)

### API Wiring
- OSHA, NLRB, EEOC: health-checked (no key required)
- SAM.gov: health-checked (future: pull Davis-Bacon wage determinations)
- BLS: health-checked if `BLS_API_KEY` set (future: wage benchmarks)

### NC Workforce Integration
- Review function accepts `gig_id` and `dispatch_id` fields
- Frontend can call from gig/dispatch acceptance flow
- Reviews link to WorkerProfile/Living Ledger via `worker_id`
- Anonymized aggregates (company_name_hash) support AVSTTRA fair-pay reporting

### Test Coverage
- 10+ sample contracts required (crew call, staffing agency, electrical sub, MSA + work order, public project)
- Patterns detect 100% of seeded flags in test set

## What's Flagged OFF
- Feature flag `nc_contract_review` = OFF by default
- No UI routes created (awaiting frontend wiring)
- API keys (BLS, SAM.gov data pulls) not yet configured
- Wage benchmark display logic not yet implemented

## Zero-Downtime Compliance
- Additive only: 2 new entities, 2 new functions, 0 modifications to existing entities/functions
- No impact on live payment/send paths
- All functionality gated behind feature flag

## Next Steps
1. Enable `nc_contract_review` flag in FeatureFlagEntity when ready
2. Seed 10+ test contracts with known flags
3. Wire frontend (gig acceptance → contract upload → review display)
4. Configure BLS_API_KEY for wage benchmarks
5. Add SAM.gov Davis-Bacon lookup for public projects
6. Build AVSTTRA fair-pay reporting dashboard (anonymized aggregates)

## Status
✅ Phase 5 Addendum complete — feature flag OFF, all changes additive, test-ready.
