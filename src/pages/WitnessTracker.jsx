import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, UserCheck, AlertTriangle, MessageSquare, Link2 } from "lucide-react";
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
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import moment from "moment";

const roleColors = { witness: "bg-blue-50 text-blue-700", subject: "bg-red-50 text-red-700", victim: "bg-orange-50 text-orange-700", respondent: "bg-slate-50 text-slate-600", expert: "bg-violet-50 text-violet-700", other: "bg-slate-50 text-slate-500" };

export default function WitnessTracker() {
  const [witnesses, setWitnesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [stmtOpen, setStmtOpen] = useState(false);
  const [form, setForm] = useState({ name: "", role: "witness", case_name: "", contact_info: "", credibility_notes: "" });
  const [stmtForm, setStmtForm] = useState({ date: "", content: "", type: "statement", source: "" });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    base44.entities.Witness.list("-created_date", 100).then(data => {
      setWitnesses(data);
      if (data.length > 0 && !selected) setSelected(data[0]);
    }).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    const created = await base44.entities.Witness.create({ ...form, statements: [], contradictions: [], interactions: [], evidence_ids: [] });
    setSaving(false);
    setFormOpen(false);
    setForm({ name: "", role: "witness", case_name: "", contact_info: "", credibility_notes: "" });
    load();
    setSelected(created);
  };

  const handleAddStatement = async (e) => {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    const newStmt = { ...stmtForm, added_at: new Date().toISOString(), id: Date.now().toString() };
    const updatedStmts = [...(selected.statements || []), newStmt];
    await base44.entities.Witness.update(selected.id, { statements: updatedStmts });
    setSelected({ ...selected, statements: updatedStmts });
    setStmtOpen(false);
    setStmtForm({ date: "", content: "", type: "statement", source: "" });
    setSaving(false);
  };

  const flagContradiction = async (stmt1Idx, stmt2Idx) => {
    if (!selected) return;
    const contradiction = {
      between: [stmt1Idx, stmt2Idx],
      flagged_at: new Date().toISOString(),
      note: "Manual contradiction flag"
    };
    const updated = [...(selected.contradictions || []), contradiction];
    await base44.entities.Witness.update(selected.id, { contradictions: updated });
    setSelected({ ...selected, contradictions: updated });
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader
        title="Witness Tracker"
        subtitle="Track people, statements, and contradictions"
        actions={<Button onClick={() => setFormOpen(true)} size="sm"><Plus className="w-4 h-4 mr-1.5" />Add Person</Button>}
      />
      {witnesses.length === 0 ? (
        <EmptyState icon={UserCheck} title="No witnesses tracked" description="Add people to track their statements and evidence links" actionLabel="Add Person" onAction={() => setFormOpen(true)} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-2">
            {witnesses.map(w => (
              <Card key={w.id} className={`p-3 cursor-pointer transition-all ${selected?.id === w.id ? "border-primary shadow-md" : "border-border/60 hover:shadow-sm"}`} onClick={() => setSelected(w)}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">{w.name}</p>
                    <p className="text-xs text-muted-foreground">{w.case_name || "No case"}</p>
                  </div>
                  <Badge variant="outline" className={`text-[10px] ${roleColors[w.role] || ""}`}>{w.role}</Badge>
                </div>
                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                  <MessageSquare className="w-3 h-3" />{(w.statements || []).length} statements
                  {(w.contradictions || []).length > 0 && <span className="text-red-500 flex items-center gap-0.5"><AlertTriangle className="w-3 h-3" />{w.contradictions.length} conflicts</span>}
                </div>
              </Card>
            ))}
          </div>

          {selected && (
            <div className="lg:col-span-2">
              <Card className="p-5 border border-border/60">
                <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
                  <div>
                    <h2 className="text-base font-semibold">{selected.name}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className={`text-[10px] ${roleColors[selected.role] || ""}`}>{selected.role}</Badge>
                      <span className="text-xs text-muted-foreground">{selected.case_name || "No case"}</span>
                    </div>
                  </div>
                  <Button size="sm" onClick={() => setStmtOpen(true)}><Plus className="w-4 h-4 mr-1.5" />Add Statement</Button>
                </div>
                {selected.credibility_notes && (
                  <div className="bg-muted p-3 rounded-lg mb-4 text-xs text-muted-foreground"><span className="font-semibold text-foreground">Credibility Notes: </span>{selected.credibility_notes}</div>
                )}
                <Tabs defaultValue="statements">
                  <TabsList className="mb-4">
                    <TabsTrigger value="statements">Statements ({(selected.statements||[]).length})</TabsTrigger>
                    <TabsTrigger value="contradictions">Contradictions ({(selected.contradictions||[]).length})</TabsTrigger>
                  </TabsList>
                  <TabsContent value="statements">
                    {(selected.statements || []).length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">No statements recorded</p>
                    ) : (
                      <div className="space-y-3">
                        {selected.statements.map((stmt, i) => (
                          <div key={i} className="p-3 bg-muted/50 rounded-lg border border-border/40">
                            <div className="flex items-center justify-between mb-1">
                              <Badge variant="outline" className="text-[10px]">{stmt.type}</Badge>
                              <span className="text-xs text-muted-foreground">{stmt.date ? moment(stmt.date).format("MMM D, YYYY") : "No date"}</span>
                            </div>
                            <p className="text-sm">{stmt.content}</p>
                            {stmt.source && <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Link2 className="w-3 h-3" />{stmt.source}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                  <TabsContent value="contradictions">
                    {(selected.contradictions || []).length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">No contradictions flagged</p>
                    ) : (
                      <div className="space-y-2">
                        {selected.contradictions.map((c, i) => (
                          <div key={i} className="p-3 bg-red-50 border border-red-100 rounded-lg text-sm">
                            <AlertTriangle className="w-4 h-4 text-red-500 inline mr-2" />
                            Contradiction flagged on {moment(c.flagged_at).format("MMM D, YYYY")}
                            {c.note && <p className="text-xs text-muted-foreground mt-1">{c.note}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </Card>
            </div>
          )}
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add Person</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div><Label>Name</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Role</Label>
                <Select value={form.role} onValueChange={v => setForm({...form, role: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["witness","subject","victim","respondent","expert","other"].map(r => <SelectItem key={r} value={r}>{r.charAt(0).toUpperCase()+r.slice(1)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Case Name</Label><Input value={form.case_name} onChange={e => setForm({...form, case_name: e.target.value})} /></div>
            </div>
            <div><Label>Contact Info</Label><Input value={form.contact_info} onChange={e => setForm({...form, contact_info: e.target.value})} /></div>
            <div><Label>Credibility Notes</Label><Textarea value={form.credibility_notes} onChange={e => setForm({...form, credibility_notes: e.target.value})} rows={2} /></div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? "Saving..." : "Add"}</Button></div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={stmtOpen} onOpenChange={setStmtOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add Statement</DialogTitle></DialogHeader>
          <form onSubmit={handleAddStatement} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select value={stmtForm.type} onValueChange={v => setStmtForm({...stmtForm, type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["statement","testimony","deposition","interview","affidavit","other"].map(t => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Date</Label><Input type="date" value={stmtForm.date} onChange={e => setStmtForm({...stmtForm, date: e.target.value})} /></div>
            </div>
            <div><Label>Content</Label><Textarea value={stmtForm.content} onChange={e => setStmtForm({...stmtForm, content: e.target.value})} rows={4} required /></div>
            <div><Label>Source / Reference</Label><Input value={stmtForm.source} onChange={e => setStmtForm({...stmtForm, source: e.target.value})} /></div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setStmtOpen(false)}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? "Saving..." : "Add"}</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}