import { useState, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, ExternalLink, CheckSquare, Square } from "lucide-react";

const CHECKLIST_TEMPLATES = {
  police: ["Body cam footage request filed","Dash cam footage request filed","911 call recording requested","Incident report obtained","Officer badge number recorded","Witness contact info collected","Physical injuries photographed","Medical records secured","Complaint filed with Internal Affairs","Cell phone recordings preserved"],
  court: ["Court order / judgment obtained","Court docket pulled","Transcript requested","Judge's name and case number recorded","Filing deadlines noted","Service records documented","Appeal window tracked","Clerk's records pulled"],
  employer: ["Termination letter secured","HR file requested","Performance reviews obtained","Email / written communications preserved","Witness statements collected","EEOC charge deadline tracked","Employee handbook obtained","Payroll records requested"],
  landlord: ["Lease agreement secured","Written notices preserved","Photos of property condition taken","Maintenance request records obtained","Eviction notice documented","Security deposit record kept","Local housing code obtained"],
  government: ["Agency decision letter obtained","Administrative record requested","FOIA filed for underlying documents","Agency policy manual requested","Decision-maker identity confirmed","Administrative appeal deadline tracked","Inspector general complaint option reviewed"],
  hoa: ["CC&Rs / bylaws obtained","Meeting minutes requested","Board member identities confirmed","Violation notice documented","HOA financials requested","State HOA laws researched"],
  hospital: ["Medical records requested (HIPAA)","Billing records obtained","Incident report filed","Treating physician identified","Consent forms reviewed","State medical board complaint option reviewed","Malpractice statute of limitations tracked"],
  default: ["All written communications preserved","Relevant records requested","Witnesses identified","Dates and times documented","Location documented","Evidence photos taken","Applicable laws researched","Complaint filed","Deadlines tracked","Attorney consultation considered"]
};

export default function AuthorityEvidencePage() {
  const location = useLocation();
  const urlParams = new URLSearchParams(location.search);
  const id = urlParams.get("id");
  const [interaction, setInteraction] = useState(null);
  const [evidence, setEvidence] = useState([]);
  const [checklist, setChecklist] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loads = [base44.entities.Evidence.list("-created_date", 200)];
    if (id) loads.push(base44.entities.AuthorityInteraction.get(id));
    Promise.all(loads).then(([ev, inter]) => {
      setEvidence(inter ? ev.filter(e => e.related_case_id === id || (inter.linked_evidence_ids || []).includes(e.id)) : ev);
      if (inter) {
        setInteraction(inter);
        const tmpl = CHECKLIST_TEMPLATES[inter.authority_type] || CHECKLIST_TEMPLATES.default;
        setChecklist(tmpl.map(item => ({ item, done: false })));
      }
    }).finally(() => setLoading(false));
  }, [id]);

  const toggleItem = (i) => setChecklist(prev => prev.map((c, idx) => idx === i ? { ...c, done: !c.done } : c));
  const done = checklist.filter(c => c.done).length;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link to="/authority/timeline"><Button variant="outline" size="sm">← Back</Button></Link>
        <Shield className="w-5 h-5 text-indigo-600" />
        <h1 className="text-xl font-bold">Evidence Checklist</h1>
        {interaction && <Badge className="bg-indigo-100 text-indigo-700">{interaction.authority_type?.replace(/_/g," ")}</Badge>}
      </div>

      {interaction && (
        <Card className="p-4 bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200">
          <p className="font-semibold text-sm">{interaction.title}</p>
          <p className="text-xs text-muted-foreground">{interaction.date_of_interaction} · {interaction.location}</p>
        </Card>
      )}

      {checklist.length > 0 && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Evidence Collection Checklist</h2>
            <Badge variant="outline">{done}/{checklist.length} complete</Badge>
          </div>
          <div className="space-y-2">
            {checklist.map((c, i) => (
              <div key={i} className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all ${c.done ? "bg-emerald-50 dark:bg-emerald-950/20" : "hover:bg-muted/40"}`} onClick={() => toggleItem(i)}>
                {c.done ? <CheckSquare className="w-4 h-4 text-emerald-500 shrink-0" /> : <Square className="w-4 h-4 text-muted-foreground shrink-0" />}
                <span className={`text-sm ${c.done ? "line-through text-muted-foreground" : ""}`}>{c.item}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Linked Evidence */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Evidence Vault Records</h2>
          <Link to="/evidence"><Button variant="outline" size="sm"><ExternalLink className="w-3 h-3 mr-1" />Open Vault</Button></Link>
        </div>
        {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : evidence.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground mb-3">No evidence linked to this interaction.</p>
            <Link to="/evidence"><Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">Upload Evidence</Button></Link>
          </div>
        ) : (
          <div className="space-y-2">
            {evidence.map(e => (
              <div key={e.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border">
                <div>
                  <p className="text-sm font-medium">{e.title}</p>
                  <p className="text-xs text-muted-foreground">{e.category} · {e.collected_date || e.created_date?.slice(0,10)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">{e.verification_status}</Badge>
                  {e.file_url && <a href={e.file_url} target="_blank" rel="noreferrer"><Button size="sm" variant="ghost"><ExternalLink className="w-3 h-3" /></Button></a>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}