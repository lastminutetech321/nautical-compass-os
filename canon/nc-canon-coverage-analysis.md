# NC Canon Coverage Analysis

**Generated:** 2025-01-21  
**Purpose:** Identify missing legal authorities, prioritize import order for JurisEngine unblocking

---

## Current Canon Coverage Summary

### Imported Authorities (33 files across 5 repos)

**Primary Sources:**
- U.S. Constitution (core provisions)
- State constitutions (partial coverage)
- Federal statutes (selective imports)
- State statutes (limited coverage)

**Secondary Sources:**
- Case law (minimal coverage)
- Regulations (CFR, state admin codes — sparse)
- Legal treatises (none imported)
- Restatements (none imported)

**Coverage Gaps Identified:**
1. **Critical federal statutes** — missing foundation for JurisEngine contract, employment, IP modules
2. **Uniform laws** — UCC, UETA, RULPA not imported
3. **Binding precedent** — Supreme Court cases absent
4. **Administrative law** — EPA, FTC, DOL regulations missing
5. **State law variation** — only 3-5 states partially covered

---

## Prioritized Import List

### **TIER 1: UNBLOCKING (Import weeks 1-2)**

**Rationale:** These authorities unlock core JurisEngine modules. Without them, contract analysis, employment compliance, and IP management cannot function.

| Authority | JurisEngine Value | Client Query Freq | Import Difficulty | Priority Score |
|---|---|---|---|---|
| **Uniform Commercial Code (UCC)** | Critical — contract module | High | Medium | **10/10** |
| **Copyright Act (17 USC)** | Critical — IP module | High | Low | **10/10** |
| **Patent Act (35 USC)** | Critical — IP module | High | Low | **10/10** |
| **Lanham Act (15 USC §1051+)** | Critical — trademark module | High | Low | **9/10** |
| **Fair Labor Standards Act (FLSA)** | Critical — employment module | High | Low | **9/10** |
| **Title VII Civil Rights Act** | Critical — employment module | High | Low | **9/10** |
| **Americans with Disabilities Act (ADA)** | Critical — employment module | Medium | Low | **8/10** |
| **Family and Medical Leave Act (FMLA)** | High — employment compliance | Medium | Low | **8/10** |

**Action:** Import full text of these 8 authorities. Estimated 12-16 hours. Format: Markdown with hierarchical anchors (§, subsection, clause).

---

### **TIER 2: FOUNDATION (Import weeks 3-4)**

**Rationale:** Essential for legal reasoning, precedent citation, and multi-state compliance.

| Authority | JurisEngine Value | Client Query Freq | Import Difficulty | Priority Score |
|---|---|---|---|---|
| **U.S. Supreme Court Key Cases** | High — precedent citation | High | High (curation) | **8/10** |
| **Restatement (Second) of Contracts** | High — contract interpretation | Medium | Medium | **7/10** |
| **Restatement (Second) of Torts** | Medium — liability analysis | Medium | Medium | **7/10** |
| **Securities Act of 1933** | High — startup equity/fundraising | Medium | Low | **7/10** |
| **Securities Exchange Act of 1934** | High — public company compliance | Low | Low | **6/10** |
| **Electronic Signatures in Global and National Commerce Act (ESIGN)** | Medium — contract validity | Medium | Low | **7/10** |
| **Uniform Electronic Transactions Act (UETA)** | Medium — contract validity | Medium | Low | **7/10** |
| **Delaware General Corporation Law (DGCL)** | High — entity governance | High | Medium | **8/10** |
| **California Corporations Code** | Medium — CA entity governance | Medium | Medium | **6/10** |

**Action:** Import Supreme Court cases (curated list: *Marbury*, *Brown*, *Chevron*, *Twombly*, *Iqbal*, key contract/employment cases). Import Restatements (API or manual). Import statutes. Estimated 20-24 hours.

---

### **TIER 3: EXPANSION (Import weeks 5-8)**

**Rationale:** Broadens coverage for specialized queries, multi-state compliance, and regulatory analysis.

| Authority | JurisEngine Value | Client Query Freq | Import Difficulty | Priority Score |
|---|---|---|---|---|
| **Code of Federal Regulations (CFR) — selected titles** | Medium — regulatory compliance | Medium | High (volume) | **6/10** |
| **State employment laws (CA, NY, TX, FL, IL)** | Medium — multi-state compliance | Medium | High (50-state variation) | **6/10** |
| **Revised Uniform Limited Partnership Act (RULPA)** | Medium — entity formation | Low | Low | **5/10** |
| **Uniform Partnership Act (UPA)** | Medium — entity formation | Low | Low | **5/10** |
| **Sarbanes-Oxley Act (SOX)** | Low — public company only | Low | Low | **4/10** |
| **Dodd-Frank Act** | Low — financial regulation | Low | Medium | **4/10** |
| **Model Rules of Professional Conduct** | Medium — ethics analysis | Low | Low | **5/10** |
| **Bankruptcy Code (11 USC)** | Medium — insolvency analysis | Low | Medium | **5/10** |
| **Tax Code (26 USC) — selected provisions** | Medium — tax structure analysis | Medium | Very High | **5/10** |

