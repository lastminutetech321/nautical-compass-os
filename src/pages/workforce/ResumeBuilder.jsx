import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Wand2, Loader2, Download, Copy } from "lucide-react";

export default function ResumeBuilder() {
  const [workers, setWorkers] = useState([]);
  const [skills, setSkills] = useState([]);
  const [certs, setCerts] = useState([]);
  const [selectedWorker, setSelectedWorker] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [style, setStyle] = useState("professional");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [resume, setResume] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    Promise.all([
      base44.entities.WorkerProfile.list("-created_date", 100),
      base44.entities.WorkerSkill.list("-created_date", 300),
      base44.entities.WorkerCertification.list("-created_date", 200),
    ]).then(([w, s, c]) => { setWorkers(w); setSkills(s); setCerts(c); }).finally(() => setLoading(false));
  }, []);

  const worker = workers.find(w => w.id === selectedWorker);
  const workerSkills = skills.filter(s => s.worker_id === selectedWorker);
  const workerCerts = certs.filter(c => c.worker_id === selectedWorker);

  const generate = async () => {
    if (!worker) return;
    setGenerating(true);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Generate a professional resume for:
Name: ${worker.full_name}
Trade/Role: ${worker.primary_trade || worker.headline}
Years Experience: ${worker.years_experience}
Location: ${worker.location || worker.city + ", " + worker.state}
Bio: ${worker.bio || "Not provided"}
Hourly Rate: ${worker.hourly_rate > 0 ? "$" + worker.hourly_rate + "/hr" : "Not specified"}
Skills: ${workerSkills.map(s => `${s.skill_name} (${s.proficiency}, ${s.years_used}yr)`).join(", ") || "None recorded"}
Certifications/Licenses: ${workerCerts.map(c => `${c.name} (${c.issuing_body}, expires ${c.expiry_date || "N/A"})`).join(", ") || "None recorded"}
Target Role: ${targetRole || worker.primary_trade || "General"}
Resume Style: ${style}

Write a complete, formatted resume with: Professional Summary, Core Skills, Experience (infer from years/trade/bio), Certifications & Licenses, and Education sections. Make it compelling and ATS-friendly. Use clean formatting with clear sections.`,
    });
    setResume(result);
    setGenerating(false);
  };

  const copy = () => { navigator.clipboard.writeText(resume); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center gap-2"><FileText className="w-5 h-5 text-orange-600" /><h1 className="text-xl font-bold">Resume Builder</h1></div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="p-5 space-y-4">
          <h2 className="font-semibold text-sm">Build Settings</h2>
          {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
            <>
              <div><Label>Select Worker</Label><Select value={selectedWorker} onValueChange={setSelectedWorker}><SelectTrigger className="mt-1"><SelectValue placeholder="Choose worker…" /></SelectTrigger><SelectContent>{workers.map(w => <SelectItem key={w.id} value={w.id}>{w.full_name}</SelectItem>)}</SelectContent></Select></div>
              {worker && (
                <div className="p-3 rounded-lg bg-muted/40 text-xs space-y-1">
                  <p><strong>Trade:</strong> {worker.primary_trade || "—"}</p>
                  <p><strong>Experience:</strong> {worker.years_experience}yr</p>
                  <p><strong>Skills:</strong> {workerSkills.length}</p>
                  <p><strong>Certifications:</strong> {workerCerts.length}</p>
                </div>
              )}
              <div><Label>Target Role</Label><Textarea rows={2} placeholder="e.g. Master Electrician, Senior Construction Manager" value={targetRole} onChange={e => setTargetRole(e.target.value)} className="mt-1 text-sm" /></div>
              <div><Label>Resume Style</Label>
                <Select value={style} onValueChange={setStyle}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="modern">Modern</SelectItem>
                    <SelectItem value="trade">Trade / Technical</SelectItem>
                    <SelectItem value="executive">Executive</SelectItem>
                    <SelectItem value="entry_level">Entry Level</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={generate} disabled={generating || !selectedWorker} className="w-full bg-orange-600 hover:bg-orange-700 text-white">
                {generating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating…</> : <><Wand2 className="w-4 h-4 mr-2" />Generate Resume</>}
              </Button>
            </>
          )}
        </Card>

        <div className="md:col-span-2">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-sm">Generated Resume</h2>
              {resume && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={copy}><Copy className="w-3 h-3 mr-1" />{copied ? "Copied!" : "Copy"}</Button>
                </div>
              )}
            </div>
            {!resume && !generating && <div className="h-64 flex items-center justify-center text-muted-foreground text-sm border-dashed border rounded-lg">Select a worker and click Generate Resume</div>}
            {generating && <div className="h-64 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-orange-500" /></div>}
            {resume && <pre className="whitespace-pre-wrap text-sm font-mono bg-muted/30 p-4 rounded-lg overflow-auto max-h-[60vh] leading-relaxed">{resume}</pre>}
          </Card>
        </div>
      </div>
    </div>
  );
}