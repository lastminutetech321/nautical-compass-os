import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Activity, AlertTriangle, CheckCircle, Clock, RefreshCw, Loader2,
  BookOpen, Bot, DollarSign, Shield, Zap, Link2, BarChart3, Target, Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import moment from "moment";

const categoryMeta = {
  missing_feature:      { icon: "🧩", color: "text-blue-600",   bg: "bg-blue-50 border-blue-200" },
  broken_dependency:    { icon: "🔗", color: "text-orange-600", bg: "bg-orange-50 border-orange-200" },
  failed_test:          { icon: "🧪", color: "text-red-600",    bg: "bg-red-50 border-red-200" },
  canon_gap:            { icon: "📚", color: "text-amber-600",  bg: "bg-amber-50 border-amber-200" },
  blocked_build:        { icon: "🚧", color: "text-red-600",    bg: "bg-red-50 border-red-200" },
  incomplete_workflow:  { icon: "⚙️", color: "text-slate-600",  bg: "bg-slate-50 border-slate-200" },
  security_risk:        { icon: "🔒", color: "text-red-600",    bg: "bg-red-50 border-red-200" },
  missing_revenue_path: { icon: "💰", color: "text-emerald-600",bg: "bg-emerald-50 border-emerald-200" },
  agent_gap:            { icon: "🤖", color: "text-violet-600", bg: "bg-violet-50 border-violet-200" },
};

const severityRank = { critical: 0, high: 1, medium: 2, low: 3 };

const HIGH_RISK_CATEGORIES = ['security_risk','broken_dependency','blocked_build'];
const CRITICAL_SEVERITIES = ['critical','high'];

function requiresHumanReview(issue) {
  if (HIGH_RISK_CATEGORIES.includes(issue.category)) return true;
  if (CRITICAL_SEVERITIES.includes(issue.severity)) return true;
  if (issue.affected_modules && issue.affected_modules.length >= 3) return true;
  return false;
}

function calculateRiskScore(issue) {
  let score = 0;
  const severityScores = { critical: 40, high: 30, medium: 20, low: 10 };
  score += severityScores[issue.severity] || 0;
  if (HIGH_RISK_CATEGORIES.includes(issue.category)) score += 30;
  if (issue.affected_modules) score += Math.min(issue.affected_modules.length * 5, 20);
  const daysOld = moment().diff(moment(issue.detected_at || issue.created_date), 'days');
  if (daysOld > 7) score += 10;
  if (daysOld > 30) score += 20;
  return Math.min(score, 100);
}

