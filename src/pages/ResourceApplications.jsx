import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  FileText, Plus, Search, CheckCircle, AlertTriangle, Clock,
  Loader2, ChevronDown, ChevronUp, X, RefreshCw, Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import moment from "moment";

const STATUS_COLORS = {
  not_started: "text-slate-500 bg-slate-50 border-slate-200",
  documents_gathering: "text-amber-600 bg-amber-50 border-amber-200",
  submitted: "text-blue-600 bg-blue-50 border-blue-200",
  pending_review: "text-violet-600 bg-violet-50 border-violet-200",
  additional_info_needed: "text-orange-600 bg-orange-50 border-orange-200",
  approved: "text-emerald-600 bg-emerald-50 border-emerald-200",
  denied: "text-red-600 bg-red-50 border-red-200",
  appealing: "text-rose-600 bg-rose-50 border-rose-200",
  withdrawn: "text-gray-500 bg-gray-50 border-gray-200",
  expired: "text-gray-600 bg-gray-100 border-gray-300",
};

const STATUS_ORDER = ["not_started","documents_gathering","submitted","pending_review","additional_info_needed","approved","denied","appealing","withdrawn","expired"];

export default function ResourceApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expanded, setExpanded] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  const load = () => {
    setLoading(true);
    base44.entities.ResourceApplication.list("-created_date", 200).then(a => {
      setApplications(a); setLoading(false);
    }).catch(() => setLoading(false));
  };

  const updateStatus = async (app, newStatus) => {
    setSaving(true);
    await base44.entities.ResourceApplication.update(app.id, { status: newStatus });
    setSaving(false); load();
  };

  const toggleDoc = async (app, docIndex) => {
    const checklist = [...(app.documents_checklist || [])];
    checklist[docIndex] = { ...checklist[docIndex], obtained: !checklist[docIndex].obtained };
    await base44.entities.ResourceApplication.update(app.id, { documents_checklist: checklist });
    load();
  };

  const filtered = applications.filter(a => {
    if (statusFilter !== "all" && a.status !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return a.client_name?.toLowerCase().includes(s) || a.resource_name?.toLowerCase().includes(s);
    }
    return true;
  });

  const docsObtained = (app) => (app.documents_checklist || []).filter(d => d.obtained).length;
  const docsTotal = (app) => (app.documents_checklist || []).length;
  const docsPct = (app) => docsTotal(app) ? Math.round((docsObtained(app) / docsTotal(app)) * 100) : 100;

  const stats = {
    total: applications.length,
    pending: applications.filter(a => ["submitted","pending_review","additional_info_needed"].includes(a.status)).length,
    approved: applications.filter(a => a.status === "approved").length,
    denied: applications.filter(a => a.status === "denied").length,
    overdue: applications.filter(a => a.deadline && new Date(a.deadline) < new Date() && !["approved","denied","withdrawn"].includes(a.status)).length,
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">Resource Compass</p>
          <h1 className="text-2xl font-bold">Application Tracker</h1>
          <p className="text-sm text-muted-foreground">Track every benefit application from start to decision.</p>
        </div>
        <Button size="sm" variant="outline" onClick={load}><RefreshCw className="w-4 h-4" /></Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total", val: stats.total, color: "text-foreground" },
          { label: "Pending", val: stats.pending, color: "text-amber-600" },
          { label: "Approved", val: stats.approved, color: "text-emerald-600" },
          { label: "Denied", val: stats.denied, color: "text-red-600" },
          { label: "Overdue", val: stats.overdue, color: stats.overdue > 0 ? "text-red-600" : "text-muted-foreground" },
        ].map(s => (
          <div key={s.label} className="text-center p-3 bg-muted/30 rounded-lg border border-border/40">
            <p className={`text-xl font-black ${s.color}`}>{s.val}</p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search applications..." className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48 text-xs h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {STATUS_ORDER.map(s => <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g," ")}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <FileText className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-30" />
          <p className="text-sm text-muted-foreground">No applications tracked yet. Start an application from the Resource Database.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(app => {
            const pct = docsPct(app);
            const isOverdue = app.deadline && new Date(app.deadline) < new Date() && !["approved","denied","withdrawn"].includes(app.status);
            const isExpanded = expanded === app.id;
            return (
              <Card key={app.id} className={`p-4 border transition-all ${isOverdue ? "border-red-200 bg-red-50/30" : "border-border/60"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="text-sm font-semibold">{app.resource_name}</p>
                      <Badge variant="outline" className={`text-[10px] capitalize ${STATUS_COLORS[app.status]}`}>{app.status?.replace(/_/g," ")}</Badge>
                      {isOverdue && <Badge variant="outline" className="text-[10px] text-red-600 border-red-300">OVERDUE</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{app.client_name} · {app.resource_category?.replace(/_/g," ")}</p>
                    {docsTotal(app) > 0 && (
                      <div className="flex items-center gap-2">
                        <Progress value={pct} className="h-1.5 w-24" />
                        <span className="text-[10px] text-muted-foreground">{docsObtained(app)}/{docsTotal(app)} docs</span>
                      </div>
                    )}
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground flex-wrap">
                      {app.submitted_date && <span>Submitted {moment(app.submitted_date).format("MMM D")}</span>}
                      {app.deadline && <span className={isOverdue ? "text-red-600 font-semibold" : ""}>Deadline {moment(app.deadline).format("MMM D")}</span>}
                      {app.renewal_date && <span>Renewal {moment(app.renewal_date).format("MMM D, YYYY")}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <Select value={app.status} onValueChange={v => updateStatus(app, v)} disabled={saving}>
                      <SelectTrigger className="h-7 w-40 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{STATUS_ORDER.map(s => <SelectItem key={s} value={s} className="capitalize text-xs">{s.replace(/_/g," ")}</SelectItem>)}</SelectContent>
                    </Select>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setExpanded(isExpanded ? null : app.id)}>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-border/40 space-y-3">
                    {/* Document checklist */}
                    {(app.documents_checklist || []).length > 0 && (
                      <div>
                        <p className="text-[11px] font-bold text-muted-foreground uppercase mb-2">Document Checklist</p>
                        <div className="space-y-1.5">
                          {app.documents_checklist.map((item, i) => (
                            <label key={i} className="flex items-center gap-2 cursor-pointer group">
                              <input type="checkbox" checked={item.obtained} onChange={() => toggleDoc(app, i)} className="rounded" />
                              <span className={`text-xs ${item.obtained ? "line-through text-muted-foreground" : ""}`}>{item.doc}</span>
                              {item.obtained && <CheckCircle className="w-3 h-3 text-emerald-500" />}
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Next steps */}
                    {(app.next_steps || []).length > 0 && (
                      <div>
                        <p className="text-[11px] font-bold text-muted-foreground uppercase mb-1">Next Steps</p>
                        <ul className="space-y-1">
                          {app.next_steps.map((s, i) => <li key={i} className="text-xs flex items-start gap-1.5"><span className="text-primary font-bold">{i+1}.</span>{s}</li>)}
                        </ul>
                      </div>
                    )}
                    {/* Denial reason */}
                    {app.denial_reason && (
                      <div className="p-2.5 bg-red-50 border border-red-100 rounded">
                        <p className="text-[11px] font-bold text-red-700 mb-0.5">Denial Reason</p>
                        <p className="text-xs text-red-800">{app.denial_reason}</p>
                        {app.appeal_deadline && <p className="text-[10px] text-red-600 mt-1">Appeal deadline: {moment(app.appeal_deadline).format("MMMM D, YYYY")}</p>}
                      </div>
                    )}
                    {app.notes && <p className="text-xs text-muted-foreground">{app.notes}</p>}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}