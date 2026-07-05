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
import { Checkbox } from "@/components/ui/checkbox";
import { Factory, Plus, Loader2, GitCompare, Layers, FileText, TrendingUp, Building2, ChevronRight, Star } from "lucide-react";
import moment from "moment";
import BlueprintDetail from "@/components/blueprint/BlueprintDetail";
import BlueprintComparison from "@/components/blueprint/BlueprintComparison";

export default function BlueprintFactory() {
  const [blueprints, setBlueprints] = useState([]);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showGenerate, setShowGenerate] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selected, setSelected] = useState(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareIds, setCompareIds] = useState([]);
  const [comparison, setComparison] = useState(null);
  const [form, setForm] = useState({ name: "", description: "", industry: "", company_type: "LLC", blueprint_type: "enterprise", is_template: false, parent_blueprint_id: "", tags: "" });

  const load = async () => {
    setLoading(true);
    try {
      const [bps, ovRes] = await Promise.all([
        base44.entities.EnterpriseBlueprint.list('-created_date', 200),
        base44.functions.invoke('enterpriseBlueprintFactory', { operation: 'overview', params: {} }).catch(() => ({ data: { overview: null } })),
      ]);
      setBlueprints(bps);
      setOverview(ovRes.data?.overview);
    } catch (e) {
      setBlueprints([]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Group blueprints by name
  const grouped = blueprints.reduce((acc, bp) => {
    if (!acc[bp.name]) acc[bp.name] = [];
    acc[bp.name].push(bp);
    return acc;
  }, {});

  const handleGenerate = async () => {
    if (!form.name) return;
    setGenerating(true);
    try {
      const operation = form.parent_blueprint_id ? 'inherit_blueprint' : 'generate_enterprise_blueprint';
      const payload = form.parent_blueprint_id
        ? { operation, params: { parent_blueprint_id: form.parent_blueprint_id, name: form.name, description: form.description, overrides: { industry: form.industry, company_type: form.company_type } } }
        : { operation, params: { name: form.name, description: form.description, industry: form.industry, company_type: form.company_type, blueprint_type: form.blueprint_type, is_template: form.is_template, tags: form.tags ? form.tags.split(',').map(t => t.trim()) : [] } };
      const res = await base44.functions.invoke('enterpriseBlueprintFactory', payload);
      setShowGenerate(false);
      setForm({ name: "", description: "", industry: "", company_type: "LLC", blueprint_type: "enterprise", is_template: false, parent_blueprint_id: "", tags: "" });
      await load();
      if (res.data?.blueprint) setSelected(res.data.blueprint);
    } catch (e) {
      console.error(e);
    }
    setGenerating(false);
  };

  const handleCompare = async () => {
    if (compareIds.length !== 2) return;
    setGenerating(true);
    try {
      const res = await base44.functions.invoke('enterpriseBlueprintFactory', {
        operation: 'compare_blueprints',
        params: { blueprint_id_1: compareIds[0], blueprint_id_2: compareIds[1] }
      });
      const bp1 = blueprints.find(b => b.id === compareIds[0]);
      const bp2 = blueprints.find(b => b.id === compareIds[1]);
      setComparison({ data: res.data, bp1, bp2 });
      setCompareMode(false);
    } catch (e) { console.error(e); }
    setGenerating(false);
  };

  const toggleCompare = (id) => {
    setCompareIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  };

  // ── DETAIL VIEW ──
  if (selected) {
    const versions = grouped[selected.name] || [selected];
    return (
      <div className="space-y-6 max-w-6xl mx-auto">
        <BlueprintDetail
          blueprint={selected}
          allVersions={versions}
          onBack={() => setSelected(null)}
          onCompare={() => { setCompareMode(true); setCompareIds([selected.id]); setSelected(null); }}
        />
      </div>
    );
  }

  // ── COMPARISON VIEW ──
  if (comparison) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto">
        <BlueprintComparison
          comparison={comparison.data?.comparison}
          bp1={comparison.bp1}
          bp2={comparison.bp2}
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
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">NCOS · Blueprint Factory</p>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Factory className="w-6 h-6 text-primary" />Enterprise Blueprint Factory
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Design entire enterprises before writing code · Reusable, versioned, comparable, inheritable</p>
        </div>
        <div className="flex gap-2">
          {compareMode ? (
            <>
              <Button variant="outline" size="sm" onClick={() => { setCompareMode(false); setCompareIds([]); }}>Cancel</Button>
              <Button size="sm" onClick={handleCompare} disabled={compareIds.length !== 2 || generating}>
                {generating ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <GitCompare className="w-4 h-4 mr-1" />}
                Compare ({compareIds.length}/2)
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => { setCompareMode(true); setCompareIds([]); }} disabled={blueprints.length < 2}>
                <GitCompare className="w-4 h-4 mr-1" />Compare
              </Button>
              <Button size="sm" onClick={() => setShowGenerate(true)}>
                <Plus className="w-4 h-4 mr-1" />Generate Blueprint
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <Card className="p-3 border border-border/60"><Building2 className="w-4 h-4 text-primary mb-1" /><p className="text-xl font-bold">{overview.total_blueprints}</p><p className="text-[10px] text-muted-foreground">Total Blueprints</p></Card>
          <Card className="p-3 border border-border/60"><Layers className="w-4 h-4 text-violet-600 mb-1" /><p className="text-xl font-bold">{overview.unique_enterprises}</p><p className="text-[10px] text-muted-foreground">Unique Enterprises</p></Card>
          <Card className="p-3 border border-border/60"><Star className="w-4 h-4 text-amber-600 mb-1" /><p className="text-xl font-bold">{overview.total_templates}</p><p className="text-[10px] text-muted-foreground">Templates</p></Card>
          <Card className="p-3 border border-border/60"><TrendingUp className="w-4 h-4 text-emerald-600 mb-1" /><p className="text-xl font-bold">{overview.total_inherited}</p><p className="text-[10px] text-muted-foreground">Inherited</p></Card>
          <Card className="p-3 border border-border/60"><FileText className="w-4 h-4 text-blue-600 mb-1" /><p className="text-xl font-bold">{overview.total_published}</p><p className="text-[10px] text-muted-foreground">Published</p></Card>
          <Card className="p-3 border border-border/60"><GitCompare className="w-4 h-4 text-cyan-600 mb-1" /><p className="text-xl font-bold">{overview.enterprises_with_multiple_versions}</p><p className="text-[10px] text-muted-foreground">Multi-Version</p></Card>
        </div>
      )}

      {/* Compare mode hint */}
      {compareMode && (
        <Card className="p-3 border border-amber-200 bg-amber-50 dark:bg-amber-950/10">
          <p className="text-xs text-amber-700">Select 2 blueprints to compare. Click a blueprint card to toggle selection. ({compareIds.length}/2 selected)</p>
        </Card>
      )}

      {/* Blueprint List */}
      {loading ? (
        <div className="flex items-center justify-center h-32"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : blueprints.length === 0 ? (
        <Card className="p-8 text-center border border-border/60">
          <Factory className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-1">No enterprise blueprints yet.</p>
          <p className="text-xs text-muted-foreground mb-4">Generate your first blueprint to design an entire enterprise before writing code.</p>
          <Button size="sm" onClick={() => setShowGenerate(true)}><Plus className="w-4 h-4 mr-1" />Generate Blueprint</Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([name, versions]) => (
            <Card key={name} className="p-0 border border-border/60 overflow-hidden">
              <div className="px-4 py-3 border-b border-border/40 bg-muted/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary" />
                  <p className="text-sm font-semibold">{name}</p>
                  <Badge variant="outline" className="text-[9px]">{versions.length} version{versions.length > 1 ? "s" : ""}</Badge>
                </div>
                {versions[0]?.industry && <span className="text-[10px] text-muted-foreground">{versions[0].industry}</span>}
              </div>
              <div className="divide-y divide-border/30">
                {versions.map(bp => {
                  const isSelected = compareIds.includes(bp.id);
                  return (
                    <div
                      key={bp.id}
                      className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-colors ${compareMode ? (isSelected ? "bg-primary/10" : "hover:bg-muted/30") : "hover:bg-muted/30"}`}
                      onClick={() => compareMode ? toggleCompare(bp.id) : setSelected(bp)}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {compareMode && (
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? "bg-primary border-primary" : "border-border"}`}>
                            {isSelected && <ChevronRight className="w-3 h-3 text-primary-foreground" />}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">v{bp.version}</p>
                            {bp.is_template && <Badge className="text-[8px] bg-violet-100 text-violet-700">Template</Badge>}
                            {bp.is_published && <Badge className="text-[8px] bg-emerald-100 text-emerald-700">Published</Badge>}
                            {bp.parent_blueprint_name && <Badge className="text-[8px] bg-blue-100 text-blue-700">Inherited</Badge>}
                          </div>
                          {bp.executive_summary && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{bp.executive_summary}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[10px] text-muted-foreground">{moment(bp.created_date).format("MMM D, YYYY")}</span>
                        {!compareMode && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Generate Dialog */}
      <Dialog open={showGenerate} onOpenChange={setShowGenerate}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Factory className="w-5 h-5 text-primary" />Generate Enterprise Blueprint</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Enterprise Name *</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Axiom, NC Legal Services" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Describe the enterprise you want to design..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Industry</Label>
                <Input value={form.industry} onChange={e => setForm({ ...form, industry: e.target.value })} placeholder="e.g. Legal Services, Healthcare" />
              </div>
              <div>
                <Label>Company Type</Label>
                <Select value={form.company_type} onValueChange={v => setForm({ ...form, company_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LLC">LLC</SelectItem>
                    <SelectItem value="C-Corp">C-Corporation</SelectItem>
                    <SelectItem value="S-Corp">S-Corporation</SelectItem>
                    <SelectItem value="Nonprofit">Nonprofit</SelectItem>
                    <SelectItem value="Partnership">Partnership</SelectItem>
                    <SelectItem value="Sole Proprietorship">Sole Proprietorship</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Inherit from Existing Blueprint (optional)</Label>
              <Select value={form.parent_blueprint_id} onValueChange={v => setForm({ ...form, parent_blueprint_id: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Start from scratch" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Start from scratch</SelectItem>
                  {blueprints.map(bp => <SelectItem key={bp.id} value={bp.id}>{bp.name} v{bp.version}</SelectItem>)}
                </SelectContent>
              </Select>
              {form.parent_blueprint_id && <p className="text-[10px] text-blue-600 mt-1">Inheritance: The new blueprint will inherit proven patterns from the parent and customize them for this enterprise.</p>}
            </div>
            {!form.parent_blueprint_id && (
              <div className="flex items-center gap-2">
                <Checkbox id="template" checked={form.is_template} onCheckedChange={v => setForm({ ...form, is_template: !!v })} />
                <Label htmlFor="template" className="cursor-pointer text-sm">Save as reusable template</Label>
              </div>
            )}
            <div>
              <Label>Tags (comma-sep)</Label>
              <Input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="legal, enterprise, startup" />
            </div>
            <Card className="p-3 border border-primary/20 bg-primary/5">
              <p className="text-xs text-muted-foreground">The factory will generate all 20 enterprise components: Business Architecture, Organization Chart, Departments, Roles, Policies, Permissions, Workflows, Business Rules, Revenue Flows, Customer/Employee/AI Employee Journeys, Infrastructure Map, Security Architecture, Database Blueprint, API Blueprint, ER Diagram, Communication Map, Deployment Plan, and Growth Roadmap.</p>
            </Card>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenerate(false)}>Cancel</Button>
            <Button onClick={handleGenerate} disabled={!form.name || generating}>
              {generating ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Factory className="w-4 h-4 mr-1" />}
              {generating ? "Generating..." : "Generate Blueprint"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Compare loading overlay */}
      {generating && !showGenerate && (
        <div className="fixed inset-0 flex items-center justify-center bg-background/80 z-50">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">{compareMode ? "Comparing blueprints..." : "Generating enterprise blueprint..."}</p>
            <p className="text-xs text-muted-foreground mt-1">Analyzing all 20 components</p>
          </div>
        </div>
      )}
    </div>
  );
}