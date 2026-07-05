import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Sparkles, Loader2, Shield, CheckCircle, AlertTriangle, Clock, DollarSign, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SelfImprovement() {
  const [idea, setIdea] = useState("");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const analyze = async () => {
    if (!idea.trim()) return;
    setGenerating(true);
    setResult(null);
    setSaved(false);

    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are the Chief Architect of Nautical Compass OS (NCOS), an AI-first operating system for companies, investigations, and legal workflows.

A new idea has been submitted for NCOS self-improvement:
"${idea}"

Analyze this idea and produce a comprehensive implementation plan:

1. department: Which NCOS department owns this? (Executive Command, AI Workforce, Build Studio, Evidence Command, Automation Center, Business Operations, Knowledge Graph, Blueprint Library, Self Improvement)
2. feature_title: Clear title for this feature
3. specification: Detailed technical specification (3-5 paragraphs)
4. user_stories: Array of user stories
5. assigned_agents: Array of AI agent names best suited (from: Chief Architect, Lead Software Engineer, Automation Engineer, Feature Builder Agent, Documentation Writer, QA / Testing Agent, Security Officer)
6. dependencies: Array of what this depends on
7. reusable_components: Array of existing NCOS components that can be reused
8. time_estimate: Rough estimate (e.g., "2-3 days", "1 week")
9. cost_estimate: Rough dev cost in USD (just a number like 500)
10. risks: Array of risks
11. testing_checklist: Array of test cases
12. deployment_checklist: Array of manual deployment steps (never automatic)
13. priority: low, medium, high, or critical`,
      response_json_schema: {
        type: "object",
        properties: {
          department: { type: "string" },
          feature_title: { type: "string" },
          specification: { type: "string" },
          user_stories: { type: "array", items: { type: "string" } },
          assigned_agents: { type: "array", items: { type: "string" } },
          dependencies: { type: "array", items: { type: "string" } },
          reusable_components: { type: "array", items: { type: "string" } },
          time_estimate: { type: "string" },
          cost_estimate: { type: "number" },
          risks: { type: "array", items: { type: "string" } },
          testing_checklist: { type: "array", items: { type: "string" } },
          deployment_checklist: { type: "array", items: { type: "string" } },
          priority: { type: "string" }
        },
        required: ["department", "feature_title", "specification", "user_stories", "assigned_agents", "dependencies", "reusable_components", "time_estimate", "cost_estimate", "risks", "testing_checklist", "deployment_checklist", "priority"]
      }
    });

    setResult(res);
    setGenerating(false);
  };

  const saveAsFeature = async () => {
    if (!result) return;
    setSaving(true);
    await base44.entities.FeatureRequest.create({
      title: result.feature_title,
      plain_description: idea,
      feature_spec: result.specification,
      user_stories: result.user_stories || [],
      risks: result.risks || [],
      testing_checklist: result.testing_checklist || [],
      deployment_checklist: result.deployment_checklist || [],
      stage: "planning"
    });
    setSaving(false);
    setSaved(true);
  };

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">NCOS · Self Improvement</p>
        <h1 className="text-2xl font-bold tracking-tight">NCOS Self-Improvement Engine</h1>
        <p className="text-sm text-muted-foreground mt-1">Describe an idea in plain English. NCOS analyzes it, assigns it to a department, plans it, and prepares it for implementation.</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-6 text-xs text-blue-700">
        <Sparkles className="w-3.5 h-3.5 inline mr-1.5" />
        The mission is to build the operating system that continuously builds itself and future companies. Every idea makes NCOS more capable.
      </div>

      <Card className="p-5 border border-border/60 mb-6">
        <div className="space-y-3">
          <Textarea
            value={idea}
            onChange={e => setIdea(e.target.value)}
            placeholder="Describe your idea in plain English... e.g. 'I want NCOS to automatically generate a weekly summary email for each client with their project status, upcoming deadlines, and any overdue tasks.'"
            rows={5}
            className="text-sm"
          />
          <div className="flex justify-end">
            <Button onClick={analyze} disabled={generating || !idea.trim()} className="gap-2">
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {generating ? "Analyzing..." : "Analyze & Plan"}
            </Button>
          </div>
        </div>
      </Card>

      {result && (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-lg font-bold">{result.feature_title}</h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge className="bg-primary/10 text-primary border border-primary/20 text-xs">{result.department}</Badge>
                <Badge variant="outline" className={`text-xs ${result.priority === "critical" ? "text-red-600" : result.priority === "high" ? "text-amber-600" : "text-blue-600"}`}>{result.priority} priority</Badge>
              </div>
            </div>
            <div className="flex gap-2">
              {saved ? (
                <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs px-3 py-1.5"><CheckCircle className="w-3.5 h-3.5 mr-1.5 inline" />Saved to Feature Builder</Badge>
              ) : (
                <Button size="sm" onClick={saveAsFeature} disabled={saving}>{saving ? "Saving..." : "Save to Feature Builder"}</Button>
              )}
            </div>
          </div>

          {/* Estimates */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Time Estimate", value: result.time_estimate, icon: Clock, color: "text-blue-600 bg-blue-50" },
              { label: "Cost Estimate", value: result.cost_estimate ? `$${Number(result.cost_estimate).toLocaleString()}` : "TBD", icon: DollarSign, color: "text-emerald-600 bg-emerald-50" },
              { label: "Agents Needed", value: (result.assigned_agents || []).length, icon: Users, color: "text-violet-600 bg-violet-50" },
              { label: "Dependencies", value: (result.dependencies || []).length, icon: AlertTriangle, color: "text-amber-600 bg-amber-50" },
            ].map(m => (
              <Card key={m.label} className="p-3 border border-border/60">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${m.color}`}><m.icon className="w-4 h-4" /></div>
                  <div><p className="text-[10px] text-muted-foreground">{m.label}</p><p className="text-sm font-bold">{m.value}</p></div>
                </div>
              </Card>
            ))}
          </div>

          <Card className="border border-border/60 overflow-hidden">
            <Tabs defaultValue="spec">
              <div className="px-4 pt-4"><TabsList className="flex-wrap h-auto gap-1">
                <TabsTrigger value="spec">Spec</TabsTrigger>
                <TabsTrigger value="agents">Agents</TabsTrigger>
                <TabsTrigger value="stories">Stories</TabsTrigger>
                <TabsTrigger value="reuse">Reuse</TabsTrigger>
                <TabsTrigger value="risks">Risks</TabsTrigger>
                <TabsTrigger value="testing">Testing</TabsTrigger>
                <TabsTrigger value="deploy">Deploy</TabsTrigger>
              </TabsList></div>
              <div className="p-4">
                <TabsContent value="spec"><div className="bg-muted p-4 rounded-lg text-sm whitespace-pre-wrap">{result.specification}</div></TabsContent>
                <TabsContent value="agents" className="space-y-2">
                  {(result.assigned_agents || []).map((a, i) => <div key={i} className="flex items-center gap-2 p-2.5 bg-violet-50 border border-violet-100 rounded-lg text-sm"><Users className="w-4 h-4 text-violet-600" />{a}</div>)}
                </TabsContent>
                <TabsContent value="stories"><ul className="space-y-2">{(result.user_stories || []).map((s, i) => <li key={i} className="text-sm flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />{s}</li>)}</ul></TabsContent>
                <TabsContent value="reuse">
                  <div className="mb-3"><p className="text-xs font-semibold text-muted-foreground mb-2">REUSABLE COMPONENTS</p><div className="flex flex-wrap gap-2">{(result.reusable_components || []).map((c, i) => <Badge key={i} variant="outline" className="text-xs">{c}</Badge>)}</div></div>
                  <div><p className="text-xs font-semibold text-muted-foreground mb-2">DEPENDENCIES</p><div className="flex flex-wrap gap-2">{(result.dependencies || []).map((d, i) => <Badge key={i} variant="secondary" className="text-xs">{d}</Badge>)}</div></div>
                </TabsContent>
                <TabsContent value="risks"><ul className="space-y-2">{(result.risks || []).map((r, i) => <li key={i} className="text-sm flex items-start gap-2"><AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />{r}</li>)}</ul></TabsContent>
                <TabsContent value="testing"><ul className="space-y-2">{(result.testing_checklist || []).map((t, i) => <li key={i} className="text-sm flex items-start gap-2"><CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />{t}</li>)}</ul></TabsContent>
                <TabsContent value="deploy">
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3 text-xs text-amber-700 flex items-center gap-2"><Shield className="w-4 h-4" />Manual approval required. Never deploy automatically.</div>
                  <ul className="space-y-2">{(result.deployment_checklist || []).map((d, i) => <li key={i} className="text-sm flex items-start gap-2"><CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />{d}</li>)}</ul>
                </TabsContent>
              </div>
            </Tabs>
          </Card>
        </div>
      )}
    </div>
  );
}