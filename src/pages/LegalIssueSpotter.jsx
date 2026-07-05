import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Scale, AlertTriangle, Loader2, Search } from "lucide-react";
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
  const [scanOpen, setScanOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanText, setScanText] = useState("");
  const [caseName, setCaseName] = useState("");
  const [form, setForm] = useState({ title: "", category: "other", description: "", case_name: "", severity: "medium" });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    base44.entities.LegalIssue.list("-created_date", 100).then(setIssues).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleScan = async (e) => {
    e.preventDefault();
    setScanning(true);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a legal issue identification system. Analyze the following facts/documents and identify potential legal issues.

IMPORTANT DISCLAIMER: All outputs are INFORMATIONAL ONLY and do not constitute legal advice. Users must consult a licensed attorney.

Case/Context: ${caseName}
Facts/Documents: ${scanText}

Identify potential legal issues in these categories: standing, capacity, civil_rights, contracts, housing, employment, consumer_finance, foia, animal_control, other.

For each issue found, provide:
- category (from the list above)
- title (brief name)
- description (what the issue is and why it may apply)
- severity: low, medium, high, or critical

Be thorough but note that this is a preliminary scan only.`,
      response_json_schema: {
        type: "object",
        properties: {
          issues: {
            type: "array",
            items: {
              type: "object",
              properties: {
                category: { type: "string" },
                title: { type: "string" },
                description: { type: "string" },
                severity: { type: "string" }
              },
              required: ["category", "title", "description", "severity"]
            }
          },
          summary: { type: "string" }
        },
        required: ["issues", "summary"]
      }
    });
    const issueCreations = (result.issues || []).map(issue =>
      base44.entities.LegalIssue.create({
        ...issue,
        case_name: caseName,
        ai_analysis: issue.description,
        status: "flagged",
        is_informational: true,
        supporting_evidence_ids: []
      })
    );
    await Promise.all(issueCreations);
    setScanning(false);
    setScanOpen(false);
    setScanText("");
    setCaseName("");
    load();
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setSaving(true);
    await base44.entities.LegalIssue.create({ ...form, is_informational: true, supporting_evidence_ids: [] });
    setSaving(false);
    setAddOpen(false);
    setForm({ title: "", category: "other", description: "", case_name: "", severity: "medium" });
    load();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader
        title="Legal Issue Spotter"
        subtitle="AI-assisted identification of potential legal issues"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}><Plus className="w-4 h-4 mr-1.5" />Add Manually</Button>
            <Button size="sm" onClick={() => setScanOpen(true)}><Search className="w-4 h-4 mr-1.5" />AI Scan</Button>
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
        <EmptyState icon={Scale} title="No legal issues flagged" description="Use AI Scan to analyze facts or add issues manually" actionLabel="AI Scan" onAction={() => setScanOpen(true)} />
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

      {/* AI Scan Dialog */}
      <Dialog open={scanOpen} onOpenChange={setScanOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Scale className="w-4 h-4" />AI Legal Issue Scan</DialogTitle></DialogHeader>
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3 text-xs text-amber-700">⚠ Results are informational only and not legal advice.</div>
          <form onSubmit={handleScan} className="space-y-4">
            <div><Label>Case / Matter Name</Label><Input value={caseName} onChange={e => setCaseName(e.target.value)} /></div>
            <div><Label>Facts / Document Content</Label><Textarea value={scanText} onChange={e => setScanText(e.target.value)} rows={8} placeholder="Paste the facts, situation description, or document content to analyze..." required /></div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setScanOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={scanning}>{scanning ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Scanning...</> : "Run Scan"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

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
            <div><Label>Case Name</Label><Input value={form.case_name} onChange={e => setForm({...form, case_name: e.target.value})} /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={4} /></div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? "Saving..." : "Add"}</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}