export default function DiagnosisDashboard() {
  const [issues, setIssues] = useState([]);
  const [improvements, setImprovements] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [scanResult, setScanResult] = useState(null);
  const [catFilter, setCatFilter] = useState("all");
  const [sevFilter, setSevFilter] = useState("all");
  const [selected, setSelected] = useState(null);

  const load = async () => {
    setLoading(true);
    const [iss, imp] = await Promise.all([
      base44.entities.DiagnosticIssue.list("-created_date", 200).catch(() => []),
      base44.entities.ImprovementItem.list("-created_date", 50).catch(() => []),
    ]);
    const open = iss.filter(i => i.status === "open").sort((a,b) => (severityRank[a.severity]||3) - (severityRank[b.severity]||3));
    setIssues(open); setImprovements(imp);
    if (open.length > 0 && !selected) setSelected(open[0]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const runScan = async () => {
    setScanning(true); setScanResult(null);
    const res = await base44.functions.invoke("selfDiagnosis", {});
    setScanResult(res.data);
    setScanning(false); load();
  };

  const dismiss = async (issue) => {
    const needsReview = requiresHumanReview(issue);
    const riskScore = calculateRiskScore(issue);
    if (needsReview) {
      const msg = `HUMAN REVIEW REQUIRED\n\nRisk Score: ${riskScore}/100\nSeverity: ${issue.severity}\nCategory: ${issue.category}\nAffected: ${(issue.affected_modules||[]).join(', ')||'none'}\n\nDismiss this issue?`;
      if (!window.confirm(msg)) return;
    }
    await base44.entities.DiagnosticIssue.update(issue.id, { status: "dismissed", dismissed_by: "user", dismissed_at: new Date().toISOString(), risk_score_at_dismissal: riskScore, required_human_review: needsReview });
    load();
  };

  const resolve = async (issue) => {
    const needsReview = requiresHumanReview(issue);
    const riskScore = calculateRiskScore(issue);
    if (needsReview) {
      const msg = `HUMAN REVIEW REQUIRED\n\nRisk Score: ${riskScore}/100\nSeverity: ${issue.severity}\nCategory: ${issue.category}\nAffected: ${(issue.affected_modules||[]).join(', ')||'none'}\n\nConfirm resolution?`;
      if (!window.confirm(msg)) return;
    }
    await base44.entities.DiagnosticIssue.update(issue.id, { status: "resolved", resolved_by: "user", resolved_at: new Date().toISOString(), risk_score_at_resolution: riskScore, required_human_review: needsReview });
    load();
  };

  const categories = [...new Set(issues.map(i => i.category))];
  const filtered = issues.filter(i => {
    if (catFilter !== "all" && i.category !== catFilter) return false;
    if (sevFilter !== "all" && i.severity !== sevFilter) return false;
    return true;
  });

  const counts = {
    critical: issues.filter(i => i.severity === "critical").length,
    high: issues.filter(i => i.severity === "high").length,
    medium: issues.filter(i => i.severity === "medium").length,
    low: issues.filter(i => i.severity === "low").length,
  };

  const requiresReviewCount = issues.filter(requiresHumanReview).length;
  const impQueued = improvements.filter(i => i.status === "queued").length;
  const impApproved = improvements.filter(i => i.status === "approved").length;

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">NCOS · Self-Governance</p>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" />Self-Diagnosis Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">Live platform health — issues, gaps, blockers, and improvements</p>
        </div>
        <Button onClick={runScan} disabled={scanning} className="gap-2">
          {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {scanning ? "Scanning..." : "Run Full Scan"}
        </Button>
      </div>

      {scanResult && (
        <div className="mb-5 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800">
          <CheckCircle className="w-3.5 h-3.5 inline mr-1.5" />
          Scan complete · {scanResult.issues_found} issues found · {scanResult.new_issues_created} new · {scanResult.improvement_items_created} improvements queued
          {scanResult.diagnosis && (
            <span className="ml-2 text-emerald-700">
              | Canon: {scanResult.diagnosis.canon?.verified_active}/{scanResult.diagnosis.canon?.total}
              | Agents: {scanResult.diagnosis.agents?.total}
              | MRR: ${scanResult.diagnosis.revenue?.mrr || 0}
            </span>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
        {[
          { label: "Critical Issues", value: counts.critical, color: counts.critical > 0 ? "text-red-600 bg-red-50" : "text-emerald-600 bg-emerald-50", icon: AlertTriangle },
          { label: "High Issues", value: counts.high, color: counts.high > 0 ? "text-orange-600 bg-orange-50" : "text-emerald-600 bg-emerald-50", icon: AlertTriangle },
          { label: "Requires Review", value: requiresReviewCount, color: requiresReviewCount > 0 ? "text-amber-600 bg-amber-50" : "text-emerald-600 bg-emerald-50", icon: Eye },
          { label: "Queued Improvements", value: impQueued, color: "text-blue-600 bg-blue-50", icon: Zap },
          { label: "Approved for Build", value: impApproved, color: impApproved > 0 ? "text-emerald-600 bg-emerald-50" : "text-slate-400 bg-slate-50", icon: CheckCircle },
        ].map(k => (
          <Card key={k.label} className="p-3 border border-border/60">
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${k.color}`}><k.icon className="w-3.5 h-3.5" /></div>
              <p className="text-xs text-muted-foreground">{k.label}</p>
            </div>
            <p className="text-2xl font-bold pl-9">{k.value}</p>
          </Card>
        ))}
      </div>

      {issues.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <CheckCircle className="w-14 h-14 mx-auto mb-3 text-emerald-500 opacity-60" />
          <p className="text-sm text-muted-foreground mb-3">No open issues. Run Full Scan to check platform health.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="flex gap-2 mb-3 flex-wrap">
              <Select value={catFilter} onValueChange={setCatFilter}>
                <SelectTrigger className="h-7 text-xs flex-1"><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(c => <SelectItem key={c} value={c} className="text-xs">{(categoryMeta[c]?.icon || "•")} {c.replace(/_/g," ")}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={sevFilter} onValueChange={setSevFilter}>
                <SelectTrigger className="h-7 text-xs w-28"><SelectValue placeholder="Severity" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {["critical","high","medium","low"].map(s => <SelectItem key={s} value={s} className="capitalize text-xs">{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 max-h-[calc(100vh-22rem)] overflow-y-auto pr-1">
              {filtered.map(issue => {
                const meta = categoryMeta[issue.category] || {};
                const needsReview = requiresHumanReview(issue);
                return (
                  <button key={issue.id} onClick={() => setSelected(issue)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg transition-all border ${selected?.id === issue.id ? "bg-primary/10 border-primary/30" : "border-transparent hover:bg-muted"}`}>
                    <div className="flex items-start gap-2">
                      <span className="text-sm flex-shrink-0 mt-0.5">{meta.icon || "⚠️"}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium line-clamp-2">{issue.title}</p>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <Badge variant="outline" className={`text-[9px] capitalize ${issue.severity === "critical" ? "text-red-600 border-red-300" : issue.severity === "high" ? "text-orange-600 border-orange-300" : "text-amber-600"}`}>{issue.severity}</Badge>
                          {needsReview && <Badge variant="outline" className="text-[9px] text-amber-600 border-amber-300"><Eye className="w-2.5 h-2.5 mr-0.5" />Review</Badge>}
                          <span className="text-[9px] text-muted-foreground">{moment(issue.created_date || issue.detected_at).fromNow()}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {selected && (
            <div className="lg:col-span-2">
              <Card className="p-5 border border-border/60">
                <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge variant="outline" className={`text-[10px] capitalize ${selected.severity === "critical" ? "text-red-600 border-red-300" : selected.severity === "high" ? "text-orange-600 border-orange-300" : "text-amber-600 border-amber-300"}`}>{selected.severity}</Badge>
                      <Badge variant="secondary" className="text-[10px] capitalize">{selected.category?.replace(/_/g," ")}</Badge>
                      {requiresHumanReview(selected) && <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300"><Eye className="w-3 h-3 mr-1" />Review Required</Badge>}
                    </div>
                    <h2 className="text-sm font-bold">{selected.title}</h2>
                    <div className="mt-2 text-xs text-muted-foreground">Risk Score: <span className="font-semibold">{calculateRiskScore(selected)}/100</span></div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="h-7 text-xs text-emerald-600 border-emerald-200" onClick={() => resolve(selected)}>Resolve</Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => dismiss(selected)}>Dismiss</Button>
                  </div>
                </div>

                {selected.description && (
                  <div className="bg-muted rounded-lg p-3 text-sm mb-4 leading-relaxed">{selected.description}</div>
                )}

                {(selected.affected_modules || []).length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-1.5">Affected Modules</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selected.affected_modules.map(m => <Badge key={m} variant="outline" className="text-xs">{m}</Badge>)}
                    </div>
                  </div>
                )}

                {(() => {
                  const linked = improvements.filter(i => i.diagnostic_issue_id === selected.id || (i.affected_modules || []).some(m => (selected.affected_modules || []).includes(m)));
                  return linked.length > 0 ? (
                    <div className="mt-4 pt-4 border-t border-border/40">
                      <p className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1"><Link2 className="w-3 h-3" />Linked Improvement Items</p>
                      <div className="space-y-1.5">
                        {linked.map(imp => (
                          <div key={imp.id} className="flex items-center justify-between p-2 bg-muted rounded text-xs">
                            <span className="truncate">{imp.title}</span>
                            <Badge variant="outline" className="text-[9px] capitalize ml-2 flex-shrink-0">{imp.status}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null;
                })()}

                <div className="mt-3 text-xs text-muted-foreground">
                  Detected {moment(selected.detected_at || selected.created_date).fromNow()} by {selected.detected_by || "Self-Diagnosis Engine"}
                </div>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
