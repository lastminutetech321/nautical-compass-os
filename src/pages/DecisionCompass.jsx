import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Compass, AlertTriangle, CheckCircle, Loader2, Shield, HelpCircle,
  FileText, BookOpen, Info, ClipboardList, Pause, Star, Link2, XCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import ReactMarkdown from "react-markdown";

const FORM_WORKFLOWS = [
  {
    value: "unemployment",
    label: "Unemployment Certification",
    icon: "💼",
    description: "Weekly certification, initial filing, appeals",
    questions: [
      { q: "Did you voluntarily quit your job?", risk: "high", why: "Voluntary separation is the #1 reason for denial. How you describe your departure is critical." },
      { q: "Were you terminated for cause or misconduct?", risk: "high", why: "Misconduct disqualifies. The definition of 'misconduct' varies — a simple mistake may not qualify." },
      { q: "Are you currently able and available for work?", risk: "medium", why: "You must certify you are physically able and not refusing suitable work." },
      { q: "Have you looked for work this week?", risk: "medium", why: "Job search requirements are strictly enforced. Failure to document work search is common cause of disqualification." },
      { q: "Did you have any wages or income this week?", risk: "high", why: "Unreported earnings — including gig work, odd jobs, tips — can result in fraud investigations and repayment demands." },
    ]
  },
  {
    value: "snap",
    label: "SNAP / Food Benefits",
    icon: "🍎",
    description: "Initial application, recertification, changes",
    questions: [
      { q: "What is your household size?", risk: "medium", why: "Household composition determines eligibility. Including or excluding people incorrectly affects the benefit amount." },
      { q: "What is your monthly gross income?", risk: "high", why: "Gross income must include all sources. Underreporting is the primary cause of overpayment and fraud referrals." },
      { q: "Do you have assets over $2,500?", risk: "medium", why: "Asset limits apply to vehicles, bank accounts, and property depending on household type." },
      { q: "Are you currently employed or in a work program?", risk: "medium", why: "Work requirements apply to able-bodied adults without dependents (ABAWDs) in most states." },
      { q: "Do you have citizenship or eligible immigration status?", risk: "high", why: "Immigration status questions must be answered carefully. Non-citizens have limited eligibility windows." },
    ]
  },
  {
    value: "housing",
    label: "Housing Application",
    icon: "🏠",
    description: "Rental applications, Section 8, public housing",
    questions: [
      { q: "Have you ever been evicted?", risk: "high", why: "Prior evictions — even older ones — are heavily weighted. How you disclose and explain them matters." },
      { q: "Have you ever been convicted of a felony?", risk: "high", why: "Certain convictions can disqualify for public housing. Private landlords also screen. Know your rights under local law." },
      { q: "What is your current monthly income?", risk: "medium", why: "Income verification must match documentation. Discrepancies trigger further review." },
      { q: "Have you received prior housing assistance?", risk: "medium", why: "Prior termination from housing programs can affect current eligibility." },
    ]
  },
  {
    value: "employer_form",
    label: "Employer Forms",
    icon: "📋",
    description: "Background checks, I-9, W-4, new hire paperwork",
    questions: [
      { q: "Have you ever been convicted of a crime?", risk: "high", why: "Background check disclosures are strictly regulated by the FCRA. Your rights include challenging inaccurate records." },
      { q: "What was your reason for leaving your last job?", risk: "medium", why: "Inconsistencies between your application and reference checks are a leading cause of offer withdrawal." },
      { q: "What was your salary at your last job?", risk: "medium", why: "Salary history questions are banned in many states. Know your rights before answering." },
      { q: "Do you have authorization to work in the US?", risk: "high", why: "I-9 verification requires specific documents. Providing incorrect documents is a federal offense." },
    ]
  },
  {
    value: "court_form",
    label: "Court Forms",
    icon: "⚖️",
    description: "Pro se filings, responsive pleadings, motions",
    questions: [
      { q: "Do you have any prior related cases?", risk: "high", why: "Failure to disclose related cases can result in sanctions or case dismissal. Courts have access to case databases." },
      { q: "What is your basis for jurisdiction?", risk: "high", why: "Jurisdictional defects can end your case at any time. This must be correct from the start." },
      { q: "Are you seeking monetary damages?", risk: "medium", why: "Specifying damages incorrectly can limit recovery. Punitive damages require specific factual allegations." },
      { q: "Have you exhausted administrative remedies?", risk: "high", why: "Many courts require exhaustion before filing. This is a threshold requirement, not a technicality." },
    ]
  },
  {
    value: "insurance_form",
    label: "Insurance Forms",
    icon: "🛡",
    description: "Claims, applications, appeals",
    questions: [
      { q: "When did the injury / loss / event occur?", risk: "high", why: "Incorrect or inconsistent dates are treated as material misrepresentation — which can void your entire claim." },
      { q: "Have you filed prior claims?", risk: "medium", why: "Prior claims history affects your claim. Omitting claims — even denied ones — can be grounds for denial." },
      { q: "Did anyone else contribute to the event?", risk: "medium", why: "Third-party liability information affects subrogation rights. Omitting this can reduce your recovery." },
      { q: "Are you currently represented by an attorney?", risk: "low", why: "Disclosing representation affects how the insurer communicates with you and may limit certain negotiations." },
    ]
  },
];

