import React from "react";
import { Badge } from "@/components/ui/badge";

const statusStyles = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  done: "bg-emerald-50 text-emerald-700 border-emerald-200",
  published: "bg-emerald-50 text-emerald-700 border-emerald-200",
  planning: "bg-blue-50 text-blue-700 border-blue-200",
  prospect: "bg-blue-50 text-blue-700 border-blue-200",
  draft: "bg-slate-50 text-slate-600 border-slate-200",
  backlog: "bg-slate-50 text-slate-600 border-slate-200",
  todo: "bg-amber-50 text-amber-700 border-amber-200",
  in_progress: "bg-violet-50 text-violet-700 border-violet-200",
  review: "bg-orange-50 text-orange-700 border-orange-200",
  on_hold: "bg-amber-50 text-amber-700 border-amber-200",
  inactive: "bg-slate-50 text-slate-500 border-slate-200",
  archived: "bg-slate-50 text-slate-500 border-slate-200",
  cancelled: "bg-red-50 text-red-600 border-red-200",
  away: "bg-amber-50 text-amber-700 border-amber-200",
  offline: "bg-slate-50 text-slate-500 border-slate-200",
};

const priorityStyles = {
  low: "bg-slate-50 text-slate-600 border-slate-200",
  medium: "bg-blue-50 text-blue-700 border-blue-200",
  high: "bg-orange-50 text-orange-700 border-orange-200",
  critical: "bg-red-50 text-red-700 border-red-200",
};

export default function StatusBadge({ value, type = "status" }) {
  if (!value) return null;
  const styles = type === "priority" ? priorityStyles : statusStyles;
  const className = styles[value] || "bg-slate-50 text-slate-600 border-slate-200";
  const label = value.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  return (
    <Badge variant="outline" className={`${className} text-[11px] font-medium border px-2 py-0.5 capitalize`}>
      {label}
    </Badge>
  );
}