import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const CATEGORY_COLORS = {
  executive: "#3b82f6",
  workforce: "#22c55e",
  customer: "#06b6d4",
  intelligence: "#a855f7",
  governance: "#f59e0b",
  legal: "#ef4444",
  financial: "#14b8a6",
  knowledge: "#8b5cf6",
  automation: "#6366f1",
  infrastructure: "#64748b",
  experience: "#ec4899",
  resource: "#0ea5e9",
};

export default function ModuleMap({ modules }) {
  if (!modules || modules.length === 0) {
    return <Card><CardContent className="p-8 text-center text-muted-foreground text-sm">No module data yet. Run a scan first.</CardContent></Card>;
  }

  const statusColor = (s) => ({
    excellent: "#22c55e", good: "#3b82f6", fair: "#f59e0b", at_risk: "#f97316", critical: "#ef4444", unregistered: "#94a3b8"
  }[s] || "#94a3b8");

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Module Dependency Map</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5 max-h-[600px] overflow-auto">
        {modules.map(m => (
          <div key={m.module_key} className="border rounded-lg p-2.5 hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: statusColor(m.health_status) }} />
                <span className="text-xs font-medium truncate">{m.module_name}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="outline" className="text-[10px] px-1.5" style={{ borderColor: CATEGORY_COLORS[m.category] || "#94a3b8", color: CATEGORY_COLORS[m.category] || "#94a3b8" }}>
                  {m.category}
                </Badge>
                <span className="text-xs font-mono text-muted-foreground w-7 text-right">{m.health_score || 0}</span>
              </div>
            </div>
            {(m.depends_on || []).length > 0 && (
              <div className="mt-1.5 flex items-start gap-1 text-[10px] text-muted-foreground pl-4">
                <span className="shrink-0">← depends on:</span>
                <span className="truncate">{m.depends_on.join(', ')}</span>
              </div>
            )}
            {(m.depended_by || []).length > 0 && (
              <div className="flex items-start gap-1 text-[10px] text-muted-foreground pl-4">
                <span className="shrink-0">→ needed by:</span>
                <span className="truncate">{m.depended_by.join(', ')}</span>
              </div>
            )}
            {(m.missing_entities || []).length > 0 && (
              <div className="text-[10px] text-red-500 pl-4 mt-0.5">missing: {m.missing_entities.join(', ')}</div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}