import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  BookOpen, CheckCircle, AlertTriangle, Loader2, Upload, Star,
  GitBranch, Search, Filter, BarChart3, Zap, Clock, Shield, Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";

const PRIORITY_AUTHORITIES = [
  { title: "42 U.S.C. § 1983 — Civil Rights Act", category: "civil_rights", authority_level: "federal_statute", citation: "42 U.S.C. § 1983", juris_services: ["JurisEngine","Civil Rights Agent","Legal Research Agent"], status: "gap", quality_score: 0, estimated_impact: "Enables 40% of all civil rights queries" },
  { title: "5 U.S.C. § 552 — Freedom of Information Act (FOIA)", category: "foia_guide", authority_level: "federal_statute", citation: "5 U.S.C. § 552", juris_services: ["JurisEngine","FOIA Agent"], status: "gap", quality_score: 0, estimated_impact: "Enables all FOIA request assistance" },
  { title: "Fair Credit Reporting Act (FCRA)", category: "consumer_protection", authority_level: "federal_statute", citation: "15 U.S.C. § 1681", juris_services: ["JurisEngine","Decision Compass"], status: "gap", quality_score: 0, estimated_impact: "Consumer protection queries — 20% of legal requests" },
  { title: "Fair Debt Collection Practices Act (FDCPA)", category: "consumer_protection", authority_level: "federal_statute", citation: "15 U.S.C. § 1692", juris_services: ["JurisEngine","Decision Compass"], status: "gap", quality_score: 0, estimated_impact: "Debt harassment cases — common client scenario" },
  { title: "U.S. Constitution — Article III Standing Doctrine", category: "standing_doctrine", authority_level: "constitutional", citation: "U.S. Const. Art. III § 2", juris_services: ["JurisEngine"], status: "gap", quality_score: 0, estimated_impact: "Required for all federal court claim analysis" },
  { title: "U.S. Constitution — 14th Amendment (Due Process & Equal Protection)", category: "constitutional_law", authority_level: "constitutional", citation: "U.S. Const. Amend. XIV", juris_services: ["JurisEngine","Civil Rights Agent"], status: "gap", quality_score: 0, estimated_impact: "Foundation for all civil rights and due process claims" },
  { title: "Monell v. Department of Social Services (1978)", category: "case_law", authority_level: "supreme_court", citation: "436 U.S. 658 (1978)", juris_services: ["JurisEngine"], status: "gap", quality_score: 0, estimated_impact: "Municipal liability doctrine — required for §1983 claims" },
  { title: "Truth in Lending Act (TILA)", category: "consumer_protection", authority_level: "federal_statute", citation: "15 U.S.C. § 1601", juris_services: ["JurisEngine","Decision Compass"], status: "gap", quality_score: 0, estimated_impact: "Consumer lending disputes" },
  { title: "North Carolina Gen. Stat. § 75-1.1 — Unfair Trade Practices", category: "state_statute", authority_level: "state_statute", citation: "N.C. Gen. Stat. § 75-1.1", juris_services: ["JurisEngine"], status: "gap", quality_score: 0, estimated_impact: "NC-specific consumer and business disputes" },
  { title: "Administrative Procedure Act (APA)", category: "administrative_law", authority_level: "federal_statute", citation: "5 U.S.C. §§ 551-559", juris_services: ["JurisEngine","FOIA Agent"], status: "gap", quality_score: 0, estimated_impact: "Government agency challenge cases" },
];

const QUALITY_DIMENSIONS = [
  { key: "has_full_text", label: "Full Text Uploaded", weight: 30 },
  { key: "has_summary", label: "AI Summary Generated", weight: 20 },
  { key: "has_citation", label: "Proper Citation", weight: 15 },
  { key: "verified", label: "Founder Verified", weight: 25 },
  { key: "has_keywords", label: "Keywords Tagged", weight: 10 },
];

