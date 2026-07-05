import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Megaphone, TrendingUp, Loader2, DollarSign, Eye, MousePointer, CheckCircle, Sparkles, Shield } from "lucide-react";
import moment from "moment";

export default function AdvertisingPage() {
  const [ads, setAds] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [licensing, setLicensing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const load = async () => {
    setLoading(true);
    const [a, p, l] = await Promise.all([
      base44.entities.AdCampaign.list('-created_date', 100).catch(() => []),
      base44.entities.Promotion.list('-created_date', 100).catch(() => []),
      base44.entities.Licensing.list('-created_date', 100).catch(() => []),
    ]);
    setAds(a); setPromotions(p); setLicensing(l);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const generatePromotions = async () => {
    setGenerating(true);
    try { await base44.functions.invoke('cultureEngine', { operation: 'generate_promotions', params: {} }); load(); }
    catch (e) { console.error(e); }
    setGenerating(false);
  };

  const approvePromo = async (id) => {
    await base44.functions.invoke('cultureEngine', { operation: 'approve_promotion', params: { promotion_id: id } });
    load();
  };
  const approveAd = async (id) => {
    await base44.functions.invoke('cultureEngine', { operation: 'approve_ad', params: { ad_id: id } });
    load();
  };
  const approveLicense = async (id) => {
    await base44.functions.invoke('cultureEngine', { operation: 'approve_licensing', params: { licensing_id: id } });
    load();
  };

  const totalAdRev = ads.reduce((s, a) => s + (a.revenue_generated || 0), 0);
  const totalImpressions = ads.reduce((s, a) => s + (a.impressions || 0), 0);
  const totalLicenseFees = licensing.filter(l => l.status === 'active').reduce((s, l) => s + (l.fee_amount || 0), 0);
  const suggestedPromos = promotions.filter(p => p.status === 'suggested');

  return (
    <div className="space-y-6 max-w-7xl mx-auto" style={{ background: "linear-gradient(135deg, #0a0a0a 0%, #1a1505 100%)", minHeight: "100vh", padding: "24px" }}>
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] font-semibold mb-1" style={{ color: "rgba(201,151,58,0.6)" }}>Culture Rail</p>
          <h1 className="text-2xl font-black flex items-center gap-2" style={{ color: "#f5e9c8" }}><Megaphone className="w-6 h-6" style={{ color: "#c9973a" }} />Advertising & Promotions</h1>
        </div>
        <Button onClick={generatePromotions} disabled={generating} size="sm" style={{ background: "#c9973a", color: "#0a0a0a" }}>
          {generating ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Sparkles className="w-4 h-4 mr-1" />}
          {generating ? "Generating..." : "Generate Promotions"}
        </Button>
      </div>

      <Card className="p-3 border flex items-center gap-2" style={{ background: "rgba(201,151,58,0.05)", borderColor: "rgba(201,151,58,0.2)" }}>
        <Shield className="w-4 h-4 flex-shrink-0" style={{ color: "#c9973a" }} />
        <p className="text-xs" style={{ color: "rgba(201,151,58,0.5)" }}><span className="font-bold" style={{ color: "#c9973a" }}>Founder Approval Mandatory:</span> All ad campaigns, promotions, and licensing deals require explicit founder approval before activation.</p>
      </Card>

      {loading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "#c9973a" }} /></div> : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="p-3 border" style={{ background: "rgba(201,151,58,0.05)", borderColor: "rgba(201,151,58,0.2)" }}><Megaphone className="w-4 h-4 mb-1" style={{ color: "#c9973a" }} /><p className="text-xl font-black" style={{ color: "#f5e9c8" }}>{ads.length}</p><p className="text-[10px]" style={{ color: "rgba(201,151,58,0.5)" }}>Ad Campaigns</p></Card>
            <Card className="p-3 border" style={{ background: "rgba(201,151,58,0.05)", borderColor: "rgba(201,151,58,0.2)" }}><Eye className="w-4 h-4 mb-1" style={{ color: "#c9973a" }} /><p className="text-xl font-black" style={{ color: "#f5e9c8" }}>{totalImpressions.toLocaleString()}</p><p className="text-[10px]" style={{ color: "rgba(201,151,58,0.5)" }}>Total Impressions</p></Card>
            <Card className="p-3 border" style={{ background: "rgba(201,151,58,0.05)", borderColor: "rgba(201,151,58,0.2)" }}><DollarSign className="w-4 h-4 mb-1" style={{ color: "#c9973a" }} /><p className="text-xl font-black" style={{ color: "#f5e9c8" }}>${totalAdRev.toLocaleString()}</p><p className="text-[10px]" style={{ color: "rgba(201,151,58,0.5)" }}>Ad Revenue</p></Card>
            <Card className="p-3 border" style={{ background: "rgba(201,151,58,0.05)", borderColor: "rgba(201,151,58,0.2)" }}><TrendingUp className="w-4 h-4 mb-1" style={{ color: "#c9973a" }} /><p className="text-xl font-black" style={{ color: "#f5e9c8" }}>${totalLicenseFees.toLocaleString()}</p><p className="text-[10px]" style={{ color: "rgba(201,151,58,0.5)" }}>License Fees</p></Card>
          </div>

          <Tabs defaultValue="promotions">
            <TabsList className="flex-wrap h-auto" style={{ background: "rgba(201,151,58,0.05)" }}>
              <TabsTrigger value="promotions" style={{ color: "#c9973a" }}>Promotions ({promotions.length})</TabsTrigger>
              <TabsTrigger value="ads" style={{ color: "#c9973a" }}>Ad Campaigns ({ads.length})</TabsTrigger>
              <TabsTrigger value="licensing" style={{ color: "#c9973a" }}>Licensing ({licensing.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="promotions" className="space-y-2 mt-4">
              {suggestedPromos.length > 0 && (
                <Card className="p-3 border" style={{ background: "rgba(201,151,58,0.08)", borderColor: "rgba(201,151,58,0.3)" }}>
                  <p className="text-xs font-bold mb-1 flex items-center gap-1" style={{ color: "#c9973a" }}><Sparkles className="w-3 h-3" />AI-Generated Suggestions ({suggestedPromos.length})</p>
                </Card>
              )}
              {promotions.map(p => (
                <Card key={p.id} className="p-3 border" style={{ background: "rgba(201,151,58,0.03)", borderColor: "rgba(201,151,58,0.15)" }}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge style={{ background: "rgba(201,151,58,0.15)", color: "#c9973a" }} className="text-[9px]">{p.promotion_type?.replace(/_/g, " ")}</Badge>
                      <Badge variant="outline" className="text-[9px]" style={{ color: "rgba(201,151,58,0.4)", borderColor: "rgba(201,151,58,0.2)" }}>{p.target_type}</Badge>
                      <Badge style={{ background: p.status === 'suggested' ? "rgba(201,151,58,0.1)" : p.status === 'active' ? "rgba(34,197,94,0.2)" : "rgba(100,100,100,0.2)", color: "#f5e9c8" }} className="text-[9px]">{p.status}</Badge>
                      {p.auto_generated && <Badge style={{ background: "rgba(168,85,247,0.2)", color: "#c9973a" }} className="text-[9px]"><Sparkles className="w-2.5 h-2.5 mr-0.5" />AI</Badge>}
                    </div>
                    <span className="text-xs font-bold" style={{ color: "#c9973a" }}>Priority: {p.priority_score}/100</span>
                  </div>
                  <p className="text-sm font-bold mb-1" style={{ color: "#f5e9c8" }}>{p.title}</p>
                  <p className="text-[10px]" style={{ color: "rgba(201,151,58,0.4)" }}>{p.target_name}</p>
                  {p.ai_recommendation && <p className="text-[10px] mt-1 italic" style={{ color: "rgba(201,151,58,0.3)" }}>{p.ai_recommendation}</p>}
                  <div className="grid grid-cols-3 gap-2 mt-2 text-[10px]">
                    <div><p style={{ color: "rgba(201,151,58,0.4)" }}>Duration</p><p style={{ color: "#f5e9c8" }}>{p.duration_days}d</p></div>
                    <div><p style={{ color: "rgba(201,151,58,0.4)" }}>Est. Lift</p><p style={{ color: "#f5e9c8" }}>+{p.engagement_lift_pct}%</p></div>
                    <div><p style={{ color: "rgba(201,151,58,0.4)" }}>Revenue Impact</p><p style={{ color: "#c9973a" }}>${p.revenue_impact}</p></div>
                  </div>
                  {p.status === 'suggested' && <Button size="sm" className="h-7 text-[10px] mt-2 w-full" style={{ background: "#c9973a", color: "#0a0a0a" }} onClick={() => approvePromo(p.id)}><CheckCircle className="w-3 h-3 mr-1" />Approve Promotion</Button>}
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="ads" className="space-y-2 mt-4">
              {ads.map(a => (
                <Card key={a.id} className="p-3 border" style={{ background: "rgba(201,151,58,0.03)", borderColor: "rgba(201,151,58,0.15)" }}>
                  <div className="flex items-center justify-between mb-1">
                    <div><p className="text-sm font-bold" style={{ color: "#f5e9c8" }}>{a.name}</p><p className="text-[10px]" style={{ color: "rgba(201,151,58,0.4)" }}>{a.advertiser_name} · {a.campaign_type}</p></div>
                    <Badge style={{ background: a.status === 'active' ? "rgba(34,197,94,0.2)" : "rgba(201,151,58,0.1)", color: "#f5e9c8" }} className="text-[9px]">{a.status?.replace(/_/g, " ")}</Badge>
                  </div>
                  <div className="grid grid-cols-4 gap-2 mt-2 text-[10px]">
                    <div><p style={{ color: "rgba(201,151,58,0.4)" }}>Budget</p><p style={{ color: "#f5e9c8" }}>${a.budget_total}</p></div>
                    <div><p style={{ color: "rgba(201,151,58,0.4)" }}>Impressions</p><p style={{ color: "#f5e9c8" }}>{(a.impressions || 0).toLocaleString()}</p></div>
                    <div><p style={{ color: "rgba(201,151,58,0.4)" }}>Clicks</p><p style={{ color: "#f5e9c8" }}>{a.clicks || 0}</p></div>
                    <div><p style={{ color: "rgba(201,151,58,0.4)" }}>Revenue</p><p style={{ color: "#c9973a" }}>${a.revenue_generated || 0}</p></div>
                  </div>
                  {a.status === 'draft' && <Button size="sm" className="h-7 text-[10px] mt-2 w-full" style={{ background: "#c9973a", color: "#0a0a0a" }} onClick={() => approveAd(a.id)}><CheckCircle className="w-3 h-3 mr-1" />Approve Campaign</Button>}
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="licensing" className="space-y-2 mt-4">
              {licensing.map(l => (
                <Card key={l.id} className="p-3 border" style={{ background: "rgba(201,151,58,0.03)", borderColor: "rgba(201,151,58,0.15)" }}>
                  <div className="flex items-center justify-between mb-1">
                    <div><p className="text-sm font-bold" style={{ color: "#f5e9c8" }}>{l.title}</p><p className="text-[10px]" style={{ color: "rgba(201,151,58,0.4)" }}>{l.song_name} · {l.license_type?.replace(/_/g, " ")}</p></div>
                    <Badge style={{ background: l.status === 'active' ? "rgba(34,197,94,0.2)" : "rgba(201,151,58,0.1)", color: "#f5e9c8" }} className="text-[9px]">{l.status}</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-2 text-[10px]">
                    <div><p style={{ color: "rgba(201,151,58,0.4)" }}>Licensee</p><p style={{ color: "#f5e9c8" }}>{l.licensee_name}</p></div>
                    <div><p style={{ color: "rgba(201,151,58,0.4)" }}>Fee</p><p style={{ color: "#c9973a" }}>${l.fee_amount}</p></div>
                    <div><p style={{ color: "rgba(201,151,58,0.4)" }}>Territory</p><p style={{ color: "#f5e9c8" }}>{l.territory}</p></div>
                  </div>
                  {l.status === 'pending' && <Button size="sm" className="h-7 text-[10px] mt-2 w-full" style={{ background: "#c9973a", color: "#0a0a0a" }} onClick={() => approveLicense(l.id)}><CheckCircle className="w-3 h-3 mr-1" />Approve License</Button>}
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}