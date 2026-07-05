import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const DIM_ICONS = {
  "Module Health": "📊",
  "Customer Health": "👥",
  "Revenue Health": "💰",
  "Intelligence Growth": "🧠",
  "Knowledge Growth": "📚",
  "Canon Coverage": "⚖️",
  "Automation Coverage": "⚙️",
  "Compliance Health": "🛡️",
  "AI Effectiveness": "🤖",
};

export default function HealthDimensions({ dimensions }) {
  if (!dimensions || dimensions.length === 0) return null;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {dimensions.map(d => {
        const color = d.score >= 80 ? "#22c55e" : d.score >= 65 ? "#3b82f6" : d.score >= 45 ? "#f59e0b" : d.score >= 25 ? "#f97316" : "#ef4444";
        return (
          <Card key={d.name} className="p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <span className="text-base">{DIM_ICONS[d.name] || "📈"}</span>
                <span className="text-xs font-medium">{d.name}</span>
              </div>
              <span className="text-sm font-bold font-mono" style={{ color }}>{d.score}</span>
            </div>
            <Progress value={d.score} className="h-1.5" />
            <div className="mt-1 text-[10px] text-muted-foreground">Weight: {Math.round(d.weight * 100)}%</div>
          </Card>
        );
      })}
    </div>
  );
}