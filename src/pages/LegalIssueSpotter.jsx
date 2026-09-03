import React, { useState, useEffect } from "react";
import { getMyCaseCollection, legalPilotGateway } from "@/api/pilotGateways";
import { Plus, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";

const categories = ["standing","capacity","civil_rights","contracts","housing","employment","consumer_finance","foia","animal_control","other"];
const categoryLabels = { standing: "Standing", capacity: "Capacity", civil_rights: "Civil Rights", contracts: "Contracts", housing: "Housing", employment: "Employment", consumer_finance: "Consumer Finance", foia: "FOIA", animal_control: "Animal Control", other: "Other" };

export default function LegalIssueSpotter() {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [caseFiles, setCaseFiles] = useState([]);
  const [form, setForm] = useState({ title: "", category: "other", description: "", case_id: "", severity: "medium" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    setError("");
    getMyCaseCollection(legalPilotGateway, "legal_issues")
      .then(({ cases, records }) => { setCaseFiles(cases); setIssues(records); })
      .catch(err => { setIssues([]); setError(err.message || "Legal issues could not be loaded."); })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setSaving(true);
    const { case_id: caseId, ...issueData } = form;
    if (!caseId) {
      setError("Select a case before adding a legal issue.");
      setSaving(false);
      return;
    }
    await legalPilotGateway.createLegalIssue(caseId, { ...issueData, is_informational: true, supporting_evidence_ids: [] });
    setSaving(false);
    setAddOpen(false);
    setForm({ title: "", category: "other", description: "", case_id: "", severity: "medium" });
    load();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
      <PageHeader
        title="Legal Issue Spotter"
        subtitle="AI-assisted identification of potential legal issues"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}><Plus className="w-4 h-4 mr-1.5" />Add Manually</Button>
            <Button size="sm" disabled title="The backend does not provide scan_legal_issues">AI Scan — Not available in this internal pilot</Button>
          </div>
        }
      />
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-5 text-xs text-amber-700">
        <strong>⚠ INFORMATIONAL ONLY:</strong> All outputs are for general information purposes and do not constitute legal advice. Consult a licensed attorney for legal guidance.
      </div>

      {/* Category summary */}
      <div className="flex flex-wrap gap-2 mb-5">
        {categories.map(cat => {
          const count = issues.filter(i => i.category === cat).length;
          if (count === 0) return null;
          return <Badge key={cat} variant="outline" className="text-xs">{categoryLabels[cat]} ({count})</Badge>;
        })}
      </div>

      {issues.length === 0 ? (
        <EmptyState icon={Scale} title="No legal issues flagged" description="Add a legal issue manually. AI scanning is not available in this internal pilot." actionLabel="Add Manually" onAction={() => setAddOpen(true)} />
      ) : (
        <div className="space-y-3">
          {issues.map(issue => (
            <Card key={issue.id} className="p-4 border border-border/60 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge variant="outline" className="text-[10px]">{categoryLabels[issue.category] || issue.category}</Badge>
                    <StatusBadge value={issue.severity} type="priority" />
                    <StatusBadge value={issue.status} />
                  </div>
                  <p className="text-sm font-semibold">{issue.title}</p>
                  {issue.case_name && <p className="text-xs text-muted-foreground">Case: {issue.case_name}</p>}
                  <p className="text-sm text-muted-foreground mt-1">{issue.description || issue.ai_analysis}</p>
                </div>
              </div>
              <p className="text-[10px] text-amber-600 mt-2 font-medium">ⓘ INFORMATIONAL ONLY · Not legal advice</p>
            </Card>
          ))}
        </div>
      )}

      {/* Manual Add Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Add Legal Issue</DialogTitle></DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div><Label>Title</Label><Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm({...form, category: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{categoryLabels[c]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Severity</Label>
                <Select value={form.severity} onValueChange={v => setForm({...form, severity: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["low","medium","high","critical"].map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Case</Label>
              <Select value={form.case_id} onValueChange={v => setForm({...form, case_id: v})}>
                <SelectTrigger><SelectValue placeholder="Select a case" /></SelectTrigger>
                <SelectContent>{caseFiles.map(caseFile => <SelectItem key={caseFile.id} value={caseFile.id}>{caseFile.title}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={4} /></div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button><Button type="submit" disabled={saving || !form.case_id}>{saving ? "Saving..." : "Add"}</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
