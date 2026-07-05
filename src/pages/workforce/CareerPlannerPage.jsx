import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Map, Plus, Wand2, Loader2, TrendingUp } from "lucide-react";

const BLANK = { title:"", worker_id:"", current_role:"", target_role:"", target_industry:"", timeline_months:12, income_goal:0, current_income:0, skills_to_acquire:[], certifications_to_earn:[], status:"active", progress_pct:0, notes:"" };

export default function CareerPlannerPage() {
  const [plans, setPlans] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [skillInput, setSkillInput] = useState("");
  const [certInput, setCertInput] = useState("");
  const [selectedPlan, setSelectedPlan] = useState(null);

  useEffect(() => {
    Promise.all([
      base44.entities.CareerPlan.list("-created_date", 100),
      base44.entities.WorkerProfile.list("-created_date", 100),
    ]).then(([p, w]) => { setPlans(p); setWorkers(w); }).finally(() => setLoading(false));
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const addSkill = () => { if (!skillInput.trim()) return; setForm(f => ({ ...f, skills_to_acquire: [...(f.skills_to_acquire||[]), skillInput.trim()] })); setSkillInput(""); };
  const addCert = () => { if (!certInput.trim()) return; setForm(f => ({ ...f, certifications_to_earn: [...(f.certifications_to_earn||[]), certInput.trim()] })); setCertInput(""); };

  const handleSave = async () => {
    setSaving(true);
    const r = await base44.entities.CareerPlan.create(form);
    setPlans(prev => [r, ...prev]);
    setOpen(false);
    setSaving(false);
    setForm(BLANK);
  };

  const generateAIPlan = async () => {
    if (!form.current_role || !form.target_role) return;
    setAiLoading(true);
    const worker = workers.find(w => w.id === form.worker_id);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Create a detailed career development plan. Current role: ${form.current_role}. Target role: ${form.target_role}. Industry: ${form.target_industry || "General"}. Timeline: ${form.timeline_months} months. Current income: $${form.current_income}. Income goal: $${form.income_goal}. Worker background: ${worker ? `${worker.years_experience}yr experience, ${worker.primary_trade}` : "Not specified"}.

Provide: 3-5 specific milestones with target dates, top 5 skills to acquire, top 3 certifications to earn, top 3 recommended training courses, key blockers to address, monthly action plan, and career advice. Be specific and practical.`,
      response_json_schema: {
        type: "object",
        properties: {
          milestones: { type: "array", items: { type: "object", properties: { title:{type:"string"}, description:{type:"string"}, target_date:{type:"string"}, milestone_type:{type:"string"} } } },
          skills_to_acquire: { type: "array", items: { type: "string" } },
          certifications_to_earn: { type: "array", items: { type: "string" } },
          training_courses: { type: "array", items: { type: "string" } },
          blockers: { type: "array", items: { type: "string" } },
          advice: { type: "string" }
        }
      }
    });
    setForm(f => ({
      ...f,
      milestones: result.milestones || [],
      skills_to_acquire: result.skills_to_acquire || f.skills_to_acquire,
      certifications_to_earn: result.certifications_to_earn || f.certifications_to_earn,
      blockers: result.blockers || [],
      ai_recommendations: result.advice || ""
    }));
    setAiLoading(false);
  };

  const workerName = (id) => workers.find(w => w.id === id)?.full_name || "—";

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><Map className="w-5 h-5 text-orange-600" /><h1 className="text-xl font-bold">Career Planner</h1><Badge variant="outline">{plans.length} plans</Badge></div>
        <Button onClick={() => { setForm(BLANK); setOpen(true); }} className="bg-orange-600 hover:bg-orange-700 text-white"><Plus className="w-4 h-4 mr-1" />New Plan</Button>
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : plans.length === 0 ? <Card className="p-10 text-center border-dashed"><p className="text-muted-foreground">No career plans yet.</p></Card> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {plans.map(p => (
            <Card key={p.id} className="p-4 cursor-pointer hover:border-orange-400 transition-all" onClick={() => setSelectedPlan(selectedPlan?.id === p.id ? null : p)}>
              <div className="flex items-start justify-between mb-2">
                <div><p className="font-bold text-sm">{p.title}</p><p className="text-xs text-muted-foreground">{workerName(p.worker_id)}: {p.current_role} → {p.target_role}</p></div>
                <Badge variant="outline" className="text-[10px]">{p.status}</Badge>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground"><span>Progress</span><span>{p.progress_pct || 0}%</span></div>
                <Progress value={p.progress_pct || 0} className="h-1.5" />
              </div>
              <div className="flex gap-2 mt-2 text-xs text-muted-foreground">
                {p.timeline_months && <span>{p.timeline_months}mo timeline</span>}
                {p.income_goal > 0 && <span className="text-emerald-600 font-semibold">Goal: ${p.income_goal.toLocaleString()}/yr</span>}
                {p.skills_to_acquire?.length > 0 && <span>{p.skills_to_acquire.length} skills to gain</span>}
              </div>
              {selectedPlan?.id === p.id && p.ai_recommendations && (
                <div className="mt-3 p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200">
                  <p className="text-xs font-semibold text-orange-700 mb-1">AI Career Advice</p>
                  <p className="text-xs text-orange-800">{p.ai_recommendations}</p>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Career Plan</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label>Plan Title *</Label><Input value={form.title} onChange={e => set("title", e.target.value)} className="mt-1" /></div>
              <div><Label>Worker</Label><Select value={form.worker_id} onValueChange={v => set("worker_id", v)}><SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value={null}>None</SelectItem>{workers.map(w => <SelectItem key={w.id} value={w.id}>{w.full_name}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Timeline (months)</Label><Input type="number" value={form.timeline_months} onChange={e => set("timeline_months", Number(e.target.value))} className="mt-1" /></div>
              <div><Label>Current Role</Label><Input value={form.current_role} onChange={e => set("current_role", e.target.value)} className="mt-1" /></div>
              <div><Label>Target Role</Label><Input value={form.target_role} onChange={e => set("target_role", e.target.value)} className="mt-1" /></div>
              <div><Label>Current Income ($/yr)</Label><Input type="number" value={form.current_income} onChange={e => set("current_income", Number(e.target.value))} className="mt-1" /></div>
              <div><Label>Income Goal ($/yr)</Label><Input type="number" value={form.income_goal} onChange={e => set("income_goal", Number(e.target.value))} className="mt-1" /></div>
              <div className="col-span-2">
                <div className="flex items-center justify-between mb-1"><Label>Skills to Acquire</Label></div>
                <div className="flex gap-2"><Input placeholder="Add skill…" value={skillInput} onChange={e => setSkillInput(e.target.value)} onKeyDown={e => e.key==="Enter" && addSkill()} /><Button size="sm" variant="outline" onClick={addSkill}>+</Button></div>
                <div className="flex flex-wrap gap-1 mt-1">{(form.skills_to_acquire||[]).map(s => <Badge key={s} variant="outline" className="text-[10px] cursor-pointer" onClick={() => setForm(f => ({ ...f, skills_to_acquire: f.skills_to_acquire.filter(x=>x!==s) }))}>{s} ✕</Badge>)}</div>
              </div>
              <div className="col-span-2">
                <Label>Certifications to Earn</Label>
                <div className="flex gap-2 mt-1"><Input placeholder="Add cert…" value={certInput} onChange={e => setCertInput(e.target.value)} onKeyDown={e => e.key==="Enter" && addCert()} /><Button size="sm" variant="outline" onClick={addCert}>+</Button></div>
                <div className="flex flex-wrap gap-1 mt-1">{(form.certifications_to_earn||[]).map(c => <Badge key={c} variant="outline" className="text-[10px] cursor-pointer" onClick={() => setForm(f => ({ ...f, certifications_to_earn: f.certifications_to_earn.filter(x=>x!==c) }))}>{c} ✕</Badge>)}</div>
              </div>
              <div className="col-span-2"><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={e => set("notes", e.target.value)} className="mt-1" /></div>
            </div>
            <Button onClick={generateAIPlan} disabled={aiLoading || !form.current_role || !form.target_role} variant="outline" className="w-full border-orange-400 text-orange-600">
              {aiLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating Plan…</> : <><Wand2 className="w-4 h-4 mr-2" />Generate AI Career Roadmap</>}
            </Button>
            {form.ai_recommendations && <div className="p-3 bg-orange-50 rounded-lg text-xs text-orange-800">{form.ai_recommendations}</div>}
            <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={handleSave} disabled={saving || !form.title} className="bg-orange-600 hover:bg-orange-700 text-white">{saving ? "Saving…" : "Save Plan"}</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}