const JURISDICTIONS = [
  "Federal (US)", "Alabama", "Alaska", "Arizona", "Arkansas", "California",
  "Colorado", "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii",
  "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana",
  "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi",
  "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey",
  "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma",
  "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington",
  "West Virginia", "Wisconsin", "Wyoming", "Washington D.C."
];

const riskColors = {
  low: "bg-emerald-100 text-emerald-800 border-emerald-200",
  medium: "bg-amber-100 text-amber-800 border-amber-200",
  high: "bg-red-100 text-red-800 border-red-200"
};

const riskBadge = {
  low: "text-emerald-600 border-emerald-300",
  medium: "text-amber-600 border-amber-300",
  high: "text-red-600 border-red-300"
};

function ConfidenceGauge({ score }) {
  const color = score >= 70 ? "text-emerald-600" : score >= 40 ? "text-amber-600" : "text-red-600";
  const barColor = score >= 70 ? "bg-emerald-500" : score >= 40 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${score}%` }} />
        </div>
      </div>
      <span className={`text-sm font-bold ${color}`}>{score}%</span>
    </div>
  );
}

function CanonCitationBadge({ citations }) {
  if (!citations || citations.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {citations.map((c, i) => (
        <span key={i} className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-mono ${c.is_gap ? "bg-red-50 border-red-300 text-red-700" : "bg-blue-50 border-blue-300 text-blue-700"}`}>
          {c.is_gap ? <XCircle className="w-2.5 h-2.5" /> : <BookOpen className="w-2.5 h-2.5" />}
          {c.citation}
          {c.is_gap && <span className="font-sans font-semibold">CANON GAP</span>}
        </span>
      ))}
    </div>
  );
}

