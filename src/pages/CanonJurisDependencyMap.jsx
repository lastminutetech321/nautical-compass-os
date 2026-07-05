import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { GitBranch, Loader2, Lock, CheckCircle2, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

const JURIS_FEATURES = [
  {
    name: "JurisEngine Core",
    depends_on: ["42 U.S.C. § 1983", "14th Amendment", "Qualified Immunity", "Article III Standing"],
    status: "blocked",
    readiness_pct: 0,
  },
  {
    name: "Court Compass",
    depends_on: ["14th Amendment", "Qualified Immunity", "Article III Standing"],
    status: "blocked",
    readiness_pct: 0,
  },
  {
    name: "Investigation Compass",
    depends_on: ["42 U.S.C. § 1983", "FOIA (5 U.S.C. § 552)", "Qualified Immunity"],
    status: "blocked",
    readiness_pct: 0,
  },
  {
    name: "Resource Compass",
    depends_on: ["FCRA (15 U.S.C. § 1681)", "FDCPA (15 U.S.C. § 1692)", "FOIA (5 U.S.C. § 552)"],
    status: "blocked",
    readiness_pct: 0,
  },
  {
    name: "FOIA Tracker",
    depends_on: ["FOIA (5 U.S.C. § 552)"],
    status: "blocked",
    readiness_pct: 0,
  },
  {
    name: "Legal Issue Spotter",
    depends_on: ["42 U.S.C. § 1983", "14th Amendment", "FCRA", "FDCPA"],
    status: "blocked",
    readiness_pct: 0,
  },
  {
    name: "Decision Compass",
    depends_on: ["FDCPA", "FCRA"],
    status: "blocked",
    readiness_pct: 0,
  },
];

export default function CanonJurisDependencyMap() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.CanonEntry.list("-created_date", 500).then(data => {
      setEntries(data);
      // Check which dependencies are met
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  const verifiedCitations = new Set(entries.filter(e => e.verified).map(e => e.citation?.toLowerCase()).filter(Boolean));
  const allCitations = new Set(entries.map(e => e.citation?.toLowerCase()).filter(Boolean));

  const features = JURIS_FEATURES.map(f => {
    const deps = f.depends_on.map(dep => {
      const met = Array.from(verifiedCitations).some(c => c.includes(dep.toLowerCase().split("(")[0].trim().toLowerCase()) || dep.toLowerCase().includes(c));
      const imported = Array.from(allCitations).some(c => c.includes(dep.toLowerCase().split("(")[0].trim().toLowerCase()) || dep.toLowerCase().includes(c));
      return { name: dep, met, imported };
    });
    const metCount = deps.filter(d => d.met).length;
    const readiness = Math.round(metCount / deps.length * 100);
    return { ...f, deps, readiness, status: readiness === 100 ? "ready" : readiness > 0 ? "partial" : "blocked" };
  });

  const totalDeps = features.reduce((s, f) => s + f.depends_on.length, 0);
  const metDeps = features.reduce((s, f) => s + f.deps.filter(d => d.met).length, 0);
  const overallCoverage = Math.round(metDeps / totalDeps * 100);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">Canon Population</p>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><GitBranch className="w-6 h-6 text-violet-500" />JurisEngine Dependency Map</h1>
        <p className="text-sm text-muted-foreground mt-1">Which Canon entries each JurisEngine feature depends on. Resolve gaps to unblock builds.</p>
      </div>

      <Card className="p-4 border border-border/60">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Overall Canon Coverage</p>
          <span className="text-sm font-bold">{metDeps}/{totalDeps} dependencies met</span>
        </div>
        <Progress value={overallCoverage} className="h-3" />
        <p className="text-xs text-muted-foreground mt-1.5">{overallCoverage}% of all JurisEngine dependencies are verified in the Canon.</p>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {features.map(f => (
          <Card key={f.name} className="p-4 border border-border/60">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  {f.status === "ready" ? <CheckCircle2 className="w-4 h-4 text-green-500" /> :
                   f.status === "partial" ? <AlertTriangle className="w-4 h-4 text-amber-500" /> :
                   <Lock className="w-4 h-4 text-red-500" />}
                  {f.name}
                </h3>
                <Badge variant={f.status === "ready" ? "default" : f.status === "partial" ? "outline" : "destructive"} className="text-[9px] mt-1 capitalize">
                  {f.status}
                </Badge>
              </div>
              <div className="text-right">
                <p className="text-lg font-black">{f.readiness}%</p>
                <p className="text-[10px] text-muted-foreground">ready</p>
              </div>
            </div>
            <div className="space-y-1.5">
              {f.deps.map(d => (
                <div key={d.name} className="flex items-center gap-2">
                  {d.met ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" /> :
                   d.imported ? <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" /> :
                   <Lock className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />}
                  <p className={`text-xs ${d.met ? "text-green-700 line-through" : d.imported ? "text-amber-700" : "text-muted-foreground"}`}>{d.name}</p>
                  <Badge variant={d.met ? "secondary" : d.imported ? "outline" : "destructive"} className="text-[8px] ml-auto">
                    {d.met ? "Verified" : d.imported ? "Imported" : "Missing"}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}