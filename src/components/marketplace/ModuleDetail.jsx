import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Star, Download, Boxes, Shield, AlertTriangle, CheckCircle2, FileText, GitBranch, MessageSquare, Loader2, Package } from "lucide-react";
import ReactMarkdown from "react-markdown";
import moment from "moment";

export default function ModuleDetail({ module: m, reviews, onBack, onInstall, onSubmitReview, enterprises }) {
  const [installDialog, setInstallDialog] = useState(false);
  const [reviewDialog, setReviewDialog] = useState(false);
  const [selectedEnterprise, setSelectedEnterprise] = useState('');
  const [licenseType, setLicenseType] = useState('');
  const [installing, setInstalling] = useState(false);
  const [installResult, setInstallResult] = useState(null);

  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [reviewPros, setReviewPros] = useState('');
  const [reviewCons, setReviewCons] = useState('');

  const effectiveLicense = licenseType || (m.pricing_model === 'free' ? 'free' : m.trial_days > 0 ? 'trial' : 'subscription');

  const handleInstall = async () => {
    if (!selectedEnterprise) return;
    setInstalling(true);
    setInstallResult(null);
    try {
      const ent = enterprises.find(e => e.id === selectedEnterprise);
      await onInstall(m, selectedEnterprise, ent?.name, effectiveLicense);
      setInstallResult({ success: true });
      setTimeout(() => { setInstallDialog(false); setInstallResult(null); }, 1500);
    } catch (e) {
      setInstallResult({ error: e.message || 'Installation failed' });
    }
    setInstalling(false);
  };

  const handleSubmitReview = async () => {
    await onSubmitReview(m.id, reviewRating, reviewText, reviewPros.split('\n').filter(Boolean), reviewCons.split('\n').filter(Boolean));
    setReviewDialog(false);
    setReviewText(''); setReviewPros(''); setReviewCons(''); setReviewRating(5);
  };

  const formatPrice = () => {
    if (m.pricing_model === 'free') return 'Free';
    if (m.pricing_model === 'enterprise') return `$${m.price_enterprise || 0}+ /enterprise`;
    if (m.pricing_model === 'one_time') return `$${m.price_monthly || 0} one-time`;
    if (m.price_monthly > 0) return `$${m.price_monthly}/mo · $${m.price_annual}/yr`;
    return 'Contact Sales';
  };

  const ratingBreakdown = [5, 4, 3, 2, 1].map(stars => ({
    stars, count: reviews.filter(r => r.rating === stars).length,
  }));

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" className="text-xs" onClick={onBack}><ArrowLeft className="w-3.5 h-3.5 mr-1" />Back to Catalog</Button>

      {/* Header */}
      <Card className="p-5 border border-border/60">
        <div className="flex items-start gap-3 mb-3">
          <div className="p-3 rounded-xl bg-primary/10 flex-shrink-0"><Boxes className="w-6 h-6 text-primary" /></div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-xl font-bold">{m.name}</h1>
              <Badge variant="outline" className="text-[10px]">v{m.current_version}</Badge>
              {m.is_verified && <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-200"><Shield className="w-2.5 h-2.5 mr-0.5" />Verified</Badge>}
              {m.is_featured && <Badge className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 border-0">Featured</Badge>}
            </div>
            <p className="text-sm text-muted-foreground">{m.description}</p>
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-0.5"><Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />{m.avg_rating?.toFixed(1) || '0.0'} ({m.review_count || 0} reviews)</span>
              <span className="flex items-center gap-0.5"><Download className="w-3.5 h-3.5" />{m.active_installs || 0} active installs</span>
              <span>by {m.publisher || m.developer || 'NCOS'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 pt-3 border-t border-border/40">
          <div>
            <p className="text-lg font-bold text-primary">{formatPrice()}</p>
            {m.trial_days > 0 && m.pricing_model !== 'free' && <p className="text-[10px] text-muted-foreground">{m.trial_days}-day free trial available</p>}
          </div>
          <Button onClick={() => setInstallDialog(true)}><Download className="w-4 h-4 mr-1" />Install Module</Button>
        </div>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="overview" className="text-xs"><Package className="w-3.5 h-3.5 mr-1" />Overview</TabsTrigger>
          <TabsTrigger value="versions" className="text-xs"><GitBranch className="w-3.5 h-3.5 mr-1" />Versions</TabsTrigger>
          <TabsTrigger value="docs" className="text-xs"><FileText className="w-3.5 h-3.5 mr-1" />Documentation</TabsTrigger>
          <TabsTrigger value="reviews" className="text-xs"><MessageSquare className="w-3.5 h-3.5 mr-1" />Reviews ({reviews.length})</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-3">
          <Card className="p-4 border border-border/60">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Description</p>
            <div className="prose prose-sm dark:prose-invert max-w-none"><ReactMarkdown>{m.long_description || m.description}</ReactMarkdown></div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Card className="p-4 border border-border/60">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Features</p>
              <ul className="space-y-1">
                {(m.features || []).map((f, i) => <li key={i} className="text-xs flex gap-1.5"><CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0 mt-0.5" />{f}</li>)}
              </ul>
            </Card>
            <Card className="p-4 border border-border/60">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Dependencies</p>
              {(m.dependencies || []).length === 0 ? (
                <p className="text-xs text-muted-foreground">No dependencies — standalone module</p>
              ) : (
                <ul className="space-y-1">
                  {m.dependencies.map((d, i) => (
                    <li key={i} className="text-xs flex items-center gap-1.5">
                      <AlertTriangle className={`w-3 h-3 flex-shrink-0 ${d.required ? 'text-orange-500' : 'text-muted-foreground'}`} />
                      <span>{d.module_name} (v{d.min_version})</span>
                      {d.required && <Badge variant="outline" className="text-[8px] text-orange-600">Required</Badge>}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          {(m.tags || []).length > 0 && (
            <Card className="p-3 border border-border/60">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Tags</p>
              <div className="flex gap-1 flex-wrap">{m.tags.map((t, i) => <Badge key={i} variant="outline" className="text-[10px]">{t}</Badge>)}</div>
            </Card>
          )}
        </TabsContent>

        {/* Versions */}
        <TabsContent value="versions" className="space-y-3">
          <Card className="p-4 border border-border/60">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Version History</p>
            <div className="space-y-2">
              {(m.version_history || []).map((v, i) => (
                <div key={i} className="flex items-start gap-3 p-2 rounded border border-border/40">
                  <Badge variant="outline" className="text-[10px] flex-shrink-0">v{v.version}</Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold">{v.date ? moment(v.date).format('MMM D, YYYY') : 'Release'}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{v.changelog}</p>
                    {v.breaking_changes && v.breaking_changes.length > 0 && (
                      <div className="mt-1">
                        {v.breaking_changes.map((bc, j) => <p key={j} className="text-[10px] text-orange-600 flex items-center gap-1"><AlertTriangle className="w-2.5 h-2.5" />{bc}</p>)}
                      </div>
                    )}
                  </div>
                  {i === 0 && <Badge className="text-[8px] bg-emerald-100 text-emerald-700 border-0">Current</Badge>}
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* Documentation */}
        <TabsContent value="docs" className="space-y-3">
          {m.documentation && (
            <Card className="p-4 border border-border/60">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Documentation</p>
              <div className="prose prose-sm dark:prose-invert max-w-none"><ReactMarkdown>{m.documentation}</ReactMarkdown></div>
            </Card>
          )}
          {m.install_instructions && (
            <Card className="p-4 border border-border/60">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Installation Guide</p>
              <div className="prose prose-sm dark:prose-invert max-w-none"><ReactMarkdown>{m.install_instructions}</ReactMarkdown></div>
            </Card>
          )}
          {!m.documentation && !m.install_instructions && <Card className="p-4 text-center border border-dashed border-border/40"><p className="text-xs text-muted-foreground">No documentation available</p></Card>}
        </TabsContent>

        {/* Reviews */}
        <TabsContent value="reviews" className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Card className="p-4 border border-border/60 text-center">
              <p className="text-3xl font-bold text-amber-500">{m.avg_rating?.toFixed(1) || '0.0'}</p>
              <div className="flex justify-center gap-0.5 my-1">
                {[1, 2, 3, 4, 5].map(s => <Star key={s} className={`w-3.5 h-3.5 ${s <= Math.round(m.avg_rating || 0) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`} />)}
              </div>
              <p className="text-[10px] text-muted-foreground">{m.review_count || 0} reviews</p>
            </Card>
            <Card className="p-4 border border-border/60 md:col-span-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Rating Breakdown</p>
              <div className="space-y-1">
                {ratingBreakdown.map(r => (
                  <div key={r.stars} className="flex items-center gap-2 text-xs">
                    <span className="w-3 text-muted-foreground">{r.stars}</span>
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-amber-400" style={{ width: `${m.review_count > 0 ? (r.count / m.review_count) * 100 : 0}%` }} />
                    </div>
                    <span className="w-6 text-right text-muted-foreground">{r.count}</span>
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" className="w-full mt-3 text-xs" onClick={() => setReviewDialog(true)}><MessageSquare className="w-3 h-3 mr-1" />Write a Review</Button>
            </Card>
          </div>

          <div className="space-y-2">
            {reviews.length === 0 ? (
              <Card className="p-4 text-center border border-dashed border-border/40"><p className="text-xs text-muted-foreground">No reviews yet. Be the first to review!</p></Card>
            ) : reviews.map(r => (
              <Card key={r.id} className="p-3 border border-border/60">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div>
                    <p className="text-xs font-semibold">{r.reviewer_name || 'Anonymous'}</p>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map(s => <Star key={s} className={`w-2.5 h-2.5 ${s <= r.rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`} />)}
                    </div>
                  </div>
                  {r.is_verified_install && <Badge variant="outline" className="text-[8px] text-emerald-600">Verified</Badge>}
                </div>
                {r.review_text && <p className="text-xs text-muted-foreground mb-1">{r.review_text}</p>}
                {r.pros && r.pros.length > 0 && <p className="text-[10px] text-emerald-600">Pros: {r.pros.join(', ')}</p>}
                {r.cons && r.cons.length > 0 && <p className="text-[10px] text-orange-600">Cons: {r.cons.join(', ')}</p>}
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Install Dialog */}
      <Dialog open={installDialog} onOpenChange={setInstallDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Download className="w-5 h-5 text-primary" />Install {m.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium mb-1 block">Select Enterprise</label>
              <Select value={selectedEnterprise} onValueChange={setSelectedEnterprise}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Choose target enterprise..." /></SelectTrigger>
                <SelectContent>
                  {enterprises.map(e => <SelectItem key={e.id} value={e.id} className="text-xs">{e.name} ({e.type})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">License Type</label>
              <Select value={effectiveLicense} onValueChange={setLicenseType}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {m.pricing_model === 'free' && <SelectItem value="free" className="text-xs">Free</SelectItem>}
                  {m.trial_days > 0 && m.pricing_model !== 'free' && <SelectItem value="trial" className="text-xs">Trial ({m.trial_days} days)</SelectItem>}
                  <SelectItem value="subscription" className="text-xs">Subscription (${m.price_monthly}/mo)</SelectItem>
                  <SelectItem value="enterprise" className="text-xs">Enterprise License (${m.price_enterprise})</SelectItem>
                  <SelectItem value="perpetual" className="text-xs">Perpetual License</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {m.dependencies && m.dependencies.filter(d => d.required).length > 0 && (
              <div className="p-2 rounded border border-orange-200 bg-orange-50 dark:bg-orange-950/20">
                <p className="text-[10px] font-semibold text-orange-700 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Required Dependencies</p>
                <ul className="mt-1 space-y-0.5">
                  {m.dependencies.filter(d => d.required).map((d, i) => <li key={i} className="text-[10px] text-orange-700">{d.module_name} v{d.min_version}</li>)}
                </ul>
              </div>
            )}
            {installResult?.error && <p className="text-xs text-red-600">{installResult.error}</p>}
            {installResult?.success && <p className="text-xs text-emerald-600"><CheckCircle2 className="w-3 h-3 inline mr-1" />Module installed successfully!</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInstallDialog(false)}>Cancel</Button>
            <Button onClick={handleInstall} disabled={!selectedEnterprise || installing}>
              {installing ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Download className="w-3.5 h-3.5 mr-1" />}
              {installing ? 'Installing...' : 'Install'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={reviewDialog} onOpenChange={setReviewDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Star className="w-5 h-5 text-amber-500" />Review {m.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium mb-1 block">Rating</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(s => (
                  <button key={s} onClick={() => setReviewRating(s)}><Star className={`w-6 h-6 ${s <= reviewRating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`} /></button>
                ))}
              </div>
            </div>
            <div><label className="text-xs font-medium mb-1 block">Review</label><Textarea value={reviewText} onChange={e => setReviewText(e.target.value)} className="text-xs" rows={3} placeholder="Share your experience..." /></div>
            <div><label className="text-xs font-medium mb-1 block">Pros (one per line)</label><Textarea value={reviewPros} onChange={e => setReviewPros(e.target.value)} className="text-xs" rows={2} placeholder="Great UI&#10;Easy to install" /></div>
            <div><label className="text-xs font-medium mb-1 block">Cons (one per line)</label><Textarea value={reviewCons} onChange={e => setReviewCons(e.target.value)} className="text-xs" rows={2} placeholder="Expensive&#10;Limited docs" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialog(false)}>Cancel</Button>
            <Button onClick={handleSubmitReview}>Submit Review</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}