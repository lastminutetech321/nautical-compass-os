import { useState, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Shield, TrendingUp, Loader2, ExternalLink } from "lucide-react";

const ESCALATION_PATHS = [
  { label: "Internal Supervisor / Chain of Command", desc: "Request supervisor review before external escalation", icon: "👤", risk: "Low" },
  { label: "Agency Internal Affairs / Ombudsman", desc: "File with the authority's own oversight body", icon: "🏢", risk: "Low" },
  { label: "State Licensing Board", desc: "For licensed professionals (officers, doctors, lawyers)", icon: "📋", risk: "Medium" },
  { label: "State Attorney General", desc: "Civil rights complaints, consumer protection violations", icon: "⚖️", risk: "Medium" },
  { label: "Federal Agency (EEOC, HUD, DOJ, OCR)", desc: "Federal discrimination, housing, employment, education rights", icon: "🏛", risk: "Medium" },
  { label: "State Human Rights Commission", desc: "State-level civil rights enforcement", icon: "📜", risk: "Medium" },
  { label: "ACLU / Civil Rights Organizations", desc: "Legal aid, co-counsel, civil rights advocacy", icon: "✊", risk: "Low" },
  { label: "Elected Officials (Mayor, City Council, Legislature)", desc: "Constituent complaint, political accountability", icon: "🗳", risk: "Low" },
  { label: "Media / Public Accountability", desc: "Investigative journalism, public interest reporting", icon: "📡", risk: "High" },
  { label: "Civil Lawsuit (§ 1983, State Tort)", desc: "Federal civil rights lawsuit or state court action", icon: "⚖️", risk: "High" },
  { label: "Federal Court / DOJ Complaint", desc: "Pattern and practice investigations, consent decrees", icon: "🏛", risk: "High" },
  { label: "UN / International Bodies", desc: "For systematic human rights violations", icon: "🌐", risk: "Critical" },
];

