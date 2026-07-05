import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Code2, AlertTriangle, CheckCircle, Loader2, RefreshCw,
  Lock, Zap, Search, BarChart3
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import moment from "moment";

const CATEGORY_META = {
  duplicate_logic:        { icon: "🔁", color: "text-orange-600", bg: "bg-orange-50 border-orange-200" },
  unused_entity:          { icon: "🗑️", color: "text-slate-600",  bg: "bg-slate-50 border-slate-200" },
  broken_reference:       { icon: "🔗", color: "text-red-600",    bg: "bg-red-50 border-red-200" },
  inconsistent_naming:    { icon: "📝", color: "text-amber-600",  bg: "bg-amber-50 border-amber-200" },
  security_concern:       { icon: "🔒", color: "text-red-600",    bg: "bg-red-50 border-red-200" },
  performance_bottleneck: { icon: "⚡", color: "text-amber-600",  bg: "bg-amber-50 border-amber-200" },
  accessibility:          { icon: "♿", color: "text-blue-600",   bg: "bg-blue-50 border-blue-200" },
  mobile_responsiveness:  { icon: "📱", color: "text-violet-600", bg: "bg-violet-50 border-violet-200" },
  missing_index:          { icon: "📇", color: "text-cyan-600",   bg: "bg-cyan-50 border-cyan-200" },
  missing_test:           { icon: "🧪", color: "text-pink-600",   bg: "bg-pink-50 border-pink-200" },
  missing_documentation:  { icon: "📚", color: "text-indigo-600", bg: "bg-indigo-50 border-indigo-200" },
  dead_code:              { icon: "💀", color: "text-slate-500",  bg: "bg-slate-50 border-slate-200" },
  over_complexity:        { icon: "🌀", color: "text-orange-600", bg: "bg-orange-50 border-orange-200" },
  missing_error_handling: { icon: "⚠️", color: "text-red-600",    bg: "bg-red-50 border-red-200" },
};

const SEVERITY_COLOR = { critical: "text-red-600 border-red-300", high: "text-orange-600 border-orange-300", medium: "text-amber-600 border-amber-300", low: "text-slate-500 border-slate-200" };

