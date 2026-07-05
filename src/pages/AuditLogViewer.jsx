import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Shield, Search, Filter, Eye, Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import moment from "moment";

const riskColor = {
  low: "text-slate-600 border-slate-300",
  medium: "text-amber-600 border-amber-300",
  high: "text-orange-600 border-orange-300",
  critical: "text-red-600 border-red-300",
};
const categoryColor = {
  create: "bg-emerald-50 text-emerald-700",
  update: "bg-blue-50 text-blue-700",
  delete: "bg-red-50 text-red-700",
  approve: "bg-violet-50 text-violet-700",
  reject: "bg-orange-50 text-orange-700",
  login: "bg-slate-50 text-slate-700",
  deploy: "bg-amber-50 text-amber-700",
  canon_change: "bg-amber-50 text-amber-800",
  payment: "bg-emerald-50 text-emerald-800",
  agent_action: "bg-violet-50 text-violet-800",
};

export default function AuditLogViewer() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [catFilter, setCatFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.AuditLog.list("-created_date", 500).catch(() => []);
    setLogs(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const logAction = async (action, category, entity_type = "", entity_name = "", risk = "low") => {
    const user = await base44.auth.me().catch(() => null);
    await base44.entities.AuditLog.create({
      action, action_category: category, entity_type, entity_name,
      actor_id: user?.id, actor_name: user?.full_name || user?.email,
      actor_role: user?.role, risk_level: risk,
    });
    load();
  };

  const seedSampleLogs = async () => {
    const user = await base44.auth.me().catch(() => null);
    const samples = [
      { action: "Ran Self-Diagnosis scan", action_category: "create", entity_type: "DiagnosticIssue", entity_name: "Platform Scan", actor_name: user?.full_name || "System", risk_level: "low" },
      { action: "Approved ImprovementItem: Populate NC Canon", action_category: "approve", entity_type: "ImprovementItem", entity_name: "Populate NC Canon", actor_name: user?.full_name || "Founder", risk_level: "medium" },
      { action: "Updated BuildRegistry: JurisEngine", action_category: "update", entity_type: "BuildRegistry", entity_name: "JurisEngine", actor_name: user?.full_name || "Founder", risk_level: "low" },
      { action: "Created Canon Entry: 42 U.S.C. § 1983", action_category: "create", entity_type: "CanonEntry", entity_name: "42 U.S.C. § 1983", actor_name: user?.full_name || "Founder", risk_level: "medium" },
      { action: "Generated Executive Briefing 2.0", action_category: "create", entity_type: "DailyBriefing", entity_name: "Executive Briefing", actor_name: "NCOS Intelligence", risk_level: "low" },
    ];
    await Promise.all(samples.map(s => base44.entities.AuditLog.create(s)));
    load();
  };

  const filtered = logs.filter(l => {
    if (catFilter !== "all" && l.action_category !== catFilter) return false;
    if (riskFilter !== "all" && l.risk_level !== riskFilter) return false;
    if (search && !l.action?.toLowerCase().includes(search.toLowerCase()) && !l.entity_name?.toLowerCase().includes(search.toLowerCase()) && !l.actor_name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const critCount = logs.filter(l => l.risk_level === "critical" || l.risk_level === "high").length;

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">NCOS · Enterprise Infrastructure</p>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />Audit Log
          </h1>
          <p className="text-sm text-muted-foreground">Immutable record of all platform actions, approvals, and changes</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={load} className="gap-1.5 text-xs">
            <RefreshCw className="w-3.5 h-3.5" />Refresh
          </Button>
          {logs.length === 0 && (
            <Button size="sm" variant="outline" onClick={seedSampleLogs} className="text-xs">Seed Sample Logs</Button>
          )}
        </div>
      </div>

      {critCount > 0 && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
          ⚠ {critCount} high-risk actions in log. Review recommended.
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { label: "Total Actions", value: logs.length },
          { label: "High Risk", value: logs.filter(l=>l.risk_level==="critical"||l.risk_level==="high").length },
          { label: "Canon Changes", value: logs.filter(l=>l.action_category==="canon_change").length },
          { label: "Approvals", value: logs.filter(l=>l.action_category==="approve"||l.action_category==="reject").length },
        ].map(k => (
          <Card key={k.label} className="p-3 border border-border/60">
            <p className="text-xs text-muted-foreground mb-1">{k.label}</p>
            <p className="text-2xl font-bold">{k.value}</p>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search actions, entities, actors..." className="w-full pl-8 pr-3 py-1.5 text-xs border rounded-md bg-background" />
        </div>
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="h-8 text-xs w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {["create","update","delete","approve","reject","deploy","canon_change","payment","agent_action"].map(c => (
              <SelectItem key={c} value={c} className="text-xs capitalize">{c.replace(/_/g," ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={riskFilter} onValueChange={setRiskFilter}>
          <SelectTrigger className="h-8 text-xs w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Risk</SelectItem>
            {["low","medium","high","critical"].map(r => <SelectItem key={r} value={r} className="text-xs capitalize">{r}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Log list */}
        <div className="lg:col-span-2 space-y-1.5 max-h-[calc(100vh-20rem)] overflow-y-auto pr-1">
          {filtered.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-border rounded-xl">
              <Shield className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-30" />
              <p className="text-sm text-muted-foreground">No audit logs yet. Actions taken in NCOS are recorded here.</p>
            </div>
          ) : filtered.map(l => (
            <button key={l.id} onClick={() => setSelected(l)}
              className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all ${selected?.id === l.id ? "bg-primary/10 border-primary/30" : "border-border/40 hover:bg-muted"}`}>
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${categoryColor[l.action_category] || "bg-slate-50 text-slate-700"}`}>{l.action_category}</span>
                    {l.risk_level && l.risk_level !== "low" && (
                      <Badge variant="outline" className={`text-[9px] ${riskColor[l.risk_level]}`}>{l.risk_level}</Badge>
                    )}
                  </div>
                  <p className="text-xs font-medium line-clamp-1">{l.action}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-muted-foreground">{l.actor_name || "System"}</span>
                    <span className="text-[10px] text-muted-foreground">·</span>
                    <span className="text-[10px] text-muted-foreground">{moment(l.created_date).fromNow()}</span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Detail panel */}
        <div className="lg:col-span-1">
          {selected ? (
            <Card className="p-4 border border-border/60 sticky top-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-muted-foreground uppercase">Log Detail</p>
                <Badge variant="outline" className={`text-[9px] ${riskColor[selected.risk_level] || ""}`}>{selected.risk_level || "low"} risk</Badge>
              </div>
              <p className="text-sm font-semibold mb-3 leading-tight">{selected.action}</p>
              <dl className="space-y-2 text-xs">
                {[
                  ["Category", selected.action_category?.replace(/_/g," ")],
                  ["Actor", selected.actor_name],
                  ["Role", selected.actor_role],
                  ["Entity Type", selected.entity_type],
                  ["Entity", selected.entity_name],
                  ["Time", moment(selected.created_date).format("MMM D, YYYY h:mm A")],
                ].filter(([,v]) => v).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="font-medium text-right truncate max-w-[60%]">{v}</dd>
                  </div>
                ))}
              </dl>
              {selected.details && (
                <div className="mt-3 pt-3 border-t border-border/40">
                  <p className="text-[10px] text-muted-foreground mb-1 uppercase font-semibold">Details</p>
                  <pre className="text-[10px] bg-muted rounded p-2 overflow-auto max-h-24">{JSON.stringify(selected.details, null, 2)}</pre>
                </div>
              )}
            </Card>
          ) : (
            <div className="text-center py-10 border border-dashed border-border rounded-xl">
              <Eye className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-30" />
              <p className="text-xs text-muted-foreground">Select a log entry to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}