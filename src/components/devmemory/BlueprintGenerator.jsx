import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Wand2, Loader2, Database, Network, Bot, Workflow, Map, Milestone, Link2, Clock, Lightbulb, FileText, ScrollText, BookMarked, TrendingUp, Shield } from "lucide-react";

export default function BlueprintGenerator() {
  const [form, setForm] = useState({ project_name: "", project_type: "enterprise platform", description: "", reference_platform: "NCOS" });
  const [generating, setGenerating] = useState(false);
  const [blueprint, setBlueprint] = useState(null);
  const [memoryUsed, setMemoryUsed] = useState(null);

  const generate = async () => {
    if (!form.project_name) return;
    setGenerating(true);
    setBlueprint(null);
    try {
      const res = await base44.functions.invoke('generateBlueprint', {
        operation: 'generate_blueprint',
        params: form
      });
      setBlueprint(res.data?.blueprint);
      setMemoryUsed(res.data?.development_memory_used);
    } catch (e) { console.error(e); }
    setGenerating(false);
  };

  const Section = ({ icon: Icon, title, children, color }) => (
    <Card className="p-4 border border-border/60">
      <p className="text-xs font-bold uppercase mb-2 flex items-center gap-1.5"><Icon className={`w-3.5 h-3.5 ${color}`} />{title}</p>
      {children}
    </Card>
  );

  return (
    <div className="space-y-4">
      {/* Generator Input */}
      <Card className="p-5 border border-violet-200 bg-violet-50 dark:bg-violet-950/20">
        <p className="text-xs font-bold uppercase mb-1 flex items-center gap-1.5"><Wand2 className="w-4 h-4 text-violet-600" />Project Blueprint Generator</p>
        <p className="text-[10px] text-muted-foreground mb-3">Generates a complete project blueprint using ALL accumulated development memory — every journal entry, ADR, prompt, bug fix, and lesson learned. The next project starts from proven knowledge, not from scratch.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div><Label>Project Name</Label><Input value={form.project_name} onChange={e => setForm({ ...form, project_name: e.target.value })} placeholder="e.g. Axiom" /></div>
          <div><Label>Project Type</Label><Input value={form.project_type} onChange={e => setForm({ ...form, project_type: e.target.value })} /></div>
        </div>
        <div className="mt-3"><Label>Description</Label><Textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Describe the platform you want to build..." /></div>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">Reference: {form.reference_platform}</span>
          <Button onClick={generate} disabled={!form.project_name || generating}>
            {generating ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Wand2 className="w-4 h-4 mr-1" />}
            {generating ? "Generating Blueprint..." : "Generate Blueprint"}
          </Button>
        </div>
      </Card>

      {/* Memory Used Summary */}
      {memoryUsed && (
        <Card className="p-4 border border-cyan-200 bg-cyan-50 dark:bg-cyan-950/20">
          <p className="text-xs font-bold uppercase mb-2 flex items-center gap-1.5"><Database className="w-3.5 h-3.5 text-cyan-600" />Development Memory Consumed</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <div><p className="font-bold text-cyan-700">{memoryUsed.total_journal_entries}</p><p className="text-[9px] text-muted-foreground">Journal Entries</p></div>
            <div><p className="font-bold text-cyan-700">{memoryUsed.total_adrs}</p><p className="text-[9px] text-muted-foreground">Architecture Decisions</p></div>
            <div><p className="font-bold text-cyan-700">{memoryUsed.total_prompts}</p><p className="text-[9px] text-muted-foreground">Reusable Prompts</p></div>
            <div><p className="font-bold text-cyan-700">{memoryUsed.total_lessons}</p><p className="text-[9px] text-muted-foreground">Lessons Applied</p></div>
            <div><p className="font-bold text-cyan-700">{memoryUsed.total_bugs}</p><p className="text-[9px] text-muted-foreground">Bugs Avoided</p></div>
            <div><p className="font-bold text-cyan-700">{memoryUsed.total_time_invested}h</p><p className="text-[9px] text-muted-foreground">Time Leveraged</p></div>
            <div><p className="font-bold text-cyan-700">{memoryUsed.avg_readiness_per_entry}</p><p className="text-[9px] text-muted-foreground">Avg Readiness/Entry</p></div>
            <div><p className="font-bold text-cyan-700">{memoryUsed.modules_built?.length}</p><p className="text-[9px] text-muted-foreground">Modules Proven</p></div>
          </div>
        </Card>
      )}

      {/* Blueprint Output */}
      {generating && !blueprint && (
        <Card className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-violet-600 mb-2" /><p className="text-sm text-muted-foreground">Analyzing development memory and generating blueprint...</p></Card>
      )}

      {blueprint && (
        <div className="space-y-4">
          {/* Executive Summary */}
          {blueprint.executive_summary && (
            <Card className="p-5 border border-violet-300 bg-gradient-to-br from-violet-50 to-blue-50 dark:from-violet-950/30 dark:to-blue-950/30">
              <p className="text-xs font-bold uppercase mb-2 flex items-center gap-1.5"><TrendingUp className="w-4 h-4 text-violet-600" />Executive Summary</p>
              <p className="text-sm text-muted-foreground">{blueprint.executive_summary}</p>
              {blueprint.cost_savings && <p className="text-xs text-emerald-600 mt-2 font-semibold">{blueprint.cost_savings}</p>}
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Architecture */}
            {blueprint.architecture && (
              <Section icon={Database} title="Architecture" color="text-blue-600">
                <p className="text-xs text-muted-foreground">{blueprint.architecture}</p>
              </Section>
            )}

            {/* Database */}
            {blueprint.database && (
              <Section icon={Database} title="Database Design" color="text-violet-600">
                <p className="text-xs text-muted-foreground">{blueprint.database}</p>
              </Section>
            )}

            {/* Entities */}
            {blueprint.entities?.length > 0 && (
              <Section icon={Database} title="Recommended Entities" color="text-cyan-600">
                <div className="space-y-1.5">
                  {blueprint.entities.map((e, i) => (
                    <div key={i} className="p-2 rounded bg-muted/40">
                      <p className="text-xs font-semibold">{e.name}</p>
                      <p className="text-[10px] text-muted-foreground">{e.purpose}</p>
                      {e.key_fields?.length > 0 && <div className="flex flex-wrap gap-1 mt-1">{e.key_fields.slice(0, 5).map((f, j) => <Badge key={j} variant="outline" className="text-[8px] font-mono">{f}</Badge>)}</div>}
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* APIs */}
            {blueprint.apis?.length > 0 && (
              <Section icon={Network} title="APIs / Backend Functions" color="text-amber-600">
                <div className="space-y-1">
                  {blueprint.apis.map((a, i) => <div key={i} className="text-xs"><span className="font-mono font-semibold">{a.name}</span> — <span className="text-muted-foreground">{a.purpose}</span></div>)}
                </div>
              </Section>
            )}

            {/* AI Agents */}
            {blueprint.ai_agents?.length > 0 && (
              <Section icon={Bot} title="AI Agents" color="text-violet-600">
                <div className="space-y-1.5">
                  {blueprint.ai_agents.map((a, i) => (
                    <div key={i} className="p-2 rounded bg-muted/40">
                      <p className="text-xs font-semibold">{a.name} <span className="text-[9px] text-muted-foreground">— {a.role}</span></p>
                      {a.responsibilities?.length > 0 && <ul className="text-[10px] text-muted-foreground ml-3 list-disc">{a.responsibilities.slice(0, 3).map((r, j) => <li key={j}>{r}</li>)}</ul>}
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Workflows */}
            {blueprint.workflows?.length > 0 && (
              <Section icon={Workflow} title="Workflows" color="text-teal-600">
                <div className="space-y-0.5">{blueprint.workflows.map((w, i) => <p key={i} className="text-xs text-muted-foreground">• {w}</p>)}</div>
              </Section>
            )}

            {/* Dependencies */}
            {blueprint.dependencies?.length > 0 && (
              <Section icon={Link2} title="Dependencies" color="text-orange-600">
                <div className="flex flex-wrap gap-1">{blueprint.dependencies.map((d, i) => <Badge key={i} variant="outline" className="text-[9px]">{d}</Badge>)}</div>
              </Section>
            )}

            {/* Risk Mitigations */}
            {blueprint.risk_mitigations?.length > 0 && (
              <Section icon={Shield} title="Risk Mitigations (from past bugs)" color="text-red-600">
                <div className="space-y-0.5">{blueprint.risk_mitigations.map((r, i) => <p key={i} className="text-xs text-muted-foreground">• {r}</p>)}</div>
              </Section>
            )}
          </div>

          {/* Roadmap */}
          {blueprint.roadmap?.length > 0 && (
            <Section icon={Map} title="Phased Roadmap" color="text-emerald-600">
              <div className="space-y-2">
                {blueprint.roadmap.map((phase, i) => (
                  <div key={i} className="p-2 rounded border border-border/40">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold">{phase.phase}</p>
                      <Badge className="text-[9px] bg-emerald-100 text-emerald-700"><Clock className="w-2.5 h-2.5 mr-0.5" />{phase.duration_weeks}w</Badge>
                    </div>
                    {phase.deliverables?.length > 0 && <ul className="text-[10px] text-muted-foreground ml-3 list-disc mt-1">{phase.deliverables.map((d, j) => <li key={j}>{d}</li>)}</ul>}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Milestones */}
          {blueprint.milestones?.length > 0 && (
            <Section icon={Milestone} title="Milestones" color="text-blue-600">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {blueprint.milestones.map((m, i) => (
                  <div key={i} className="p-2 rounded bg-muted/40 text-center">
                    <p className="text-xs font-semibold">{m.name}</p>
                    <p className="text-[10px] text-muted-foreground">Week {m.target_week}</p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Lessons Applied */}
          {blueprint.lessons_applied?.length > 0 && (
            <Section icon={Lightbulb} title="Lessons Applied from Development Memory" color="text-emerald-600">
              <div className="space-y-0.5">{blueprint.lessons_applied.map((l, i) => <p key={i} className="text-xs text-muted-foreground">• {l}</p>)}</div>
            </Section>
          )}

          {/* Prompt History */}
          {blueprint.prompt_history?.length > 0 && (
            <Section icon={FileText} title="Recommended Prompts to Reuse" color="text-amber-600">
              <div className="space-y-0.5">{blueprint.prompt_history.map((p, i) => <p key={i} className="text-xs text-muted-foreground font-mono">• {p}</p>)}</div>
            </Section>
          )}

          {/* Architecture Decisions */}
          {blueprint.architecture_decisions?.length > 0 && (
            <Section icon={ScrollText} title="Architecture Decisions (from past ADRs)" color="text-violet-600">
              <div className="space-y-0.5">{blueprint.architecture_decisions.map((a, i) => <p key={i} className="text-xs text-muted-foreground">• {a}</p>)}</div>
            </Section>
          )}

          {/* Engineering Journal Template */}
          {blueprint.engineering_journal_template?.length > 0 && (
            <Section icon={BookMarked} title="Engineering Journal Template" color="text-blue-600">
              <div className="space-y-0.5">{blueprint.engineering_journal_template.map((j, i) => <p key={i} className="text-xs text-muted-foreground">• {j}</p>)}</div>
            </Section>
          )}

          {/* Timeline */}
          {blueprint.estimated_timeline_weeks && (
            <Card className="p-4 border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase flex items-center gap-1.5"><Clock className="w-4 h-4 text-emerald-600" />Estimated Timeline</p>
                <p className="text-2xl font-black text-emerald-600">{blueprint.estimated_timeline_weeks}<span className="text-sm"> weeks</span></p>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}