// Known NCOS technical debt — seeded from static analysis
const INITIAL_DEBT = [
  { title: "Culture Rail has static/hardcoded metric values", category: "duplicate_logic", severity: "medium", file_path: "src/pages/ExecutiveCommand.jsx + CultureRail.jsx", description: "Executive Command shows hardcoded Culture Rail metrics (4 artists, $12.4K revenue, etc.). These should be pulled from real CultureRailData entities.", recommended_fix: "Connect Culture Rail stats to CultureRailData entity. Remove all hardcoded numbers.", estimated_hours: 3, affected_modules: ["Culture Rail", "Executive Command"] },
  { title: "Duplicate 'Mission Control' entry in sidebar", category: "duplicate_logic", severity: "low", file_path: "src/components/layout/Sidebar.jsx", description: "Sidebar has both '🗺 Mission Control' → '/' and '🧠 Mission Control v2' → '/mission-control', creating confusion.", recommended_fix: "Rename to 'Executive Command' and 'Mission Control v2' or consolidate into one page.", estimated_hours: 0.5, affected_modules: ["Sidebar", "Navigation"] },
  { title: "Blueprint Library listed twice in sidebar", category: "duplicate_logic", severity: "low", file_path: "src/components/layout/Sidebar.jsx", description: "Blueprints appears under Build Studio AND as a standalone 'Blueprint Library' group.", recommended_fix: "Remove standalone Blueprint Library group. It's already under Build Studio.", estimated_hours: 0.5, affected_modules: ["Sidebar"] },
  { title: "FounderDashboard imports calcCanonReadiness but may not exist", category: "broken_reference", severity: "high", file_path: "src/pages/FounderDashboard.jsx", description: "Imports calcCanonReadiness from CanonReadiness but this import may fail if the component structure changed.", recommended_fix: "Inline the calculation or ensure the import path is correct.", estimated_hours: 1, affected_modules: ["Founder Dashboard", "Canon Readiness"] },
  { title: "No error boundaries on data-loading pages", category: "missing_error_handling", severity: "high", file_path: "Multiple pages", description: "Pages like JurisEngine, EvidenceVault, and CanonIngestion catch errors with .catch(() => []) but don't surface user-friendly error states when API calls fail.", recommended_fix: "Add a reusable ErrorState component and surface failures with retry options.", estimated_hours: 4, affected_modules: ["JurisEngine", "EvidenceVault", "CanonIngestion"] },
  { title: "SelfGovernance.jsx is 560+ lines — should be split", category: "over_complexity", severity: "medium", file_path: "src/pages/SelfGovernance.jsx", description: "File contains SurvivalEnginePanel and AgentCommandPolicy as inline functions. Should be extracted to separate component files.", recommended_fix: "Extract SurvivalEnginePanel.jsx and AgentCommandPolicy.jsx as separate components.", estimated_hours: 2, affected_modules: ["Self-Governance"] },
  { title: "No mobile-optimized layout for Evidence Vault upload", category: "mobile_responsiveness", severity: "medium", file_path: "src/pages/EvidenceVault.jsx", description: "File upload dialog uses fixed grid layouts that may break on small screens.", recommended_fix: "Replace grid with flex-col on mobile for upload form fields.", estimated_hours: 1, affected_modules: ["Evidence Vault"] },
  { title: "KnowledgeGraph page is a stub", category: "missing_documentation", severity: "high", file_path: "src/pages/KnowledgeGraph.jsx", description: "Knowledge Graph page exists in nav but likely has limited or no real graph data connections.", recommended_fix: "Implement actual entity relationship graph using real entity data.", estimated_hours: 8, affected_modules: ["Knowledge Graph"] },
  { title: "DiagnosisDashboard and SelfGovernance show overlapping issue data", category: "duplicate_logic", severity: "medium", file_path: "src/pages/DiagnosisDashboard.jsx + SelfGovernance.jsx", description: "Both pages display DiagnosticIssue data but from slightly different angles. Users may be confused about which to use.", recommended_fix: "Consolidate: SelfGovernance = approvals + queue + survival. DiagnosisDashboard = issues + scan only.", estimated_hours: 2, affected_modules: ["Diagnosis", "Self-Governance"] },
  { title: "NCOSMemory entity missing — duplicate work risk", category: "missing_index", severity: "high", file_path: "base44/entities/", description: "No organizational memory system existed before this sprint. Risk of duplicate work or reversed decisions.", recommended_fix: "Use the new NCOSMemory entity and populate it with key architectural decisions.", estimated_hours: 2, affected_modules: ["NCOS Memory"] },
];

