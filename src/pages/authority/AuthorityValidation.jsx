import { useState, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Shield, CheckCircle, XCircle, AlertTriangle, Scale, Users, Map, Loader2, BookOpen, ExternalLink } from "lucide-react";

const CHECKS = [
  { key: "jurisdiction_verified", label: "Jurisdiction Review", icon: Map, desc: "Does this authority have jurisdiction in this location/context?", color: "text-blue-600" },
  { key: "capacity_verified", label: "Capacity Review", icon: Users, desc: "Does the actor have legal capacity to take this action?", color: "text-violet-600" },
  { key: "standing_verified", label: "Standing Review", icon: Scale, desc: "Does this authority have standing to make this demand?", color: "text-amber-600" },
];

export default function AuthorityValidation() {
  const location = useLocation();
  const urlParams = new URLSearchParams(location.search);
  const id = urlParams.get("id");

  const [interaction, setInteraction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    base44.entities.AuthorityInteraction.get(id).then(i => {
      setInteraction(i);
      setNotes(i.notes || "");
    }).finally(() => setLoading(false));
  }, [id]);

  const toggleCheck = async (key) => {
    const updated = { ...interaction, [key]: !interaction[key] };
    setInteraction(updated);
    await base44.entities.AuthorityInteraction.update(id, { [key]: !interaction[key] });
  };

  const updateStatus = async (status) => {
    setSaving(true);
    await base44.entities.AuthorityInteraction.update(id, { status, notes });
    setInteraction(i => ({ ...i, status, notes }));
    setSaving(false);
  };

  const runAIValidation = async () => {
    setAiLoading(true);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an authority validation expert and civil rights attorney assistant. NEVER fabricate legal citations. If you don't know the specific statute, say "CANON GAP — verify with licensed attorney."

Analyze this authority interaction:
Title: ${interaction.title}
Authority Type: ${interaction.authority_type}
Authority Name: ${interaction.authority_name}
Actor: ${interaction.actor_name} (${interaction.actor_title})
Claimed Authority: ${interaction.claimed_authority}
Claimed Legal Basis: ${interaction.claimed_legal_basis}
Location/Jurisdiction: ${interaction.location}, ${interaction.jurisdiction} (${interaction.jurisdiction_type})
Description: ${interaction.description}

Evaluate:
1. JURISDICTION: Does this authority have jurisdiction here?
2. CAPACITY: Does this actor have legal capacity for this action?
3. STANDING: Does this authority have standing to make this demand?
4. RED FLAGS: List any civil rights concerns or authority overreach indicators.
5. RECOMMENDED ACTIONS: What should the person do?
6. CANON GAPS: What specific law do you need to verify that you cannot confirm?

Be direct, specific, and educational. Respond in JSON.`,
      response_json_schema: {
        type: "object",
        properties: {
          jurisdiction_assessment: { type: "string" },
          jurisdiction_verdict: { type: "string", enum: ["likely_valid","likely_invalid","unclear","canon_gap"] },
          capacity_assessment: { type: "string" },
          capacity_verdict: { type: "string", enum: ["likely_valid","likely_invalid","unclear","canon_gap"] },
          standing_assessment: { type: "string" },
          standing_verdict: { type: "string", enum: ["likely_valid","likely_invalid","unclear","canon_gap"] },
          red_flags: { type: "array", items: { type: "string" } },
          recommended_actions: { type: "array", items: { type: "string" } },
          canon_gaps: { type: "array", items: { type: "string" } },
          overall_assessment: { type: "string" }
        }
      }
    });
    setAiAnalysis(result);
    setAiLoading(false);
  };

  if (loading) return <div className="p-6 text-muted-foreground">Loading…</div>;
  if (!interaction) return (
    <div className="p-6 max-w-3xl mx-auto">
      <Card className="p-8 text-center border-dashed">
        <p className="text-muted-foreground mb-4">Select an interaction to validate.</p>
        <Link to="/authority/timeline"><Button variant="outline">View Timeline</Button></Link>
      </Card>
    </div>
  );

  const verdictIcon = (v) => {
    if (v === "likely_valid") return <CheckCircle className="w-4 h-4 text-emerald-500" />;
    if (v === "likely_invalid") return <XCircle className="w-4 h-4 text-red-500" />;
    if (v === "canon_gap") return <BookOpen className="w-4 h-4 text-amber-500" />;
    return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link to="/authority/timeline"><Button variant="outline" size="sm">← Back</Button></Link>
        <Shield className="w-5 h-5 text-indigo-600" />
        <h1 className="text-xl font-bold">Authority Validation</h1>
        <Badge className="bg-indigo-100 text-indigo-700">{interaction.status?.replace(/_/g," ")}</Badge>
      </div>

      {/* Interaction Summary */}
      <Card className="p-5">
        <h2 className="font-bold text-base mb-1">{interaction.title}</h2>
        <p className="text-sm text-muted-foreground">{interaction.authority_type?.replace(/_/g," ").toUpperCase()} · {interaction.authority_name} {interaction.date_of_interaction ? `· ${interaction.date_of_interaction}` : ""}</p>
        {interaction.claimed_authority && <p className="mt-2 text-sm"><span className="font-medium">Claimed Authority:</span> {interaction.claimed_authority}</p>}
        {interaction.claimed_legal_basis && <p className="text-sm"><span className="font-medium">Legal Basis Cited:</span> {interaction.claimed_legal_basis}</p>}
        {interaction.description && <p className="mt-2 text-sm text-muted-foreground">{interaction.description}</p>}
      </Card>

      {/* Manual Validation Checks */}
      <Card className="p-5">
        <h2 className="font-semibold mb-4 flex items-center gap-2"><Shield className="w-4 h-4 text-indigo-600" />Manual Validation Checklist</h2>
        <div className="space-y-3">
          {CHECKS.map(c => {
            const Icon = c.icon;
            const checked = interaction[c.key];
            return (
              <div key={c.key} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${checked ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20" : "border-border hover:border-muted-foreground"}`} onClick={() => toggleCheck(c.key)}>
                <div className={`mt-0.5 ${c.color}`}><Icon className="w-4 h-4" /></div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">{c.label}</p>
                  <p className="text-xs text-muted-foreground">{c.desc}</p>
                </div>
                {checked ? <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" /> : <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30 shrink-0" />}
              </div>
            );
          })}
        </div>
      </Card>

      {/* AI Validation */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold flex items-center gap-2"><Scale className="w-4 h-4 text-violet-600" />AI Authority Analysis</h2>
          <Button onClick={runAIValidation} disabled={aiLoading} size="sm" className="bg-violet-600 hover:bg-violet-700 text-white">
            {aiLoading ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Analyzing…</> : "Run AI Analysis"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mb-3">⚠️ AI analysis is educational only. Canon Gaps are flagged — not invented. Consult a licensed attorney for legal advice.</p>

        {aiAnalysis && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { label: "Jurisdiction", assessment: aiAnalysis.jurisdiction_assessment, verdict: aiAnalysis.jurisdiction_verdict },
                { label: "Capacity", assessment: aiAnalysis.capacity_assessment, verdict: aiAnalysis.capacity_verdict },
                { label: "Standing", assessment: aiAnalysis.standing_assessment, verdict: aiAnalysis.standing_verdict },
              ].map(item => (
                <div key={item.label} className="p-3 rounded-lg bg-muted/40 border">
                  <div className="flex items-center gap-1.5 mb-1">{verdictIcon(item.verdict)}<span className="text-xs font-bold">{item.label}</span><Badge variant="outline" className="text-[9px] ml-auto">{item.verdict?.replace(/_/g," ")}</Badge></div>
                  <p className="text-xs text-muted-foreground">{item.assessment}</p>
                </div>
              ))}
            </div>
            {aiAnalysis.red_flags?.length > 0 && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200">
                <p className="text-xs font-bold text-red-700 mb-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Red Flags</p>
                <ul className="space-y-0.5">{aiAnalysis.red_flags.map((f,i) => <li key={i} className="text-xs text-red-700">• {f}</li>)}</ul>
              </div>
            )}
            {aiAnalysis.recommended_actions?.length > 0 && (
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200">
                <p className="text-xs font-bold text-blue-700 mb-1">Recommended Actions</p>
                <ul className="space-y-0.5">{aiAnalysis.recommended_actions.map((a,i) => <li key={i} className="text-xs text-blue-700">• {a}</li>)}</ul>
              </div>
            )}
            {aiAnalysis.canon_gaps?.length > 0 && (
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200">
                <p className="text-xs font-bold text-amber-700 mb-1 flex items-center gap-1"><BookOpen className="w-3 h-3" />Canon Gaps — Verify with Attorney</p>
                <ul className="space-y-0.5">{aiAnalysis.canon_gaps.map((g,i) => <li key={i} className="text-xs text-amber-700">• {g}</li>)}</ul>
                <Link to="/jurisengine"><p className="text-[10px] text-amber-600 mt-2 hover:underline flex items-center gap-1"><ExternalLink className="w-3 h-3" />Open JurisEngine to research</p></Link>
              </div>
            )}
            {aiAnalysis.overall_assessment && <p className="text-sm text-muted-foreground border-t pt-3">{aiAnalysis.overall_assessment}</p>}
          </div>
        )}
      </Card>

      {/* Status Update */}
      <Card className="p-5">
        <h2 className="font-semibold mb-3">Update Status</h2>
        <Textarea rows={2} placeholder="Add validation notes…" value={notes} onChange={e => setNotes(e.target.value)} className="mb-3" />
        <div className="flex flex-wrap gap-2">
          {["under_review","validated","invalid","escalated","resolved"].map(s => (
            <Button key={s} variant={interaction.status === s ? "default" : "outline"} size="sm" onClick={() => updateStatus(s)} disabled={saving}>
              {s.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase())}
            </Button>
          ))}
        </div>
      </Card>

      {/* Quick Nav */}
      <div className="flex flex-wrap gap-2">
        <Link to={`/authority/evidence?id=${id}`}><Button variant="outline" size="sm">🗂 Evidence</Button></Link>
        <Link to={`/authority/documents?id=${id}`}><Button variant="outline" size="sm">📄 Request Docs</Button></Link>
        <Link to={`/authority/complaints?id=${id}`}><Button variant="outline" size="sm">📝 File Complaint</Button></Link>
        <Link to={`/authority/appeals?id=${id}`}><Button variant="outline" size="sm">📊 Track Appeal</Button></Link>
        <Link to={`/authority/escalation?id=${id}`}><Button variant="outline" size="sm">🔺 Escalate</Button></Link>
      </div>
    </div>
  );
}