export default function CanonPopulationHub() {
  const [canonEntries, setCanonEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [drafting, setDrafting] = useState(null);
  const [draftResult, setDraftResult] = useState({});

  useEffect(() => { loadEntries(); }, []);

  const loadEntries = async () => {
    setLoading(true);
    const e = await base44.entities.CanonEntry.list("-created_date", 200).catch(() => []);
    setCanonEntries(e);
    setLoading(false);
  };

  const calcQuality = (entry) => {
    let score = 0;
    if (entry.full_text && entry.full_text.length > 50) score += 30;
    if (entry.summary && entry.summary.length > 20) score += 20;
    if (entry.citation) score += 15;
    if (entry.verified) score += 25;
    if ((entry.keywords || []).length > 2) score += 10;
    return score;
  };

  const autoDraftEntry = async (authority) => {
    setDrafting(authority.citation);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are the NCOS Canon Librarian. Draft a complete, accurate Canon entry for: ${authority.title} (${authority.citation}).

CRITICAL RULES:
1. Only include information you are highly confident is accurate
2. Do NOT fabricate case citations or specific legal holdings
3. Mark any uncertain information clearly
4. Focus on the black-letter law — the established, settled rule

Return a JSON Canon entry with:
- title: Official title
- citation: Official citation  
- summary: 2-3 paragraph plain English summary of what this law does and why it matters
- content: Key provisions and rules (bullet points)
- keywords: 8-12 relevant search keywords
- related_doctrines: Related legal doctrines (list)
- jurisdiction: "Federal" or state name
- effective_date: Year enacted (YYYY-01-01 format if exact date unknown)
- subcategory: Specific area of law`,
      response_json_schema: {
        type: "object",
        properties: {
          title: { type: "string" },
          citation: { type: "string" },
          summary: { type: "string" },
          content: { type: "string" },
          keywords: { type: "array", items: { type: "string" } },
          related_doctrines: { type: "array", items: { type: "string" } },
          jurisdiction: { type: "string" },
          effective_date: { type: "string" },
          subcategory: { type: "string" },
        },
        required: ["title", "citation", "summary", "content", "keywords"],
      },
    });

    // Create draft Canon entry
    const created = await base44.entities.CanonEntry.create({
      ...result,
      category: authority.category,
      authority_level: authority.authority_level,
      status: "pending_review",
      verified: false,
      is_canon_gap: false,
      confidence: 70,
      version: "1.0",
      ai_services: authority.juris_services,
      gap_import_status: "imported",
      imported_at: new Date().toISOString(),
    });

    setDraftResult(d => ({ ...d, [authority.citation]: created.id }));
    setDrafting(null);
    loadEntries();
  };

  const verifiedEntries = canonEntries.filter(e => e.verified && e.status === "active");
  const pendingEntries = canonEntries.filter(e => e.status === "pending_review");
  const draftEntries = canonEntries.filter(e => e.status === "draft");
  const coveragePct = Math.min(100, Math.round((verifiedEntries.length / 25) * 100));

  const importedCitations = new Set(canonEntries.map(e => e.citation).filter(Boolean));
  const missingAuthorities = PRIORITY_AUTHORITIES.filter(a => !importedCitations.has(a.citation));

  const filteredEntries = canonEntries.filter(e =>
    !search || e.title?.toLowerCase().includes(search.toLowerCase()) || e.citation?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">NCOS · Canon Infrastructure</p>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-amber-500" />Canon Population Hub
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Complete Canon infrastructure: intake, review, verification, publication, quality scoring.</p>
      </div>

      {/* Coverage meter */}
      <Card className="p-4 border border-border/60 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">JurisEngine Canon Coverage</p>
            <p className="text-2xl font-bold mt-1">{coveragePct}% <span className="text-sm font-normal text-muted-foreground">({verifiedEntries.length} / 25 min. verified entries)</span></p>
          </div>
          <Link to="/canon-ingestion"><Button size="sm" className="gap-1"><Upload className="w-3.5 h-3.5" />Add Canon Entry</Button></Link>
        </div>
        <Progress value={coveragePct} className="h-3 mb-2" />
        <div className="grid grid-cols-3 md:grid-cols-5 gap-2 mt-3">
          {[
            { label: "Total Entries", value: canonEntries.length, color: "text-blue-600" },
            { label: "Verified Active", value: verifiedEntries.length, color: "text-emerald-600" },
            { label: "Pending Review", value: pendingEntries.length, color: "text-amber-600" },
            { label: "Drafts", value: draftEntries.length, color: "text-slate-600" },
            { label: "Missing Priority", value: missingAuthorities.length, color: "text-red-600" },
          ].map(s => (
            <div key={s.label} className="text-center">
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </Card>

      <Tabs defaultValue="gaps">
        <TabsList className="mb-5">
          <TabsTrigger value="gaps"><AlertTriangle className="w-3.5 h-3.5 mr-1.5" />Priority Gaps ({missingAuthorities.length})</TabsTrigger>
          <TabsTrigger value="entries"><BookOpen className="w-3.5 h-3.5 mr-1.5" />All Entries ({canonEntries.length})</TabsTrigger>
          <TabsTrigger value="review"><Clock className="w-3.5 h-3.5 mr-1.5" />Pending Review ({pendingEntries.length})</TabsTrigger>
          <TabsTrigger value="quality"><BarChart3 className="w-3.5 h-3.5 mr-1.5" />Quality Dashboard</TabsTrigger>
        </TabsList>

        {/* GAPS TAB */}
        <TabsContent value="gaps">
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4 text-xs text-red-800">
            <AlertTriangle className="w-3.5 h-3.5 inline mr-1.5" />
            <strong>JurisEngine Blocked</strong> — These {missingAuthorities.length} priority legal authorities are missing. AI can draft entries for review; only verified entries unlock JurisEngine.
          </div>
          <div className="space-y-3">
            {missingAuthorities.map(auth => (
              <Card key={auth.citation} className="p-4 border border-red-200 bg-red-50/30">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge variant="outline" className="text-[9px] text-red-600 border-red-300">MISSING</Badge>
                      <Badge variant="outline" className="text-[9px]">{auth.authority_level?.replace(/_/g," ")}</Badge>
                      <span className="text-[10px] text-muted-foreground font-mono">{auth.citation}</span>
                    </div>
                    <p className="text-sm font-semibold">{auth.title}</p>
                    <p className="text-xs text-blue-700 mt-1">Impact: {auth.estimated_impact}</p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {auth.juris_services.map(s => <Badge key={s} variant="secondary" className="text-[9px]">{s}</Badge>)}
                    </div>
                  </div>
                  <div className="flex-shrink-0 flex flex-col gap-2">
                    {draftResult[auth.citation] ? (
                      <Badge className="text-[10px] bg-amber-100 text-amber-700 border border-amber-300"><Clock className="w-3 h-3 mr-1" />Draft Created — Needs Verification</Badge>
                    ) : drafting === auth.citation ? (
                      <Button size="sm" disabled className="h-7 text-xs"><Loader2 className="w-3 h-3 animate-spin mr-1" />AI Drafting...</Button>
                    ) : (
                      <Button size="sm" className="h-7 text-xs" onClick={() => autoDraftEntry(auth)}>
                        <Zap className="w-3 h-3 mr-1" />AI Draft Entry
                      </Button>
                    )}
                    <Link to="/canon-ingestion">
                      <Button size="sm" variant="outline" className="h-7 text-xs w-full"><Upload className="w-3 h-3 mr-1" />Upload Manual</Button>
                    </Link>
                  </div>
                </div>
              </Card>
            ))}
            {missingAuthorities.length === 0 && (
              <div className="text-center py-12 border border-dashed border-emerald-300 rounded-xl bg-emerald-50">
                <CheckCircle className="w-10 h-10 mx-auto mb-2 text-emerald-500" />
                <p className="text-sm font-medium text-emerald-700">All priority authorities imported!</p>
                <p className="text-xs text-muted-foreground mt-1">JurisEngine coverage is strong. Review pending entries to verify them.</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ALL ENTRIES TAB */}
        <TabsContent value="entries">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search entries..." className="pl-9 h-8 text-sm" />
            </div>
          </div>
          <div className="space-y-2">
            {filteredEntries.map(entry => {
              const quality = calcQuality(entry);
              return (
                <Card key={entry.id} className="p-3 border border-border/60">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        {entry.verified ? <Badge className="text-[9px] bg-emerald-100 text-emerald-700 border border-emerald-300"><CheckCircle className="w-2.5 h-2.5 mr-1" />Verified</Badge> : <Badge variant="outline" className="text-[9px]">{entry.status}</Badge>}
                        {entry.citation && <span className="text-[10px] text-muted-foreground font-mono">{entry.citation}</span>}
                      </div>
                      <p className="text-sm font-medium">{entry.title}</p>
                      {entry.summary && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{entry.summary}</p>}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-bold" style={{color: quality >= 70 ? "#16a34a" : quality >= 40 ? "#d97706" : "#dc2626"}}>{quality}%</p>
                      <p className="text-[9px] text-muted-foreground">quality</p>
                    </div>
                  </div>
                </Card>
              );
            })}
            {filteredEntries.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">No entries found.</p>
            )}
          </div>
        </TabsContent>

        {/* PENDING REVIEW TAB */}
        <TabsContent value="review">
          {pendingEntries.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border rounded-xl">
              <CheckCircle className="w-10 h-10 mx-auto mb-2 text-emerald-500 opacity-60" />
              <p className="text-sm text-muted-foreground">No entries pending review.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-4 text-xs text-amber-800">
                <Shield className="w-3.5 h-3.5 inline mr-1.5" />
                <strong>{pendingEntries.length} entries await founder verification.</strong> Only you can mark entries as verified — this enables them in JurisEngine. Review each entry's content and citation carefully before verifying.
              </div>
              {pendingEntries.map(entry => (
                <Card key={entry.id} className="p-4 border border-amber-200 bg-amber-50/30">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{entry.title}</p>
                      {entry.citation && <p className="text-xs text-muted-foreground font-mono mt-0.5">{entry.citation}</p>}
                      {entry.summary && <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{entry.summary}</p>}
                      {entry.content && (
                        <div className="mt-2 bg-white border border-border/40 rounded p-2 text-xs text-muted-foreground max-h-24 overflow-y-auto">
                          {entry.content.slice(0, 400)}{entry.content.length > 400 ? "..." : ""}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700" onClick={async () => {
                        await base44.entities.CanonEntry.update(entry.id, { verified: true, status: "active", reviewed_at: new Date().toISOString() });
                        loadEntries();
                      }}>
                        <CheckCircle className="w-3 h-3 mr-1" />Verify
                      </Button>
                      <Link to={`/canon-ingestion`}>
                        <Button size="sm" variant="outline" className="h-7 text-xs w-full"><Eye className="w-3 h-3 mr-1" />Review</Button>
                      </Link>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* QUALITY DASHBOARD TAB */}
        <TabsContent value="quality">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Quality distribution */}
              <Card className="p-4 border border-border/60">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">Quality Distribution</p>
                {[
                  { label: "Excellent (80-100%)", count: canonEntries.filter(e => calcQuality(e) >= 80).length, color: "bg-emerald-500" },
                  { label: "Good (60-79%)", count: canonEntries.filter(e => calcQuality(e) >= 60 && calcQuality(e) < 80).length, color: "bg-blue-500" },
                  { label: "Fair (40-59%)", count: canonEntries.filter(e => calcQuality(e) >= 40 && calcQuality(e) < 60).length, color: "bg-amber-500" },
                  { label: "Poor (<40%)", count: canonEntries.filter(e => calcQuality(e) < 40).length, color: "bg-red-500" },
                ].map(q => (
                  <div key={q.label} className="flex items-center gap-3 mb-2">
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${q.color}`} />
                    <span className="text-xs flex-1">{q.label}</span>
                    <span className="text-xs font-bold">{q.count}</span>
                  </div>
                ))}
              </Card>

              {/* Quality dimensions */}
              <Card className="p-4 border border-border/60">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">Canon Completeness</p>
                {QUALITY_DIMENSIONS.map(d => {
                  const count = canonEntries.filter(e => {
                    if (d.key === "has_full_text") return e.full_text && e.full_text.length > 50;
                    if (d.key === "has_summary") return e.summary && e.summary.length > 20;
                    if (d.key === "has_citation") return !!e.citation;
                    if (d.key === "verified") return !!e.verified;
                    if (d.key === "has_keywords") return (e.keywords || []).length > 2;
                    return false;
                  }).length;
                  const pct = canonEntries.length > 0 ? Math.round((count / canonEntries.length) * 100) : 0;
                  return (
                    <div key={d.key} className="mb-2">
                      <div className="flex justify-between text-xs mb-0.5">
                        <span className="text-muted-foreground">{d.label}</span>
                        <span className="font-medium">{count}/{canonEntries.length}</span>
                      </div>
                      <Progress value={pct} className="h-1.5" />
                    </div>
                  );
                })}
              </Card>
            </div>

            {/* Lowest quality entries */}
            <Card className="p-4 border border-border/60">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">Entries Needing Improvement</p>
              <div className="space-y-2">
                {canonEntries
                  .map(e => ({ ...e, quality: calcQuality(e) }))
                  .sort((a, b) => a.quality - b.quality)
                  .slice(0, 5)
                  .map(entry => (
                    <div key={entry.id} className="flex items-center justify-between text-sm p-2 bg-muted rounded-lg">
                      <span className="truncate flex-1">{entry.title}</span>
                      <span className="ml-3 text-xs font-bold text-red-600 flex-shrink-0">{entry.quality}%</span>
                    </div>
                  ))}
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}