export default function AuthorityEscalationPage() {
  const location = useLocation();
  const urlParams = new URLSearchParams(location.search);
  const id = urlParams.get("id");
  const [interaction, setInteraction] = useState(null);
  const [aiPlan, setAiPlan] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (id) base44.entities.AuthorityInteraction.get(id).then(setInteraction);
  }, [id]);

  const runAiPlan = async () => {
    setAiLoading(true);
    const ctx = interaction ? `Interaction: ${interaction.title}. Authority type: ${interaction.authority_type}. Severity: ${interaction.severity}. Claimed authority: ${interaction.claimed_authority}. Description: ${interaction.description}. Jurisdiction: ${interaction.jurisdiction}.` : `General escalation planning. Notes: ${notes}`;
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an authority accountability strategist. Create a strategic escalation plan for this situation. Do NOT fabricate legal citations — mark unknowns as CANON GAP. Context: ${ctx}
      
Return a strategic escalation plan with: immediate_steps, short_term_steps, long_term_steps, key_leverage_points, risks_to_consider, recommended_primary_path, canon_gaps_to_verify. Be specific and actionable.`,
      response_json_schema: {
        type: "object",
        properties: {
          immediate_steps: { type: "array", items: { type: "string" } },
          short_term_steps: { type: "array", items: { type: "string" } },
          long_term_steps: { type: "array", items: { type: "string" } },
          key_leverage_points: { type: "array", items: { type: "string" } },
          risks_to_consider: { type: "array", items: { type: "string" } },
          recommended_primary_path: { type: "string" },
          canon_gaps_to_verify: { type: "array", items: { type: "string" } }
        }
      }
    });
    setAiPlan(result);
    setAiLoading(false);
  };

  const riskColor = { Low: "bg-emerald-100 text-emerald-700", Medium: "bg-amber-100 text-amber-700", High: "bg-orange-100 text-orange-700", Critical: "bg-red-100 text-red-700" };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link to="/authority/compass"><Button variant="outline" size="sm">← Back</Button></Link>
        <TrendingUp className="w-5 h-5 text-indigo-600" />
        <h1 className="text-xl font-bold">Escalation Planner</h1>
      </div>
      <p className="text-sm text-muted-foreground">⚠️ This planner is educational. Consult an attorney before escalating legal matters. AI does not provide legal advice.</p>

      {interaction && (
        <Card className="p-4 bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200">
          <p className="text-sm font-semibold">{interaction.title}</p>
          <p className="text-xs text-muted-foreground">{interaction.authority_type} · Severity: {interaction.severity} · {interaction.jurisdiction}</p>
        </Card>
      )}

      {!interaction && (
        <div>
          <Textarea rows={3} placeholder="Describe the situation you want to escalate (or link to an interaction via the timeline)…" value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
      )}

      {/* AI Strategic Plan */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold flex items-center gap-2"><Shield className="w-4 h-4 text-violet-600" />AI Strategic Escalation Plan</h2>
          <Button onClick={runAiPlan} disabled={aiLoading} size="sm" className="bg-violet-600 hover:bg-violet-700 text-white">
            {aiLoading ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Planning…</> : "Generate Plan"}
          </Button>
        </div>
        {aiPlan && (
          <div className="space-y-4">
            {aiPlan.recommended_primary_path && <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 rounded-lg"><p className="text-xs font-bold text-emerald-700 mb-1">Recommended Primary Path</p><p className="text-sm text-emerald-800">{aiPlan.recommended_primary_path}</p></div>}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[["⚡ Immediate Steps", aiPlan.immediate_steps,"bg-red-50 dark:bg-red-950/20 border-red-200 text-red-700"], ["📅 Short-Term Steps", aiPlan.short_term_steps,"bg-amber-50 dark:bg-amber-950/20 border-amber-200 text-amber-700"], ["🎯 Long-Term Steps", aiPlan.long_term_steps,"bg-blue-50 dark:bg-blue-950/20 border-blue-200 text-blue-700"]].map(([label, steps, cls]) => steps?.length > 0 && (
                <div key={label} className={`p-3 rounded-lg border ${cls}`}><p className="text-xs font-bold mb-1">{label}</p><ul className="space-y-0.5">{steps.map((s,i) => <li key={i} className="text-xs">• {s}</li>)}</ul></div>
              ))}
            </div>
            {aiPlan.key_leverage_points?.length > 0 && <div className="p-3 bg-violet-50 dark:bg-violet-950/20 border border-violet-200 rounded-lg"><p className="text-xs font-bold text-violet-700 mb-1">Key Leverage Points</p><ul>{aiPlan.key_leverage_points.map((p,i) => <li key={i} className="text-xs text-violet-700">• {p}</li>)}</ul></div>}
            {aiPlan.canon_gaps_to_verify?.length > 0 && <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 rounded-lg"><p className="text-xs font-bold text-amber-700 mb-1">Canon Gaps — Verify with Attorney</p><ul>{aiPlan.canon_gaps_to_verify.map((g,i) => <li key={i} className="text-xs text-amber-700">• {g}</li>)}</ul><Link to="/jurisengine"><p className="text-[10px] text-amber-600 mt-2 flex items-center gap-1 hover:underline"><ExternalLink className="w-3 h-3" />Research in JurisEngine</p></Link></div>}
          </div>
        )}
      </Card>

      {/* Escalation Path Reference */}
      <div>
        <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-widest">Escalation Paths Reference</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {ESCALATION_PATHS.map(p => (
            <Card key={p.label} className="p-3">
              <div className="flex items-start gap-2">
                <span className="text-lg">{p.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2"><p className="text-xs font-semibold">{p.label}</p><Badge className={`text-[9px] ${riskColor[p.risk]}`}>{p.risk}</Badge></div>
                  <p className="text-xs text-muted-foreground mt-0.5">{p.desc}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}