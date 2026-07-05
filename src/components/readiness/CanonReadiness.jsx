import React from "react";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Circle } from "lucide-react";

// Canon Population Engine — calculates completion from real CanonEntry data
const CANON_MODULES = [
  { key: "federal_statutes",   label: "Federal Statutes",       categories: ["federal_statute"] },
  { key: "constitution",       label: "Constitution",            categories: ["constitutional_law"] },
  { key: "case_law",           label: "Case Law",                categories: ["case_law"] },
  { key: "civil_rights",       label: "Civil Rights",            categories: ["civil_rights"] },
  { key: "foia",               label: "FOIA",                    categories: ["administrative_law"] },
  { key: "evidence_doctrine",  label: "Evidence Doctrine",       categories: ["evidence_standard"] },
  { key: "nc_doctrine",        label: "NC Doctrine",             categories: ["nc_doctrine"] },
  { key: "standing",           label: "Standing Doctrine",       categories: ["standing_doctrine"] },
  { key: "ai_instructions",    label: "AI Instructions",         categories: ["ai_instruction","prompt_library","decision_tree"] },
  { key: "intake_workflows",   label: "Intake Workflows",        categories: ["intake_workflow"] },
];

function pctColor(pct) {
  if (pct >= 80) return "text-emerald-600";
  if (pct >= 40) return "text-amber-600";
  return "text-red-500";
}

export function CanonReadiness({ entries = [], compact = false }) {
  const modules = CANON_MODULES.map(m => {
    const matching = entries.filter(e => m.categories.includes(e.category));
    const verified = matching.filter(e => e.verified && e.status === "active");
    const hasSome = matching.length > 0;
    const hasVerified = verified.length > 0;
    // Score: has entries = 50%, has verified active = 100%
    const score = hasVerified ? 100 : hasSome ? 50 : 0;
    return { ...m, count: matching.length, verified: verified.length, score };
  });

  const overall = Math.round(modules.reduce((s, m) => s + m.score, 0) / modules.length);

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Progress value={overall} className="flex-1 h-1.5" />
        <span className={`text-xs font-bold ${pctColor(overall)}`}>{overall}%</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Canon Population Engine</p>
        <span className={`text-sm font-black ${pctColor(overall)}`}>{overall}% Complete</span>
      </div>
      {modules.map(m => (
        <div key={m.key} className="flex items-center gap-2">
          {m.score === 100
            ? <CheckCircle className="w-3 h-3 text-emerald-500 flex-shrink-0" />
            : <Circle className="w-3 h-3 text-muted-foreground flex-shrink-0" />
          }
          <p className="text-[10px] flex-1 text-muted-foreground">{m.label}</p>
          <span className="text-[9px] text-muted-foreground">{m.count} entries</span>
          <span className={`text-[10px] font-bold w-8 text-right ${pctColor(m.score)}`}>{m.score}%</span>
        </div>
      ))}
    </div>
  );
}

// Calculate canon readiness % from entries — used by Mission Control
export function calcCanonReadiness(entries = []) {
  const modules = CANON_MODULES.map(m => {
    const matching = entries.filter(e => m.categories.includes(e.category));
    const verified = matching.filter(e => e.verified && e.status === "active");
    return verified.length > 0 ? 100 : matching.length > 0 ? 50 : 0;
  });
  return Math.round(modules.reduce((a, b) => a + b, 0) / modules.length);
}