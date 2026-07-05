import React from "react";
import { Card } from "@/components/ui/card";

export default function MetricCard({ label, value, icon: Icon, trend, color = "primary" }) {
  const colorMap = {
    primary: "bg-blue-50 text-blue-600",
    success: "bg-emerald-50 text-emerald-600",
    warning: "bg-amber-50 text-amber-600",
    danger: "bg-red-50 text-red-600",
    purple: "bg-violet-50 text-violet-600",
  };

  return (
    <Card className="p-5 border border-border/60 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-bold mt-1.5 tracking-tight">{value}</p>
          {trend && (
            <p className={`text-xs mt-1.5 font-medium ${trend > 0 ? "text-emerald-600" : "text-red-500"}`}>
              {trend > 0 ? "+" : ""}{trend}% from last month
            </p>
          )}
        </div>
        {Icon && (
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorMap[color]}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </Card>
  );
}