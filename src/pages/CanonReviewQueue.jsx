import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  CheckCircle, XCircle, Clock, BookOpen, AlertTriangle, Search,
  RefreshCw, ChevronRight, Shield, FileText, Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import moment from "moment";

const STATUS_COLORS = {
  draft: "bg-slate-100 text-slate-600 border-slate-200",
  pending_review: "bg-amber-100 text-amber-700 border-amber-200",
  active: "bg-emerald-100 text-emerald-700 border-emerald-200",
  superseded: "bg-orange-100 text-orange-700 border-orange-200",
  archived: "bg-slate-100 text-slate-500 border-slate-200",
};

const VERIFICATION_FLOW = ["draft", "pending_review", "active", "superseded", "archived"];

export default function CanonReviewQueue() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending_review");
  const [saving, setSaving] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.CanonEntry.list("-created_date", 500).catch(() => []);
    setEntries(data);
    if (statusFilter !== "all") {
      const filtered = data.filter(e => e.status === statusFilter);
      if (filtered.length > 0 && !selected) setSelected(filtered[0]);
    }
    setLoading(false);
  };

  const verifyAndActivate = async (entry) => {
    setSaving(true);
    const updated = await base44.entities.CanonEntry.update(entry.id, {
      status: "active",
      verified: true,
      reviewer: user?.full_name || user?.email || "Reviewer",
      reviewed_at: new Date().toISOString(),
    });
    setSelected(updated);
    setSaving(false);
    load();
  };

  const rejectEntry = async (entry) => {
    setSaving(true);
    const updated = await base44.entities.CanonEntry.update(entry.id, {
      status: "archived",
      verified: false,
      gap_notes: rejectNote || "Rejected during review",
      reviewer: user?.full_name || user?.email || "Reviewer",
      reviewed_at: new Date().toISOString(),
    });
    setSelected(updated);
    setRejectNote("");
    setSaving(false);
    load();
  };

  const moveToPending = async (entry) => {
    setSaving(true);
    const updated = await base44.entities.CanonEntry.update(entry.id, { status: "pending_review" });
    setSelected(updated);
    setSaving(false);
    load();
  };

  const markSuperseded = async (entry) => {
    setSaving(true);
    const updated = await base44.entities.CanonEntry.update(entry.id, { status: "superseded", superseded: true });
    setSelected(updated);
    setSaving(false);
    load();
  };

  const filtered = entries.filter(e => {
    if (statusFilter !== "all" && e.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (e.title || "").toLowerCase().includes(q) || (e.citation || "").toLowerCase().includes(q);
    }
    return true;
  });

  const counts = {
    draft: entries.filter(e => e.status === "draft").length,
    pending_review: entries.filter(e => e.status === "pending_review").length,
    active: entries.filter(e => e.status === "active").length,
    superseded: entries.filter(e => e.status === "superseded").length,
    archived: entries.filter(e => e.status === "archived").length,
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">NCOS · NC Canon</p>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="w-6 h-6 text-amber-500" />Canon Review Queue
          </h1>
          <p className="text-sm text-muted-foreground">Verify, approve, or reject Canon entries before they serve AI services</p>
        </div>
        <Button size="sm" variant="outline" onClick={load}><RefreshCw className="w-4 h-4 mr-1.5" />Refresh</Button>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 mb-5 text-xs text-amber-800 flex items-start gap-2">
        <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
        <span><strong>Verification gate:</strong> Only entries with status "active" and verified=true are served to JurisEngine and other AI services. Review carefully — never verify a fabricated or inaccurate entry.</span>
      </div>

      {/* Status counts */}
      <div className="flex flex-wrap gap-2 mb-5">
        {[
          { key: "all", label: "All", count: entries.length },
          { key: "pending_review", label: "Pending Review", count: counts.pending_review },
          { key: "draft", label: "Draft", count: counts.draft },
          { key: "active", label: "Verified Active", count: counts.active },
          { key: "superseded", label: "Superseded", count: counts.superseded },
          { key: "archived", label: "Archived/Rejected", count: counts.archived },
        ].map(s => (
          <button key={s.key} onClick={() => setStatusFilter(s.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${statusFilter === s.key ? "bg-primary text-white border-primary" : "border-border/60 hover:bg-muted"}`}>
            {s.label} {s.count > 0 && <span className="ml-1 font-bold">{s.count}</span>}
          </button>
        ))}
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search title, citation..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-sm max-w-xs" />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <CheckCircle className="w-12 h-12 mx-auto mb-3 text-emerald-500 opacity-60" />
          <p className="text-sm text-muted-foreground">No entries in this status queue.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Queue list */}
          <div className="space-y-1.5 max-h-[calc(100vh-20rem)] overflow-y-auto pr-1">
            {filtered.map(entry => (
              <button key={entry.id} onClick={() => setSelected(entry)}
                className={`w-full text-left px-3 py-2.5 rounded-lg transition-all border ${selected?.id === entry.id ? "bg-primary/10 border-primary/30" : "border-transparent hover:bg-muted"}`}>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium line-clamp-1">{entry.title}</p>
                  {entry.verified && <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />}
                </div>
                {entry.citation && <p className="text-[10px] text-muted-foreground mt-0.5">{entry.citation}</p>}
                <div className="flex items-center gap-1.5 mt-1">
                  <Badge className={`text-[9px] ${STATUS_COLORS[entry.status] || ""}`}>{entry.status?.replace(/_/g," ")}</Badge>
                  {entry.imported_at && <span className="text-[9px] text-muted-foreground">{moment(entry.imported_at).fromNow()}</span>}
                </div>
              </button>
            ))}
          </div>

          {/* Detail + action panel */}
          {selected && (
            <div className="lg:col-span-2 space-y-4">
              <Card className="p-5 border border-border/60">
                <div className="flex items-start justify-between mb-3 gap-2 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge className={`text-[10px] ${STATUS_COLORS[selected.status] || ""}`}>{selected.status?.replace(/_/g," ")}</Badge>
                      {selected.verified && <Badge className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle className="w-2.5 h-2.5 mr-1 inline" />Verified</Badge>}
                    </div>
                    <h2 className="text-base font-semibold">{selected.title}</h2>
                    {selected.citation && <p className="text-xs text-muted-foreground">{selected.citation}</p>}
                  </div>
                </div>

                {selected.summary && (
                  <div className="bg-violet-50 border border-violet-100 rounded-lg p-3 text-sm text-violet-900 mb-4">{selected.summary}</div>
                )}

                <div className="bg-muted p-4 rounded-lg text-sm max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed mb-4">
                  {selected.content || "No content extracted."}
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs mb-4">
                  <div><p className="text-muted-foreground">Category</p><p className="font-medium capitalize">{selected.category?.replace(/_/g," ")}</p></div>
                  <div><p className="text-muted-foreground">Authority</p><p className="font-medium capitalize">{selected.authority_level?.replace(/_/g," ")}</p></div>
                  <div><p className="text-muted-foreground">Jurisdiction</p><p className="font-medium">{selected.jurisdiction || "—"}</p></div>
                  <div><p className="text-muted-foreground">Confidence</p><p className="font-medium">{selected.confidence || 0}%</p></div>
                </div>

                {/* Review actions */}
                {selected.status !== "active" && (
                  <div className="space-y-3 pt-3 border-t border-border/40">
                    <p className="text-xs font-semibold text-muted-foreground uppercase">Review Actions</p>

                    {selected.status === "draft" && (
                      <Button size="sm" variant="outline" onClick={() => moveToPending(selected)} disabled={saving} className="w-full">
                        <Clock className="w-3.5 h-3.5 mr-1.5" />Move to Pending Review
                      </Button>
                    )}

                    {(selected.status === "pending_review" || selected.status === "draft") && (
                      <Button size="sm" className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={() => verifyAndActivate(selected)} disabled={saving}>
                        <CheckCircle className="w-3.5 h-3.5 mr-1.5" />Verify & Activate
                      </Button>
                    )}

                    {selected.status === "active" && (
                      <Button size="sm" variant="outline" onClick={() => markSuperseded(selected)} disabled={saving} className="w-full">
                        Mark as Superseded
                      </Button>
                    )}

                    {selected.status !== "archived" && (
                      <div className="space-y-2">
                        <Textarea value={rejectNote} onChange={e => setRejectNote(e.target.value)} placeholder="Reason for rejection (optional)..." rows={2} className="text-xs resize-none" />
                        <Button size="sm" variant="outline" className="w-full text-red-600 border-red-200 hover:bg-red-50" onClick={() => rejectEntry(selected)} disabled={saving}>
                          <XCircle className="w-3.5 h-3.5 mr-1.5" />Reject & Archive
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {selected.status === "active" && (
                  <div className="pt-3 border-t border-border/40">
                    <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded p-2">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Verified by {selected.reviewer || "reviewer"} · {selected.reviewed_at ? moment(selected.reviewed_at).fromNow() : "recently"}</span>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}