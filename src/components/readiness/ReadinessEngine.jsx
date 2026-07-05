import React from "react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle, Circle, Lock } from "lucide-react";

// ── Checklist definitions ─────────────────────────────────────────────────
// Each rail has a canonical checklist. Completion = completed_tasks / required_tasks.
// Dimension weights define how much each area contributes to overall readiness.

export const DIMENSION_WEIGHTS = {
  architecture: 15,
  backend:      20,
  database:     15,
  ai:           20,
  testing:      10,
  documentation: 10,
  deployment:   10,
};

// Classify a task string into a dimension by keyword prefix or pattern
export function classifyTask(task) {
  const t = task.toLowerCase();
  if (t.startsWith("[arch]") || t.includes("architecture") || t.includes("schema") || t.includes("design")) return "architecture";
  if (t.startsWith("[be]") || t.includes("function") || t.includes("api") || t.includes("backend") || t.includes("endpoint")) return "backend";
  if (t.startsWith("[db]") || t.includes("entity") || t.includes("database") || t.includes("seed") || t.includes("migration") || t.includes("index")) return "database";
  if (t.startsWith("[ai]") || t.includes("ai") || t.includes("llm") || t.includes("prompt") || t.includes("canon") || t.includes("agent")) return "ai";
  if (t.startsWith("[test]") || t.includes("test") || t.includes("qa") || t.includes("verify")) return "testing";
  if (t.startsWith("[doc]") || t.includes("doc") || t.includes("readme") || t.includes("guide") || t.includes("notes")) return "documentation";
  if (t.startsWith("[deploy]") || t.includes("deploy") || t.includes("production") || t.includes("release") || t.includes("launch")) return "deployment";
  return "backend"; // default
}

// Calculate per-dimension percentage from task arrays
export function calcDimensionPcts(required = [], completed = []) {
  const completedSet = new Set(completed);
  const buckets = { architecture: { r: 0, c: 0 }, backend: { r: 0, c: 0 }, database: { r: 0, c: 0 }, ai: { r: 0, c: 0 }, testing: { r: 0, c: 0 }, documentation: { r: 0, c: 0 }, deployment: { r: 0, c: 0 } };

  for (const t of required) {
    const dim = classifyTask(t);
    buckets[dim].r++;
    if (completedSet.has(t)) buckets[dim].c++;
  }

  const result = {};
  for (const [dim, { r, c }] of Object.entries(buckets)) {
    result[`${dim}_pct`] = r === 0 ? 0 : Math.round((c / r) * 100);
  }
  return result;
}

// Overall readiness = weighted average of dimension percentages derived from tasks
export function calcOverallReadiness(build) {
  const required = build.required_tasks || [];
  const completed = build.completed_tasks || [];
  if (required.length === 0) return 0;

  // Use task-derived dimensions
  const pcts = calcDimensionPcts(required, completed);
  let weightedSum = 0;
  let totalWeight = 0;
  for (const [dim, weight] of Object.entries(DIMENSION_WEIGHTS)) {
    weightedSum += (pcts[`${dim}_pct`] || 0) * weight;
    totalWeight += weight;
  }
  return Math.round(weightedSum / totalWeight);
}

// Simple task completion percentage
export function calcCompletion(required = [], completed = []) {
  if (!required.length) return 0;
  const completedSet = new Set(completed);
  const done = required.filter(t => completedSet.has(t)).length;
  return Math.round((done / required.length) * 100);
}

const DIMS = [
  { key: "architecture", label: "Architecture", weight: DIMENSION_WEIGHTS.architecture },
  { key: "backend",      label: "Backend",       weight: DIMENSION_WEIGHTS.backend },
  { key: "database",     label: "Database",      weight: DIMENSION_WEIGHTS.database },
  { key: "ai",           label: "AI / Canon",    weight: DIMENSION_WEIGHTS.ai },
  { key: "testing",      label: "Testing",       weight: DIMENSION_WEIGHTS.testing },
  { key: "documentation",label: "Docs",          weight: DIMENSION_WEIGHTS.documentation },
  { key: "deployment",   label: "Deployment",    weight: DIMENSION_WEIGHTS.deployment },
];

