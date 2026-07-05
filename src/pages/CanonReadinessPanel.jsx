import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  BookOpen, CheckCircle, AlertTriangle, Clock, Target, TrendingUp,
  RefreshCw, Zap, Lock, BarChart3
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const JURISENGINE_REQUIREMENTS = [
  { key: "civil_rights", label: "Civil Rights (§ 1983)", minEntries: 1, categories: ["civil_rights"] },
  { key: "foia", label: "FOIA (5 U.S.C. § 552)", minEntries: 1, categories: ["administrative_law"] },
  { key: "consumer_protection", label: "Consumer Protection (FCRA/FDCPA)", minEntries: 1, categories: ["consumer_protection"] },
  { key: "constitutional", label: "Constitutional Law (14th Amendment)", minEntries: 1, categories: ["constitutional_law"] },
  { key: "standing", label: "Standing Doctrine", minEntries: 1, categories: ["standing_doctrine"] },
  { key: "jurisdiction", label: "Federal Jurisdiction", minEntries: 1, categories: ["jurisdiction"] },
  { key: "evidence", label: "Evidence Standards", minEntries: 1, categories: ["evidence_standard"] },
  { key: "case_law", label: "Landmark Case Law", minEntries: 2, categories: ["case_law"] },
];

export default function CanonReadinessPanel() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.CanonEntry.list("-created_date", 500)
      .then(data => { setEntries(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const active = entries.filter(e => e.status === "active");
  const verified = entries.filter(e => e.verified && e.status === "active");
  const pending = entries.filter(e => e.status === "pending_review");
  const gaps = entries.filter(e => e.is_canon_gap);
  const draft = entries.filter(e => e.status === "draft");

  const requirementsMet = JURISENGINE_REQUIREMENTS.filter(req => {
    const count = verified.filter(e => req.categories.includes(e.category)).length;
    return count >= req.minEntries;
  });

  const jurisReadiness = Math.round((requirementsMet.length / JURISENGINE_REQUIREMENTS.length) * 100);

  const categoryBreakdown = [
    { label: "Civil Rights", cat: "civil_rights", color: "text-rose-600", bg: "bg-rose-50 border-rose-200" },
    { label: "Federal Statute", cat: "federal_statute", color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
    { label: "Case Law", cat: "case_law", color: "text-violet-600", bg: "bg-violet-50 border-violet-200" },
    { label: "Constitutional", cat: "constitutional_law", color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
    { label: "Consumer", cat: "consumer_protection", color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
    { label: "Admin / FOIA", cat: "administrative_law", color: "text-cyan-600", bg: "bg-cyan-50 border-cyan-200" },
  ];

  if (loading) return <div className="flex items-center justify-center h-32"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">NCOS · Canon Health</p>
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-violet-500" />Canon Coverage Dashboard
          </h2>
        </div>
        <div className="flex gap-2">
          <Link to="/canon-gap-resolver"><Button size="sm" variant="outline"><AlertTriangle className="w-3.5 h-3.5 mr-1.5 text-amber-500" />Gap Resolver</Button></Link>
          <Link to="/canon-entry-builder"><Button size="sm"><BookOpen className="w-3.5 h-3.5 mr-1.5" />Add Entry</Button></Link>
        </div>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Entries", value: entries.length, color: "text-foreground", icon: BookOpen },
          { label: "Verified Active", value: verified.length, color: "text-emerald-600", icon: CheckCircle },
          { label: "Pending Review", value: pending.length, color: pending.length > 0 ? "text-amber-600" : "text-muted-foreground", icon: Clock },
          { label: "Canon Gaps", value: gaps.length, color: gaps.length > 0 ? "text-red-600" : "text-muted-foreground", icon: AlertTriangle },
        ].map(s => (
          <Card key={s.label} className="p-3 border border-border/60">
            <div className="flex items-center gap-2 mb-0.5">
              <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
          </Card>
        ))}
      </div>

      {/* JurisEngine readiness meter */}
      <Card className={`p-4 border ${jurisReadiness >= 80 ? "border-emerald-200 bg-emerald-50" : jurisReadiness >= 40 ? "border-amber-200 bg-amber-50" : "border-red-200 bg-red-50"}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Zap className={`w-4 h-4 ${jurisReadiness >= 80 ? "text-emerald-600" : "text-amber-600"}`} />
            <p className="text-sm font-semibold">JurisEngine Coverage Meter</p>
          </div>
          <span className={`text-2xl font-black ${jurisReadiness >= 80 ? "text-emerald-700" : jurisReadiness >= 40 ? "text-amber-700" : "text-red-700"}`}>
            {jurisReadiness}%
          </span>
        </div>
        <Progress value={jurisReadiness} className="h-2 mb-3" />
        <div className="grid grid-cols-2 gap-2">
          {JURISENGINE_REQUIREMENTS.map(req => {
            const count = verified.filter(e => req.categories.includes(e.category)).length;
            const met = count >= req.minEntries;
            return (
              <div key={req.key} className="flex items-center gap-2 text-xs">
                {met ? <CheckCircle className="w-3 h-3 text-emerald-600 flex-shrink-0" /> : <Lock className="w-3 h-3 text-red-400 flex-shrink-0" />}
                <span className={met ? "text-emerald-800" : "text-red-700"}>{req.label}</span>
                <span className="text-muted-foreground ml-auto">{count}/{req.minEntries}</span>
              </div>
            );
          })}
        </div>
        {jurisReadiness < 100 && (
          <p className="text-xs text-muted-foreground mt-3">
            JurisEngine needs {JURISENGINE_REQUIREMENTS.length - requirementsMet.length} more category coverage areas before production use.
            <Link to="/canon-gap-resolver" className="text-primary hover:underline ml-1">Resolve gaps →</Link>
          </p>
        )}
      </Card>

      {/* Category breakdown */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Category Coverage</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {categoryBreakdown.map(cat => {
            const count = verified.filter(e => e.category === cat.cat).length;
            const total = entries.filter(e => e.category === cat.cat).length;
            return (
              <Card key={cat.cat} className={`p-3 border ${cat.bg}`}>
                <div className="flex items-center justify-between mb-1">
                  <p className={`text-xs font-semibold ${cat.color}`}>{cat.label}</p>
                  {count === 0 && <Badge className="text-[9px] bg-red-100 text-red-700">Gap</Badge>}
                  {count > 0 && <Badge className="text-[9px] bg-emerald-100 text-emerald-700">✓ {count} verified</Badge>}
                </div>
                <p className="text-[10px] text-muted-foreground">{total} total entries, {count} verified active</p>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Recent verified entries */}
      {verified.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Recently Verified</p>
          <div className="space-y-1.5">
            {verified.slice(0, 5).map(e => (
              <div key={e.id} className="flex items-center gap-3 text-xs p-2.5 bg-emerald-50 border border-emerald-100 rounded-lg">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{e.title}</p>
                  {e.citation && <p className="text-muted-foreground">{e.citation}</p>}
                </div>
                <Badge variant="outline" className="text-[9px] flex-shrink-0">{e.category?.replace(/_/g, " ")}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending review */}
      {pending.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Awaiting Review</p>
          <div className="space-y-1.5">
            {pending.map(e => (
              <div key={e.id} className="flex items-center gap-3 text-xs p-2.5 bg-amber-50 border border-amber-100 rounded-lg">
                <Clock className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{e.title}</p>
                </div>
                <Link to="/canon-review" className="text-amber-700 hover:underline flex-shrink-0">Review →</Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}