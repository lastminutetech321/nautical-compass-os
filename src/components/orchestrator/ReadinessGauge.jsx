import React from "react";
export default function ReadinessGauge({ score, label }) {
  const pct = Math.max(0, Math.min(100, score || 0));
  const color = pct >= 80 ? "#22c55e" : pct >= 65 ? "#3b82f6" : pct >= 45 ? "#f59e0b" : pct >= 25 ? "#f97316" : "#ef4444";
  const circumference = 2 * Math.PI * 70;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative w-44 h-44">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
          <circle cx="80" cy="80" r="70" fill="none" stroke="hsl(var(--muted))" strokeWidth="12" />
          <circle
            cx="80" cy="80" r="70" fill="none" stroke={color} strokeWidth="12"
            strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 1s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold" style={{ color }}>{pct}%</span>
          <span className="text-xs text-muted-foreground mt-1">Autonomous</span>
        </div>
      </div>
      {label && <div className="mt-3 text-sm font-medium text-muted-foreground">{label}</div>}
    </div>
  );
}