function pctColor(pct) {
  if (pct >= 80) return "text-emerald-600";
  if (pct >= 50) return "text-amber-600";
  return "text-red-500";
}

export function ReadinessDimensions({ build, compact = false }) {
  const required  = build.required_tasks  || [];
  const completed = build.completed_tasks || [];
  const pcts      = calcDimensionPcts(required, completed);
  const overall   = calcOverallReadiness(build);

  return (
    <div className="space-y-2">
      {!compact && (
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Readiness Engine</p>
          <span className={`text-sm font-black ${pctColor(overall)}`}>{overall}% Overall</span>
        </div>
      )}
      {!compact && (
        <p className="text-[10px] text-muted-foreground mb-2">
          Calculated from {completed.length}/{required.length} completed tasks · weighted by dimension
        </p>
      )}
      {DIMS.map(d => {
        const val = pcts[`${d.key}_pct`] || 0;
        // count tasks in this dim
        const dimRequired  = required.filter(t => classifyTask(t) === d.key).length;
        const dimCompleted = completed.filter(t => classifyTask(t) === d.key).length;
        return (
          <div key={d.key} className="flex items-center gap-2">
            <p className="text-[10px] w-20 text-muted-foreground flex-shrink-0">{d.label}</p>
            <Progress value={val} className="flex-1 h-1.5" />
            <span className={`text-[10px] font-bold w-8 text-right ${pctColor(val)}`}>{val}%</span>
            {!compact && <span className="text-[9px] text-muted-foreground w-10 text-right">{dimCompleted}/{dimRequired}</span>}
          </div>
        );
      })}
    </div>
  );
}

export function TaskCompletion({ required = [], completed = [] }) {
  const completedSet = new Set(completed);
  const pct = calcCompletion(required, completed);
  const remaining = required.filter(t => !completedSet.has(t));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Task Completion</p>
        <span className={`text-sm font-black ${pctColor(pct)}`}>{completed.length}/{required.length} · {pct}%</span>
      </div>
      <Progress value={pct} className="h-2" />
      <div className="grid grid-cols-1 gap-1 max-h-48 overflow-y-auto">
        {required.map(task => {
          const done = completedSet.has(task);
          const dim  = classifyTask(task);
          return (
            <div key={task} className={`flex items-center gap-2 text-xs py-0.5 ${done ? "text-muted-foreground line-through" : "text-foreground"}`}>
              {done
                ? <CheckCircle className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                : <Circle className="w-3 h-3 text-muted-foreground flex-shrink-0" />
              }
              <span className="flex-1">{task}</span>
              <Badge variant="outline" className="text-[8px] px-1 py-0 opacity-50">{dim}</Badge>
            </div>
          );
        })}
      </div>
      {remaining.length > 0 && (
        <div className="mt-2 pt-2 border-t border-border/40">
          <p className="text-[10px] text-muted-foreground font-semibold mb-1">REMAINING ({remaining.length})</p>
          <div className="flex flex-wrap gap-1">
            {remaining.slice(0, 10).map(t => (
              <Badge key={t} variant="outline" className="text-[9px] text-amber-600 border-amber-200 max-w-[160px] truncate">{t}</Badge>
            ))}
            {remaining.length > 10 && <Badge variant="outline" className="text-[9px] text-muted-foreground">+{remaining.length - 10} more</Badge>}
          </div>
        </div>
      )}
    </div>
  );
}

export function BlockedAlert({ build }) {
  if (!build.is_blocked && !(build.blocked_by || []).length) return null;
  return (
    <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
      <Lock className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
      <div>
        <p className="font-semibold">BLOCKED — Cannot progress until dependencies resolve</p>
        {(build.blocked_by || []).length > 0 && (
          <p className="mt-0.5">Waiting on: {build.blocked_by.join(", ")}</p>
        )}
      </div>
    </div>
  );
}