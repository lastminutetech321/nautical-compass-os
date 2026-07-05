import React from "react";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Circle, AlertTriangle } from "lucide-react";

// Per-Rail module definitions — completion is calculated from tasks ticked off
export const RAIL_MODULES = {
  jurisengine: [
    "Authority Validation","Standing Analysis","Capacity Analysis",
    "Immunity Analysis","Constitutional Analysis","Civil Rights Module",
    "Case Recommendation","Evidence Review","Timeline Builder",
    "Packet Generator","Report Generator","Testing"
  ],
  legal_rail: [
    "Client Intake","Evidence Vault","FOIA Tracker",
    "Investigation Compass","Authority Compass","Court Compass",
    "Timeline Builder","Document Builder","AI Review",
    "Case Management","Automation","Notifications"
  ],
  culture_rail: [
    "Artist Onboarding","Artist Profiles","Music Uploads",
    "Albums","Singles","Streaming","Radio",
    "Royalties","Subscriptions","Analytics","Community","Events",
    "Merchandise","Creator Payouts"
  ],
  workforce_rail: [
    "Worker Profiles","Availability","Dispatch","Scheduling",
    "Payroll","GPS","Ratings","Contracts","Training",
    "Certifications","Invoices","Time Tracking"
  ],
  resource_compass: [
    "Eligibility Engine","Benefits Database","Document Vault",
    "Application Tracker","Appointment Manager","Reminder Engine",
    "Follow-up Automation","Community Resources","Status Tracking","Outcome Reporting"
  ],
  nc_canon: [
    "Federal Statutes","Constitution","Case Law","Civil Rights",
    "FOIA Doctrine","Evidence Standards","NC Doctrine","Standing Doctrine",
    "AI Instructions","Intake Workflows"
  ],
  platform: [
    "Authentication","Mission Control","Navigation",
    "Permissions","Database","API","Testing","Deployment"
  ]
};

function pctColor(pct) {
  if (pct >= 80) return "text-emerald-600";
  if (pct >= 40) return "text-amber-600";
  return "text-red-500";
}

// Calculates rail completion from BuildRegistry completed_tasks vs required_tasks
export function calcRailCompletion(railBuilds = []) {
  if (!railBuilds.length) return 0;
  const totalRequired = railBuilds.reduce((s, b) => s + (b.required_tasks || []).length, 0);
  const totalCompleted = railBuilds.reduce((s, b) => s + (b.completed_tasks || []).length, 0);
  if (!totalRequired) return 0;
  return Math.round((totalCompleted / totalRequired) * 100);
}

export function RailModuleProgress({ rail, completedModules = [], onToggle, readOnly = true }) {
  const modules = RAIL_MODULES[rail] || [];
  const pct = modules.length ? Math.round((completedModules.length / modules.length) * 100) : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Module Completion</p>
        <span className={`text-sm font-black ${pctColor(pct)}`}>{completedModules.length}/{modules.length} · {pct}%</span>
      </div>
      <Progress value={pct} className="h-2 mb-3" />
      <div className="grid grid-cols-2 gap-1">
        {modules.map(m => {
          const done = completedModules.includes(m);
          return (
            <div
              key={m}
              className={`flex items-center gap-1.5 text-[10px] py-0.5 px-1 rounded ${!readOnly ? "cursor-pointer hover:bg-muted" : ""} ${done ? "text-muted-foreground" : "text-foreground"}`}
              onClick={() => !readOnly && onToggle && onToggle(m)}
            >
              {done
                ? <CheckCircle className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                : <Circle className="w-3 h-3 text-muted-foreground flex-shrink-0" />
              }
              <span className={done ? "line-through" : ""}>{m}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Compact rail completion bar for Mission Control
export function RailCompletionBar({ rail, completedModules = [] }) {
  const modules = RAIL_MODULES[rail] || [];
  const pct = modules.length ? Math.round((completedModules.length / modules.length) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <Progress value={pct} className="flex-1 h-1.5" />
      <span className={`text-[10px] font-bold w-8 text-right ${pctColor(pct)}`}>{pct}%</span>
    </div>
  );
}