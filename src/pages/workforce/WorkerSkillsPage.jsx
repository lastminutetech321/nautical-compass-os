import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GraduationCap, Plus, AlertTriangle, CheckCircle } from "lucide-react";

const PROFICIENCY = ["beginner","intermediate","advanced","expert"];
const CERT_TYPES = ["certification","license","permit","credential","degree","course","badge","other"];
const CERT_STATUSES = ["active","expired","pending_renewal","suspended","revoked"];
const CERT_STATUS_COLORS = { active:"bg-emerald-100 text-emerald-700", expired:"bg-red-100 text-red-700", pending_renewal:"bg-amber-100 text-amber-700", suspended:"bg-orange-100 text-orange-700", revoked:"bg-red-200 text-red-800" };
const PROF_COLORS = { beginner:"bg-slate-100 text-slate-600", intermediate:"bg-blue-100 text-blue-700", advanced:"bg-violet-100 text-violet-700", expert:"bg-emerald-100 text-emerald-700" };

export default function WorkerSkillsPage() {
  const [skills, setSkills] = useState([]);
  const [certs, setCerts] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [skillOpen, setSkillOpen] = useState(false);
  const [certOpen, setCertOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [skillForm, setSkillForm] = useState({ worker_id:"", skill_name:"", category:"", proficiency:"intermediate", years_used:0 });
  const [certForm, setCertForm] = useState({ worker_id:"", name:"", type:"certification", issuing_body:"", credential_id:"", issued_date:"", expiry_date:"", status:"active", jurisdiction:"", notes:"" });

  useEffect(() => {
    Promise.all([
      base44.entities.WorkerSkill.list("-created_date", 300),
      base44.entities.WorkerCertification.list("-created_date", 300),
      base44.entities.WorkerProfile.list("-created_date", 100),
    ]).then(([s, c, w]) => { setSkills(s); setCerts(c); setWorkers(w); }).finally(() => setLoading(false));
  }, []);

  const ss = (k, v) => setSkillForm(f => ({ ...f, [k]: v }));
  const sc = (k, v) => setCertForm(f => ({ ...f, [k]: v }));

  const saveSkill = async () => {
    setSaving(true);
    const r = await base44.entities.WorkerSkill.create(skillForm);
    setSkills(prev => [r, ...prev]);
    setSkillOpen(false);
    setSaving(false);
  };

  const saveCert = async () => {
    setSaving(true);
    const r = await base44.entities.WorkerCertification.create(certForm);
    setCerts(prev => [r, ...prev]);
    setCertOpen(false);
    setSaving(false);
  };

  const today = new Date().toISOString().slice(0, 10);
  const expiringSoon = certs.filter(c => c.expiry_date && c.expiry_date > today && c.expiry_date <= new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10));
  const expired = certs.filter(c => c.expiry_date && c.expiry_date < today && c.status === "active");
  const workerName = (id) => workers.find(w => w.id === id)?.full_name || "—";

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center gap-2"><GraduationCap className="w-5 h-5 text-orange-600" /><h1 className="text-xl font-bold">Skills & Certifications</h1></div>

      {(expiringSoon.length > 0 || expired.length > 0) && (
        <Card className="p-3 bg-amber-50 border-amber-200 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <span className="text-sm text-amber-700">{expired.length > 0 ? `${expired.length} expired certifications — ` : ""}{expiringSoon.length > 0 ? `${expiringSoon.length} expiring within 30 days` : ""}</span>
        </Card>
      )}

      <Tabs defaultValue="skills">
        <TabsList><TabsTrigger value="skills">Skills ({skills.length})</TabsTrigger><TabsTrigger value="certs">Certifications & Licenses ({certs.length})</TabsTrigger></TabsList>

        <TabsContent value="skills" className="space-y-3 mt-4">
          <div className="flex justify-end"><Button size="sm" onClick={() => setSkillOpen(true)} className="bg-orange-600 hover:bg-orange-700 text-white"><Plus className="w-3 h-3 mr-1" />Add Skill</Button></div>
          {loading ? <p className="text-muted-foreground text-sm">Loading…</p> : skills.length === 0 ? <Card className="p-8 text-center border-dashed"><p className="text-muted-foreground">No skills recorded.</p></Card> : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {skills.map(s => (
                <Card key={s.id} className="p-3">
                  <div className="flex items-start justify-between">
                    <div><p className="font-semibold text-sm">{s.skill_name}</p><p className="text-xs text-muted-foreground">{s.category || "Uncategorized"} {s.years_used > 0 ? `· ${s.years_used}yr` : ""}</p><p className="text-xs text-muted-foreground mt-0.5">Worker: {workerName(s.worker_id)}</p></div>
                    <div className="flex flex-col gap-1 items-end"><Badge className={`text-[9px] ${PROF_COLORS[s.proficiency]||""}`}>{s.proficiency}</Badge>{s.verified && <CheckCircle className="w-3 h-3 text-emerald-500" />}</div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="certs" className="space-y-3 mt-4">
          <div className="flex justify-end"><Button size="sm" onClick={() => setCertOpen(true)} className="bg-orange-600 hover:bg-orange-700 text-white"><Plus className="w-3 h-3 mr-1" />Add Cert / License</Button></div>
          {loading ? <p className="text-muted-foreground text-sm">Loading…</p> : certs.length === 0 ? <Card className="p-8 text-center border-dashed"><p className="text-muted-foreground">No certifications recorded.</p></Card> : (
            <div className="space-y-2">
              {certs.map(c => {
                const isExpired = c.expiry_date && c.expiry_date < today;
                const expiringSoon = c.expiry_date && !isExpired && c.expiry_date <= new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
                return (
                  <Card key={c.id} className={`p-3 ${isExpired ? "border-red-200" : expiringSoon ? "border-amber-200" : ""}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-sm">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.type} · {c.issuing_body || "—"} {c.jurisdiction ? `· ${c.jurisdiction}` : ""}</p>
                        <p className="text-xs text-muted-foreground">Worker: {workerName(c.worker_id)} {c.credential_id ? `· ID: ${c.credential_id}` : ""}</p>
                        <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                          {c.issued_date && <span>Issued: {c.issued_date}</span>}
                          {c.expiry_date && <span className={isExpired ? "text-red-600 font-semibold" : expiringSoon ? "text-amber-600 font-semibold" : ""}>Expires: {c.expiry_date}</span>}
                        </div>
                      </div>
                      <Badge className={`text-[9px] ${CERT_STATUS_COLORS[c.status]||""}`}>{c.status}</Badge>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Add Skill Dialog */}
      <Dialog open={skillOpen} onOpenChange={setSkillOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Skill</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div><Label>Worker</Label><Select value={skillForm.worker_id} onValueChange={v => ss("worker_id", v)}><SelectTrigger className="mt-1"><SelectValue placeholder="Select worker" /></SelectTrigger><SelectContent><SelectItem value={null}>None</SelectItem>{workers.map(w => <SelectItem key={w.id} value={w.id}>{w.full_name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Skill Name *</Label><Input value={skillForm.skill_name} onChange={e => ss("skill_name", e.target.value)} className="mt-1" /></div>
            <div><Label>Category</Label><Input placeholder="e.g. Electrical, Software, Construction" value={skillForm.category} onChange={e => ss("category", e.target.value)} className="mt-1" /></div>
            <div><Label>Proficiency</Label><Select value={skillForm.proficiency} onValueChange={v => ss("proficiency", v)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{PROFICIENCY.map(p => <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Years Used</Label><Input type="number" value={skillForm.years_used} onChange={e => ss("years_used", Number(e.target.value))} className="mt-1" /></div>
            <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setSkillOpen(false)}>Cancel</Button><Button onClick={saveSkill} disabled={saving || !skillForm.skill_name} className="bg-orange-600 hover:bg-orange-700 text-white">{saving ? "Saving…" : "Save"}</Button></div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Cert Dialog */}
      <Dialog open={certOpen} onOpenChange={setCertOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Certification / License</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div><Label>Worker</Label><Select value={certForm.worker_id} onValueChange={v => sc("worker_id", v)}><SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value={null}>None</SelectItem>{workers.map(w => <SelectItem key={w.id} value={w.id}>{w.full_name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Name *</Label><Input value={certForm.name} onChange={e => sc("name", e.target.value)} className="mt-1" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Type</Label><Select value={certForm.type} onValueChange={v => sc("type", v)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{CERT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Status</Label><Select value={certForm.status} onValueChange={v => sc("status", v)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{CERT_STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g," ")}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div><Label>Issuing Body</Label><Input value={certForm.issuing_body} onChange={e => sc("issuing_body", e.target.value)} className="mt-1" /></div>
            <div><Label>Credential ID</Label><Input value={certForm.credential_id} onChange={e => sc("credential_id", e.target.value)} className="mt-1" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Issued Date</Label><Input type="date" value={certForm.issued_date} onChange={e => sc("issued_date", e.target.value)} className="mt-1" /></div>
              <div><Label>Expiry Date</Label><Input type="date" value={certForm.expiry_date} onChange={e => sc("expiry_date", e.target.value)} className="mt-1" /></div>
            </div>
            <div><Label>Jurisdiction</Label><Input value={certForm.jurisdiction} onChange={e => sc("jurisdiction", e.target.value)} className="mt-1" /></div>
            <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setCertOpen(false)}>Cancel</Button><Button onClick={saveCert} disabled={saving || !certForm.name} className="bg-orange-600 hover:bg-orange-700 text-white">{saving ? "Saving…" : "Save"}</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}