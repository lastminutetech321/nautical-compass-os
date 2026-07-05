import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Scale, Search, FileText, AlertTriangle, CheckCircle, Loader2,
  BookOpen, Brain
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ReactMarkdown from "react-markdown";

const CAPABILITIES = [
  { value: "issue_spotting", label: "Issue Spotting", icon: "🔍", desc: "Identify all legal issues in a fact pattern" },
  { value: "statute_search", label: "Statute Search", icon: "📜", desc: "Find and explain relevant statutes" },
  { value: "case_search", label: "Case Search", icon: "⚖️", desc: "Locate applicable case law" },
  { value: "standing", label: "Standing Analysis", icon: "🏛️", desc: "Analyze Article III standing" },
  { value: "jurisdiction", label: "Jurisdiction Analysis", icon: "🗺️", desc: "Subject matter & personal jurisdiction" },
  { value: "capacity", label: "Capacity Analysis", icon: "👤", desc: "Capacity to sue, Ex parte Young" },
  { value: "immunity", label: "Immunity Analysis", icon: "🛡️", desc: "Qualified, sovereign, and § 11A immunity" },
  { value: "civil_rights", label: "Civil Rights Review", icon: "✊", desc: "§1983, Title VII, ADA, civil rights claims" },
  { value: "foia", label: "FOIA Assistant", icon: "📂", desc: "FOIA rights, exemptions, procedures" },
  { value: "evidence_review", label: "Evidence Review", icon: "🔬", desc: "Evidence standards and admissibility" },
  { value: "contradiction", label: "Contradiction Detection", icon: "⚡", desc: "Conflicts between authorities" },
  { value: "timeline", label: "Timeline Analysis", icon: "📅", desc: "Deadlines, limitations, chronology" },
  { value: "memo", label: "Research Memo", icon: "📄", desc: "Full legal research memorandum" },
  { value: "motion", label: "Motion Draft", icon: "⚖️", desc: "Legal argument section for motions" },
  { value: "complaint", label: "Complaint Assistant", icon: "📋", desc: "Complaint allegations and causes of action" },
  { value: "discovery", label: "Discovery Planner", icon: "🗂️", desc: "Interrogatories, doc requests, depositions" },
  { value: "strategy", label: "Case Strategy", icon: "♟️", desc: "Strengths, weaknesses, recommendations" },
  { value: "questions", label: "Question Generator", icon: "❓", desc: "Investigative and legal questions" },
];

