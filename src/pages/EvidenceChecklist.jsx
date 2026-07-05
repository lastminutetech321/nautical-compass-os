import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  ClipboardList, Loader2, CheckCircle, AlertTriangle, XCircle,
  FileText, Clock, Shield, RefreshCw, BookOpen, Search
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import PageHeader from "@/components/shared/PageHeader";

const MATTER_TYPES = [
  { value: "unemployment_appeal", label: "Unemployment Appeal" },
  { value: "eviction_defense", label: "Eviction Defense" },
  { value: "benefits_denial", label: "Benefits Denial Appeal" },
  { value: "workplace_dispute", label: "Workplace / Employment Dispute" },
  { value: "civil_rights", label: "Civil Rights Complaint" },
  { value: "consumer_protection", label: "Consumer Protection / Debt" },
  { value: "housing_complaint", label: "Housing Complaint" },
  { value: "court_filing", label: "Court Filing" },
  { value: "insurance_claim", label: "Insurance Claim / Dispute" },
  { value: "foia_request", label: "FOIA / Public Records Request" },
  { value: "other", label: "Other Matter" },
];

const statusIcon = (s) => {
  if (s === "have") return <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />;
  if (s === "missing") return <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />;
  return <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />;
};

export default function EvidenceChecklist() {
  const [caseName, setCaseName] = useState("");
  const [matterType, setMatterType] = useState("");
  const [situation, setSituation] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [itemStatus, setItemStatus] = useState({});
  const [vaultItems, setVaultItems] = useState([]);
  const [savedChecklists, setSavedChecklists] = useState([]);
  const [selectedCase, setSelectedCase] = useState(null);

  useEffect(() => {
    base44.entities.Evidence.list("-created_date", 200).then(setVaultItems).catch(() => {});
    base44.entities.AgentTask.filter({ task_type: "organize", agent_name: "evidence_checklist" }, "-created_date", 20)
      .then(setSavedChecklists).catch(() => {});
  }, []);

  const vaultByCase = {};
  vaultItems.forEach(v => {
    const key = v.case_name || "Uncategorized";
    if (!vaultByCase[key]) vaultByCase[key] = [];
    vaultByCase[key].push(v);
  });
  const caseNames = Object.keys(vaultByCase);

  const generate = async () => {
    if (!matterType || !situation.trim()) return;
    setLoading(true);
    setResult(null);
    setItemStatus({});

    const vaultForCase = caseName ? (vaultByCase[caseName] || []) : [];
    const vaultSummary = vaultForCase.map(v => `- ${v.title} (${v.category}, source: ${v.source || "unknown"})`).join("\n") || "None uploaded yet";

    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are the NCOS Evidence Checklist Engine — a system that helps people understand what evidence they need for their legal or administrative matter.

IMPORTANT: Do NOT provide legal advice. Do NOT cite specific statutes unless you are certain they exist. This is educational guidance only.

MATTER TYPE: ${MATTER_TYPES.find(m => m.value === matterType)?.label || matterType}
CASE NAME: ${caseName || "Not specified"}
SITUATION: ${situation}

EVIDENCE ALREADY IN VAULT:
${vaultSummary}

Generate a comprehensive evidence checklist for this type of matter. Return:

1. required_evidence: Array of {item, why_needed, priority: "critical"|"important"|"helpful", source_hint, preservation_tip} — documents that are typically essential
2. missing_from_vault: Array of item names likely missing based on vault contents
3. recommended_documents: Array of {item, purpose, how_to_obtain} — official records worth requesting
4. preservation_steps: Array of step-by-step instructions to preserve existing evidence
5. timeline_gaps: Array of {period, what_is_missing, why_it_matters} — time periods where evidence gaps exist
6. source_reliability_warnings: Array of {source_type, warning, mitigation} — warnings about unreliable evidence types
7. strongest_evidence: Array of items that would be most powerful if obtained
8. summary: 2-3 sentence overview of the evidence situation
9. urgency_note: Any time-sensitive preservation issues (e.g., surveillance footage, electronic records that get deleted)
10. disclaimer: This is educational guidance only, not legal advice.`,
      response_json_schema: {
        type: "object",
        properties: {
          required_evidence: {
            type: "array",
            items: {
              type: "object",
              properties: {
                item: { type: "string" },
                why_needed: { type: "string" },
                priority: { type: "string" },
                source_hint: { type: "string" },
                preservation_tip: { type: "string" }
              }
            }
          },
          missing_from_vault: { type: "array", items: { type: "string" } },
          recommended_documents: {
            type: "array",
            items: {
              type: "object",
              properties: {
                item: { type: "string" },
                purpose: { type: "string" },
                how_to_obtain: { type: "string" }
              }
            }
          },
          preservation_steps: { type: "array", items: { type: "string" } },
          timeline_gaps: {
            type: "array",
            items: {
              type: "object",
              properties: {
                period: { type: "string" },
                what_is_missing: { type: "string" },
                why_it_matters: { type: "string" }
              }
            }
          },
          source_reliability_warnings: {
            type: "array",
            items: {
              type: "object",
              properties: {
                source_type: { type: "string" },
                warning: { type: "string" },
                mitigation: { type: "string" }
              }
            }
          },
          strongest_evidence: { type: "array", items: { type: "string" } },
          summary: { type: "string" },
          urgency_note: { type: "string" },
          disclaimer: { type: "string" }
        },
        required: ["required_evidence", "preservation_steps", "summary", "disclaimer"]
      }
    });

    setResult(res);
    setLoading(false);
  };

  const priorityColor = {
    critical: "text-red-700 bg-red-50 border-red-200",
    important: "text-amber-700 bg-amber-50 border-amber-200",
    helpful: "text-emerald-700 bg-emerald-50 border-emerald-200"
  };

  const toggleStatus = (item, status) => {
    setItemStatus(prev => ({
      ...prev,
      [item]: prev[item] === status ? "pending" : status
    }));
  };

  const checkedCount = Object.values(itemStatus).filter(s => s === "have").length;
  const totalItems = result ? (result.required_evidence || []).length : 0;

  return (
    <div>
      <PageHeader
        title="Evidence Checklist Engine"
        subtitle="Know exactly what evidence you need — before you need it."
      />

      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-5 text-xs text-blue-800 flex items-start gap-2">
        <Shield className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
        <span><strong>Educational tool only.</strong> This checklist is based on general guidance for this type of matter. It does not constitute legal advice. Consult a licensed attorney to determine what evidence is appropriate for your specific situation.</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        <div className="lg:col-span-2">
          <Card className="p-5 border border-border/60">
            <h3 className="text-sm font-semibold mb-4">Generate Evidence Checklist</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Matter Type <span className="text-red-500">*</span></Label>
                  <Select value={matterType} onValueChange={setMatterType}>
                    <SelectTrigger className="text-sm mt-1">
                      <SelectValue placeholder="Select matter type..." />
                    </SelectTrigger>
                    <SelectContent>
                      {MATTER_TYPES.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Case Name (optional)</Label>
                  <Select value={caseName} onValueChange={setCaseName}>
                    <SelectTrigger className="text-sm mt-1">
                      <SelectValue placeholder="Link to existing case..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>No case selected</SelectItem>
                      {caseNames.map(c => (
                        <SelectItem key={c} value={c}>{c} ({vaultByCase[c].length} items)</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Describe the Situation <span className="text-red-500">*</span></Label>
                <Textarea
                  value={situation}
                  onChange={e => setSituation(e.target.value)}
                  placeholder="Describe what happened. What stage is this at? What outcome are you seeking? What evidence do you already have?"
                  rows={4}
                  className="text-sm resize-none mt-1"
                />
              </div>
              <Button onClick={generate} disabled={loading || !matterType || !situation.trim()} className="w-full">
                {loading
                  ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Generating Checklist...</>
                  : <><ClipboardList className="w-4 h-4 mr-2" />Generate Evidence Checklist</>}
              </Button>
            </div>
          </Card>
        </div>

        <div>
          <Card className="p-4 border border-border/60 h-full">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />Evidence Vault Summary
            </h3>
            {caseNames.length === 0 ? (
              <div className="text-center py-6">
                <FileText className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-30" />
                <p className="text-xs text-muted-foreground">No evidence uploaded yet</p>
                <Button size="sm" variant="outline" className="mt-3 text-xs" onClick={() => window.location.href = "/evidence"}>Go to Evidence Vault</Button>
              </div>
            ) : (
              <div className="space-y-2">
                {caseNames.slice(0, 6).map(c => (
                  <div key={c} className="flex items-center justify-between p-2 bg-muted rounded-lg text-xs">
                    <span className="font-medium truncate">{c}</span>
                    <Badge variant="secondary" className="text-[10px] flex-shrink-0 ml-2">{vaultByCase[c].length}</Badge>
                  </div>
                ))}
                {caseNames.length > 6 && <p className="text-[10px] text-muted-foreground">+{caseNames.length - 6} more cases</p>}
              </div>
            )}
          </Card>
        </div>
      </div>

      {result && (
        <div className="space-y-5">
          {/* Summary + progress */}
          <Card className="p-5 border border-border/60">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1">
                <p className="text-xs font-bold text-muted-foreground uppercase mb-1">Checklist Summary</p>
                <p className="text-sm leading-relaxed">{result.summary}</p>
              </div>
              {totalItems > 0 && (
                <div className="text-center flex-shrink-0">
                  <p className="text-2xl font-bold">{checkedCount}/{totalItems}</p>
                  <p className="text-xs text-muted-foreground">items secured</p>
                </div>
              )}
            </div>
            {result.urgency_note && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-800"><strong>⏰ Time-Sensitive:</strong> {result.urgency_note}</p>
              </div>
            )}
          </Card>

          {/* Required evidence checklist */}
          {(result.required_evidence || []).length > 0 && (
            <Card className="p-5 border border-border/60">
              <p className="text-xs font-bold text-muted-foreground uppercase mb-3 flex items-center gap-2">
                <ClipboardList className="w-4 h-4" />Required Evidence ({result.required_evidence.length} items)
              </p>
              <div className="space-y-2">
                {result.required_evidence.map((ev, i) => (
                  <div key={i} className={`p-3 rounded-lg border ${priorityColor[ev.priority] || priorityColor.helpful}`}>
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="text-sm font-semibold">{ev.item}</p>
                          <Badge variant="outline" className={`text-[9px] capitalize ${ev.priority === "critical" ? "border-red-300 text-red-700" : ev.priority === "important" ? "border-amber-300 text-amber-700" : "border-emerald-300 text-emerald-700"}`}>{ev.priority}</Badge>
                        </div>
                        <p className="text-xs opacity-80 mb-1">{ev.why_needed}</p>
                        {ev.source_hint && <p className="text-[10px] opacity-70"><strong>Source:</strong> {ev.source_hint}</p>}
                        {ev.preservation_tip && <p className="text-[10px] opacity-70"><strong>Preserve:</strong> {ev.preservation_tip}</p>}
                      </div>
                      <div className="flex flex-col gap-1 flex-shrink-0">
                        <button
                          onClick={() => toggleStatus(ev.item, "have")}
                          className={`text-[9px] px-2 py-0.5 rounded border transition-all ${itemStatus[ev.item] === "have" ? "bg-emerald-500 text-white border-emerald-500" : "border-border text-muted-foreground hover:border-emerald-400"}`}
                        >✓ Have</button>
                        <button
                          onClick={() => toggleStatus(ev.item, "missing")}
                          className={`text-[9px] px-2 py-0.5 rounded border transition-all ${itemStatus[ev.item] === "missing" ? "bg-red-500 text-white border-red-500" : "border-border text-muted-foreground hover:border-red-400"}`}
                        >✗ Missing</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Missing from vault */}
          {(result.missing_from_vault || []).length > 0 && (
            <Card className="p-4 border border-red-200 bg-red-50">
              <p className="text-xs font-bold text-red-700 uppercase mb-2 flex items-center gap-2">
                <XCircle className="w-4 h-4" />Likely Missing from Your Vault
              </p>
              <div className="flex flex-wrap gap-2">
                {result.missing_from_vault.map((m, i) => (
                  <Badge key={i} variant="outline" className="text-xs text-red-700 border-red-300 bg-white">{m}</Badge>
                ))}
              </div>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Recommended documents */}
            {(result.recommended_documents || []).length > 0 && (
              <Card className="p-4 border border-border/60">
                <p className="text-xs font-bold text-muted-foreground uppercase mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" />Recommended Documents to Request
                </p>
                <div className="space-y-3">
                  {result.recommended_documents.map((d, i) => (
                    <div key={i} className="text-xs border-l-2 border-primary/30 pl-3">
                      <p className="font-semibold">{d.item}</p>
                      <p className="text-muted-foreground">{d.purpose}</p>
                      {d.how_to_obtain && <p className="text-primary/70 mt-0.5">→ {d.how_to_obtain}</p>}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Preservation steps */}
            {(result.preservation_steps || []).length > 0 && (
              <Card className="p-4 border border-border/60">
                <p className="text-xs font-bold text-muted-foreground uppercase mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4" />Preservation Steps
                </p>
                <ol className="space-y-2">
                  {result.preservation_steps.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs">
                      <span className="font-bold text-primary flex-shrink-0">{i + 1}.</span>
                      <span className="text-muted-foreground">{s}</span>
                    </li>
                  ))}
                </ol>
              </Card>
            )}
          </div>

          {/* Timeline gaps */}
          {(result.timeline_gaps || []).length > 0 && (
            <Card className="p-4 border border-amber-200 bg-amber-50">
              <p className="text-xs font-bold text-amber-800 uppercase mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" />Timeline Gaps
              </p>
              <div className="space-y-2">
                {result.timeline_gaps.map((g, i) => (
                  <div key={i} className="flex items-start gap-3 text-xs text-amber-800 bg-white/60 rounded p-2.5 border border-amber-200">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold">{g.period}:</span> {g.what_is_missing}
                      {g.why_it_matters && <p className="mt-0.5 opacity-80">→ {g.why_it_matters}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Source reliability warnings */}
          {(result.source_reliability_warnings || []).length > 0 && (
            <Card className="p-4 border border-border/60">
              <p className="text-xs font-bold text-muted-foreground uppercase mb-3">Source Reliability Warnings</p>
              <div className="space-y-2">
                {result.source_reliability_warnings.map((w, i) => (
                  <div key={i} className="text-xs p-2.5 bg-muted rounded-lg">
                    <span className="font-semibold">{w.source_type}:</span> {w.warning}
                    {w.mitigation && <p className="text-emerald-700 mt-1">✓ Mitigation: {w.mitigation}</p>}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Strongest evidence */}
          {(result.strongest_evidence || []).length > 0 && (
            <Card className="p-4 border border-emerald-200 bg-emerald-50">
              <p className="text-xs font-bold text-emerald-700 uppercase mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />Strongest Evidence if Obtained
              </p>
              <div className="flex flex-wrap gap-2">
                {result.strongest_evidence.map((s, i) => (
                  <Badge key={i} variant="outline" className="text-xs text-emerald-700 border-emerald-300 bg-white">{s}</Badge>
                ))}
              </div>
            </Card>
          )}

          {/* Disclaimer */}
          <div className="bg-slate-100 border border-slate-200 rounded-lg p-3 text-xs text-slate-600 flex items-start gap-2">
            <Shield className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span>{result.disclaimer || "This checklist is for educational purposes only. It does not constitute legal advice. Consult a licensed attorney to evaluate your specific evidence needs."}</span>
          </div>
        </div>
      )}
    </div>
  );
}