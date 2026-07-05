import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  AlertTriangle, BookOpen, CheckCircle, ExternalLink, Loader2,
  Zap, Lock, Upload, ChevronRight, RefreshCw, Target, TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";

const PRIORITY_GAPS = [
  {
    id: "section_1983",
    title: "42 U.S.C. § 1983 — Civil Action for Deprivation of Rights",
    citation: "42 U.S.C. § 1983",
    category: "civil_rights",
    why_it_matters: "Foundational statute for all civil rights litigation against state actors. Without this, JurisEngine cannot analyze any § 1983 claim — which is the most common federal civil rights cause of action.",
    builds_blocked: ["JurisEngine", "Court Compass", "Investigation Compass", "Legal Issue Spotter"],
    source_url: "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title42-section1983",
    import_method: "Paste the statute text from the official source above. Category: Civil Rights. Authority Level: Federal Statute.",
    readiness_gain: 15,
    revenue_impact: 2000,
    related: ["Monroe v. Pape (1961)", "Monell v. NYC (1978)", "14th Amendment"],
    keywords: ["color of law", "state actor", "deprivation", "constitutional rights"],
  },
  {
    id: "foia",
    title: "5 U.S.C. § 552 — Freedom of Information Act (FOIA)",
    citation: "5 U.S.C. § 552",
    category: "administrative_law",
    why_it_matters: "Core legal basis for all FOIA requests against federal agencies. FOIA Tracker and Investigation Compass depend on this for procedural guidance, exemptions, and appeal rights.",
    builds_blocked: ["FOIA Tracker", "Investigation Compass", "Resource Compass"],
    source_url: "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title5-section552",
    import_method: "Paste the full § 552 text. Include all 9 exemptions (b)(1)-(9). Category: Administrative Law. Authority Level: Federal Statute.",
    readiness_gain: 12,
    revenue_impact: 1500,
    related: ["Privacy Act (5 U.S.C. § 552a)", "Vaughn index", "Exemption 6 (personal privacy)", "Exemption 7 (law enforcement)"],
    keywords: ["FOIA", "federal agency", "public records", "exemptions", "appeal", "fee waiver"],
  },
  {
    id: "fcra",
    title: "15 U.S.C. § 1681 — Fair Credit Reporting Act (FCRA)",
    citation: "15 U.S.C. § 1681 et seq.",
    category: "consumer_protection",
    why_it_matters: "Governs consumer credit reporting rights, dispute procedures, and civil liability for inaccurate reporting. Essential for Resource Compass consumer protection services.",
    builds_blocked: ["Resource Compass", "Investigation Compass"],
    source_url: "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title15-section1681",
    import_method: "Paste §§ 1681-1681x. Focus on: § 1681e (accuracy), § 1681i (disputes), § 1681n-o (civil liability). Category: Consumer Protection.",
    readiness_gain: 8,
    revenue_impact: 800,
    related: ["FTC regulations", "Equifax v. consumer disputes", "CFPB guidance"],
    keywords: ["credit report", "dispute", "consumer reporting agency", "accuracy", "civil liability"],
  },
  {
    id: "fdcpa",
    title: "15 U.S.C. § 1692 — Fair Debt Collection Practices Act (FDCPA)",
    citation: "15 U.S.C. § 1692 et seq.",
    category: "consumer_protection",
    why_it_matters: "Prohibits abusive, unfair, or deceptive debt collection practices. Used frequently in consumer civil rights cases alongside § 1983 and FCRA.",
    builds_blocked: ["Resource Compass", "Decision Compass"],
    source_url: "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title15-section1692",
    import_method: "Paste §§ 1692a-1692p. Highlight: § 1692d (harassment), § 1692e (false statements), § 1692k (civil liability). Category: Consumer Protection.",
    readiness_gain: 6,
    revenue_impact: 600,
    related: ["FCRA", "CFPB enforcement", "Rosenthal Act (California)"],
    keywords: ["debt collection", "harassment", "false representation", "validation", "cease communication"],
  },
  {
    id: "14th_amendment",
    title: "U.S. Constitution — 14th Amendment (Due Process & Equal Protection)",
    citation: "U.S. Const. amend. XIV",
    category: "constitutional_law",
    why_it_matters: "Foundation of all § 1983 claims and due process challenges. JurisEngine needs this to analyze whether state action violates constitutional rights.",
    builds_blocked: ["JurisEngine", "Court Compass"],
    source_url: "https://constitution.congress.gov/constitution/amendment-14/",
    import_method: "Paste Section 1 of the 14th Amendment with key doctrinal notes on due process and equal protection clauses. Category: Constitutional Law. Authority Level: Constitutional.",
    readiness_gain: 10,
    revenue_impact: 1200,
    related: ["42 U.S.C. § 1983", "Bill of Rights incorporation", "substantive due process"],
    keywords: ["due process", "equal protection", "state action", "privileges and immunities", "citizenship"],
  },
  {
    id: "qualified_immunity",
    title: "Qualified Immunity Doctrine",
    citation: "Harlow v. Fitzgerald, 457 U.S. 800 (1982)",
    category: "civil_rights",
    why_it_matters: "The primary defense available to state actors in § 1983 suits. JurisEngine must understand this doctrine to assess the strength of civil rights claims and predict litigation risk.",
    builds_blocked: ["JurisEngine", "Court Compass", "Investigation Compass"],
    source_url: "https://scholar.google.com/scholar_case?case=Harlow+v+Fitzgerald",
    import_method: "Write a structured doctrine note explaining: what qualified immunity is, the two-prong test, 'clearly established law' standard, current circuit splits. Category: Civil Rights. Authority Level: Supreme Court.",
    readiness_gain: 8,
    revenue_impact: 900,
    related: ["42 U.S.C. § 1983", "Pearson v. Callahan", "Saucier v. Katz"],
    keywords: ["qualified immunity", "clearly established", "constitutional violation", "good faith", "officer immunity"],
  },
  {
    id: "article3_standing",
    title: "Article III Standing — Injury-in-Fact, Causation, Redressability",
    citation: "Lujan v. Defenders of Wildlife, 504 U.S. 555 (1992)",
    category: "standing_doctrine",
    why_it_matters: "Threshold requirement for any federal lawsuit. JurisEngine must assess standing before analyzing merits of any claim.",
    builds_blocked: ["JurisEngine", "Court Compass"],
    source_url: "https://scholar.google.com/scholar_case?case=Lujan+v+Defenders+of+Wildlife",
    import_method: "Write a structured doctrine note on: three-part standing test, concrete injury, traceability, redressability, organizational standing, associational standing. Category: Standing Doctrine. Authority Level: Supreme Court.",
    readiness_gain: 7,
    revenue_impact: 700,
    related: ["Spokeo, Inc. v. Robins", "TransUnion LLC v. Ramirez", "Article III case-or-controversy"],
    keywords: ["standing", "injury-in-fact", "causation", "redressability", "concrete injury", "federal jurisdiction"],
  },
];

