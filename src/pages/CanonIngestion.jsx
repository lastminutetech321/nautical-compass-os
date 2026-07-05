import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Upload, FileText, CheckCircle, Clock, AlertTriangle, Sparkles,
  Loader2, BookOpen, Search, RefreshCw, Eye, Trash2, Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import moment from "moment";
import CanonGapsPanel from "@/components/canon/CanonGapsPanel";

const CATEGORIES = [
  { value: "federal_statute", label: "Federal Statute" },
  { value: "state_statute", label: "State Statute" },
  { value: "case_law", label: "Case Law" },
  { value: "constitutional_law", label: "Constitutional Law" },
  { value: "civil_rights", label: "Civil Rights" },
  { value: "standing_doctrine", label: "Standing Doctrine" },
  { value: "jurisdiction", label: "Jurisdiction" },
  { value: "capacity_doctrine", label: "Capacity Doctrine" },
  { value: "administrative_law", label: "Administrative Law" },
  { value: "consumer_protection", label: "Consumer Protection" },
  { value: "nc_doctrine", label: "NC Doctrine" },
  { value: "evidence_standard", label: "Evidence Standard" },
  { value: "other", label: "Other" },
];

const STATUS_COLORS = {
  draft: "bg-slate-100 text-slate-600",
  pending_review: "bg-amber-100 text-amber-700",
  active: "bg-emerald-100 text-emerald-700",
  superseded: "bg-orange-100 text-orange-700",
  archived: "bg-slate-100 text-slate-500",
};

const AUTHORITY_LABELS = {
  supreme_court: "SCOTUS",
  circuit_court: "Circuit Ct.",
  district_court: "District Ct.",
  federal_agency: "Federal Agency",
  state_supreme: "State Supreme",
  state_appellate: "State Appellate",
  state_statute: "State Statute",
  municipal: "Municipal",
  constitutional: "Constitutional",
  nc_doctrine: "NC Doctrine",
};

