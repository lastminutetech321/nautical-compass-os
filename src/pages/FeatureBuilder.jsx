import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Wand2, CheckCircle, AlertTriangle, Loader2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import moment from "moment";

const stages = ["idea","planning","architecture_review","development","testing","approved","ready_for_deployment","deployed"];
const stageColors = { idea: "bg-slate-100 text-slate-600", planning: "bg-blue-100 text-blue-700", architecture_review: "bg-violet-100 text-violet-700", development: "bg-amber-100 text-amber-700", testing: "bg-orange-100 text-orange-700", approved: "bg-emerald-100 text-emerald-700", ready_for_deployment: "bg-emerald-100 text-emerald-700", deployed: "bg-emerald-100 text-emerald-700" };

export default function FeatureBuilder() {
  const [features, setFeatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [ideaOpen, setIdeaOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [plainDesc, setPlainDesc] = useState("");
  const [featureTitle, setFeatureTitle] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    base44.entities.FeatureRequest.list("-created_date", 100).then(data => {
      setFeatures(data);
      if (data.length > 0 && !selected) setSelected(data[0]);
    }).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleGenerate = async (e) => {
    e.preventDefault();
    setGenerating(true);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a senior software architect. Generate a comprehensive feature specification for the following feature:

Feature: ${featureTitle}
Description: ${plainDesc}

Generate:
1. feature_spec: A detailed technical specification
2. user_stories: Array of user story strings ("As a [role], I want to [action] so that [benefit]")
3. screens: Array of screen/page names needed
4. database_tables: Array of database entity names needed
5. api_routes: Array of API routes (e.g., "GET /api/features")
6. permissions: Array of permission rules needed
7. automations: Array of automated workflows or triggers
8. risks: Array of technical or business risks
9. testing_checklist: Array of test cases
10. deployment_checklist: Array of deployment steps

Be thorough and practical. Never include automatic deployment steps — always require manual approval.`,
      response_json_schema: {
        type: "object",
        properties: {
          feature_spec: { type: "string" },
          user_stories: { type: "array", items: { type: "string" } },
          screens: { type: "array", items: { type: "string" } },
          database_tables: { type: "array", items: { type: "string" } },
          api_routes: { type: "array", items: { type: "string" } },
          permissions: { type: "array", items: { type: "string" } },
          automations: { type: "array", items: { type: "string" } },
          risks: { type: "array", items: { type: "string" } },
          testing_checklist: { type: "array", items: { type: "string" } },
          deployment_checklist: { type: "array", items: { type: "string" } }
        },
        required: ["feature_spec", "user_stories", "screens", "database_tables", "api_routes", "permissions", "automations", "risks", "testing_checklist", "deployment_checklist"]
      }
    });
    const created = await base44.entities.FeatureRequest.create({
      title: featureTitle,
      plain_description: plainDesc,
      stage: "planning",
      ...result
    });
    setGenerating(false);
    setIdeaOpen(false);
    setPlainDesc("");
    setFeatureTitle("");
    load();
    setSelected(created);
  };

  const advanceStage = async () => {
    if (!selected) return;
    const idx = stages.indexOf(selected.stage);
    if (idx < stages.length - 1) {
      const newStage = stages[idx + 1];
      if (newStage === "deployed") {
        if (!window.confirm("⚠ MANUAL APPROVAL REQUIRED: Are you sure you want to mark this as deployed? This action cannot be automated.")) return;
      }
      await base44.entities.FeatureRequest.update(selected.id, { stage: newStage, approved_by: newStage === "approved" ? "Manual approval" : selected.approved_by, approved_at: newStage === "approved" ? new Date().toISOString() : selected.approved_at });
      setSelected({ ...selected, stage: newStage });
      load();
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader
        title="Feature Builder"
        subtitle="Describe a feature in plain English — AI generates the full spec"
        actions={<Button onClick={() => setIdeaOpen(true)} size="sm"><Wand2 className="w-4 h-4 mr-1.5" />New Feature Idea</Button>}
      />
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 mb-5 text-xs text-amber-700 flex items-center gap-2">
        <Shield className="w-4 h-4 flex-shrink-0" />
        Features never deploy automatically. Manual approval required at every stage gate.
      </div>

      {/* Stage pipeline */}
      <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-2">
        {stages.map((stage, i) => (
          <div key={stage} className="flex items-center gap-1 flex-shrink-0">
            <div className={`px-2.5 py-1 rounded-full text-[10px] font-medium ${stageColors[stage] || "bg-slate-100 text-slate-600"}`}>
              {stage.replace(/_/g, " ")}
            </div>
            {i < stages.length - 1 && <span className="text-muted-foreground text-xs">→</span>}
          </div>
        ))}
      </div>

      {features.length === 0 ? (
        <EmptyState icon={Wand2} title="No features yet" description="Describe a feature in plain English to get started" actionLabel="New Feature Idea" onAction={() => setIdeaOpen(true)} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-2">
            {features.map(f => (
              <Card key={f.id} className={`p-3 cursor-pointer transition-all ${selected?.id === f.id ? "border-primary shadow-md" : "border-border/60 hover:shadow-sm"}`} onClick={() => setSelected(f)}>
                <p className="text-sm font-semibold truncate">{f.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{f.plain_description}</p>
                <Badge className={`text-[10px] mt-2 ${stageColors[f.stage] || ""}`}>{(f.stage || "idea").replace(/_/g, " ")}</Badge>
              </Card>
            ))}
          </div>

          {selected && (
            <div className="lg:col-span-2">
              <Card className="p-5 border border-border/60">
                <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
                  <div>
                    <h2 className="text-base font-semibold">{selected.title}</h2>
                    <p className="text-xs text-muted-foreground">{selected.plain_description}</p>
                  </div>
                  <div className="flex gap-2 items-center">
                    <Badge className={`text-xs ${stageColors[selected.stage] || ""}`}>{(selected.stage || "idea").replace(/_/g, " ")}</Badge>
                    {selected.stage !== "deployed" && (
                      <Button size="sm" variant="outline" onClick={advanceStage}>Advance Stage →</Button>
                    )}
                  </div>
                </div>
                <Tabs defaultValue="spec">
                  <TabsList className="mb-4 flex-wrap h-auto gap-1">
                    <TabsTrigger value="spec">Spec</TabsTrigger>
                    <TabsTrigger value="stories">Stories</TabsTrigger>
                    <TabsTrigger value="tech">Tech</TabsTrigger>
                    <TabsTrigger value="risks">Risks</TabsTrigger>
                    <TabsTrigger value="testing">Testing</TabsTrigger>
                    <TabsTrigger value="deploy">Deploy</TabsTrigger>
                  </TabsList>
                  <TabsContent value="spec">
                    <div className="bg-muted p-4 rounded-lg text-sm whitespace-pre-wrap">{selected.feature_spec || "No spec generated."}</div>
                  </TabsContent>
                  <TabsContent value="stories">
                    <ul className="space-y-2">{(selected.user_stories || []).map((s, i) => <li key={i} className="text-sm flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />{s}</li>)}</ul>
                  </TabsContent>
                  <TabsContent value="tech" className="space-y-4">
                    {(selected.screens || []).length > 0 && <div><p className="text-xs font-semibold text-muted-foreground mb-2">SCREENS</p><div className="flex flex-wrap gap-1">{selected.screens.map(s => <Badge key={s} variant="outline" className="text-xs">{s}</Badge>)}</div></div>}
                    {(selected.database_tables || []).length > 0 && <div><p className="text-xs font-semibold text-muted-foreground mb-2">DATABASE</p><div className="flex flex-wrap gap-1">{selected.database_tables.map(t => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}</div></div>}
                    {(selected.api_routes || []).length > 0 && <div><p className="text-xs font-semibold text-muted-foreground mb-2">API ROUTES</p><ul className="space-y-1">{selected.api_routes.map((r, i) => <li key={i} className="text-xs font-mono bg-muted px-2 py-1 rounded">{r}</li>)}</ul></div>}
                    {(selected.permissions || []).length > 0 && <div><p className="text-xs font-semibold text-muted-foreground mb-2">PERMISSIONS</p><div className="flex flex-wrap gap-1">{selected.permissions.map(p => <Badge key={p} variant="outline" className="text-xs">{p}</Badge>)}</div></div>}
                  </TabsContent>
                  <TabsContent value="risks">
                    <ul className="space-y-2">{(selected.risks || []).map((r, i) => <li key={i} className="text-sm flex items-start gap-2"><AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />{r}</li>)}</ul>
                  </TabsContent>
                  <TabsContent value="testing">
                    <ul className="space-y-2">{(selected.testing_checklist || []).map((t, i) => <li key={i} className="text-sm flex items-start gap-2"><CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />{t}</li>)}</ul>
                  </TabsContent>
                  <TabsContent value="deploy">
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3 text-xs text-amber-700 flex items-center gap-2"><Shield className="w-4 h-4" />Manual approval required before deployment. Never deploy automatically.</div>
                    <ul className="space-y-2">{(selected.deployment_checklist || []).map((d, i) => <li key={i} className="text-sm flex items-start gap-2"><CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />{d}</li>)}</ul>
                  </TabsContent>
                </Tabs>
              </Card>
            </div>
          )}
        </div>
      )}

      <Dialog open={ideaOpen} onOpenChange={setIdeaOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Wand2 className="w-4 h-4" />Describe Your Feature</DialogTitle></DialogHeader>
          <form onSubmit={handleGenerate} className="space-y-4">
            <div><Label>Feature Title</Label><Input value={featureTitle} onChange={e => setFeatureTitle(e.target.value)} required /></div>
            <div><Label>Plain English Description</Label><Textarea value={plainDesc} onChange={e => setPlainDesc(e.target.value)} rows={6} placeholder="Describe what this feature should do, who uses it, and why it matters..." required /></div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIdeaOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={generating}>{generating ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Generating Spec...</> : "Generate Spec"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}