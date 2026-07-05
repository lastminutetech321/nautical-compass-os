import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { FileText, CheckCircle, Upload, Link2, Loader2, RefreshCw, AlertTriangle, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

export default function ResourceDocs() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);
  const load = () => {
    setLoading(true);
    base44.entities.ResourceApplication.list("-created_date", 200).then(a => {
      setApplications(a.filter(app => (app.documents_checklist || []).length > 0));
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  const toggleDoc = async (app, idx) => {
    setSaving(true);
    const checklist = [...(app.documents_checklist || [])];
    checklist[idx] = { ...checklist[idx], obtained: !checklist[idx].obtained };
    await base44.entities.ResourceApplication.update(app.id, { documents_checklist: checklist });
    setSaving(false); load();
  };

  const filtered = applications.filter(a =>
    !search || a.client_name?.toLowerCase().includes(search.toLowerCase()) || a.resource_name?.toLowerCase().includes(search.toLowerCase())
  );

  // Master doc list across all pending apps
  const allDocs = applications
    .filter(a => !["approved","withdrawn","denied"].includes(a.status))
    .flatMap(a => (a.documents_checklist || []).map(d => ({ ...d, app: a })));
  const uniqueDocs = [...new Set(allDocs.map(d => d.doc))];
  const obtainedDocs = uniqueDocs.filter(doc => allDocs.some(d => d.doc === doc && d.obtained));

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">Resource Compass</p>
        <h1 className="text-2xl font-bold flex items-center gap-2"><FileText className="w-6 h-6 text-violet-500" />Document Checklist</h1>
        <p className="text-sm text-muted-foreground">Track all required documents across every application.</p>
      </div>

      {/* Master status */}
      {uniqueDocs.length > 0 && (
        <Card className="p-4 border border-border/60">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold">Master Document Progress</p>
            <span className="text-xs text-muted-foreground">{obtainedDocs.length}/{uniqueDocs.length} obtained</span>
          </div>
          <Progress value={uniqueDocs.length ? Math.round((obtainedDocs.length/uniqueDocs.length)*100) : 0} className="h-2 mb-3" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
            {uniqueDocs.map(doc => {
              const obtained = obtainedDocs.includes(doc);
              return (
                <div key={doc} className={`flex items-start gap-2 p-2 rounded text-xs ${obtained ? "bg-emerald-50 text-emerald-800" : "bg-muted/30 text-muted-foreground"}`}>
                  {obtained ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" /> : <div className="w-3.5 h-3.5 rounded-full border-2 border-muted-foreground/40 flex-shrink-0 mt-0.5" />}
                  <span className={obtained ? "line-through opacity-60" : ""}>{doc}</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by client or program..." className="pl-9" />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-xl">
          <FileText className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-30" />
          <p className="text-sm text-muted-foreground">No document checklists yet. Start applications from the Resource Database.</p>
          <Link to="/resource-search"><Button size="sm" className="mt-3">Browse Resources →</Button></Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(app => {
            const checklist = app.documents_checklist || [];
            const obtained = checklist.filter(d => d.obtained).length;
            const pct = checklist.length ? Math.round((obtained/checklist.length)*100) : 100;
            return (
              <Card key={app.id} className="p-4 border border-border/60">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-semibold">{app.resource_name}</p>
                    <p className="text-xs text-muted-foreground">{app.client_name} · <span className="capitalize">{app.status?.replace(/_/g," ")}</span></p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-muted-foreground">{obtained}/{checklist.length}</p>
                    <Progress value={pct} className="h-1.5 w-20 mt-1" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  {checklist.map((item, i) => (
                    <label key={i} className="flex items-center gap-2 cursor-pointer group hover:bg-muted/20 rounded p-1 -m-1 transition-colors" onClick={() => toggleDoc(app, i)}>
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${item.obtained ? "bg-emerald-500 border-emerald-500" : "border-muted-foreground/40 group-hover:border-primary"}`}>
                        {item.obtained && <CheckCircle className="w-3 h-3 text-white" />}
                      </div>
                      <span className={`text-xs ${item.obtained ? "line-through text-muted-foreground" : ""}`}>{item.doc}</span>
                      {item.evidence_id && <Link2 className="w-3 h-3 text-blue-500 flex-shrink-0" />}
                    </label>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}