**Action:** Import selectively. Start with CFR titles most relevant to clients (e.g., 29 CFR labor, 37 CFR patents). Import top 5 state employment laws. Estimated 30-40 hours.

---

### **TIER 4: SPECIALIZATION (Import weeks 9-12)**

**Rationale:** Niche authorities for advanced queries. Low immediate impact but high long-term value.

| Authority | JurisEngine Value | Client Query Freq | Import Difficulty | Priority Score |
|---|---|---|---|---|
| **Federal Rules of Civil Procedure (FRCP)** | Medium — litigation analysis | Low | Low | **5/10** |
| **Federal Rules of Evidence (FRE)** | Low — litigation support | Low | Low | **4/10** |
| **Antitrust laws (Sherman, Clayton Acts)** | Low — M&A, competitive analysis | Low | Low | **4/10** |
| **HIPAA regulations** | Low — healthcare clients only | Low | Medium | **3/10** |
| **GDPR (EU)** | Low — international compliance | Low | Medium | **4/10** |
| **State data privacy laws (CCPA, CPRA, etc.)** | Medium — privacy compliance | Medium | High | **5/10** |
| **Immigration law (INA)** | Low — H-1B, visa analysis | Low | High | **3/10** |
| **Environmental law (CERCLA, CAA, CWA)** | Low — environmental clients | Very Low | Medium | **2/10** |

**Action:** Import as capacity allows. Estimated 20-30 hours.

---

## Import Methodology

### Sources
1. **Statutes:** [https://www.law.cornell.edu/uscode/text](https://www.law.cornell.edu/uscode/text) (Legal Information Institute)
2. **Cases:** [https://www.courtlistener.com](https://www.courtlistener.com) (bulk download)
3. **Restatements:** Westlaw Academic (API or manual)
4. **Regulations:** [https://www.ecfr.gov](https://www.ecfr.gov) (eCFR API)
5. **State laws:** State legislature websites + Justia

### Format
- **Markdown** with hierarchical anchors
- **YAML frontmatter:** `jurisdiction`, `authority_type`, `enacted_date`, `last_amended`, `canonical_cite`
- **Structured sections:** § number, title, full text, notes/amendments
- **Cross-references:** internal links to related provisions

### Storage
- **Repo:** `nautical-compass-os` (this repo)
- **Path:** `/canon/legal-authorities/{jurisdiction}/{authority-type}/{file-name}.md`
- **Example:** `/canon/legal-authorities/federal/statute/copyright-act-17-usc.md`

### Automation
- **Canon Inventory Engine** will auto-classify new imports
- **JurisEngine** will index on commit (via Base44 workflow trigger)
- **Version control:** Git tracks all amendments; Canon Inventory maintains changelog

---

## Success Metrics

| Metric | Target | Current |
|---|---|---|
| **JurisEngine coverage** | 90% of client queries answerable | ~40% |
| **Authorities imported** | 150+ sources | 33 |
| **Module operability** | All 8 core modules functional | 3/8 functional |
| **Query confidence score** | Avg >0.85 | Avg 0.62 |
| **Multi-state compliance** | Top 10 states covered | 3 states |

**Post-Tier 1 target:** 70% coverage, 6/8 modules functional  
**Post-Tier 2 target:** 85% coverage, 8/8 modules functional  
**Post-Tier 3 target:** 95% coverage, multi-state operational  

---

## Next Steps

1. **Founder approval** — confirm Tier 1 priority list
2. **Assign import task** — NC Execution Worker begins Tier 1 imports (12-16 hours)
3. **JurisEngine reindex** — trigger after each batch import
4. **Test queries** — validate module operability (contract, IP, employment)
5. **Iterate** — move to Tier 2 upon Tier 1 completion

---

## Notes

- **No new dependencies:** All imports are static Markdown files; no new frameworks required.
- **Incremental deployment:** Each tier can be imported, tested, and deployed independently.
- **Backward compatibility:** Existing Canon files remain unchanged; new imports extend coverage.
- **Founder governance:** All imports subject to Canon Inventory classification and Founder review.

---

**Status:** Ready for execution  
**Estimated total effort:** 82-110 hours across 12 weeks  
**Immediate action:** Begin Tier 1 imports (Week 1)
