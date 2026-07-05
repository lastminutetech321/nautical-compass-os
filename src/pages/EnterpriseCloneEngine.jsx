import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Copy, Loader2, Building2, Bot, CheckCircle2, ChevronRight, Factory, ArrowRight, Target, Package } from "lucide-react";
import moment from "moment";
import CloneDetail from "@/components/clone/CloneDetail";
import CloneComparison from "@/components/clone/CloneComparison";

export default function EnterpriseCloneEngine() {
  const [clones, setClones] = useState([]);
  const [blueprints, setBlueprints] = useState([]);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showClone, setShowClone] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [selected, setSelected] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [form, setForm] = useState({
    source_blueprint_id: "",
    clone_name: "",
    industry: "",
    goals: "",
    company_size: "startup",
    revenue_model: "",
    required_modules: "",
  });

  const load = async () => {
    setLoading(true);
    try {
      const [cls, bps, ovRes] = await Promise.all([
        base44.entities.EnterpriseClone.list('-created_date', 200),
        base44.entities.EnterpriseBlueprint.list('-created_date', 200),
        base44.functions.invoke('enterpriseCloneEngine', { operation: 'overview', params: {} }).catch(() => ({ data: { overview: null } })),
      ]);
      setClones(cls);
      setBlueprints(bps);
      setOverview(ovRes.data?.overview);
    } catch (e) {
      setClones([]);
      setBlueprints([]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleClone = async () => {
    if (!form.source_blueprint_id || !form.clone_name) return;
    setCloning(true);
    try {
      const goals = form.goals.split('\n').map(g => g.trim()).filter(Boolean);
      const modules = form.required_modules.split(',').map(m => m.trim()).filter(Boolean);
      const res = await base44.functions.invoke('enterpriseCloneEngine', {
        operation: 'clone_enterprise',
        params: {
          source_blueprint_id: form.source_blueprint_id,
          clone_name: form.clone_name,
          industry: form.industry,
          goals,
          company_size: form.company_size,
          revenue_model: form.revenue_model,
          required_modules: modules,
        }
      });
      setShowClone(false);
      setForm({ source_blueprint_id: "", clone_name: "", industry: "", goals: "", company_size: "startup", revenue_model: "", required_modules: "" });
      await load();
      if (res.data?.clone) setSelected(res.data.clone);
    } catch (e) { console.error(e); }
    setCloning(false);
  };

  const handleCompare = async (clone) => {
    setCloning(true);
    try {
      const res = await base44.functions.invoke('enterpriseCloneEngine', {
        operation: 'compare_clone_to_parent',
        params: { clone_id: clone.id }
      });
      setComparison({
        data: res.data,
        clone: { id: clone.id, name: clone.clone_name, industry: clone.industry, company_size: clone.company_size },
        parent: res.data?.parent || { id: clone.source_blueprint_id, name: clone.source_blueprint_name, version: clone.source_blueprint_version },
      });
      setSelected(null);
    } catch (e) { console.error(e); }
    setCloning(false);
  };

  // ── DETAIL VIEW ──
  if (selected) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto">
        <CloneDetail clone={selected} onBack={() => setSelected(null)} onCompare={() => handleCompare(selected)} />
      </div>
    );
  }

  // ── COMPARISON VIEW ──
  if (comparison) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto">
        <CloneComparison
          comparison={comparison.data?.comparison}
          clone={comparison.clone}
          parent={comparison.parent}
          onBack={() => setComparison(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">NCOS · Clone Engine</p>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Copy className="w-6 h-6 text-primary" />Enterprise Clone Engine
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Generate a new company from an existing Blueprint · Inherit infrastructure, not client data</p>
        </div>
        <Button size="sm" onClick={() => setShowClone(true)} disabled={blueprints.length === 0}>
          <Copy className="w-4 h-4 mr-1" />Clone Enterprise
        </Button>
      </div>

      {/* Stats */}
      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card className="p-3 border border-border/60"><Copy className="w-4 h-4 text-primary mb-1" /><p className="text-xl font-bold">{overview.total_clones}</p><p className="text-[10px] text-muted-foreground">Total Clones</p></Card>
          <Card className="p-3 border border-border/60"><CheckCircle2 className="w-4 h-4 text-emerald-600 mb-1" /><p className="text-xl font-bold">{overview.provisioned}</p><p className="text-[10px] text-muted-foreground">Provisioned</p></Card>
          <Card className="p-3 border border-border/60"><Bot className="w-4 h-4 text-blue-600 mb-1" /><p className="text-xl font-bold">{overview.active || 0}</p><p className="text-[10px] text-muted-foreground">Active</p></Card>
          <Card className="p-3 border border-border/60"><Factory className="w-4 h-4 text-violet-600 mb-1" /><p className="text-xl font-bold">{overview.total_blueprints_available}</p><p className="text-[10px] text-muted-foreground">Blueprints Available</p></Card>
          <Card className="p-3 border border-border/60"><Package className="w-4 h-4 text-amber-600 mb-1" /><p className="text-xl font-bold">{overview.templates_available}</p><p className="text-[10px] text-muted-foreground">Templates</p></Card>
          <Card className="p-3 border border-border/60"><Target className="w-4 h-4 text-cyan-600 mb-1" /><p className="text-xl font-bold">{overview.archived || 0}</p><p className="text-[10px] text-muted-foreground">Archived</p></Card>
        </div>
      )}

      {/* Blueprint source hint */}
      {blueprints.length === 0 && (
        <Card className="p-6 text-center border border-amber-200 bg-amber-50/50 dark:bg-amber-950/10">
          <Factory className="w-8 h-8 text-amber-600 mx-auto mb-2" />
          <p className="text-sm text-amber-700 mb-1">No blueprints available to clone from.</p>
          <p className="text-xs text-muted-foreground">Generate enterprise blueprints first in the Blueprint Factory, then clone them here.</p>
        </Card>
      )}

      {/* Clone List */}
      {loading ? (
        <div className="flex items-center justify-center h-32"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : clones.length === 0 ? (
        <Card className="p-8 text-center border border-border/60">
          <Copy className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-1">No cloned enterprises yet.</p>
          <p className="text-xs text-muted-foreground mb-4">Clone an enterprise from a blueprint to instantiate a full company with organizations, users, AI workforce, projects, and more.</p>
          {blueprints.length > 0 && <Button size="sm" onClick={() => setShowClone(true)}><Copy className="w-4 h-4 mr-1" />Clone Enterprise</Button>}
        </Card>
      ) : (
        <div className="space-y-3">
          {clones.map(clone => (
            <Card key={clone.id} className="p-0 border border-border/60 overflow-hidden">
              <div className="px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => setSelected(clone)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold">{clone.clone_name}</p>
                        <Badge className="text-[9px] bg-emerald-100 text-emerald-700 capitalize">{clone.status}</Badge>
                        <Badge variant="outline" className="text-[9px]">{clone.industry}</Badge>
                        <Badge variant="outline" className="text-[9px] capitalize">{clone.company_size}</Badge>
                      </div>
                      {clone.executive_summary && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{clone.executive_summary}</p>}
                      <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
                        <span>From: {clone.source_blueprint_name} v{clone.source_blueprint_version}</span>
                        {clone.inherited_components?.length > 0 && <span>· {clone.inherited_components.length} inherited</span>}
                        {clone.customized_components?.length > 0 && <span>· {clone.customized_components.length} customized</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[10px] text-muted-foreground">{moment(clone.created_date).format("MMM D, YYYY")}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); handleCompare(clone); }}>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Clone Dialog */}
      <Dialog open={showClone} onOpenChange={setShowClone}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Copy className="w-5 h-5 text-primary" />Clone Enterprise from Blueprint</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Source Blueprint *</Label>
              <Select value={form.source_blueprint_id} onValueChange={v => setForm({ ...form, source_blueprint_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select a blueprint to clone from" /></SelectTrigger>
                <SelectContent>
                  {blueprints.map(bp => (
                    <SelectItem key={bp.id} value={bp.id}>
                      {bp.name} v{bp.version} {bp.is_template ? "(Template)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Clone Name *</Label>
              <Input value={form.clone_name} onChange={e => setForm({ ...form, clone_name: e.target.value })} placeholder="e.g. Axiom Legal, NC Client Portal" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Industry</Label>
                <Input value={form.industry} onChange={e => setForm({ ...form, industry: e.target.value })} placeholder="e.g. Legal Services" />
              </div>
              <div>
                <Label>Company Size</Label>
                <Select value={form.company_size} onValueChange={v => setForm({ ...form, company_size: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="startup">Startup (1-10)</SelectItem>
                    <SelectItem value="small">Small (11-50)</SelectItem>
                    <SelectItem value="medium">Medium (51-200)</SelectItem>
                    <SelectItem value="large">Large (201-1000)</SelectItem>
                    <SelectItem value="enterprise">Enterprise (1000+)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Revenue Model</Label>
              <Input value={form.revenue_model} onChange={e => setForm({ ...form, revenue_model: e.target.value })} placeholder="e.g. SaaS subscription, usage-based, marketplace fees" />
            </div>
            <div>
              <Label>Goals (one per line)</Label>
              <Textarea rows={3} value={form.goals} onChange={e => setForm({ ...form, goals: e.target.value })} placeholder="Become market leader in NC legal services&#10;Reach $1M ARR in 12 months&#10;Serve 10,000 users" />
            </div>
            <div>
              <Label>Required Modules (comma-separated)</Label>
              <Input value={form.required_modules} onChange={e => setForm({ ...form, required_modules: e.target.value })} placeholder="JurisEngine, Evidence Vault, CRM, Revenue OS, Workforce Rail" />
            </div>
            <Card className="p-3 border border-primary/20 bg-primary/5">
              <p className="text-xs text-muted-foreground">The Clone Engine will generate a full enterprise: Organizations, Users, Permissions, AI Workforce, Projects, Roadmap, Entities, APIs, Subscriptions, Dashboards, Mission Control, Executive Command, Knowledge Graph, Engineering Plan, and Development Plan. Reusable infrastructure is inherited from the blueprint — no client-specific data is copied.</p>
            </Card>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClone(false)}>Cancel</Button>
            <Button onClick={handleClone} disabled={!form.source_blueprint_id || !form.clone_name || cloning}>
              {cloning ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
              {cloning ? "Cloning..." : "Clone Enterprise"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {cloning && !showClone && (
        <div className="fixed inset-0 flex items-center justify-center bg-background/80 z-50">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">{comparison ? "Comparing clone to parent..." : "Cloning enterprise..."}</p>
            <p className="text-xs text-muted-foreground mt-1">Generating all 15 enterprise outputs</p>
          </div>
        </div>
      )}
    </div>
  );
}