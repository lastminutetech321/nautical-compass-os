import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Scale, CheckCircle, AlertTriangle, Loader2, BookOpen, Play,
  PlayCircle, RotateCcw, Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import ReactMarkdown from "react-markdown";
import moment from "moment";

const TEST_QUERIES = [
  { id: "sec1983", label: "42 U.S.C. § 1983", category: "civil_rights", capability: "civil_rights", query: "What are the elements required to state a claim under 42 U.S.C. § 1983? What must a plaintiff show to establish a constitutional deprivation under color of state law?" },
  { id: "standing", label: "Article III Standing", category: "standing_doctrine", capability: "standing", query: "What are the three constitutional requirements for Article III standing? Explain injury-in-fact, causation, and redressability." },
  { id: "capacity", label: "Capacity to Sue / Ex parte Young", category: "capacity_doctrine", capability: "capacity", query: "Explain the Ex parte Young doctrine. When may a federal court enjoin a state official from enforcing an unconstitutional state law?" },
  { id: "foia", label: "FOIA — 5 U.S.C. § 552", category: "foia_guide", capability: "foia", query: "What rights does FOIA (5 U.S.C. § 552) provide to requestors? What are the nine exemptions from disclosure? What are agency response time requirements?" },
  { id: "fcra", label: "FCRA — Fair Credit Reporting Act", category: "consumer_protection", capability: "statute_search", query: "What are a consumer's rights under the Fair Credit Reporting Act (FCRA)? What are the obligations of credit reporting agencies and furnishers of information?" },
  { id: "fdcpa", label: "FDCPA — Fair Debt Collection Practices Act", category: "consumer_protection", capability: "statute_search", query: "What practices does the FDCPA prohibit? What are a debtor's rights under the FDCPA and what remedies are available for violations?" },
  { id: "tila", label: "TILA — Truth in Lending Act", category: "consumer_protection", capability: "statute_search", query: "What disclosure requirements does TILA impose on creditors? What is the right of rescission under TILA and when does it apply?" },
  { id: "efta", label: "EFTA — Electronic Fund Transfer Act", category: "consumer_protection", capability: "statute_search", query: "What protections does the Electronic Fund Transfer Act (EFTA) provide for consumers? What are a financial institution's error resolution obligations?" },
  { id: "jurisdiction", label: "Federal Subject Matter Jurisdiction", category: "jurisdiction", capability: "jurisdiction", query: "What are the grounds for federal subject matter jurisdiction? Explain federal question jurisdiction under 28 U.S.C. § 1331 and diversity jurisdiction under § 1332." },
  { id: "immunity_qua", label: "Qualified Immunity", category: "constitutional_law", capability: "immunity", query: "What is the doctrine of qualified immunity? What must a plaintiff show to overcome qualified immunity for a constitutional violation claim?" },
];

