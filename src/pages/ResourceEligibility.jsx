import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import {
  Compass, CheckCircle, AlertTriangle, Loader2, FileText,
  Clock, Users, DollarSign, Home, Briefcase, Heart, Shield,
  Star, BookOpen, XCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import ReactMarkdown from "react-markdown";

const CATEGORIES = [
  "housing","employment","food","medical","mental_health","legal_aid",
  "transportation","education","veteran","financial","emergency","childcare"
];

export default function ResourceEligibility() {
  const [profile, setProfile] = useState({
    state: "North Carolina", county: "", household_size: 1, monthly_income: 0,
    employment_status: "unemployed", housing_situation: "housed", citizenship_status: "citizen",
    has_children: false, is_veteran: false, is_disabled: false,
    has_criminal_history: false, age: "", priorities: []
  });
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  const togglePriority = (p) => {
    setProfile(f => ({
      ...f,
      priorities: f.priorities.includes(p) ? f.priorities.filter(x => x !== p) : [...f.priorities, p]
    }));
  };

  const analyze = async () => {
    setLoading(true); setResults(null);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are the NCOS Resource Compass Eligibility Engine.

Analyze this person's profile and identify ALL government benefits, programs, and community resources they may qualify for in ${profile.state}.

PROFILE:
- State: ${profile.state}
- County: ${profile.county || "not specified"}
- Household Size: ${profile.household_size}
- Monthly Income: $${profile.monthly_income}
- Employment: ${profile.employment_status}
- Housing Situation: ${profile.housing_situation}
- Citizenship: ${profile.citizenship_status}
- Has Children: ${profile.has_children}
- Veteran: ${profile.is_veteran}
- Disability: ${profile.is_disabled}
- Criminal History: ${profile.has_criminal_history}
- Age: ${profile.age || "not specified"}
- Priority Needs: ${profile.priorities.join(", ") || "all"}

For each program, provide:
1. Program name + agency
2. Why they qualify based on this specific profile
3. Priority level (high/medium/low)
4. Required documents (specific list)
5. Estimated approval timeline
6. Common blockers for this profile type
7. Risk factors that could jeopardize application
8. Required follow-up after application
9. Application method (online/in-person/phone)
10. Benefit amount estimate

Focus on programs actually available in ${profile.state}. Do not fabricate program details. 
Prioritize: ${profile.priorities.length > 0 ? profile.priorities.join(", ") : "all categories"}

Return results for at least 8-12 qualifying programs sorted by priority.`,
      response_json_schema: {
        type: "object",
        properties: {
          summary: { type: "string" },
          programs: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                agency: { type: "string" },
                category: { type: "string" },
                priority: { type: "string" },
                why_qualifies: { type: "string" },
                required_documents: { type: "array", items: { type: "string" } },
                estimated_approval_days: { type: "number" },
                benefit_estimate: { type: "string" },
                application_method: { type: "string" },
                common_blockers: { type: "array", items: { type: "string" } },
                risk_factors: { type: "array", items: { type: "string" } },
                required_followup: { type: "array", items: { type: "string" } },
                action_steps: { type: "array", items: { type: "string" } }
              }
            }
          },
          immediate_priorities: { type: "array", items: { type: "string" } },
          estimated_total_monthly_benefit: { type: "string" },
          crisis_resources: { type: "array", items: { type: "string" } }
        }
      }
    }).catch(() => null);
    setResults(res);
    setLoading(false);
  };

  const startTracking = async (program) => {
    await base44.entities.ResourceApplication.create({
      resource_name: program.name,
      resource_category: program.category,
      client_name: "Eligibility Analysis Client",
      status: "not_started",
      documents_checklist: (program.required_documents || []).map(d => ({ doc: d, obtained: false })),
      notes: `Auto-created from Eligibility Engine. Why qualifies: ${program.why_qualifies}`,
      priority: program.priority === "high" ? "high" : "medium",
      next_steps: program.action_steps || [],
    }).catch(() => {});
  };

  const PRIORITY_COLORS = {
    high: "text-red-600 bg-red-50 border-red-200",
    medium: "text-amber-600 bg-amber-50 border-amber-200",
    low: "text-emerald-600 bg-emerald-50 border-emerald-200",
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">Resource Compass</p>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Compass className="w-6 h-6 text-cyan-500" />Eligibility Engine</h1>
        <p className="text-sm text-muted-foreground">Enter a profile to discover every program they may qualify for — with full documentation requirements and risk analysis.</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-xs text-blue-800 flex items-start gap-2">
        <BookOpen className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
        <span><strong>Educational tool only.</strong> Program availability and eligibility rules change. Always verify directly with the administering agency. This does not constitute benefits advice or representation.</span>
      </div>

      {/* Profile Form */}
      <Card className="p-5 border border-border/60">
        <h2 className="text-sm font-semibold mb-4">Client Profile</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div><label className="text-xs font-semibold block mb-1">State</label>
            <Select value={profile.state} onValueChange={v => setProfile({...profile, state: v})}>
              <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["North Carolina","South Carolina","Virginia","Georgia","Tennessee","Florida"].map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
                <SelectItem value="Federal (US)" className="text-xs">Federal (US)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><label className="text-xs font-semibold block mb-1">County</label><Input value={profile.county} onChange={e => setProfile({...profile, county: e.target.value})} placeholder="Optional" className="text-xs" /></div>
          <div><label className="text-xs font-semibold block mb-1">Age</label><Input type="number" value={profile.age} onChange={e => setProfile({...profile, age: e.target.value})} placeholder="Optional" className="text-xs" /></div>
          <div><label className="text-xs font-semibold block mb-1">Household Size</label><Input type="number" min="1" value={profile.household_size} onChange={e => setProfile({...profile, household_size: Number(e.target.value)})} className="text-xs" /></div>
          <div><label className="text-xs font-semibold block mb-1">Monthly Income ($)</label><Input type="number" min="0" value={profile.monthly_income} onChange={e => setProfile({...profile, monthly_income: Number(e.target.value)})} className="text-xs" /></div>
          <div><label className="text-xs font-semibold block mb-1">Employment</label>
            <Select value={profile.employment_status} onValueChange={v => setProfile({...profile, employment_status: v})}>
              <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{["employed_full","employed_part","unemployed","self_employed","unable_to_work","student","retired"].map(v => <SelectItem key={v} value={v} className="capitalize text-xs">{v.replace(/_/g," ")}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><label className="text-xs font-semibold block mb-1">Housing</label>
            <Select value={profile.housing_situation} onValueChange={v => setProfile({...profile, housing_situation: v})}>
              <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{["housed","at_risk","doubled_up","shelter","unsheltered","transitional"].map(v => <SelectItem key={v} value={v} className="capitalize text-xs">{v.replace(/_/g," ")}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><label className="text-xs font-semibold block mb-1">Citizenship</label>
            <Select value={profile.citizenship_status} onValueChange={v => setProfile({...profile, citizenship_status: v})}>
              <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{["citizen","permanent_resident","visa","undocumented","unknown"].map(v => <SelectItem key={v} value={v} className="capitalize text-xs">{v.replace(/_/g," ")}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex gap-4 mt-4">
          {[["has_children","Has Children"],["is_veteran","Veteran"],["is_disabled","Has Disability"],["has_criminal_history","Criminal History"]].map(([key,label]) => (
            <label key={key} className="flex items-center gap-2 text-xs cursor-pointer">
              <input type="checkbox" checked={profile[key]} onChange={e => setProfile({...profile, [key]: e.target.checked})} className="rounded" />
              {label}
            </label>
          ))}
        </div>
        <div className="mt-4">
          <label className="text-xs font-semibold block mb-2">Priority Need Areas</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(cat => (
              <button key={cat} type="button" onClick={() => togglePriority(cat)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-all capitalize ${profile.priorities.includes(cat) ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}>
                {cat.replace(/_/g," ")}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4">
          <Button onClick={analyze} disabled={loading} className="w-full">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Analyzing eligibility...</> : <><Compass className="w-4 h-4 mr-2" />Run Eligibility Analysis</>}
          </Button>
        </div>
      </Card>

      {/* Results */}
      {results && (
        <div className="space-y-4">
          {/* Summary */}
          <Card className="p-4 border border-cyan-200 bg-cyan-50">
            <p className="text-xs font-bold text-cyan-700 uppercase mb-1">Eligibility Summary</p>
            <p className="text-sm text-cyan-900">{results.summary}</p>
            {results.estimated_total_monthly_benefit && (
              <p className="text-xs font-semibold text-cyan-700 mt-2 flex items-center gap-1"><DollarSign className="w-3.5 h-3.5" />Estimated Total Monthly Benefit: {results.estimated_total_monthly_benefit}</p>
            )}
          </Card>

          {/* Immediate priorities */}
          {(results.immediate_priorities || []).length > 0 && (
            <Card className="p-4 border border-red-200 bg-red-50">
              <p className="text-xs font-bold text-red-700 uppercase mb-2 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" />Immediate Action Required</p>
              <ul className="space-y-1">{results.immediate_priorities.map((p,i) => <li key={i} className="text-xs text-red-800 flex items-start gap-1.5"><span className="font-bold text-red-500">{i+1}.</span>{p}</li>)}</ul>
            </Card>
          )}

          {/* Programs */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold">{(results.programs || []).length} Qualifying Programs Found</h2>
            {(results.programs || []).map((prog, i) => (
              <Card key={i} className="p-4 border border-border/60">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="text-sm font-semibold">{prog.name}</p>
                      {prog.priority && <Badge variant="outline" className={`text-[10px] capitalize ${PRIORITY_COLORS[prog.priority] || ""}`}>{prog.priority} priority</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">{prog.agency} · {prog.category?.replace(/_/g," ")} · {prog.application_method}</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {prog.benefit_estimate && <Badge variant="secondary" className="text-[10px]">{prog.benefit_estimate}</Badge>}
                    <Button size="sm" className="h-7 text-xs" onClick={() => startTracking(prog)}>Track</Button>
                  </div>
                </div>

                {/* Why qualifies */}
                <div className="p-2.5 bg-emerald-50 rounded border border-emerald-100 mb-3">
                  <p className="text-[10px] font-bold text-emerald-700 uppercase mb-0.5">Why This Profile Qualifies</p>
                  <p className="text-xs text-emerald-800">{prog.why_qualifies}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Required docs */}
                  {(prog.required_documents || []).length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5 flex items-center gap-1"><FileText className="w-3 h-3" />Required Documents</p>
                      <ul className="space-y-0.5">{prog.required_documents.map((d,j) => <li key={j} className="text-xs flex items-start gap-1.5"><span className="text-muted-foreground">•</span>{d}</li>)}</ul>
                    </div>
                  )}
                  {/* Blockers + risks */}
                  <div className="space-y-2">
                    {(prog.common_blockers || []).length > 0 && (
                      <div className="p-2 bg-red-50 rounded border border-red-100">
                        <p className="text-[10px] font-bold text-red-700 uppercase mb-1">Possible Blockers</p>
                        <ul className="space-y-0.5">{prog.common_blockers.map((b,j) => <li key={j} className="text-xs text-red-800">• {b}</li>)}</ul>
                      </div>
                    )}
                  </div>
                </div>

                {prog.estimated_approval_days && (
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    Estimated decision: <strong>{prog.estimated_approval_days} days</strong>
                  </div>
                )}
              </Card>
            ))}
          </div>

          {/* Crisis resources */}
          {(results.crisis_resources || []).length > 0 && (
            <Card className="p-4 border border-red-200">
              <p className="text-xs font-bold text-red-700 uppercase mb-2">🚨 Crisis Resources — Contact Immediately if Needed</p>
              <ul className="space-y-1">{results.crisis_resources.map((r,i) => <li key={i} className="text-xs">• {r}</li>)}</ul>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}