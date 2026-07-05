import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Target, Loader2, CheckCircle, Clock, DollarSign, FileText,
  AlertTriangle, Zap, Calendar, RefreshCw, Star, TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import moment from "moment";
import ReactMarkdown from "react-markdown";

export default function ResourcePlanner() {
  const [cases, setCases] = useState([]);
  const [applications, setApplications] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [selectedCase, setSelectedCase] = useState(null);
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    Promise.all([
      base44.entities.ResourceCase.filter({ status: "active" }, "-created_date", 20).catch(() => []),
      base44.entities.ResourceApplication.list("-created_date", 200).catch(() => []),
      base44.entities.ResourceReminder.filter({ status: "pending" }, "due_date", 50).catch(() => []),
    ]).then(([c, a, r]) => { setCases(c); setApplications(a); setReminders(r); setLoading(false); });
  }, []);

  const generatePlan = async (rc) => {
    setSelectedCase(rc);
    setGenerating(true); setPlan(null);
    const caseApps = applications.filter(a => a.case_id === rc.id);
    const caseReminders = reminders.filter(r => r.case_id === rc.id);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are the NCOS Resource Compass Benefit Planner.

Create a comprehensive, prioritized benefit strategy for this person.

CLIENT PROFILE:
- Name: ${rc.client_name}
- Crisis Level: ${rc.crisis_level}
- Housing: ${rc.housing_situation}
- Employment: ${rc.employment_status}
- Household Size: ${rc.household_size}
- Monthly Income: $${rc.monthly_income}
- Primary Needs: ${(rc.primary_needs || []).join(", ")}
- Has Children: ${rc.has_children}
- Veteran: ${rc.is_veteran}
- Disability: ${rc.is_disabled}
- County/State: ${rc.county || "NC"}, ${rc.jurisdiction || "North Carolina"}
- Citizenship: ${rc.citizenship_status}

CURRENT APPLICATIONS (${caseApps.length}):
${caseApps.map(a => `- ${a.resource_name}: ${a.status}`).join("\n") || "None started"}

PENDING DEADLINES:
${caseReminders.map(r => `- ${r.title}: due ${r.due_date}`).join("\n") || "None"}

Create a benefit plan with:
1. situation_assessment: Current stability assessment and primary risks
2. immediate_actions: Top 3 things to do in the next 48 hours
3. week_1_priorities: What to accomplish in week 1
4. week_2_4_plan: 30-day benefit strategy
5. benefit_sequence: Ordered list of benefits to apply for with rationale for the sequence
6. document_master_list: All documents to gather across all programs (deduplicated)
7. estimated_monthly_benefit: Estimated total monthly support if all programs approved
8. stability_timeline: Estimated weeks to reach baseline stability
9. risk_flags: Specific risks to watch for this profile
10. success_indicators: How to measure progress toward stability`,
      response_json_schema: {
        type: "object",
        properties: {
          situation_assessment: { type: "string" },
          immediate_actions: { type: "array", items: { type: "string" } },
          week_1_priorities: { type: "array", items: { type: "string" } },
          week_2_4_plan: { type: "string" },
          benefit_sequence: { type: "array", items: { type: "object", properties: { program: { type: "string" }, why_first: { type: "string" }, estimated_days: { type: "number" } } } },
          document_master_list: { type: "array", items: { type: "string" } },
          estimated_monthly_benefit: { type: "string" },
          stability_timeline: { type: "string" },
          risk_flags: { type: "array", items: { type: "string" } },
          success_indicators: { type: "array", items: { type: "string" } }
        }
      }
    }).catch(() => null);
    setPlan(res);
    setGenerating(false);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">Resource Compass</p>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Target className="w-6 h-6 text-cyan-500" />Benefit Planner</h1>
        <p className="text-sm text-muted-foreground">AI-generated benefit strategy — sequenced, prioritized, and complete.</p>
      </div>

      {cases.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <Target className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-30" />
          <p className="text-sm text-muted-foreground">Open an active case first, then return here to generate a benefit plan.</p>
        </div>
      ) : (
        <>
          {/* Case selector */}
          <Card className="p-4 border border-border/60">
            <p className="text-xs font-semibold mb-3 uppercase text-muted-foreground tracking-wide">Select Case to Plan</p>
            <div className="space-y-2">
              {cases.map(c => {
                const caseApps = applications.filter(a => a.case_id === c.id);
                const approvedCount = caseApps.filter(a => a.status === "approved").length;
                return (
                  <div key={c.id} className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${selectedCase?.id === c.id ? "border-primary bg-primary/5" : "border-border/40 hover:border-primary/30"}`} onClick={() => generatePlan(c)}>
                    <div>
                      <p className="text-sm font-semibold">{c.client_name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{c.crisis_level} · {(c.primary_needs||[]).slice(0,2).join(", ")}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {caseApps.length > 0 && <span className="text-xs text-muted-foreground">{approvedCount}/{caseApps.length} apps</span>}
                      <Button size="sm" className="h-7 text-xs" disabled={generating}>
                        {generating && selectedCase?.id === c.id ? <><Loader2 className="w-3 h-3 animate-spin mr-1" />Planning...</> : "Generate Plan"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {plan && selectedCase && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-cyan-500" />
                <h2 className="text-lg font-bold">Benefit Plan — {selectedCase.client_name}</h2>
              </div>

              {/* Situation assessment */}
              <Card className="p-4 border border-cyan-200 bg-cyan-50">
                <p className="text-[10px] font-bold text-cyan-700 uppercase mb-1">Situation Assessment</p>
                <p className="text-sm text-cyan-900">{plan.situation_assessment}</p>
                {plan.estimated_monthly_benefit && (
                  <div className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-cyan-800">
                    <DollarSign className="w-4 h-4" />Estimated Monthly Benefit if All Approved: {plan.estimated_monthly_benefit}
                  </div>
                )}
                {plan.stability_timeline && (
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-cyan-700">
                    <Clock className="w-3.5 h-3.5" />Stability Timeline: {plan.stability_timeline}
                  </div>
                )}
              </Card>

              {/* Immediate actions */}
              {(plan.immediate_actions||[]).length > 0 && (
                <Card className="p-4 border border-red-200 bg-red-50">
                  <p className="text-[10px] font-bold text-red-700 uppercase mb-2">⚡ Do These in the Next 48 Hours</p>
                  <ul className="space-y-1.5">{plan.immediate_actions.map((a,i) => <li key={i} className="text-sm text-red-800 flex items-start gap-2"><span className="font-black text-red-500">{i+1}.</span>{a}</li>)}</ul>
                </Card>
              )}

              {/* Week 1 */}
              {(plan.week_1_priorities||[]).length > 0 && (
                <Card className="p-4 border border-amber-200 bg-amber-50">
                  <p className="text-[10px] font-bold text-amber-700 uppercase mb-2">📅 Week 1 Priorities</p>
                  <ul className="space-y-1.5">{plan.week_1_priorities.map((a,i) => <li key={i} className="text-sm text-amber-800 flex items-start gap-2"><span className="font-bold text-amber-500">{i+1}.</span>{a}</li>)}</ul>
                </Card>
              )}

              {/* Benefit sequence */}
              {(plan.benefit_sequence||[]).length > 0 && (
                <Card className="p-4 border border-border/60">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase mb-3">📋 Application Sequence — Apply in This Order</p>
                  <div className="space-y-2">
                    {plan.benefit_sequence.map((b, i) => (
                      <div key={i} className="flex items-start gap-3 p-2.5 bg-muted/30 rounded">
                        <div className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center flex-shrink-0 font-bold">{i+1}</div>
                        <div>
                          <p className="text-sm font-semibold">{b.program}</p>
                          <p className="text-xs text-muted-foreground">{b.why_first}</p>
                          {b.estimated_days && <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1"><Clock className="w-3 h-3" />{b.estimated_days} days to decision</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Document master list */}
              {(plan.document_master_list||[]).length > 0 && (
                <Card className="p-4 border border-border/60">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2 flex items-center gap-1"><FileText className="w-3.5 h-3.5" />Master Document Checklist (All Programs)</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                    {plan.document_master_list.map((d,i) => (
                      <div key={i} className="flex items-start gap-1.5 text-xs"><CheckCircle className="w-3 h-3 text-muted-foreground flex-shrink-0 mt-0.5" />{d}</div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Risk flags */}
              {(plan.risk_flags||[]).length > 0 && (
                <Card className="p-4 border border-orange-200 bg-orange-50">
                  <p className="text-[10px] font-bold text-orange-700 uppercase mb-2 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" />Risk Flags</p>
                  <ul className="space-y-1">{plan.risk_flags.map((r,i) => <li key={i} className="text-xs text-orange-800 flex items-start gap-1.5"><span>⚠</span>{r}</li>)}</ul>
                </Card>
              )}

              {/* 30-day plan */}
              {plan.week_2_4_plan && (
                <Card className="p-4 border border-border/60">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2 flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />30-Day Benefit Strategy</p>
                  <div className="text-sm prose prose-sm max-w-none"><ReactMarkdown>{plan.week_2_4_plan}</ReactMarkdown></div>
                </Card>
              )}

              {/* Success indicators */}
              {(plan.success_indicators||[]).length > 0 && (
                <Card className="p-4 border border-emerald-200 bg-emerald-50">
                  <p className="text-[10px] font-bold text-emerald-700 uppercase mb-2 flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" />Success Indicators — Measuring Progress to Stability</p>
                  <ul className="space-y-1">{plan.success_indicators.map((s,i) => <li key={i} className="text-xs text-emerald-800 flex items-start gap-1.5"><Star className="w-3 h-3 flex-shrink-0 mt-0.5" />{s}</li>)}</ul>
                </Card>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}