export default function JurisTestLibrary() {
  const [results, setResults] = useState({});
  const [running, setRunning] = useState({});
  const [canonCount, setCanonCount] = useState(0);
  const [runAll, setRunAll] = useState(false);
  const [runAllProgress, setRunAllProgress] = useState(0);

  useEffect(() => {
    base44.entities.CanonEntry.filter({ status: "active", verified: true }, "-created_date", 500)
      .then(r => setCanonCount(r.length)).catch(() => {});
  }, []);

  const runTest = async (test) => {
    setRunning(r => ({ ...r, [test.id]: true }));
    try {
      const res = await base44.functions.invoke("jurisEngine", {
        capability: test.capability,
        query: test.query,
        context: `Test query from JurisEngine Test Library. Category: ${test.category}`,
        save_memo: false,
      });
      setResults(r => ({ ...r, [test.id]: { ...res.data, ran_at: new Date().toISOString() } }));
    } catch (err) {
      setResults(r => ({ ...r, [test.id]: { canon_gap: true, message: err.message, ran_at: new Date().toISOString() } }));
    }
    setRunning(r => ({ ...r, [test.id]: false }));
  };

  const runAllTests = async () => {
    setRunAll(true);
    setRunAllProgress(0);
    for (let i = 0; i < TEST_QUERIES.length; i++) {
      await runTest(TEST_QUERIES[i]);
      setRunAllProgress(Math.round(((i + 1) / TEST_QUERIES.length) * 100));
    }
    setRunAll(false);
  };

  const passed = Object.values(results).filter(r => !r.canon_gap).length;
  const failed = Object.values(results).filter(r => r.canon_gap).length;
  const total = Object.keys(results).length;

  return (
    <div>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">NCOS · JurisEngine</p>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Scale className="w-6 h-6 text-amber-500" />Test Query Library
          </h1>
          <p className="text-sm text-muted-foreground">Run standard legal queries to verify JurisEngine Canon coverage</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={`text-xs ${canonCount > 0 ? "border-emerald-300 text-emerald-700" : "border-red-300 text-red-700"}`}>
            {canonCount} verified Canon entries
          </Badge>
          <Button size="sm" onClick={runAllTests} disabled={runAll} className="gap-1.5">
            {runAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PlayCircle className="w-3.5 h-3.5" />}
            {runAll ? `Running... ${runAllProgress}%` : "Run All Tests"}
          </Button>
        </div>
      </div>

      {canonCount === 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-5 text-sm text-red-800 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span><strong>Canon is empty.</strong> All test queries will return CANON GAP. Populate NC Canon first via <a href="/canon-ingestion" className="underline">Canon Ingestion →</a></span>
        </div>
      )}

      {runAll && (
        <div className="mb-5">
          <div className="flex items-center justify-between mb-1.5 text-xs text-muted-foreground">
            <span>Running test suite...</span><span>{runAllProgress}%</span>
          </div>
          <Progress value={runAllProgress} className="h-2" />
        </div>
      )}

      {total > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          <Card className="p-3 border border-emerald-200 bg-emerald-50 text-center">
            <p className="text-2xl font-bold text-emerald-700">{passed}</p>
            <p className="text-xs text-emerald-600">Canon Hit</p>
          </Card>
          <Card className="p-3 border border-red-200 bg-red-50 text-center">
            <p className="text-2xl font-bold text-red-700">{failed}</p>
            <p className="text-xs text-red-600">Canon Gap</p>
          </Card>
          <Card className="p-3 border border-border/60 text-center">
            <p className="text-2xl font-bold">{total}/{TEST_QUERIES.length}</p>
            <p className="text-xs text-muted-foreground">Tests Run</p>
          </Card>
        </div>
      )}

      <div className="space-y-3">
        {TEST_QUERIES.map(test => {
          const result = results[test.id];
          const isRunning = running[test.id];
          const hasResult = !!result;
          return (
            <Card key={test.id} className={`p-4 border ${hasResult && !result.canon_gap ? "border-emerald-200" : hasResult && result.canon_gap ? "border-red-200 bg-red-50/30" : "border-border/60"}`}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {hasResult && !result.canon_gap && <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />}
                  {hasResult && result.canon_gap && <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />}
                  {!hasResult && <Scale className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{test.label}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{test.query}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {hasResult && <Badge variant="outline" className={`text-[9px] ${result.canon_gap ? "text-red-600 border-red-300" : "text-emerald-600 border-emerald-300"}`}>{result.canon_gap ? "CANON GAP" : "PASS"}</Badge>}
                  {hasResult && result.ran_at && <span className="text-[10px] text-muted-foreground">{moment(result.ran_at).fromNow()}</span>}
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => runTest(test)} disabled={isRunning || runAll}>
                    {isRunning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                  </Button>
                </div>
              </div>

              {hasResult && result.canon_gap && (
                <div className="bg-red-50 border border-red-200 rounded p-2 text-xs text-red-700 mt-2">
                  <strong>CANON GAP:</strong> {result.message || "No matching Canon entries found for this query."}
                </div>
              )}

              {hasResult && !result.canon_gap && result.analysis && (
                <div className="bg-muted rounded p-3 text-xs mt-2 max-h-40 overflow-y-auto">
                  <div className="prose prose-xs max-w-none text-xs">
                    <ReactMarkdown>{result.analysis.slice(0, 500) + (result.analysis.length > 500 ? "..." : "")}</ReactMarkdown>
                  </div>
                  {(result.canon_entries_cited || []).length > 0 && (
                    <div className="mt-2 pt-2 border-t border-border/40">
                      <span className="text-muted-foreground">Cited: </span>
                      {result.canon_entries_cited.map(e => (
                        <Badge key={e.id} variant="outline" className="text-[9px] mr-1">{e.citation || e.title}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <div className="mt-6 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
        <BookOpen className="w-3.5 h-3.5 inline mr-1.5" />
        All test outputs are informational only and not legal advice. JurisEngine only cites verified Canon entries — CANON GAP means the authority has not been imported and verified yet.
      </div>
    </div>
  );
}