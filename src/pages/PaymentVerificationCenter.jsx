import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck, CheckCircle, XCircle, AlertTriangle, RefreshCw, FileSearch } from "lucide-react";
import { base44 } from "@/api/base44Client";

const statusBadge = (s) => s === "passed" ? "default" : s === "failed" ? "destructive" : "secondary";

export default function PaymentVerificationCenter() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [audit, setAudit] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke("ncPaymentSandbox", { operation: "list_verification_results", params: { limit: 50 } });
      setResults(res.data.results || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const viewAudit = async (simId) => {
    try {
      const res = await base44.functions.invoke("ncPaymentSandbox", { operation: "get_audit", params: { simulation_id: simId } });
      setAudit(res.data);
    } catch (e) { console.error(e); }
  };

  if (loading) return <div className="p-8 flex justify-center"><RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  const passed = results.filter(r => r.status === "passed").length;
  const failed = results.filter(r => r.status === "failed").length;
  const partial = results.filter(r => r.status === "partial").length;
  const passRate = results.length ? Math.round((passed / results.length) * 100) : 0;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><ClipboardCheck className="w-6 h-6 text-primary" /> Verification Center</h1>
          <p className="text-sm text-muted-foreground mt-1">Every financial workflow verified before deployment. No black boxes.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className="w-4 h-4" /> Refresh</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase">Total Checks</p><p className="text-2xl font-bold mt-1">{results.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase">Passed</p><p className="text-2xl font-bold mt-1 text-emerald-600">{passed}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase">Failed / Partial</p><p className="text-2xl font-bold mt-1 text-rose-600">{failed + partial}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase">Pass Rate</p><p className="text-2xl font-bold mt-1">{passRate}%</p></CardContent></Card>
      </div>

      <Tabs defaultValue="results">
        <TabsList><TabsTrigger value="results">Verification Results</TabsTrigger><TabsTrigger value="audit">Audit Center</TabsTrigger></TabsList>

        <TabsContent value="results" className="mt-4">
          <div className="space-y-2">
            {results.map(r => (
              <Card key={r.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant={statusBadge(r.status)}>{r.status === "passed" ? <CheckCircle className="w-3 h-3 inline" /> : r.status === "failed" ? <XCircle className="w-3 h-3 inline" /> : <AlertTriangle className="w-3 h-3 inline" />} {r.status}</Badge>
                      <span className="font-medium">{r.workflow_type.replace(/_/g, " ")}</span>
                      <span className="text-xs text-muted-foreground">{r.verification_key}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold">{r.pass_rate}%</span>
                      <span className="text-xs text-muted-foreground">{r.passed_checks}/{r.total_checks} checks</span>
                      <Button size="sm" variant="outline" onClick={() => viewAudit(r.simulation_id)}><FileSearch className="w-3 h-3" /> Audit</Button>
                    </div>
                  </div>
                  {r.failures?.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {r.failures.map((f, i) => <p key={i} className="text-xs text-rose-600">• {f.check}: expected {f.expected}, got {f.actual}</p>)}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            {results.length === 0 && <p className="text-sm text-muted-foreground">No verification results yet. Run simulations in the Sandbox.</p>}
          </div>
        </TabsContent>

        <TabsContent value="audit" className="mt-4">
          {!audit ? (
            <p className="text-sm text-muted-foreground">Click "Audit" on any verification result to see the full audit explanation.</p>
          ) : (
            <Card>
              <CardHeader><CardTitle>Audit Explanation</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <pre className="text-sm whitespace-pre-wrap bg-muted/50 p-4 rounded-md font-mono">{audit.audit_explanation}</pre>
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-xs font-semibold mb-1">Affected Departments</p>{(audit.affected_departments || []).map((d, i) => <Badge key={i} variant="secondary" className="mr-1">{d}</Badge>)}</div>
                  <div><p className="text-xs font-semibold mb-1">Memory References</p>{(audit.memory_references || []).map((m, i) => <p key={i} className="text-xs text-muted-foreground">{m}</p>)}</div>
                </div>
                {audit.verification?.checks && (
                  <div><p className="text-xs font-semibold mb-2">Verification Checks</p>
                    {audit.verification.checks.map((c, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs py-1">
                        {c.passed ? <CheckCircle className="w-3 h-3 text-emerald-500" /> : <XCircle className="w-3 h-3 text-rose-500" />}
                        <span className="flex-1">{c.check_name}</span>
                        <span className="text-muted-foreground">expected: {c.expected}</span>
                        <span className="text-muted-foreground">actual: {c.actual}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}