export default function CanonGapResolver() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [resolvedIds, setResolvedIds] = useState([]);

  useEffect(() => {
    base44.entities.CanonEntry.list("-created_date", 500).then(data => {
      setEntries(data);
      // Detect which gaps are already imported (by citation match)
      const resolved = PRIORITY_GAPS.filter(gap =>
        data.some(e => e.citation === gap.citation || e.title.toLowerCase().includes(gap.id.replace("_", " ")))
      ).map(g => g.id);
      setResolvedIds(resolved);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const totalReadinessGain = PRIORITY_GAPS.filter(g => !resolvedIds.includes(g.id)).reduce((s, g) => s + g.readiness_gain, 0);
  const totalRevenueUnlock = PRIORITY_GAPS.filter(g => !resolvedIds.includes(g.id)).reduce((s, g) => s + g.revenue_impact, 0);
  const resolvedCount = resolvedIds.length;

  return (
    <div>
      <div className="mb-5">
        <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">NCOS · Canon Unblock</p>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-amber-500" />Canon Gap Resolver
        </h1>
        <p className="text-sm text-muted-foreground">Every unresolved gap blocks a build, an AI service, and revenue. Resolve them in order.</p>
      </div>

      {/* Summary banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { label: "Priority Gaps", value: PRIORITY_GAPS.length - resolvedCount, color: resolvedCount === PRIORITY_GAPS.length ? "text-emerald-600" : "text-red-600", bg: resolvedCount === PRIORITY_GAPS.length ? "bg-emerald-50" : "bg-red-50" },
          { label: "Resolved", value: resolvedCount, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Readiness Gain Available", value: `+${totalReadinessGain}%`, color: "text-violet-600", bg: "bg-violet-50" },
          { label: "Revenue Unlocked On Resolve", value: `$${totalRevenueUnlock.toLocaleString()}`, color: "text-emerald-600", bg: "bg-emerald-50" },
        ].map(s => (
          <Card key={s.label} className={`p-3 border border-border/60 ${s.bg}`}>
            <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Resolution progress */}
      <Card className="p-4 border border-border/60 mb-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Canon Population Progress</p>
          <span className="text-xs text-muted-foreground">{resolvedCount} / {PRIORITY_GAPS.length} priority gaps resolved</span>
        </div>
        <Progress value={(resolvedCount / PRIORITY_GAPS.length) * 100} className="h-2" />
        <p className="text-[10px] text-muted-foreground mt-1.5">
          Resolving all 7 priority gaps will unlock JurisEngine, Court Compass, Investigation Compass, Resource Compass, and FOIA Tracker.
        </p>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Gap list */}
        <div className="space-y-2">
          {PRIORITY_GAPS.map((gap, idx) => {
            const isResolved = resolvedIds.includes(gap.id);
            return (
              <button key={gap.id} onClick={() => setSelected(gap)}
                className={`w-full text-left p-3 rounded-lg border transition-all ${selected?.id === gap.id ? "bg-primary/10 border-primary/30" : "border-border/60 hover:bg-muted"} ${isResolved ? "opacity-60" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <span className={`text-xs font-bold flex-shrink-0 mt-0.5 ${isResolved ? "text-emerald-600" : "text-red-500"}`}>
                      {isResolved ? "✓" : `#${idx + 1}`}
                    </span>
                    <div>
                      <p className="text-sm font-medium leading-tight">{gap.title}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{gap.citation}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-1" />
                </div>
                <div className="flex items-center gap-2 mt-2">
                  {isResolved ? (
                    <Badge className="text-[9px] bg-emerald-100 text-emerald-700">Imported</Badge>
                  ) : (
                    <Badge className="text-[9px] bg-red-100 text-red-700">Missing</Badge>
                  )}
                  <span className="text-[9px] text-muted-foreground">+{gap.readiness_gain}% readiness</span>
                  <span className="text-[9px] text-emerald-600">${gap.revenue_impact.toLocaleString()} unlocked</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Gap detail */}
        <div className="lg:col-span-2">
          {!selected ? (
            <Card className="p-8 border border-dashed border-border text-center">
              <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-amber-400 opacity-60" />
              <p className="text-sm text-muted-foreground">Select a Canon gap to see resolution instructions, blocked builds, and import guide.</p>
            </Card>
          ) : (
            <Card className="p-5 border border-border/60 space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  {resolvedIds.includes(selected.id) ? (
                    <Badge className="text-[10px] bg-emerald-100 text-emerald-700"><CheckCircle className="w-2.5 h-2.5 mr-1 inline" />Imported</Badge>
                  ) : (
                    <Badge className="text-[10px] bg-red-100 text-red-700"><AlertTriangle className="w-2.5 h-2.5 mr-1 inline" />Missing from Canon</Badge>
                  )}
                  <Badge variant="outline" className="text-[10px]">{selected.category?.replace(/_/g, " ")}</Badge>
                </div>
                <h2 className="text-base font-semibold">{selected.title}</h2>
                <p className="text-xs text-muted-foreground font-mono">{selected.citation}</p>
              </div>

              {/* Why it matters */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs font-bold text-amber-800 uppercase mb-1.5">Why This Gap Matters</p>
                <p className="text-sm text-amber-900">{selected.why_it_matters}</p>
              </div>

              {/* Blocked builds */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Builds / Services Blocked by This Gap</p>
                <div className="flex flex-wrap gap-2">
                  {selected.builds_blocked.map(b => (
                    <Badge key={b} className="text-xs bg-red-50 text-red-700 border border-red-200">
                      <Lock className="w-2.5 h-2.5 mr-1 inline" />{b}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Impact */}
              <div className="grid grid-cols-2 gap-3">
                <Card className="p-3 bg-violet-50 border-violet-200">
                  <p className="text-[10px] text-muted-foreground">Readiness Gain on Resolve</p>
                  <p className="text-xl font-black text-violet-700">+{selected.readiness_gain}%</p>
                </Card>
                <Card className="p-3 bg-emerald-50 border-emerald-200">
                  <p className="text-[10px] text-muted-foreground">Revenue Unlocked</p>
                  <p className="text-xl font-black text-emerald-700">${selected.revenue_impact.toLocaleString()}</p>
                </Card>
              </div>

              {/* How to import */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs font-bold text-blue-800 uppercase mb-1.5">How to Import This Authority</p>
                <p className="text-sm text-blue-900">{selected.import_method}</p>
                {selected.source_url && (
                  <a href={selected.source_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-2 text-xs text-blue-600 hover:underline font-medium">
                    <ExternalLink className="w-3 h-3" />Open Official Source
                  </a>
                )}
              </div>

              {/* Related items */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Related Authorities & Cross-References</p>
                <div className="flex flex-wrap gap-1.5">
                  {selected.related.map(r => (
                    <Badge key={r} variant="outline" className="text-[10px]">{r}</Badge>
                  ))}
                </div>
              </div>

              {/* Keywords */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Search Keywords for This Entry</p>
                <div className="flex flex-wrap gap-1.5">
                  {selected.keywords.map(k => (
                    <Badge key={k} variant="secondary" className="text-[10px]">{k}</Badge>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 pt-1">
                <Link to="/canon-ingestion" className="flex-1">
                  <Button className="w-full" size="sm">
                    <Upload className="w-3.5 h-3.5 mr-1.5" />Upload Document to Canon
                  </Button>
                </Link>
                <Link to="/canon-entry-builder" className="flex-1">
                  <Button variant="outline" className="w-full" size="sm">
                    <BookOpen className="w-3.5 h-3.5 mr-1.5" />Build Entry Manually
                  </Button>
                </Link>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}