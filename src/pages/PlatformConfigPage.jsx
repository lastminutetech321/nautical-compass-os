import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Settings, Plus, Save, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import moment from "moment";

const DEFAULTS = [
  { key: "platform.name", value: "Nautical Compass OS", category: "general", description: "Platform display name", editable_by: "founder" },
  { key: "platform.version", value: "0.1.0-alpha", category: "general", description: "Current platform version", editable_by: "admin" },
  { key: "canon.min_verified_entries", value: "25", category: "canon", description: "Minimum verified Canon entries required for production readiness", editable_by: "founder" },
  { key: "ai.default_model", value: "automatic", category: "ai", description: "Default LLM model for AI services", editable_by: "admin" },
  { key: "ai.canon_gap_behavior", value: "block_and_flag", category: "ai", description: "What to do when AI encounters a Canon gap: block_and_flag | warn | allow", editable_by: "founder" },
  { key: "security.require_approval_for_canon_changes", value: "true", category: "security", description: "Require founder approval for all Canon modifications", editable_by: "founder" },
  { key: "security.require_approval_for_payments", value: "true", category: "security", description: "Require founder approval for all payment actions", editable_by: "founder" },
  { key: "notifications.enable_critical_alerts", value: "true", category: "notifications", description: "Send critical platform alerts to notification center", editable_by: "admin" },
  { key: "revenue.target_mrr", value: "5000", category: "payments", description: "Target monthly recurring revenue ($)", editable_by: "founder" },
  { key: "agents.max_autonomous_actions_per_hour", value: "100", category: "ai", description: "Max autonomous actions an agent may take per hour without approval", editable_by: "founder" },
];

const categoryColor = {
  general: "bg-slate-100 text-slate-700", security: "bg-red-100 text-red-700",
  payments: "bg-emerald-100 text-emerald-700", ai: "bg-violet-100 text-violet-700",
  canon: "bg-amber-100 text-amber-700", notifications: "bg-blue-100 text-blue-700",
  enterprise: "bg-purple-100 text-purple-700", feature_flags: "bg-teal-100 text-teal-700",
};

export default function PlatformConfigPage() {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [editVal, setEditVal] = useState("");
  const [saving, setSaving] = useState(false);
  const [catFilter, setCatFilter] = useState("all");
  const [showSecrets, setShowSecrets] = useState({});

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.PlatformConfig.list("-created_date", 200).catch(() => []);
    setConfigs(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const seedDefaults = async () => {
    const existing = configs.map(c => c.key);
    const toCreate = DEFAULTS.filter(d => !existing.includes(d.key));
    await Promise.all(toCreate.map(d => base44.entities.PlatformConfig.create(d)));
    load();
  };

  const saveEdit = async (config) => {
    setSaving(true);
    await base44.entities.PlatformConfig.update(config.id, { value: editVal, last_changed_by: (await base44.auth.me().catch(()=>null))?.full_name || "Admin" });
    setSaving(false); setEditing(null); load();
  };

  const filtered = configs.filter(c => catFilter === "all" || c.category === catFilter);
  const categories = [...new Set(configs.map(c => c.category))];

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">NCOS · Enterprise Infrastructure</p>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Settings className="w-6 h-6 text-primary" />Platform Configuration
          </h1>
          <p className="text-sm text-muted-foreground">System settings, feature flags, security policies, and AI behavior</p>
        </div>
        {configs.length === 0 && (
          <Button size="sm" onClick={seedDefaults} className="gap-1.5 text-xs">Seed Default Config</Button>
        )}
      </div>

      <div className="flex gap-2 mb-5">
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="h-8 text-xs w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(c => <SelectItem key={c} value={c} className="capitalize text-xs">{c.replace(/_/g," ")}</SelectItem>)}
          </SelectContent>
        </Select>
        {configs.length > 0 && configs.length < DEFAULTS.length && (
          <Button size="sm" variant="outline" onClick={seedDefaults} className="text-xs">Fill Missing Defaults</Button>
        )}
      </div>

      {configs.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <Settings className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
          <p className="text-sm text-muted-foreground mb-3">No platform configuration set yet.</p>
          <Button size="sm" onClick={seedDefaults}>Seed Default Configuration</Button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(config => (
            <Card key={config.id} className="p-4 border border-border/60">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${categoryColor[config.category] || "bg-slate-100 text-slate-600"}`}>{config.category}</span>
                    {config.editable_by === "founder" && (
                      <Badge variant="outline" className="text-[9px] text-amber-600 border-amber-300 gap-0.5"><Lock className="w-2.5 h-2.5" />Founder Only</Badge>
                    )}
                    {config.is_secret && <Badge variant="outline" className="text-[9px] text-red-600 border-red-300">Secret</Badge>}
                  </div>
                  <code className="text-xs font-mono text-muted-foreground">{config.key}</code>
                  {config.description && <p className="text-xs text-muted-foreground mt-0.5">{config.description}</p>}
                </div>
                <div className="text-right flex-shrink-0">
                  {editing === config.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        className="border rounded px-2 py-1 text-sm w-40"
                        value={editVal}
                        onChange={e => setEditVal(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && saveEdit(config)}
                        autoFocus
                      />
                      <Button size="sm" className="h-7 text-xs" onClick={() => saveEdit(config)} disabled={saving}>
                        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                      </Button>
                      <button onClick={() => setEditing(null)} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-mono font-semibold ${config.is_secret && !showSecrets[config.id] ? "tracking-widest text-muted-foreground" : ""}`}>
                        {config.is_secret && !showSecrets[config.id] ? "••••••••" : (config.value || "—")}
                      </span>
                      {config.is_secret && (
                        <button onClick={() => setShowSecrets(s=>({...s,[config.id]:!s[config.id]}))} className="text-muted-foreground hover:text-foreground">
                          {showSecrets[config.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      )}
                      <button onClick={() => { setEditing(config.id); setEditVal(config.value||""); }} className="text-xs text-primary hover:underline">Edit</button>
                    </div>
                  )}
                  {config.last_changed_by && <p className="text-[10px] text-muted-foreground mt-1">Changed by {config.last_changed_by}</p>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}