export default function TechnicalDebtDashboard() {
  const [debt, setDebt] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [selected, setSelected] = useState(null);
  const [catFilter, setCatFilter] = useState("all");
  const [sevFilter, setSevFilter] = useState("all");

  const load = async () => {
    setLoading(true);
    const d = await base44.entities.TechnicalDebt.filter({ status: "open" }, "-created_date", 200).catch(() => []);
    setDebt(d);
    if (d.length > 0 && !selected) setSelected(d[0]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const seedInitialDebt = async () => {
    setScanning(true);
    const existing = new Set(debt.map(d => d.title));
    const toCreate = INITIAL_DEBT.filter(d => !existing.has(d.title));
    await Promise.all(toCreate.map(d => base44.entities.TechnicalDebt.create({ ...d, auto_detected: true, detected_by: "NCOS Static Analysis" })));
    setScanning(false);
    load();
  };

  const resolve = async (item) => {
    await base44.entities.TechnicalDebt.update(item.id, { status: "resolved" });
    setSelected(null);
    load();
  };

  const defer = async (item) => {
    await base44.entities.TechnicalDebt.update(item.id, { status: "deferred" });
    load();
  };

  const categories = [...new Set(debt.map(d => d.category))];
  const filtered = debt.filter(d => {
    if (catFilter !== "all" && d.category !== catFilter) return false;
    if (sevFilter !== "all" && d.severity !== sevFilter) return false;
    return true;
  });

  const totalHours = debt.reduce((s,d) => s + (d.estimated_hours||0), 0);
  const criticalCount = debt.filter(d => d.severity === "critical").length;
  const highCount = debt.filter(d => d.severity === "high").length;
  const categoryCounts = debt.reduce((acc, d) => { acc[d.category] = (acc[d.category]||0)+1; return acc; }, {});
  const topCategory = Object.entries(categoryCounts).sort((a,b)=>b[1]-a[1])[0];

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">NCOS · Self-Review</p>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Code2 className="w-6 h-6 text-orange-500" />Technical Debt Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">Codebase health — duplicate logic, broken references, security, performance</p>
        </div>
        <Button size="sm" onClick={seedInitialDebt} disabled={scanning} className="gap-1.5">
          {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {debt.length === 0 ? "Run Static Analysis" : "Re-scan"}
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { label: "Total Open Debt", value: debt.length, color: "text-orange-600 bg-orange-50", icon: Code2 },
          { label: "Critical / High", value: `${criticalCount}/${highCount}`, color: criticalCount > 0 ? "text-red-600 bg-red-50" : "text-amber-600 bg-amber-50", icon: AlertTriangle },
          { label: "Est. Resolution", value: `${totalHours}h`, color: "text-blue-600 bg-blue-50", icon: Zap },
          { label: "Top Category", value: topCategory ? `${topCategory[1]}× ${(topCategory[0]||"").replace(/_/g," ")}` : "None", color: "text-slate-600 bg-slate-50", icon: BarChart3 },
        ].map(k => (
          <Card key={k.label} className="p-4 border border-border/60">
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${k.color}`}><k.icon className="w-3.5 h-3.5" /></div>
              <p className="text-xs text-muted-foreground">{k.label}</p>
            </div>
            <p className="text-xl font-bold pl-9">{k.value}</p>
          </Card>
        ))}
      </div>

      {debt.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <Code2 className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
          <p className="text-sm text-muted-foreground mb-3">No technical debt items recorded. Click "Run Static Analysis" to seed initial findings from codebase review.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-1">
            <div className="flex gap-2 mb-3 flex-wrap">
              <Select value={sevFilter} onValueChange={setSevFilter}>
                <SelectTrigger className="h-7 text-xs flex-1"><SelectValue placeholder="Severity" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {["critical","high","medium","low"].map(s => <SelectItem key={s} value={s} className="capitalize text-xs">{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={catFilter} onValueChange={setCatFilter}>
                <SelectTrigger className="h-7 text-xs flex-1"><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {categories.map(c => <SelectItem key={c} value={c} className="text-xs">{(CATEGORY_META[c]?.icon||"•")} {c.replace(/_/g," ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 max-h-[calc(100vh-24rem)] overflow-y-auto pr-1">
              {filtered.map(d => {
                const meta = CATEGORY_META[d.category] || { icon: "⚠️" };
                return (
                  <button key={d.id} onClick={() => setSelected(d)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${selected?.id === d.id ? "bg-primary/10 border-primary/30" : "border-border/40 hover:bg-muted"}`}>
                    <div className="flex items-start gap-2">
                      <span className="text-sm flex-shrink-0">{meta.icon}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium line-clamp-2">{d.title}</p>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <Badge variant="outline" className={`text-[9px] capitalize ${SEVERITY_COLOR[d.severity]||""}`}>{d.severity}</Badge>
                          {d.estimated_hours > 0 && <span className="text-[9px] text-muted-foreground">{d.estimated_hours}h</span>}
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
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-lg">{CATEGORY_META[selected.category]?.icon||"⚠️"}</span>
                      <Badge variant="outline" className={`text-[10px] capitalize ${SEVERITY_COLOR[selected.severity]||""}`}>{selected.severity}</Badge>
                      <Badge variant="secondary" className="text-[10px]">{selected.category?.replace(/_/g," ")}</Badge>
                    </div>
                    <h2 className="text-sm font-bold">{selected.title}</h2>
                    {selected.file_path && <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">{selected.file_path}</p>}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button size="sm" variant="outline" className="h-7 text-xs text-emerald-600 border-emerald-200" onClick={() => resolve(selected)}>Resolve</Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => defer(selected)}>Defer</Button>
                  </div>
                </div>
                {selected.description && <div className="bg-muted rounded-lg p-3 text-sm mb-3 leading-relaxed">{selected.description}</div>}
                {selected.recommended_fix && (
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-emerald-700 uppercase mb-1">Recommended Fix</p>
                    <div className="bg-emerald-50 border border-emerald-200 rounded p-2.5 text-sm text-emerald-800">{selected.recommended_fix}</div>
                  </div>
                )}
                {(selected.affected_modules||[]).length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {selected.affected_modules.map(m => <Badge key={m} variant="outline" className="text-xs">{m}</Badge>)}
                  </div>
                )}
                {selected.estimated_hours > 0 && <p className="text-xs text-muted-foreground mt-3">Est. fix: {selected.estimated_hours}h · Detected by {selected.detected_by}</p>}
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}