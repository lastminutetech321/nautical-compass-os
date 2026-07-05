import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Search, Boxes, Download, Star, TrendingUp, Store, Upload, Sparkles, CheckCircle2, AlertTriangle, RefreshCw, Trash2, Package } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts";
import ModuleCard from "@/components/marketplace/ModuleCard";
import ModuleDetail from "@/components/marketplace/ModuleDetail";
import moment from "moment";

const CATEGORIES = ["all", "productivity", "crm", "hr", "legal", "finance", "culture", "workforce", "evidence", "canon", "ai", "infrastructure", "security", "analytics", "communication", "operations", "other"];

export default function EnterpriseMarketplace() {
  const [tab, setTab] = useState("catalog");
  const [modules, setModules] = useState([]);
  const [selectedModule, setSelectedModule] = useState(null);
  const [selectedReviews, setSelectedReviews] = useState([]);
  const [installations, setInstallations] = useState([]);
  const [enterprises, setEnterprises] = useState([]);
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedEnterprise, setSelectedEnterprise] = useState("");

  // Publish form
  const [pubName, setPubName] = useState("");
  const [pubDesc, setPubDesc] = useState("");
  const [pubCat, setPubCat] = useState("productivity");
  const [generating, setGenerating] = useState(false);
  const [generatedListing, setGeneratedListing] = useState(null);
  const [publishing, setPublishing] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [modRes, statsRes, entRes] = await Promise.all([
        base44.functions.invoke('enterpriseMarketplace', { operation: 'get_modules', params: { category: 'all' } }),
        base44.functions.invoke('enterpriseMarketplace', { operation: 'get_marketplace_stats', params: {} }).catch(() => ({ data: { stats: null } })),
        base44.functions.invoke('enterpriseMarketplace', { operation: 'get_enterprises', params: {} }).catch(() => ({ data: { enterprises: [] } })),
      ]);
      setModules(modRes.data?.modules || []);
      setStats(statsRes.data?.stats);
      setEnterprises(entRes.data?.enterprises || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const loadInstallations = async (entId) => {
    setSelectedEnterprise(entId);
    try {
      const res = await base44.functions.invoke('enterpriseMarketplace', { operation: 'get_installations', params: { enterprise_id: entId } });
      setInstallations(res.data?.installations || []);
    } catch (e) { setInstallations([]); }
  };

  const loadAnalytics = async () => {
    try {
      const res = await base44.functions.invoke('enterpriseMarketplace', { operation: 'get_usage_analytics', params: {} });
      setAnalytics(res.data);
    } catch (e) { setAnalytics(null); }
  };

  useEffect(() => { if (tab === 'analytics') loadAnalytics(); }, [tab]);

  const openModule = async (m) => {
    setSelectedModule(m);
    try {
      const res = await base44.functions.invoke('enterpriseMarketplace', { operation: 'get_module', params: { module_id: m.id } });
      setSelectedModule(res.data?.module);
      setSelectedReviews(res.data?.reviews || []);
    } catch (e) { console.error(e); }
  };

  const handleInstall = async (m, entId, entName, licenseType) => {
    const res = await base44.functions.invoke('enterpriseMarketplace', {
      operation: 'install_module',
      params: { module_id: m.id, enterprise_id: entId, enterprise_name: entName, license_type: licenseType }
    });
    if (res.data?.error) throw new Error(res.data.error);
    await load();
    return res.data;
  };

  const handleUninstall = async (instId) => {
    await base44.functions.invoke('enterpriseMarketplace', { operation: 'uninstall_module', params: { installation_id: instId } });
    if (selectedEnterprise) await loadInstallations(selectedEnterprise);
    await load();
  };

  const handleUpdate = async (instId) => {
    await base44.functions.invoke('enterpriseMarketplace', { operation: 'update_module', params: { installation_id: instId } });
    if (selectedEnterprise) await loadInstallations(selectedEnterprise);
  };

  const checkUpdates = async () => {
    if (!selectedEnterprise) return;
    const res = await base44.functions.invoke('enterpriseMarketplace', { operation: 'check_updates', params: { enterprise_id: selectedEnterprise } });
    if (selectedEnterprise) await loadInstallations(selectedEnterprise);
    return res.data?.updates || [];
  };

  const submitReview = async (moduleId, rating, text, pros, cons) => {
    await base44.functions.invoke('enterpriseMarketplace', {
      operation: 'submit_review',
      params: { module_id: moduleId, rating, review_text: text, pros, cons }
    });
    if (selectedModule) await openModule(selectedModule);
    await load();
  };

  const generateListing = async () => {
    if (!pubName) return;
    setGenerating(true);
    setGeneratedListing(null);
    try {
      const res = await base44.functions.invoke('enterpriseMarketplace', {
        operation: 'generate_listing',
        params: { module_name: pubName, description: pubDesc, category: pubCat }
      });
      setGeneratedListing(res.data?.listing);
    } catch (e) { console.error(e); }
    setGenerating(false);
  };

  const publishModule = async () => {
    const data = generatedListing || { name: pubName, description: pubDesc, category: pubCat, pricing_model: 'free' };
    setPublishing(true);
    try {
      await base44.functions.invoke('enterpriseMarketplace', { operation: 'create_module', params: data });
      setGeneratedListing(null); setPubName(''); setPubDesc('');
      await load();
      setTab('catalog');
    } catch (e) { console.error(e); }
    setPublishing(false);
  };

  const filteredModules = modules.filter(m => {
    if (categoryFilter !== 'all' && m.category !== categoryFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return m.name?.toLowerCase().includes(s) || m.description?.toLowerCase().includes(s) || (m.tags || []).some(t => t.toLowerCase().includes(s));
    }
    return true;
  });

  if (loading) return <div className="flex items-center justify-center h-32"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  // ── MODULE DETAIL VIEW ──
  if (selectedModule) {
    return <ModuleDetail module={selectedModule} reviews={selectedReviews} enterprises={enterprises} onBack={() => setSelectedModule(null)} onInstall={handleInstall} onSubmitReview={submitReview} />;
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">NCOS · Enterprise Marketplace</p>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Store className="w-6 h-6 text-primary" />Enterprise Marketplace</h1>
        <p className="text-muted-foreground text-sm mt-1">NCOS modules as installable products · Every module installable into any enterprise</p>
      </div>

      {/* Stats Bar */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <Card className="p-3 border border-primary/30 bg-primary/5"><Boxes className="w-4 h-4 text-primary mb-1" /><p className="text-lg font-bold">{stats.total_modules}</p><p className="text-[10px] text-muted-foreground">Modules</p></Card>
          <Card className="p-3 border border-border/60"><Download className="w-4 h-4 text-blue-600 mb-1" /><p className="text-lg font-bold">{stats.active_installs}</p><p className="text-[10px] text-muted-foreground">Active Installs</p></Card>
          <Card className="p-3 border border-border/60"><Star className="w-4 h-4 text-amber-500 mb-1" /><p className="text-lg font-bold">{stats.avg_rating?.toFixed(1) || '0.0'}</p><p className="text-[10px] text-muted-foreground">Avg Rating</p></Card>
          <Card className="p-3 border border-border/60"><Package className="w-4 h-4 text-violet-600 mb-1" /><p className="text-lg font-bold">{stats.total_reviews}</p><p className="text-[10px] text-muted-foreground">Reviews</p></Card>
          <Card className="p-3 border border-border/60"><TrendingUp className="w-4 h-4 text-emerald-600 mb-1" /><p className="text-lg font-bold">{stats.total_usage_events}</p><p className="text-[10px] text-muted-foreground">Usage Events</p></Card>
          <Card className="p-3 border border-border/60"><Sparkles className="w-4 h-4 text-amber-600 mb-1" /><p className="text-lg font-bold">{stats.featured_count}</p><p className="text-[10px] text-muted-foreground">Featured</p></Card>
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full justify-start">
          <TabsTrigger value="catalog" className="text-xs"><Store className="w-3.5 h-3.5 mr-1" />Catalog</TabsTrigger>
          <TabsTrigger value="installations" className="text-xs"><Download className="w-3.5 h-3.5 mr-1" />My Installations</TabsTrigger>
          <TabsTrigger value="analytics" className="text-xs"><TrendingUp className="w-3.5 h-3.5 mr-1" />Analytics</TabsTrigger>
          <TabsTrigger value="publish" className="text-xs"><Upload className="w-3.5 h-3.5 mr-1" />Publish Module</TabsTrigger>
        </TabsList>

        {/* ── CATALOG ── */}
        <TabsContent value="catalog" className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search modules..." className="pl-8 h-8 text-xs" />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => <SelectItem key={c} value={c} className="text-xs capitalize">{c === 'all' ? 'All Categories' : c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {filteredModules.length === 0 ? (
            <Card className="p-8 text-center border border-dashed border-border/40">
              <Boxes className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-1">No modules in the marketplace yet</p>
              <p className="text-xs text-muted-foreground mb-3">Publish NCOS modules as products using the Publish tab</p>
              <Button size="sm" onClick={() => setTab('publish')}><Upload className="w-3.5 h-3.5 mr-1" />Publish a Module</Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredModules.map(m => <ModuleCard key={m.id} module={m} onClick={openModule} />)}
            </div>
          )}
        </TabsContent>

        {/* ── MY INSTALLATIONS ── */}
        <TabsContent value="installations" className="space-y-4">
          <div className="flex items-center gap-2">
            <Select value={selectedEnterprise} onValueChange={loadInstallations}>
              <SelectTrigger className="w-[300px] h-8 text-xs"><SelectValue placeholder="Select an enterprise to view installations..." /></SelectTrigger>
              <SelectContent>
                {enterprises.map(e => <SelectItem key={e.id} value={e.id} className="text-xs">{e.name} ({e.type})</SelectItem>)}
              </SelectContent>
            </Select>
            {selectedEnterprise && <Button variant="outline" size="sm" className="text-xs h-8" onClick={checkUpdates}><RefreshCw className="w-3 h-3 mr-1" />Check for Updates</Button>}
          </div>

          {!selectedEnterprise ? (
            <Card className="p-8 text-center border border-dashed border-border/40"><Download className="w-8 h-8 text-muted-foreground mx-auto mb-2" /><p className="text-xs text-muted-foreground">Select an enterprise to view and manage installed modules</p></Card>
          ) : installations.length === 0 ? (
            <Card className="p-8 text-center border border-dashed border-border/40"><Package className="w-8 h-8 text-muted-foreground mx-auto mb-2" /><p className="text-xs text-muted-foreground">No modules installed in this enterprise yet</p><Button size="sm" className="mt-2" onClick={() => setTab('catalog')}><Store className="w-3.5 h-3.5 mr-1" />Browse Catalog</Button></Card>
          ) : (
            <div className="space-y-2">
              {installations.map(inst => (
                <Card key={inst.id} className="p-3 border border-border/60">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0"><Boxes className="w-4 h-4 text-primary" /></div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{inst.module_name}</p>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span>v{inst.installed_version}</span>
                          <Badge variant="outline" className={`text-[8px] ${inst.status === 'active' ? 'text-emerald-600' : inst.status === 'trial' ? 'text-amber-600' : 'text-muted-foreground'}`}>{inst.license_type}</Badge>
                          <span>Installed {moment(inst.install_date).format('MMM D, YYYY')}</span>
                          {inst.trial_end_date && <span className="text-amber-600">Trial ends {moment(inst.trial_end_date).format('MMM D')}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {inst.update_available && <Badge className="text-[8px] bg-orange-100 text-orange-700 border-0"><AlertTriangle className="w-2 h-2 mr-0.5" />v{inst.available_version}</Badge>}
                      {inst.update_available && <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleUpdate(inst.id)}><RefreshCw className="w-3 h-3 mr-1" />Update</Button>}
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-red-600" onClick={() => handleUninstall(inst.id)}><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── ANALYTICS ── */}
        <TabsContent value="analytics" className="space-y-4">
          {!analytics ? (
            <div className="flex items-center justify-center h-32"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : analytics.total_events === 0 ? (
            <Card className="p-8 text-center border border-dashed border-border/40"><TrendingUp className="w-8 h-8 text-muted-foreground mx-auto mb-2" /><p className="text-xs text-muted-foreground">No usage events recorded yet</p></Card>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card className="p-3 border border-border/60"><p className="text-lg font-bold">{analytics.total_events}</p><p className="text-[10px] text-muted-foreground">Total Events</p></Card>
                <Card className="p-3 border border-border/60"><p className="text-lg font-bold">{analytics.top_modules?.length || 0}</p><p className="text-[10px] text-muted-foreground">Active Modules</p></Card>
                <Card className="p-3 border border-border/60"><p className="text-lg font-bold">{Object.keys(analytics.by_enterprise || {}).length}</p><p className="text-[10px] text-muted-foreground">Enterprises</p></Card>
                <Card className="p-3 border border-border/60"><p className="text-lg font-bold">{analytics.by_event_type?.install || 0}</p><p className="text-[10px] text-muted-foreground">Installs</p></Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="p-4 border border-border/60">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Top Modules by Usage</p>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={analytics.top_modules?.slice(0, 8) || []}>
                      <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-30} textAnchor="end" height={60} interval={0} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip contentStyle={{ fontSize: 11 }} />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>

                <Card className="p-4 border border-border/60">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Usage Trend (Last 30 Days)</p>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={analytics.trend || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip contentStyle={{ fontSize: 11 }} />
                      <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </Card>
              </div>

              <Card className="p-4 border border-border/60">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Events by Type</p>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(analytics.by_event_type || {}).map(([type, count]) => (
                    <Badge key={type} variant="outline" className="text-xs capitalize">{type.replace(/_/g, ' ')}: {count}</Badge>
                  ))}
                </div>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ── PUBLISH ── */}
        <TabsContent value="publish" className="space-y-4">
          <Card className="p-4 border border-primary/30 bg-primary/5">
            <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-3 flex items-center gap-1"><Sparkles className="w-3.5 h-3.5" />AI-Powered Module Listing Generator</p>
            <p className="text-xs text-muted-foreground mb-3">Enter an NCOS module name and brief description. AI will generate a complete marketplace listing with pricing, features, dependencies, and documentation.</p>
            <div className="space-y-2">
              <Input value={pubName} onChange={e => setPubName(e.target.value)} placeholder="Module name (e.g., Evidence Vault, Canon Engine, Workforce Rail)" className="h-8 text-xs" />
              <Textarea value={pubDesc} onChange={e => setPubDesc(e.target.value)} placeholder="Brief description of what the module does..." className="text-xs" rows={2} />
              <Select value={pubCat} onValueChange={setPubCat}>
                <SelectTrigger className="w-[200px] h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.slice(1).map(c => <SelectItem key={c} value={c} className="text-xs capitalize">{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button onClick={generateListing} disabled={!pubName || generating} className="text-xs h-8">
                {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Sparkles className="w-3.5 h-3.5 mr-1" />}
                {generating ? 'Generating Listing...' : 'Generate Listing with AI'}
              </Button>
            </div>
          </Card>

          {generatedListing && (
            <Card className="p-4 border border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/10">
              <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-3 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" />Generated Listing — Review & Publish</p>
              <div className="space-y-2 text-xs">
                <div><span className="font-semibold">Name:</span> {generatedListing.name}</div>
                <div><span className="font-semibold">Description:</span> {generatedListing.description}</div>
                <div><span className="font-semibold">Pricing:</span> {generatedListing.pricing_model} — ${generatedListing.price_monthly}/mo, ${generatedListing.price_annual}/yr, ${generatedListing.price_enterprise} enterprise</div>
                <div><span className="font-semibold">Trial:</span> {generatedListing.trial_days} days</div>
                <div><span className="font-semibold">Type:</span> {generatedListing.module_type}</div>
                <div>
                  <span className="font-semibold">Features:</span>
                  <ul className="ml-4 mt-1 space-y-0.5">{(generatedListing.features || []).map((f, i) => <li key={i} className="text-[11px]">• {f}</li>)}</ul>
                </div>
                <div>
                  <span className="font-semibold">Dependencies:</span>
                  {(generatedListing.dependencies || []).length === 0 ? ' None' : (
                    <ul className="ml-4 mt-1 space-y-0.5">{generatedListing.dependencies.map((d, i) => <li key={i} className="text-[11px]">• {d.module_name} v{d.min_version} {d.required ? '(required)' : '(optional)'}</li>)}</ul>
                  )}
                </div>
                <div><span className="font-semibold">Tags:</span> {(generatedListing.tags || []).join(', ')}</div>
                <div className="mt-2"><span className="font-semibold">Documentation:</span><pre className="text-[10px] mt-1 p-2 bg-muted rounded max-h-40 overflow-y-auto whitespace-pre-wrap">{generatedListing.documentation}</pre></div>
              </div>
              <div className="flex gap-2 mt-3">
                <Button onClick={publishModule} disabled={publishing} className="text-xs h-8">
                  {publishing ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Upload className="w-3.5 h-3.5 mr-1" />}
                  {publishing ? 'Publishing...' : 'Publish to Marketplace'}
                </Button>
                <Button variant="outline" onClick={() => setGeneratedListing(null)} className="text-xs h-8">Discard</Button>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}