export default function CanonIngestion() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState([]);
  const [hintCategory, setHintCategory] = useState("federal_statute");
  const [hintJurisdiction, setHintJurisdiction] = useState("Federal");

  // Manual text ingestion
  const [manualOpen, setManualOpen] = useState(false);
  const [manualText, setManualText] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualCat, setManualCat] = useState("federal_statute");
  const [manualJur, setManualJur] = useState("Federal");
  const [manualProcessing, setManualProcessing] = useState(false);

  // Stats
  const [stats, setStats] = useState({});

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.CanonEntry.list("-created_date", 500);
    setEntries(data);
    if (data.length > 0 && !selected) setSelected(data[0]);
    calcStats(data);
    setLoading(false);
  };

  const calcStats = (data) => {
    const today = moment().format("YYYY-MM-DD");
    setStats({
      total: data.length,
      federal_statute: data.filter(e => e.category === "federal_statute").length,
      state_statute: data.filter(e => e.category === "state_statute").length,
      case_law: data.filter(e => e.category === "case_law").length,
      constitutional_law: data.filter(e => e.category === "constitutional_law").length,
      civil_rights: data.filter(e => e.category === "civil_rights").length,
      nc_doctrine: data.filter(e => e.category === "nc_doctrine").length,
      pending_review: data.filter(e => e.status === "pending_review").length,
      active: data.filter(e => e.status === "active").length,
      verified: data.filter(e => e.verified === true).length,
      imported_today: data.filter(e => e.imported_at && e.imported_at.startsWith(today)).length,
      indexed_today: data.filter(e => e.indexed_at && e.indexed_at.startsWith(today)).length,
    });
  };

  useEffect(() => { load(); }, []);

  // File upload → ingest pipeline
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);

    const progress = files.map(f => ({ name: f.name, status: "uploading", entry_title: null }));
    setUploadProgress(progress);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        // Update status
        setUploadProgress(prev => prev.map((p, idx) => idx === i ? { ...p, status: "uploading" } : p));

        // Upload file to storage
        const { file_url } = await base44.integrations.Core.UploadFile({ file });

        setUploadProgress(prev => prev.map((p, idx) => idx === i ? { ...p, status: "processing" } : p));

        // Call ingestion function
        const result = await base44.functions.invoke("ingestCanonDocument", {
          file_url,
          file_name: file.name,
          hint_category: hintCategory,
          hint_jurisdiction: hintJurisdiction,
        });

        if (result.data?.success) {
          setUploadProgress(prev => prev.map((p, idx) => idx === i ? { ...p, status: "complete", entry_title: result.data.title } : p));
        } else {
          setUploadProgress(prev => prev.map((p, idx) => idx === i ? { ...p, status: "error", error: result.data?.error } : p));
        }
      } catch (err) {
        setUploadProgress(prev => prev.map((p, idx) => idx === i ? { ...p, status: "error", error: err.message } : p));
      }
    }

    setUploading(false);
    load();
    e.target.value = "";
  };

  // Manual text → ingest pipeline
  const handleManualIngest = async () => {
    if (!manualText.trim() || !manualName.trim()) return;
    setManualProcessing(true);

    // Upload text as a .txt file
    const blob = new Blob([manualText], { type: "text/plain" });
    const file = new File([blob], manualName + ".txt", { type: "text/plain" });
    const { file_url } = await base44.integrations.Core.UploadFile({ file });

    const result = await base44.functions.invoke("ingestCanonDocument", {
      file_url,
      file_name: manualName,
      hint_category: manualCat,
      hint_jurisdiction: manualJur,
    });

    setManualProcessing(false);
    if (result.data?.success) {
      setManualOpen(false);
      setManualText("");
      setManualName("");
      load();
    }
  };

  // Verify and activate an entry
  const verifyEntry = async (entry) => {
    const updated = await base44.entities.CanonEntry.update(entry.id, {
      verified: true,
      status: "active",
    });
    setSelected(updated);
    load();
  };

  // Delete
  const deleteEntry = async (entry) => {
    await base44.entities.CanonEntry.delete(entry.id);
    setSelected(null);
    load();
  };

  const filtered = entries.filter(e => {
    if (catFilter !== "all" && e.category !== catFilter) return false;
    if (statusFilter !== "all" && e.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        (e.title || "").toLowerCase().includes(q) ||
        (e.citation || "").toLowerCase().includes(q) ||
        (e.search_index || "").includes(q) ||
        (e.keywords || []).some(k => k.toLowerCase().includes(q))
      );
    }
    return true;
  });

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">NCOS · Canon Population Engine</p>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-violet-500" />Canon Ingestion Pipeline
          </h1>
          <p className="text-sm text-muted-foreground">
            Upload legal documents → AI extracts structured Canon Entries → All AI services query dynamically
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setManualOpen(true)}>
            <FileText className="w-4 h-4 mr-1.5" />Paste Text
          </Button>
          <label>
            <Button size="sm" asChild>
              <span className="cursor-pointer">
                <Upload className="w-4 h-4 mr-1.5" />Upload Document
              </span>
            </Button>
            <input type="file" className="hidden" multiple accept=".txt,.pdf,.doc,.docx,.html,.htm,.csv,.json" onChange={handleFileUpload} />
          </label>
        </div>
      </div>

      {/* Ingestion settings */}
      <Card className="p-4 border border-violet-200 bg-violet-50/50 mb-5">
        <div className="flex items-center gap-4 flex-wrap">
          <p className="text-xs font-semibold text-violet-800 flex-shrink-0">Upload Hints:</p>
          <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground">Category</p>
            <Select value={hintCategory} onValueChange={setHintCategory}>
              <SelectTrigger className="h-7 w-44 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground">Jurisdiction</p>
            <Input value={hintJurisdiction} onChange={e => setHintJurisdiction(e.target.value)} className="h-7 w-32 text-xs" placeholder="Federal" />
          </div>
          <p className="text-xs text-muted-foreground ml-auto">AI will auto-detect; hints improve accuracy.</p>
        </div>
      </Card>

      {/* Upload progress */}
      {uploadProgress.length > 0 && (
        <Card className="p-4 mb-5 border border-border/60">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold">Ingestion Progress</p>
            {!uploading && (
              <Button size="sm" variant="ghost" onClick={() => setUploadProgress([])}>Clear</Button>
            )}
          </div>
          <div className="space-y-2">
            {uploadProgress.map((p, i) => (
              <div key={i} className="flex items-center gap-3 text-xs">
                {p.status === "uploading" && <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500 flex-shrink-0" />}
                {p.status === "processing" && <Sparkles className="w-3.5 h-3.5 animate-pulse text-violet-500 flex-shrink-0" />}
                {p.status === "complete" && <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />}
                {p.status === "error" && <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />}
                <span className="flex-1 truncate font-medium">{p.name}</span>
                <span className="text-muted-foreground">
                  {p.status === "uploading" && "Uploading..."}
                  {p.status === "processing" && "AI extracting..."}
                  {p.status === "complete" && (p.entry_title || "Done")}
                  {p.status === "error" && (p.error || "Error")}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Canon Gaps */}
      <Card className="p-5 border border-amber-200 mb-5">
        <CanonGapsPanel />
      </Card>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {[
          { label: "Total Entries",   value: stats.total || 0,          color: "text-foreground" },
          { label: "Federal Statute", value: stats.federal_statute || 0, color: "text-blue-600" },
          { label: "Case Law",        value: stats.case_law || 0,        color: "text-violet-600" },
          { label: "Civil Rights",    value: stats.civil_rights || 0,    color: "text-rose-600" },
          { label: "Pending Review",  value: stats.pending_review || 0,  color: stats.pending_review > 0 ? "text-amber-600" : "text-muted-foreground" },
          { label: "Verified Active", value: stats.verified || 0,        color: "text-emerald-600" },
        ].map(s => (
          <Card key={s.label} className="p-3 border border-border/60 text-center">
            <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search title, citation, keywords..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
        </div>
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="w-44 h-9 text-sm"><SelectValue placeholder="All categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 h-9 text-sm"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {["draft","pending_review","active","superseded","archived"].map(s => (
              <SelectItem key={s} value={s}>{s.replace(/_/g," ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" variant="ghost" onClick={load}><RefreshCw className="w-4 h-4" /></Button>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <BookOpen className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
          <p className="text-muted-foreground text-sm mb-4">
            {entries.length === 0
              ? "No Canon Entries yet. Upload a legal document to begin ingestion."
              : "No entries match your filters."
            }
          </p>
          {entries.length === 0 && (
            <label>
              <Button size="sm" asChild><span className="cursor-pointer"><Upload className="w-4 h-4 mr-1.5" />Upload First Document</span></Button>
              <input type="file" className="hidden" multiple accept=".txt,.pdf,.doc,.docx,.html,.htm" onChange={handleFileUpload} />
            </label>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Entry list */}
          <div className="space-y-1.5 max-h-[calc(100vh-20rem)] overflow-y-auto pr-1">
            {filtered.map(entry => (
              <button
                key={entry.id}
                onClick={() => setSelected(entry)}
                className={`w-full text-left px-3 py-2.5 rounded-lg transition-all border ${selected?.id === entry.id ? "bg-primary/10 border-primary/30" : "border-transparent hover:bg-muted"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium truncate">{entry.title}</p>
                  {entry.verified && <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />}
                </div>
                {entry.citation && <p className="text-[10px] text-muted-foreground mt-0.5">{entry.citation}</p>}
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  <Badge className={`text-[9px] ${STATUS_COLORS[entry.status] || ""}`}>{entry.status?.replace(/_/g," ")}</Badge>
                  {entry.authority_level && (
                    <Badge variant="outline" className="text-[9px]">{AUTHORITY_LABELS[entry.authority_level] || entry.authority_level}</Badge>
                  )}
                  {entry.imported_at && moment(entry.imported_at).isSame(moment(), "day") && (
                    <Badge variant="outline" className="text-[9px] text-blue-600 border-blue-200">Today</Badge>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Detail panel */}
          {selected && (
            <div className="lg:col-span-2">
              <Card className="p-5 border border-border/60">
                <div className="flex items-start justify-between mb-3 flex-wrap gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge className={`text-[10px] ${STATUS_COLORS[selected.status] || ""}`}>{selected.status?.replace(/_/g," ")}</Badge>
                      {selected.verified && <Badge className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle className="w-2.5 h-2.5 mr-1 inline" />Verified</Badge>}
                      {selected.authority_level && <Badge variant="outline" className="text-[10px]">{AUTHORITY_LABELS[selected.authority_level] || selected.authority_level}</Badge>}
                    </div>
                    <h2 className="text-base font-semibold">{selected.title}</h2>
                    {selected.citation && <p className="text-xs text-muted-foreground mt-0.5">{selected.citation}</p>}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {!selected.verified && (
                      <Button size="sm" variant="outline" onClick={() => verifyEntry(selected)}>
                        <CheckCircle className="w-3.5 h-3.5 mr-1.5" />Verify & Activate
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => deleteEntry(selected)} className="text-red-500 hover:text-red-600">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {selected.summary && (
                  <div className="bg-violet-50 border border-violet-100 rounded-lg p-3 text-sm text-violet-900 mb-4">
                    {selected.summary}
                  </div>
                )}

                <Tabs defaultValue="content">
                  <TabsList className="mb-4 flex-wrap h-auto">
                    <TabsTrigger value="content">Content</TabsTrigger>
                    <TabsTrigger value="references">References</TabsTrigger>
                    <TabsTrigger value="keywords">Keywords</TabsTrigger>
                    <TabsTrigger value="ai">AI Services</TabsTrigger>
                    <TabsTrigger value="meta">Metadata</TabsTrigger>
                  </TabsList>

                  <TabsContent value="content">
                    <div className="bg-muted p-4 rounded-lg text-sm whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
                      {selected.content || "No content extracted."}
                    </div>
                  </TabsContent>

                  <TabsContent value="references" className="space-y-3">
                    {[
                      { label: "Cross References",                items: selected.cross_references },
                      { label: "Related Doctrines",              items: selected.related_doctrines },
                      { label: "Constitutional Provisions",      items: selected.related_constitutional_provisions },
                      { label: "Related Statutes",               items: selected.related_statutes },
                      { label: "Related Case Law",               items: selected.related_case_law },
                    ].map(ref => (
                      (ref.items || []).length > 0 && (
                        <div key={ref.label}>
                          <p className="text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">{ref.label}</p>
                          <div className="flex flex-wrap gap-1">
                            {ref.items.map((item, i) => (
                              <Badge key={i} variant="outline" className="text-xs">{item}</Badge>
                            ))}
                          </div>
                        </div>
                      )
                    ))}
                    {!(selected.cross_references?.length || selected.related_doctrines?.length) && (
                      <p className="text-sm text-muted-foreground">No cross references extracted.</p>
                    )}
                  </TabsContent>

                  <TabsContent value="keywords">
                    {(selected.keywords || []).length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {selected.keywords.map((k, i) => (
                          <Badge key={i} className="text-xs bg-violet-50 text-violet-700 border border-violet-200">{k}</Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No keywords extracted.</p>
                    )}
                  </TabsContent>

                  <TabsContent value="ai">
                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">AI Services That Query This Entry</p>
                      {(selected.ai_services || []).length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {selected.ai_services.map((s, i) => (
                            <Badge key={i} className="text-xs bg-blue-50 text-blue-700 border border-blue-200">{s}</Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No AI services assigned yet.</p>
                      )}
                      {selected.ai_embedding && (
                        <div className="mt-3">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">AI Embedding Index</p>
                          <div className="bg-muted p-2 rounded text-[10px] font-mono text-muted-foreground overflow-auto max-h-20">
                            {selected.ai_embedding}
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="meta">
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div><p className="text-muted-foreground">Jurisdiction</p><p className="font-medium">{selected.jurisdiction || "—"}</p></div>
                      <div><p className="text-muted-foreground">Effective Date</p><p className="font-medium">{selected.effective_date || "—"}</p></div>
                      <div><p className="text-muted-foreground">Imported</p><p className="font-medium">{selected.imported_at ? moment(selected.imported_at).fromNow() : "—"}</p></div>
                      <div><p className="text-muted-foreground">Indexed</p><p className="font-medium">{selected.indexed_at ? moment(selected.indexed_at).fromNow() : "—"}</p></div>
                      <div><p className="text-muted-foreground">Version</p><p className="font-medium">{selected.version || "1.0"}</p></div>
                      <div><p className="text-muted-foreground">Superseded</p><p className="font-medium">{selected.superseded ? "Yes" : "No"}</p></div>
                    </div>
                  </TabsContent>
                </Tabs>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Manual text ingestion dialog */}
      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Paste Legal Text for Ingestion</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Document Name / Title</label>
              <Input value={manualName} onChange={e => setManualName(e.target.value)} placeholder="e.g. 42 USC 1983 Civil Action for Deprivation of Rights" className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Category Hint</label>
                <Select value={manualCat} onValueChange={setManualCat}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Jurisdiction Hint</label>
                <Input value={manualJur} onChange={e => setManualJur(e.target.value)} placeholder="Federal" className="mt-1" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Legal Text</label>
              <textarea
                value={manualText}
                onChange={e => setManualText(e.target.value)}
                rows={10}
                className="mt-1 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-mono"
                placeholder="Paste the full text of the statute, case, or doctrine here..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setManualOpen(false)}>Cancel</Button>
              <Button onClick={handleManualIngest} disabled={manualProcessing || !manualText.trim() || !manualName.trim()}>
                {manualProcessing ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Processing...</> : <><Sparkles className="w-4 h-4 mr-2" />Ingest & Extract</>}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}