export default function JurisEngine() {
  const [capability, setCapability] = useState("issue_spotting");
  const [query, setQuery] = useState("");
  const [context, setContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [memos, setMemos] = useState([]);
  const [canonCount, setCanonCount] = useState(0);
  const [saveMemo, setSaveMemo] = useState(false);
  const [selectedMemo, setSelectedMemo] = useState(null);

  useEffect(() => {
    base44.entities.CanonEntry.filter({ status: "active" }, "-created_date", 500).then(r => setCanonCount(r.length)).catch(() => {});
    base44.entities.ResearchMemo.list("-created_date", 20).then(setMemos).catch(() => {});
  }, []);

  const run = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await base44.functions.invoke("jurisEngine", { capability, query, context, save_memo: saveMemo });
      setResult(res.data);
      if (saveMemo) {
        const updated = await base44.entities.ResearchMemo.list("-created_date", 20);
        setMemos(updated);
      }
    } catch (err) {
      setResult({ success: false, canon_gap: true, message: "JurisEngine error: " + err.message });
    }
    setLoading(false);
  };

  const cap = CAPABILITIES.find(c => c.value === capability);

  return (
    <div>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">NCOS · Legal AI</p>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Scale className="w-6 h-6 text-amber-500" />JurisEngine
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Canon-backed legal research — zero fabrication policy</p>
        </div>
        <Badge variant="outline" className={`text-xs ${canonCount > 0 ? "border-emerald-300 text-emerald-700" : "border-red-300 text-red-700"}`}>
          {canonCount > 0 ? <CheckCircle className="w-3 h-3 mr-1 inline" /> : <AlertTriangle className="w-3 h-3 mr-1 inline" />}
          {canonCount} verified Canon entries
        </Badge>
      </div>

      {canonCount === 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-5 text-sm text-red-800 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <strong>Canon is empty.</strong> JurisEngine requires verified Canon entries to function. Every query will return CANON GAP until you upload and verify legal authorities.{" "}
            <a href="/canon-ingestion" className="underline font-medium">Go to Canon Ingestion →</a>
          </div>
        </div>
      )}

      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 mb-5 text-xs text-amber-800 flex items-center gap-2">
        <BookOpen className="w-3.5 h-3.5 flex-shrink-0" />
        <span><strong>Fabrication policy:</strong> JurisEngine only cites verified Canon entries. Missing authorities are flagged as CANON GAP — never synthesized.</span>
      </div>

      <Tabs defaultValue="research">
        <TabsList className="mb-5">
          <TabsTrigger value="research"><Search className="w-3.5 h-3.5 mr-1.5" />Research</TabsTrigger>
          <TabsTrigger value="memos"><FileText className="w-3.5 h-3.5 mr-1.5" />Saved Memos ({memos.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="research">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Capability selector */}
            <div className="lg:col-span-1 space-y-0.5 max-h-[calc(100vh-16rem)] overflow-y-auto pr-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Capability</p>
              {CAPABILITIES.map(c => (
                <button
                  key={c.value}
                  onClick={() => setCapability(c.value)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all border ${
                    capability === c.value ? "bg-primary/10 border-primary/30 text-primary font-medium" : "border-transparent hover:bg-muted"
                  }`}
                >
                  <span className="mr-1.5">{c.icon}</span>{c.label}
                </button>
              ))}
            </div>

            {/* Query panel */}
            <div className="lg:col-span-3 space-y-4">
              <Card className="p-4 border border-border/60">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">{cap?.icon}</span>
                  <div>
                    <p className="text-sm font-semibold">{cap?.label}</p>
                    <p className="text-xs text-muted-foreground">{cap?.desc}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Query / Facts</label>
                    <Textarea value={query} onChange={e => setQuery(e.target.value)} placeholder={`Describe the legal issue, fact pattern, or question for ${cap?.label}...`} rows={4} className="text-sm resize-none" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Additional Context (optional)</label>
                    <Textarea value={context} onChange={e => setContext(e.target.value)} placeholder="Case history, prior rulings, jurisdiction details..." rows={2} className="text-sm resize-none" />
                  </div>
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={saveMemo} onChange={e => setSaveMemo(e.target.checked)} className="rounded" />
                      Save as Research Memo
                    </label>
                    <Button onClick={run} disabled={loading || !query.trim()}>
                      {loading ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Analyzing...</> : <><Brain className="w-4 h-4 mr-1.5" />Run JurisEngine</>}
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Result */}
              {result && (
                <Card className={`p-5 border ${result.canon_gap ? "border-red-200 bg-red-50" : "border-emerald-200"}`}>
                  {result.canon_gap ? (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                        <p className="font-semibold text-red-800">CANON GAP DETECTED</p>
                      </div>
                      <p className="text-sm text-red-700 mb-3">{result.message}</p>
                      {(result.matched_gaps || []).length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-red-600 mb-1">KNOWN GAPS:</p>
                          <div className="space-y-1">
                            {result.matched_gaps.map((g) => (
                              <div key={g.id} className="text-xs bg-white border border-red-200 rounded px-2 py-1">{g.title}</div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                          <p className="text-sm font-semibold text-emerald-800">{cap?.label} — Canon Analysis</p>
                        </div>
                        <Badge className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200">⚠️ Informational Only — Not Legal Advice</Badge>
                      </div>
                      <div className="prose prose-sm max-w-none text-sm leading-relaxed">
                        <ReactMarkdown>{result.analysis}</ReactMarkdown>
                      </div>
                      {(result.canon_entries_cited || []).length > 0 && (
                        <div className="mt-4 pt-4 border-t border-border/50">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Canon Entries Cited ({result.canon_entries_cited.length})</p>
                          <div className="flex flex-wrap gap-1.5">
                            {result.canon_entries_cited.map((e) => (
                              <Badge key={e.id} variant="outline" className="text-[10px]">{e.citation || e.title}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {result.memo_id && (
                        <div className="mt-3 p-2 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-700">
                          <FileText className="w-3 h-3 inline mr-1" />Saved to Research Memos
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="memos">
          {memos.length === 0 ? (
            <div className="text-center py-16">
              <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
              <p className="text-muted-foreground text-sm">No research memos yet. Run a JurisEngine query with "Save as Memo" checked.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="space-y-2 max-h-[calc(100vh-14rem)] overflow-y-auto">
                {memos.map(m => (
                  <Card key={m.id} className={`p-3 cursor-pointer transition-all ${selectedMemo?.id === m.id ? "border-primary" : "border-border/60 hover:shadow-sm"}`} onClick={() => setSelectedMemo(m)}>
                    <p className="text-xs font-medium line-clamp-2">{m.title}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge variant="outline" className="text-[9px]">{(m.memo_type || "").replace(/_/g, " ")}</Badge>
                      <Badge variant="outline" className="text-[9px] capitalize">{m.status}</Badge>
                    </div>
                    {m.is_informational && <p className="text-[9px] text-amber-600 mt-1">⚠️ Informational only</p>}
                  </Card>
                ))}
              </div>
              {selectedMemo && (
                <div className="lg:col-span-2">
                  <Card className="p-5 border border-border/60 max-h-[calc(100vh-14rem)] overflow-y-auto">
                    <h3 className="font-semibold text-sm mb-1">{selectedMemo.title}</h3>
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <Badge variant="outline" className="text-[10px]">{(selectedMemo.memo_type || "").replace(/_/g, " ")}</Badge>
                      <Badge className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200">⚠️ Informational Only</Badge>
                    </div>
                    {selectedMemo.question_presented && <div className="mb-3"><p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Question Presented</p><p className="text-sm bg-muted p-2 rounded">{selectedMemo.question_presented}</p></div>}
                    {selectedMemo.analysis && (
                      <div className="prose prose-sm max-w-none text-sm">
                        <ReactMarkdown>{selectedMemo.analysis}</ReactMarkdown>
                      </div>
                    )}
                  </Card>
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}