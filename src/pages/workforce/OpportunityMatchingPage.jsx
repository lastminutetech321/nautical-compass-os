import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "react-router-dom";
import { Link2, Loader2, Wand2, MapPin, DollarSign, CheckCircle } from "lucide-react";

export default function OpportunityMatchingPage() {
  const [workers, setWorkers] = useState([]);
  const [gigs, setGigs] = useState([]);
  const [skills, setSkills] = useState([]);
  const [certs, setCerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [matching, setMatching] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState("");
  const [matches, setMatches] = useState([]);

  useEffect(() => {
    Promise.all([
      base44.entities.WorkerProfile.list("-created_date", 100),
      base44.entities.GigOpportunity.filter({ status: "open" }, "-posted_date", 100),
      base44.entities.WorkerSkill.list("-created_date", 300),
      base44.entities.WorkerCertification.list("-created_date", 200),
    ]).then(([w, g, s, c]) => { setWorkers(w); setGigs(g); setSkills(s); setCerts(c); }).finally(() => setLoading(false));
  }, []);

  const runMatch = async () => {
    if (!selectedWorker) return;
    setMatching(true);
    const worker = workers.find(w => w.id === selectedWorker);
    const wSkills = skills.filter(s => s.worker_id === selectedWorker);
    const wCerts = certs.filter(c => c.worker_id === selectedWorker);

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Match this worker to the best open gig opportunities and score each match.

Worker Profile:
- Name: ${worker.full_name}
- Trade/Role: ${worker.primary_trade || worker.headline}
- Years Experience: ${worker.years_experience}
- Location: ${worker.location}, ${worker.state}
- Hourly Rate: $${worker.hourly_rate}/hr
- Remote OK: ${worker.remote_ok}
- Skills: ${wSkills.map(s => `${s.skill_name} (${s.proficiency})`).join(", ") || "None recorded"}
- Certifications: ${wCerts.map(c => c.name).join(", ") || "None recorded"}
- Availability: ${worker.availability_status}

Open Gigs (${gigs.length} total):
${gigs.slice(0, 20).map(g => `ID: ${g.id} | Title: ${g.title} | Trade: ${g.trade || g.category} | Location: ${g.location} | Remote: ${g.remote} | Rate: $${g.rate_min}-${g.rate_max}/${g.rate_type} | Skills Required: ${(g.required_skills||[]).join(", ") || "None"}`).join("\n")}

Score each gig 1-100 for fit. Return top 5 matches with: gig_id, match_score, match_reasons (why this is a good fit), gap_reasons (what's missing), rate_fit (whether the rate works).`,
      response_json_schema: {
        type: "object",
        properties: {
          matches: {
            type: "array",
            items: {
              type: "object",
              properties: {
                gig_id: { type: "string" },
                match_score: { type: "number" },
                match_reasons: { type: "array", items: { type: "string" } },
                gap_reasons: { type: "array", items: { type: "string" } },
                rate_fit: { type: "string" }
              }
            }
          },
          summary: { type: "string" }
        }
      }
    });

    const enriched = (result.matches || []).map(m => ({
      ...m,
      gig: gigs.find(g => g.id === m.gig_id)
    })).filter(m => m.gig);

    setMatches(enriched);
    setMatching(false);
  };

  const scoreColor = (score) => {
    if (score >= 80) return "bg-emerald-100 text-emerald-700";
    if (score >= 60) return "bg-amber-100 text-amber-700";
    return "bg-red-100 text-red-700";
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center gap-2"><Link2 className="w-5 h-5 text-orange-600" /><h1 className="text-xl font-bold">Opportunity Matching</h1></div>
      <p className="text-sm text-muted-foreground">AI analyzes worker skills, experience, location, and rates to find the best open gig matches.</p>

      <Card className="p-5">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="text-sm font-medium">Select Worker to Match</label>
            <Select value={selectedWorker} onValueChange={setSelectedWorker}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Choose a worker…" />
              </SelectTrigger>
              <SelectContent>{workers.map(w => <SelectItem key={w.id} value={w.id}>{w.full_name} — {w.primary_trade || "—"} {w.availability_status === "available" ? "✅" : "🔴"}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Button onClick={runMatch} disabled={matching || !selectedWorker || gigs.length === 0} className="bg-orange-600 hover:bg-orange-700 text-white">
            {matching ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Matching…</> : <><Wand2 className="w-4 h-4 mr-1" />Find Matches</>}
          </Button>
        </div>
        {gigs.length === 0 && !loading && <p className="text-xs text-amber-600 mt-2">⚠️ No open gigs in the marketplace. <Link to="/workforce/gigs" className="underline">Post some gigs</Link> first.</p>}
      </Card>

      {matches.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">Top Matches</h2>
          {matches.map((m, i) => (
            <Card key={i} className="p-4">
              <div className="flex items-start justify-between gap-4 mb-2">
                <div>
                  <p className="font-bold text-sm">{m.gig.title}</p>
                  <p className="text-xs text-muted-foreground">{m.gig.client_name || "—"} {m.gig.trade ? `· ${m.gig.trade}` : ""}</p>
                  <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                    {m.gig.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{m.gig.location}</span>}
                    {m.gig.remote && <span className="text-blue-600">Remote</span>}
                    {(m.gig.rate_min > 0 || m.gig.rate_max > 0) && <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />${m.gig.rate_min}–${m.gig.rate_max}/{m.gig.rate_type}</span>}
                  </div>
                </div>
                <div className="text-center shrink-0">
                  <Badge className={`text-sm font-black px-3 py-1 ${scoreColor(m.match_score)}`}>{m.match_score}%</Badge>
                  <p className="text-[9px] text-muted-foreground mt-0.5">Match Score</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {m.match_reasons?.length > 0 && (
                  <div className="p-2 rounded bg-emerald-50 dark:bg-emerald-950/20">
                    <p className="text-[10px] font-bold text-emerald-700 mb-1">Why it fits</p>
                    <ul>{m.match_reasons.map((r,j) => <li key={j} className="text-[10px] text-emerald-700 flex items-start gap-1"><CheckCircle className="w-2.5 h-2.5 mt-0.5 shrink-0" />{r}</li>)}</ul>
                  </div>
                )}
                {m.gap_reasons?.length > 0 && (
                  <div className="p-2 rounded bg-amber-50 dark:bg-amber-950/20">
                    <p className="text-[10px] font-bold text-amber-700 mb-1">Gaps to address</p>
                    <ul>{m.gap_reasons.map((r,j) => <li key={j} className="text-[10px] text-amber-700">• {r}</li>)}</ul>
                  </div>
                )}
              </div>
              {m.rate_fit && <p className="text-xs text-muted-foreground mt-2">💰 Rate: {m.rate_fit}</p>}
            </Card>
          ))}
        </div>
      )}

      {matches.length === 0 && !matching && selectedWorker && (
        <Card className="p-8 text-center border-dashed"><p className="text-muted-foreground text-sm">Click "Find Matches" to run AI matching analysis.</p></Card>
      )}
    </div>
  );
}