export default function DecisionCompass() {
  const [tab, setTab] = useState("question");
  const [question, setQuestion] = useState("");
  const [situation, setSituation] = useState("");
  const [jurisdiction, setJurisdiction] = useState("North Carolina");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [workflow, setWorkflow] = useState("");
  const [workflowAnswers, setWorkflowAnswers] = useState({});
  const [savedRecordId, setSavedRecordId] = useState(null);
  const [pastRecords, setPastRecords] = useState([]);
  const [outcomeNote, setOutcomeNote] = useState("");
  const [savingOutcome, setSavingOutcome] = useState(false);
  const [canonEntries, setCanonEntries] = useState([]);

  useEffect(() => {
    base44.entities.DecisionRecord.list("-created_date", 20).then(r => setPastRecords(r)).catch(() => {});
    base44.entities.CanonEntry.filter({ status: "active", verified: true }, "-created_date", 100).then(setCanonEntries).catch(() => {});
  }, []);

  const saveRecord = async (analysisResult, q, sit, jur, benefitType) => {
    const rec = await base44.entities.DecisionRecord.create({
      question: q, situation: sit, jurisdiction: jur, benefit_type: benefitType || "",
      risk_level: analysisResult.risk_level,
      risk_triggers: analysisResult.risk_triggers || [],
      documentation_checklist: analysisResult.documentation_checklist || [],
      outcome_scenarios: analysisResult.outcome_scenarios || [],
      analysis_result: analysisResult, status: "analyzed"
    }).catch(() => null);
    if (rec) setSavedRecordId(rec.id);
  };

  const recordOutcome = async () => {
    if (!savedRecordId || !outcomeNote.trim()) return;
    setSavingOutcome(true);
    await base44.entities.DecisionRecord.update(savedRecordId, {
      actual_outcome: outcomeNote,
      outcome_date: new Date().toISOString().split("T")[0],
      status: "outcome_recorded"
    });
    setSavingOutcome(false);
    setOutcomeNote("");
    base44.entities.DecisionRecord.list("-created_date", 20).then(setPastRecords).catch(() => {});
  };

  const buildCanonContext = () => {
    if (canonEntries.length === 0) return "NC Canon: No verified entries available. AI will flag all legal references as potential Canon Gaps.";
    return `NC Canon Active Entries (${canonEntries.length} verified):\n` +
      canonEntries.slice(0, 15).map(e => `- ${e.title} (${e.citation || "no citation"}) [${e.category}]`).join("\n");
  };

  const basePrompt = `You are the NCOS Decision Compass — a preventive guidance system that helps people understand consequences before answering institutional questions or submitting forms.

CRITICAL RULES:
1. You are NOT providing legal advice. Educational risk awareness only.
2. NEVER fabricate legal citations. Only cite laws if you are highly confident they exist.
3. For any law you reference: check the Canon Context below. If the law is NOT in the Canon, mark it as canon_gap=true.
4. Your goal: help users pause and prepare BEFORE they answer — not represent them.
5. Be clear, calm, and empowering.

CANON CONTEXT:
${buildCanonContext()}

JURISDICTION: ${jurisdiction}`;

  const analyzeSchema = {
    type: "object",
    properties: {
      question_explained: { type: "string" },
      risk_triggers: { type: "array", items: { type: "string" } },
      risk_level: { type: "string" },
      confidence_score: { type: "number" },
      pause_before_submitting: { type: "boolean" },
      pause_reason: { type: "string" },
      consequence_warnings: { type: "array", items: { type: "string" } },
      documentation_checklist: { type: "array", items: { type: "string" } },
      safe_practices: { type: "array", items: { type: "string" } },
      what_to_avoid: { type: "array", items: { type: "string" } },
      outcome_scenarios: { type: "array", items: { type: "object", properties: { answer_type: { type: "string" }, likely_outcome: { type: "string" } } } },
      canon_citations: { type: "array", items: { type: "object", properties: { citation: { type: "string" }, relevance: { type: "string" }, is_gap: { type: "boolean" } } } },
      preventive_guidance: { type: "string" },
      disclaimer: { type: "string" }
    },
    required: ["question_explained", "risk_triggers", "risk_level", "confidence_score", "pause_before_submitting", "consequence_warnings", "documentation_checklist", "safe_practices", "what_to_avoid", "preventive_guidance", "disclaimer"]
  };

  const analyze = async () => {
    if (!question.trim() && !situation.trim()) return;
    setLoading(true); setResult(null); setSavedRecordId(null);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `${basePrompt}

USER SITUATION:
Question being asked: "${question}"
Full context: "${situation}"

Analyze and return:
- question_explained: What is this really asking and why
- risk_triggers: Specific answers/statements that could cause denial, investigation, or adverse review
- risk_level: "low" | "medium" | "high"
- confidence_score: 0-100, how confident you are in the guidance accuracy (lower if law is unclear/missing from Canon)
- pause_before_submitting: true if this question carries meaningful risk
- pause_reason: Why they should pause if applicable
- consequence_warnings: Common mistakes and their outcomes
- documentation_checklist: Documents to gather BEFORE answering
- safe_practices: Best practices for this type of question
- what_to_avoid: Specific things NOT to say or do
- outcome_scenarios: [{answer_type, likely_outcome}]
- canon_citations: [{citation, relevance, is_gap}] — only if genuinely applicable law exists; mark is_gap=true if not in Canon
- preventive_guidance: 2-3 paragraphs of educational guidance
- disclaimer: Not legal advice statement`,
      response_json_schema: analyzeSchema
    });
    setResult(res);
    await saveRecord(res, question, situation, jurisdiction, "");
    setLoading(false);
  };

  const analyzeWorkflow = async () => {
    if (!workflow) return;
    const wf = FORM_WORKFLOWS.find(w => w.value === workflow);
    if (!wf) return;
    setLoading(true); setResult(null);
    const answersText = wf.questions
      .filter(q => workflowAnswers[q.q]?.trim())
      .map(q => `Q (${q.risk} risk): ${q.q}\nA: ${workflowAnswers[q.q]}`)
      .join("\n\n");
    if (!answersText.trim()) { setLoading(false); return; }
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `${basePrompt}

FORM TYPE: ${wf.label}
USER'S PLANNED ANSWERS:
${answersText}

Analyze the full set of answers together for risk. Focus on:
- Cross-answer inconsistencies that could trigger investigation
- Documentation they need before submitting
- Common mistakes applicants make on this specific form type
- What answers could trigger denial, delay, or audit

Return using the same schema as a standard Decision Compass analysis.`,
      response_json_schema: analyzeSchema
    });
    setResult(res);
    await saveRecord(res, wf.label, answersText.slice(0, 500), jurisdiction, workflow);
    setLoading(false);
  };

  const wf = FORM_WORKFLOWS.find(w => w.value === workflow);
  const answeredCount = wf ? wf.questions.filter(q => workflowAnswers[q.q]?.trim()).length : 0;

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">NCOS · Decision Compass</p>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Compass className="w-6 h-6 text-cyan-500" />Decision Compass
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Understand consequences before you answer. Preventive guidance — not legal advice.</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-5 text-xs text-blue-800 flex items-start gap-2">
        <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
        <span><strong>Educational tool only.</strong> Decision Compass helps you understand risks before answering institutional questions. It does not provide legal advice or representation. Consult a licensed attorney for your specific situation.</span>
      </div>

      {canonEntries.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-5 text-xs text-amber-800 flex items-start gap-2">
          <BookOpen className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span><strong>NC Canon not yet loaded.</strong> Legal citations will be flagged as Canon Gaps. <a href="/canon-gap-resolver" className="underline font-semibold">Resolve gaps →</a></span>
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-5">
          <TabsTrigger value="question"><HelpCircle className="w-3.5 h-3.5 mr-1.5" />Question Analyzer</TabsTrigger>
          <TabsTrigger value="workflows"><ClipboardList className="w-3.5 h-3.5 mr-1.5" />Form Workflows</TabsTrigger>
          <TabsTrigger value="history"><FileText className="w-3.5 h-3.5 mr-1.5" />History ({pastRecords.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="question">
          <Card className="p-5 border border-border/60 mb-5">
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Question or Form Field</label>
                <Textarea value={question} onChange={e => setQuestion(e.target.value)} placeholder='Paste the exact question you were asked, e.g. "Did you voluntarily leave your last job?" or "Have you ever been convicted of a felony?"' rows={3} className="text-sm resize-none" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Your Situation / Context</label>
                <Textarea value={situation} onChange={e => setSituation(e.target.value)} placeholder="Describe what happened in your own words. What are the facts? What are you applying for? What concerns you about this question?" rows={4} className="text-sm resize-none" />
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground">Jurisdiction:</label>
                  <Select value={jurisdiction} onValueChange={setJurisdiction}>
                    <SelectTrigger className="h-8 w-48 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent className="max-h-60">{JURISDICTIONS.map(j => <SelectItem key={j} value={j} className="text-xs">{j}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <Button onClick={analyze} disabled={loading || (!question.trim() && !situation.trim())} className="ml-auto">
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-1.5" />Analyzing...</> : <><Compass className="w-4 h-4 mr-1.5" />Analyze Risk</>}
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="workflows">
          {/* Workflow selector */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
            {FORM_WORKFLOWS.map(w => (
              <Card
                key={w.value}
                onClick={() => { setWorkflow(w.value); setWorkflowAnswers({}); setResult(null); }}
                className={`p-3 cursor-pointer border transition-all ${workflow === w.value ? "border-primary bg-primary/5 shadow-sm" : "border-border/60 hover:border-primary/40"}`}
              >
                <p className="text-lg mb-1">{w.icon}</p>
                <p className="text-xs font-semibold">{w.label}</p>
                <p className="text-[10px] text-muted-foreground">{w.description}</p>
              </Card>
            ))}
          </div>

          {wf && (
            <Card className="p-5 border border-border/60">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">{wf.icon} {wf.label} — Answer Each Question</h3>
                <Badge variant="outline" className="text-xs">{answeredCount}/{wf.questions.length} answered</Badge>
              </div>
              <div className="space-y-4 mb-4">
                {wf.questions.map(q => (
                  <div key={q.q} className={`p-3 rounded-lg border ${q.risk === "high" ? "border-red-200 bg-red-50" : q.risk === "medium" ? "border-amber-200 bg-amber-50" : "border-border/60"}`}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <label className="text-xs font-semibold">{q.q}</label>
                      <Badge variant="outline" className={`text-[9px] flex-shrink-0 capitalize ${riskBadge[q.risk]}`}>{q.risk} risk</Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground mb-2 flex items-start gap-1">
                      <Info className="w-3 h-3 flex-shrink-0 mt-0.5" />{q.why}
                    </p>
                    <Textarea
                      value={workflowAnswers[q.q] || ""}
                      onChange={e => setWorkflowAnswers(prev => ({ ...prev, [q.q]: e.target.value }))}
                      rows={2}
                      className="text-sm resize-none"
                      placeholder="What would you answer..."
                    />
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground">Jurisdiction:</label>
                  <Select value={jurisdiction} onValueChange={setJurisdiction}>
                    <SelectTrigger className="h-8 w-44 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent className="max-h-60">{JURISDICTIONS.map(j => <SelectItem key={j} value={j} className="text-xs">{j}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <Button onClick={analyzeWorkflow} disabled={loading || answeredCount === 0} className="ml-auto">
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-1.5" />Analyzing...</> : <><Shield className="w-4 h-4 mr-1.5" />Analyze My Answers</>}
                </Button>
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history">
          {pastRecords.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border rounded-lg">
              <FileText className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-30" />
              <p className="text-sm text-muted-foreground">No past analyses yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pastRecords.map(r => (
                <Card key={r.id} className="p-3 border border-border/60">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-clamp-2">{r.question}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {r.risk_level && <Badge variant="outline" className={`text-[9px] capitalize ${riskBadge[r.risk_level]}`}>{r.risk_level} risk</Badge>}
                        {r.jurisdiction && <span className="text-[9px] text-muted-foreground">{r.jurisdiction}</span>}
                        <Badge variant="secondary" className="text-[9px] capitalize">{(r.status || "analyzed").replace(/_/g, " ")}</Badge>
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground flex-shrink-0">{r.created_date ? new Date(r.created_date).toLocaleDateString() : ""}</span>
                  </div>
                  {r.actual_outcome && (
                    <div className="mt-2 pt-2 border-t border-border/40">
                      <p className="text-xs text-emerald-700"><CheckCircle className="w-3 h-3 inline mr-1" />Outcome: {r.actual_outcome}</p>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {result && (
        <div className="space-y-4 mt-4">
          {/* Pause before submitting banner */}
          {result.pause_before_submitting && (
            <div className="flex items-center gap-3 p-4 rounded-xl border-2 border-red-400 bg-red-50">
              <Pause className="w-6 h-6 text-red-600 flex-shrink-0" />
              <div>
                <p className="font-bold text-red-800">⛔ Pause Before Submitting</p>
                <p className="text-sm text-red-700 mt-0.5">{result.pause_reason || "This question carries elevated risk. Review all guidance below before answering."}</p>
              </div>
            </div>
          )}

          {/* Risk level + confidence */}
          <div className={`p-4 rounded-xl border ${riskColors[result.risk_level] || riskColors.medium}`}>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <div>
                  <p className="font-bold text-sm capitalize">{result.risk_level} Risk Level</p>
                  <p className="text-xs mt-0.5">{result.question_explained}</p>
                </div>
              </div>
              <div className="min-w-[160px]">
                <p className="text-[10px] font-semibold uppercase mb-1">Guidance Confidence</p>
                <ConfidenceGauge score={result.confidence_score || 0} />
                {(result.confidence_score || 0) < 50 && (
                  <p className="text-[10px] mt-1 opacity-70">Low confidence — verify with an attorney</p>
                )}
              </div>
            </div>
          </div>

          {/* Canon citations */}
          {(result.canon_citations || []).length > 0 && (
            <Card className="p-4 border border-blue-200 bg-blue-50">
              <p className="text-xs font-bold text-blue-700 uppercase mb-2 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" />Legal Authorities Referenced
              </p>
              <div className="space-y-2">
                {result.canon_citations.map((c, i) => (
                  <div key={i} className={`flex items-start gap-2 p-2.5 rounded-lg border text-xs ${c.is_gap ? "border-red-200 bg-red-50" : "border-blue-200 bg-white"}`}>
                    {c.is_gap
                      ? <XCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                      : <BookOpen className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />}
                    <div>
                      <span className="font-mono font-semibold">{c.citation}</span>
                      {c.is_gap && <Badge variant="outline" className="ml-2 text-[9px] text-red-600 border-red-300">CANON GAP</Badge>}
                      {c.relevance && <p className="text-muted-foreground mt-0.5">{c.relevance}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Risk triggers */}
          {(result.risk_triggers || []).length > 0 && (
            <Card className="p-4 border border-red-200 bg-red-50">
              <p className="text-xs font-bold text-red-700 uppercase mb-2 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" />Answers That May Trigger Review or Denial</p>
              <ul className="space-y-1.5">{result.risk_triggers.map((t, i) => <li key={i} className="text-sm text-red-800 flex items-start gap-2"><span className="text-red-400 font-bold flex-shrink-0">⚠</span>{t}</li>)}</ul>
            </Card>
          )}

          {/* Documentation checklist */}
          {(result.documentation_checklist || []).length > 0 && (
            <Card className="p-4 border border-border/60">
              <p className="text-xs font-bold text-muted-foreground uppercase mb-2 flex items-center gap-1"><FileText className="w-3.5 h-3.5" />Documents to Gather Before Answering</p>
              <ul className="space-y-1.5">{result.documentation_checklist.map((d, i) => <li key={i} className="text-sm flex items-start gap-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />{d}</li>)}</ul>
            </Card>
          )}

          {/* Consequence warnings */}
          {(result.consequence_warnings || []).length > 0 && (
            <Card className="p-4 border border-amber-200 bg-amber-50">
              <p className="text-xs font-bold text-amber-800 uppercase mb-2">Common Mistakes & Consequences</p>
              <ul className="space-y-1.5">{result.consequence_warnings.map((w, i) => <li key={i} className="text-sm text-amber-800 flex items-start gap-2"><span className="flex-shrink-0">•</span>{w}</li>)}</ul>
            </Card>
          )}

          {/* Safe practices + what to avoid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(result.safe_practices || []).length > 0 && (
              <Card className="p-4 border border-emerald-200 bg-emerald-50">
                <p className="text-xs font-bold text-emerald-700 uppercase mb-2">✓ Best Practices</p>
                <ul className="space-y-1.5">{result.safe_practices.map((s, i) => <li key={i} className="text-sm text-emerald-800 flex items-start gap-2"><span className="flex-shrink-0">→</span>{s}</li>)}</ul>
              </Card>
            )}
            {(result.what_to_avoid || []).length > 0 && (
              <Card className="p-4 border border-red-200 bg-red-50">
                <p className="text-xs font-bold text-red-700 uppercase mb-2">✗ What to Avoid</p>
                <ul className="space-y-1.5">{result.what_to_avoid.map((a, i) => <li key={i} className="text-sm text-red-800 flex items-start gap-2"><span className="flex-shrink-0">✗</span>{a}</li>)}</ul>
              </Card>
            )}
          </div>

          {/* Outcome scenarios */}
          {(result.outcome_scenarios || []).length > 0 && (
            <Card className="p-4 border border-border/60">
              <p className="text-xs font-bold text-muted-foreground uppercase mb-3">Outcome Scenarios</p>
              <div className="space-y-2">
                {result.outcome_scenarios.map((s, i) => (
                  <div key={i} className="flex items-start gap-3 p-2.5 bg-muted rounded-lg text-sm">
                    <Badge variant="outline" className="text-[10px] flex-shrink-0 mt-0.5">{s.answer_type}</Badge>
                    <span className="text-muted-foreground">{s.likely_outcome}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Preventive guidance */}
          {result.preventive_guidance && (
            <Card className="p-4 border border-blue-200 bg-blue-50">
              <p className="text-xs font-bold text-blue-700 uppercase mb-2 flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" />Preventive Guidance</p>
              <div className="text-sm text-blue-900 leading-relaxed prose prose-sm max-w-none">
                <ReactMarkdown>{result.preventive_guidance}</ReactMarkdown>
              </div>
            </Card>
          )}

          {/* Outcome tracking */}
          {savedRecordId && (
            <Card className="p-4 border border-violet-200 bg-violet-50">
              <p className="text-xs font-bold text-violet-700 uppercase mb-2">📊 Track Outcome — What Actually Happened?</p>
              <p className="text-xs text-violet-700 mb-2">Recording outcomes helps NCOS learn which guidance was accurate. Completely optional.</p>
              <div className="flex gap-2">
                <input value={outcomeNote} onChange={e => setOutcomeNote(e.target.value)} placeholder="e.g. Benefits approved, denied, still pending..." className="flex-1 border border-violet-300 rounded px-2 py-1 text-xs bg-white" />
                <Button size="sm" className="text-xs" onClick={recordOutcome} disabled={savingOutcome || !outcomeNote.trim()}>{savingOutcome ? "Saving..." : "Record"}</Button>
              </div>
            </Card>
          )}

          {/* Disclaimer */}
          <div className="bg-slate-100 border border-slate-200 rounded-lg p-3 text-xs text-slate-600 flex items-start gap-2">
            <Shield className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-slate-500" />
            <span>{result.disclaimer || "This analysis is for educational purposes only and does not constitute legal advice. Consult a licensed attorney for representation or legal guidance specific to your situation."}</span>
          </div>
        </div>
      )}
    </div>
  );
}