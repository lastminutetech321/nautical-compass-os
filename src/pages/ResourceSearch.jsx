import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Search, Plus, Filter, MapPin, Phone, Globe, FileText,
  Clock, AlertTriangle, CheckCircle, Star, Loader2,
  ChevronDown, ChevronUp, Database, RefreshCw, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

const CATEGORIES = [
  "housing","employment","food","medical","mental_health","legal_aid",
  "transportation","education","veteran","financial","emergency","disaster",
  "childcare","utility","clothing","community","other"
];

const PROVIDER_TYPES = ["federal","state","county","city","nonprofit","faith_based","private","other"];

const statusColors = {
  active: "text-emerald-600 bg-emerald-50 border-emerald-200",
  inactive: "text-slate-500 bg-slate-50 border-slate-200",
  seasonal: "text-amber-600 bg-amber-50 border-amber-200",
  waitlist: "text-orange-600 bg-orange-50 border-orange-200",
  unknown: "text-gray-500 bg-gray-50 border-gray-200",
};

function ResourceCard({ resource, onSelect }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <Card className="p-4 border border-border/60 hover:border-primary/30 transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <p className="text-sm font-semibold">{resource.name}</p>
            {resource.verified && <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />}
          </div>
          <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{resource.description}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={`text-[10px] capitalize ${statusColors[resource.status]}`}>{resource.status}</Badge>
            <Badge variant="secondary" className="text-[10px] capitalize">{resource.category?.replace(/_/g," ")}</Badge>
            {resource.provider_type && <span className="text-[10px] text-muted-foreground capitalize">{resource.provider_type}</span>}
            {resource.county && <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{resource.county}</span>}
          </div>
        </div>
        <div className="flex gap-1.5 flex-shrink-0">
          <Button size="sm" variant="outline" onClick={() => setExpanded(!expanded)} className="text-xs h-7 px-2">
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </Button>
          <Button size="sm" onClick={() => onSelect(resource)} className="text-xs h-7 px-2">Apply</Button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-border/40 space-y-3">
          {/* Why it qualifies explanation */}
          {(resource.eligibility_criteria || []).length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase mb-1.5">Why It May Qualify</p>
              <ul className="space-y-1">
                {resource.eligibility_criteria.map((c, i) => (
                  <li key={i} className="text-xs flex items-start gap-1.5">
                    <CheckCircle className="w-3 h-3 text-emerald-500 flex-shrink-0 mt-0.5" />{c}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Required documents */}
          {(resource.required_documents || []).length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase mb-1.5 flex items-center gap-1">
                <FileText className="w-3 h-3" />Required Documents
              </p>
              <ul className="space-y-1">
                {resource.required_documents.map((d, i) => (
                  <li key={i} className="text-xs flex items-start gap-1.5">
                    <span className="text-muted-foreground">•</span>{d}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Timeline + followup */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {resource.estimated_approval_days && (
              <div className="p-2.5 bg-blue-50 rounded border border-blue-100">
                <p className="text-[10px] font-bold text-blue-700 uppercase mb-0.5 flex items-center gap-1"><Clock className="w-3 h-3" />Estimated Timeline</p>
                <p className="text-xs text-blue-800">{resource.estimated_approval_days} days to decision</p>
                {resource.renewal_required && <p className="text-[10px] text-blue-600 mt-0.5">Renewal: {resource.renewal_frequency || "required"}</p>}
              </div>
            )}
            {(resource.required_followup || []).length > 0 && (
              <div className="p-2.5 bg-amber-50 rounded border border-amber-100">
                <p className="text-[10px] font-bold text-amber-700 uppercase mb-0.5">Required Follow-Up</p>
                <ul className="space-y-0.5">
                  {resource.required_followup.map((f, i) => <li key={i} className="text-xs text-amber-800">• {f}</li>)}
                </ul>
              </div>
            )}
          </div>

          {/* Blockers + risks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(resource.common_blockers || []).length > 0 && (
              <div className="p-2.5 bg-red-50 rounded border border-red-100">
                <p className="text-[10px] font-bold text-red-700 uppercase mb-0.5 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Possible Blockers</p>
                <ul className="space-y-0.5">
                  {resource.common_blockers.map((b, i) => <li key={i} className="text-xs text-red-800">• {b}</li>)}
                </ul>
              </div>
            )}
            {(resource.risk_factors || []).length > 0 && (
              <div className="p-2.5 bg-orange-50 rounded border border-orange-100">
                <p className="text-[10px] font-bold text-orange-700 uppercase mb-0.5">Risk Factors</p>
                <ul className="space-y-0.5">
                  {resource.risk_factors.map((r, i) => <li key={i} className="text-xs text-orange-800">• {r}</li>)}
                </ul>
              </div>
            )}
          </div>

          {/* Contact */}
          <div className="flex flex-wrap gap-3">
            {resource.phone && <a href={`tel:${resource.phone}`} className="flex items-center gap-1 text-xs text-blue-600 hover:underline"><Phone className="w-3 h-3" />{resource.phone}</a>}
            {resource.website && <a href={resource.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-blue-600 hover:underline"><Globe className="w-3 h-3" />Website</a>}
            {resource.application_url && <a href={resource.application_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-emerald-600 hover:underline"><FileText className="w-3 h-3" />Apply Online</a>}
          </div>
        </div>
      )}
    </Card>
  );
}

export default function ResourceSearch() {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active");
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedResource, setSelectedResource] = useState(null);
  const [applyOpen, setApplyOpen] = useState(false);
  const [applyForm, setApplyForm] = useState({ client_name: "", notes: "" });
  const [form, setForm] = useState({
    name: "", description: "", category: "housing", provider_name: "", provider_type: "nonprofit",
    jurisdiction: "North Carolina", county: "", phone: "", website: "", application_url: "",
    eligibility_criteria: "", required_documents: "", common_blockers: "", risk_factors: "",
    required_followup: "", estimated_approval_days: "", benefit_amount: "", renewal_frequency: "",
    income_limit: "", application_method: "mixed", status: "active"
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cat = params.get("cat");
    if (cat) setCatFilter(cat);
    load();
  }, []);

  const load = () => {
    setLoading(true);
    base44.entities.Resource.list("-created_date", 200).then(r => {
      setResources(r); setLoading(false);
    }).catch(() => setLoading(false));
  };

  const aiGenerate = async () => {
    if (!form.name || !form.category) return;
    setGenerating(true);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an expert in government benefits and social services in ${form.jurisdiction || "North Carolina"}.

Generate detailed, accurate resource information for:
Name: ${form.name}
Category: ${form.category}
Provider: ${form.provider_name || "unknown"}
Jurisdiction: ${form.jurisdiction}

Return:
- description: Clear 1-2 sentence description of what this resource provides
- eligibility_criteria: 4-6 bullet points explaining WHO qualifies and WHY (income, status, residency, etc)
- required_documents: 6-10 specific documents needed to apply (ID, proof of income, etc)
- common_blockers: 3-5 common reasons applications are denied or delayed
- risk_factors: 2-4 risk factors that could jeopardize the application
- required_followup: 3-4 post-application follow-up requirements (check-ins, recertifications, etc)
- benefit_amount: Typical benefit or assistance amount/type
- estimated_approval_days: Realistic number of days for decision
- renewal_required: true/false
- renewal_frequency: How often renewal is needed
- income_limit: Income eligibility threshold if applicable

IMPORTANT: Return only factual information about real programs. Do not fabricate specifics.`,
      response_json_schema: {
        type: "object",
        properties: {
          description: { type: "string" },
          eligibility_criteria: { type: "array", items: { type: "string" } },
          required_documents: { type: "array", items: { type: "string" } },
          common_blockers: { type: "array", items: { type: "string" } },
          risk_factors: { type: "array", items: { type: "string" } },
          required_followup: { type: "array", items: { type: "string" } },
          benefit_amount: { type: "string" },
          estimated_approval_days: { type: "number" },
          renewal_required: { type: "boolean" },
          renewal_frequency: { type: "string" },
          income_limit: { type: "string" }
        }
      }
    }).catch(() => null);
    if (result) {
      setForm(f => ({
        ...f,
        description: result.description || f.description,
        eligibility_criteria: (result.eligibility_criteria || []).join("\n"),
        required_documents: (result.required_documents || []).join("\n"),
        common_blockers: (result.common_blockers || []).join("\n"),
        risk_factors: (result.risk_factors || []).join("\n"),
        required_followup: (result.required_followup || []).join("\n"),
        benefit_amount: result.benefit_amount || f.benefit_amount,
        estimated_approval_days: result.estimated_approval_days || f.estimated_approval_days,
        renewal_frequency: result.renewal_frequency || f.renewal_frequency,
        income_limit: result.income_limit || f.income_limit,
      }));
    }
    setGenerating(false);
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    const toArr = (s) => s ? s.split("\n").map(x => x.trim()).filter(Boolean) : [];
    await base44.entities.Resource.create({
      ...form,
      eligibility_criteria: toArr(form.eligibility_criteria),
      required_documents: toArr(form.required_documents),
      common_blockers: toArr(form.common_blockers),
      risk_factors: toArr(form.risk_factors),
      required_followup: toArr(form.required_followup),
      estimated_approval_days: form.estimated_approval_days ? Number(form.estimated_approval_days) : undefined,
      renewal_required: !!form.renewal_frequency,
    });
    setSaving(false); setFormOpen(false); load();
  };

  const startApplication = async () => {
    if (!selectedResource || !applyForm.client_name) return;
    setSaving(true);
    await base44.entities.ResourceApplication.create({
      resource_id: selectedResource.id,
      resource_name: selectedResource.name,
      resource_category: selectedResource.category,
      client_name: applyForm.client_name,
      status: "not_started",
      documents_checklist: (selectedResource.required_documents || []).map(d => ({ doc: d, obtained: false })),
      notes: applyForm.notes,
      priority: "medium",
    });
    setSaving(false); setApplyOpen(false); setSelectedResource(null);
    setApplyForm({ client_name: "", notes: "" });
  };

  const filtered = resources.filter(r => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (catFilter !== "all" && r.category !== catFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return r.name?.toLowerCase().includes(s) || r.description?.toLowerCase().includes(s) || r.provider_name?.toLowerCase().includes(s) || r.county?.toLowerCase().includes(s);
    }
    return true;
  });

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">Resource Compass</p>
          <h1 className="text-2xl font-bold">Resource Database</h1>
          <p className="text-sm text-muted-foreground">Search and manage community resources across all categories.</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={load}><RefreshCw className="w-4 h-4" /></Button>
          <Button size="sm" onClick={() => setFormOpen(true)}><Plus className="w-4 h-4 mr-1.5" />Add Resource</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search resources..." className="pl-9" />
        </div>
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="w-44 text-xs h-9"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c.replace(/_/g," ")}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32 text-xs h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="seasonal">Seasonal</SelectItem>
            <SelectItem value="waitlist">Waitlist</SelectItem>
          </SelectContent>
        </Select>
        {(catFilter !== "all" || search) && (
          <Button size="sm" variant="ghost" onClick={() => { setCatFilter("all"); setSearch(""); }}><X className="w-4 h-4 mr-1" />Clear</Button>
        )}
      </div>

      <div className="text-xs text-muted-foreground">{filtered.length} resources found</div>

      {loading ? (
        <div className="flex items-center justify-center h-32"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <Database className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-30" />
          <p className="text-sm font-semibold mb-1">No resources found</p>
          <p className="text-xs text-muted-foreground mb-4">Add your first resource to build the database.</p>
          <Button onClick={() => setFormOpen(true)}><Plus className="w-4 h-4 mr-1.5" />Add Resource</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => (
            <ResourceCard key={r.id} resource={r} onSelect={res => { setSelectedResource(res); setApplyOpen(true); }} />
          ))}
        </div>
      )}

      {/* Add Resource Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Resource to Database</DialogTitle></DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><label className="text-xs font-semibold block mb-1">Resource Name *</label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
              <div><label className="text-xs font-semibold block mb-1">Category *</label>
                <Select value={form.category} onValueChange={v => setForm({...form, category: v})}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c.replace(/_/g," ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><label className="text-xs font-semibold block mb-1">Provider Type</label>
                <Select value={form.provider_type} onValueChange={v => setForm({...form, provider_type: v})}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{PROVIDER_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><label className="text-xs text-muted-foreground block mb-1">Provider Name</label><Input value={form.provider_name} onChange={e => setForm({...form, provider_name: e.target.value})} /></div>
              <div><label className="text-xs text-muted-foreground block mb-1">County</label><Input value={form.county} onChange={e => setForm({...form, county: e.target.value})} /></div>
              <div><label className="text-xs text-muted-foreground block mb-1">Phone</label><Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
              <div><label className="text-xs text-muted-foreground block mb-1">Website</label><Input value={form.website} onChange={e => setForm({...form, website: e.target.value})} /></div>
            </div>
            <div className="flex gap-2 items-center">
              <Button type="button" size="sm" variant="outline" onClick={aiGenerate} disabled={generating || !form.name}>
                {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : "✨"}
                {generating ? "Generating..." : "AI Auto-Fill"}
              </Button>
              <p className="text-xs text-muted-foreground">Uses AI to populate eligibility, documents, blockers, and timelines</p>
            </div>
            <div><label className="text-xs font-semibold block mb-1">Description</label><Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={2} /></div>
            <div><label className="text-xs font-semibold block mb-1">Eligibility Criteria (one per line)</label><Textarea value={form.eligibility_criteria} onChange={e => setForm({...form, eligibility_criteria: e.target.value})} rows={3} placeholder="Must be NC resident&#10;Income below 200% FPL&#10;..." /></div>
            <div><label className="text-xs font-semibold block mb-1">Required Documents (one per line)</label><Textarea value={form.required_documents} onChange={e => setForm({...form, required_documents: e.target.value})} rows={3} placeholder="Government-issued photo ID&#10;Proof of income (last 30 days)&#10;..." /></div>
            <div><label className="text-xs font-semibold block mb-1">Common Blockers (one per line)</label><Textarea value={form.common_blockers} onChange={e => setForm({...form, common_blockers: e.target.value})} rows={2} /></div>
            <div><label className="text-xs font-semibold block mb-1">Risk Factors (one per line)</label><Textarea value={form.risk_factors} onChange={e => setForm({...form, risk_factors: e.target.value})} rows={2} /></div>
            <div><label className="text-xs font-semibold block mb-1">Required Follow-Up (one per line)</label><Textarea value={form.required_followup} onChange={e => setForm({...form, required_followup: e.target.value})} rows={2} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="text-xs text-muted-foreground block mb-1">Approval Days</label><Input type="number" value={form.estimated_approval_days} onChange={e => setForm({...form, estimated_approval_days: e.target.value})} /></div>
              <div><label className="text-xs text-muted-foreground block mb-1">Renewal Freq.</label><Input value={form.renewal_frequency} onChange={e => setForm({...form, renewal_frequency: e.target.value})} placeholder="6 months" /></div>
              <div><label className="text-xs text-muted-foreground block mb-1">Income Limit</label><Input value={form.income_limit} onChange={e => setForm({...form, income_limit: e.target.value})} placeholder="200% FPL" /></div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Resource"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Apply Dialog */}
      <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Start Application — {selectedResource?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><label className="text-xs font-semibold block mb-1">Client Name *</label><Input value={applyForm.client_name} onChange={e => setApplyForm({...applyForm, client_name: e.target.value})} placeholder="Enter client name" /></div>
            <div><label className="text-xs font-semibold block mb-1">Notes</label><Textarea value={applyForm.notes} onChange={e => setApplyForm({...applyForm, notes: e.target.value})} rows={2} /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setApplyOpen(false)}>Cancel</Button>
              <Button onClick={startApplication} disabled={saving || !applyForm.client_name}>{saving ? "Creating..." : "Start Tracking"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}