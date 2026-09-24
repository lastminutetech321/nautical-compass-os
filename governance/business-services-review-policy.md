# Business Services Review Policy

## Purpose
Define the human review process for pilot business service submissions to ensure quality, verify legitimacy, and protect clients before any public listing or work guarantee.

## Review Workflow

### 1. Submission Received
- Auto-create review record with status `pending`
- Assign to review team
- SLA: 72-hour response target

### 2. Review Checklist

#### Business Identity Verification
- [ ] Legal business name matches registration
- [ ] Contact information is valid
- [ ] Business address/location verified
- [ ] Owner/operator identity confirmed

#### Service Validation
- [ ] Services claimed are specific and clear
- [ ] Service descriptions are professional
- [ ] Pricing structure is reasonable
- [ ] Service areas are realistic

#### Evidence Assessment
- [ ] Insurance documentation (if applicable)
  - Coverage type
  - Coverage limits
  - Expiration date
  - Underwriter information
- [ ] Credentials/certifications (if applicable)
  - License numbers
  - Issuing authority
  - Expiration dates
  - Verification status

#### Risk Flags
- Unrealistic claims
- Missing required insurance for service type
- Unlicensed operation in regulated field
- Vague or unprofessional communication
- Incomplete contact information

### 3. Review Outcomes

#### Approved
- All checks pass
- Create service listing with `visibility: opportunity_only`
- **No public listing** - only eligible for opportunity routing
- **No work guarantee** - opportunities are invitations, not commitments
- Notify provider of approval and next steps
- Begin matching to suitable opportunities

#### Corrections Requested
- Identify specific missing or unclear items
- List required evidence
- Pose clarifying questions
- Set 14-day response deadline
- Email provider with detailed feedback

#### Rejected
- Fundamental business legitimacy issues
- Services outside platform scope
- Regulated service without required license
- Evidence of fraudulent claims
- Notify provider with brief reason (no detailed feedback)

### 4. Feedback Questions (Corrections Requested)

Standard questions based on gaps:

- "Please provide proof of general liability insurance with minimum $1M coverage."
- "Can you clarify which specific certifications you hold for [service type]?"
- "Your service area lists [region] - do you have local business licenses for these jurisdictions?"
- "Please upload current contractor license and bond information."
- "Can you provide 2-3 references from past clients for similar work?"

### 5. Post-Approval Listing

#### Listing Properties
- **Visibility:** `opportunity_only` (not searchable by clients)
- **Status:** `active`
- **Content:** Curated from submission, categories assigned by reviewer
- **Credentials:** Only verified items displayed
- **Insurance:** Only confirmed coverage shown

#### No Guarantees
- Approval does NOT guarantee work
- Opportunities are routing suggestions, not commitments
- Client ultimately chooses provider
- Platform facilitates connection, not transaction

### 6. Opportunity Routing

After approval:
- Match listing to active opportunities based on:
  - Service category alignment
  - Geographic service area
  - Verified credential requirements
  - Insurance minimums
- Create `opportunity_routes` records
- Notify provider of matched opportunities
- Provider can express interest (no automatic acceptance)

## Response Time Targets

- **Initial review assignment:** 24 hours
- **Review completion:** 72 hours
- **Correction response from provider:** 14 days
- **Re-review after corrections:** 48 hours

## Review Team

- Platform operations staff
- Business verification specialists
- Domain experts (for specialized services)
- Escalation to legal/compliance for edge cases

## Audit Trail

All review actions logged:
- Reviewer identity
- Timestamp
- Decision and reasoning
- Evidence reviewed
- Questions asked
- Corrections requested

## Pilot Constraints

- Manual review only (no auto-approval)
- Conservative approval standards
- Bias toward requesting more information
- Reject if uncertain about legitimacy
- No public listings during pilot phase

---

**Approved by:** Founder  
**Effective:** Pilot Phase  
**Review Cycle:** After first 50 submissions